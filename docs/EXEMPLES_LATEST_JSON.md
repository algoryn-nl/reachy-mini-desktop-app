# Exemples de fichiers latest.json pour applications Tauri

Ce document compile des exemples de fichiers `latest.json` utilisés par différentes applications Tauri pour le système de mise à jour automatique.

## Votre fichier latest.json actuel

```json
{
  "version": "0.2.37",
  "notes": "Update for version 0.2.37",
  "pub_date": "2025-12-03T19:29:56Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "ZFc1MGNuVnpkR1ZrSUdOdmJXMWxiblE2SUhOcFoyNWhkSFZ5WlNCbWNtOXRJSFJoZFhKcElITmxZM0psZENCclpYa0tVbFZTYkd4eGRqZHhhSEZyUVRCU1RrcEZkM2gxTXk5WFNqaFVja2hCTUdOR1JWbDROM0Z4V0RWMk1EZEJUMk40WTA1blNXOXVUMUJvYlVwYVRsWmpSVkY1ZWxvd1p5dDNURmxZTkVWeE5sUnlSV1E0YUZOT1NtTmpkRTh5YzJaQ2FIZFJQUXAwY25WemRHVmtJR052YlcxbGJuUTZJSFJwYldWemRHRnRjRG94TnpZME56a3dNVGsyQ1dacGJHVTZVbVZoWTJoNUlFMXBibWtnUTI5dWRISnZiRjh3TGpJdU16ZGZlRFkwWDJWdUxWVlRMbTF6YVFwQ1ZUUllTbVJzUTBKaVpXeEJTMjFZZEU1cVZXTnNaRGczWXpWVlZqWjVaR1ptVlRKWmRVdG1WbW80Wm5sTmNVcHpWbm8xY0d4a1NWVkRVM1kwTUVaTFZIUmlNa1YwZUdkUFNIRmFhamRzY0V0RVRFNURRVDA5Q2c9PQ==",
      "url": "https://github.com/pollen-robotics/reachy-mini-desktop-app/releases/download/v0.2.37/Reachy.Mini.Control_0.2.37_x64-setup.msi"
    },
    "darwin-x86_64": {
      "signature": "ZFc1MGNuVnpkR1ZrSUdOdmJXMWxiblE2SUhOcFoyNWhkSFZ5WlNCbWNtOXRJSFJoZFhKcElITmxZM0psZENCclpYa0tVbFZTYkd4eGRqZHhhSEZyUVRNck5FNXFjRXRMVGxKMmJrZ3hPVmRHY1haVlNVNWhiV0k1VkVNMFJVWkpVV28zUTFSMWMycFVSVEZxWWpCSFlWRk5Wbk0zY25GbVoyZE5SVmczWmxsR2MwWndhekUwTWxsWmNWQmphaTl0VTBaWVEzY3dQUXAwY25WemRHVmtJR052YlcxbGJuUTZJSFJwYldWemRHRnRjRG94TnpZME56a3dPRGswQ1dacGJHVTZjbVZoWTJoNUxXMXBibWt0WTI5dWRISnZiRjh3TGpJdU16ZGZaR0Z5ZDJsdUxYZzRObDgyTkM1aGNIQXVkR0Z5TG1kNkNqaHdUSGhEU0ZvdlZFUlBVa1JqUlhJMU9YUmFjVEpsUkUxQ2FIQlhPVVE1WWpkNmIxWkhOWGRFTkZoWVUwRTVTRzFQUldoeE0ydDFWWFJ6VG10UGJ5czFaVWdyU1VzNWQwSkJkbU5SV0UxNE9FVkVURUYzUFQwSw==",
      "url": "https://github.com/pollen-robotics/reachy-mini-desktop-app/releases/download/v0.2.37/Reachy.Mini.Control_0.2.37_x64.zip"
    },
    "linux-x86_64": {
      "signature": "ZFc1MGNuVnpkR1ZrSUdOdmJXMWxiblE2SUhOcFoyNWhkSFZ5WlNCbWNtOXRJSFJoZFhKcElITmxZM0psZENCclpYa0tVbFZTYkd4eGRqZHhhSEZyUVRNcmRuTjNURXh2UnpWYVFUQXphRGhRWjJacU5VMU9OVWx2WnpWUFQyRktNRzVGUlZaV1drUk1VV1pZTTBSdFUxTjZXVTkzU2tJeGVVNXNieXRNYlVSYVprczBabGRDYURFMGFFeFZUVUpxVWpRd05tZHJQUXAwY25WemRHVmtJR052YlcxbGJuUTZJSFJwYldWemRHRnRjRG94TnpZME56ZzVPVGswQ1dacGJHVTZVbVZoWTJoNUlFMXBibWtnUTI5dWRISnZiRjh3TGpJdU16ZGZZVzFrTmpRdVFYQndTVzFoWjJVS00wSlBiMGdyYUhOblFVOXJUbU16TkdZMkt5dGxiRVl6Tnpaa2QxcFdTVGxaTld0T1Z6ZFFiVUZ2YW1wWWRVcHNiekpRU1ZCQ2FDdDNNVWxETUdZdlNGZGhTVmRGT0VGR1lUZHNUMWh0TUZseFRFMUVRMmM5UFFvPQ==",
      "url": "https://github.com/pollen-robotics/reachy-mini-desktop-app/releases/download/v0.2.37/Reachy.Mini.Control_0.2.37_x86_64.AppImage"
    },
    "darwin-aarch64": {
      "signature": "ZFc1MGNuVnpkR1ZrSUdOdmJXMWxiblE2SUhOcFoyNWhkSFZ5WlNCbWNtOXRJSFJoZFhKcElITmxZM0psZENCclpYa0tVbFZTYkd4eGRqZHhhSEZyUVhoaVowczFUekJsVm5wUlZrcG1WMnhKYUZkdWQzUkVValphTm1jeFl6Wm9TVkZyWmtsek1uTXZaMnhwZEVoc1UwbFljMDVyVDBWa1YzWmxkbWxrWWxoSmFuTnRTWGxCZFd0TGFtODRjRXBwZUdJek5VRnJQUXAwY25WemRHVmtJR052YlcxbGJuUTZJSFJwYldWemRHRnRjRG94TnpZME56a3hNelF4Q1dacGJHVTZjbVZoWTJoNUxXMXBibWt0WTI5dWRISnZiRjh3TGpJdU16ZGZaR0Z5ZDJsdUxXRmhjbU5vTmpRdVlYQndMblJoY2k1bmVncGtjR0pWYkhOQ1oxQXhNREpaV2pCSmJIVjJUWGQzU1hwclIwZDBVa05TVmtoa09XTlFVQ3Q1WkRaM1JYbFZZMUZISzBGeWNHUlpjRk5SYzJZd2NEWk5WVXRCYVdaVE1uUkpjVVoyWXk5YWJGUnJWRVJEWnowOUNnPT0=",
      "url": "https://github.com/pollen-robotics/reachy-mini-desktop-app/releases/download/v0.2.37/Reachy.Mini.Control_0.2.37_arm64.zip"
    }
  }
}
```

