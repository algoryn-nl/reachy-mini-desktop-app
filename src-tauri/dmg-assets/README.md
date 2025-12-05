# 🎨 Guide pour créer l'image de fond du DMG

## Dimensions de l'image

- **Taille de base** : 800×600 px (pour écrans standard)
- **Taille Retina (recommandée)** : 1600×1200 px (pour écrans Retina, meilleure qualité)
- **Format** : PNG (avec transparence possible)
- **Résolution** : 72 DPI (le script détecte automatiquement la taille et ajuste la fenêtre)

**Note** : Le script détecte automatiquement la résolution de l'image et ajuste la taille de la fenêtre. Pour une meilleure qualité sur les écrans Retina, utilisez une image 2x (1600×1200 px). macOS utilisera automatiquement la bonne résolution selon l'écran.

## Système de coordonnées

**Important** : macOS utilise un système de coordonnées depuis le **bas gauche** de la fenêtre.

### Conversion pour ton image

Quand tu crées ton image dans un éditeur (Photoshop, Figma, etc.), tu penses depuis le **haut gauche** (0,0 en haut).

**Pour convertir les coordonnées macOS vers ton image :**

- **macOS** : (0,0) = bas gauche
- **Ton image** : (0,0) = haut gauche

**Formule de conversion :**
```
Image Y = Hauteur de l'image - macOS Y
```

### Positions standard pour les icônes

**Pour une image 800×600 px (standard)** :
- **Icône de l'app** :
  - Position dans ton image (haut gauche) : **x=200, y=236**
  - Coordonnées macOS (bas gauche) : x=200, y=236
  - L'icône est centrée verticalement (128px de haut)

- **Lien Applications** :
  - Position dans ton image (haut gauche) : **x=550, y=236**
  - Coordonnées macOS (bas gauche) : x=550, y=236
  - L'icône est centrée verticalement (128px de haut)

**Pour une image 1600×1200 px (Retina 2x, meilleure qualité)** :
- **Icône de l'app** :
  - Position dans ton image (haut gauche) : **x=400, y=472**
  - Le script utilisera une fenêtre de 800×600 points, icônes à x=200, y=236

- **Lien Applications** :
  - Position dans ton image (haut gauche) : **x=1100, y=472**
  - Le script utilisera une fenêtre de 800×600 points, icônes à x=550, y=236

**Pour une image 2400×1800 px (Retina 3x, qualité maximale)** :
- **Icône de l'app** :
  - Position dans ton image (haut gauche) : **x=600, y=708**
  - Le script utilisera une fenêtre de 800×600 points, icônes à x=200, y=236

- **Lien Applications** :
  - Position dans ton image (haut gauche) : **x=1650, y=708**
  - Le script utilisera une fenêtre de 800×600 points, icônes à x=550, y=236

## Guide visuel pour créer l'image (800×600 px)

```
┌─────────────────────────────────────────────────────────┐
│                    (0,0) - Haut gauche                 │
│                                                          │
│                                                          │
│  [App]                    [Applications]                │
│  x=200                    x=550                         │
│  y=236                    y=236                         │
│  (depuis haut)            (depuis haut)                  │
│  (icône 128×128)          (icône 128×128)                │
│                                                          │
│                                                          │
│                                                          │
│                    (800,600) - Bas droite               │
└─────────────────────────────────────────────────────────┘
```

## Tailles des icônes

- **Taille d'affichage** : 128×128 px (points)
- **Espacement recommandé** : ~20–30 px entre les icônes
- **Marge depuis les bords** : ~50 px

## Conseils pour créer l'image

1. **Crée une image** dans ton éditeur :
   - **800×600 px** pour standard (ou **1600×1200 px** pour Retina, meilleure qualité)
2. **Place des guides visuels** aux positions standard :
   - **App** : x=200, y=236 (depuis le haut gauche) pour 800×600
   - **Applications** : x=550, y=236 (depuis le haut gauche) pour 800×600
   - Pour 1600×1200 : multiplie par 2 (x=400, y=472)
3. **Ajoute une flèche ou instructions** entre les deux (optionnel)
4. **Laisse de la marge** sur les bords (50 px minimum)
5. **Exporte en PNG** : `background.png`
6. **Le script détecte automatiquement** la taille et ajuste tout !

## Test

Une fois l'image créée, teste avec :
```bash
./scripts/build/customize-dmg.sh \
  "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Reachy Mini Control.app" \
  "test-dmg.dmg" \
  "src-tauri/dmg-assets/background.png"
```

Si les positions ne sont pas parfaites, ajuste les valeurs `x` et `y` dans `scripts/build/customize-dmg.sh`.

