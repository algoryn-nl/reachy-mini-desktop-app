import { useEffect } from 'react';
import * as THREE from 'three';
import { DAEMON_CONFIG } from '../../../config/daemon';

/**
 * Effet de scan progressif des meshes du robot
 * Change le shading de chaque mesh un par un avec timing déterministe
 */
export default function ScanEffect({ 
  meshes = [], // Liste des meshes à scanner
  scanColor = '#00ffff', // Couleur pendant le scan
  enabled = true,
  onComplete = null,
  onScanMesh = null, // Callback appelé pour chaque mesh scanné (mesh, index, total)
}) {
  useEffect(() => {
    if (!enabled || meshes.length === 0) return;

    // ⚡ Durée du scan lue depuis la config centrale
    const duration = DAEMON_CONFIG.ANIMATIONS.SCAN_DURATION / 1000;

    console.log(`🔍 Starting progressive scan of ${meshes.length} meshes (duration: ${duration}s)`);
    
    // Sauvegarder l'état X-ray de chaque mesh
    const originalStates = new Map();
    meshes.forEach((mesh) => {
      if (mesh.material) {
        originalStates.set(mesh, {
          transparent: mesh.material.transparent,
          opacity: mesh.material.opacity,
          depthWrite: mesh.material.depthWrite,
          side: mesh.material.side,
          color: mesh.material.color ? mesh.material.color.clone() : null,
        });
        mesh.userData.scanned = false;
      }
    });

    // ✅ Filtrer les coques ET les outline meshes
    const scannableMeshes = meshes.filter(mesh => !mesh.userData.isShellPiece && !mesh.userData.isOutline);
    
    const shellCount = meshes.length - scannableMeshes.length;
    console.log(`🔍 Scanning ${scannableMeshes.length}/${meshes.length} meshes (${shellCount} shell pieces excluded)`);
    
    const sortedMeshes = [...scannableMeshes].sort((a, b) => {
      // Calculer la position Y globale de chaque mesh
      const posA = new THREE.Vector3();
      const posB = new THREE.Vector3();
      a.getWorldPosition(posA);
      b.getWorldPosition(posB);
      
      // Trier de bas en haut
      return posA.y - posB.y;
    });
    
    // ⚡ Calculer le délai pour que le DERNIER mesh démarre exactement à la fin de duration
    // On divise par (n-1) pour que index_max × delay = duration
    const delayBetweenMeshes = scannableMeshes.length > 1
      ? (duration * 1000) / (scannableMeshes.length - 1) 
      : 0;
    let scannedCount = 0;
    const timeouts = [];

    // Scanner chaque mesh un par un (de bas en haut)
    sortedMeshes.forEach((mesh, index) => {
      // ⚡ Délai fixe et déterministe (pas de random)
      const delay = delayBetweenMeshes * index;
      
      const scanTimeout = setTimeout(() => {
        if (!mesh.material) return;
        
        // ✅ Notifier qu'on commence à scanner ce mesh
        if (onScanMesh) {
          onScanMesh(mesh, index + 1, scannableMeshes.length);
        }
        
        const originalState = originalStates.get(mesh);
        
        // ✨ ANIMATION SMOOTH avec fade
        const highlightDuration = 400; // Durée totale du highlight en ms
        const startTime = Date.now();
        
        // Animation frame pour un effet fluide
        const animate = () => {
          if (!mesh.material) return;
          
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / highlightDuration, 1.0);
          
          // ✨ Pulse: augmente puis diminue (forme de cloche)
          const pulse = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
          
          // ✨ OPACITÉ: Fade in puis fade out
          if (progress < 0.3) {
            // Fade in rapide (0-30% du temps)
            const fadeInProgress = progress / 0.3;
            mesh.material.transparent = false;
            mesh.material.opacity = 0.3 + (fadeInProgress * 0.7);
            mesh.material.depthWrite = true;
            mesh.material.side = THREE.FrontSide;
            
            if (mesh.material.color) {
              mesh.material.color.set(scanColor);
            }
          } else {
            // Fade out progressif (30-100% du temps)
            const fadeOutProgress = (progress - 0.3) / 0.7;
            const targetOpacity = originalState.opacity || 0.15;
            mesh.material.opacity = 1.0 - (fadeOutProgress * (1.0 - targetOpacity));
            
            // Transition couleur vers X-ray
            if (mesh.material.color && originalState.color) {
              mesh.material.color.lerpColors(
                new THREE.Color(scanColor),
                originalState.color,
                fadeOutProgress
              );
            }
            
            // Restaurer progressivement les états X-ray
            if (fadeOutProgress > 0.8) {
              mesh.material.transparent = originalState.transparent;
              mesh.material.depthWrite = originalState.depthWrite;
              mesh.material.side = originalState.side;
            }
          }
          
          // ✨ EMISSIVE: Pulse lumineux
          if (mesh.material.emissive !== undefined) {
            const emissiveIntensity = pulse * 2.0; // 0 -> 2 -> 0
            mesh.material.emissive = new THREE.Color(scanColor);
            if (mesh.material.emissiveIntensity !== undefined) {
              mesh.material.emissiveIntensity = emissiveIntensity;
            }
          }
          
          mesh.material.needsUpdate = true;
          
          // Continuer l'animation ou terminer
          if (progress < 1.0) {
            const frameId = requestAnimationFrame(animate);
            timeouts.push(() => cancelAnimationFrame(frameId));
          } else {
            // ✅ Animation terminée - restaurer état final
            if (originalState.color && mesh.material.color) {
              mesh.material.color.copy(originalState.color);
            }
            
            if (mesh.material.emissive !== undefined) {
              mesh.material.emissive.set(0x000000);
              if (mesh.material.emissiveIntensity !== undefined) {
                mesh.material.emissiveIntensity = 0;
              }
            }
            
            mesh.material.transparent = originalState.transparent;
            mesh.material.opacity = originalState.opacity;
            mesh.material.depthWrite = originalState.depthWrite;
            mesh.material.side = originalState.side;
            mesh.material.needsUpdate = true;
            
            mesh.userData.scanned = true;
            
            // Vérifier si tous les meshes scannables sont scannés
            scannedCount++;
            if (scannedCount === scannableMeshes.length) {
              // ✅ Tous les meshes sont scannés - forcer la restauration finale
              console.log('✅ All meshes scanned, forcing final restoration');
              
              // Petit délai pour s'assurer que toutes les animations sont terminées
              setTimeout(() => {
                scannableMeshes.forEach((m) => {
                  const state = originalStates.get(m);
                  if (state && m.material) {
                    if (state.color && m.material.color) {
                      m.material.color.copy(state.color);
                    }
                    if (m.material.emissive !== undefined) {
                      m.material.emissive.set(0x000000);
                      if (m.material.emissiveIntensity !== undefined) {
                        m.material.emissiveIntensity = 0;
                      }
                    }
                    m.material.transparent = state.transparent;
                    m.material.opacity = state.opacity;
                    m.material.depthWrite = state.depthWrite;
                    m.material.side = state.side;
                    m.material.needsUpdate = true;
                  }
                });
              }, 100);
              
              if (onComplete) {
                onComplete();
              }
            }
          }
        };
        
        // Démarrer l'animation
        animate();
      }, delay); // ⚡ Délai fixe
      
      timeouts.push(scanTimeout);
    });

    // Cleanup au démontage
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout) || clearInterval(timeout));
      
      // Restaurer tous les états au cleanup
      meshes.forEach((mesh) => {
        const state = originalStates.get(mesh);
        if (state && mesh.material) {
          if (state.color && mesh.material.color) {
            mesh.material.color.copy(state.color);
          }
          if (mesh.material.emissive !== undefined) {
            mesh.material.emissive.set(0x000000);
            if (mesh.material.emissiveIntensity !== undefined) {
              mesh.material.emissiveIntensity = 0;
            }
          }
          mesh.material.transparent = state.transparent;
          mesh.material.opacity = state.opacity;
          mesh.material.depthWrite = state.depthWrite;
          mesh.material.side = state.side;
          mesh.material.needsUpdate = true;
        }
      });
    };
  }, [enabled, meshes, scanColor, onComplete, onScanMesh]);

  return null; // Pas de rendu visuel, juste la logique
}

