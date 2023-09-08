use rand::seq::SliceRandom;

use crate::Context;

/// Feed someone
///
/// Feed someone or a random anime character
///
/// **Usage:** /feed [user|text]
#[poise::command(category = "Weeb", slash_command)]
pub async fn feed(ctx: Context<'_>,
    #[description = "Someone to feed"]
    text: Option<String>,
) -> anyhow::Result<()> {
    let text = text.as_deref().unwrap_or("a random anime character");
    let endpoint = "https://nekos.life/api/v2/img/feed";
    let json = reqwest::get(endpoint).await?.json::<serde_json::Value>().await?;
    ctx.send(|m| m.embed(|e| e
        .description(ctx.author().to_string() + " fed " + text + "!")
        .image(json["url"].as_str().expect("Invalid image URL"))
    )).await?;
    Ok(())
}

/// Hug someone
///
/// Hug someone or Yuri
///
/// **Usage:** /hug [user|text]
#[poise::command(category = "Weeb", slash_command)]
pub async fn hug(ctx: Context<'_>,
    #[description = "Someone to hug"]
    text: Option<String>,
) -> anyhow::Result<()> {
    const HUGS: [&str; 2] = [
        "https://cdn.discordapp.com/attachments/403697175948820481/413015715273113601/Nxdr0qO_1.jpg",
        "https://cdn.discordapp.com/attachments/403697175948820481/444226349121404960/hug.jpg",
    ];
    let text = text.as_deref().unwrap_or("Yuri");
    ctx.send(|m| m.embed(|e| e
        .description(ctx.author().to_string() + " hugged " + text + "!")
        .image(HUGS.choose(&mut rand::thread_rng()).expect("Invalid image URL"))
    )).await?;
    Ok(())
}