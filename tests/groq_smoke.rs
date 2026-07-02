//! Network smoke test for the Groq chat backend.
//! Run manually: GROQ_API_KEY=... cargo test --test groq_smoke -- --ignored --nocapture

#[tokio::test]
#[ignore = "hits the live Groq API; needs GROQ_API_KEY"]
async fn groq_smoke() {
    // Same client configuration as src/main.rs
    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent(concat!("natsuki/", env!("CARGO_PKG_VERSION")))
        .build()
        .unwrap();

    let response = http
        .post("https://api.groq.com/openai/v1/chat/completions")
        .bearer_auth(std::env::var("GROQ_API_KEY").expect("GROQ_API_KEY not set"))
        .json(&serde_json::json!({
            "model": "llama-3.3-70b-versatile",
            "messages": [{ "role": "user", "content": "hi" }],
            "max_tokens": 10,
        }))
        .send()
        .await
        .unwrap_or_else(|e| panic!("send failed: {e:?}"));

    let status = response.status();
    let json = response.json::<serde_json::Value>().await.unwrap();
    println!("HTTP {status}: {json}");
    assert!(status.is_success());
    assert!(json["choices"][0]["message"]["content"].is_string());
}
