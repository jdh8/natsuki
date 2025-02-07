use crate::Context;
use bitflags::bitflags;
use core::time::Duration;
use futures::try_join;
use poise::serenity_prelude as serenity;
use rand::seq::IndexedRandom as _;
use serenity::ButtonStyle::{Danger, Secondary, Success};
use serenity::EmojiId;

bitflags! {
    struct Preference : u8 {
        const Sayori = 0b01;
        const Yuri = 0b10;
    }
}

const DICTIONARY: [(&str, Preference); 228] = [
    ("adventure", Preference::Sayori),
    ("afterimage", Preference::Yuri),
    ("agonizing", Preference::Yuri),
    ("alone", Preference::all()),
    ("amazing", Preference::Sayori),
    ("ambient", Preference::Yuri),
    ("analysis", Preference::Yuri),
    ("anger", Preference::empty()),
    ("anime", Preference::empty()),
    ("anxiety", Preference::Yuri),
    ("atone", Preference::Yuri),
    ("aura", Preference::Yuri),
    ("awesome", Preference::Sayori),
    ("beauty", Preference::Sayori),
    ("bed", Preference::Sayori),
    ("blanket", Preference::empty()),
    ("bliss", Preference::Sayori),
    ("boop", Preference::empty()),
    ("bouncy", Preference::empty()),
    ("breathe", Preference::Yuri),
    ("broken", Preference::all()),
    ("bubbles", Preference::empty()),
    ("bunny", Preference::empty()),
    ("cage", Preference::Yuri),
    ("calm", Preference::all()),
    ("candy", Preference::empty()),
    ("captive", Preference::Yuri),
    ("charm", Preference::Sayori),
    ("cheeks", Preference::empty()),
    ("cheer", Preference::Sayori),
    ("childhood", Preference::Sayori),
    ("chocolate", Preference::empty()),
    ("climax", Preference::Yuri),
    ("clouds", Preference::empty()),
    ("clumsy", Preference::Sayori),
    ("color", Preference::Sayori),
    ("comfort", Preference::Sayori),
    ("contamination", Preference::Yuri),
    ("covet", Preference::Yuri),
    ("crimson", Preference::Yuri),
    ("cry", Preference::all()),
    ("cute", Preference::empty()),
    ("dance", Preference::Sayori),
    ("dark", Preference::all()),
    ("daydream", Preference::all()),
    ("dazzle", Preference::Sayori),
    ("death", Preference::all()),
    ("defeat", Preference::all()),
    ("depression", Preference::all()),
    ("desire", Preference::Yuri),
    ("despise", Preference::Yuri),
    ("destiny", Preference::Yuri),
    ("determination", Preference::Yuri),
    ("disarray", Preference::Yuri),
    ("disaster", Preference::Yuri),
    ("disoriented", Preference::Yuri),
    ("disown", Preference::Yuri),
    ("doki-doki", Preference::empty()),
    ("dream", Preference::Yuri),
    ("effulgent", Preference::Yuri),
    ("electricity", Preference::Yuri),
    ("email", Preference::empty()),
    ("embrace", Preference::all()),
    ("empty", Preference::all()),
    ("entropy", Preference::Yuri),
    ("essence", Preference::Yuri),
    ("eternity", Preference::Yuri),
    ("excitement", Preference::Sayori),
    ("existence", Preference::Yuri),
    ("explode", Preference::Yuri),
    ("extraordinary", Preference::Sayori),
    ("extreme", Preference::Yuri),
    ("family", Preference::Sayori),
    ("fantasy", Preference::empty()),
    ("fear", Preference::all()),
    ("feather", Preference::Sayori),
    ("fester", Preference::Yuri),
    ("fickle", Preference::Yuri),
    ("fireflies", Preference::Sayori),
    ("fireworks", Preference::Sayori),
    ("flee", Preference::Yuri),
    ("flower", Preference::Sayori),
    ("fluffy", Preference::empty()),
    ("flying", Preference::Sayori),
    ("forgive", Preference::all()),
    ("friends", Preference::Sayori),
    ("frightening", Preference::Yuri),
    ("fun", Preference::Sayori),
    ("games", Preference::empty()),
    ("giggle", Preference::empty()),
    ("graveyard", Preference::Yuri),
    ("grief", Preference::all()),
    ("hair", Preference::empty()),
    ("happiness", Preference::Sayori),
    ("headphones", Preference::empty()),
    ("heartbeat", Preference::empty()),
    ("heart", Preference::Sayori),
    ("heavensent", Preference::Yuri),
    ("holiday", Preference::Sayori),
    ("hopeless", Preference::all()),
    ("hope", Preference::all()),
    ("hop", Preference::empty()),
    ("horror", Preference::Yuri),
    ("hurt", Preference::all()),
    ("imagination", Preference::Yuri),
    ("incapable", Preference::Yuri),
    ("incongruent", Preference::Yuri),
    ("infallible", Preference::Yuri),
    ("inferno", Preference::Yuri),
    ("infinite", Preference::Yuri),
    ("insight", Preference::Yuri),
    ("intellectual", Preference::Yuri),
    ("journey", Preference::Yuri),
    ("joy", Preference::all()),
    ("judgment", Preference::Yuri),
    ("jumpy", Preference::empty()),
    ("jump", Preference::empty()),
    ("kawaii", Preference::empty()),
    ("kiss", Preference::empty()),
    ("kitty", Preference::empty()),
    ("landscape", Preference::Yuri),
    ("laugh", Preference::Sayori),
    ("lazy", Preference::Sayori),
    ("lipstick", Preference::empty()),
    ("lollipop", Preference::empty()),
    ("loud", Preference::Sayori),
    ("love", Preference::Sayori),
    ("lucky", Preference::Sayori),
    ("lust", Preference::Yuri),
    ("marriage", Preference::Sayori),
    ("marshmallow", Preference::empty()),
    ("massacre", Preference::Yuri),
    ("meager", Preference::Yuri),
    ("melancholy", Preference::Yuri),
    ("melody", Preference::empty()),
    ("memories", Preference::Sayori),
    ("milk", Preference::empty()),
    ("misery", Preference::all()),
    ("misfortune", Preference::all()),
    ("mouse", Preference::empty()),
    ("music", Preference::Sayori),
    ("nature", Preference::Sayori),
    ("nibble", Preference::empty()),
    ("nightgown", Preference::empty()),
    ("ocean", Preference::Sayori),
    ("pain", Preference::all()),
    ("papa", Preference::empty()),
    ("parfait", Preference::empty()),
    ("party", Preference::Sayori),
    ("passion", Preference::Sayori),
    ("peaceful", Preference::all()),
    ("peace", Preference::empty()),
    ("philosophy", Preference::Yuri),
    ("pink", Preference::empty()),
    ("playground", Preference::empty()),
    ("play", Preference::Sayori),
    ("pleasure", Preference::Yuri),
    ("poof", Preference::empty()),
    ("portrait", Preference::Yuri),
    ("pout", Preference::empty()),
    ("prayer", Preference::all()),
    ("precious", Preference::Sayori),
    ("promise", Preference::Sayori),
    ("puppy", Preference::empty()),
    ("pure", Preference::empty()),
    ("question", Preference::Yuri),
    ("rainbow", Preference::Sayori),
    ("raincloud", Preference::Sayori),
    ("raindrops", Preference::Yuri),
    ("ribbon", Preference::empty()),
    ("romance", Preference::Sayori),
    ("rose", Preference::all()),
    ("sadness", Preference::Sayori),
    ("scars", Preference::all()),
    ("secretive", Preference::Yuri),
    ("sensation", Preference::Yuri),
    ("shame", Preference::all()),
    ("shiny", Preference::empty()),
    ("shopping", Preference::empty()),
    ("silly", Preference::Sayori),
    ("sing", Preference::Sayori),
    ("skipping", Preference::empty()),
    ("skirt", Preference::empty()),
    ("smile", Preference::Sayori),
    ("socks", Preference::empty()),
    ("sparkle", Preference::Sayori),
    ("special", Preference::Sayori),
    ("spinning", Preference::empty()),
    ("starscape", Preference::Yuri),
    ("sticky", Preference::empty()),
    ("strawberry", Preference::empty()),
    ("sugar", Preference::empty()),
    ("suicide", Preference::Yuri),
    ("summer", Preference::empty()),
    ("sunny", Preference::Sayori),
    ("sunset", Preference::Sayori),
    ("sweet", Preference::Sayori),
    ("swimsuit", Preference::empty()),
    ("tears", Preference::all()),
    ("tenacious", Preference::Yuri),
    ("time", Preference::Yuri),
    ("together", Preference::Sayori),
    ("tragedy", Preference::all()),
    ("treasure", Preference::Sayori),
    ("twirl", Preference::empty()),
    ("uncanny", Preference::Yuri),
    ("uncontrollable", Preference::Yuri),
    ("unending", Preference::Yuri),
    ("universe", Preference::Yuri),
    ("unrequited", Preference::all()),
    ("unrestrained", Preference::Yuri),
    ("unstable", Preference::Yuri),
    ("vacation", Preference::Sayori),
    ("valentine", Preference::empty()),
    ("vanilla", Preference::empty()),
    ("variance", Preference::Yuri),
    ("vertigo", Preference::Yuri),
    ("vibrant", Preference::Yuri),
    ("vitality", Preference::Yuri),
    ("vivacious", Preference::Yuri),
    ("vivid", Preference::Yuri),
    ("warm", Preference::Sayori),
    ("waterfall", Preference::empty()),
    ("whirlwind", Preference::Yuri),
    ("whisper", Preference::empty()),
    ("whistle", Preference::empty()),
    ("wonderful", Preference::Sayori),
    ("wrath", Preference::Yuri),
];