## Exemple générique de la documentation Tauri

Voici un exemple typique de structure `latest.json` selon la documentation officielle :

```json
{
  "version": "1.0.0",
  "notes": "Initial release",
  "pub_date": "2025-08-19T19:44:22Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "signature_base64",
      "url": "https://example.com/downloads/app_1.0.0_x64_en-US.msi"
    },
    "darwin-x86_64": {
      "signature": "signature_base64",
      "url": "https://example.com/downloads/app_1.0.0_x64_en-US.dmg"
    },
    "linux-x86_64": {
      "signature": "signature_base64",
      "url": "https://example.com/downloads/app_1.0.0_x64_en-US.AppImage"
    }
  }
}
```

## Structure du fichier latest.json

### Champs principaux

- **`version`** : Version de l'application (format semver recommandé)
- **`notes`** : Notes de mise à jour (peut contenir du markdown)
- **`pub_date`** : Date de publication au format ISO 8601 (UTC)
- **`platforms`** : Objet contenant les informations pour chaque plateforme

### Plateformes supportées

Les identifiants de plateformes suivants sont supportés :

- `windows-x86_64` : Windows 64-bit
- `windows-i686` : Windows 32-bit
- `darwin-x86_64` : macOS Intel
- `darwin-aarch64` : macOS Apple Silicon (ARM)
- `linux-x86_64` : Linux 64-bit
- `linux-i686` : Linux 32-bit
- `linux-armv7` : Linux ARMv7
- `linux-aarch64` : Linux ARM64

