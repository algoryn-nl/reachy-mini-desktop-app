import { useEffect, useState, useRef, useCallback } from 'react';
import { Html, Line } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Détermine le groupe/composant d'un mesh basé sur son nom réel
 */
function getComponentGroup(mesh) {
  const meshName = (mesh.name || '').toLowerCase();
  const materialName = (mesh.userData.materialName || mesh.material?.name || '').toLowerCase();
  
  // Vérifier les userData d'abord (plus fiable)
  if (mesh.userData.isAntenna) {
    return 'ANTENNA';
  }
  
  // Vérifier les lentilles par matériau
  if (materialName.includes('big_lens') || materialName.includes('lens_d40')) {
    return 'OPTICAL LENS';
  }
  if (materialName.includes('small_lens') || materialName.includes('lens_d30')) {
    return 'CAMERA LENS';
  }
  
  // Remonter la hiérarchie pour trouver le groupe parent
  let currentParent = mesh.parent;
  let depth = 0;
  while (currentParent && depth < 5) {
    const pName = (currentParent.name || '').toLowerCase();
    
    // Groupes principaux basés sur les noms de liens URDF
    if (pName.includes('xl_330') || pName.includes('camera') || meshName.includes('xl_330') || meshName.includes('camera')) {
      return 'CAMERA MODULE';
    }
    if (pName.includes('head') || pName.includes('stewart') || meshName.includes('head') || meshName.includes('stewart')) {
      return 'HEAD ASSEMBLY';
    }
    if (pName.includes('arm') || pName.includes('shoulder') || meshName.includes('arm') || meshName.includes('shoulder')) {
      return 'ARM JOINT';
    }
    if (pName.includes('base') || pName.includes('body') || pName.includes('yaw_body') || meshName.includes('base') || meshName.includes('body')) {
      return 'BASE UNIT';
    }
    
    currentParent = currentParent.parent;
    depth++;
  }
  
  return null;
}

/**
 * Composant d'annotations simplifié pour le scan
 * Affiche UN label par groupe de composants (évite le spam)
 */
