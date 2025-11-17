# Mode Simulation

Le mode simulation permet de développer et tester l'application sans avoir besoin du robot physique Reachy Mini. Il bypass complètement la détection USB et démarre le daemon directement en mode simulation (Mujoco).

## Activation

### Méthode 1 : Variable d'environnement (recommandé pour le développement)

```bash
# macOS/Linux
export REACHY_SIMULATION_MODE=true
npm run tauri dev

# Windows (PowerShell)
$env:REACHY_SIMULATION_MODE="true"
npm run tauri dev
```

### Méthode 2 : localStorage (via la console du navigateur)

```javascript
// Activer le mode simulation
localStorage.setItem('REACHY_SIMULATION_MODE', 'true');
// Recharger la page

// Désactiver le mode simulation
localStorage.removeItem('REACHY_SIMULATION_MODE');
// Recharger la page
```

### Méthode 3 : Paramètre URL (mode navigateur uniquement)

```
http://localhost:5173/?sim=true
```

## Fonctionnement

Quand le mode simulation est activé :

1. **Bypass USB** : La détection USB est complètement bypassée. L'application considère toujours qu'un robot est connecté (port simulé : `sim://mujoco`).

2. **Démarrage automatique** : Vous pouvez démarrer le daemon directement depuis l'application sans attendre la détection USB.

3. **Daemon en mode simulation** : Le daemon Python démarre avec l'argument `--sim`, ce qui lance Mujoco au lieu de se connecter au robot physique.

4. **Vue USB bypassée** : La vue `RobotNotDetectedView` n'est jamais affichée en mode simulation.

## Architecture

### Côté Rust (`lib.rs`)

- `start_daemon()` accepte maintenant un paramètre optionnel `simulation_mode`
- `check_usb_robot()` retourne `sim://mujoco` si le mode simulation est activé
- `get_simulation_mode()` permet de vérifier l'état du mode simulation depuis le frontend

### Côté Frontend

- **`config/simulation.js`** : Configuration centralisée et utilitaires
- **`hooks/useSimulationMode.js`** : Hook React pour gérer l'état du mode simulation
- **`hooks/useUsbDetection.js`** : Modifié pour bypasser la détection USB en mode simulation
- **`hooks/useDaemon.js`** : Modifié pour passer le flag simulation au daemon
- **`components/App.jsx`** : Modifié pour bypasser la vue USB en mode simulation

## Utilisation dans le code

```javascript
import { useSimulationMode } from '../hooks/useSimulationMode';
import { isSimulationModeEnabled } from '../config/simulation';

// Dans un composant React
const { isEnabled, enable, disable, toggle } = useSimulationMode();

// Dans du code non-React
if (isSimulationModeEnabled()) {
  // Mode simulation actif
}
```

## Notes importantes

- Le mode simulation est persistant via `localStorage`, mais peut être surchargé par la variable d'environnement `REACHY_SIMULATION_MODE`
- En mode simulation, le daemon démarre avec `--sim`, ce qui nécessite que Mujoco soit installé
- La déconnexion USB automatique est désactivée en mode simulation
- Le port USB simulé est `sim://mujoco` (affiché dans l'UI)

## Désactivation

Pour désactiver le mode simulation :

1. **Variable d'environnement** : Ne pas la définir ou la mettre à `false`
2. **localStorage** : `localStorage.removeItem('REACHY_SIMULATION_MODE')` puis recharger
3. **Via le hook** : `disable()` depuis `useSimulationMode()`

