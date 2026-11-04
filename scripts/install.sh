#!/usr/bin/env bash
# HT Stack installer — public GitHub Releases (token optional).
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Harris-Technology-Consulting/ht-stack/main/scripts/install.sh | bash
set -euo pipefail

REPO="${HTS_REPO:-Harris-Technology-Consulting/ht-stack}"
INSTALL_DIR="${HTS_INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${HTS_VERSION:-latest}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac

asset="hts-${OS}-${ARCH}"
tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [[ -z "$token" ]] && command -v gh >/dev/null 2>&1; then
  token="$(gh auth token 2>/dev/null || true)"
fi

api_auth=()
asset_auth=()
if [[ -n "$token" ]]; then
  api_auth=(-H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json")
  asset_auth=(-H "Authorization: Bearer ${token}" -H "Accept: application/octet-stream")
else
  api_auth=(-H "Accept: application/vnd.github+json")
fi

echo "hts install: repo=${REPO} version=${VERSION} asset=${asset}"

download_release() {
  local api json url
  if [[ "$VERSION" == "latest" ]]; then
    api="https://api.github.com/repos/${REPO}/releases/latest"
  else
    api="https://api.github.com/repos/${REPO}/releases/tags/${VERSION}"
  fi
  json="$(curl -fsSL "${api_auth[@]}" "$api" 2>/dev/null || true)"
  if [[ -z "$json" ]]; then
    return 1
  fi
  # Prefer browser_download_url (public); fall back to API asset url (needs auth for private)
  url="$(printf '%s' "$json" | python3 -c "
import sys, json
r=json.load(sys.stdin)
for a in r.get('assets', []):
  if a.get('name') in ('${asset}', '${asset}.tar.gz'):
    print(a.get('browser_download_url') or a.get('url') or '')
    break
")"
  if [[ -z "$url" ]]; then
    return 1
  fi
  if [[ "$url" == https://api.github.com/* ]]; then
    curl -fsSL "${asset_auth[@]}" "$url" -o "$tmpdir/$asset"
  else
    curl -fsSL "$url" -o "$tmpdir/$asset"
  fi
}

install_from_source() {
  echo "hts install: no release asset found — installing from source via bun"
  if ! command -v bun >/dev/null 2>&1; then
    echo "hts install: bun is required for source install (https://bun.sh)" >&2
    exit 1
  fi
  if ! command -v git >/dev/null 2>&1; then
    echo "hts install: git is required for source install" >&2
    exit 1
  fi
  local persist="${HTS_HOME:-$HOME/.hts}/src"
  mkdir -p "$(dirname "$persist")"
  rm -rf "$persist"
  if [[ -n "$token" ]]; then
    git clone --depth 1 "https://x-access-token:${token}@github.com/${REPO}.git" "$persist"
  else
    git clone --depth 1 "https://github.com/${REPO}.git" "$persist"
  fi
  mkdir -p "$INSTALL_DIR"
  cat > "$INSTALL_DIR/hts" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec bun "$persist/src/cli.ts" "\$@"
EOF
  chmod +x "$INSTALL_DIR/hts"
  echo "hts install: installed source wrapper to $INSTALL_DIR/hts"
  echo "hts install: ensure $INSTALL_DIR is on PATH"
  "$INSTALL_DIR/hts" version || true
}

mkdir -p "$INSTALL_DIR"
if download_release; then
  chmod +x "$tmpdir/$asset"
  mv "$tmpdir/$asset" "$INSTALL_DIR/hts"
  echo "hts install: installed binary to $INSTALL_DIR/hts"
  "$INSTALL_DIR/hts" version || true
else
  install_from_source
fi
