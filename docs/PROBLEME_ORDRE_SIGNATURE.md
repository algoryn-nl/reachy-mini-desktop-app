# ⚠️ Problème d'Ordre des Signatures

## 🔴 Problème Identifié

Il y a effectivement un **problème d'ordre** avec `tauri-action` et votre signing récursif personnalisé.

---

## 📋 Ordre Actuel (Votre Méthode)

```yaml
1. Build Tauri (sans signing)
   └─ Bundle créé mais non signé

2. Sign all binaries (codesign récursif)
   └─ Signe tous les binaires internes (.venv, cpython, etc.)
   └─ Signe le bundle principal avec --deep

3. Build update files (minisign)
   └─ Signe le bundle COMPLET avec minisign
   └─ Génère update.json avec signature minisign
```

**✅ Ordre correct** : Le bundle est complètement signé (codesign) AVANT d'être signé pour l'updater (minisign).

---

## ⚠️ Ordre avec tauri-action (Problématique)

```yaml
1. Build Tauri (tauri-action)
   └─ Bundle créé mais non signé (signingIdentity: "-")

2. tauri-action génère latest.json
   └─ Signe le bundle avec minisign
   └─ ⚠️ PROBLÈME : Bundle pas encore signé avec codesign !

3. Sign all binaries (codesign récursif)
   └─ Signe tous les binaires internes
   └─ Signe le bundle principal avec --deep
   └─ ⚠️ PROBLÈME : Modifie le bundle après signature minisign !
```

**❌ Ordre incorrect** : Le bundle est signé avec minisign AVANT d'être signé avec codesign, puis codesign modifie le bundle.

---

## 🔍 Pourquoi c'est un problème

### 1. Signature minisign

**Ce que minisign signe** :
- Le **contenu du fichier** (hash du bundle complet)
- Si le fichier change → signature invalide

**Ce que codesign fait** :
- Modifie les **métadonnées** du bundle (signatures internes)
- Ajoute des signatures aux binaires internes
- Utilise `--deep` qui modifie le bundle principal

**Résultat** : 
- ✅ Le **contenu fonctionnel** ne change pas
- ❌ Les **métadonnées** changent (signatures codesign)
- ❌ Le **hash du fichier** change
- ❌ La **signature minisign devient invalide** !

### 2. Vérification pratique

```bash
# Avant codesign
$ minisign -V -p public.key -m bundle.app.tar.gz -x bundle.app.tar.gz.sig
✅ Signature valid

# Après codesign --deep
$ minisign -V -p public.key -m bundle.app.tar.gz -x bundle.app.tar.gz.sig
❌ Signature invalid (file was modified)
```

---

## ✅ Solutions

### Solution 1 : Re-signer après codesign (Recommandé)

**Ordre corrigé** :
```yaml
1. Build Tauri (tauri-action, sans latest.json)
   └─ Désactiver uploadUpdaterJson temporairement

2. Sign all binaries (codesign récursif)
   └─ Signe tous les binaires

3. Re-signer le bundle avec minisign
   └─ Signe le bundle COMPLET (après codesign)
   └─ Génère latest.json manuellement
```

**Workflow** :
```yaml
- uses: tauri-apps/tauri-action@v1
  with:
    tagName: v${{ steps.version.outputs.version }}
    uploadUpdaterJson: false  # ⚠️ Désactiver temporairement
    args: ${{ matrix.args }}

- name: Sign all binaries
  run: bash scripts/signing/sign-all-binaries.sh ...

- name: Re-sign bundle for updater
  run: |
    # Trouver le bundle final
    BUNDLE_FILE="..."
    
    # Signer avec minisign
    yarn tauri signer sign -f ~/.tauri/reachy-mini.key "$BUNDLE_FILE"
    
    # Générer latest.json manuellement
    # (ou utiliser tauri-latest-json crate)

- name: Upload latest.json
  uses: softprops/action-gh-release@v1
  with:
    files: latest.json
```

**Avantages** :
- ✅ Ordre correct
- ✅ Signature minisign valide
- ✅ Garde tauri-action pour le build

