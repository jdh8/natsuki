use crate::Context;
use poise::serenity_prelude as serenity;

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