### Champs par plateforme

Chaque plateforme doit contenir :

- **`signature`** : Signature Base64 du fichier d'installation (générée avec la clé privée Tauri)
- **`url`** : URL complète du fichier d'installation à télécharger

## Projets Tauri avec des fichiers latest.json publics

### Seelen UI
- **URL** : `https://staging.seelen.io/ka/apps/seelen-ui/releases/v1.6.0/latest.json`
- **Note** : Serveur parfois indisponible

### Autres projets à explorer

Pour trouver d'autres exemples, vous pouvez :

1. **Rechercher sur GitHub** :
   - Chercher des projets Tauri populaires
   - Regarder leurs releases GitHub
   - Vérifier s'ils ont un fichier `latest.json` dans leurs releases

2. **Utiliser tauri-action** :
   - Le projet `tauri-action` génère automatiquement des fichiers `latest.json`
   - Voir : https://github.com/tauri-apps/tauri-action

3. **Consulter la documentation** :
   - Documentation officielle Tauri : https://tauri.app/v1/guides/distribution/updater
   - Crate `tauri-latest-json` : https://docs.rs/crate/tauri-latest-json

## Génération automatique

Pour générer automatiquement votre fichier `latest.json`, vous pouvez utiliser :

### Crate Rust `tauri-latest-json`

```toml
[dependencies]
tauri-latest-json = "0.2"
```

Ce crate :
- Scanne votre répertoire de bundle Tauri
- Trouve les installateurs pour chaque plateforme
- Signe chaque fichier avec votre clé privée Tauri
- Génère un fichier `latest.json` valide

### GitHub Actions avec tauri-action

Le plugin `tauri-action` peut automatiquement :
- Builder votre application
- Générer et publier le fichier `latest.json`
- Créer des releases GitHub

**Configuration dans GitHub Actions** :

```yaml
- uses: tauri-apps/tauri-action@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tagName: app-v__VERSION__
    releaseName: 'App v__VERSION__'
    releaseBody: 'See the assets to download this version and install.'
    uploadUpdaterJson: true  # Génère automatiquement latest.json
```

L'option `uploadUpdaterJson: true` (activée par défaut) génère automatiquement le fichier `latest.json` et le télécharge dans la release GitHub. Le fichier sera accessible à l'URL :
```
https://github.com/OWNER/REPO/releases/download/TAG/latest.json
```

**Note** : `tauri-action` génère le fichier `latest.json` en analysant les bundles créés, en les signant avec votre clé privée Tauri, et en créant la structure JSON appropriée.

## Notes importantes

1. **Sécurité** : Les signatures sont essentielles pour vérifier l'intégrité des fichiers téléchargés
2. **Format de date** : Utilisez toujours le format ISO 8601 en UTC (ex: `2025-12-03T19:29:56Z`)
3. **URLs** : Les URLs doivent être accessibles publiquement
4. **Version** : Suivez le format semver (ex: `1.2.3`)
5. **Notes** : Les notes peuvent contenir du markdown pour un affichage formaté

## Comparaison avec votre fichier

Votre fichier `latest.json` actuel :

✅ **Points forts** :
- Structure correcte avec tous les champs requis
- Support de 4 plateformes (Windows, macOS Intel, macOS ARM, Linux)
- Signatures présentes pour toutes les plateformes
- URLs pointant vers GitHub Releases
- Format de date ISO 8601 correct

📝 **Suggestions** :
- Les notes pourraient être plus détaillées (actuellement juste "Update for version 0.2.37")
- Vous pourriez ajouter plus de plateformes si nécessaire (Linux ARM, Windows 32-bit, etc.)

