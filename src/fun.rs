pub mod poem;
use crate::Context;
use image::{GenericImageView, Pixel};
use image::buffer::ConvertBuffer;
use image::imageops::FilterType::CatmullRom;
use poise::serenity_prelude as serenity;
use serenity::Mentionable;
use tokio::time::{Duration, sleep};

async fn face_image(user: &serenity::User) -> anyhow::Result<image::DynamicImage> {
    let uri = user.face();
    let buffer = reqwest::get(&uri).await?.bytes().await?;

    if uri.ends_with(".webp") {
        Ok(webp::Decoder::new(&buffer).decode()
            .expect("Failed to decode WebP avatar")
            .to_image())
    }
    else {
        Ok(image::load_from_memory(&buffer)?)
    }
}

fn blend_image<P: Pixel, Container: core::ops::DerefMut<Target = [P::Subpixel]>>(
    mut base: image::ImageBuffer<P, Container>,
    top: &impl GenericImageView<Pixel = P>,
    x: u32,
    y: u32,
) -> image::ImageBuffer<P, Container> {
    for i in 0..top.width() {
        for j in 0..top.height() {
            base.get_pixel_mut(x + i, y + j).blend(&top.get_pixel(i, j));
        }
    }
    base
}

/// Beat someone
///
/// Ask Buffsuki to beat someone
///
/// **Usage**: /beat [user|text]
#[poise::command(category = "Fun", slash_command)]
pub async fn beat(ctx: Context<'_>,
    #[description = "Someone/something to beat"]
    text: Option<String>,
) -> anyhow::Result<()> {
    ctx.say("<:buffsuki:436562981875089428> **I'll beat the shit out of ".to_owned()
        + text.as_deref().unwrap_or("my dad")
        + ".**"
    ).await?;
    Ok(())
}

/// Have a bunny say something
///
/// Have a bunny say or hold something
///
/// **Usage**: /bunny [text]
#[poise::command(category = "Fun", slash_command)]
pub async fn bunny(ctx: Context<'_>,
    #[description = "Something to say"]
    text: Option<String>,
) -> anyhow::Result<()> {
    ctx.say(r#"(\\\_\_/)
( • - •)
/つ "#.to_owned() + text.as_deref().unwrap_or(" つ")).await?;
    Ok(())
}

/// Bake a cupcake
///
/// Bake a cupcake out of someone
///
/// **Usage**: /bake [user]
#[poise::command(category = "Fun", slash_command)]
pub async fn cupcake(ctx: Context<'_>,
    #[description = "User to bake a cupcake out of"]
    user: Option<serenity::User>,
) -> anyhow::Result<()> {
    let target = user.as_ref().unwrap_or_else(|| ctx.author());
    let face = face_image(target).await?.resize(128, 128, CatmullRom);
    let cake = image::open("assets/290px-Hostess-Cupcake-Whole.jpg")?.into_rgba8();
    let opaque: image::RgbImage = blend_image(cake, &face, 80, 80).convert();
    let encoder = webp::Encoder::from_rgb(&opaque, opaque.width(), opaque.height());

    ctx.send(|m| m
        .content(format!("{} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!", target.mention()))
        .attachment(serenity::model::channel::AttachmentType::Bytes {
            data: encoder.encode(85.0).to_vec().into(),
            filename: "cupcake.webp".into(),
        })
    ).await?;
    Ok(())
}

/// Say that Natsuki is cute
///
/// Say that Natsuki is cute!
///
/// **Usage**: /cute
#[poise::command(category = "Fun", slash_command)]
pub async fn cute(ctx: Context<'_>) -> anyhow::Result<()> {
    let mut content = "Don't say this embarassing thing, dummy!".to_owned();
    let reply = ctx.say(&content).await?;
    let typing = ctx.serenity_context().http.start_typing(ctx.channel_id().into());

    content.push_str("\nY-You t-too....");
    sleep(Duration::from_secs(3)).await;
    reply.edit(ctx, |m| m.content(&content)).await?;

    content.push_str("\nI'M NOT CUUUUUUUUUUUTE!");
    sleep(Duration::from_secs(2)).await;
    reply.edit(ctx, |m| m.content(&content)).await?;

    content.push_str("\nDon't think you can make me say this embarrassing thing just because we're not at school!");
    sleep(Duration::from_secs(2)).await;
    reply.edit(ctx, |m| m.content(&content)).await?;

    let _ = typing.map(|t| t.stop());
    content.push_str("\nI-I have to go to the bathroom.");
    sleep(Duration::from_secs(4)).await;
    reply.edit(ctx, |m| m.content(&content)).await?;
    Ok(())
}

/// Nut on something
///
/// Nut on someone or something
///
/// **Usage**: /nut [user|text]
#[poise::command(category = "Fun", slash_command)]
pub async fn nut(ctx: Context<'_>,
    #[description = "Something to nut on"]
    text: Option<String>,
) -> anyhow::Result<()> {
    ctx.say(ctx.author().mention().to_string()
        + " nuts on "
        + text.as_deref().unwrap_or("the floor")
        + ".\n<:pukesuki:405984820674428928> **You guys are so gross!**"
    ).await?;
    Ok(())
}

async fn fuck(ctx: Context<'_>, user: Option<&serenity::User>) -> anyhow::Result<()> {
    let base = image::open("assets/566424ede431200e3985ca6f21287cee.png")?.into_rgba8();
    let author = face_image(ctx.author()).await?.resize(256, 256, CatmullRom);
    let agent = blend_image(base, &author, 364, 120);
    let opaque: image::RgbImage  = match user {
        Some(u) => {
            let t = face_image(&u).await?.resize(256, 256, CatmullRom);
            blend_image(agent, &t, 110, 20)
        },
        None => agent,
    }.convert();

    let encoder = webp::Encoder::from_rgb(&opaque, opaque.width(), opaque.height());

    ctx.send(|m| m
        .content(format!("{} fucked {}!",
            ctx.author().mention(),
            user.map_or_else(|| "Natsuki".to_owned(), |u| u.mention().to_string())))
        .attachment(serenity::model::channel::AttachmentType::Bytes {
            data: encoder.encode(85.0).to_vec().into(),
            filename: "fuck.webp".into(),
        })
    ).await?;
    Ok(())
}

/// Smash someone
///
/// Smash someone or nothing or Natsuki
///
/// **Usage**: /smash [user]
#[poise::command(category = "Fun", slash_command)]
pub async fn smash(ctx: Context<'_>,
    #[description = "User to smash"]
    user: Option<serenity::User>,
) -> anyhow::Result<()> {
    if ctx.channel_id().to_channel(&ctx).await?.is_nsfw() {
        return fuck(ctx, user.as_ref()).await;
    }

    let author = ctx.author().mention();
    ctx.send(|m| m.embed(|e| e
        .description(match user {
            Some(u) => format!("{} smashed {}!", author, u.mention()),
            None => format!("{} smashed!", author),
        })
        .image("https://raw.githubusercontent.com/jdh8/natsuki/master/assets/smash.png"))
    ).await?;
    Ok(())
}