**Inconvénients** :
- ⚠️ Doit générer latest.json manuellement
- ⚠️ Perd l'automatisation de tauri-action pour latest.json

---

### Solution 2 : Utiliser tauri-action uniquement pour build

**Ordre** :
```yaml
1. Build Tauri (tauri-action, sans latest.json)
   └─ uploadUpdaterJson: false

2. Sign all binaries (codesign récursif)

3. Notarize

4. Générer latest.json manuellement (votre script actuel)
   └─ Utilise build-update.sh qui signe avec minisign
```

**Workflow** :
```yaml
- uses: tauri-apps/tauri-action@v1
  with:
    tagName: v${{ steps.version.outputs.version }}
    uploadUpdaterJson: false  # Pas de latest.json automatique
    args: ${{ matrix.args }}

- name: Sign all binaries
  run: bash scripts/signing/sign-all-binaries.sh ...

- name: Notarize
  run: ...

- name: Build update files
  run: bash ./scripts/build/build-update.sh prod "$VERSION"
  # Ce script signe avec minisign APRÈS codesign

- name: Upload latest.json
  uses: softprops/action-gh-release@v1
  with:
    files: latest.json
```

**Avantages** :
- ✅ Ordre correct
- ✅ Garde votre script build-update.sh
- ✅ Pas de problème de signature

**Inconvénients** :
- ⚠️ Perd l'automatisation latest.json de tauri-action
- ⚠️ Doit garder build-update.sh

---

### Solution 3 : Utiliser tauri-action après codesign (Complexe)

**Ordre** :
```yaml
1. Build Tauri (sans tauri-action, manuel)
   └─ yarn tauri build

2. Sign all binaries (codesign récursif)

3. Utiliser tauri-action pour latest.json uniquement
   └─ Mais tauri-action fait aussi le build...
```

**Problème** : tauri-action fait le build, donc pas vraiment possible.

---

## 🎯 Recommandation : Solution 2

**Pourquoi** :
1. ✅ Vous gardez votre processus de signing récursif
2. ✅ Ordre correct garanti
3. ✅ Pas de problème de signature
4. ✅ Vous gardez votre script build-update.sh (qui fonctionne)
5. ✅ Simplifie quand même le workflow (pas besoin de fusionner update.json)

**Workflow final** :
```yaml
jobs:
  build-and-release:
    steps:
      - name: Build sidecar
        run: bash ./scripts/build/build-sidecar-unix.sh
      
      - uses: tauri-apps/tauri-action@v1
        with:
          tagName: v${{ steps.version.outputs.version }}
          uploadUpdaterJson: false  # ⚠️ Important !
          args: ${{ matrix.args }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Sign all binaries (macOS)
        if: matrix.os == 'macos-latest'
        run: bash scripts/signing/sign-all-binaries.sh ...
      
      - name: Notarize (macOS)
        if: matrix.os == 'macos-latest'
        run: ...
      
      - name: Build update files
        run: |
          bash ./scripts/build/build-update.sh prod "${{ steps.version.outputs.version }}"
      
      - name: Upload latest.json
        uses: softprops/action-gh-release@v1
        with:
          files: latest.json
```

**Gain** :
- ✅ Simplifie le build (tauri-action)
- ✅ Garde votre processus de signing
- ✅ Pas de problème d'ordre
- ⚠️ Mais garde build-update.sh (mais c'est OK, il fonctionne)

---

## 📊 Comparaison des Solutions

| Solution | Ordre correct | Automatisation latest.json | Complexité |
|----------|---------------|----------------------------|------------|
| **Solution 1** | ✅ | ❌ (manuel) | Moyenne |
| **Solution 2** | ✅ | ❌ (manuel avec script) | Faible |
| **Solution 3** | ✅ | ✅ | ❌ Impossible |

---

## ✅ Conclusion

**Oui, il y a un problème d'ordre !**

**Recommandation** :
- Utiliser `tauri-action` pour le **build uniquement** (`uploadUpdaterJson: false`)
- Garder votre **signing récursif** après
- Garder votre **script build-update.sh** pour générer latest.json (après codesign)

**Gain** : Simplifie le build, garde votre contrôle sur le signing, pas de problème d'ordre.

