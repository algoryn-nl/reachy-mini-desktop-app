# 📋 Rapport - Français dans le projet

Ce rapport liste tous les endroits où du français a été trouvé dans le code source du projet.

## 📁 Fichiers de code source (src/)

### 🔴 Commentaires en français

#### `src/components/viewer3d/Scene.jsx`
- **Ligne 18**: `* Scène 3D avec éclairage, environnement et effets post-processing`
- **Ligne 22**: `headJoints, // ✅ Array de 7 valeurs [yaw_body, stewart_1, ..., stewart_6]`
- **Ligne 23**: `passiveJoints, // 🚀 GAME-CHANGING: Array de 21 valeurs [passive_1_x, passive_1_y, passive_1_z, ..., passive_7_z] (depuis unified WebSocket)`
- **Ligne 58**: `// ✅ Exposer les données cinématiques via window pour debug (simplifié, sans useRobotParts)`
- **Ligne 312**: `headJoints={headJoints} // ✅ Utiliser les joints directement (comme Rerun)`
- **Ligne 313**: `passiveJoints={passiveJoints} // ✅ Joints passifs pour la cinématique complète Stewart`

#### `src/components/viewer3d/Viewer3D.jsx`
- **Ligne 79**: `// ✅ IMPORTANT: Ne PAS se connecter au WebSocket si isActive=false ET qu'on passe explicitement headJoints=null`
- **Ligne 80**: `// Cela permet d'avoir un robot complètement statique (pour la vue de scan hardware)`
- **Ligne 81**: `// Si headJoints est explicitement null ET isActive=false, on ne se connecte JAMAIS au WebSocket`
- **Ligne 87**: `// Si headJoints est explicitement null, on n'utilise JAMAIS les données du WebSocket pour les mouvements`
- **Ligne 88**: `// Cela garantit que le robot reste statique dans la vue de scan`
- **Ligne 131**: `// Toggle entre les 2 modes`
- **Ligne 136**: `// Compute props pour Scene`
- **Ligne 257**: `headJoints={finalHeadJoints} // ✅ Utiliser les joints directement`

#### `src/components/viewer3d/URDFRobot.jsx`
- **Ligne 14**: `headPose, // ✅ Matrice de pose (pour debug/comparaison, mais on utilise les joints)`
- **Ligne 15**: `headJoints, // ✅ Array de 7 valeurs [yaw_body, stewart_1, ..., stewart_6]`
- **Ligne 16**: `passiveJoints, // ✅ Array de 21 valeurs [passive_1_x, passive_1_y, passive_1_z, ..., passive_7_z] (optionnel, seulement si Placo actif)`
- **Ligne 163**: `// ✅ IMPORTANT: Initialiser tous les joints à zéro pour éviter une position initiale incorrecte`
- **Ligne 164**: `// La plateforme Stewart nécessite que tous les joints soient initialisés correctement`
- **Ligne 171**: `// Initialiser tous les joints stewart à 0`
- **Ligne 179**: `// Initialiser les joints passifs à 0 si disponibles`
- **Ligne 195**: `// ✅ Forcer la mise à jour des matrices après initialisation`
- **Ligne 204**: `// ✅ Attendre 500ms avant d'afficher le robot pour éviter l'accoup de la tête penchée`
- **Ligne 243**: `// ✅ IMPORTANT: Initialiser lastAntennasRef pour éviter que useFrame ne réapplique les antennes`
- **Ligne 255**: `// ✅ Helper function pour comparer les arrays avec tolérance (évite les mises à jour inutiles)`
- **Ligne 285**: `// ✅ Utiliser les joints directement comme dans le code Rerun (plus précis que la matrice de pose)`
- **Ligne 286**: `// Les joints respectent la cinématique de l'URDF`
- **Ligne 287**: `// ✅ IMPORTANT: URDFLoader met à jour automatiquement les matrices lors de setJointValue`
- **Ligne 288**: `// Ne PAS forcer updateMatrixWorld() pour éviter les conflits et le flickering`
- **Ligne 325**: `// ✅ Fallback: utiliser yawBody seul si headJoints n'est pas disponible`
- **Ligne 335**: `// ✅ CRITIQUE: Les joints passifs sont nécessaires pour la cinématique complète de la plateforme Stewart`
- **Ligne 336**: `// Seulement disponibles si Placo est actif`
- **Ligne 342**: `// ✅ Noms des joints passifs dans l'ordre exact du daemon`
- **Ligne 353**: `// Appliquer tous les joints passifs`
- **Ligne 366**: `// URDFLoader met à jour automatiquement les matrices lors de setJointValue()`
- **Ligne 367**: `// Forcer updateMatrixWorld() peut créer des conflits et causer du flickering`
- **Ligne 369**: `// STEP 2: Optionnel - Appliquer head_pose pour comparaison/debug (mais les joints sont prioritaires)`
- **Ligne 370**: `// ✅ La matrice de pose peut être utilisée pour vérifier la cohérence, mais les joints sont la source de vérité`
- **Ligne 374**: `lastHeadPoseRef.current = headPose.slice(); // Garder en cache pour comparaison`
- **Ligne 375**: `// Note: On n'applique plus la matrice directement car les joints sont plus précis`
- **Ligne 379**: `// STEP 3: Update antennas - only if changed (avec tolérance pour éviter les mises à jour inutiles)`
- **Ligne 380**: `// ✅ IMPORTANT: Appliquer les antennes même si elles sont [0, 0] (repliées)`
- **Ligne 381**: `// Vérifier si antennas est défini (peut être null, undefined, ou un array)`
- **Ligne 396**: `// Pas besoin de mettre à jour les matrices pour les antennes (elles sont indépendantes)`

