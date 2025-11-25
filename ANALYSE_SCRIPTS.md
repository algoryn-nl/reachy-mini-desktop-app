# 📋 Analyse des Scripts - Dossier `scripts/`

**Date:** $(date)  
**Dossier analysé:** `scripts/`

---

## 📊 Résumé

Le dossier `scripts/` contient **11 scripts** au total :
- ✅ **6 scripts actifs** (référencés dans `package.json`)
- ⚠️ **5 scripts utilitaires** (non référencés mais potentiellement utiles)

---

## ✅ Scripts Actifs (Référencés dans package.json)

### 1. `build-update.sh` ✅ **ACTIF**
- **Usage:** `yarn build:update:dev` ou `yarn build:update:prod`
- **Description:** Build et signature des fichiers de mise à jour
- **Fonctionnalités:**
  - Build l'application (debug ou release)
  - Crée l'archive (tar.gz pour macOS, MSI pour Windows, AppImage pour Linux)
  - Signe le bundle avec `tauri signer`
  - Génère les métadonnées JSON pour les mises à jour
- **Statut:** ✅ **UTILISÉ** - Essentiel pour le système de mise à jour

### 2. `serve-updates.sh` ✅ **ACTIF**
- **Usage:** `yarn serve:updates`
- **Description:** Serveur HTTP local pour tester les mises à jour
- **Fonctionnalités:**
  - Lance un serveur Python HTTP sur le port 8080 (par défaut)
  - Sert les fichiers depuis `test-updates/`
- **Statut:** ✅ **UTILISÉ** - Utile pour tester les mises à jour en local

### 3. `test-sidecar.sh` ✅ **ACTIF**
- **Usage:** `yarn test:sidecar`
- **Description:** Test du sidecar daemon embarqué
- **Fonctionnalités:**
  - Build le sidecar
  - Vérifie les fichiers
  - Test le lancement du daemon
- **Statut:** ✅ **UTILISÉ** - Partie de la suite de tests

### 4. `test-app.sh` ✅ **ACTIF**
- **Usage:** `yarn test:app`
- **Description:** Test de l'application complète
- **Fonctionnalités:**
  - Vérifie le sidecar
  - Build l'app en mode debug
  - Test le lancement
- **Statut:** ✅ **UTILISÉ** - Partie de la suite de tests

### 5. `test-updater.sh` ✅ **ACTIF**
- **Usage:** `yarn test:updater`
- **Description:** Test du système de mise à jour
- **Fonctionnalités:**
  - Vérifie la configuration updater
  - Test la détection de mises à jour
- **Statut:** ✅ **UTILISÉ** - Partie de la suite de tests

### 6. `test-update-prod.sh` ✅ **ACTIF**
- **Usage:** `yarn test:update-prod`
- **Description:** Test des mises à jour en production
- **Statut:** ✅ **UTILISÉ** - Partie de la suite de tests

---

## ⚠️ Scripts Utilitaires (Non référencés dans package.json)

### 7. `test-daemon-develop.sh` ⚠️ **UTILITAIRE**
- **Usage:** `bash scripts/test-daemon-develop.sh`
- **Description:** Script standalone pour tester l'installation et le lancement du daemon depuis la branche `develop`
- **Fonctionnalités:**
  - Nettoie les anciens daemons
  - Build le sidecar avec `REACHY_MINI_SOURCE=develop`
  - Vérifie la version installée
  - Lance le daemon et teste les endpoints
- **Statut:** ⚠️ **UTILE** - Script de développement pour tester la branche develop
- **Recommandation:** ✅ **GARDER** - Utile pour les développeurs


### 8. `remove-black-background.py` ⚠️ **UTILITAIRE**
- **Usage:** `python3 scripts/remove-black-background.py <image.png> [seuil]`
- **Description:** Script Python pour rendre transparent le fond noir autour des stickers PNG
- **Fonctionnalités:**
  - Utilise un algorithme de flood fill depuis les bords
  - Préserve les pixels noirs à l'intérieur des formes
  - Traite un fichier ou un répertoire entier
  - Crée des sauvegardes automatiques
- **Statut:** ⚠️ **UTILE** - Script de traitement d'images pour les assets
- **Recommandation:** ✅ **GARDER** - Utile pour la préparation des assets (stickers Reachy)

### 9. `setup-apple-signing.sh` ⚠️ **UTILITAIRE**
- **Usage:** `source scripts/setup-apple-signing.sh`
- **Description:** Script pour configurer les variables d'environnement Apple Code Signing
- **Fonctionnalités:**
  - Détecte automatiquement l'identité et le Team ID depuis le certificat
  - Encode le certificat en base64
  - Exporte les variables d'environnement nécessaires
  - Sécurisé (ne logge pas les secrets)
