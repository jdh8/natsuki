#!/usr/bin/env bash

# Shared deployment workflow. This file is sourced by deploy/setup and tests.

readonly SERVICE_HOME=/var/lib/natsuki
readonly SUBID_COUNT=65536
readonly DEFAULT_SUBID_MIN=100000
readonly DEFAULT_SUBID_MAX=600100000
readonly DEFAULT_MODEL_PATH="${HF_HUB_CACHE:-${HF_HOME:-$HOME/.cache/huggingface}/hub}/models--ibm-granite--granite-4.1-3b-GGUF/snapshots/ab4701481089b58a082ef63cc1cee738887293ff/granite-4.1-3b-Q8_0.gguf"
readonly LLAMA_IMAGE='ghcr.io/ggml-org/llama.cpp@sha256:dd0c408a4c3285f7809323ac17f85e70ef756bf67a3a30d4eed6805a8c1df16b'
readonly CURL_IMAGE='docker.io/curlimages/curl@sha256:4026b29997dc7c823b51c164b71e2b51e0fd95cce4601f78202c513d97da2922'

die() {
  printf '  %s✗ %s%s\n' "${RED:-}" "$1" "${RESET:-}" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || die "required command is missing: $1"
}

validate_platform_contract() {
  local variable function declaration
  for variable in \
    PLATFORM_NAME PLATFORM_UID_MIN PLATFORM_ENGINE PLATFORM_GPU_FAILURE_HINT \
    PLATFORM_TARGETED_VERSIONS; do
    [[ -v "$variable" ]] || die "platform adapter does not define $variable"
  done
  case "$PLATFORM_ENGINE" in
    docker|podman) ;;
    *) die "platform adapter defines an unknown engine: $PLATFORM_ENGINE" ;;
  esac
  declaration=$(declare -p PLATFORM_REQUIRED_COMMANDS 2>/dev/null) \
    || die "platform adapter does not define PLATFORM_REQUIRED_COMMANDS"
  [[ "$declaration" == 'declare -a '* ]] \
    || die "platform adapter must define PLATFORM_REQUIRED_COMMANDS as an array"
  for function in platform_validate_version platform_prepare_gpu; do
    declare -F "$function" >/dev/null \
      || die "platform adapter does not define $function()"
  done
}

# select_platform OS_RELEASE — load an exact Fedora or Ubuntu adapter. Accepting
# the file as an argument keeps platform detection testable without overriding
# the production /etc/os-release path.
select_platform() {
  local os_release_file="$1" adapter ID='' VERSION_ID=''
  [[ -r "$os_release_file" ]] || die "cannot read OS metadata: $os_release_file"
  # os-release is specified as shell-compatible variable assignments.
  # shellcheck disable=SC1090
  source "$os_release_file"
  [[ -n "$ID" ]] || die "$os_release_file does not define ID"
  [[ -n "$VERSION_ID" ]] || die "$os_release_file does not define VERSION_ID"

  OS_ID="$ID"
  OS_VERSION_ID="$VERSION_ID"
  case "$OS_ID" in
    fedora|ubuntu) adapter="$SCRIPT_DIR/platforms/$OS_ID.sh" ;;
    *) die "unsupported operating system: $OS_ID (expected fedora or ubuntu)" ;;
  esac
  [[ -r "$adapter" ]] || die "platform adapter is missing: $adapter"
  # shellcheck disable=SC1090
  source "$adapter"
  validate_platform_contract
}

as_natsuki() {
  local uid
  uid=$(id -u natsuki)
  sudo runuser -u natsuki -- env --chdir="$SERVICE_HOME" \
    HOME="$SERVICE_HOME" \
    XDG_RUNTIME_DIR="/run/user/$uid" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" \
    "$@"
}

userctl() {
  as_natsuki systemctl --user "$@"
}

login_defs_number() {
  local key="$1" fallback="$2" value
  value=$(awk -v key="$key" '$1 == key { value = $2 } END { print value }' /etc/login.defs)
  value=${value:-$fallback}
  [[ "$value" =~ ^[0-9]+$ ]] || die "/etc/login.defs defines an invalid $key: $value"
  printf '%s\n' "$value"
}

