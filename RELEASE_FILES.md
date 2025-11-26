# 📦 Release Files - Roles and Responsibilities

This document describes all files involved in the release process and their specific roles.

---

## 🎯 Core Release Files

### 1. Version Configuration

#### `src-tauri/tauri.conf.json`
**Role**: Main Tauri configuration file containing version and updater settings

**Key sections:**
- `version`: Current app version (e.g., `"0.2.6"`) - **MUST be updated before release**
- `plugins.updater`: Updater configuration
  - `endpoints`: URL to fetch update manifest (`latest.json`)
  - `pubkey`: Public key for verifying update signatures (minisign Ed25519)
  - `active`: Enable/disable auto-updates

**When to modify:**
- Before each release: Update `version` field
- When changing update server: Update `endpoints`
- When rotating signing keys: Update `pubkey`

---

## 🔨 Build Scripts

### 2. `scripts/build/build-sidecar-unix.sh`
**Role**: Builds the Python sidecar for Unix systems (macOS/Linux)

**What it does:**
1. Compiles `uv-bundle` Rust binary
2. Installs Python 3.12 + `uv` + `reachy-mini[placo_kinematics]`
3. Compiles `uv-trampoline` Rust binary
4. Outputs to `src-tauri/binaries/`

**Used by:**
- Local builds: `yarn build:sidecar-macos`
- CI/CD: `.github/workflows/release-unified.yml`

**Environment variables:**
- `REACHY_MINI_SOURCE`: `pypi` (default) or `develop` (GitHub)

---

### 3. `scripts/build/build-sidecar-windows.ps1`
**Role**: PowerShell equivalent of `build-sidecar-unix.sh` for Windows

**What it does:**
- Same as Unix version but for Windows platform

**Used by:**
- CI/CD: `.github/workflows/release-unified.yml` (Windows runners)

---

### 4. `scripts/build/build-update.sh`
**Role**: Generates signed update files for distribution

**What it does:**
1. Builds the application (debug or release mode)
2. Creates platform-specific bundles:
   - macOS: `.app.tar.gz`
   - Windows: `.msi`
   - Linux: `.AppImage`
3. Signs the bundle with minisign (Ed25519)
4. Generates `update.json` with:
   - Version number
   - Signature (base64)
   - Download URL
   - Publication date

**Usage:**
```bash
# Development (test locally)
./scripts/build/build-update.sh dev

# Production
./scripts/build/build-update.sh prod [version]
```

**Output:**
- `releases/<platform>/<version>/update.json` (production)
- `test-updates/<platform>/<version>/update.json` (development)

**Dependencies:**
- Requires signing key: `~/.tauri/reachy-mini.key`
- Reads version from `src-tauri/tauri.conf.json` if not provided

---

## 🔐 Signing Scripts

### 5. `scripts/signing/sign-all-binaries.sh`
**Role**: Signs all Mach-O binaries in macOS app bundle

**What it does:**
1. Signs all `.dylib` and `.so` files in `.venv/`
2. Signs binaries in `cpython-*` directories
3. Signs `uv`, `uvx`, and other executables
4. Signs the main app bundle with `--deep`

**Usage:**
```bash
./scripts/signing/sign-all-binaries.sh "path/to/app" "Developer ID Application: ..."
```

**Used by:**
- CI/CD: `.github/workflows/release-unified.yml` (macOS only)
- Local builds: Manual signing before notarization

**Requirements:**
- Apple Developer ID certificate
- Signing identity (e.g., `Developer ID Application: Name (TEAM_ID)`)

---

### 6. `scripts/signing/setup-apple-signing.sh`
**Role**: Configures Apple code signing environment variables locally

