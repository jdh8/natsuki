# Natsuki

Natsuki is a Discord bot roleplaying Natsuki from
[Doki Doki Literature Club][ddlc].  She keeps no persistent storage; the only
state is a short in-memory chat history (see `src/chat.rs`).

[ddlc]: https://ddlc.moe/

After updating the codebase, please

- Format the code with `cargo fmt`.
- Run the tests with `cargo test --all-features`.
- Update [CHANGELOG.md](CHANGELOG.md) with a summary of the changes and their impact on users.
- Propose a clear and descriptive commit message.
