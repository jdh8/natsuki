mod core;
use poise::serenity_prelude as serenity;

#[derive(Debug)]
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
            ],
            prefix_options: poise::PrefixFrameworkOptions {
                prefix: Some("n.".into()),
                ..Default::default()
            },
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
