# Robot Position Control Module

Module de contrôle de position du robot Reachy Mini.

## 📁 Structure

```
position-control/
├── RobotPositionControl.jsx    # Composant principal (orchestration)
├── components/                  # Composants UI réutilisables
│   ├── Joystick2D.jsx
│   ├── VerticalSlider.jsx
│   └── SimpleSlider.jsx
├── hooks/                       # Logique métier
│   └── useRobotPosition.js     # Hook principal de gestion
├── utils/                       # Helpers
│   ├── formatPose.js           # Formatage des poses pour logs
│   └── poseHelpers.js          # Helpers pour comparaison/détection
└── index.js                     # Export principal
```

## 🎯 Architecture

### Composant Principal
- `RobotPositionControl` : Orchestration et layout
- Props : `isActive`, `darkMode`

### Composants UI
- `Joystick2D` : Contrôle 2D (Position X/Y, Pitch/Yaw)
- `VerticalSlider` : Slider vertical (Position Z)
- `SimpleSlider` : Slider horizontal (Roll, Body Yaw)

### Hook Métier
- `useRobotPosition` : 
  - Gestion de l'état robot
  - Commandes API (set_target uniquement)
  - Logging intelligent
  - Animation continue (requestAnimationFrame)

### Utilitaires
- `formatPoseForLog` : Formatage des poses pour logs
- `hasSignificantChange` : Détection de changements significatifs

