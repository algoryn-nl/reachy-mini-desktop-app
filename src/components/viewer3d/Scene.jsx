import { useState, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import URDFRobot from './URDFRobot';
import { useLevaControls } from './config/levaControls';
import ScanEffect from './effects/ScanEffect';
import ErrorHighlight from './effects/ErrorHighlight';
import ParticleEffect from './effects/ParticleEffect';
import CinematicCamera from './CinematicCamera';
import HeadFollowCamera from './HeadFollowCamera';
import useAppStore from '../../store/useAppStore';
import { DAEMON_CONFIG } from '../../config/daemon';

/**
 * Scène 3D avec éclairage, environnement et effets post-processing
 */
export default function Scene({ 
  headPose, 
  yawBody, 
  antennas, 
  isActive, 
  isTransparent, 
  showLevaControls, 
  forceLoad = false, 
  hideGrid = false,
  showScanEffect = false, // Affiche l'effet de scan
  onScanComplete = null, // Callback quand le scan est terminé
  onScanMesh = null, // Callback pour chaque mesh scanné
  cameraConfig = {}, // Config de caméra (target, minDistance, maxDistance)
  useCinematicCamera = false, // Utilise une caméra animée au lieu d'OrbitControls
  useHeadFollowCamera = false, // Caméra attachée à la tête qui suit ses mouvements
  lockCameraToHead = false, // Lock la caméra à l'orientation de la tête
  errorFocusMesh = null, // Mesh à focus en cas d'erreur
  hideEffects = false, // Cache les effets de particules
}) {
  // State pour stocker les meshes à outliner
  const [outlineMeshes, setOutlineMeshes] = useState([]);
  const [robotRef, setRobotRef] = useState(null); // Référence au robot pour HeadFollowCamera
  
  // ⚡ Durée du scan lue depuis la config centrale
  const scanDuration = DAEMON_CONFIG.ANIMATIONS.SCAN_DURATION / 1000;

  // Récupérer l'effet actif depuis le store
  const { activeEffect } = useAppStore();

  // Contrôles Leva centralisés
  const { cellShading, lighting, ssao, xraySettings, scene } = useLevaControls(showLevaControls);

  // Calculer la position de la tête de Reachy en temps réel
  // Utilise useMemo pour ne recalculer que quand l'effet change (optimisation)
  const headPosition = useMemo(() => {
    if (!robotRef) return [0, 0.18, 0.02]; // Position par défaut
    
    // Trouver le link de la caméra (qui est au niveau de la tête)
    const cameraLink = robotRef.links?.['camera'];
    if (cameraLink) {
      const worldPosition = new THREE.Vector3();
      cameraLink.getWorldPosition(worldPosition);
      
      // Ajouter un offset pour que les particules apparaissent au-dessus et devant la tête
      return [worldPosition.x, worldPosition.y + 0.03, worldPosition.z + 0.02];
    }
    
    // Fallback sur xl_330 si camera n'est pas disponible
    const headLink = robotRef.links?.['xl_330'];
    if (headLink) {
      const worldPosition = new THREE.Vector3();
      headLink.getWorldPosition(worldPosition);
      return [worldPosition.x, worldPosition.y + 0.03, worldPosition.z + 0.02];
    }
    
    return [0, 0.18, 0.02]; // Fallback si aucun link trouvé
  }, [robotRef, activeEffect]); // ✅ Recalculer seulement quand un nouvel effet démarre

  // Créer la grille une seule fois avec useMemo
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(2, 20, '#999999', '#cccccc');
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    grid.material.fog = true; // Active le fog sur la grille
    return grid;
  }, []);

  // ✅ Trouver tous les meshes de la caméra quand une erreur est détectée
  const errorMeshes = useMemo(() => {
    if (!errorFocusMesh || !robotRef || !outlineMeshes.length) {
      console.log('⚠️ ErrorHighlight: Missing prerequisites', {
        hasErrorMesh: !!errorFocusMesh,
        hasRobotRef: !!robotRef,
        meshesCount: outlineMeshes.length
      });
      return null;
    }

    console.log('🔍 Analyzing error mesh:', {
      name: errorFocusMesh.name,
      parent: errorFocusMesh.parent?.name,
      availableLinks: Object.keys(robotRef.links || {})
    });

    // Fonction helper pour trouver le link parent d'un mesh
    const findParentLink = (mesh) => {
      let current = mesh;
      let depth = 0;
      while (current && current.parent && depth < 10) {
        const parentName = current.parent.name || '';
        // Vérifier si le parent est un link (les links URDF ont souvent des noms spécifiques)
        if (robotRef.links && Object.keys(robotRef.links).some(linkName => 
          parentName === linkName || parentName.includes(linkName)
        )) {
          return current.parent;
        }
        // Vérifier aussi par nom
        if (parentName.toLowerCase().includes('camera')) {
          return current.parent;
        }
        current = current.parent;
        depth++;
      }
      return null;
    };

    // Fonction helper pour collecter tous les meshes enfants d'un objet
    const collectMeshesFromObject = (obj, meshes = []) => {
      if (obj.isMesh && !obj.userData.isOutline) {
        meshes.push(obj);
      }
      if (obj.children) {
        obj.children.forEach(child => {
          collectMeshesFromObject(child, meshes);
        });
      }
      return meshes;
    };

    // Vérifier si le mesh en erreur fait partie de la caméra
    let isCameraMesh = false;
    let cameraLink = null;
    
    // Méthode 1: Vérifier via le link camera directement
    if (robotRef.links?.['camera']) {
      cameraLink = robotRef.links['camera'];
      const cameraMeshes = collectMeshesFromObject(cameraLink, []);
      isCameraMesh = cameraMeshes.includes(errorFocusMesh);
      
      if (isCameraMesh) {
        console.log(`📷 Error mesh is part of camera link, found ${cameraMeshes.length} total camera meshes`);
        return cameraMeshes.length > 0 ? cameraMeshes : [errorFocusMesh];
      }
    }

    // Méthode 2: Remonter la hiérarchie pour trouver un parent "camera"
    let current = errorFocusMesh;
    let depth = 0;
    while (current && current.parent && depth < 10) {
      const parentName = (current.parent.name || '').toLowerCase();
      const currentName = (current.name || '').toLowerCase();
      
      if (parentName.includes('camera') || currentName.includes('camera')) {
        isCameraMesh = true;
        console.log('📷 Found camera in hierarchy:', {
          parentName: current.parent.name,
          currentName: current.name
        });
        break;
      }
      current = current.parent;
      depth++;
    }

    // Si c'est un mesh de la caméra, trouver TOUS les meshes de la caméra
    if (isCameraMesh) {
      // Si on a le link camera, utiliser ses meshes
      if (cameraLink) {
        const cameraMeshes = collectMeshesFromObject(cameraLink, []);
        console.log(`📷 Found ${cameraMeshes.length} camera mesh(es) via link traversal`);
        return cameraMeshes.length > 0 ? cameraMeshes : [errorFocusMesh];
      }
      
      // Sinon, chercher tous les meshes qui ont "camera" dans leur hiérarchie
      const cameraMeshes = [];
      outlineMeshes.forEach((mesh) => {
        let current = mesh;
        let depth = 0;
        while (current && current.parent && depth < 10) {
          const parentName = (current.parent.name || '').toLowerCase();
          const currentName = (current.name || '').toLowerCase();
          if (parentName.includes('camera') || currentName.includes('camera')) {
            cameraMeshes.push(mesh);
            break;
          }
          current = current.parent;
          depth++;
        }
      });

      console.log(`📷 Found ${cameraMeshes.length} camera mesh(es) via name matching`);
      return cameraMeshes.length > 0 ? cameraMeshes : [errorFocusMesh];
    }

    // Sinon, retourner juste le mesh en erreur
    console.log('⚠️ Error mesh is not part of camera, highlighting only the error mesh');
    return [errorFocusMesh];
  }, [errorFocusMesh, robotRef, outlineMeshes]);

  return (
    <>
      {/* Fog for fade out effect */}
      <fog attach="fog" args={['#fdfcfa', 1, scene.fogDistance]} />
      
      {/* Three-point lighting setup */}
      <ambientLight intensity={lighting.ambient} />
      
      {/* Key Light - Lumière principale (avant-droite, en hauteur) */}
      <directionalLight 
        position={[2, 4, 2]} 
        intensity={lighting.keyIntensity} 
        castShadow 
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      {/* Fill Light - Lumière de remplissage (avant-gauche, plus douce) */}
      <directionalLight 
        position={[-2, 2, 1.5]} 
        intensity={lighting.fillIntensity}
      />
      
      {/* Back/Rim Light - Lumière arrière (pour la séparation) */}
      <directionalLight 
        position={[0, 3, -2]} 
        intensity={lighting.rimIntensity}
        color="#FFB366"
      />
      
      {/* Floor grid - Using primitive with Three.js GridHelper */}
      {!hideGrid && scene.showGrid && <primitive object={gridHelper} position={[0, 0, 0]} />}
      
      <URDFRobot 
        headPose={headPose} 
        yawBody={yawBody} 
        antennas={antennas}
        isActive={isActive} 
        isTransparent={isTransparent}
        cellShading={cellShading}
        xrayOpacity={xraySettings.opacity}
        onMeshesReady={setOutlineMeshes}
        onRobotReady={setRobotRef}
        forceLoad={forceLoad}
      />
      
      {/* Effet de scan pendant le chargement */}
      {showScanEffect && (
        <ScanEffect 
          meshes={outlineMeshes}
          scanColor="#FF9500"
          enabled={true}
          onComplete={onScanComplete}
          onScanMesh={onScanMesh}
        />
      )}
      
      {/* Effet de mise en évidence en cas d'erreur */}
      {errorFocusMesh && (
        <ErrorHighlight 
          errorMesh={errorFocusMesh}
          errorMeshes={errorMeshes}
          allMeshes={outlineMeshes}
          errorColor="#ff0000"
          enabled={true}
        />
      )}
      
      {/* Caméra : 3 modes possibles */}
      {useHeadFollowCamera ? (
        <>
          {/* Mode 1 : Caméra qui suit la tête (ActiveRobotView) */}
          <HeadFollowCamera
            robot={robotRef}
            offset={[0, 0, 0.25]}
            fov={cameraConfig.fov || 50}
            lookAtOffset={[0, 0, 0]}
            enabled={true}
            lockToOrientation={lockCameraToHead}
          />
          
          {/* OrbitControls uniquement en mode unlocked */}
          {!lockCameraToHead && (
            <OrbitControls 
              enablePan={false}
              enableRotate={true}
              enableZoom={false} // ✅ Désactiver le zoom
              enableDamping={true}
              dampingFactor={0.05}
              target={cameraConfig.target || [0, 0.2, 0]}
              // ✅ Pas de contraintes d'angle = rotation libre à 360°
            />
          )}
        </>
      ) : useCinematicCamera ? (
        // Mode 2 : Caméra animée verticalement (StartingView scan)
        <CinematicCamera
          initialPosition={cameraConfig.position || [0, 0.22, 0.35]}
          target={cameraConfig.target || [0, 0.12, 0]}
          fov={cameraConfig.fov || 55}
          enabled={true}
          errorFocusMesh={errorFocusMesh}
        />
      ) : (
        // Mode 3 : OrbitControls manuel (défaut) - Rotation libre sans zoom
        <OrbitControls 
          enablePan={false}
          enableRotate={true}
          enableZoom={false} // ✅ Désactiver le zoom
          enableDamping={true}
          dampingFactor={0.05}
          target={cameraConfig.target || [0, 0.2, 0]}
          // ✅ Pas de contraintes d'angle = rotation libre à 360°
        />
      )}
      
      {/* Effets visuels de particules (sleep, love, etc.) */}
      {!hideEffects && activeEffect && (
        <ParticleEffect
          type={activeEffect}
          spawnPoint={headPosition}
          particleCount={6}
          enabled={true}
          duration={4.0}
        />
      )}
    </>
  );
}

