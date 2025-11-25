# 📊 Rapport d'Analyse - Reachy Mini Control Application

**Date:** $(date)  
**Version de l'application:** 0.2.1  
**Plateformes supportées:** macOS, Windows

---

## 🎯 Vue d'ensemble

**Reachy Mini Control** est une application desktop moderne construite avec **Tauri 2.0** et **React 19**, conçue pour contrôler et monitorer le robot Reachy Mini. L'application offre une interface native performante avec visualisation 3D en temps réel, gestion d'applications, et système de mise à jour automatique.

---

## 🏗️ Architecture Technique

### Stack Technologique

#### Frontend
- **React 19.2.0** - Bibliothèque UI
- **Material-UI (MUI) 7.3.5** - Composants UI
- **Zustand 5.0.8** - Gestion d'état globale
- **Three.js 0.181.0** - Rendu 3D
- **React Three Fiber 9.4.0** - Wrapper React pour Three.js
- **React Three Drei 10.7.6** - Helpers pour R3F
- **Vite 7.2.1** - Build tool et dev server

#### Backend (Rust)
- **Tauri 2.0** - Framework desktop
- **Plugins Tauri:**
  - `tauri-plugin-shell` - Exécution de commandes
  - `tauri-plugin-updater` - Mises à jour automatiques
  - `tauri-plugin-process` - Gestion de processus
  - `tauri-plugin-positioner` - Positionnement de fenêtres
- **serialport 4.2** - Détection USB
- **signal-hook 0.3** - Gestion des signaux système

#### Python Sidecar
- **uv-wrapper** - Wrapper Rust pour exécuter Python via `uv`
- **reachy-mini[placo_kinematics]** - Package Python du daemon
- Support pour mode simulation avec **MuJoCo**

---

## 📁 Structure du Projet

```
tauri-app/
├── src/                          # Code frontend React
│   ├── components/               # Composants réutilisables
│   │   ├── App.jsx              # Composant racine avec routing
│   │   ├── AppTopBar.jsx        # Barre de titre
│   │   ├── DevPlayground.jsx    # Mode développement
│   │   └── viewer3d/           # Module visualisation 3D
│   │       ├── Viewer3D.jsx    # Composant principal 3D
│   │       ├── URDFRobot.jsx   # Modèle URDF du robot
│   │       ├── Scene.jsx        # Configuration scène 3D
│   │       └── effects/         # Effets visuels (particules, etc.)
│   │
│   ├── views/                   # Vues principales de l'application
│   │   ├── RobotNotDetectedView.jsx
│   │   ├── StartingView.jsx     # Vue de scan/démarrage
│   │   ├── ReadyToStartView.jsx
│   │   ├── ActiveRobotView.jsx  # Vue principale (robot actif)
│   │   │   ├── application-store/  # Gestionnaire d'applications
│   │   │   ├── camera/          # Flux vidéo caméra
│   │   │   └── audio/           # Contrôles audio
│   │   └── ClosingView.jsx
│   │
│   ├── hooks/                   # Hooks React personnalisés
│   │   ├── useDaemon.js        # Gestion du daemon
│   │   ├── useApps.js          # Gestion des applications
│   │   ├── useRobotState.js    # État du robot
│   │   ├── useUsbDetection.js  # Détection USB
│   │   ├── useUpdater.js       # Système de mise à jour
│   │   └── useDaemonHealthCheck.js  # Vérification santé daemon
│   │
│   ├── store/                   # État global (Zustand)
│   │   └── useAppStore.js      # Store principal avec state machine
│   │
│   ├── config/                  # Configuration
│   │   └── daemon.js           # Config API daemon
│   │
│   └── utils/                   # Utilitaires
│       ├── robotModelCache.js   # Cache modèle 3D
│       └── simulationMode.js   # Détection mode simulation
│
├── src-tauri/                   # Backend Rust
│   ├── src/
│   │   └── lib.rs              # Logique principale Tauri
│   ├── binaries/               # Binaires sidecar (uv-trampoline)
│   └── tauri.conf.json         # Configuration Tauri
│
├── uv-wrapper/                  # Wrapper Rust pour uv
│   └── src/lib.rs              # Bundle Python avec uv
│
└── scripts/                     # Scripts de build/test
    ├── build-update.sh
    ├── test-sidecar.sh
    └── ...
```

