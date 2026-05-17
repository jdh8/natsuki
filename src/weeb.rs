use crate::Context;
use anyhow::Context as _;
use poise::serenity_prelude as serenity;

/// Fetch an image URL from an API that responds with `{"url": "..."}`
/// (e.g. nekos.life, otakugifs.xyz) and send it as an embed.
async fn send_image_embed(
    ctx: Context<'_>,
    endpoint: &str,
    description: String,
) -> anyhow::Result<()> {
    let json = ctx
        .data()
        .http
        .get(endpoint)
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;
    let url = json["url"].as_str().context("Invalid image URL")?;

    ctx.send(poise::CreateReply {
        embeds: vec![serenity::CreateEmbed::new()
            .description(description)
            .image(url)],
        ..Default::default()
    })
    .await?;
    Ok(())
}

/// Feed someone
///
/// Feed someone or a random anime character
///
/// **Usage:** /feed [user|text]
#[poise::command(category = "Weeb", slash_command)]
pub async fn feed(
    ctx: Context<'_>,
    #[description = "Someone to feed"] text: Option<String>,
) -> anyhow::Result<()> {
    let text = text.as_deref().unwrap_or("a random anime character");
    let description = ctx.author().to_string() + " fed " + text + "!";
    send_image_embed(ctx, "https://nekos.life/api/v2/img/feed", description).await
}

/// Hug someone
///
/// Hug someone or Yuri
///
/// **Usage:** /hug [user|text]
#[poise::command(category = "Weeb", slash_command)]
pub async fn hug(
    ctx: Context<'_>,
    #[description = "Someone to hug"] text: Option<String>,
) -> anyhow::Result<()> {
    let text = text.as_deref().unwrap_or("a random anime character");
    let description = ctx.author().to_string() + " hugged " + text + "!";
    send_image_embed(
        ctx,
        "https://api.otakugifs.xyz/gif?reaction=hug",
        description,
    )
    .await
}

/// Kiss someone
///
/// Kiss someone or Natsuki
///
/// **Usage:** /kiss [user|text]
#[poise::command(category = "Weeb", slash_command)]
pub async fn kiss(
    ctx: Context<'_>,
    #[description = "Someone to kiss"] text: Option<String>,
) -> anyhow::Result<()> {
    let text = text.as_deref().unwrap_or("a random anime character");
    let description = ctx.author().to_string() + " kissed " + text + "!";
    send_image_embed(
        ctx,
        "https://api.otakugifs.xyz/gif?reaction=kiss",
        description,
    )
    .await
}

/// Display a video
///
/// Display a lewd video
///
/// **Usage:** /lewd
#[poise::command(category = "Weeb", slash_command)]
pub async fn lewd(ctx: Context<'_>) -> anyhow::Result<()> {
    ctx.say("https://youtu.be/qr89xoZyE1g").await?;
    Ok(())
}

/// Lick someone
///
/// Lick someone or the air
///
/// **Usage:** /lick [user|text]
#[poise::command(category = "Weeb", slash_command)]
pub async fn lick(
    ctx: Context<'_>,
    #[description = "Someone to lick"] text: Option<String>,
) -> anyhow::Result<()> {
    let text = text.as_deref().unwrap_or("the air");
    let description = ctx.author().to_string() + " licked " + text + "!";
    send_image_embed(
        ctx,
        "https://api.otakugifs.xyz/gif?reaction=lick",
        description,
    )
    .await
}

/// Show a random neko
///
/// Show a random neko from nekos.life
///
/// **Usage:** /neko
#[poise::command(category = "Weeb", slash_command)]
pub async fn neko(ctx: Context<'_>) -> anyhow::Result<()> {
    send_image_embed(
        ctx,
        "https://nekos.life/api/v2/img/neko",
        "Here comes your random neko.".to_owned(),
    )
    .await
}
