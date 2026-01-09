#!/bin/bash
# Script to sign all binaries in macOS app bundle before notarization
# Usage: ./scripts/signing/sign-all-binaries.sh <path-to-app-bundle> <signing-identity>
#
# This script recursively signs all Mach-O binaries in the bundle:
# - Binaries in Resources (uvx, uv, etc.)
# - Python libraries (.so, .dylib) in .venv
# - Python executables in .venv/bin (CRITICAL - must be signed with same Team ID)
# - Binaries in cpython-*
# - Main app bundle (last, WITHOUT --deep to preserve nested signatures)

set -eu

APP_BUNDLE="$1"
SIGNING_IDENTITY="$2"

if [ -z "$APP_BUNDLE" ] || [ -z "$SIGNING_IDENTITY" ]; then
    echo "Usage: $0 <path-to-app-bundle> <signing-identity>"
    echo "Example: $0 'Reachy Mini Control.app' 'Developer ID Application: Pollen Robotics (4KLHP7L6KP)'"
    exit 1
fi

if [ ! -d "$APP_BUNDLE" ]; then
    echo "❌ App bundle not found: $APP_BUNDLE"
    exit 1
fi

echo "🔐 Signing all binaries in $APP_BUNDLE"
echo "   Signing identity: $SIGNING_IDENTITY"

# Error counter (global, works across function calls)
ERROR_COUNT=0

# Function to sign a binary - returns 0 on success, 1 on failure
# Usage: sign_binary <binary_path> [entitlements_file]
sign_binary() {
    local binary="$1"
    local entitlements_file="${2:-}"  # Optional entitlements file (default to empty)
    
    if [ ! -f "$binary" ]; then
        echo "   ⚠️  File not found: $binary"
        return 1
    fi
    
    # Check if it's a Mach-O binary (may be executable or not)
    if ! file "$binary" 2>/dev/null | grep -qE "(Mach-O|dynamically linked|shared library)"; then
        # Not a Mach-O binary, skip silently
        return 0
    fi
    
    echo "   Signing: $binary"
    
    # Build codesign command
    local codesign_cmd=(
        codesign
        --force
        --verify
        --verbose
        --sign "$SIGNING_IDENTITY"
        --options runtime
        --timestamp
    )
    
    # Add entitlements if provided and file exists
    if [ -n "$entitlements_file" ]; then
        if [ -f "$entitlements_file" ]; then
            codesign_cmd+=(--entitlements "$entitlements_file")
            echo "      Using entitlements: $entitlements_file"
        else
            echo "      ⚠️  Entitlements file not found: $entitlements_file"
        fi
    fi
    
    codesign_cmd+=("$binary")
    
    # Execute signing and capture output
    local output
    if output=$("${codesign_cmd[@]}" 2>&1); then
        echo "      ✓ Signed successfully"
        return 0
    else
        echo "      ❌ Failed to sign: $binary"
        echo "      Error: $output"
        ERROR_COUNT=$((ERROR_COUNT + 1))
        return 1
    fi
}

# Function to verify a binary has the correct Team ID
# Usage: verify_team_id <binary_path> <expected_team_id>
verify_team_id() {
    local binary="$1"
    local expected_team_id="$2"
    
    local actual_team_id
    actual_team_id=$(codesign -dv --verbose=4 "$binary" 2>&1 | grep "TeamIdentifier=" | cut -d= -f2 || echo "not set")
    
    if [ "$actual_team_id" = "$expected_team_id" ]; then
        echo "      ✓ Team ID verified: $actual_team_id"
        return 0
    else
        echo "      ❌ Team ID mismatch! Expected: $expected_team_id, Got: $actual_team_id"
        return 1
    fi
}

# Get path to entitlements files (in same directory as this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_ENTITLEMENTS="$SCRIPT_DIR/python-entitlements.plist"

# Extract Team ID from signing identity for verification
# Format: "Developer ID Application: Name (TEAM_ID)"
EXPECTED_TEAM_ID=$(echo "$SIGNING_IDENTITY" | grep -oE '\([A-Z0-9]{10}\)' | tr -d '()' || echo "")
if [ -z "$EXPECTED_TEAM_ID" ]; then
    echo "⚠️  Could not extract Team ID from signing identity"
    echo "   Identity: $SIGNING_IDENTITY"
fi

# Verify entitlements file exists
if [ ! -f "$PYTHON_ENTITLEMENTS" ]; then
    echo "❌ CRITICAL: Python entitlements file not found: $PYTHON_ENTITLEMENTS"
    echo "   This file is required for Python binaries to work with Hardened Runtime"
    exit 1
fi
echo "📜 Using Python entitlements: $PYTHON_ENTITLEMENTS"

RESOURCES_DIR="$APP_BUNDLE/Contents/Resources"