---

## 🔄 Machine d'État (State Machine)

L'application utilise une **machine d'état centralisée** pour gérer le cycle de vie du robot :

### États possibles :
1. **`disconnected`** - Robot non connecté (USB non détecté)
2. **`ready-to-start`** - Robot connecté, prêt à démarrer le daemon
3. **`starting`** - Daemon en cours de démarrage (scan hardware)
4. **`ready`** - Robot actif et prêt à recevoir des commandes
5. **`busy`** - Robot occupé (avec raison : `moving`, `command`, `app-running`, `installing`)
6. **`stopping`** - Daemon en cours d'arrêt
7. **`crashed`** - Daemon planté (détecté après 3 timeouts consécutifs)

### Transitions :
- Gérées via `useAppStore.transitionTo.{state}()`
- Synchronisation automatique avec les états legacy (`isActive`, `isStarting`, etc.)
- Détection de crash automatique via `useDaemonHealthCheck`

---

## 🎨 Fonctionnalités Principales

### 1. 🤖 Contrôle du Robot

#### Détection USB
- Détection automatique du robot via USB (VID:PID = 1a86:55d3)
- Polling toutes les 2 secondes
- Support mode simulation (bypass USB)

#### Gestion du Daemon
- **Démarrage** : Lancement via sidecar `uv-trampoline`
- **Arrêt** : Nettoyage automatique (port 8000 + processus)
- **Health Check** : Polling toutes les 1.33s pour détecter les crashes
- **Logs** : Affichage en temps réel (stdout/stderr du sidecar)

#### Mode Simulation
- Activation via `VITE_SIM_MODE=true` ou `localStorage.setItem('simMode', 'true')`
- Installation automatique de MuJoCo au premier démarrage
- Utilise `mjpython` sur macOS (avec correction automatique du shebang)
- Port USB simulé : `/dev/tty.usbserial-SIMULATED`

### 2. 📊 Visualisation 3D

#### Composants
- **Viewer3D** : Composant principal avec canvas Three.js
- **URDFRobot** : Chargement et animation du modèle URDF
- **Scene** : Configuration scène (éclairage, post-processing SSAO)
- **Caméras** : 
  - `CinematicCamera` - Vue cinématique
  - `HeadFollowCamera` - Suivi de la tête

#### Fonctionnalités
- Animation en temps réel (tête, antennes, corps)
- Mode Normal / X-Ray (matériaux transparents)
- WebSocket pour données temps réel (`ws://localhost:8000/api/state/ws/full`)
- Effets visuels (particules pour sleep, love, etc.)
- Cache du modèle 3D pour performance

### 3. 📱 Gestion d'Applications

#### Sources d'Applications
- **Hugging Face Spaces** : Applications officielles depuis HF
- **Local** : Applications installées localement
- **Liste officielle** : Filtrage via dataset HF (`pollen-robotics/reachy-mini-official-app-store`)

#### Fonctionnalités
- **Installation/Désinstallation** : Via API daemon avec suivi de jobs
- **Lancement/Arrêt** : Contrôle des applications en cours
- **Métadonnées** : Likes, downloads, lastModified depuis HF API
- **Polling de jobs** : Suivi en temps réel des installations (toutes les 500ms)
- **Gestion d'erreurs** : Détection timeouts, erreurs permissions système

#### API Endpoints utilisés
- `/api/apps/list-available/hf_space` - Liste apps HF
- `/api/apps/list-available/installed` - Apps installées
- `/api/apps/install` - Installation
- `/api/apps/remove/{name}` - Désinstallation
- `/api/apps/start-app/{name}` - Lancement
- `/api/apps/stop-current-app` - Arrêt
- `/api/apps/job-status/{job_id}` - Statut job
- `/api/apps/current-app-status` - App en cours

### 4. 🎥 Caméra et Audio

#### Caméra
- **CameraFeed** : Affichage flux vidéo depuis le robot
- Support de différents presets (scan, normal, etc.)
- Intégration dans le viewer 3D

#### Audio
- **AudioControls** : Contrôle volume haut-parleur et microphone
- API endpoints : `/api/volume/current`, `/api/volume/set`, `/api/volume/microphone/current`

