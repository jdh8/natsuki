#!/usr/bin/env bash

PLATFORM_NAME='Fedora'
PLATFORM_UID_MIN=201
PLATFORM_ENGINE=podman
PLATFORM_TARGETED_VERSIONS='43, 44'
PLATFORM_GPU_FAILURE_HINT='GPU access failed with SELinux enabled; review AVCs instead of using label=disable'
PLATFORM_REQUIRED_COMMANDS=(dnf getenforce podman setsebool)

platform_validate_version() {
  local version="$1"
  [[ "$version" =~ ^[0-9]+$ ]] \
    || die "Fedora VERSION_ID must be an integer, got: $version"
  (( 10#$version >= 43 )) \
    || die "Fedora $version is unsupported; version 43 or newer is required"
  case "$version" in
    43|44) ;;
    *) warn "Fedora $version meets the minimum but is not explicitly targeted; targeted versions: $PLATFORM_TARGETED_VERSIONS" ;;
  esac
}

platform_prepare_gpu() {
  local _uid="$1"
  say "Install NVIDIA's CDI generator and verify GPU access without disabling SELinux."
  [[ $(getenforce) == Enforcing ]] || die "SELinux must be enforcing"
  sudo dnf install --assumeyes nvidia-container-toolkit-base
  sudo setsebool -P container_use_devices on
}
