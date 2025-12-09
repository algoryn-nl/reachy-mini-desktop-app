# Migration vers tauri-action : Ce qui change

## ✅ Réponse courte : Presque uniquement le workflow YAML !

Oui, en grande partie **seul le workflow GitHub Actions change**. Voici le détail :

---

## 📝 Fichiers à modifier

### 1. `.github/workflows/release-unified.yml` ⚠️ **MODIFIÉ**

**Changements majeurs** :

#### ❌ À supprimer :
```yaml
# Job build-and-release
- name: Build Tauri app
  run: yarn tauri build --target ${{ matrix.target }}

- name: Build update files
  run: bash ./scripts/build/build-update.sh prod "$VERSION"

- name: Upload update artifacts
  uses: actions/upload-artifact@v4
  with:
    name: update-${{ matrix.platform }}

# Job create-update-manifest (ENTIER)
- name: Download all update artifacts
- name: Merge update.json files into latest.json
- name: Upload latest.json to release
```

#### ✅ À ajouter :
```yaml
# Job build-and-release
- uses: tauri-apps/tauri-action@v1
  with:
    tagName: v${{ steps.version.outputs.version }}
    uploadUpdaterJson: true
    args: ${{ matrix.args }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# Job deploy-pages (simplifié)
- name: Download latest.json from release
  run: |
    curl -L "https://github.com/.../releases/download/v$VERSION/latest.json" > docs/latest.json
```

**Réduction** : ~200 lignes → ~50 lignes

---

### 2. `package.json` ⚠️ **OPTIONNEL** (peut rester)

**Scripts à garder** (pour tests locaux) :
```json
{
  "scripts": {
    "build:update:dev": "bash ./scripts/build/build-update.sh dev",
    "build:update:prod": "bash ./scripts/build/build-update.sh prod"
  }
}
```

**Pourquoi garder** :
- Utile pour tester les mises à jour en local
- Pas utilisé par CI/CD si vous migrez vers tauri-action
- Peut être supprimé si vous n'en avez plus besoin

---

### 3. `scripts/build/build-update.sh` ✅ **GARDÉ** (optionnel)

**Statut** : 
- ✅ **Gardé** si vous voulez tester en local (`yarn build:update:dev`)
- ❌ **Supprimé** si vous n'en avez plus besoin

**Recommandation** : Gardez-le pour les tests locaux, mais il ne sera plus utilisé en CI/CD.

---

### 4. `src-tauri/tauri.conf.json` ✅ **AUCUN CHANGEMENT**

**Rien à changer** :
- ✅ `externalBin` reste identique
- ✅ `updater` config reste identique
- ✅ `version` reste identique

---

### 5. `src-tauri/tauri.macos.conf.json` ✅ **AUCUN CHANGEMENT**

**Rien à changer** :
- ✅ `signingIdentity: "-"` reste (désactive signing automatique)
- ✅ `entitlements` reste identique

---

### 6. `scripts/signing/sign-all-binaries.sh` ✅ **GARDÉ**

**Statut** : ✅ **Aucun changement** - toujours utilisé après tauri-action

---

### 7. Autres scripts ✅ **AUCUN CHANGEMENT**

- ✅ `build-sidecar-unix.sh` - toujours utilisé
- ✅ `build-sidecar-windows.ps1` - toujours utilisé
- ✅ Scripts de notarization - toujours utilisés

---

## 📊 Résumé des changements

| Fichier | Action | Raison |
|---------|--------|--------|
| `.github/workflows/release-unified.yml` | ⚠️ **MODIFIÉ** | Remplacement par tauri-action |
| `package.json` | ⚠️ **OPTIONNEL** | Scripts `build:update:*` peuvent rester pour tests |
| `scripts/build/build-update.sh` | ⚠️ **OPTIONNEL** | Gardé pour tests locaux ou supprimé |
| `src-tauri/tauri.conf.json` | ✅ **AUCUN CHANGEMENT** | Compatible tel quel |
| `src-tauri/tauri.macos.conf.json` | ✅ **AUCUN CHANGEMENT** | Compatible tel quel |
| `scripts/signing/sign-all-binaries.sh` | ✅ **AUCUN CHANGEMENT** | Toujours utilisé |
| `scripts/build/build-sidecar-*.sh` | ✅ **AUCUN CHANGEMENT** | Toujours utilisé |