### 5. 🎮 Commandes Rapides

#### Actions disponibles
- **Chorégraphies** : Danses pré-enregistrées
- **Mouvements** : Commandes de position (sleep, look_at, etc.)
- **Quick Actions** : Actions rapides via `QuickActionsPad`

#### API
- `/api/move/play/{choreography}` - Jouer chorégraphie
- `/api/move/play/goto_sleep` - Position sleep
- `/api/robot/command` - Commandes personnalisées

### 6. 🔄 Système de Mise à Jour

#### Fonctionnalités
- **Vérification automatique** : Toutes les heures
- **Téléchargement progressif** : Barre de progression
- **Installation** : Via plugin Tauri updater
- **Endpoint** : GitHub Releases (`latest.json`)

#### Configuration
- Pubkey pour vérification signatures
- Désactivation des downgrades
- Dialog utilisateur pour confirmation

---

## 🔧 Configuration et Build

### Scripts NPM/Yarn

```bash
# Développement
yarn tauri:dev              # Mode dev normal
yarn tauri:dev:sim          # Mode simulation (bypass USB)

# Build
yarn tauri:build            # Build production
yarn build:sidecar-macos    # Build sidecar (PyPI)
yarn build:sidecar-macos:develop  # Build sidecar (GitHub develop)

# Tests
yarn test:sidecar           # Test sidecar
yarn test:app              # Test application
yarn test:updater          # Test updater
yarn test:all              # Tous les tests

# Updates
yarn build:update:dev       # Build update locale
yarn serve:updates         # Servir updates localement
```

### Variables d'Environnement

- `VITE_SIM_MODE` - Active le mode simulation
- `REACHY_MINI_SOURCE` - Source du package Python (`pypi` ou `develop`)

### Build Sidecar

Le sidecar est construit via `uv-wrapper` :
1. Build `uv-bundle` (Rust)
2. Installation Python avec `uv` (reachy-mini + dépendances)
3. Build `uv-trampoline` (Rust)
4. Copie dans `src-tauri/binaries/`

---

## 🐛 Gestion d'Erreurs

### Détection de Crash
- **Health Check** : Polling toutes les 1.33s
- **Timeouts** : Compteur de timeouts consécutifs
- **Crash détecté** : Après 3 timeouts → état `crashed`
- **Reset** : Automatique lors de redémarrage réussi

### Erreurs Hardware
- Détection via stderr du sidecar
- Erreurs configurées dans `hardwareErrors.js` :
  - `motor_error` - Erreur moteur
  - `camera_error` - Erreur caméra
  - `hardware` - Erreur générique
- Affichage dans `StartingView` avec message personnalisé

### Erreurs Permissions
- Détection popups système (macOS/Windows)
- Timeout pour popups non acceptées
- Messages utilisateur clairs

---

## 📡 Communication Frontend ↔ Backend

### Tauri Commands (Rust → JS)

```rust
start_daemon(sim_mode: bool)      // Démarrer daemon
stop_daemon()                     // Arrêter daemon
get_logs()                        // Récupérer logs
check_usb_robot()                 // Détecter USB
install_mujoco()                  // Installer MuJoCo
```

### Tauri Events (Rust → JS)

```rust
sidecar-stdout    // Sortie stdout du sidecar
sidecar-stderr    // Sortie stderr du sidecar
```

### API HTTP (Daemon Python)

Base URL : `http://localhost:8000`

Endpoints principaux :
- `/api/state/full` - État complet robot
- `/api/state/ws/full` - WebSocket état temps réel
- `/api/apps/*` - Gestion applications
- `/api/move/*` - Commandes mouvement
- `/api/volume/*` - Contrôle audio

---

## 🎨 Interface Utilisateur

### Thème
- **Dark Mode** : Support complet avec préférence système
- **Couleurs** : 
  - Primary : `#FF9500` (orange)
  - Secondary : `#764ba2` (violet)
- **Material-UI** : Thème personnalisé avec overrides

### Composants UI Principaux
- **AppTopBar** : Barre de titre avec indicateur simulation
- **Viewer3D** : Visualisation 3D principale
- **ApplicationStore** : Interface gestion applications
- **LogConsole** : Console de logs en temps réel
- **PowerButton** : Bouton démarrage/arrêt
- **RobotHeader** : En-tête avec infos robot