**What it does:**
1. Reads certificate file (`.p12` or `.cer`)
2. Extracts signing identity and Team ID
3. Exports environment variables:
   - `APPLE_CERTIFICATE` (base64)
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_SIGNING_IDENTITY`
   - `APPLE_TEAM_ID`

**Usage:**
```bash
source scripts/signing/setup-apple-signing.sh
```

**Used by:**
- Local developers: Before building signed macOS apps

---

### 7. `scripts/signing/prepare-github-secrets.sh`
**Role**: Generates values for GitHub Actions secrets

**What it does:**
1. Reads certificate file (`.p12` or `.cer`)
2. Encodes certificate in base64
3. Extracts signing identity and Team ID
4. Displays formatted values for GitHub Secrets

**Usage:**
```bash
bash scripts/signing/prepare-github-secrets.sh [PASSWORD]
```

**Output:**
- Prints values to copy into GitHub Secrets:
  - `APPLE_CERTIFICATE`
  - `APPLE_CERTIFICATE_PASSWORD`
  - `APPLE_SIGNING_IDENTITY`
  - `APPLE_TEAM_ID`

**Used by:**
- Initial setup: When configuring GitHub Actions for the first time

---

## 🚀 CI/CD Workflow

### 8. `.github/workflows/release-unified.yml`
**Role**: Automated release pipeline triggered by Git tags

**Triggers:**
- Push tag matching `v*` (e.g., `v0.2.6`)
- Manual `workflow_dispatch` with optional version

**What it does:**
1. **Setup**: Node.js, Rust, dependencies
2. **Build Sidecar**: For each platform (macOS aarch64, macOS x86_64, Windows)
3. **Setup Apple Signing**: Import certificates, configure keychain (macOS only)
4. **Setup Tauri Signing**: Configure minisign keys for update signing
5. **Extract Version**: From Git tag or input
6. **Update Version**: In `tauri.conf.json`
7. **Build Tauri**: Compile app for each platform
8. **Sign & Notarize**: macOS only (sign all binaries, submit to Apple)
9. **Create Release**: Upload bundles to GitHub Releases
10. **Build Updates**: Generate signed `update.json` files
11. **Merge Manifest**: Combine all `update.json` into `latest.json`
12. **Upload Latest**: Add `latest.json` to GitHub Release

**Matrix Strategy:**
- 3 platforms: macOS aarch64, macOS x86_64, Windows x86_64
- Parallel builds for faster releases

**Secrets Required:**
- `APPLE_CERTIFICATE` (base64)
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_TEAM_ID`
- `APPLE_API_KEY` (Key ID)
- `APPLE_API_ISSUER` (Issuer ID)
- `APPLE_API_KEY_CONTENT` (private key .p8)
- `TAURI_SIGNING_KEY` (minisign private key)
- `TAURI_PUBLIC_KEY` (minisign public key, optional)
- `RELEASE_URL_BASE` (optional, defaults to GitHub Releases)

---

## 📋 Release Artifacts

### Generated Files

#### `latest.json`
**Location**: GitHub Releases (uploaded by CI/CD)

**Role**: Main update manifest that clients check

**Structure:**
```json
{
  "version": "0.2.6",
  "notes": "Update for version 0.2.6",
  "pub_date": "2024-11-26T14:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "<base64-signature>",
      "url": "https://github.com/.../reachy-mini-control_0.2.6_darwin-aarch64.app.tar.gz"
    },
    "darwin-x86_64": { ... },
    "windows-x86_64": { ... }
  }
}
```

**Generated by:**
- CI/CD job: `create-update-manifest` (merges all `update.json` files)

---

#### `update.json` (per platform)
**Location**: `releases/<platform>/<version>/update.json`

**Role**: Platform-specific update manifest

**Generated by:**
- `scripts/build/build-update.sh`
- CI/CD: Each platform job generates its own

**Merged into:**
- `latest.json` by the final CI/CD job

---

#### Bundle Files
**Location**: GitHub Releases

**Formats:**
- macOS: `reachy-mini-control_<version>_darwin-<arch>.app.tar.gz`
- Windows: `reachy-mini-control_<version>_windows-x86_64-setup.msi`
- Linux: `reachy-mini-control_<version>_linux-x86_64.AppImage`

**Generated by:**
- Tauri build process
- Archived/signed by `scripts/build/build-update.sh`

---

## 🔑 Signing Keys

### Minisign Keys (Update Signing)

**Location:**
- Private: `~/.tauri/reachy-mini.key` (local) / `TAURI_SIGNING_KEY` (GitHub Secret)
- Public: `~/.tauri/reachy-mini.key.pub` (local) / `TAURI_PUBLIC_KEY` (GitHub Secret)

**Role**: Sign update bundles to prevent tampering

**Generated by:**
```bash
yarn tauri signer generate -w ~/.tauri/reachy-mini.key
```

**Used by:**
- `scripts/build/build-update.sh`: Signs bundles
- Tauri updater: Verifies signatures before installing