#### `src/components/viewer3d/utils/materials.js`
- **Ligne 132**: `// ===== 1. DIFFUSE CELL SHADING (Multi-light avec smooth) =====`
- **Ligne 200**: `* Crée un matériau cell shading AAA avec shader custom`
- **Ligne 201**: `* @param {number} baseColorHex - Couleur de base en hexa`
- **Ligne 302**: `* Shader X-ray AAA avec rim lighting avancé, depth-based opacity, et subsurface scattering`

#### `src/utils/simulationMode.js`
- **Ligne 4**: `* Permet de lancer l'application en mode simulation pour développer/test sans robot USB connecté.`
- **Ligne 12**: `// Cache pour éviter de logger plusieurs fois`
- **Ligne 16**: `* Détecte si le mode simulation est activé`
- **Ligne 17**: `* @returns {boolean} true si le mode simulation est actif`
- **Ligne 20**: `// 1. Vérifier import.meta.env (Vite) - priorité la plus haute`
- **Ligne 21**: `// Vite expose les variables d'environnement préfixées par VITE_`
- **Ligne 30**: `// 2. Vérifier localStorage (pour développement rapide sans redémarrer)`
- **Ligne 31**: `// Utile pour activer/désactiver rapidement depuis la console`
- **Ligne 43**: `// 3. Vérifier process.env (fallback pour Node.js)`
- **Ligne 56**: `* Active le mode simulation (pour développement)`
- **Ligne 61**: `_simModeLogged = false; // Reset pour re-logger au prochain check`
- **Ligne 67**: `* Désactive le mode simulation`
- **Ligne 72**: `_simModeLogged = false; // Reset pour re-logger au prochain check`
- **Ligne 78**: `* Port USB simulé pour le mode simulation`

#### `src/utils/robotModelCache.js`
- **Ligne 496**: `// Notifier tous les listeners`
- **Ligne 558**: `* Notifie tous les listeners`
- **Ligne 571**: `* Nettoie le cache (à appeler au démontage de l'app)`
- **Ligne 588**: `// Vider aussi le localStorage`

#### `src/constants/choreographies.js`
- **Ligne 2**: `* Liste complète des chorégraphies et mouvements disponibles dans le daemon Reachy Mini`
- **Ligne 3**: `* Référence: http://localhost:8000/docs quand le daemon est actif`
- **Ligne 5**: `* Les datasets sont hébergés comme des bibliothèques :`
- **Ligne 173**: `// Mouvements de base (via l'API directe)`

#### `src/components/DevPlayground.jsx`
- **Ligne 6**: `* Page de développement pour tester le RobotViewer3D en isolation`

#### `src/hooks/useUsbDetection.js`
- **Ligne 12**: `// 🎭 Simulation mode: simule une connexion USB`
- **Ligne 26**: `// Simule une connexion USB`
- **Ligne 32**: `// Mode normal: vérification USB réelle`

