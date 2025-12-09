# Compatibilité Sidecar + Signing Personnalisé avec tauri-action

## ✅ Réponse courte : OUI, c'est compatible !

Votre setup avec sidecar signé est **parfaitement compatible** avec `tauri-action`. Voici pourquoi et comment.

---

## 🔍 Votre Setup Actuel

### 1. Sidecar (`uv-trampoline`)

**Configuration** :
```json
{
  "bundle": {
    "externalBin": ["binaries/uv-trampoline"]
  }
}
```

**Build** :
- Script `build-sidecar-unix.sh` compile le sidecar AVANT le build Tauri
- Place le binaire dans `src-tauri/binaries/uv-trampoline-<triplet>`

**Signing** :
- Tauri signe automatiquement les sidecars déclarés dans `externalBin`
- Votre script `sign-all-binaries.sh` signe aussi récursivement

### 2. Signing Personnalisé

**Configuration** :
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "-"  // Désactive signing automatique de Tauri
    }
  }
}
```

**Processus** :
1. Build Tauri SANS signing automatique (`signingIdentity: "-"`)
2. Script `sign-all-binaries.sh` signe récursivement :
   - Sidecar `uv-trampoline`
   - Tous les binaires dans `.venv` (445+ binaires)
   - Tous les `.dylib` et `.so`
   - Binaires dans `cpython-*`
   - `uv` et `uvx`
3. Notarization

---

## ✅ Compatibilité avec tauri-action

### Ce qui fonctionne automatiquement

1. **Build du sidecar** ✅
   - Vous pouvez builder le sidecar AVANT `tauri-action`
   - `tauri-action` détecte et inclut automatiquement les sidecars dans `externalBin`

2. **Inclusion du sidecar** ✅
   - Tauri inclut automatiquement les binaires listés dans `externalBin`
   - Pas besoin de configuration spéciale

3. **Génération de latest.json** ✅
   - `tauri-action` génère le `latest.json` même avec des sidecars
   - Le sidecar est inclus dans le bundle, donc signé avec le bundle

### Ce qui nécessite des steps supplémentaires

1. **Signing récursif personnalisé** ⚠️
   - `tauri-action` ne fait PAS le signing récursif de tous les binaires Python
   - Vous devez ajouter un step APRÈS le build pour appeler `sign-all-binaries.sh`

2. **Notarization** ⚠️
   - `tauri-action` ne fait PAS la notarization
   - Vous devez garder votre step de notarization

---

## 🚀 Architecture avec tauri-action

### Workflow hybride (recommandé)

```yaml
jobs:
  build-and-release:
    steps:
      # 1. Build sidecar (AVANT tauri-action)
      - name: Build sidecar
        run: |
          TARGET_TRIPLET=${{ matrix.target }} \
          bash ./scripts/build/build-sidecar-unix.sh
      
      # 2. tauri-action fait le build + génère latest.json
      - uses: tauri-apps/tauri-action@v1
        with:
          tagName: v${{ steps.version.outputs.version }}
          uploadUpdaterJson: true
          args: ${{ matrix.args }}
        # ⚠️ IMPORTANT: Ne pas activer le signing automatique
        # Car vous avez signingIdentity: "-" dans tauri.macos.conf.json
      
      # 3. Signing récursif personnalisé (macOS uniquement)
      - name: Sign all binaries
        if: matrix.os == 'macos-latest'
        run: |
          bash scripts/signing/sign-all-binaries.sh \
            "src-tauri/target/${{ matrix.target }}/release/bundle/macos/Reachy Mini Control.app" \
            "${{ secrets.APPLE_SIGNING_IDENTITY }}"
      
      # 4. Notarization (macOS uniquement)
      - name: Notarize app
        if: matrix.os == 'macos-latest'
        run: |
          # Votre script de notarization existant
      
      # 5. Upload latest.json à GitHub Release
      # (tauri-action l'a déjà fait, mais vous pouvez le re-upload si besoin)
```

---

## ⚠️ Points d'attention

### 1. Signing automatique de Tauri

**Problème** : `tauri-action` peut essayer de signer automatiquement si vous avez des variables d'environnement Apple configurées.

**Solution** : 
- Gardez `signingIdentity: "-"` dans `tauri.macos.conf.json` ✅ (vous l'avez déjà)
- Ne passez PAS `APPLE_SIGNING_IDENTITY` à `tauri-action`
- Configurez le signing APRÈS le build avec votre script

### 2. Ordre des opérations

**Important** : L'ordre doit être :
1. ✅ Build sidecar
2. ✅ Build Tauri (tauri-action)
3. ✅ Signing récursif (votre script)
4. ✅ Notarization
5. ✅ Upload latest.json (déjà fait par tauri-action)

### 3. Génération de latest.json

**Question** : Est-ce que `tauri-action` génère le `latest.json` correctement avec votre signing personnalisé ?

**Réponse** : OUI, mais attention :
- `tauri-action` génère le `latest.json` APRÈS le build
- Mais AVANT votre signing récursif
- **Solution** : Soit :
  - Option A : Générer `latest.json` APRÈS le signing (re-upload)
  - Option B : Le signing récursif ne change pas la signature du bundle principal (juste les binaires internes)

**Recommandation** : Option B - le signing récursif ne change pas la signature du bundle pour l'updater, donc `latest.json` généré par `tauri-action` est valide.

---

## 📋 Exemple de Migration Complète

### Avant (votre méthode actuelle)

```yaml
- name: Build Tauri app
  run: yarn tauri build --target ${{ matrix.target }}

