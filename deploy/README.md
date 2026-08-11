# Secure deployment

Run the interactive setup from the repository root and explicitly select the
environment:

```sh
./deploy/setup prod
./deploy/setup dev
```

The wizard picks the container engine by platform: **Docker Compose on
Ubuntu** (the system daemon starts the containers at boot; rootless user
managers proved unreliable there) and **hardened rootless Podman Quadlets on
Fedora**.  Either way the model container is pinned, read-only, unprivileged,
and reachable only from the bot on an internal network; nothing is published
on the host.

Keep each environment's credentials and deployment overrides in its own file:

```text
# .env.prod or .env.dev
MODEL_PATH=/absolute/path/to/natsuki.gguf
```

If `MODEL_PATH` is missing, the wizard uses the stock Qwen3 GGUF in the current
user's Hugging Face cache.  It also generates and saves a separate
`CHAT_API_KEY` when the selected file does not have one.  The env file also
optionally supplies `GUILD` and `TOP_GG_TOKEN`; empty values count as unset.

Both modes deploy the same service names.  Running setup for one environment
replaces the active credentials and configuration from the other and restarts
the services; prod and dev do not run concurrently.

The wizard accepts exact Fedora and Ubuntu IDs from `/etc/os-release`; distro
derivatives are not treated as interchangeable with their parent.  The
minimums are Fedora 43 and Ubuntu 22.04.  Fedora 43/44 and Ubuntu
22.04/24.04/26.04 are explicitly targeted; a newer or non-targeted release
above the minimum continues with a warning.

## Docker Compose (Ubuntu)

The wizard needs no sudo on Ubuntu: it validates the env file, resolves the
model, and runs `docker compose --env-file <env> -f deploy/compose.yaml up -d
--build --wait`, then verifies the model process is on the GPU.  It requires a
working Docker daemon with the NVIDIA container toolkit's `nvidia` runtime
configured, and your user in the `docker` group.  Manage the services with
plain `docker compose` / `docker logs` afterwards.

## Rootless Podman Quadlets (Fedora)

The wizard installs the bot and model as Quadlets owned by a locked `natsuki`
system account, importing credentials from the environment file into Podman
secrets; the file is never copied into the build context or service account.
It requests sudo only for account, package, CDI, and installation steps, and
refuses to weaken SELinux if CDI device access fails.

The rootless account reuses a valid existing subordinate UID/GID grant.  When
it needs one, the wizard selects a free 65,536-ID block from the high end of
the range configured by `SUB_UID_*` and `SUB_GID_*` in `/etc/login.defs`.
Allocating downward leaves the low, upward-growing blocks available to normal
local or directory-provisioned login accounts.

`setup` is the only executable entrypoint.  It loads the shared workflow from
`lib/common.sh` and selects `platforms/fedora.sh` or `platforms/ubuntu.sh`.
Platform adapters define their display name, UID minimum, container engine,
targeted versions, required commands, GPU failure hint,
`platform_validate_version`, and `platform_prepare_gpu`; the engine selects
the shared Docker or Podman deployment workflow.

To add an operating system, add its adapter, extend the exact-ID dispatch in
`lib/common.sh`, and add fixtures to `tests/setup.sh`.  Keep version branches
inside an OS adapter until a release needs a materially different procedure;
only then introduce a version-specific helper rather than copying the shared
deployment workflow.

On Fedora the services are rootless user units, so they live in the `natsuki` account's
systemd manager rather than the system one.  Reach it with `-M natsuki@`,
which needs no interactive login on the service account:

```sh
sudo systemctl --user -M natsuki@ status natsuki-model.service natsuki-bot.service
sudo systemctl --user -M natsuki@ restart natsuki-bot.service
```

Logs go to the system journal, so match on the user unit instead:

```sh
sudo journalctl _SYSTEMD_USER_UNIT=natsuki-model.service -f
```

Stop the local model after switching the bot to a healthy private endpoint on
`dl02`:

```sh
sudo systemctl --user -M natsuki@ stop natsuki-model.service
```

Both units start on boot because `setup` enables lingering.  Add
`disable --now` to keep one down across reboots.

Use only a WireGuard/Tailscale address or an SSH-forwarded endpoint for `dl02`.
Copy the generated `CHAT_API_KEY` from the selected environment file into the
backup server's protected configuration and require it with
`llama-server --api-key-file`.  Never publish the llama.cpp port on a public
interface.