### Responsive
- **Compact** : 450×670px (vues initiales)
- **Expanded** : 800×670px (vue active robot)
- **Resize automatique** : Transition fluide entre vues

---

## 🔒 Sécurité

### Permissions Tauri
- `shell:allow-open` - Ouvrir URLs
- `updater:default` - Mises à jour
- `process:default` - Gestion processus

### CSP (Content Security Policy)
- Désactivé (`csp: null`) pour flexibilité
- ⚠️ À considérer pour production

### Signatures
- Mises à jour signées avec clé publique
- Vérification automatique des signatures

---

## 📈 Performance

### Optimisations
- **Cache modèle 3D** : Préchargement et mise en cache
- **Selectors Zustand** : Sélecteurs optimisés pour éviter re-renders
- **Polling intelligent** : Intervalles adaptatifs
- **Lazy loading** : Composants chargés à la demande

### Métriques
- **Health Check** : 1.33s (détection rapide)
- **USB Check** : 2s
- **Logs Fetch** : 3s
- **Job Polling** : 500ms (installations)

---

## 🧪 Tests

### Scripts de Test
- `test-sidecar.sh` - Test sidecar Python
- `test-app.sh` - Test application complète
- `test-updater.sh` - Test système de mise à jour
- `test-update-prod.sh` - Test updates production

### Mode Développement
- **DevPlayground** : Accessible via `/dev` ou `#dev`
- **Mock Tauri APIs** : Pour développement navigateur
- **Hot Reload** : Vite HMR activé

---

## 📝 Points d'Attention / Améliorations Possibles

### 🔴 Critiques
1. **CSP désactivé** : À réactiver avec politique stricte pour production
2. **Gestion erreurs réseau** : Améliorer retry logic pour API calls
3. **Documentation API** : Documenter tous les endpoints daemon

### 🟡 Moyennes
1. **Tests unitaires** : Ajouter tests pour hooks et composants
2. **Accessibilité** : Améliorer support clavier et screen readers
3. **Internationalisation** : Support multi-langues (actuellement anglais uniquement)
4. **Logs rotation** : Limiter taille logs (actuellement 50 max)

### 🟢 Mineures
1. **Animations** : Améliorer transitions entre vues
2. **Thème** : Plus d'options de personnalisation
3. **Shortcuts clavier** : Raccourcis pour actions fréquentes
4. **Export logs** : Fonctionnalité export logs pour debug

---

## 🚀 Déploiement

### Build Production
1. Build sidecar : `yarn build:sidecar-macos`
2. Build Tauri : `yarn tauri:build`
3. Signatures : Automatique via GitHub Actions
4. Distribution : GitHub Releases

### Mises à Jour
- **Dev** : Serveur local pour tests
- **Prod** : GitHub Releases avec `latest.json`
- **Signatures** : Clé publique dans `tauri.conf.json`

---

## 📚 Documentation

### Fichiers de Documentation
- `README.md` - Documentation principale
- `docs/UPDATE_PIPELINES.md` - Workflows de mise à jour
- `docs/TESTING_GUIDE.md` - Guide de tests
- `docs/STATE_MACHINE.md` - Architecture state machine
- `src/components/viewer3d/README.md` - Documentation viewer 3D

### Commentaires Code
- Code bien commenté avec emojis pour sections importantes
- Documentation inline pour fonctions complexes
- Exemples d'utilisation dans certains hooks

---

## 🎯 Conclusion

L'application **Reachy Mini Control** est une application desktop moderne et bien structurée, avec une architecture solide basée sur Tauri et React. Les points forts incluent :

✅ **Architecture claire** avec séparation frontend/backend  
✅ **State machine robuste** pour gestion cycle de vie  
✅ **Visualisation 3D performante** avec Three.js  
✅ **Système d'applications complet** avec intégration HF  
✅ **Mode simulation** pour développement sans hardware  
✅ **Système de mise à jour automatique**  
✅ **Gestion d'erreurs avancée** avec détection de crash  

Les principales améliorations à considérer concernent la sécurité (CSP), les tests, et l'accessibilité.

---

**Rapport généré le :** $(date)  
**Version analysée :** 0.2.1