- name: Sign all binaries
  run: |
    bash scripts/signing/sign-all-binaries.sh "$APP_BUNDLE" "$SIGNING_IDENTITY"

- name: Build update files
  run: |
    bash ./scripts/build/build-update.sh prod "$VERSION"

- name: Upload update artifacts
  uses: actions/upload-artifact@v4
  with:
    name: update-${{ matrix.platform }}

# Job séparé pour fusionner
- name: Merge update.json files
  run: |
    # 50 lignes de jq...
```

### Après (avec tauri-action)

```yaml
- name: Build sidecar
  run: |
    TARGET_TRIPLET=${{ matrix.target }} \
    bash ./scripts/build/build-sidecar-unix.sh

- uses: tauri-apps/tauri-action@v1
  with:
    tagName: v${{ steps.version.outputs.version }}
    uploadUpdaterJson: true
    args: ${{ matrix.args }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  # ⚠️ Ne pas passer APPLE_SIGNING_IDENTITY ici

- name: Sign all binaries (macOS only)
  if: matrix.os == 'macos-latest'
  run: |
    bash scripts/signing/sign-all-binaries.sh \
      "src-tauri/target/${{ matrix.target }}/release/bundle/macos/Reachy Mini Control.app" \
      "${{ secrets.APPLE_SIGNING_IDENTITY }}"

- name: Notarize app (macOS only)
  if: matrix.os == 'macos-latest'
  run: |
    # Votre script de notarization

# ✅ latest.json déjà généré et uploadé par tauri-action !
```

**Réduction** : ~200 lignes → ~30 lignes

---

## 🎯 Avantages de cette approche

### ✅ Vous gardez
- Votre processus de signing récursif personnalisé
- Votre notarization
- Votre build de sidecar
- Votre contrôle total sur le signing

### ✅ Vous gagnez
- Génération automatique de `latest.json` (plus besoin de fusionner)
- Upload automatique à GitHub Release
- Moins de code à maintenir
- Workflow plus simple

### ⚠️ Vous perdez
- Rien de critique ! Vous gardez tout ce qui est important

---

## 🔧 Configuration Détaillée

### 1. Désactiver le signing automatique de tauri-action

```yaml
- uses: tauri-apps/tauri-action@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    # ⚠️ NE PAS passer APPLE_SIGNING_IDENTITY ici
  with:
    tagName: v${{ steps.version.outputs.version }}
    uploadUpdaterJson: true
```

### 2. Vérifier que signingIdentity est "-"

Votre `tauri.macos.conf.json` :
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "-"  // ✅ Déjà configuré
    }
  }
}
```

### 3. Signing après build

```yaml
- name: Sign all binaries
  if: matrix.os == 'macos-latest'
  env:
    APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
    KEYCHAIN_PATH: ${{ env.KEYCHAIN_PATH }}
    KEYCHAIN_PASSWORD: ${{ env.KEYCHAIN_PASSWORD }}
  run: |
    # Déverrouiller le keychain
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
    
    # Signer récursivement
    bash scripts/signing/sign-all-binaries.sh \
      "src-tauri/target/${{ matrix.target }}/release/bundle/macos/Reachy Mini Control.app" \
      "$APPLE_SIGNING_IDENTITY"
```

---

## ❓ Questions Fréquentes

### Q1 : Est-ce que tauri-action signe automatiquement le sidecar ?

**R** : Oui, Tauri signe automatiquement les sidecars dans `externalBin`, MAIS :
- Vous avez `signingIdentity: "-"` qui désactive ça
- Vous faites le signing récursif manuellement après
- C'est parfait pour votre cas d'usage

### Q2 : Est-ce que latest.json est valide après le signing récursif ?

**R** : OUI, car :
- Le signing récursif signe les binaires INTERNES (`.venv`, etc.)
- La signature du BUNDLE PRINCIPAL (pour l'updater) n'est pas affectée
- `latest.json` signe le bundle principal, pas les binaires internes

### Q3 : Puis-je utiliser tauri-action juste pour latest.json ?

**R** : Non, `tauri-action` fait le build aussi. Mais vous pouvez :
- Désactiver le signing automatique (`signingIdentity: "-"`)
- Faire votre signing récursif après
- Utiliser `latest.json` généré par `tauri-action`

### Q4 : Est-ce que ça marche avec Windows/Linux aussi ?

**R** : OUI :
- Windows/Linux n'ont pas besoin de signing récursif
- `tauri-action` fonctionne normalement
- Votre sidecar est inclus automatiquement

---

## ✅ Conclusion

**Votre setup avec sidecar signé est 100% compatible avec `tauri-action` !**

**Recommandation** :
1. ✅ Migrer vers `tauri-action` pour simplifier
2. ✅ Garder votre build de sidecar (avant tauri-action)
3. ✅ Garder votre signing récursif (après tauri-action)
4. ✅ Garder votre notarization
5. ✅ Utiliser `latest.json` généré par `tauri-action`

**Gain** : Réduction massive de la complexité, tout en gardant votre contrôle sur le signing personnalisé.

