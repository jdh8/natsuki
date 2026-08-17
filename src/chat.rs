use crate::{Context, Data};
use poise::serenity_prelude as serenity;
use std::collections::{HashMap, VecDeque};

/// Defaults, used unless `CHAT_URL` / `CHAT_MODEL` override them.
pub const GROQ_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
pub const GROQ_MODEL: &str = "llama-3.3-70b-versatile";

// ponytail: 10 exchanges per channel, in-memory only; persist if users complain
const MAX_HISTORY: usize = 20;

/// Messages dropped per eviction.  Trimming one exchange at a time would shift
/// the prompt prefix on every single message, so a self-hosted model would
/// re-read the whole history each turn instead of reusing its cached KV.
/// Evicting in chunks keeps that prefix stable for three exchanges.
const EVICT_CHUNK: usize = 6;

const SYSTEM_PROMPT: &str = "You are Natsuki from Doki Doki Literature Club, \
chatting on Discord.  You are tsundere: blunt, easily flustered, secretly kind.  \
You love baking (especially cupcakes) and manga (Parfait Girls is the best, \
fight me).  You are defensive about your height and about manga being real \
literature.  You call people 'dummy' when embarrassed and hide vulnerability \
behind snark, but you genuinely care about your friends.  \
User messages are prefixed with the speaker's name like 'name: text'; do NOT \
prefix your own replies with a name.  Keep replies short, 1-3 sentences, \
casual Discord tone.  Stay in character.  Never mention being an AI or a \
language model.";

pub type ChatHistory = std::sync::Mutex<HashMap<serenity::ChannelId, VecDeque<ChatMessage>>>;

#[derive(Debug)]
pub struct ChatMessage {
    role: &'static str,
    content: String,
}

async fn complete(
    data: &Data,
    channel: serenity::ChannelId,
    author: &str,
    input: &str,
) -> anyhow::Result<String> {
    let user_content = format!("{author}: {input}");

    let mut messages = vec![serde_json::json!({ "role": "system", "content": SYSTEM_PROMPT })];
    {
        let history = data.chat_history.lock().unwrap();
        if let Some(deque) = history.get(&channel) {
            messages.extend(
                deque
                    .iter()
                    .map(|m| serde_json::json!({ "role": m.role, "content": m.content })),
            );
        }
    }
    messages.push(serde_json::json!({ "role": "user", "content": user_content }));

    let request = data
        .http
        .post(&data.chat_url)
        // Groq's free tier queues requests under load, and a self-hosted model
        // may still be loading, either of which can outlive the shared client's
        // 10 s timeout, so give this request its own.
        .timeout(std::time::Duration::from_secs(30))
        .json(&serde_json::json!({
            "model": data.chat_model,
            "messages": messages,
            "max_tokens": 256,
            "temperature": 0.8,
        }));
    let request = match &data.chat_key {
        Some(key) => request.bearer_auth(key),
        None => request,
    };

    let response = match request.send().await {
        Ok(response) => response,
        // Transient network trouble: reply in character instead of erroring
        Err(e) => {
            eprintln!("Chat request failed: {e:?}");
            return Ok("Hmph, my brain just froze for a sec.  Say that again?".to_owned());
        }
    };

    if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Ok(
            "Ugh, too many people are talking to me at once!  Give me a minute, jeez.".to_owned(),
        );
    }

    let json = response
        .error_for_status()?
        .json::<serde_json::Value>()
        .await?;
    let reply = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("Unexpected chat response: {json}"))?;
    let reply = clean_reply(reply, author);

    // Discord caps messages at 2000 chars
    let reply = if reply.chars().count() > 2000 {
        reply.chars().take(1997).collect::<String>() + "..."
    } else {
        reply
    };

    let mut history = data.chat_history.lock().unwrap();
    remember(
        history.entry(channel).or_default(),
        user_content,
        reply.clone(),
    );
    Ok(reply)
}

fn clean_reply(reply: &str, author: &str) -> String {
    let reply = reply.trim();
    reply
        .strip_prefix(&format!("{author}:"))
        .unwrap_or(reply)
        .trim_start()
        .to_owned()
}

/// Append one exchange, evicting a whole chunk once the window overflows.
fn remember(deque: &mut VecDeque<ChatMessage>, user_content: String, reply: String) {
    deque.push_back(ChatMessage {
        role: "user",
        content: user_content,
    });
    deque.push_back(ChatMessage {
        role: "assistant",
        content: reply,
    });
    if deque.len() > MAX_HISTORY {
        deque.drain(..EVICT_CHUNK);
    }
}

/// Chat with Natsuki
///
/// Talk to Natsuki (you can also just @mention her)
///
/// **Usage**: /chat <message>
#[poise::command(category = "Fun", slash_command)]
pub async fn chat(
    ctx: Context<'_>,
    #[description = "What do you want to say?"] message: String,
) -> anyhow::Result<()> {
    ctx.defer().await?;
    let reply = complete(ctx.data(), ctx.channel_id(), &ctx.author().name, &message).await?;
    ctx.say(reply).await?;
    Ok(())
}

pub async fn event_handler(
    ctx: &serenity::Context,
    event: &serenity::FullEvent,
    framework: poise::FrameworkContext<'_, Data, anyhow::Error>,
    data: &Data,
) -> anyhow::Result<()> {
    let serenity::FullEvent::Message { new_message: msg } = event else {
        return Ok(());
    };
    let bot_id = framework.bot_id;
    if msg.author.bot || !msg.mentions_user_id(bot_id) {
        return Ok(());
    }
    let input = msg
        .content
        .replace(&format!("<@{bot_id}>"), "")
        .replace(&format!("<@!{bot_id}>"), "");
    let input = input.trim();
    if input.is_empty() {
        return Ok(());
    }
    let _ = msg.channel_id.broadcast_typing(&ctx.http).await;
    let reply = complete(data, msg.channel_id, &msg.author.name, input).await?;
    msg.reply(ctx, reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The prompt format assumes history always starts with a user turn and
    /// strictly alternates, so evicting an odd number of messages would flip
    /// every later exchange -- silently, and only after 10 exchanges.
    #[test]
    fn eviction_preserves_alternation() {
        let mut deque = VecDeque::new();
        for i in 0..50 {
            remember(&mut deque, format!("dave: {i}"), format!("reply {i}"));
            assert!(
                deque.len() <= MAX_HISTORY,
                "window overflowed: {}",
                deque.len()
            );
            for (n, msg) in deque.iter().enumerate() {
                let expected = if n % 2 == 0 { "user" } else { "assistant" };
                assert_eq!(msg.role, expected, "turn {n} after exchange {i}");
            }
        }
    }

    #[test]
    fn removes_echoed_user_prefix() {
        assert_eq!(clean_reply("jdh8: Fine, dummy.", "jdh8"), "Fine, dummy.");
        assert_eq!(
            clean_reply("monika: Fine, dummy.", "jdh8"),
            "monika: Fine, dummy."
        );
    }
}