#[derive(poise::ChoiceParameter, Debug, Clone, Copy, PartialEq, Eq, PartialOrd)]
pub enum Act {
    #[name = "1"]
    One = 1,
    #[name = "2"]
    Two,
    #[name = "3"]
    Three,
}

#[derive(strum::EnumString, strum::Display, Debug, Clone, Copy, PartialEq)]
enum Doki {
    Natsuki,
    Sayori,
    Yuri,
    Monika,
}

fn make_buttons(
    buttons: &[(EmojiId, Doki)],
    style: impl Fn(Doki) -> serenity::ButtonStyle,
    disabled: bool,
) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(
        buttons
            .iter()
            .copied()
            .map(|(emoji, doki)| {
                serenity::CreateButton::new(doki.to_string())
                    .style(style(doki))
                    .emoji(emoji)
                    .label(doki.to_string())
                    .disabled(disabled)
            })
            .collect(),
    )
}

async fn game(
    ctx: Context<'_>,
    word: &str,
    answer: Doki,
    buttons: &[(EmojiId, Doki)],
) -> anyhow::Result<()> {
    let content = Some("Whose word is **".to_owned() + word + "**?  Please answer in 15 seconds.");
    let question = ctx
        .send(poise::CreateReply {
            content,
            components: Some(vec![make_buttons(buttons, |_| Secondary, false)]),
            ..Default::default()
        })
        .await?;

    let collected = serenity::ComponentInteractionCollector::new(ctx)
        .author_id(ctx.author().id)
        .message_id(question.message().await?.id)
        .timeout(Duration::from_secs(15))
        .await;

    match collected {
        Some(interaction) => {
            let right = "Congratulations!  That's correct.".to_owned();
            let wrong = format!("Sorry, it's **{answer}**.");
            let selected = interaction.data.custom_id.parse::<Doki>()?;

            let response = interaction.create_response(
                ctx,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(if selected == answer { right } else { wrong }),
                ),
            );
            let style = |doki: Doki| {
                if doki == answer {
                    Success
                } else if doki == selected {
                    Danger
                } else {
                    Secondary
                }
            };
            let edit = question.edit(
                ctx,
                poise::CreateReply {
                    components: Some(vec![make_buttons(buttons, style, true)]),
                    ..Default::default()
                },
            );
            try_join!(response, edit)?;
        }
        None => {
            question
                .edit(
                    ctx,
                    poise::CreateReply {
                        components: Some(vec![make_buttons(buttons, |_| Secondary, true)]),
                        ..Default::default()
                    },
                )
                .await?;
        }
    }
    Ok(())
}

