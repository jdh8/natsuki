mod core;
mod fun;
mod information;
mod tools;
mod weeb;
use poise::serenity_prelude as serenity;
use std::path::PathBuf;

#[macro_export]
macro_rules! bot_id {
    () => { 410315411695992833 };
}

#[derive(Debug, Default, Clone, PartialEq)]
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

#[shuttle_runtime::main]
async fn main(
    #[shuttle_static_folder::StaticFolder(folder = "assets")] path: PathBuf,
    #[shuttle_secrets::Secrets] secrets: shuttle_secrets::SecretStore,
) -> shuttle_poise::ShuttlePoise<Data, anyhow::Error> {
    let builder = poise::Framework::builder()
        .token(secrets.get("TOKEN").expect("Discord token not found"))
        .intents(serenity::GatewayIntents::non_privileged())
        .options(poise::FrameworkOptions {
            commands: match secrets.get("CLEAR") {
                Some(_) => vec![],
                None => get_commands(),
            },
            ..Default::default()
        })
        .setup(|ctx, _ready, framework| {
            Box::pin(async move {
                let commands = &framework.options().commands;
                match secrets.get("GUILD") {
                    Some(id) => {
                        let guild = serenity::GuildId(id.parse::<u64>()?);
                        poise::builtins::register_in_guild(ctx, commands, guild).await?
                    },
                    None => poise::builtins::register_globally(ctx, commands).await?,
                };
                Ok(Data { assets: path })
            })
        });

    Ok(builder.build().await.map_err(shuttle_runtime::CustomError::new)?.into())
}