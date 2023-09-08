use crate::Context;
use chrono::{DateTime, Utc, SecondsFormat};
use poise::serenity_prelude as serenity;
use std::time;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
struct Snowflake(u64);

impl From<u64> for Snowflake {
    fn from(flake: u64) -> Self {
        Self(flake)
    }
}

impl Snowflake {
    fn time(&self) -> time::SystemTime {
        time::UNIX_EPOCH + time::Duration::from_millis((self.0 >> 22) + 1420070400000)
    }

    fn worker(&self) -> u8 {
        (self.0 >> 17 & 0x1F) as u8
    }

    fn process(&self) -> u8 {
        (self.0 >> 12 & 0x1F) as u8
    }

    fn increment(&self) -> u8 {
        (self.0 & 0xFFF) as u8
    }
}

fn format_rfc3339(time: time::SystemTime) -> String {
    let time: DateTime<Utc> = time.into();
    time.to_rfc3339_opts(SecondsFormat::Millis, true)
}

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
/// **Usage**: /snowflake <snowflake|user|role|channel|text|...>
#[poise::command(category = "Information", slash_command)]
pub async fn snowflake(ctx: Context<'_>,
    #[description = "Snowflake (any Discord entity) to decode"]
    snowflake: String,
) -> anyhow::Result<()> {
    ctx.say(match regex::Regex::new(r"\d+")?.find(&snowflake) {
        Some(mat) => match mat.as_str().parse::<u64>().map(Snowflake) {
            Ok(flake) => format!(
                "**Time:** {}\n**Worker:** {}\n**Process:** {}\n**Increment:** {}",
                format_rfc3339(flake.time()),
                flake.worker(),
                flake.process(),
                flake.increment(),
            ),
            Err(_) => "Found an invalid snowflake: ".to_owned() + mat.as_str(),
        },
        None => "No snowflake is found.".to_owned(),
    }).await?;
    Ok(())
}

/// Inspect a role
///
/// Show information about a role
///
/// **Usage**: /role <role>
#[poise::command(category = "Information", slash_command)]
pub async fn role(ctx: Context<'_>,
    #[description = "Role to inspect"]
    role: serenity::Role,
) -> anyhow::Result<()> {
    ctx.send(|m| m
        .embed(|e| e
            .title("Role ".to_owned() + &role.name)
            .color(role.colour)
            .field("Name", role.name, false)
            .field("ID", role.id, false)
            .field("Color", "#".to_owned() + &role.colour.hex(), false)
            .field("Hoisted", role.hoist, false)
            .field("Managed", role.managed, false)
            .field("Mentionable", role.mentionable, false)
            .field("Permissions", role.permissions, false)
            .field("Position", role.position, false)
            .field("Created at", format_rfc3339(Snowflake(role.id.0).time()), false)
        )
    ).await?;
    Ok(())
}