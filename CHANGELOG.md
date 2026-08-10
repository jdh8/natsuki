# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- A hardened rootless Podman deployment for the Discord bot and `llama-server`,
  including a locked system account, private container network, Podman secrets,
  pinned images, NVIDIA CDI, and read-only Quadlet services.

### Changed
- The deploy wizard now requires an explicit `prod` or `dev` argument and
  loads the matching `.env.prod` or `.env.dev` file.  Switching environments
  redeploys the same services with the selected credentials and configuration.
- The deploy wizard now defaults to the cached stock Qwen3 GGUF when
  `MODEL_PATH` is not set.

### Fixed
- The deploy wizard now sets the `container_use_devices` SELinux boolean;
  without it the model container is denied `/dev/nvidiactl` and `llama-server`
  silently falls back to the CPU.  The wizard also fails loudly when the
  served model is not on the GPU, verifies the API key against a protected
  endpoint (`/v1/models` never requires auth, so the old check aborted the
  wizard before the bot ever started), and restarts services on re-runs so
  updated code and secrets actually deploy.

### Internal
- Added the isolated Python 3.12 M0 harness, fixed 20-prompt stock-model sniff
  test, VRAM sampler, benchmark/evaluation runners, blinded comparison tooling,
  and self-finalizing compact reports.  Pinned native Turing and GTX-16 MMQ
  llama.cpp builds run against an isolated CUDA 12.9 runtime.  Large caches,
  models, build products, and raw results are kept under `/srv` on the
  production host.

## [3.3.0] — 2026-08-10

### Added
- `CHAT_URL` and `CHAT_MODEL` environment variables choose the chat backend.
  They default to Groq's `llama-3.3-70b-versatile`, so existing deployments
  behave exactly as before.  Pointing them at any OpenAI-compatible server —
  llama.cpp's `llama-server`, Ollama, and so on — lets Natsuki run on
  self-hosted hardware.

### Changed
- `GROQ_API_KEY` is now optional.  The bot starts without it and sends no
  bearer token, which is what a self-hosted backend expects.  This also fixes
  the bot refusing to start from `.env.prod`, which never defined it.
- Chat history is trimmed six messages at a time rather than two.  Natsuki
  keeps slightly less context on average, in exchange for a prompt prefix that
  stays put for three exchanges; a self-hosted model can reuse its cache
  across them instead of re-reading the conversation every message.
- `PRIVACY.md` now describes the chat backend as configurable, and notes that
  self-hosted deployments keep messages on the operator's own hardware.

### Internal
- `tests/groq_smoke.rs` is now `tests/chat_smoke.rs` and honours `CHAT_URL` /
  `CHAT_MODEL`, with a longer timeout so a cold self-hosted model can load.
- Chat history trimming moved into `remember()` and gained a unit test: the
  prompt format assumes turns strictly alternate, so evicting an odd number of
  messages would corrupt every later exchange.

## [3.2.0] — 2026-07-03

### Added
- `/chat` command and @mention replies: Natsuki now chats in character,
  powered by Groq (`llama-3.3-70b-versatile`).  She remembers the last
  ~10 exchanges per channel in memory (erased on restart).

### Changed
- New required environment variable `GROQ_API_KEY`; the bot will not start
  without it.
- `PRIVACY.md` updated: chat messages are forwarded to Groq to generate
  replies.

## [3.1.2] — 2026-05-17

### Changed
- `/hug` and `/kiss` default to "a random anime character" when no target is
  given (previously "Yuri" and "Natsuki" respectively).
- `/cute` and other face-image commands now accept avatars up to 8 MiB
  so lossless images can usually decode.

### Fixed
- `/hug`, `/kiss`, and `/lick` switched to `api.otakugifs.xyz` — the
  hardcoded `cdn.discordapp.com/attachments/...` URLs Discord rotated all
  returned 404. `/feed` and `/neko` still use nekos.life.
- Avatar downloads in face-image commands stream the body with a hard size
  cap instead of slurping with `Response::bytes()`, and now surface HTTP
  errors cleanly instead of feeding 4xx/5xx HTML pages into the WebP/image
  decoders.

### Internal
- Image decoding/encoding now runs on `spawn_blocking`; static assets
  (`assets/*`) are preloaded once at startup rather than re-read per call.
- Per-call regexes compiled into `LazyLock` statics.
- Shared `reqwest::Client` (timeout + user-agent) reused across all HTTP
  commands.
- `/rate` no longer transmutes `md5::Digest`; replaced with a safe
  conversion.
- Dependency refresh (bitflags, csscolorparser, image, …).

## [3.1.1] — 2025-12-01

### Changed
- `/support` points at a new Discord invite (`vGWwP5yETZ`) after the
  previous one was abused by spammers.

### Internal
- Dependency refresh.

## [3.1.0] — 2025-07-11

### Changed
- **Deployment**: dropped Shuttle and returned to self-hosting. Shuttle had
  become unstable; `main.rs` is now a plain `tokio::main` that reads
  config from environment variables. Self-hosters: see `.env.prod` for the
  expected variables.

### Removed
- Shuttle-specific glue (`shuttle-poise`, `shuttle-static-folder`,
  `shuttle-runtime`, `Shuttle.toml`, secrets handling).

## 3.0.10 — 2025-07-11

Final release under Shuttle hosting.

### Internal
- Dependency refresh.

[3.3.0]: https://github.com/jdh8/natsuki/compare/3.2.0...3.3.0
[3.2.0]: https://github.com/jdh8/natsuki/compare/3.1.2...3.2.0
[3.1.2]: https://github.com/jdh8/natsuki/compare/3.1.1...3.1.2
[3.1.1]: https://github.com/jdh8/natsuki/compare/3.1.0...3.1.1
[3.1.0]: https://github.com/jdh8/natsuki/compare/3.0.10...3.1.0
