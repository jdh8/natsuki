#!/usr/bin/env bash

set -euo pipefail

readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DEPLOY_DIR="$(cd "$TEST_DIR/.." && pwd)"
readonly TEST_TMP="$(mktemp -d)"
trap 'rm -rf -- "$TEST_TMP"' EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

write_fixture() {
  local name="$1" id="$2" version="${3-}"
  {
    printf 'ID=%q\n' "$id"
    [[ -z "$version" ]] || printf 'VERSION_ID=%q\n' "$version"
  } > "$TEST_TMP/$name"
}

run_fixture() (
  set -euo pipefail
  SCRIPT_DIR="$DEPLOY_DIR"
  # shellcheck source=deploy/lib/common.sh
  source "$DEPLOY_DIR/lib/common.sh"
  warn() { printf 'WARN: %s\n' "$1"; }
  select_platform "$1"
  platform_validate_version "$OS_VERSION_ID"
  printf 'PLATFORM=%s\nUID_MIN=%s\nTARGETS=%s\n' \
    "$PLATFORM_NAME" "$PLATFORM_UID_MIN" "$PLATFORM_TARGETED_VERSIONS"
)

assert_supported() {
  local fixture="$1" platform="$2" uid_min="$3" output
  if ! output=$(run_fixture "$fixture" 2>&1); then
    fail "expected $fixture to be supported; output: $output"
  fi
  [[ "$output" == *"PLATFORM=$platform"* ]] \
    || fail "$fixture selected the wrong platform: $output"
  [[ "$output" == *"UID_MIN=$uid_min"* ]] \
    || fail "$fixture selected the wrong UID minimum: $output"
  [[ "$output" != *'WARN:'* ]] \
    || fail "$fixture unexpectedly warned: $output"
}

assert_warned() {
  local fixture="$1" targeted="$2" output
  if ! output=$(run_fixture "$fixture" 2>&1); then
    fail "expected $fixture to continue with a warning; output: $output"
  fi
  [[ "$output" == *'not explicitly targeted'* ]] \
    || fail "$fixture did not emit the expected warning: $output"
  [[ "$output" == *"targeted versions: $targeted"* ]] \
    || fail "$fixture warning omitted the targeted versions: $output"
}

assert_rejected() {
  local fixture="$1" expected="$2" output
  if output=$(run_fixture "$fixture" 2>&1); then
    fail "expected $fixture to be rejected; output: $output"
  fi
  [[ "$output" == *"$expected"* ]] \
    || fail "$fixture failed for the wrong reason: $output"
}

assert_usage_error() {
  local output status
  set +e
  output=$("$DEPLOY_DIR/setup" "$@" 2>&1)
  status=$?
  set -e
  (( status == 2 )) || fail "setup $* exited $status instead of 2: $output"
  [[ "$output" == usage:* ]] || fail "setup $* did not print usage: $output"
}

assert_subid_start() {
  local fixture="$1" minimum="$2" maximum="$3" expected="$4" actual
  actual=$(find_free_subid_start "$fixture" "$minimum" "$maximum")
  [[ "$actual" == "$expected" ]] \
    || fail "$fixture selected subordinate ID $actual instead of $expected"
}

assert_existing_subid_accepted() {
  local fixture="$1" output
  if ! output=$(ensure_subid_range "$fixture" --unused SUB_UID_MIN SUB_UID_MAX 2>&1); then
    fail "$fixture rejected a valid existing subordinate ID range: $output"
  fi
}

assert_existing_subid_rejected() {
  local fixture="$1" expected="$2" output
  if output=$(ensure_subid_range "$fixture" --unused SUB_UID_MIN SUB_UID_MAX 2>&1); then
    fail "$fixture accepted an unsafe existing subordinate ID range"
  fi
  [[ "$output" == *"$expected"* ]] \
    || fail "$fixture failed for the wrong reason: $output"
}

SCRIPT_DIR="$DEPLOY_DIR"
# shellcheck source=deploy/lib/common.sh
source "$DEPLOY_DIR/lib/common.sh"

[[ "$DEFAULT_MODEL_PATH" == *models--ibm-granite--granite-4.1-3b-GGUF* ]] \
  || fail "the default deployment model is not Granite 4.1 3B"