#### `src/views/active-robot/application-store/ApplicationStore.jsx`
- **Ligne 484**: `title="Glissez les contrôles pour un mouvement continu (envoie /api/move/set_target). Relâchez pour envoyer une commande discrète avec durée dynamique basée sur la distance (envoie /api/move/goto)."`
- **Ligne 532**: `{/* Overlay fullscreen pour installations */}`

#### `src/views/active-robot/application-store/InstalledAppsSection.jsx`
- **Ligne 51**: `{/* Reachies Carousel - Images qui défilent */}`

#### `src/views/active-robot/application-store/InstallOverlay.jsx`
- **Ligne 9**: `* Overlay fullscreen pour l'installation d'une app`
- **Ligne 10**: `* Affiche les détails de l'app, la progression et les logs`

#### `src/views/active-robot/audio/AudioLevelBars.jsx`
- **Ligne 62**: `// ✅ Vérifier que les dimensions sont valides avant de mettre à jour`
- **Ligne 64**: `// Dimensions invalides, ne pas mettre à jour (layout pas encore calculé)`

#### `src/views/active-robot/camera/AudioVisualizer.jsx`
- **Ligne 4**: `* Composant AudioVisualizer - Affiche un égaliseur audio épuré`
- **Ligne 5**: `* Pour l'instant, simule des données FFT avec du bruit aléatoire`

#### `src/views/active-robot/ActiveRobotView.jsx`
- **Ligne 504**: `{/* Audio Controls - Wrapper stable pour garantir le sizing correct */}`

#### `src/components/ReachiesCarousel.jsx`
- **Ligne 4**: `// Charger toutes les images du dossier reachies/small-top-sided dynamiquement avec Vite`
- **Ligne 8**: `* Composant qui charge toutes les images PNG du dossier reachies/small-top-sided,`
- **Ligne 9**: `* les met en mémoire et les affiche en séquence avec une transition fade superposée.`
- **Ligne 11**: `* Les images sont chargées dynamiquement et affichées les unes après les autres`
- **Ligne 12**: `* dans un cadre fixe, avec une transition fade in/out entre chaque image.`
- **Ligne 17**: `interval = 1000, // Durée d'affichage de chaque image en ms (plus rapide)`
- **Ligne 18**: `transitionDuration = 150, // Durée de la transition fade en ms (très nette) - DEPRECATED, utilise fadeInDuration et fadeOutDuration`
- **Ligne 19**: `fadeInDuration = 350, // Durée du fade-in pour l'image entrante (plus lent, style Apple/Google)`
- **Ligne 20**: `fadeOutDuration = 120, // Durée du fade-out pour l'image sortante (plus rapide, style Apple/Google)`
- **Ligne 21**: `zoom = 1.8, // Facteur de zoom pour agrandir le sticker`
- **Ligne 22**: `verticalAlign = 'center', // Alignement vertical: 'top', 'center', 'bottom', ou pourcentage (ex: '60%')`
- **Ligne 26**: `// Extraire les URLs des images chargées et les trier pour un ordre cohérent`
- **Ligne 30**: `// Avec eager: true, le module est déjà chargé, on accède à .default`
- **Ligne 35**: `.filter(Boolean) // Filtrer les valeurs nulles/undefined`
- **Ligne 36**: `.sort(); // Trier pour un ordre cohérent`
- **Ligne 46**: `// Précharger toutes les images en mémoire pour des transitions fluides`
- **Ligne 54**: `// Fonction pour obtenir un index aléatoire différent du courant`
- **Ligne 64**: `// Changer d'image automatiquement avec overlap et sélection aléatoire`
- **Ligne 68**: `// Sauvegarder l'index précédent AVANT de changer pour garantir le crossfade`
- **Ligne 72**: `setFadeOutComplete(false); // Réinitialiser au début de la transition`
- **Ligne 74**: `// Sélectionner une image aléatoire différente de la courante`
- **Ligne 78**: `// L'image sortante commence à disparaître après un délai pour créer plus d'overlap`
- **Ligne 79**: `// Les deux images restent visibles ensemble plus longtemps`
- **Ligne 80**: `const overlapDelay = Math.min(fadeInDuration * 0.4, fadeOutDuration * 2); // 40% du fade-in ou 2x fade-out`
- **Ligne 85**: `// Réinitialiser l'état de transition après la durée la plus longue (fade-in)`
- **Ligne 121**: `overflow: 'hidden', // Empêcher le débordement du zoom`
- **Ligne 129**: `// Calculer la position verticale selon l'alignement`
- **Ligne 147**: `// Crossfade style Apple/Google : sortant disparaît plus vite que l'entrant n'apparaît`
- **Ligne 152**: `// Logique de crossfade : les deux images doivent être visibles simultanément`
- **Ligne 154**: `// Image entrante : fade-in lent et progressif (style premium)`
- **Ligne 158**: `// Image sortante : fade-out rapide (disparaît vite pour laisser place)`
- **Ligne 176**: `objectPosition: 'center top', // Aligner le haut de l'image vers le haut`
- **Ligne 178**: `transform: \`translate(-50%, ${transformY})\`, // Pas de scale`
- **Ligne 181**: `// Positionner l'image zoomée avec alignement vertical personnalisé`
- **Ligne 186**: `backfaceVisibility: 'hidden', // Éviter les artefacts de rendu`

