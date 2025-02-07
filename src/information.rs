use crate::Context;
use chrono::{DateTime, SecondsFormat, Utc};
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
    fn time(self) -> time::SystemTime {
        const Y2015: u64 = 16436 * 86_400_000;
        time::UNIX_EPOCH + time::Duration::from_millis((self.0 >> 22) + Y2015)
    }

    const fn worker(self) -> u8 {
        (self.0 >> 17 & 0x1F) as u8
    }

    const fn process(self) -> u8 {
        (self.0 >> 12 & 0x1F) as u8
    }

    const fn increment(self) -> u16 {
        (self.0 & 0xFFF) as u16
    }
}

fn format_rfc3339(time: time::SystemTime) -> String {
    let time: DateTime<Utc> = time.into();
    time.to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn format_snowflake(flake: Snowflake) -> String {
    format!(
        "**Time:** {}\n**Worker:** {}\n**Process:** {}\n**Increment:** {}",
        format_rfc3339(flake.time()),
        flake.worker(),
        flake.process(),
        flake.increment(),
    )
}

/// Show avatar
///
/// Show the avatar of a user
///
/// **Usage**: /avatar [user]
#[poise::command(category = "Information", slash_command)]
pub async fn avatar(
    ctx: Context<'_>,
    #[description = "User whose avatar to show"] user: Option<serenity::User>,
) -> anyhow::Result<()> {
    ctx.say(user.as_ref().unwrap_or_else(|| ctx.author()).face())
        .await?;
    Ok(())
}

#[poise::command(context_menu_command = "Avatar")]
pub async fn avatar_user(ctx: Context<'_>, user: serenity::User) -> anyhow::Result<()> {
    ctx.say(user.face()).await?;
    Ok(())
}

/// Decode a Discord snowflake
///
/// Extract information from a snowflake
///
/// **Usage**: /snowflake <snowflake|user|role|channel|text|...>
#[poise::command(category = "Information", slash_command)]
pub async fn snowflake(
    ctx: Context<'_>,
    #[description = "Snowflake (any Discord entity) to decode"] snowflake: String,
) -> anyhow::Result<()> {
    ctx.say(regex::Regex::new(r"\d+")?.find(&snowflake).map_or_else(
        || "No snowflake is found.".to_owned(),
        |mat| {
            mat.as_str().parse::<u64>().map_or_else(
                |_| "Found an invalid snowflake: ".to_owned() + mat.as_str(),
                |flake| format_snowflake(flake.into()),
            )
        },
    ))
    .await?;
    Ok(())
}

#[poise::command(context_menu_command = "Snowflake (user)")]
pub async fn snowflake_user(ctx: Context<'_>, user: serenity::User) -> anyhow::Result<()> {
    ctx.say(format_snowflake(user.id.get().into())).await?;
    Ok(())
}

#[poise::command(context_menu_command = "Snowflake (message)")]
pub async fn snowflake_message(ctx: Context<'_>, message: serenity::Message) -> anyhow::Result<()> {
    ctx.say(format_snowflake(message.id.get().into())).await?;
    Ok(())
}

/// Inspect a role
///
/// Show information about a role
///
/// **Usage**: /role <role>
#[poise::command(category = "Information", slash_command)]
pub async fn role(
    ctx: Context<'_>,
    #[description = "Role to inspect"] role: serenity::Role,
) -> anyhow::Result<()> {
    ctx.send(poise::CreateReply {
        embeds: vec![serenity::CreateEmbed::new()
            .title("Role ".to_owned() + &role.name)
            .color(role.colour)
            .field("Name", role.name, false)
            .field("ID", role.id.to_string(), false)
            .field("Color", "#".to_owned() + &role.colour.hex(), false)
            .field("Hoisted", role.hoist.to_string(), false)
            .field("Managed", role.managed.to_string(), false)
            .field("Mentionable", role.mentionable.to_string(), false)
            .field("Permissions", role.permissions.to_string(), false)
            .field("Position", role.position.to_string(), false)
            .field(
                "Created at",
                format_rfc3339(Snowflake(role.id.get()).time()),
                false,
            )],
        ..Default::default()
    })
    .await?;
    Ok(())
}
