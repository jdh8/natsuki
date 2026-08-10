mod chat;
mod core;
mod fun;
mod information;
mod tools;
mod weeb;
use poise::serenity_prelude as serenity;
use std::env;

#[derive(Debug)]
pub struct Data {
    pub http: reqwest::Client,
    pub cupcake_base: image::RgbaImage,
    pub smash_base: image::RgbaImage,
    pub chat_url: String,
    pub chat_model: String,
    /// Absent when talking to a self-hosted model, which needs no bearer token.
    pub chat_key: Option<String>,
    pub chat_history: chat::ChatHistory,
}

type Context<'a> = poise::Context<'a, Data, anyhow::Error>;

fn get_commands() -> Vec<poise::Command<Data, anyhow::Error>> {
    vec![
        chat::chat(),
        core::git(),
        core::help(),
        core::invite(),
        core::ping(),
        core::support(),
        core::vote(),
        fun::beat(),
        fun::bunny(),
        fun::cupcake(),
        fun::cute(),
        fun::nut(),
        fun::poem::poem(),
        fun::rate(),
        fun::shelf(),
        fun::ship(),
        fun::smash(),
        fun::word(),
        information::avatar(),
        information::avatar_user(),
        information::snowflake(),
        information::snowflake_message(),
        information::snowflake_user(),
        information::role(),
        tools::base64::base64(),
        tools::base64::base64_encode(),
        tools::base64::base64_decode(),
        tools::color(),
        tools::keycaps(),
        tools::poll(),
        tools::someone(),
        weeb::feed(),
        weeb::hug(),
        weeb::kiss(),
        weeb::lewd(),
        weeb::lick(),
        weeb::neko(),
    ]
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    use serenity::{ClientBuilder, GatewayIntents, GuildId};
    // MESSAGE_CONTENT intent not needed: content is always populated in
    // messages that mention the bot, which is all the chat handler reads.
    const INTENTS: GatewayIntents = GatewayIntents::non_privileged();
    let token = env::var("TOKEN")?;

    let poster = env::var("TOP_GG_TOKEN").map(|token| {
        let client = topgg::Client::new(token);
        topgg::Autoposter::serenity(&client, std::time::Duration::from_secs(10800)).handler()
    });

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: env::var_os("CLEAR").map_or_else(get_commands, |_| Vec::new()),
            event_handler: |ctx, event, framework, data| {
                Box::pin(chat::event_handler(ctx, event, framework, data))
            },
            ..Default::default()
        })
        .setup(|ctx, _, framework| {
            Box::pin(async move {
                let commands = &framework.options().commands;
                match env::var("GUILD") {
                    Ok(id) => {
                        let guild = GuildId::new(id.parse::<u64>()?);
                        poise::builtins::register_in_guild(ctx, commands, guild).await?;
                    }
                    Err(env::VarError::NotPresent) => {
                        poise::builtins::register_globally(ctx, commands).await?;
                    }
                    Err(e) => return Err(e.into()),
                }
                let http = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(10))
                    .user_agent(concat!("natsuki/", env!("CARGO_PKG_VERSION")))
                    .build()?;
                let cupcake_base =
                    image::open("assets/290px-Hostess-Cupcake-Whole.jpg")?.into_rgba8();
                let smash_base =
                    image::open("assets/566424ede431200e3985ca6f21287cee.png")?.into_rgba8();
                Ok(Data {
                    http,
                    cupcake_base,
                    smash_base,
                    chat_url: env::var("CHAT_URL").unwrap_or_else(|_| chat::GROQ_URL.to_owned()),
                    chat_model: env::var("CHAT_MODEL")
                        .unwrap_or_else(|_| chat::GROQ_MODEL.to_owned()),
                    chat_key: env::var("GROQ_API_KEY").ok(),
                    chat_history: Default::default(),
                })
            })
        })
        .build();

    let client = ClientBuilder::new(token, INTENTS).framework(framework);
    let client = match poster {
        Ok(p) => client.event_handler_arc(p),
        _ => client,
    };

    client.await?.start_autosharded().await?;
    Ok(())
}

#[macro_export]
macro_rules! bot_id {
    () => {
        410_315_411_695_992_833
    };
}
