# Secure deployment

`./deploy/setup` installs the production bot and model as hardened rootless
Podman Quadlets owned by a locked `natsuki` system account.  It imports
credentials from the ignored `.env.dev` file into Podman secrets; `.env.dev`
is never copied into the build context or service account.

Before running it, put the final GGUF path in `.env.dev`:

```text
MODEL_PATH=/absolute/path/to/natsuki.gguf
```

Then run the interactive setup from the repository root:

```sh
./deploy/setup
```

The wizard requests sudo only for account, package, CDI, and installation
steps.  It refuses to weaken SELinux if CDI device access fails.

Manage the rootless services without enabling an interactive login:

```sh
uid=$(id -u natsuki)
sudo runuser -u natsuki -- env \
  HOME=/var/lib/natsuki \
  XDG_RUNTIME_DIR="/run/user/$uid" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" \
  systemctl --user status natsuki-model.service natsuki-bot.service
```

Stop the local model after switching the bot to a healthy private endpoint on
`dl02`:

```sh
uid=$(id -u natsuki)
sudo runuser -u natsuki -- env \
  HOME=/var/lib/natsuki \
  XDG_RUNTIME_DIR="/run/user/$uid" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" \
  systemctl --user stop natsuki-model.service
```

Use only a WireGuard/Tailscale address or an SSH-forwarded endpoint for `dl02`.
Copy the generated `CHAT_API_KEY` from `.env.dev` into the backup server's
protected configuration and require it with `llama-server --api-key-file`.
Never publish the llama.cpp port on a public interface.
