pub mod base64;
use crate::Context;
use csscolorparser::Color;
use poise::serenity_prelude as serenity;

fn to_hsl_string(color: &Color) -> String {
    let (h, s, l, a) = color.to_hsla();
    let (s, l) = (100.0 * s, 100.0 * l);
    if color.a == 1.0 { format!("hsl({:.1}, {:.2}%, {:.2}%)", h, s, l) }
    else { format!("hsla({:.1}, {:.2}%, {:.2}%, {:.4})", h, s, l, a) }
}

/// Display a color
///
/// Display a CSS color in 128x128
///
/// **Usage**: /color <color>
#[poise::command(category = "Tools", slash_command)]
pub async fn color(ctx: Context<'_>,
    #[description = "Color to display"]
    color: String,
) -> anyhow::Result<()> {
    let _typing = ctx.serenity_context().http.start_typing(ctx.channel_id().0);
    let color = csscolorparser::parse(&color)?;
    let pixel = image::Rgba(color.to_rgba8());
    let image = image::ImageBuffer::from_pixel(128, 128, pixel);
    let image = webp::Encoder::from_rgba(&image, image.width(), image.height());
    
    ctx.send(|m| m
        .content("**Hex:** ".to_owned() + &color.to_hex_string()
            + "\n**RGB:** " + &color.to_rgb_string()
            + "\n**HSL:** " + &to_hsl_string(&color)
        )
        .attachment(serenity::model::channel::AttachmentType::Bytes {
            data: image.encode_lossless().to_vec().into(),
            filename: "color.webp".into(),
        })
    ).await?;
    Ok(())
}