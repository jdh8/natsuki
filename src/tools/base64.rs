use crate::Context;
use base64::{engine, Engine as _};
use futures::stream::FuturesOrdered;
use futures::TryStreamExt as _;
use poise::serenity_prelude as serenity;

const ENGINE: engine::GeneralPurpose = engine::GeneralPurpose::new(
    &base64::alphabet::STANDARD,
    engine::general_purpose::NO_PAD
        .with_decode_allow_trailing_bits(true)
        .with_decode_padding_mode(engine::DecodePaddingMode::Indifferent),
);

fn forgiving_decode(s: impl AsRef<[u8]>) -> Result<Vec<u8>, base64::DecodeError> {
    ENGINE.decode(
        s.as_ref()
            .iter()
            .copied()
            .filter(|c| !c.is_ascii_whitespace())
            .collect::<Vec<_>>(),
    )
}

#[poise::command(slash_command)]
async fn encode(ctx: Context<'_>, text: String) -> anyhow::Result<()> {
    ctx.say(ENGINE.encode(text)).await?;
    Ok(())
}

#[poise::command(slash_command)]
async fn decode(ctx: Context<'_>, text: String) -> anyhow::Result<()> {
    ctx.say(String::from_utf8(forgiving_decode(text)?)?).await?;
    Ok(())
}

/// Encode or decode Base64
///
/// Encode or decode Base64 in the standard alphabet with no padding.
///
/// **Usage:** /base64 <encode|decode> [text]
#[allow(clippy::unused_async)]
#[poise::command(category = "Tools", slash_command, subcommands("encode", "decode"))]
pub async fn base64(_: Context<'_>) -> anyhow::Result<()> {
    unimplemented!("Unimplemented prefix command")
}

async fn encode_attachment(
    attachment: serenity::Attachment,
) -> anyhow::Result<serenity::CreateAttachment> {
    let code = ENGINE.encode(attachment.download().await?);
    let code = code.as_bytes().iter().enumerate().flat_map(|(i, c)| {
        if i != 0 && i % 76 == 0 {
            Some(b'\n')
        } else {
            None
        }
        .into_iter()
        .chain(Some(*c))
    });
    let code: Vec<_> = code.collect();
    Ok(serenity::CreateAttachment::bytes(
        code,
        attachment.filename + ".b64.txt",
    ))
}

fn encode_embed(mut embed: serenity::Embed) -> serenity::CreateEmbed {
    fn encode(s: impl AsRef<[u8]>) -> String {
        ENGINE.encode(s)
    }

    if let Some(author) = embed.author.as_mut() {
        author.name = encode(&author.name);
    }

    if let Some(footer) = embed.footer.as_mut() {
        footer.text = encode(&footer.text);
    }

    if let Some(provider) = embed.provider.as_mut() {
        provider.name = provider.name.as_deref().map(encode);
    }

    embed.description = embed.description.map(encode);
    embed.title = embed.title.map(encode);
    embed.into()
}

#[poise::command(context_menu_command = "Base64 encode")]
pub async fn base64_encode(ctx: Context<'_>, message: serenity::Message) -> anyhow::Result<()> {
    let _typing = ctx.serenity_context().http.start_typing(ctx.channel_id());
    let attachments = message.attachments.into_iter().map(encode_attachment);
    let attachments: FuturesOrdered<_> = attachments.collect();

    ctx.send(poise::CreateReply {
        attachments: attachments.try_collect().await?,
        embeds: message
            .embeds
            .into_iter()
            .filter(|e| !matches!(e.kind.as_deref(), Some("rich") | None))
            .map(encode_embed)
            .collect(),
        content: Some(ENGINE.encode(message.content)),
        ..Default::default()
    })
    .await?;
    Ok(())
}

fn guess_extension_from_mime<'a>(main: &'_ str, subtype: &'a str) -> &'a str {
    match subtype {
        "msword" => "doc",
        "vnd.openxmlformats-officedocument.wordprocessingml.document" => "docx",
        "gzip" => "gz",
        "vnd.microsoft.icon" => "ico",
        "jpeg" => "jpg",
        "javascript" => "js",
        "ld" => "jsonld",
        "vnd.oasis.opendocument.presentation" => "odp",
        "vnd.oasis.opendocument.spreadsheet" => "ods",
        "vnd.oasis.opendocument.text" => "odt",
        "x-httpd-php" => "php",
        "vnd.ms-powerpoint" => "ppt",
        "vnd.openxmlformats-officedocument.presentationml.presentation" => "pptx",
        "vnd.rar" => "rar",
        "plain" => "txt",
        "woff2" => "woff2",
        "xhtml" => "xhtml",
        "vnd.ms-excel" => "xls",
        "vnd.openxmlformats-officedocument.spreadsheetml.sheet" => "xlsx",
        "3gpp" => "3gp",
        "3gpp2" => "3g2",
        "x-7z-compressed" => "7z",

        "ogg" => match main {
            "audio" => "ogg",
            "video" => "ogv",
            _ => "ogx",
        },

        "webm" => match main {
            "audio" => "weba",
            _ => "webm",
        },

        other => match other.len() {
            2..=4 => other,
            _ => {
                if main == "text" {
                    "txt"
                } else {
                    "bin"
                }
            }
        },
    }
}

fn guess_extension(bytes: &[u8]) -> &'static str {
    let pattern = regex::Regex::new(r"^([-.\w]+)/([-.\w]+)").expect("Invalid regex");
    let captures = pattern.captures(tree_magic_mini::from_u8(bytes));

    captures.map_or("bin", |captures| {
        let (_, [main, subtype]) = captures.extract();
        guess_extension_from_mime(main, subtype)
    })
}

async fn decode_attachment(
    attachment: serenity::Attachment,
) -> anyhow::Result<serenity::CreateAttachment> {
    let buffer = forgiving_decode(attachment.download().await?)?;
    let extension = guess_extension(&buffer);
    Ok(serenity::CreateAttachment::bytes(
        buffer,
        attachment.filename + "." + extension,
    ))
}

fn decode_embed(mut embed: serenity::Embed) -> anyhow::Result<serenity::CreateEmbed> {
    fn decode(s: impl AsRef<[u8]>) -> anyhow::Result<String> {
        Ok(String::from_utf8(forgiving_decode(s)?)?)
    }

    if let Some(author) = embed.author.as_mut() {
        author.name = decode(&author.name)?;
    }

    if let Some(footer) = embed.footer.as_mut() {
        footer.text = decode(&footer.text)?;
    }

    if let Some(provider) = embed.provider.as_mut() {
        provider.name = provider.name.as_deref().map(decode).transpose()?;
    }

    embed.description = embed.description.map(decode).transpose()?;
    embed.title = embed.title.map(decode).transpose()?;
    Ok(embed.into())
}

#[poise::command(context_menu_command = "Base64 decode")]
pub async fn base64_decode(ctx: Context<'_>, message: serenity::Message) -> anyhow::Result<()> {
    let _typing = ctx.serenity_context().http.start_typing(ctx.channel_id());
    let text = String::from_utf8(forgiving_decode(message.content)?)?;
    let attachments = message.attachments.into_iter().map(decode_attachment);
    let attachments: FuturesOrdered<_> = attachments.collect();

    ctx.send(poise::CreateReply {
        attachments: attachments.try_collect().await?,
        embeds: message.embeds.into_iter().flat_map(decode_embed).collect(),
        content: Some(text),
        ..Default::default()
    })
    .await?;
    Ok(())
}
