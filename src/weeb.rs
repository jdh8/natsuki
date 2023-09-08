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