# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Chat replies no longer strip an echoed current-user speaker label after
  Granite Q8_0 produced zero such leaks across 60 production-shaped samples.
  The M0 harness now detects these leaks, supports the deployed server's API
  key, and shares the bot's system prompt from `src/prompt.txt`.
- Deployment now uses Granite 4.1 3B Q8_0.  On the fixed 20-prompt check it
  beat Q5_K_M 11–6 with three ties while remaining fully GPU-offloaded.
- Active model selection now defaults to non-Chinese model families. A Chinese
  model requires an explicit, benchmark-backed exception showing that credible
  alternatives trail by roughly one or two model generations. Granite 4.1 3B
  replaces Qwen as the deployment and fine-tuning default; historical Qwen
  results remain for auditability.
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
  candidate rejected, it QLoRA-trains Granite 4.1 3B directly on the 946 gold
  pairs plus 500 public Tulu-3 replay rows and scores the adapter through the
  existing blinded 20-prompt review, deciding how much the future synthetic
  corpus must carry.  Training data stays local and gitignored; users are
  unaffected until a model ships.
- The historical Qwen probe pinned the official Qwen3-4B-Instruct-2507 chat
  template verbatim and enforced it at train and sniff time after unsloth's
  mirror silently substituted a thinking-style template that taught the first
  adapter to open replies with `<think>`/`<tool_call>` token salad.  The pinned
  copy was removed after the Granite switch because the active probe validates
  Granite's upstream template.  The
  Tier-0 special-token check now also catches `<think>`, `<tool_call>`,
  `<tool_response>`, and Granite role/end-marker leakage.
- The completed probe verdict: canon-only training converges but loses the
  persona (flat replies, replay-taught assistant-isms) while stock Qwen with
  the production prompt fails register the opposite way, so the synthetic
  corpus remains load-bearing and the M2 teacher hunt stays the critical
  path.  No user-facing behavior changes.
- A hosted-API teacher hunt: a primary-source scout of big open-weight models
  behind hosted endpoints, with a new provider-contract eligibility axis (no
  output-training restriction; retention recorded), queueing Kimi K2.6 and
  DeepSeek-V4-Flash-0731 behind the unchanged 12-row gate and a two-candidate
  stop rule.  The M2 runner now sends `TEACHER_API_KEY` to hosted non-Groq
  endpoints and disables hybrid-model thinking via OpenRouter's normalized
  `reasoning` field.  No request is sent without operator approval; users are
  unaffected until a teacher passes.

### Changed
- The deploy wizard now requires an explicit `prod` or `dev` argument and
  loads the matching `.env.prod` or `.env.dev` file.  Switching environments
  redeploys the same services with the selected credentials and configuration.
- The deploy wizard now defaults to the cached stock Granite 4.1 3B GGUF when
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
- Removed unused trainer code: the orphaned Qwen chat-template file,
  trl/transformers shims dead against the pinned lock, a redundant username
  regex, unused `parse_plus` fallbacks, and a stray test import/assertion. No
  user-facing behavior changes.
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
  primary-source scout then admitted GLM-4.7-Flash Q8_0 to a dl02 screen; it was
  rejected at row 2 after seven retries produced no accepted two-speaker
  conversation. The frozen prompt now gives multi-user rows an exact speaker
  plan without weakening validation. The final dl02 candidate, Olmo 3.1 32B
  Instruct Q6_K, completed all 12 rows but passed only 2/12 under two independent
  strict reviews, with mechanical, factual, and hard voice failures. Its fresh
  30 was not run. The rented-H200 route was dropped and no canon text left the
  machine.

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
