# Rapport : Support Cross-Platform des Permissions

> **Date** : 17 décembre 2024  
> **Statut** : À implémenter  
> **Priorité** : Haute (bloque Windows)

---

## 🎯 Résumé du Problème

L'application Tauri **build correctement sur Windows**, mais reste **bloquée au démarrage** sur l'écran de permissions (caméra/micro).

### Cause Racine

1. Les permissions `macos-permissions:*` sont dans `capabilities/default.json` **sans filtre de plateforme**
2. Le hook JS `usePermissions.js` appelle le plugin macOS **sans détecter la plateforme**
3. Sur Windows, l'appel au plugin échoue → `catch` → permissions = `false` → **app bloquée sur PermissionsRequiredView**

### Fichiers Concernés

| Fichier | Problème |
|---------|----------|
| `src-tauri/capabilities/default.json` | Permissions macOS sans filtre `platforms` |
| `src/hooks/system/usePermissions.js` | Appelle le plugin macOS sans vérifier l'OS |
| `src/hooks/system/useViewRouter.jsx` | Bloque si `permissionsGranted = false` |

---

## ✅ Modifications Recommandées

### 1. Séparer les Capabilities par Plateforme

Tauri v2 supporte le champ `"platforms"` dans les fichiers de capabilities. C'est la **bonne pratique officielle**.

#### 📁 Créer `src-tauri/capabilities/macos-permissions.json`

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "macos-permissions-capability",
  "description": "Camera and microphone permissions for macOS only",
  "windows": ["main"],
  "platforms": ["macOS"],
  "permissions": [
    "macos-permissions:default",
    "macos-permissions:allow-check-camera-permission",
    "macos-permissions:allow-request-camera-permission",
    "macos-permissions:allow-check-microphone-permission",
    "macos-permissions:allow-request-microphone-permission"
  ]
}
```

#### 📁 Modifier `src-tauri/capabilities/default.json`

Retirer les permissions macOS du fichier default :

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:event:allow-emit",
    "core:event:allow-listen",
    "opener:default",
    "positioner:default",
    "shell:allow-open",
    "core:window:allow-close",
    "core:window:allow-destroy",
    "core:window:allow-start-dragging",
    "core:window:allow-set-size",
    "core:window:allow-inner-size",
    "core:window:allow-set-position",
    "core:window:allow-outer-position",
    "core:webview:allow-create-webview-window",
    "updater:default",
    "updater:allow-check",
    "updater:allow-download-and-install",
    "process:default",
    "process:allow-restart",
    {
      "identifier": "http:default",
      "allow": [
        { "url": "http://localhost:*" },
        { "url": "http://127.0.0.1:*" },
        { "url": "http://192.168.*:*" },
        { "url": "http://10.*:*" },
        { "url": "http://*.local:*" },
        { "url": "http://*.home:*" },
        { "url": "https://huggingface.co/*" },
        { "url": "https://httpbin.org/*" }
      ]
    }
  ]
}
```

---

### 2. Ajouter une Commande Rust pour Détecter la Plateforme

C'est la **méthode recommandée** par la documentation Tauri pour la détection de plateforme côté frontend.

#### 📁 Modifier `src-tauri/src/lib.rs`

Ajouter la commande :

```rust
/// Get the current operating system platform
/// Returns: "macos", "windows", or "linux"
#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}
```

Ajouter au `invoke_handler` :

```rust
.invoke_handler(tauri::generate_handler![
    start_daemon,
    stop_daemon,
    get_logs,
    get_platform,  // ← AJOUTER ICI
    usb::check_usb_robot,
    install_mujoco,
    window::apply_transparent_titlebar,
    window::close_window,
    signing::sign_python_binaries,
    permissions::open_camera_settings,
    permissions::open_microphone_settings
])
```

---

### 3. Modifier le Hook JS pour Détecter la Plateforme

#### 📁 Remplacer `src/hooks/system/usePermissions.js`

