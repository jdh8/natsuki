use crate::Context;
use rand::seq::SliceRandom;

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

/// Kiss someone
///
/// Kiss someone or Natsuki
///
/// **Usage:** /kiss [user|text]
#[poise::command(category = "Weeb", slash_command)]
pub async fn kiss(ctx: Context<'_>,
    #[description = "Someone to hug"]
    text: Option<String>,
) -> anyhow::Result<()> {
    const KISSES: [&str; 8] = [
        "https://cdn.discordapp.com/attachments/403299886352695297/428494387341688833/hJ6DcXJUurOfHcyG5Sv3wSzZafNqhSGbKTnpF6fFzV4.png",
        "https://cdn.discordapp.com/attachments/403299886352695297/428483005389078528/WfvNDEnq_HoNHwr5-o9fIf0W7x2Rw5Q0tXbLNJy-a8Q.png",
        "https://cdn.discordapp.com/attachments/409037934470234113/429673201614848004/qzZgXh-ZBV2674hpTt0gKy6YO85Nack3CbZdHqlxLy8.jpg",
        "https://cdn.discordapp.com/attachments/409037934470234113/429673204282294282/w6wubjO6iugro-v6N8iX69-R3FK41ZXJ4Com1zSzi2Y.jpg",
        "https://cdn.discordapp.com/attachments/409037934470234113/429673205846900736/kiss1.jpg",
        "https://cdn.discordapp.com/attachments/409037934470234113/429673205876260864/Copy_of_x3j03ojjwsg01.jpg",
        "https://cdn.discordapp.com/attachments/403697175948820481/444355145124544513/11b4bc2.png",
        "https://cdn.discordapp.com/attachments/409037934470234113/449736165290016782/8qlcohr5c1011.png",
    ];
    let text = text.as_deref().unwrap_or("Natsuki");
    ctx.send(|m| m.embed(|e| e
        .description(ctx.author().to_string() + " kissed " + text + "!")
        .image(KISSES.choose(&mut rand::thread_rng()).expect("Invalid image URL"))
    )).await?;
    Ok(())
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
pub async fn lick(ctx: Context<'_>,
    #[description = "Someone to lick"]
    text: Option<String>,
) -> anyhow::Result<()> {
    let text = text.as_deref().unwrap_or("the air");
    ctx.send(|m| m.embed(|e| e
        .description(ctx.author().to_string() + " licked " + text + "!")
        .image("https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif")
    )).await?;
    Ok(())
}

/// Show a random neko
///
/// Show a random neko from nekos.life
///
/// **Usage:** /neko
#[poise::command(category = "Weeb", slash_command)]
pub async fn neko(ctx: Context<'_>) -> anyhow::Result<()> {
    let endpoint = "https://nekos.life/api/v2/img/neko";
    let json = reqwest::get(endpoint).await?.json::<serde_json::Value>().await?;
    ctx.send(|m| m.embed(|e| e
        .description("Here comes your random neko.")
        .image(json["url"].as_str().expect("Invalid image URL"))
    )).await?;
    Ok(())
}