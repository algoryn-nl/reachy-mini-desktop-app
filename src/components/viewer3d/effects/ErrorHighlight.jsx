import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * Effect to highlight one or more error meshes
 * Changes mesh color to red with pulsating animation
 */
export default function ErrorHighlight({ 
  errorMesh = null, // Single error mesh (legacy)
  errorMeshes = null, // List of error meshes (new)
  allMeshes = [],
  errorColor = '#ff0000',
  enabled = true,
}) {
  useEffect(() => {
    // Determine the list of error meshes
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

    // Save original states of ALL meshes
    const originalStates = new Map();

    // Create a Set of UUIDs for error meshes for more reliable comparison
    const errorMeshUuids = new Set(errorMeshesList.map(m => m.uuid));
    let highlightedCount = 0;
    
    allMeshes.forEach((mesh) => {
      if (!mesh.material) {
        console.warn('⚠️ Mesh without material:', mesh.name);
        return;
      }
      
      // Check if material has required properties
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

      // Check if this mesh is an error mesh (by reference OR by UUID)
      const isErrorMesh = errorMeshesList.includes(mesh) || errorMeshUuids.has(mesh.uuid);
      
      if (isErrorMesh) {
        // ✅ ERROR MESH: Bright red opaque
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
        // ⚪ OTHER MESHES: Very transparent (almost invisible)
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

    // Cleanup: restore original states of ALL meshes
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
          
          // Remove error flag
          if (mesh.userData.isErrorMesh) {
            delete mesh.userData.isErrorMesh;
          }
        }
      });
      console.log('🔄 All meshes restored to original state');
    };
  }, [enabled, errorMesh, errorMeshes, allMeshes, errorColor]);

  return null; // No visual rendering, just logic
}