---

## 🔄 Workflow avant/après

### Avant (votre méthode actuelle)

```yaml
jobs:
  build-and-release:
    steps:
      - name: Build sidecar
        run: bash ./scripts/build/build-sidecar-unix.sh
      
      - name: Build Tauri app
        run: yarn tauri build --target ${{ matrix.target }}
      
      - name: Sign all binaries
        run: bash scripts/signing/sign-all-binaries.sh ...
      
      - name: Notarize
        run: ...
      
      - name: Build update files
        run: bash ./scripts/build/build-update.sh prod "$VERSION"
      
      - name: Upload update artifacts
        uses: actions/upload-artifact@v4
  
  create-update-manifest:
    steps:
      - name: Download all update artifacts
        uses: actions/download-artifact@v4
      
      - name: Merge update.json files
        run: |
          # 50 lignes de jq pour fusionner
      
      - name: Upload latest.json
        uses: softprops/action-gh-release@v1
      
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

### Après (avec tauri-action)

```yaml
jobs:
  build-and-release:
    steps:
      - name: Build sidecar
        run: bash ./scripts/build/build-sidecar-unix.sh
      
      - uses: tauri-apps/tauri-action@v1
        with:
          tagName: v${{ steps.version.outputs.version }}
          uploadUpdaterJson: true
          args: ${{ matrix.args }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Sign all binaries
        run: bash scripts/signing/sign-all-binaries.sh ...
      
      - name: Notarize
        run: ...
  
  deploy-pages:
    steps:
      - name: Download latest.json from release
        run: |
          curl -L "https://github.com/.../releases/download/v$VERSION/latest.json" > docs/latest.json
      
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

**Réduction** : ~250 lignes → ~80 lignes

---

## 🗑️ Fichiers qui peuvent être supprimés (optionnel)

### Si vous n'avez plus besoin de tests locaux :

1. **`scripts/build/build-update.sh`** (666 lignes)
   - ❌ Supprimé si vous n'utilisez plus `yarn build:update:dev`
   - ✅ Gardé si vous voulez tester en local

2. **Scripts `package.json`** :
   ```json
   "build:update:dev": "...",
   "build:update:prod": "..."
   ```
   - ❌ Supprimés si vous supprimez le script
   - ✅ Gardés si vous gardez le script

---

## ✅ Fichiers qui DOIVENT rester

1. ✅ **`scripts/build/build-sidecar-unix.sh`** - Toujours utilisé
2. ✅ **`scripts/build/build-sidecar-windows.ps1`** - Toujours utilisé
3. ✅ **`scripts/signing/sign-all-binaries.sh`** - Toujours utilisé
4. ✅ **Scripts de notarization** - Toujours utilisés
5. ✅ **Tous les fichiers de config Tauri** - Aucun changement

---

## 📋 Checklist de migration

### Étape 1 : Modifier le workflow
- [ ] Remplacer `Build Tauri app` par `tauri-action`
- [ ] Supprimer `Build update files`
- [ ] Supprimer `Upload update artifacts`
- [ ] Supprimer le job `create-update-manifest` (ou simplifier)
- [ ] Ajouter step pour télécharger `latest.json` depuis release (pour GitHub Pages)

### Étape 2 : Tester
- [ ] Tester le build sur une branche de test
- [ ] Vérifier que `latest.json` est généré
- [ ] Vérifier que `latest.json` est uploadé à la release
- [ ] Vérifier que GitHub Pages fonctionne

### Étape 3 : Nettoyage (optionnel)
- [ ] Décider si vous gardez `build-update.sh` pour tests locaux
- [ ] Si non, supprimer le script et les commandes `package.json`

---

## 🎯 Résumé final

### Ce qui change :
1. ⚠️ **`.github/workflows/release-unified.yml`** - Modifications majeures
2. ⚠️ **`package.json`** - Optionnel (scripts de test)
3. ⚠️ **`scripts/build/build-update.sh`** - Optionnel (peut être supprimé)

### Ce qui ne change PAS :
1. ✅ Tous les fichiers de config Tauri
2. ✅ Scripts de build de sidecar
3. ✅ Scripts de signing
4. ✅ Scripts de notarization
5. ✅ Structure du projet

**Conclusion** : En pratique, **seul le workflow YAML change vraiment**. Tout le reste peut rester identique ou être supprimé optionnellement.