async fn poem1(ctx: Context<'_>) -> anyhow::Result<()> {
    let (word, preference) = DICTIONARY
        .choose(&mut rand::rng())
        .expect("The dictionary is empty!");
    let doki = if preference.contains(Preference::Sayori) {
        Doki::Sayori
    } else if preference.contains(Preference::Yuri) {
        Doki::Yuri
    } else {
        Doki::Natsuki
    };

    game(
        ctx,
        word,
        doki,
        &[
            (EmojiId::new(424_991_418_386_350_081), Doki::Sayori),
            (EmojiId::new(424_991_419_329_937_428), Doki::Natsuki),
            (EmojiId::new(424_987_242_986_078_218), Doki::Yuri),
        ],
    )
    .await
}

async fn poem2(ctx: Context<'_>) -> anyhow::Result<()> {
    let (word, preference) = DICTIONARY
        .choose(&mut rand::rng())
        .expect("The dictionary is empty!");
    let doki = if preference.contains(Preference::Yuri) {
        Doki::Yuri
    } else {
        Doki::Natsuki
    };

    game(
        ctx,
        word,
        doki,
        &[
            (EmojiId::new(424_991_419_329_937_428), Doki::Natsuki),
            (EmojiId::new(424_987_242_986_078_218), Doki::Yuri),
        ],
    )
    .await
}

async fn poem3(ctx: Context<'_>) -> anyhow::Result<()> {
    game(
        ctx,
        "Monika",
        Doki::Monika,
        &[(EmojiId::new(501_274_687_842_680_832), Doki::Monika)],
    )
    .await
}

/// Play a poem game
///
/// Play a poem game with specified DDLC act
///
/// **Usage**: /poem <act>
#[poise::command(category = "Fun", slash_command)]
pub async fn poem(
    ctx: Context<'_>,
    #[description = "Act of the poem game"] act: Act,
) -> anyhow::Result<()> {
    match act {
        Act::One => poem1(ctx).await,
        Act::Two => poem2(ctx).await,
        Act::Three => poem3(ctx).await,
    }
}
