use crate::Context;

/// Show this help message
///
/// Show list of commands or information about a given command
///
/// **Usage**: /help [command]
#[poise::command(prefix_command, slash_command)]
pub async fn help(ctx: Context<'_>,
    #[description = "Specific command to show help about"]
    #[autocomplete = "poise::builtins::autocomplete_command"]
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
#[poise::command(prefix_command, slash_command)]
pub async fn ping(ctx: Context<'_>) -> anyhow::Result<()> {
    let tick = std::time::Instant::now();
    let reply = ctx.say("Pong!").await?;
    let duration = tick.elapsed();
    
    reply.edit(ctx, |m| m.content(
        if duration < std::time::Duration::from_secs(1) {
            format!("Pong! {} ms", duration.as_millis())
        } else {
            format!("Pong! {:.3} s", duration.as_secs_f32())
        }
    )).await?;

    Ok(())
}

/// GitHub repo
///
/// Natsuki's source code repository
///
/// **Usage**: /git
#[poise::command(prefix_command, slash_command, aliases("repo", "source"))]
pub async fn git(ctx: Context<'_>) -> anyhow::Result<()> {
    ctx.say("https://github.com/jdh8/natsuki").await?;
    Ok(())
}
