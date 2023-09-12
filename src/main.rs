mod core;
mod fun;
mod information;
mod tools;
mod weeb;
use poise::serenity_prelude as serenity;
use std::path::PathBuf;

#[macro_export]
macro_rules! bot_id {
    () => { 410_315_411_695_992_833 };
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Data {
    assets: PathBuf,
}

type Context<'a> = poise::Context<'a, Data, anyhow::Error>;

fn get_commands() -> Vec<poise::Command<Data, anyhow::Error>> {
    vec![
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

async fn update_top_gg(token: &str, ready: &serenity::Ready) -> reqwest::Result<reqwest::Response> {
    reqwest::Client::new()
        .post(concat!("https://top.gg/api/bots/", bot_id!(), "/stats"))
        .header("Authorization", token)
        .json(&ready.shard.map_or_else(
            || serde_json::json!({
                "server_count": ready.guilds.len(),
            }),
            |[_, s]| serde_json::json!({
                "server_count": s * ready.guilds.len() as u64,
                "shard_count": s,
            })
        ))
        .send().await
}

#[shuttle_runtime::main]
async fn main(
    #[shuttle_static_folder::StaticFolder(folder = "assets")] path: PathBuf,
    #[shuttle_secrets::Secrets] secrets: shuttle_secrets::SecretStore,
) -> shuttle_poise::ShuttlePoise<Data, anyhow::Error> {
    let builder = poise::Framework::builder()
        .token(secrets.get("TOKEN").expect("Discord token not found"))
        .intents(serenity::GatewayIntents::non_privileged())
        .options(poise::FrameworkOptions {
            commands: secrets.get("CLEAR").map_or_else(get_commands, |_| vec![]),
            ..Default::default()
        })
        .setup(|ctx, ready, framework| {
            Box::pin(async move {
                let commands = &framework.options().commands;
                match secrets.get("GUILD") {
                    Some(id) => {
                        let guild = serenity::GuildId(id.parse::<u64>()?);
                        poise::builtins::register_in_guild(ctx, commands, guild).await?;
                    },
                    None => poise::builtins::register_globally(ctx, commands).await?,
                };
                if let Some(token) = secrets.get("TOP_GG_TOKEN") {
                    let _ = update_top_gg(&token, ready).await;
                }
                Ok(Data { assets: path })
            })
        });

    Ok(builder.build().await.map_err(shuttle_runtime::CustomError::new)?.into())
}