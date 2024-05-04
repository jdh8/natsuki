mod core;
mod fun;
mod information;
mod tools;
mod weeb;
mod topgg;
use poise::serenity_prelude as serenity;
use anyhow::Context as _;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct Data;

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
    #[shuttle_runtime::Secrets] secrets: shuttle_runtime::SecretStore,
) -> shuttle_serenity::ShuttleSerenity {
    let poster = topgg::Poster::new(secrets.get("TOP_GG_TOKEN"));
    let token = secrets.get("TOKEN").context("Discord token not found")?;

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: secrets.get("CLEAR").map_or_else(get_commands, |_| Vec::new()),
            ..Default::default()
        })
        .setup(|ctx, _, framework| {
            Box::pin(async move {
                let commands = &framework.options().commands;
                match secrets.get("GUILD") {
                    Some(id) => {
                        let guild = serenity::GuildId::new(id.parse::<u64>()?);
                        poise::builtins::register_in_guild(ctx, commands, guild).await?;
                    },
                    None => poise::builtins::register_globally(ctx, commands).await?,
                };
                Ok(Data)
            })
        })
        .build();

    Ok(serenity::ClientBuilder::new(token, serenity::GatewayIntents::non_privileged())
        .framework(framework)
        .event_handler(poster)
        .await
        .map_err(shuttle_runtime::CustomError::new)?
        .into())
}

#[macro_export]
macro_rules! bot_id {
    () => { 410_315_411_695_992_833 };
}