find_free_subid_start() {
  local file="$1" minimum="$2" maximum="$3" candidate range_start range_count slots

  slots=$(((maximum - minimum + 1) / SUBID_COUNT))
  (( slots > 0 )) || die "$file has no complete $SUBID_COUNT-ID block in $minimum-$maximum"
  candidate=$((minimum + (slots - 1) * SUBID_COUNT))

  while IFS=: read -r range_start range_count; do
    (( range_start >= candidate + SUBID_COUNT )) && continue
    (( range_start + range_count <= candidate )) && break

    slots=$(((range_start - minimum) / SUBID_COUNT))
    (( slots > 0 )) || die "$file has no free $SUBID_COUNT-ID block in $minimum-$maximum"
    candidate=$((minimum + (slots - 1) * SUBID_COUNT))
  done < <(
    awk -F: '$2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/ && $3 > 0 { print $2 ":" $3 }' "$file" \
      | sort -t: -k1,1nr
  )

  printf '%s\n' "$candidate"
}

ensure_subid_range() {
  local file="$1" option="$2" min_key="$3" max_key="$4" existing minimum maximum start end

  existing=$(awk -F: '$1 == "natsuki" { print $2 ":" $3 }' "$file")
  if [[ -n "$existing" ]]; then
    awk -F: -v count="$SUBID_COUNT" '
        BEGIN { valid = 1 }
        $1 == "natsuki" {
          found = 1
          if ($2 !~ /^[0-9]+$/ || $3 !~ /^[0-9]+$/ || $3 == 0) valid = 0
          if ($3 ~ /^[0-9]+$/ && $3 >= count) sufficient = 1
        }
        END { exit(found && valid && sufficient ? 0 : 1) }
      ' "$file" \
      || die "$file assigns natsuki an invalid or undersized range: ${existing//$'\n'/, }"
    if awk -F: '
        $1 == "natsuki" { start[++n] = $2; count[n] = $3; next }
        $2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/ { other_start[++m] = $2; other_count[m] = $3 }
        END {
          for (i = 1; i <= n; i++)
            for (j = 1; j <= m; j++)
              if (start[i] < other_start[j] + other_count[j] &&
                  other_start[j] < start[i] + count[i]) exit 0
          exit 1
        }
      ' "$file"; then
      die "$file assigns natsuki a range that overlaps another account: ${existing//$'\n'/, }"
    fi
    return
  fi

  minimum=$(login_defs_number "$min_key" "$DEFAULT_SUBID_MIN")
  maximum=$(login_defs_number "$max_key" "$DEFAULT_SUBID_MAX")
  (( minimum <= maximum )) || die "$min_key is greater than $max_key in /etc/login.defs"
  # Interactive accounts normally consume low blocks first. Work down from
  # the policy ceiling so this system account does not take their next slot.
  start=$(find_free_subid_start "$file" "$minimum" "$maximum")
  end=$((start + SUBID_COUNT - 1))
  sudo usermod "$option" "$start-$end" natsuki
  grep -qx "natsuki:$start:$SUBID_COUNT" "$file" \
    || die "failed to assign natsuki a subordinate ID range in $file"
}

