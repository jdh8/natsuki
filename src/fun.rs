use crate::Context;
use image::{GenericImageView, Pixel};
use image::buffer::ConvertBuffer;
use image::imageops::FilterType::CatmullRom;
use poise::serenity_prelude as serenity;
use serenity::Mentionable;

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
    let mut cake = image::open("assets/290px-Hostess-Cupcake-Whole.jpg")?.into_rgba8();

    for x in 0..128 {
        for y in 0..128 {
            cake.get_pixel_mut(x + 80, y + 80).blend(&face.get_pixel(x, y));
        }
    }

    let opaque : image::RgbImage = cake.convert();
    let encoder = webp::Encoder::from_rgb(&opaque, opaque.width(), opaque.height());

    ctx.send(|f| f
        .content(format!("{} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!", target.mention()))
        .attachment(serenity::model::channel::AttachmentType::Bytes {
            data: encoder.encode(85.0).to_vec().into(),
            filename: "cupcake.webp".into(),
        })
    ).await?;

    Ok(())
}