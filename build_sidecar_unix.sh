#!/bin/bash

# build_sidecar_unix.sh
# Script to build the sidecar for Unix systems (macOS/Linux)

set -e

DST_DIR="src-tauri/binaries"

# Remove old build
if [ -d "$DST_DIR" ]; then
    rm -rf "$DST_DIR"
fi
mkdir -p "$DST_DIR"

# Get Rust target triplet
TRIPLET=$(rustc -Vv | grep "host:" | awk '{print $2}')

cd uv-wrapper

# Build uv-bundle
echo "🔨 Building uv-bundle..."
cargo build --release --bin uv-bundle

# Use REACHY_MINI_SOURCE env var if set, default to 'pypi'
REACHY_MINI_SOURCE="${REACHY_MINI_SOURCE:-pypi}"

echo "📦 Installing sidecar with REACHY_MINI_SOURCE=$REACHY_MINI_SOURCE..."
./target/release/uv-bundle \
    --install-dir "../$DST_DIR" \
    --python-version 3.12 \
    --dependencies "reachy-mini[placo_kinematics]" \
    --reachy-mini-source "$REACHY_MINI_SOURCE"

# Build uv-trampoline
echo "🔨 Building uv-trampoline..."
cargo build --release --bin uv-trampoline

# Copy uv-trampoline with target triplet suffix
cp "target/release/uv-trampoline" "../$DST_DIR/uv-trampoline-$TRIPLET"

# Make it executable
chmod +x "../$DST_DIR/uv-trampoline-$TRIPLET"

cd ..

echo "✅ Sidecar build complete!"
echo "   Location: $DST_DIR"
echo "   Source: $REACHY_MINI_SOURCE"