# resolve_model_config — validate MODEL_PATH (defaulting to the cached Granite
# GGUF) and ensure CHAT_API_KEY exists, persisting both to the env file.
resolve_model_config() {
  MODEL_PATH=$(_existing MODEL_PATH || true)
  MODEL_PATH=${MODEL_PATH:-$DEFAULT_MODEL_PATH}
  [[ "$MODEL_PATH" == /* ]] || die "MODEL_PATH must be absolute"
  [[ "$MODEL_PATH" != *$'\n'* && -f "$MODEL_PATH" ]] || die "MODEL_PATH is not a regular file"
  MODEL_PATH=$(readlink -f "$MODEL_PATH")
  [[ "$MODEL_PATH" == *.gguf ]] || die "MODEL_PATH is not a GGUF file"
  write_env MODEL_PATH "$MODEL_PATH"
  CHAT_API_KEY=$(_existing CHAT_API_KEY || true)
  if [[ -z "$CHAT_API_KEY" ]]; then
    CHAT_API_KEY=$(openssl rand -hex 32)
    write_env CHAT_API_KEY "$CHAT_API_KEY"
  fi
  (( ${#CHAT_API_KEY} >= 32 )) || die "CHAT_API_KEY must contain at least 32 characters"
}

install_secret() {
  local name="$1" value="$2"
  printf '%s' "$value" | as_natsuki podman secret create --replace "$name" - >/dev/null
  printf '  %s✓ imported%s %s into rootless Podman\n' "$GREEN" "$RESET" "$name"
}

# deploy_docker — the Docker Compose path. The system daemon starts the
# containers at boot, so no service account or lingering user manager exists.
deploy_docker() {
  local command model_pid
  TOTAL_STAGES=3

  banner "Natsuki deployment (Docker Compose)"

  stage "Preflight"
  say "Validate $PLATFORM_NAME $OS_VERSION_ID, .env.$ENVIRONMENT, Docker, and the GPU runtime."
  [[ -t 0 ]] || die "run this wizard from an interactive terminal"
  [[ -f "$REPO_ROOT/Cargo.toml" && -f "$SCRIPT_DIR/compose.yaml" ]] \
    || die "run the wizard from a complete Natsuki checkout"
  platform_validate_version "$OS_VERSION_ID"
  [[ -f "$ENV_FILE" ]] || die "missing $ENV_FILE"
  chmod 600 "$ENV_FILE"
  for command in awk nvidia-smi openssl "${PLATFORM_REQUIRED_COMMANDS[@]}"; do
    require "$command"
  done
  docker info >/dev/null 2>&1 \
    || die "cannot talk to the Docker daemon; is $USER in the docker group?"
  docker compose version >/dev/null 2>&1 || die "the Docker Compose plugin is missing"
  platform_prepare_gpu "$(id -u)"
  TOKEN=$(_existing TOKEN || true)
  GUILD=$(_existing GUILD || true)
  [[ -n "$TOKEN" ]] || die "TOKEN is missing from $ENV_FILE"
  [[ -z "$GUILD" || "$GUILD" =~ ^[0-9]+$ ]] || die "GUILD must be a Discord numeric ID"
  confirm "Deploy the services with Docker Compose?" || exit 0

  stage "Model and API key"
  resolve_model_config

  stage "Deploy and verify"
  say "Build the bot, start both services, and verify the model is on the GPU."
  docker compose --env-file "$ENV_FILE" --file "$SCRIPT_DIR/compose.yaml" \
    up --detach --build --wait
  model_pid=$(docker inspect --format '{{.State.Pid}}' natsuki-model-1)
  nvidia-smi --query-compute-apps=pid --format=csv,noheader | grep -wF "$model_pid" >/dev/null \
    || die "the model is not using the GPU; review docker logs natsuki-model-1; $PLATFORM_GPU_FAILURE_HINT"
  say "The model is authenticated, internal-only, unprivileged, and read-only."

  finish
}

deploy_main() {
  local command config_tmp model_pid required uid

  banner "Secure Natsuki deployment"

  stage "Preflight"
  say "Validate $PLATFORM_NAME $OS_VERSION_ID, .env.$ENVIRONMENT, required tools, and sudo access."
  [[ -t 0 ]] || die "run this wizard from an interactive terminal"
  [[ -f "$REPO_ROOT/Cargo.toml" && -d "$REPO_ROOT/deploy/quadlet" ]] \
    || die "run the wizard from a complete Natsuki checkout"
  platform_validate_version "$OS_VERSION_ID"
  [[ -f "$ENV_FILE" ]] || die "missing $ENV_FILE"
  chmod 600 "$ENV_FILE"
  required=(awk loginctl nvidia-smi openssl rsync runuser sort sudo systemctl useradd usermod)
  required+=("${PLATFORM_REQUIRED_COMMANDS[@]}")
  for command in "${required[@]}"; do
    require "$command"
  done
  TOKEN=$(_existing TOKEN || true)
  GUILD=$(_existing GUILD || true)
  TOP_GG_TOKEN=$(_existing TOP_GG_TOKEN || true)
  [[ -n "$TOKEN" ]] || die "TOKEN is missing from $ENV_FILE"
  [[ -z "$GUILD" || "$GUILD" =~ ^[0-9]+$ ]] || die "GUILD must be a Discord numeric ID"
  sudo -v
  confirm "Create the system account, install CDI, and deploy the services?" || exit 0

  stage "System account"
  say "Create and lock natsuki, then enable her rootless user manager."
  if ! getent passwd natsuki >/dev/null; then
    getent group natsuki >/dev/null && die "group natsuki exists without a matching user"
    sudo useradd --system --user-group --create-home \
      --home-dir "$SERVICE_HOME" --shell /usr/sbin/nologin \
      --comment 'Natsuki service' natsuki
  fi
  uid=$(id -u natsuki)
  (( uid >= PLATFORM_UID_MIN && uid < 1000 )) \
    || die "natsuki UID $uid is outside the system range $PLATFORM_UID_MIN-999"
  [[ $(id -gn natsuki) == natsuki ]] || die "natsuki must use a private primary group"
  sudo usermod --home "$SERVICE_HOME" --shell /usr/sbin/nologin --groups '' natsuki
  sudo passwd --lock natsuki >/dev/null
  sudo install -d -m 0700 -o natsuki -g natsuki "$SERVICE_HOME"
  [[ ! -e "$SERVICE_HOME/.ssh" ]] || die "$SERVICE_HOME/.ssh must not exist"
  ensure_subid_range /etc/subuid --add-subuids SUB_UID_MIN SUB_UID_MAX
  ensure_subid_range /etc/subgid --add-subgids SUB_GID_MIN SUB_GID_MAX
  sudo loginctl enable-linger natsuki
  sudo systemctl start "user@$uid.service"
  [[ $(getent passwd natsuki | cut -d: -f6) == "$SERVICE_HOME" ]] || die "wrong service home"
  [[ $(getent passwd natsuki | cut -d: -f7) == /usr/sbin/nologin ]] || die "interactive shell is still enabled"
  [[ $(id -nG natsuki) == natsuki ]] || die "natsuki has supplementary groups"
  sudo passwd --status natsuki | awk '$2 ~ /^L/ { found = 1 } END { exit(found ? 0 : 1) }' \
    || die "natsuki password is not locked"
  say "UID $uid is below the display manager's 1000 minimum and will not appear in the GUI."

  stage "NVIDIA CDI"
  platform_prepare_gpu "$uid"
  sudo install -d -m 0755 /etc/cdi
  sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
  nvidia-ctk cdi list | grep -Fx 'nvidia.com/gpu=0' >/dev/null || die "CDI did not expose GPU 0"
  as_natsuki podman info >/dev/null
  if ! as_natsuki podman run --rm \
      --read-only --cap-drop all --security-opt no-new-privileges \
      --device nvidia.com/gpu=0 --user 65532:65532 \
      "$LLAMA_IMAGE" --list-devices | grep CUDA0; then
    die "$PLATFORM_GPU_FAILURE_HINT"
  fi

  stage "Model and secrets"
  say "Copy the GGUF into private service storage and import runtime secrets."
  resolve_model_config
  sudo install -d -m 0700 -o natsuki -g natsuki "$SERVICE_HOME/models" "$SERVICE_HOME/config"
  if [[ "$MODEL_PATH" != "$SERVICE_HOME/models/natsuki.gguf" ]]; then
    sudo install -m 0444 -o natsuki -g natsuki "$MODEL_PATH" "$SERVICE_HOME/models/natsuki.gguf"
  fi
  install_secret natsuki-discord-token "$TOKEN"
  install_secret natsuki-chat-api-key "$CHAT_API_KEY"
  if [[ -n "$TOP_GG_TOKEN" ]]; then
    install_secret natsuki-topgg-token "$TOP_GG_TOKEN"
  fi

  stage "Install and verify"
  say "Install Quadlets, build the bot, start the model, and verify isolation."
  sudo install -d -m 0700 -o natsuki -g natsuki \
    "$SERVICE_HOME/src" "$SERVICE_HOME/src/src" "$SERVICE_HOME/src/assets" \
    "$SERVICE_HOME/.config/containers/systemd"
  sudo install -m 0644 "$REPO_ROOT/Cargo.toml" "$REPO_ROOT/Cargo.lock" "$SERVICE_HOME/src/"
  sudo install -m 0644 "$SCRIPT_DIR/Containerfile.bot" "$SERVICE_HOME/src/Containerfile.bot"
  sudo install -m 0644 "$SCRIPT_DIR/bot.containerignore" "$SERVICE_HOME/src/bot.containerignore"
  sudo rsync --archive --delete "$REPO_ROOT/src/" "$SERVICE_HOME/src/src/"
  sudo rsync --archive --delete "$REPO_ROOT/assets/" "$SERVICE_HOME/src/assets/"
  sudo rsync --archive --delete "$SCRIPT_DIR/quadlet/" "$SERVICE_HOME/.config/containers/systemd/"
  sudo chown -R natsuki:natsuki "$SERVICE_HOME/src" "$SERVICE_HOME/.config"

  config_tmp=$(mktemp)
  printf 'CHAT_URL=http://natsuki-model:8080/v1/chat/completions\nCHAT_MODEL=natsuki\n' > "$config_tmp"
  [[ -z "$GUILD" ]] || printf 'GUILD=%s\n' "$GUILD" >> "$config_tmp"
  sudo install -m 0600 -o natsuki -g natsuki "$config_tmp" "$SERVICE_HOME/config/bot.env"
  rm -f "$config_tmp"
  if [[ -n "$TOP_GG_TOKEN" ]]; then
    sudo sed -i 's|^# TOP_GG_SECRET$|Secret=natsuki-topgg-token,type=env,target=TOP_GG_TOKEN|' \
      "$SERVICE_HOME/.config/containers/systemd/natsuki-bot.container"
  fi

  userctl daemon-reload
  userctl restart natsuki-bot-build.service natsuki-llama-image.service
  userctl restart natsuki-model.service
  as_natsuki podman run --rm --network natsuki-internal \
    --entrypoint /bin/sh "$CURL_IMAGE" -eu -c '
      for _attempt in $(seq 1 180); do
        curl --fail --silent http://natsuki-model:8080/health >/dev/null && exit 0
        sleep 1
      done
      exit 1
    '
  model_pid=$(as_natsuki podman inspect --format '{{.State.Pid}}' natsuki-model)
  nvidia-smi --query-compute-apps=pid --format=csv,noheader | grep -wF "$model_pid" >/dev/null \
    || die "the model is not using the GPU; review journalctl --user -u natsuki-model and MAC denials"
  as_natsuki podman run --rm --network natsuki-internal \
    --secret natsuki-chat-api-key,type=env,target=CHAT_API_KEY \
    --entrypoint /bin/sh "$CURL_IMAGE" -eu -c '
      body="{\"model\":\"natsuki\",\"messages\":[{\"role\":\"user\",\"content\":\"Hi\"}],\"max_tokens\":1}"
      code=$(curl --silent --output /dev/null --write-out "%{http_code}" \
        --json "$body" http://natsuki-model:8080/v1/chat/completions)
      test "$code" = 401
      curl --fail --silent --header "Authorization: Bearer $CHAT_API_KEY" \
        --json "$body" http://natsuki-model:8080/v1/chat/completions >/dev/null
    '
  [[ -z $(as_natsuki podman port natsuki-model) ]] || die "the model published a host port"
  [[ $(as_natsuki podman network inspect --format '{{.Internal}}' natsuki-internal) == true ]] \
    || die "the inference network is not internal"
  [[ $(as_natsuki podman inspect --format '{{.HostConfig.Privileged}}' natsuki-model) == false ]] \
    || die "the model container is privileged"
  [[ $(as_natsuki podman inspect --format '{{.HostConfig.ReadonlyRootfs}}' natsuki-model) == true ]] \
    || die "the model root filesystem is writable"
  userctl restart natsuki-bot.service
  userctl is-active --quiet natsuki-model.service natsuki-bot.service \
    || die "one or more Natsuki services failed to start"
  say "The model is authenticated, internal-only, unprivileged, and read-only."

  finish
}
