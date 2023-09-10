mod core;
mod fun;
mod information;
mod tools;
mod weeb;
use poise::serenity_prelude as serenity;

#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub struct Data;

type Context<'a> = poise::Context<'a, Data, anyhow::Error>;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let framework = poise::Framework::builder()
        .token(dotenv::var("TOKEN")?)
        .intents(serenity::GatewayIntents::non_privileged())
        .options(poise::FrameworkOptions {
            commands: vec![
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
                tools::someone(),
                weeb::feed(),
                weeb::hug(),
                weeb::kiss(),
                weeb::lewd(),
                weeb::lick(),
                weeb::neko(),
            ],
            ..Default::default()
        })
        .setup(|ctx, _ready, framework| {
            Box::pin(async move {
                let commands = &framework.options().commands;
                match dotenv::var("GUILD") {
                    Ok(id) => {
                        let guild = serenity::GuildId(id.parse::<u64>()?);
                        poise::builtins::register_in_guild(ctx, commands, guild).await?
                    },
                    Err(_) => poise::builtins::register_globally(ctx, commands).await?,
                };
                Ok(Data)
            })
        });

    framework.run().await?;
    Ok(())
}
