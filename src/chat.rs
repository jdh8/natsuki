use crate::{Context, Data};
use poise::serenity_prelude as serenity;
use std::collections::{HashMap, VecDeque};

const MODEL: &str = "llama-3.3-70b-versatile";
// ponytail: 10 exchanges per channel, in-memory only; persist if users complain
const MAX_HISTORY: usize = 20;

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
        .post("https://api.groq.com/openai/v1/chat/completions")
        .bearer_auth(&data.groq_key)
        // Groq's free tier queues requests under load, which can outlive the
        // shared client's 10 s timeout, so give this request its own.
        .timeout(std::time::Duration::from_secs(30))
        .json(&serde_json::json!({
            "model": MODEL,
            "messages": messages,
            "max_tokens": 256,
            "temperature": 0.8,
        }));

    let response = match request.send().await {
        Ok(response) => response,
        // Transient network trouble: reply in character instead of erroring
        Err(e) => {
            eprintln!("Groq request failed: {e:?}");
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
        .ok_or_else(|| anyhow::anyhow!("Unexpected Groq response: {json}"))?
        .trim()
        .to_owned();

    // Discord caps messages at 2000 chars
    let reply = if reply.chars().count() > 2000 {
        reply.chars().take(1997).collect::<String>() + "..."
    } else {
        reply
    };

    let mut history = data.chat_history.lock().unwrap();
    let deque = history.entry(channel).or_default();
    deque.push_back(ChatMessage {
        role: "user",
        content: user_content,
    });
    deque.push_back(ChatMessage {
        role: "assistant",
        content: reply.clone(),
    });
    while deque.len() > MAX_HISTORY {
        deque.pop_front();
    }
    Ok(reply)
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
