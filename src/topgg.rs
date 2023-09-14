use crate::bot_id;
use tokio::sync::Mutex;
use poise::serenity_prelude as serenity;

#[derive(Debug, Default, Clone, Copy)]
struct Stats {
    guilds: u64,
    shards: u64,
}

impl Stats {
    fn serialize(self) -> serde_json::Value {
        if self.shards == 0 {
            serde_json::json!({
                "server_count": self.guilds,
            })
        }
        else {
            serde_json::json!({
                "server_count": self.guilds,
                "shard_count": self.shards,
            })
        }
    }
}

async fn post(token: &str, stats: Stats) {
    let _ = reqwest::Client::new()
        .post(concat!("https://top.gg/api/bots/", bot_id!(), "/stats"))
        .header("Authorization", token)
        .json(&stats.serialize())
        .send().await;
}

#[derive(Debug, Default)]
pub struct Poster {
    token: Option<String>,
    stats: Mutex<Stats>,
}

impl Poster {
    pub fn new(token: Option<String>) -> Self {
        Self { token, ..Default::default() }
    }
}

#[serenity::async_trait]
impl serenity::EventHandler for Poster {
    async fn ready(&self, _: serenity::Context, ready: serenity::Ready) {
        let Some(token) = self.token.as_deref() else { return };
        let guilds = ready.guilds.len() as u64;

        match ready.shard {
            None => post(token, Stats { guilds, shards: 0 }).await,
            Some([_, s@0..=1]) => post(token, Stats { guilds, shards: s }).await,
            Some([_, shards]) => {
                let mut stats = self.stats.lock().await;
                stats.guilds += guilds;
                stats.shards += 1;

                if stats.shards == shards {
                    post(token, *stats).await;
                }
            },
        };
    }
}