[[ "$DEFAULT_MODEL_PATH" == *granite-4.1-3b-Q8_0.gguf ]] \
  || fail "the default deployment quant is not Q8_0"
[[ "${DEFAULT_MODEL_PATH,,}" != *qwen* ]] \
  || fail "the default deployment model violates the model-origin policy"

touch "$TEST_TMP/subids-empty"
assert_subid_start "$TEST_TMP/subids-empty" 100000 600100000 600016544

cat > "$TEST_TMP/subids-overlap" <<'EOF'
next-user:755360:65536
cthsieh:689824:65536
chengchi:624288:65536
EOF
assert_subid_start "$TEST_TMP/subids-overlap" 100000 820895 558752

cat > "$TEST_TMP/subids-boundaries" <<'EOF'
before:165536:65536
after:296608:65536
EOF
assert_subid_start "$TEST_TMP/subids-boundaries" 100000 296607 231072

cat > "$TEST_TMP/subids-gap-too-small" <<'EOF'
blocker:320000:10000
EOF
assert_subid_start "$TEST_TMP/subids-gap-too-small" 100000 362143 231072

cat > "$TEST_TMP/subids-existing" <<'EOF'
login:100000:65536
natsuki:600016544:65536
EOF
assert_existing_subid_accepted "$TEST_TMP/subids-existing"

cat > "$TEST_TMP/subids-existing-overlap" <<'EOF'
login:600000000:65536
natsuki:600016544:65536
EOF
assert_existing_subid_rejected "$TEST_TMP/subids-existing-overlap" 'overlaps another account'

printf 'natsuki:600016544:65535\n' > "$TEST_TMP/subids-existing-small"
assert_existing_subid_rejected "$TEST_TMP/subids-existing-small" 'invalid or undersized range'

for version in 22.04 24.04 26.04; do
  write_fixture "ubuntu-$version" ubuntu "$version"
  assert_supported "$TEST_TMP/ubuntu-$version" Ubuntu 100
done

for version in 43 44; do
  write_fixture "fedora-$version" fedora "$version"
  assert_supported "$TEST_TMP/fedora-$version" Fedora 201
done

write_fixture ubuntu-interim ubuntu 22.10
assert_warned "$TEST_TMP/ubuntu-interim" '22.04, 24.04, 26.04'
write_fixture ubuntu-future ubuntu 28.04
assert_warned "$TEST_TMP/ubuntu-future" '22.04, 24.04, 26.04'
write_fixture fedora-future fedora 45
assert_warned "$TEST_TMP/fedora-future" '43, 44'

write_fixture ubuntu-old ubuntu 20.04
assert_rejected "$TEST_TMP/ubuntu-old" 'version 22.04 or newer is required'
write_fixture fedora-old fedora 42
assert_rejected "$TEST_TMP/fedora-old" 'version 43 or newer is required'
write_fixture ubuntu-malformed ubuntu jammy
assert_rejected "$TEST_TMP/ubuntu-malformed" 'must use YY.MM'
write_fixture fedora-malformed fedora rawhide
assert_rejected "$TEST_TMP/fedora-malformed" 'must be an integer'
write_fixture missing-version ubuntu
assert_rejected "$TEST_TMP/missing-version" 'does not define VERSION_ID'
printf 'VERSION_ID=22.04\n' > "$TEST_TMP/missing-id"
assert_rejected "$TEST_TMP/missing-id" 'does not define ID'
write_fixture unsupported debian 13
assert_rejected "$TEST_TMP/unsupported" 'unsupported operating system: debian'
write_fixture derivative linuxmint 22
printf 'ID_LIKE=ubuntu\n' >> "$TEST_TMP/derivative"
assert_rejected "$TEST_TMP/derivative" 'unsupported operating system: linuxmint'

assert_usage_error
assert_usage_error qa
assert_usage_error dev extra

bash -n \
  "$DEPLOY_DIR/setup" \
  "$DEPLOY_DIR/lib/common.sh" \
  "$DEPLOY_DIR/platforms/fedora.sh" \
  "$DEPLOY_DIR/platforms/ubuntu.sh" \
  "$DEPLOY_DIR/tests/setup.sh"

printf 'deploy setup tests passed\n'
