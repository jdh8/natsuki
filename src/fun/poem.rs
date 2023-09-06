use crate::Context;
use poise::serenity_prelude as serenity;
use serenity::ButtonStyle::{Secondary, Success, Danger};
use serenity::EmojiId;
use core::time::Duration;

#[derive(poise::ChoiceParameter, Debug, Clone, Copy, PartialEq, PartialOrd)]
pub enum Act {
    #[name = "1"] One = 1,
    #[name = "2"] Two,
    #[name = "3"] Three,
}

#[derive(strum::EnumString, strum::Display, Debug, Clone, Copy, PartialEq)]
enum Doki {
    Natsuki,
    Sayori,
    Yuri,
    Monika,
}

async fn game(ctx: Context<'_>, word: &str, answer: Doki, buttons: &[(EmojiId, Doki)]) -> anyhow::Result<()> {
    let mut question = ctx.send(|r| r
        .content("Whose word is **".to_owned() + word + "**?  Please answer in 15 seconds.")
        //XXX Try to deduplicate these
        .components(|c| c.create_action_row(|a| {
            for (emoji, doki) in buttons {
                a.create_button(|b| b
                    .style(Secondary)
                    .emoji(*emoji)
                    .label(doki)
                    .custom_id(doki)
                );
            }
            a
        }))
    ).await?.into_message().await?;

    let collected = serenity::CollectComponentInteraction::new(ctx)
        .author_id(ctx.author().id)
        .message_id(question.id)
        .collect_limit(1)
        .timeout(Duration::from_secs(15))
        .await;

    match collected {
        Some(interaction) => {
            let right = "Congratulations!  That's correct.".to_owned();
            let wrong = "Sorry, it's **".to_owned() + word + "**.";
            let selected = interaction.data.custom_id.parse::<Doki>()?;

            interaction.create_interaction_response(ctx, |r| r
                .kind(serenity::InteractionResponseType::ChannelMessageWithSource)
                .interaction_response_data(|x| x
                    .content(if selected == answer { right } else { wrong }))
            ).await?;

            question.edit(ctx, |m| m
                //XXX Try to deduplicate these
                .components(|c| c.create_action_row(|a| {
                    for (emoji, doki) in buttons {
                        a.create_button(|b| b
                            .emoji(*emoji)
                            .label(doki)
                            .custom_id(doki)
                            .style(if doki == &answer { Success }
                                else if doki == &selected { Danger }
                                else { Secondary })
                        );
                    }
                    a
                }))).await?;
        },
        None => {
            question.edit(ctx, |m| m
                //XXX Try to deduplicate these
                .components(|c| c.create_action_row(|a| {
                    for (emoji, doki) in buttons {
                        a.create_button(|b| b
                            .emoji(*emoji)
                            .label(doki)
                            .custom_id(doki)
                            .disabled(true)
                            .style(Secondary)
                        );
                    }
                    a
                }))).await?;
        }
    }
    Ok(())
}

async fn poem1(_: Context<'_>) -> anyhow::Result<()> {
    todo!("Make the poem game for Act 1")
}

async fn poem2(_: Context<'_>) -> anyhow::Result<()> {
    todo!("Make the poem game for Act 2")
}

async fn poem3(ctx: Context<'_>) -> anyhow::Result<()> {
    game(ctx, "Monika", Doki::Monika, &[(EmojiId(501274687842680832), Doki::Monika)]).await
}

/// Play a poem game
///
/// Play a poem game with specified DDLC act
///
/// **Usage**: /poem <act>
#[poise::command(category = "Fun", slash_command)]
pub async fn poem(ctx: Context<'_>,
    #[description = "Act of the poem game"]
    act: Act,
) -> anyhow::Result<()> {
    match act {
        Act::One => poem1(ctx).await,
        Act::Two => poem2(ctx).await,
        Act::Three => poem3(ctx).await,
    }
}