if [ -d "$RESOURCES_DIR" ]; then
    echo ""
    echo "📦 Signing binaries in Resources..."
    
    # Sign uvx and uv
    for binary_name in uvx uv; do
        if [ -f "$RESOURCES_DIR/$binary_name" ]; then
            sign_binary "$RESOURCES_DIR/$binary_name"
        fi
    done
    
    # Sign uv-trampoline and main executable (in MacOS)
    MACOS_DIR="$APP_BUNDLE/Contents/MacOS"
    if [ -d "$MACOS_DIR" ]; then
        echo ""
        echo "📦 Signing binaries in MacOS..."
        # Use process substitution to avoid subshell issues with error counting
        while IFS= read -r -d '' binary; do
            sign_binary "$binary"
        done < <(find "$MACOS_DIR" -type f -perm +111 -print0)
    fi
    
    # ============================================================
    # CRITICAL: Sign Python binaries in .venv/bin FIRST
    # These MUST have the same Team ID as the main app for dlopen to work
    # ============================================================
    if [ -d "$RESOURCES_DIR/.venv/bin" ]; then
        echo ""
        echo "🐍 CRITICAL: Signing Python executables in .venv/bin..."
        echo "   These must have Team ID: $EXPECTED_TEAM_ID"
        
        # Sign Python executables DIRECTLY (not in a subshell)
        # This is the most critical part - these binaries are loaded via dlopen
        for py_binary in "$RESOURCES_DIR/.venv/bin/python"*; do
            if [ -f "$py_binary" ]; then
                base_name=$(basename "$py_binary")
                if echo "$base_name" | grep -qE "^python[0-9.]*$"; then
                    echo ""
                    echo "   🔐 Signing Python executable: $py_binary"
                    if ! sign_binary "$py_binary" "$PYTHON_ENTITLEMENTS"; then
                        echo "   ❌ CRITICAL: Failed to sign Python executable!"
                        exit 1
                    fi
                    # Verify Team ID was set correctly
                    if [ -n "$EXPECTED_TEAM_ID" ]; then
                        if ! verify_team_id "$py_binary" "$EXPECTED_TEAM_ID"; then
                            echo "   ❌ CRITICAL: Team ID verification failed!"
                            exit 1
                        fi
                    fi
                fi
            fi
        done
        
        # Sign other binaries in .venv/bin (not Python itself)
        while IFS= read -r -d '' binary; do
            base_name=$(basename "$binary")
            # Skip Python executables (already signed above)
            if ! echo "$base_name" | grep -qE "^python[0-9.]*$"; then
                if [ -x "$binary" ]; then
                    sign_binary "$binary"
                fi
            fi
        done < <(find "$RESOURCES_DIR/.venv/bin" -type f -print0)
    fi
    
    # Sign all binaries in .venv (libraries and extensions)
    if [ -d "$RESOURCES_DIR/.venv" ]; then
        echo ""
        echo "📦 Signing libraries in .venv..."
        
        # Sign all .dylib files
        while IFS= read -r -d '' dylib; do
            sign_binary "$dylib"
        done < <(find "$RESOURCES_DIR/.venv" -name "*.dylib" -type f -print0)
        
        # Sign all .so files (native Python extensions)
        while IFS= read -r -d '' so_file; do
            sign_binary "$so_file"
        done < <(find "$RESOURCES_DIR/.venv" -name "*.so" -type f -print0)
        
        # Sign libpython*.dylib with entitlements
        if [ -d "$RESOURCES_DIR/.venv/lib" ]; then
            echo ""
            echo "📦 Signing Python libraries in .venv/lib..."
            while IFS= read -r -d '' dylib; do
                echo "   Applying entitlements to Python library: $dylib"
                sign_binary "$dylib" "$PYTHON_ENTITLEMENTS"
            done < <(find "$RESOURCES_DIR/.venv/lib" -name "libpython*.dylib" -type f -print0)
            
            # Sign other executable binaries
            while IFS= read -r -d '' binary; do
                base_name=$(basename "$binary")
                # Skip libpython*.dylib (already signed above)
                if ! echo "$base_name" | grep -qE "^libpython.*\.dylib$"; then
                    sign_binary "$binary"
                fi
            done < <(find "$RESOURCES_DIR/.venv/lib" -type f -perm +111 -print0)
        fi
    fi
    
    # Sign binaries in cpython (for all architectures)
    for cpython_dir in "$RESOURCES_DIR"/cpython-*; do
        if [ -d "$cpython_dir" ]; then
            echo ""
            echo "📦 Signing binaries in $(basename "$cpython_dir")..."
            
            # Sign Python executables with entitlements
            if [ -d "$cpython_dir/bin" ]; then
                for py_binary in "$cpython_dir/bin/python"*; do
                    if [ -f "$py_binary" ]; then
                        base_name=$(basename "$py_binary")
                        if echo "$base_name" | grep -qE "^python[0-9.]*$"; then
                            echo "   Applying entitlements to Python executable: $py_binary"
                            sign_binary "$py_binary" "$PYTHON_ENTITLEMENTS"
                        fi
                    fi
                done
            fi
            
            # Sign Python libraries (libpython*.dylib) with entitlements
            while IFS= read -r -d '' dylib; do
                echo "   Applying entitlements to Python library: $dylib"
                sign_binary "$dylib" "$PYTHON_ENTITLEMENTS"
            done < <(find "$cpython_dir/lib" -name "libpython*.dylib" -type f -print0 2>/dev/null)
            
            # Sign all other binaries without entitlements
            while IFS= read -r -d '' binary; do
                base_name=$(basename "$binary")
                # Skip Python executables and libraries (already signed above)
                if ! echo "$base_name" | grep -qE "^python[0-9.]*$" && ! echo "$base_name" | grep -qE "^libpython.*\.dylib$"; then
                    sign_binary "$binary"
                fi
            done < <(find "$cpython_dir" -type f \( -name "*.dylib" -o -name "*.so" -o -perm +111 \) -print0)
        fi
    done
