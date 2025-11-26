# Scripts Directory

Ce répertoire contient tous les scripts utilitaires du projet, organisés par catégorie.

## Structure

```
scripts/
├── build/              # Scripts de build
│   ├── build-sidecar-unix.sh      # Build sidecar Python (macOS/Linux)
│   ├── build-sidecar-windows.ps1  # Build sidecar Python (Windows)
│   └── build-update.sh             # Génération des fichiers de mise à jour
│
├── signing/            # Scripts de signature et certificats
│   ├── sign-all-binaries.sh       # Signature de tous les binaires macOS
│   ├── setup-apple-signing.sh     # Configuration signature Apple locale
│   └── prepare-github-secrets.sh  # Préparation des secrets GitHub Actions
│
├── test/               # Scripts de test
│   ├── test-app.sh                # Test de l'application complète
│   ├── test-daemon-develop.sh      # Test avec version develop du daemon
│   ├── test-sidecar.sh             # Test du sidecar Python
│   ├── test-update-prod.sh         # Test des mises à jour en production
│   └── test-updater.sh             # Test du système de mise à jour
│
├── daemon/             # Scripts de gestion du daemon
│   ├── check-daemon.sh             # Vérification de l'état du daemon
│   └── kill-daemon.sh               # Arrêt du daemon
│
└── utils/              # Scripts utilitaires
    ├── serve-updates.sh             # Serveur local pour tester les mises à jour
    └── remove-black-background.py  # Utilitaire de traitement d'images
```

## Utilisation

### Build

```bash
# Build sidecar
yarn build:sidecar-macos
yarn build:sidecar-linux

# Build avec version develop
yarn build:sidecar-macos:develop

# Build mises à jour
yarn build:update:dev
yarn build:update:prod
```

### Signature (macOS)

```bash
# Configuration locale
source scripts/signing/setup-apple-signing.sh

# Préparation secrets GitHub
bash scripts/signing/prepare-github-secrets.sh

# Signature manuelle
bash scripts/signing/sign-all-binaries.sh "path/to/app" "Developer ID Application: ..."
```

### Tests

```bash
# Tests individuels
yarn test:sidecar
yarn test:app
yarn test:updater

# Tous les tests
yarn test:all
```

### Daemon

```bash
# Vérifier l'état
yarn check-daemon

# Arrêter le daemon
yarn kill-daemon
```

### Utilitaires

```bash
# Servir les mises à jour localement
yarn serve:updates
```

## Notes

- Tous les scripts sont exécutables et peuvent être appelés directement
- Les scripts utilisent des chemins relatifs depuis la racine du projet
- Les scripts de test nécessitent parfois des prérequis (sidecar buildé, etc.)

