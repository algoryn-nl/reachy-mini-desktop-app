# Analyse et Recommandations - Workflow Cross-Platform avec Mise à Jour

## 📋 Objectif
Créer un workflow GitHub Actions cross-platform (macOS/Windows) avec système de mise à jour automatique.

## 🔍 Analyse de tauri-action

### Ce que fait tauri-action
- ✅ Build automatique de l'application Tauri
- ✅ Création automatique de release GitHub
- ✅ Upload des artifacts sur la release
- ✅ Gestion des tags/versions
- ✅ Support multi-plateformes (macOS, Windows, Linux)
- ✅ Support de la signature de code (via variables d'environnement)

### Ce que tauri-action NE fait PAS
- ❌ Ne gère PAS le système de mise à jour Tauri (latest.json, signatures)
- ❌ Ne build PAS le sidecar avant le build Tauri
- ❌ Ne crée PAS les fichiers update.json par plateforme
- ❌ Ne merge PAS les update.json en latest.json

## 🎯 Solution Recommandée

### Option A : Workflow Hybride (Recommandé)
**Utiliser tauri-action pour le build/release + étapes custom pour l'updater**

**Avantages :**
- Simplifie le build et les releases
- Garde le contrôle sur le système de mise à jour
- Compatible avec le build du sidecar

**Structure :**
1. Build sidecar
2. Utiliser tauri-action pour build + release
3. Post-processing : créer latest.json et signer les updates

### Option B : Workflow Custom Complet (Actuel amélioré)
**Garder le workflow actuel mais l'améliorer**

**Avantages :**
- Contrôle total sur toutes les étapes
- Déjà fonctionnel avec le système de mise à jour

**Inconvénients :**
- Plus de code à maintenir
- Pas conforme à la doc Tauri (qui recommande tauri-action)

## 📝 Recommandation Finale

**Option A - Workflow Hybride** car :
1. Conforme aux recommandations Tauri (utilise tauri-action)
2. Garde le système de mise à jour fonctionnel
3. Simplifie le code tout en gardant la flexibilité
4. Facilite la maintenance

## 🔧 Implémentation Proposée

### Workflow Unifié : `release.yml`

**Jobs :**
1. **build-and-release** (matrice macOS/Windows)
   - Build sidecar
   - Setup signature Apple (macOS uniquement)
   - Utiliser tauri-action pour build + release
   - Post-processing : créer update.json et signer

2. **create-update-manifest** (après tous les builds)
   - Télécharger tous les artifacts
   - Créer latest.json multi-plateformes
   - Upload latest.json sur la release

### Points Clés

**Signature Apple (macOS) :**
- Variables d'environnement : `APPLE_CERTIFICATE`, `APPLE_SIGNING_IDENTITY`, etc.
- tauri-action les utilise automatiquement si définies

**Système de Mise à Jour :**
- Créer `update.json` par plateforme après le build
- Signer les bundles avec `tauri signer`
- Merger en `latest.json` dans un job séparé
- Upload `latest.json` sur la release GitHub

**Build Sidecar :**
- Étape avant tauri-action
- Utiliser `TARGET_TRIPLET` pour cross-compilation

## 📦 Structure du Workflow

```yaml
name: Release

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build-and-release:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin
            platform: darwin-aarch64
          - os: macos-latest  
            target: x86_64-apple-darwin
            platform: darwin-x86_64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            platform: windows-x86_64
    
    steps:
      - Checkout
      - Setup Node.js/Rust
      - Build sidecar
      - Setup Apple signing (macOS only)
      - Use tauri-action for build + release
      - Build update files (update.json + signatures)
      - Upload update artifacts

  create-update-manifest:
    needs: build-and-release
    steps:
      - Download all artifacts
      - Merge update.json → latest.json
      - Upload latest.json to release
```

## ✅ Checklist de Migration

- [ ] Créer nouveau workflow basé sur tauri-action
- [ ] Intégrer build sidecar avant tauri-action
- [ ] Configurer signature Apple pour macOS
- [ ] Ajouter post-processing pour update.json
- [ ] Tester sur macOS (ARM + Intel)
- [ ] Tester sur Windows
- [ ] Vérifier que latest.json est créé correctement
- [ ] Vérifier que les signatures fonctionnent
- [ ] Supprimer ancien workflow build.yml (redondant)

## 🚀 Prochaines Étapes

1. Créer le nouveau workflow `release-unified.yml`
2. Tester en local d'abord
3. Tester sur GitHub Actions
4. Migrer progressivement

