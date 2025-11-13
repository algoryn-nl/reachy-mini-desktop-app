import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * Effet de mise en évidence d'un ou plusieurs meshes en erreur
 * Change la couleur des meshes en rouge avec une animation pulsante
 */
export default function ErrorHighlight({ 
  errorMesh = null, // Mesh unique en erreur (legacy)
  errorMeshes = null, // Liste de meshes en erreur (nouveau)
  allMeshes = [],
  errorColor = '#ff0000',
  enabled = true,
}) {
  useEffect(() => {
    // Déterminer la liste des meshes en erreur
    const errorMeshesList = errorMeshes || (errorMesh ? [errorMesh] : []);
    
    if (!enabled) {
      console.log('⚠️ ErrorHighlight disabled');
      return;
    }
    
    if (errorMeshesList.length === 0) {
      console.log('⚠️ ErrorHighlight: No error meshes provided');
      return;
    }
    
    if (allMeshes.length === 0) {
      console.log('⚠️ ErrorHighlight: No meshes available');
      return;
    }

    console.log(`🔴 ErrorHighlight: Highlighting ${errorMeshesList.length} error mesh(es) out of ${allMeshes.length} total meshes`);
    console.log('🔴 Error meshes:', errorMeshesList.map(m => ({ name: m.name, uuid: m.uuid })));

    // Sauvegarder les états originaux de TOUS les meshes
    const originalStates = new Map();

    // Créer un Set des UUIDs des meshes en erreur pour une comparaison plus fiable
    const errorMeshUuids = new Set(errorMeshesList.map(m => m.uuid));
    let highlightedCount = 0;
    
    allMeshes.forEach((mesh) => {
      if (!mesh.material) {
        console.warn('⚠️ Mesh without material:', mesh.name);
        return;
      }
      
      // Vérifier si le matériau a les propriétés nécessaires
      const hasEmissive = mesh.material.emissive !== undefined;
      
      originalStates.set(mesh, {
        color: mesh.material.color ? mesh.material.color.getHex() : null,
        emissive: hasEmissive ? mesh.material.emissive.getHex() : null,
        emissiveIntensity: mesh.material.emissiveIntensity,
        transparent: mesh.material.transparent,
        opacity: mesh.material.opacity,
        depthWrite: mesh.material.depthWrite,
        side: mesh.material.side,
        gradientMap: mesh.material.gradientMap,
      });

      // Vérifier si ce mesh est en erreur (par référence OU par UUID)
      const isErrorMesh = errorMeshesList.includes(mesh) || errorMeshUuids.has(mesh.uuid);
      
      if (isErrorMesh) {
        // ✅ MESH EN ERREUR : Rouge vif opaque
        highlightedCount++;
        mesh.userData.isErrorMesh = true;
        if (mesh.material.color) {
          mesh.material.color.set(errorColor);
        }
        if (hasEmissive) {
          mesh.material.emissive.set(errorColor);
          mesh.material.emissiveIntensity = 3.5;
        }
        mesh.material.transparent = false;
        mesh.material.opacity = 1.0;
        mesh.material.depthWrite = true;
        mesh.material.side = THREE.FrontSide;
        mesh.material.gradientMap = null;
        console.log(`🔴 Highlighted error mesh: ${mesh.name || mesh.uuid}`);
      } else {
        // ⚪ AUTRES MESHES : Très transparents (presque invisibles)
        mesh.material.transparent = true;
        mesh.material.opacity = 0.05;
        mesh.material.depthWrite = false;
        mesh.material.side = THREE.DoubleSide;
        if (hasEmissive) {
          mesh.material.emissive.set(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      }
      
      mesh.material.needsUpdate = true;
    });

    console.log(`🔴 ErrorHighlight complete: ${highlightedCount} mesh(es) highlighted, ${allMeshes.length - highlightedCount} dimmed to 5% opacity`);

    // Cleanup : restaurer les états originaux de TOUS les meshes
    return () => {
      allMeshes.forEach((mesh) => {
        const state = originalStates.get(mesh);
        if (state && mesh.material) {
          if (state.color !== null && mesh.material.color) {
            mesh.material.color.setHex(state.color);
          }
          if (state.emissive !== null && mesh.material.emissive) {
            mesh.material.emissive.setHex(state.emissive);
            mesh.material.emissiveIntensity = state.emissiveIntensity;
          }
          mesh.material.transparent = state.transparent;
          mesh.material.opacity = state.opacity;
          mesh.material.depthWrite = state.depthWrite;
          mesh.material.side = state.side;
          mesh.material.gradientMap = state.gradientMap;
          mesh.material.needsUpdate = true;
          
          // Retirer le flag d'erreur
          if (mesh.userData.isErrorMesh) {
            delete mesh.userData.isErrorMesh;
          }
        }
      });
      console.log('🔄 All meshes restored to original state');
    };
  }, [enabled, errorMesh, errorMeshes, allMeshes, errorColor]);

  return null; // Pas de rendu visuel, juste la logique
}