#### `src/components/viewer3d/effects/ScanAnnotations.jsx`
- **Ligne 92**: `const sideDistance = 0.05; // ✅ Réduit pour des flèches plus courtes`
- **Ligne 230**: `{/* ✅ Calculer un point de fin plus proche du mesh pour une flèche plus courte */}`
- **Ligne 234**: `// ✅ Créer un point à 70% de la distance (flèche plus courte)`
- **Ligne 275**: `// ✅ Contour de la couleur du fond de la scène pour meilleure lisibilité`

#### `src/components/viewer3d/CinematicCamera.jsx`
- **Ligne 173**: `// Toujours regarder vers le centre du robot`

#### `src/components/viewer3d/hooks/useRobotWebSocket.js`
- **Ligne 22**: `* Fusionne useRobotWebSocket + useRobotParts pour éviter le DOUBLE WebSocket`
- **Ligne 40**: `// Fermer la connexion WebSocket si le daemon est inactif`
- **Ligne 72**: `// Le daemon peut envoyer {m: [...]} ou directement un array`
- **Ligne 76**: `: data.head_pose.m; // Le daemon envoie {m: [...]}`
- **Ligne 89**: `// Positions des antennes [left, right]`
- **Ligne 95**: `// Seulement disponibles si Placo est actif (kinematics_engine == "Placo")`
- **Ligne 101**: `// Explicitement null si Placo n'est pas actif`

#### `src/components/viewer3d/effects/ParticleEffect.jsx`
- **Ligne 224**: `// Attendre le spawn delay`

#### `src/components/viewer3d/index.js`
- **Ligne 2**: `* Export principal du module viewer3d`

#### `src/views/active-robot/camera/index.js`
- **Ligne 2**: `* Export principal du module camera`

## 📊 Résumé

### Par type de contenu :
- **Commentaires de code** : ~150+ occurrences
- **Documentation JSDoc** : ~20 occurrences
- **Commentaires inline** : ~50+ occurrences
- **Tooltips/UI text** : 1 occurrence (ApplicationStore.jsx ligne 484)

### Par priorité de traduction :

#### 🔴 **Haute priorité** (UI visible par l'utilisateur)
- `src/views/active-robot/application-store/ApplicationStore.jsx` ligne 484 : Tooltip en français

#### 🟡 **Moyenne priorité** (Commentaires techniques importants)
- Tous les commentaires dans `src/components/viewer3d/` (URDFRobot.jsx, Scene.jsx, Viewer3D.jsx)
- Commentaires dans `src/utils/simulationMode.js`
- Commentaires dans `src/constants/choreographies.js`

#### 🟢 **Basse priorité** (Commentaires de développement)
- Commentaires dans `src/components/ReachiesCarousel.jsx`
- Commentaires dans les fichiers d'effets (`effects/`)
- Commentaires dans les hooks (`hooks/`)

## 💡 Recommandations

1. **Traduire immédiatement** : Le tooltip dans `ApplicationStore.jsx` (ligne 484) car il est visible par l'utilisateur final
2. **Traduire progressivement** : Les commentaires techniques dans les composants 3D pour faciliter la maintenance par une équipe internationale
3. **Garder en français** : Les commentaires de développement très spécifiques peuvent rester en français si l'équipe principale est francophone, mais il serait préférable de tout traduire pour la cohérence

## 📝 Notes

- La plupart du français se trouve dans les commentaires de code, pas dans le code lui-même
- Le code fonctionnel est principalement en anglais
- Les noms de variables et fonctions sont en anglais
- Seul un tooltip UI contient du français visible par l'utilisateur