fi

# ============================================================
# Sign main app bundle LAST
# IMPORTANT: Do NOT use --deep as it can overwrite nested signatures
# All nested binaries should already be signed above
# ============================================================
echo ""
echo "📦 Signing main app bundle (without --deep to preserve nested signatures)..."
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENTITLEMENTS_FILE="$PROJECT_DIR/src-tauri/entitlements.plist"

if [ ! -f "$ENTITLEMENTS_FILE" ]; then
    echo "⚠️  Warning: Entitlements file not found: $ENTITLEMENTS_FILE"
    echo "   Signing without entitlements (not recommended)"
    if ! codesign --force --verify --verbose --sign "$SIGNING_IDENTITY" \
        --options runtime \
        --timestamp \
        "$APP_BUNDLE"; then
        echo "❌ Failed to sign main app bundle"
        exit 1
    fi
else
    echo "   Using entitlements: $ENTITLEMENTS_FILE"
    if ! codesign --force --verify --verbose --sign "$SIGNING_IDENTITY" \
        --options runtime \
        --timestamp \
        --entitlements "$ENTITLEMENTS_FILE" \
        "$APP_BUNDLE"; then
        echo "❌ Failed to sign main app bundle"
        exit 1
    fi
fi

# ============================================================
# Verify all signatures
# ============================================================
echo ""
echo "✅ Verifying all signatures..."
if ! codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"; then
    echo "❌ Signature verification failed"
    exit 1
fi

# Verify Team IDs of critical binaries
echo ""
echo "🔍 Verifying Team IDs of critical binaries..."
CRITICAL_FAILURES=0

# Check main app
MAIN_TEAM=$(codesign -dv --verbose=4 "$APP_BUNDLE" 2>&1 | grep "TeamIdentifier=" | cut -d= -f2 || echo "unknown")
echo "   Main app: TeamIdentifier=$MAIN_TEAM"

# Check Python in .venv/bin
for py_binary in "$RESOURCES_DIR/.venv/bin/python"*; do
    if [ -f "$py_binary" ]; then
        base_name=$(basename "$py_binary")
        if echo "$base_name" | grep -qE "^python[0-9.]*$"; then
            PY_TEAM=$(codesign -dv --verbose=4 "$py_binary" 2>&1 | grep "TeamIdentifier=" | cut -d= -f2 || echo "not set")
            if [ "$PY_TEAM" = "not set" ] || [ "$PY_TEAM" != "$MAIN_TEAM" ]; then
                echo "   ❌ $base_name: TeamIdentifier=$PY_TEAM (MISMATCH!)"
                CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
            else
                echo "   ✓ $base_name: TeamIdentifier=$PY_TEAM"
            fi
        fi
    fi
done

# Check Python in cpython
for cpython_dir in "$RESOURCES_DIR"/cpython-*; do
    if [ -d "$cpython_dir/bin" ]; then
        for py_binary in "$cpython_dir/bin/python"*; do
            if [ -f "$py_binary" ]; then
                base_name=$(basename "$py_binary")
                if echo "$base_name" | grep -qE "^python[0-9.]*$"; then
                    PY_TEAM=$(codesign -dv --verbose=4 "$py_binary" 2>&1 | grep "TeamIdentifier=" | cut -d= -f2 || echo "not set")
                    dir_name=$(basename "$cpython_dir")
                    if [ "$PY_TEAM" = "not set" ] || [ "$PY_TEAM" != "$MAIN_TEAM" ]; then
                        echo "   ❌ $dir_name/$base_name: TeamIdentifier=$PY_TEAM (MISMATCH!)"
                        CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
                    else
                        echo "   ✓ $dir_name/$base_name: TeamIdentifier=$PY_TEAM"
                    fi
                fi
            fi
        done
    fi
done

# Display summary
echo ""
if [ $CRITICAL_FAILURES -gt 0 ]; then
    echo "❌ CRITICAL: $CRITICAL_FAILURES Python binaries have mismatched Team IDs!"
    echo "   This will cause 'different Team IDs' errors at runtime"
    exit 1
fi

if [ $ERROR_COUNT -gt 0 ]; then
    echo "⚠️  Warning: $ERROR_COUNT binaries failed to sign (may not be critical)"
else
    echo "✅ All binaries signed successfully!"
fi

echo ""
echo "📋 Signed binaries summary:"
codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE" 2>&1 | grep -E "^$APP_BUNDLE" | head -20 || true

