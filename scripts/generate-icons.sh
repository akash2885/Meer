#!/bin/bash
# Usage: ./scripts/generate-icons.sh path/to/logo.png
# Requires: sips (built into macOS) or imagemagick
set -e

SOURCE="${1:-public/icons/logo-source.png}"

if [ ! -f "$SOURCE" ]; then
  echo "Error: source image not found at $SOURCE"
  echo "Usage: $0 path/to/logo.png"
  exit 1
fi

OUT="public/icons"

for SIZE in 16 32 48 128; do
  sips -z $SIZE $SIZE "$SOURCE" --out "$OUT/icon${SIZE}.png" > /dev/null
  echo "Generated $OUT/icon${SIZE}.png"
done

echo "Done. Icons written to $OUT/"