**Public key:**
- Stored in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`)
- Base64-encoded Ed25519 public key

---

### Apple Developer ID (macOS Code Signing)

**Location:**
- Certificate: `.p12` file (local) / `APPLE_CERTIFICATE` (GitHub Secret, base64)
- Password: `APPLE_CERTIFICATE_PASSWORD` (GitHub Secret)
- Identity: `APPLE_SIGNING_IDENTITY` (GitHub Secret)
- Team ID: `APPLE_TEAM_ID` (GitHub Secret)

**Role**: Code sign macOS bundles for distribution outside App Store

**Used by:**
- `scripts/signing/sign-all-binaries.sh`: Signs all binaries
- Tauri build: Signs main bundle
- Apple notarization: Required for distribution

---

### App Store Connect API Key (Notarization)

**Location:**
- Key ID: `APPLE_API_KEY` (GitHub Secret)
- Issuer ID: `APPLE_API_ISSUER` (GitHub Secret)
- Private Key: `APPLE_API_KEY_CONTENT` (GitHub Secret, .p8 file)

**Role**: Authenticate with Apple's notarization service

**Used by:**
- CI/CD: `xcrun notarytool` to submit app for notarization

---

## 📝 Release Process Flow

### Local Release (Manual)

1. **Update version** in `src-tauri/tauri.conf.json`
2. **Build sidecar**: `yarn build:sidecar-macos`
3. **Build app**: `yarn tauri:build`
4. **Sign binaries** (macOS): `scripts/signing/sign-all-binaries.sh`
5. **Notarize** (macOS): `xcrun notarytool submit ...`
6. **Build updates**: `yarn build:update:prod`
7. **Test locally**: `yarn serve:updates`

### Automated Release (CI/CD)

1. **Create Git tag**: `git tag -a v0.2.6 -m "Release v0.2.6"`
2. **Push tag**: `git push origin v0.2.6`
3. **GitHub Actions triggers** automatically
4. **Workflow executes**:
   - Builds for all platforms
   - Signs and notarizes (macOS)
   - Creates GitHub Release
   - Generates update files
   - Uploads `latest.json`

---

## 🗂️ File Organization Summary

```
Release-related files:
├── Configuration
│   └── src-tauri/tauri.conf.json          # Version & updater config
│
├── Build Scripts
│   ├── scripts/build/build-sidecar-unix.sh      # Build Python sidecar
│   ├── scripts/build/build-sidecar-windows.ps1  # Build sidecar (Windows)
│   └── scripts/build/build-update.sh           # Generate update files
│
├── Signing Scripts
│   ├── scripts/signing/sign-all-binaries.sh     # Sign macOS binaries
│   ├── scripts/signing/setup-apple-signing.sh  # Local signing setup
│   └── scripts/signing/prepare-github-secrets.sh # Generate secrets
│
├── CI/CD
│   └── .github/workflows/release-unified.yml   # Automated release pipeline
│
└── Generated Artifacts
    ├── releases/                               # Production update files
    ├── test-updates/                           # Development update files
    └── GitHub Releases                         # Bundles + latest.json
```

---

## 🔄 Version Management

### Version Number Location

**Primary source**: `src-tauri/tauri.conf.json`
```json
{
  "version": "0.2.6"
}
```

**Extracted by:**
- `scripts/build/build-update.sh`: Reads version from config
- CI/CD: Updates version from Git tag

### Version Update Process

1. **Before release**: Update `version` in `tauri.conf.json`
2. **Create tag**: `git tag -a v0.2.6 -m "Release v0.2.6"`
3. **CI/CD**: Extracts version from tag and updates config if needed

---

## ✅ Release Checklist

Before creating a release:

- [ ] Update `version` in `src-tauri/tauri.conf.json`
- [ ] Test build locally: `yarn build:sidecar-macos && yarn tauri:build`
- [ ] Test update generation: `yarn build:update:dev`
- [ ] Verify signing keys are configured (GitHub Secrets)
- [ ] Create Git tag: `git tag -a v0.2.6 -m "Release v0.2.6"`
- [ ] Push tag: `git push origin v0.2.6`
- [ ] Monitor GitHub Actions workflow
- [ ] Verify `latest.json` is uploaded to GitHub Release
- [ ] Test auto-update in a test app installation

---

## 📚 Related Documentation

- [RAPPORT_BUILD.md](./RAPPORT_BUILD.md) - Detailed build process documentation
- [scripts/README.md](./scripts/README.md) - Scripts organization
- [CONVENTIONS.md](./CONVENTIONS.md) - Code conventions

---

**Last updated**: 2024-11-26

