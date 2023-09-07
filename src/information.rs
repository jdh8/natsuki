use crate::Context;
use chrono::{DateTime, Utc, SecondsFormat};
use poise::serenity_prelude as serenity;
use std::time::{UNIX_EPOCH, Duration};

/// Show avatar
///
/// Show the avatar of a user
///
/// **Usage**: /avatar [user]
#[poise::command(category = "Information", slash_command)]
pub async fn avatar(ctx: Context<'_>,
    #[description = "User whose avatar to show"]
    user: Option<serenity::User>,
) -> anyhow::Result<()> {
    ctx.say(user.as_ref().unwrap_or_else(|| ctx.author()).face()).await?;
    Ok(())
}

/// Decode a Discord snowflake
///
/// Extract information from a snowflake
///
/// **Usage**: /snowflake [snowflake|user|role|channel|text|...]
#[poise::command(category = "Information", slash_command)]
pub async fn snowflake(ctx: Context<'_>,
    #[description = "Snowflake (any Discord entity) to decode"]
    snowflake: String,
) -> anyhow::Result<()> {
    ctx.say(match regex::Regex::new(r"\d+")?.find(&snowflake) {
        Some(mat) => match mat.as_str().parse::<u64>() {
            Ok(flake) => {
                let time = UNIX_EPOCH + Duration::from_millis((flake >> 22) + 1420070400000);
                let date: DateTime<Utc> = time.into();
                let worker = flake >> 17 & 0x1F;
                let process = flake >> 12 & 0x1F;
                let increment = flake & 0xFFF;
                format!("**Time:** {}\n**Worker:** {}\n**Process:** {}\n**Increment:** {}",
                    date.to_rfc3339_opts(SecondsFormat::Millis, true),
                    worker, process, increment)
            },
            Err(_) => "Found an invalid snowflake: ".to_owned() + mat.as_str(),
        },
        None => "No snowflake is found.".to_owned(),
    }).await?;
    Ok(())
}