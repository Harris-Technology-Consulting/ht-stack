#!/usr/bin/env bash
# Build hts release assets for the current (or given) platform.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac

OUT_DIR="${OUT_DIR:-$ROOT/dist}"
NAME="hts-${OS}-${ARCH}"
mkdir -p "$OUT_DIR"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required" >&2
  exit 1
fi

echo "building $NAME …"
bun build --compile --outfile="$OUT_DIR/$NAME" ./src/cli.ts
chmod +x "$OUT_DIR/$NAME"
"$OUT_DIR/$NAME" version
echo "asset: $OUT_DIR/$NAME"
