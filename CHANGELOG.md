# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- `deploy/setup` now picks the container engine by platform: Docker Compose
  (`deploy/compose.yaml`) on Ubuntu, where the system daemon starts the
  hardened containers at boot (lingering user managers proved unreliable
  there), and rootless Podman Quadlets on Fedora.  Both paths keep the same
  hardening: pinned images, read-only, cap-drop, no-new-privileges, and an
  internal-only model network.
- Empty `GUILD` and `TOP_GG_TOKEN` environment variables are now treated as
  unset instead of crashing (empty `GUILD`) or posting with a blank token,
  so one Compose file serves both prod and dev.

### Added
- A hardened rootless Podman deployment for the Discord bot and `llama-server`,
  including a locked system account, private container network, Podman secrets,
  pinned images, NVIDIA CDI, and read-only Quadlet services.
- The deploy wizard now supports Ubuntu 22.04+ alongside Fedora 43+.  On
  Ubuntu it deploys with Docker Compose against the system daemon and
  requires the NVIDIA container toolkit's `nvidia` Docker runtime.
- A local-only M1 canon extractor for original DDLC and the three selected
  Natsuki DDLC Plus Side Stories, with locked asset hashes, provenance, counts,
  and ignored canon/pair outputs.
- The M2 paraphrased voice card and deterministic 100-conversation Groq pilot
  tooling, including strict structured output, bounded retry/resume, transcript,
  manual review CSV, and diagnostic summary.
- The completed diagnostic M2 pilot: 100 structurally valid conversations, all
  manually reviewed, with 51 register/persona passes, 49 failures, zero AI
  disclosures or self-prefixes, and one sentence-count violation.
- A canon-only fine-tune probe (`trainer/m2_probe.py`): with every teacher
  candidate rejected, it QLoRA-trains Qwen3-4B directly on the 946 gold pairs
  plus 500 public Tulu-3 replay rows and scores the adapter through the
  existing blinded 20-prompt review, deciding how much the future synthetic
  corpus must carry.  Training data stays local and gitignored; users are
  unaffected until a model ships.
- The official Qwen3-4B-Instruct-2507 chat template, committed verbatim and
  enforced during probe training and inference after unsloth's mirror
  silently substituted a thinking-style template that taught the first
  adapter to open replies with `<think>`/`<tool_call>` token salad.  The
  Tier-0 special-token check now also catches `<think>`, `<tool_call>`, and
  `<tool_response>` leakage, which it previously missed entirely.
- The completed probe verdict: canon-only training converges but loses the
  persona (flat replies, replay-taught assistant-isms) while stock Qwen with
  the production prompt fails register the opposite way, so the synthetic
  corpus remains load-bearing and the M2 teacher hunt stays the critical
  path.  No user-facing behavior changes.

### Changed
- The deploy wizard now requires an explicit `prod` or `dev` argument and
  loads the matching `.env.prod` or `.env.dev` file.  Switching environments
  redeploys the same services with the selected credentials and configuration.
- The deploy wizard now defaults to the cached stock Qwen3 GGUF when
  `MODEL_PATH` is not set.
- Deployment now uses one shared workflow with Fedora and Ubuntu platform
  adapters.  The entrypoint rejects versions below the supported minimum and
  warns when a newer release is not in the explicitly targeted version matrix.

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
- Pinned `unrpa`, UnityPy, TypeTreeGeneratorAPI, and the `unrpyc` source commit;
  added standard-library tests for extraction normalization/control flow, Plus
  type-tree compatibility, M2 quotas and message shape, retries/resume, and
  review counts. Production chat behavior is unchanged.
- Added Groq Qwen3.6's non-thinking JSON Object Mode to the M2 screen and
  recorded its rejection at row 2 after repeated speaker/schema failures. A
  primary-source scout names self-hosted Mistral Large 3 as the next candidate
  and Qwen3-235B Instruct 2507 as fallback; no canon text left the machine.

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