- **Statut:** ⚠️ **UTILE** - Essentiel pour signer l'app sur macOS
- **Recommandation:** ✅ **GARDER** - Nécessaire pour le build production macOS

### 10. `sign-all-binaries.sh` ⚠️ **UTILITAIRE**
- **Usage:** `./scripts/sign-all-binaries.sh <path-to-app-bundle> <signing-identity>`
- **Description:** Script pour signer tous les binaires dans l'app bundle macOS avant la notarisation
- **Fonctionnalités:**
  - Signe récursivement tous les binaires Mach-O
  - Signe les binaires dans Resources (uvx, uv, etc.)
  - Signe les bibliothèques Python (.so, .dylib) dans .venv
  - Signe les binaires dans cpython-*
  - Signe l'app bundle principal avec --deep
- **Statut:** ⚠️ **UTILE** - Nécessaire pour la notarisation macOS
- **Recommandation:** ✅ **GARDER** - Essentiel pour le build production macOS

### 11. `prepare-github-secrets.sh` ⚠️ **UTILITAIRE**
- **Usage:** `bash scripts/prepare-github-secrets.sh [MOT_DE_PASSE]`
- **Description:** Script pour préparer les valeurs des secrets GitHub Actions
- **Fonctionnalités:**
  - Encode le certificat en base64
  - Détecte l'identité et le Team ID
  - Affiche les valeurs à copier dans GitHub Secrets
  - Supporte .p12 et .cer
- **Statut:** ⚠️ **UTILE** - Utile pour configurer CI/CD
- **Recommandation:** ✅ **GARDER** - Utile pour la configuration GitHub Actions

---

## 📝 Recommandations

### ✅ Scripts à GARDER (Tous)

Tous les scripts sont utiles, mais certains pourraient être améliorés :


2. **Documentation** :
   - 💡 Ajouter une section dans le README pour documenter les scripts utilitaires
   - 💡 Ajouter des commentaires dans les scripts pour expliquer leur usage

3. **Organisation** :
   - 💡 Considérer créer des sous-dossiers :
     - `scripts/build/` - Scripts de build
     - `scripts/test/` - Scripts de test
     - `scripts/utils/` - Scripts utilitaires
     - `scripts/signing/` - Scripts de signature

### 🗑️ Scripts OBSOLÈTES

**Aucun script n'est obsolète** - Tous ont une utilité :
- Les scripts actifs sont utilisés dans `package.json`
- Les scripts utilitaires sont utiles pour le développement, le build, et le debugging

---

## 📊 Tableau Récapitulatif

| Script | Référencé dans package.json | Type | Statut | Action |
|--------|---------------------------|------|--------|--------|
| `build-update.sh` | ✅ Oui | Build | ✅ Actif | GARDER |
| `serve-updates.sh` | ✅ Oui | Test | ✅ Actif | GARDER |
| `test-sidecar.sh` | ✅ Oui | Test | ✅ Actif | GARDER |
| `test-app.sh` | ✅ Oui | Test | ✅ Actif | GARDER |
| `test-updater.sh` | ✅ Oui | Test | ✅ Actif | GARDER |
| `test-update-prod.sh` | ✅ Oui | Test | ✅ Actif | GARDER |
| `test-daemon-develop.sh` | ❌ Non | Dev | ⚠️ Utile | GARDER |
| `remove-black-background.py` | ❌ Non | Asset | ⚠️ Utile | GARDER |
| `setup-apple-signing.sh` | ❌ Non | Build | ⚠️ Utile | GARDER |
| `sign-all-binaries.sh` | ❌ Non | Build | ⚠️ Utile | GARDER |
| `prepare-github-secrets.sh` | ❌ Non | CI/CD | ⚠️ Utile | GARDER |

---

## 🎯 Conclusion

**Aucun script n'est obsolète.** Tous les scripts ont une utilité :
- Les **6 scripts actifs** sont essentiels pour le workflow de développement
- Les **5 scripts utilitaires** sont utiles pour le développement, le build, et le debugging
- **2 scripts supprimés** : `fix-network-permissions.sh` et `pre-approve-permissions.sh` (non utilisés nulle part)

**Recommandations principales :**
1. ✅ **GARDER tous les scripts** (les scripts de permissions ont été supprimés car inutilisés)
2. 💡 **Documenter** les scripts utilitaires dans le README
3. 💡 **Organiser** les scripts en sous-dossiers si le nombre augmente

---

**Rapport généré le :** $(date)

