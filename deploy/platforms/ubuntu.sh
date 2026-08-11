#!/usr/bin/env bash

PLATFORM_NAME='Ubuntu'
PLATFORM_UID_MIN=100
PLATFORM_ENGINE=docker
PLATFORM_TARGETED_VERSIONS='22.04, 24.04, 26.04'
PLATFORM_GPU_FAILURE_HINT='GPU access failed; check that `docker info` lists the nvidia runtime and review dmesg'
PLATFORM_REQUIRED_COMMANDS=(docker)

platform_validate_version() {
  local version="$1" major minor
  [[ "$version" =~ ^([0-9]+)\.([0-9]{2})$ ]] \
    || die "Ubuntu VERSION_ID must use YY.MM, got: $version"
  major=${BASH_REMATCH[1]}
  minor=${BASH_REMATCH[2]}
  (( 10#$major > 22 || (10#$major == 22 && 10#$minor >= 4) )) \
    || die "Ubuntu $version is unsupported; version 22.04 or newer is required"
  case "$version" in
    22.04|24.04|26.04) ;;
    *) warn "Ubuntu $version meets the minimum but is not explicitly targeted; targeted versions: $PLATFORM_TARGETED_VERSIONS" ;;
  esac
}

# Ubuntu deploys with the system Docker daemon instead of rootless Podman:
# lingering user@ managers proved unreliable at boot (status=219/CGROUP), and
# Ubuntu's own archive ships a Podman too old for Quadlets.
platform_prepare_gpu() {
  say "Verify the Docker daemon exposes the NVIDIA runtime."
  docker info --format '{{json .Runtimes}}' 2>/dev/null | grep -q '"nvidia"' \
    || die 'the nvidia Docker runtime is missing; install nvidia-container-toolkit, then run: sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker'
}
