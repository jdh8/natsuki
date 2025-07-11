mod core;
mod fun;
mod information;
mod tools;
mod weeb;
use poise::serenity_prelude as serenity;
use std::env;

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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    use serenity::{ClientBuilder, GatewayIntents, GuildId};
    const INTENTS: GatewayIntents = GatewayIntents::non_privileged();
    let token = env::var("TOKEN")?;

    let poster = env::var("TOP_GG_TOKEN").map(|token| {
        let client = topgg::Client::new(token);
        topgg::Autoposter::serenity(&client, std::time::Duration::from_secs(10800)).handler()
    });

    let framework = poise::Framework::builder()
        .options(poise::FrameworkOptions {
            commands: env::var_os("CLEAR").map_or_else(get_commands, |_| Vec::new()),
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
                Ok(Data)
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