```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Hook to check permissions (camera, microphone)
 * - macOS: Uses tauri-plugin-macos-permissions
 * - Windows/Linux: Permissions not required, returns true automatically
 */
export function usePermissions({ checkInterval = 2000 } = {}) {
  const [cameraGranted, setCameraGranted] = useState(false);
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [platform, setPlatform] = useState(null);
  
  // Race condition protection
  const checkVersionRef = useRef(0);

  // Detect platform on mount
  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const os = await invoke('get_platform');
        setPlatform(os);
      } catch (error) {
        // Fallback: assume non-macOS (permissions not required)
        console.warn('[usePermissions] Could not detect platform, assuming non-macOS');
        setPlatform('unknown');
      }
    };
    detectPlatform();
  }, []);

  const checkPermissions = useCallback(async () => {
    // Wait for platform detection
    if (platform === null) return;
    
    const currentVersion = ++checkVersionRef.current;
    
    // Windows/Linux: No permission required, auto-grant
    if (platform !== 'macos') {
      setCameraGranted(true);
      setMicrophoneGranted(true);
      setHasChecked(true);
      setIsChecking(false);
      return;
    }
    
    // macOS only: Check via plugin
    try {
      setIsChecking(true);
      
      const cameraStatus = await invoke('plugin:macos-permissions|check_camera_permission');
      if (currentVersion !== checkVersionRef.current) return;
      
      const micStatus = await invoke('plugin:macos-permissions|check_microphone_permission');
      if (currentVersion !== checkVersionRef.current) return;
      
      setCameraGranted(cameraStatus === true);
      setMicrophoneGranted(micStatus === true);
      setHasChecked(true);
    } catch (error) {
      if (currentVersion !== checkVersionRef.current) return;
      
      // If plugin fails on macOS, permissions are not granted
      setCameraGranted(false);
      setMicrophoneGranted(false);
      setHasChecked(true);
    } finally {
      if (currentVersion === checkVersionRef.current) {
        setIsChecking(false);
      }
    }
  }, [platform]);

  useEffect(() => {
    if (platform !== null) {
      checkPermissions();
      
      // Only poll on macOS (Windows/Linux don't need polling)
      if (platform === 'macos') {
        const interval = setInterval(checkPermissions, checkInterval);
        return () => clearInterval(interval);
      }
    }
  }, [platform, checkInterval, checkPermissions]);

  const allGranted = cameraGranted && microphoneGranted;

  return {
    cameraGranted,
    microphoneGranted,
    allGranted,
    isChecking,
    hasChecked,
    platform,
    refresh: checkPermissions,
  };
}
```

---

## 📊 Récapitulatif des Modifications

| Fichier | Action | Description |
|---------|--------|-------------|
| `src-tauri/capabilities/macos-permissions.json` | **Créer** | Capabilities macOS-only avec `platforms: ["macOS"]` |
| `src-tauri/capabilities/default.json` | **Modifier** | Retirer les 5 lignes `macos-permissions:*` |
| `src-tauri/src/lib.rs` | **Modifier** | Ajouter commande `get_platform()` |
| `src/hooks/system/usePermissions.js` | **Modifier** | Détecter la plateforme et bypasser sur Windows/Linux |

---

## 🎯 Avantages de cette Approche

| Critère | Bénéfice |
|---------|----------|
| **Bonnes pratiques Tauri v2** | Utilise le système de capabilities avec `platforms` |
| **Clean architecture** | Séparation des concerns par plateforme |
| **Pas de nouvelle dépendance** | Pas besoin d'installer `@tauri-apps/plugin-os` |
| **Robuste** | La commande Rust `get_platform()` est fiable |
| **Maintenable** | Facile à comprendre et à modifier |
| **Testable** | Facile à tester sur chaque plateforme |

---

## 🧪 Tests à Effectuer

### Sur macOS
- [ ] L'app demande les permissions caméra/micro
- [ ] Les permissions sont correctement détectées après accord
- [ ] Le restart fonctionne après accord des permissions

### Sur Windows
- [ ] L'app démarre sans bloquer sur PermissionsRequiredView
- [ ] L'app passe directement à UpdateView puis FindingRobotView
- [ ] Pas d'erreur dans la console liée aux permissions

### Sur Linux
- [ ] Même comportement que Windows (permissions auto-accordées)

---

## 📚 Références

- [Tauri v2 - Capabilities for Windows and Platforms](https://tauri.app/learn/security/capabilities-for-windows-and-platforms/)
- [Tauri v2 - Using Plugin Permissions](https://tauri.app/learn/security/using-plugin-permissions/)
- [Tauri v2 - Capability Reference](https://tauri.app/reference/acl/capability/)

