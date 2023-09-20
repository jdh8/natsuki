mod core;
mod fun;
mod information;
mod tools;
mod weeb;
mod topgg;
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

#[shuttle_runtime::main]
async fn main(
    #[shuttle_static_folder::StaticFolder(folder = "assets")] path: PathBuf,
    #[shuttle_secrets::Secrets] secrets: shuttle_secrets::SecretStore,
) -> shuttle_poise::ShuttlePoise<Data, anyhow::Error> {
    let poster = topgg::Poster::new(secrets.get("TOP_GG_TOKEN"));

    let builder = poise::Framework::builder()
        .token(secrets.get("TOKEN").expect("Discord token not found"))
        .intents(serenity::GatewayIntents::non_privileged())
        .options(poise::FrameworkOptions {
            commands: secrets.get("CLEAR").map_or_else(get_commands, |_| Vec::new()),
            ..Default::default()
        })
        .setup(|ctx, _, framework| {
            Box::pin(async move {
                let commands = &framework.options().commands;
                match secrets.get("GUILD") {
                    Some(id) => {
                        let guild = serenity::GuildId(id.parse::<u64>()?);
                        poise::builtins::register_in_guild(ctx, commands, guild).await?;
                    },
                    None => poise::builtins::register_globally(ctx, commands).await?,
                };
                Ok(Data { assets: path })
            })
        })
        .client_settings(|client| client.event_handler(poster));

    Ok(builder.build().await.map_err(shuttle_runtime::CustomError::new)?.into())
}