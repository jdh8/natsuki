pub mod poem;
use crate::{Context, bot_id};
use anyhow::Context as _;
use image::{GenericImageView, Pixel};
use image::buffer::ConvertBuffer as _;
use image::imageops::FilterType::CatmullRom;
use poise::serenity_prelude as serenity;
use rand::Rng as _;
use serenity::Mentionable as _;
use tokio::time::{Duration, sleep};

async fn face_image(user: &serenity::User) -> anyhow::Result<image::DynamicImage> {
    let uri = user.face();
    let buffer = reqwest::get(&uri).await?.bytes().await?;
    let extension = std::path::Path::new(&uri).extension();

    if extension.map_or(false, |e| e.eq_ignore_ascii_case("webp")) {
        webp::Decoder::new(&buffer).decode()
            .map(|i| i.to_image())
            .context("Failed to decode WebP avatar")
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
    ctx.say(r"(\\\_\_/)
( • - •)
/つ ".to_owned() + text.as_deref().unwrap_or(" つ")).await?;
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
    let cake: image::RgbImage = blend_image(cake, &face, 80, 80).convert();
    let cake = webp::Encoder::from_rgb(&cake, cake.width(), cake.height());
    let cake = cake.encode(90.0).to_vec();

    ctx.send(poise::CreateReply {
        content: Some(format!("{} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!", target.mention())),
        attachments: vec![serenity::CreateAttachment::bytes(
            cake,
            "cupcake.webp",
        )],
        ..Default::default()
    }).await?;
    Ok(())
}

/// Say that Natsuki is cute
///
/// Say that Natsuki is cute!
///
/// **Usage**: /cute
#[poise::command(category = "Fun", slash_command)]
pub async fn cute(ctx: Context<'_>) -> anyhow::Result<()> {
    let mut content = "Don't say this embarrassing thing, dummy!".to_owned();
    let reply = ctx.say(content.clone()).await?;
    let edit = |s| reply.edit(ctx, poise::CreateReply { content: Some(s), ..Default::default() });
    let typing = ctx.serenity_context().http.start_typing(ctx.channel_id());

    content.push_str("\nY-You t-too....");
    sleep(Duration::from_secs(3)).await;
    edit(content.clone()).await?;

    content.push_str("\nI'M NOT CUUUUUUUUUUUTE!");
    sleep(Duration::from_secs(2)).await;
    edit(content.clone()).await?;

    content.push_str("\nDon't think you can make me say this embarrassing thing just because we're not at school!");
    sleep(Duration::from_secs(2)).await;
    edit(content.clone()).await?;

    typing.stop();
    content.push_str("\nI-I have to go to the bathroom.");
    sleep(Duration::from_secs(4)).await;
    edit(content).await?;
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

/// Rate a character
///
/// Rate a character, defaulting to yourself
///
/// **Usage**: /rate [text]
#[poise::command(category = "Fun", slash_command)]
pub async fn rate(ctx: Context<'_>,
    #[description = "Character to rate"]
    text: Option<String>,
) -> anyhow::Result<()> {
    let character = text.unwrap_or_else(|| ctx.author().to_string());
    let trimmed = character.trim();
    let lower = trimmed.to_lowercase();
    let canonical = regex::Regex::new(r"<@!(\d+)>")?.replace_all(&lower, "<@$1>");
    let digest: [u64; 2] = unsafe { core::mem::transmute(md5::compute(canonical.as_bytes())) };
    let percentage = digest[0].wrapping_add(14) % 101;
    ctx.say(format!("<:natsuki:424991419329937428> I'd give {trimmed} {percentage}%.")).await?;
    Ok(())
}

/// Help Natsuki get the book on the shelf
///
/// Help Natsuki access the book on the shelf
///
/// **Usage**: /shelf [user]
#[poise::command(category = "Fun", slash_command)]
pub async fn shelf(ctx: Context<'_>,
    #[description = "User who helps Natsuki"]
    user: Option<serenity::User>,
) -> anyhow::Result<()> {
    let user = user.as_ref().unwrap_or_else(|| ctx.author());
    let initial = user.name.get(0..1).unwrap_or("");
    let repeat = rand::thread_rng().gen_range(5..13);
    ctx.say(format!("**Fucking {}{}**", user, initial.repeat(repeat))).await?;
    Ok(())
}

/// Ship characters
///
/// Ship specified characters
///
/// **Usage**: /ship [text separated by & or ×]
///
/// Note that × is multiplication sign (U+00D7)
#[poise::command(category = "Fun", slash_command)]
pub async fn ship(ctx: Context<'_>,
    #[description = "Characters to ship, separated by & or × (multiplication sign, U+00D7)"]
    text: Option<String>,
) -> anyhow::Result<()> {
    let slices = text.as_deref()
        .map_or_else(Vec::new, |t| t.split(['&', '×']).map(str::trim).collect());

    let ship = match slices.len() {
        0 => ctx.author().to_string() + concat!(" × <@", bot_id!(), ">"),
        1 => ctx.author().to_string() + " × " + slices[0],
        _ => slices.join(" × "),
    };
    ctx.say("Look at them, a lovey dovey couple!  I ship it!\n".to_owned()
        + &ship
        + "\nN-not that I c-care..."
    ).await?;
    Ok(())
}

async fn fuck(ctx: Context<'_>, user: Option<&serenity::User>) -> anyhow::Result<()> {
    let base = image::open("assets/566424ede431200e3985ca6f21287cee.png")?.into_rgba8();
    let author = face_image(ctx.author()).await?.resize(256, 256, CatmullRom);
    let image = blend_image(base, &author, 364, 120);
    let image: image::RgbImage  = match user {
        Some(u) => {
            let t = face_image(u).await?.resize(256, 256, CatmullRom);
            blend_image(image, &t, 110, 20)
        },
        None => image,
    }.convert();

    let image = webp::Encoder::from_rgb(&image, image.width(), image.height());
    let image = image.encode(90.0).to_vec();

    ctx.send(poise::CreateReply {
        content: Some(format!("{} fucked {}!",
            ctx.author().mention(),
            user.map_or_else(|| "Natsuki".to_owned(), |u| u.mention().to_string()))
        ),
        attachments: vec![serenity::CreateAttachment::bytes(
            image,
            "fuck.webp",
        )],
        ..Default::default()
    }).await?;
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
    ctx.send(poise::CreateReply {
        embeds: vec![serenity::CreateEmbed::new()
            .description(user.map_or_else(
                || format!("{author} smashed!"),
                |u| format!("{author} smashed {}!", u.mention())))
            .image("https://raw.githubusercontent.com/jdh8/natsuki/master/assets/smash.png")
        ],
        ..Default::default()
    }).await?;
    Ok(())
}

/// List Natsuki's preferred words
///
/// Link to the list of Natsuki's preferred words
///
/// **Usage**: /word
#[poise::command(category = "Fun", slash_command)]
pub async fn word(ctx: Context<'_>) -> anyhow::Result<()> {
    ctx.say("Here are my preferred words.\n\
        http://doki-doki-literature-club.wikia.com/wiki/Natsuki#Preferred_Words"
    ).await?;
    Ok(())
}