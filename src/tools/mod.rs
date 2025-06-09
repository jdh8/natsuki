pub mod base64;
use crate::Context;
use anyhow::Context as _;
use poise::serenity_prelude as serenity;
use rand::seq::IteratorRandom as _;
use regex::{Captures, Regex};

/// Display a color
///
/// Display a CSS color in 128x128
///
/// **Usage**: /color <color>
#[poise::command(category = "Tools", slash_command)]
pub async fn color(
    ctx: Context<'_>,
    #[description = "Color to display"] color: String,
) -> anyhow::Result<()> {
    let _typing = ctx.serenity_context().http.start_typing(ctx.channel_id());
    let color = csscolorparser::parse(&color)?;
    let pixel = image::Rgba(color.to_rgba8());
    let image = image::ImageBuffer::from_pixel(128, 128, pixel);
    let image = webp::Encoder::from_rgba(&image, image.width(), image.height());
    let image = image.encode_lossless().to_vec();

    ctx.send(poise::CreateReply {
        content: Some(
            "**Hex:** ".to_owned()
                + &color.to_css_hex()
                + "\n**RGB:** "
                + &color.to_css_rgb()
                + "\n**HSL:** "
                + &color.to_css_hsl(),
        ),
        attachments: vec![serenity::CreateAttachment::bytes(image, "color.webp")],
        ..Default::default()
    })
    .await?;
    Ok(())
}

/// Create a poll
///
/// Create a yes-no poll or up to 20 options.  Options must be separated by a
/// pipe (|) surrounded by spaces.
///
/// **Usage**: /poll <question|options...>
///
/// **Examples**:
/// /poll Is Miyuki Sone best waifu
/// /poll Sayori | Natsuki | Yuri | Monika"
#[allow(clippy::cast_possible_truncation)] //< The length is <= 20, which fits in u32
#[poise::command(category = "Tools", slash_command)]
pub async fn poll(
    ctx: Context<'_>,
    #[description = "Question or options"] text: String,
) -> anyhow::Result<()> {
    let options: Vec<_> = Regex::new(r"\s+\|\s+")?.splitn(&text, 20).collect();

    if options.len() == 1 {
        let question = options[0];
        let message = ctx.say(question).await?.into_message().await?;
        message.react(ctx, '👍').await?;
        message.react(ctx, '👎').await?;
        return Ok(());
    }

    let mut question = String::new();

    for (i, option) in options.iter().enumerate() {
        question.push(unsafe { char::from_u32_unchecked(i as u32 + 0x1F1E6) });
        question.push(' ');
        question.push_str(option);
        question.push('\n');
    }

    let message = ctx.say(question).await?.into_message().await?;

    for i in 0..options.len() {
        let emoji = unsafe { char::from_u32_unchecked(i as u32 + 0x1F1E6) };
        message.react(ctx, emoji).await?;
    }

    Ok(())
}

/// Wrap text in keycaps
///
/// Replace text with keycap emojis
///
/// **Usage**: /keycaps <text>
#[poise::command(category = "Tools", slash_command)]
pub async fn keycaps(
    ctx: Context<'_>,
    #[description = "Text to wrap in keycaps"] text: String,
) -> anyhow::Result<()> {
    let text = text.to_uppercase().replace(' ', "\u{2002}");
    let text = Regex::new(r"\d")?.replace_all(&text, "$0\u{20E3}");
    let text = Regex::new("[[:upper:]]")?.replace_all(&text, |c: &Captures<'_>| {
        let c = c[0].as_bytes()[0];
        let c = char::from_u32(0x1F1E6 - u32::from(b'A') + u32::from(c));
        c.into_iter().chain(Some('\u{AD}')).collect::<String>()
    });
    ctx.say(text).await?;
    Ok(())
}

/// Randomly pick someone
///
/// Randomly pick someone in the channel
///
/// **Usage**: /someone
#[poise::command(category = "Tools", slash_command, guild_only)]
pub async fn someone(ctx: Context<'_>) -> anyhow::Result<()> {
    let channel = ctx.channel_id().to_channel(ctx).await?.guild();
    let channel = channel.context("/someone only works in guilds")?;
    let member = channel.members(ctx)?.into_iter().choose(&mut rand::rng());
    ctx.say(member.context("No members in this channel")?.user.tag())
        .await?;
    Ok(())
}
