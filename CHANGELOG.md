# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [3.1.2] — 2026-03-01

### Internal
- Dependency refresh.

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

## [3.0.10] — 2025-07-11

Final release under Shuttle hosting.

### Internal
- Dependency refresh.

[Unreleased]: https://github.com/jdh8/natsuki/compare/3.1.2...HEAD
[3.1.2]: https://github.com/jdh8/natsuki/compare/3.1.1...3.1.2
[3.1.1]: https://github.com/jdh8/natsuki/compare/3.1.0...3.1.1
[3.1.0]: https://github.com/jdh8/natsuki/compare/3.0.10...3.1.0
[3.0.10]: https://github.com/jdh8/natsuki/releases/tag/3.0.10
