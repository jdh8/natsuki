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

The services are rootless user units, so they live in the `natsuki` account's
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
Copy the generated `CHAT_API_KEY` from `.env.dev` into the backup server's
protected configuration and require it with `llama-server --api-key-file`.
Never publish the llama.cpp port on a public interface.
