//! Network smoke test for the chat backend.
//!
//! Defaults to Groq; set `CHAT_URL` and `CHAT_MODEL` to point it at a
//! self-hosted OpenAI-compatible server instead.  `GROQ_API_KEY` is only
//! needed for backends that authenticate.
//!
//! Run manually:
//! `GROQ_API_KEY=... cargo test --test chat_smoke -- --ignored --nocapture`

// Defaults are duplicated from `src/chat.rs`: `natsuki` is a binary crate, so
// an integration test cannot import its constants.
const GROQ_URL: &str = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL: &str = "llama-3.3-70b-versatile";

#[tokio::test]
#[ignore = "hits a live chat API; see the module docs for the env vars"]
async fn chat_smoke() {
    let url = std::env::var("CHAT_URL").unwrap_or_else(|_| GROQ_URL.to_owned());
    let model = std::env::var("CHAT_MODEL").unwrap_or_else(|_| GROQ_MODEL.to_owned());

    // Same client configuration as src/main.rs, but with the per-request
    // timeout src/chat.rs uses -- a self-hosted model can still be loading.
    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent(concat!("natsuki/", env!("CARGO_PKG_VERSION")))
        .build()
        .unwrap();

    let request = http.post(&url).json(&serde_json::json!({
        "model": model,
        "messages": [{ "role": "user", "content": "hi" }],
        "max_tokens": 10,
    }));
    let request = match std::env::var("GROQ_API_KEY") {
        Ok(key) => request.bearer_auth(key),
        Err(_) => request,
    };

    let response = request
        .send()
        .await
        .unwrap_or_else(|e| panic!("send to {url} failed: {e:?}"));

    let status = response.status();
    let json = response.json::<serde_json::Value>().await.unwrap();
    println!("HTTP {status} from {model} at {url}: {json}");
    assert!(status.is_success());
    assert!(json["choices"][0]["message"]["content"].is_string());
}
