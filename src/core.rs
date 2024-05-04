use crate::{Context, bot_id};

/// Show this help message
///
/// Show list of commands or information about a given command
///
/// **Usage**: /help [command]
#[poise::command(category = "Core", slash_command)]
pub async fn help(ctx: Context<'_>,
    #[description = "Specific command to show help about"]
    command: Option<String>,
) -> anyhow::Result<()> {
    poise::builtins::help(
        ctx,
        command.as_deref(),
        poise::builtins::HelpConfiguration::default(),
    ).await?;
    Ok(())
}

/// Pong and show latency!
///
/// Test if Natsuki responds and get the latency
///
/// **Usage**: /ping
#[poise::command(category = "Core", slash_command)]
pub async fn ping(ctx: Context<'_>) -> anyhow::Result<()> {
    let tick = std::time::Instant::now();
    let reply = ctx.say("Pong!").await?;
    let duration = tick.elapsed();

    let message = if duration < std::time::Duration::from_secs(1) {
        format!("Pong! {} ms", duration.as_millis())
    } else {
        format!("Pong! {:.3} s", duration.as_secs_f32())
    };

    reply.edit(ctx, poise::CreateReply {
        content: Some(message),
        ..Default::default()
    }).await?;
    Ok(())
}

/// GitHub repo
///
/// Natsuki's source code repository
///
/// **Usage**: /git
#[poise::command(category = "Core", slash_command)]
pub async fn git(ctx: Context<'_>) -> anyhow::Result<()> {
    ctx.say("https://github.com/jdh8/natsuki").await?;
    Ok(())
}

/// Invite Natsuki to your server
///
/// Get the invite link for Natsuki
///
/// **Usage**: /invite
#[poise::command(category = "Core", slash_command)]
pub async fn invite(ctx: Context<'_>) -> anyhow::Result<()> {
    ctx.say(concat!("https://discord.com/application-directory/", bot_id!())).await?;
    Ok(())
}

/// Support server
///
/// Get the invite link for Natsuki's shelf
///
/// **Usage**: /support
#[poise::command(category = "Core", slash_command)]
pub async fn support(ctx: Context<'_>) -> anyhow::Result<()> {
    ctx.say("https://discord.gg/gvXAy63dNR").await?;
    Ok(())
}

/// Vote for Natsuki
///
/// Vote for Natsuki on top.gg
///
/// **Usage**: /vote
#[poise::command(category = "Core", slash_command)]
pub async fn vote(ctx: Context<'_>) -> anyhow::Result<()> {
    ctx.say(concat!("https://top.gg/bot/", bot_id!(), "/vote")).await?;
    Ok(())
}