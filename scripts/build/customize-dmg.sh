#!/bin/bash

# Script to create a customized DMG with background image and Applications link
# Uses appdmg (used by create-dmg) for reliable background image support
# Usage: ./customize-dmg.sh <app-bundle> <output-dmg> <background-image> <volume-name>

set -e

APP_BUNDLE="$1"
OUTPUT_DMG="$2"
BACKGROUND_IMAGE="$3"
VOLUME_NAME="${4:-Reachy Mini Control}"

if [ -z "$APP_BUNDLE" ] || [ -z "$OUTPUT_DMG" ] || [ -z "$BACKGROUND_IMAGE" ]; then
  echo "Usage: $0 <app-bundle> <output-dmg> <background-image> [volume-name]"
  exit 1
fi

if [ ! -d "$APP_BUNDLE" ]; then
  echo "❌ App bundle not found: $APP_BUNDLE"
  exit 1
fi

if [ ! -f "$BACKGROUND_IMAGE" ]; then
  echo "❌ Background image not found: $BACKGROUND_IMAGE"
  exit 1
fi

# Check if appdmg is installed
if ! command -v appdmg &> /dev/null; then
  echo "📦 Installing appdmg..."
  npm install -g appdmg
fi

# Get absolute paths
APP_BUNDLE_ABS=$(cd "$(dirname "$APP_BUNDLE")" && pwd)/$(basename "$APP_BUNDLE")
OUTPUT_DMG_ABS=$(cd "$(dirname "$OUTPUT_DMG")" && pwd)/$(basename "$OUTPUT_DMG")
BACKGROUND_IMAGE_ABS=$(cd "$(dirname "$BACKGROUND_IMAGE")" && pwd)/$(basename "$BACKGROUND_IMAGE")

# Try to find .icns file for volume icon (optional)
ICON_ICNS=""
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [ -f "$PROJECT_ROOT/src-tauri/icons/icon.icns" ]; then
  ICON_ICNS="$PROJECT_ROOT/src-tauri/icons/icon.icns"
fi

# Simple fixed configuration for 800×600 image
# No Retina detection, no size detection, just simple and straightforward
WINDOW_WIDTH=800
WINDOW_HEIGHT=600

# Standard icon positions for 800×600 window
ICON_SIZE=128
ICON_Y=236  # Vertically centered: (600 - 128) / 2 = 236
APP_X=200   # Standard position from left
APPS_X=550  # Standard position from left

# Create temporary JSON config for appdmg
# Note: appdmg coordinates are from bottom-left (0,0) in points
TEMP_CONFIG=$(mktemp /tmp/dmg-config-$$.json)

# Build JSON config
cat > "$TEMP_CONFIG" <<EOF
{
  "title": "$VOLUME_NAME",
  $(if [ -n "$ICON_ICNS" ] && [ -f "$ICON_ICNS" ]; then echo "  \"icon\": \"$ICON_ICNS\","; fi)
  "background": "$BACKGROUND_IMAGE_ABS",
  "contents": [
    {
      "x": $APP_X,
      "y": $ICON_Y,
      "type": "file",
      "path": "$APP_BUNDLE_ABS"
    },
    {
      "x": $APPS_X,
      "y": $ICON_Y,
      "type": "link",
      "path": "/Applications"
    }
  ],
  "window": {
    "size": {
      "width": $WINDOW_WIDTH,
      "height": $WINDOW_HEIGHT
    }
  },
  "format": "UDZO"
}
EOF

echo "💿 Creating customized DMG with appdmg..."
echo "   Config: $TEMP_CONFIG"
echo "   Background: $BACKGROUND_IMAGE_ABS"
appdmg "$TEMP_CONFIG" "$OUTPUT_DMG_ABS"

# Clean up
rm -f "$TEMP_CONFIG"

if [ ! -f "$OUTPUT_DMG_ABS" ]; then
  echo "❌ Failed to create DMG"
  exit 1
fi

echo "✅ Customized DMG created: $OUTPUT_DMG_ABS ($(du -h "$OUTPUT_DMG_ABS" | cut -f1))"
