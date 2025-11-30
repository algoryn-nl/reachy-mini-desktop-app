# Scripts Directory

This directory contains all utility scripts for the project, organized by category.

## Structure

```
scripts/
├── build/              # Build scripts
│   ├── build-sidecar-unix.sh      # Build Python sidecar (macOS/Linux)
│   ├── build-sidecar-windows.ps1  # Build Python sidecar (Windows)
│   └── build-update.sh             # Generate update files
│
├── signing/            # Signing and certificate scripts
│   ├── sign-all-binaries.sh       # Sign all macOS binaries
│   ├── setup-apple-signing.sh     # Configure local Apple signing
│   └── prepare-github-secrets.sh  # Prepare GitHub Actions secrets
│
├── test/               # Test scripts
│   ├── test-app.sh                # Test complete application
│   ├── test-daemon-develop.sh      # Test with develop version of daemon
│   ├── test-sidecar.sh             # Test Python sidecar
│   ├── test-update-prod.sh         # Test production updates
│   └── test-updater.sh             # Test update system
│
├── daemon/             # Daemon management scripts
│   ├── check-daemon.sh             # Check daemon status
│   └── kill-daemon.sh               # Stop daemon
│
└── utils/              # Utility scripts
    ├── serve-updates.sh             # Local server for testing updates
    ├── remove-black-background.py  # Image processing utility
    ├── check-network-permissions.sh # Check network permissions
    └── fix-app-signature.sh        # Fix app signature issues
```

## Usage

### Build

```bash
# Build sidecar
yarn build:sidecar-macos
yarn build:sidecar-linux

# Build with develop version
yarn build:sidecar-macos:develop

# Build updates
yarn build:update:dev
yarn build:update:prod
```

### Signing (macOS)

```bash
# Local configuration
source scripts/signing/setup-apple-signing.sh

# Prepare GitHub secrets
bash scripts/signing/prepare-github-secrets.sh

# Manual signing
bash scripts/signing/sign-all-binaries.sh "path/to/app" "Developer ID Application: ..."
```

### Testing

```bash
# Individual tests
yarn test:sidecar
yarn test:app
yarn test:updater

# All tests
yarn test:all
```

### Daemon

```bash
# Check status
yarn check-daemon

# Stop daemon
yarn kill-daemon
```

### Utilities

```bash
# Serve updates locally
yarn serve:updates
```

## Notes

- All scripts are executable and can be called directly
- Scripts use relative paths from the project root
- Test scripts sometimes require prerequisites (built sidecar, etc.)