export default function ScanAnnotations({ 
  enabled = true,
  currentScannedMesh = null,
}) {
  const { camera } = useThree();
  const [annotation, setAnnotation] = useState(null);
  const currentGroupRef = useRef(null); // Track le groupe actuel pour éviter les changements répétés
  const annotationDataRef = useRef(null); // Stocke les données de base de l'annotation (meshPosition, componentName)

  // ✅ Fonction pour calculer la position du texte sur les bords de l'écran
  const updateAnnotationPosition = useCallback((meshPosition, componentName) => {
    // Projeter la position du composant sur l'écran pour déterminer le côté
    const vector = meshPosition.clone().project(camera);
    
    // Si le composant est à gauche du centre de l'écran (x < 0) → texte à droite (bord droit)
    // Si le composant est à droite du centre de l'écran (x > 0) → texte à gauche (bord gauche)
    // On inverse pour que le texte soit toujours sur le côté opposé, jamais au-dessus
    const isRightSide = vector.x > 0;
    
    // Calculer la position du texte sur les côtés (jamais au-dessus)
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    
    // Vecteur droit de la caméra dans l'espace monde
    const cameraRight = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();
    const cameraUp = new THREE.Vector3(0, 1, 0);
    
    camera.getWorldDirection(cameraForward);
    cameraRight.crossVectors(cameraUp, cameraForward).normalize();
    
    // Distance sur les côtés (réduite pour rester visible à l'écran)
    const sideDistance = 0.08;
    
    // Position du texte : légèrement plus haut et décalé horizontalement selon la caméra
    const horizontalOffset = isRightSide ? -sideDistance : sideDistance;
    const verticalOffset = 0.02; // Légèrement plus haut pour créer un trait penché
    
    // Point de départ de la ligne (position de base)
    const lineStartPos = new THREE.Vector3(
      meshPosition.x + (cameraRight.x * horizontalOffset),
      meshPosition.y + verticalOffset,
      meshPosition.z + (cameraRight.z * horizontalOffset)
    );
    
    // Offset horizontal pour séparer le texte du début de la ligne
    const textToLineOffset = isRightSide ? -0.011 : 0.011; // Texte décalé vers l'extérieur
    
    // Position du texte : décalé horizontalement pour créer l'offset avec la ligne
    // Le texte commence après le début de la ligne
    const textPos = new THREE.Vector3(
      lineStartPos.x + (cameraRight.x * textToLineOffset),
      lineStartPos.y + 0.001,
      lineStartPos.z + (cameraRight.z * textToLineOffset)
    );
    
    // Ajuster la position Y de la ligne pour qu'elle parte du bas du texte
    const textHeight = 0.012; // Hauteur approximative du texte en unités 3D
    lineStartPos.y = textPos.y - textHeight / 2; // Aligner avec le bas du texte

    setAnnotation({
      componentName,
      meshPosition: meshPosition.clone(),
      textPosition: textPos,
      lineStartPosition: lineStartPos, // Point de départ de la ligne (séparé du texte)
      alignLeft: isRightSide, // Si composant à droite → texte aligné à gauche (bord gauche)
    });
  }, [camera]);

  useEffect(() => {
    if (!enabled || !currentScannedMesh) {
      setAnnotation(null);
      currentGroupRef.current = null;
      annotationDataRef.current = null; // ✅ Nettoyer aussi les données
      return;
    }

    const mesh = currentScannedMesh;
    
    // Ne pas annoter les outline meshes ou les coques
    if (mesh.userData.isOutline || mesh.userData.isShellPiece) {
      return; // Ne pas réinitialiser l'annotation si on passe sur un mesh ignoré
    }

    // Déterminer le groupe du mesh
    const componentGroup = getComponentGroup(mesh);
    
    if (!componentGroup) {
      return; // Pas de groupe identifié, ne pas afficher d'annotation
    }

    // ✅ Ne mettre à jour l'annotation QUE si le groupe change
    if (currentGroupRef.current === componentGroup) {
      return; // Même groupe, pas besoin de changer l'annotation
    }

    // Nouveau groupe détecté
    currentGroupRef.current = componentGroup;
    console.log('🔍 ScanAnnotations: new group', componentGroup, mesh.name);

    // Calculer la position du mesh
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    
    // Calculer la bounding box pour trouver le point le plus haut
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }
    const bbox = mesh.geometry.boundingBox;
    const topPoint = new THREE.Vector3(
      (bbox.min.x + bbox.max.x) / 2,
      bbox.max.y,
      (bbox.min.z + bbox.max.z) / 2
    );
    topPoint.applyMatrix4(mesh.matrixWorld);

    // ✅ Déterminer le meilleur côté pour le texte selon la position de la caméra
    // Approche simple et efficace : utiliser le produit vectoriel pour déterminer
    // si le composant est à gauche ou droite du centre par rapport à la caméra
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    
    // Vecteurs dans l'espace caméra
    const cameraToMesh = new THREE.Vector3().subVectors(topPoint, cameraPos);
    const cameraToCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, topPoint.y, 0), cameraPos);
    
    // Produit vectoriel pour déterminer le côté (dans le plan horizontal)
    const cross = new THREE.Vector3().crossVectors(cameraToMesh, cameraToCenter);
    
    // Si cross.y > 0, le composant est à droite du centre (vu de la caméra)
    // On place le texte à gauche pour éviter qu'il soit caché par le robot central
    const isRightSide = cross.y > 0;
    
    // Position du texte : toujours à l'opposé du centre pour éviter le chevauchement
    const horizontalOffset = isRightSide ? -0.08 : 0.08; // Négatif = gauche, Positif = droite
    const textOffset = new THREE.Vector3(horizontalOffset, 0.05, 0);
    const textPos = topPoint.clone().add(textOffset);

    // Stocker les données de base pour recalcul dynamique
    annotationDataRef.current = {
      componentName: componentGroup,
      meshPosition: topPoint.clone(),
    };

    // Calculer la position initiale
    updateAnnotationPosition(topPoint, componentGroup);

    return () => {
      // Ne pas réinitialiser ici, on garde l'annotation jusqu'au prochain groupe
    };
  }, [enabled, currentScannedMesh?.uuid, updateAnnotationPosition]);

  // ✅ Mettre à jour la position du texte quand la caméra bouge
  useFrame(() => {
    if (!annotationDataRef.current) return;
    
    // Recalculer la position selon la caméra actuelle
    updateAnnotationPosition(
      annotationDataRef.current.meshPosition,
      annotationDataRef.current.componentName
    );
  });

  if (!enabled || !annotation) return null;

  return (
    <>
      {/* Ligne diagonale futuriste pointant vers le composant */}
      <Line
        points={[
          annotation.lineStartPosition ? annotation.lineStartPosition.toArray() : annotation.textPosition.toArray(),
          annotation.meshPosition.toArray(),
        ]}
        color="#22c55e"
        lineWidth={1.2}
        dashed={false}
        opacity={0.9}
        renderOrder={9999}
        depthTest={false}
      />
      
      {/* Texte sans boîte, style futuriste, toujours sur les côtés */}
      <Html
        position={annotation.textPosition.toArray()}
        distanceFactor={0.35}
        center={false}
        occlude={false}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: '700',
            color: '#22c55e',
            whiteSpace: 'nowrap',
            // ✅ Aligner selon le côté : gauche si composant à droite, droite si composant à gauche
            // Transform ajusté pour que la ligne parte du bas du texte
            transform: annotation.alignLeft 
              ? 'translate(0, 0)' // Aligné à gauche, bas du texte à la position
              : 'translate(-100%, 0)', // Aligné à droite, bas du texte à la position
            textShadow: '0 0 6px rgba(34, 197, 94, 0.9), 0 0 3px rgba(34, 197, 94, 0.7)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            opacity: 0.9,
            zIndex: 9999,
            position: 'relative',
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: annotation.alignLeft ? 'left' : 'right',
          }}
        >
          {annotation.componentName}
        </div>
      </Html>
    </>
  );
}
