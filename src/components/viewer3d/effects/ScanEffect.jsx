import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DAEMON_CONFIG } from '../../../config/daemon';
import { createXrayMaterial, updateXrayMaterial } from '../utils/materials';

/**
 * Effet de scan AAA progressif des meshes du robot
 * Utilise les techniques X-ray améliorées avec rim lighting, bloom et transitions fluides
 */
export default function ScanEffect({ 
  meshes = [], // Liste des meshes à scanner
  scanColor = '#22c55e', // Couleur pendant le scan (vert success)
  enabled = true,
  onComplete = null,
  onScanMesh = null, // Callback appelé pour chaque mesh scanné (mesh, index, total)
}) {
  const isScanningRef = useRef(false);
  const timeoutsRef = useRef([]);
  const onScanMeshRef = useRef(onScanMesh);
  const onCompleteRef = useRef(onComplete);

  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onScanMeshRef.current = onScanMesh;
    onCompleteRef.current = onComplete;
  }, [onScanMesh, onComplete]);

  useEffect(() => {
    if (!enabled || meshes.length === 0) {
      isScanningRef.current = false;
      return;
    }

    // ✅ Éviter les scans multiples simultanés
    if (isScanningRef.current) {
      console.log('⚠️ Scan already in progress, skipping...');
      return;
    }

    isScanningRef.current = true;

    // ⚡ Durée du scan lue depuis la config centrale
    const duration = DAEMON_CONFIG.ANIMATIONS.SCAN_DURATION / 1000;

    console.log(`🔍 Starting progressive scan of ${meshes.length} meshes (duration: ${duration}s)`);
    
    // ✅ Sauvegarder l'état X-ray complet de chaque mesh (incluant les matériaux shader)
    const originalStates = new Map();
    meshes.forEach((mesh) => {
      if (mesh.material) {
        // Sauvegarder le matériau complet pour restauration
        originalStates.set(mesh, {
          material: mesh.material.clone ? mesh.material.clone() : mesh.material,
          transparent: mesh.material.transparent,
          opacity: mesh.material.opacity,
          depthWrite: mesh.material.depthWrite,
          side: mesh.material.side,
          color: mesh.material.color ? mesh.material.color.clone() : null,
          emissive: mesh.material.emissive ? mesh.material.emissive.clone() : null,
          // Sauvegarder les uniforms si c'est un shader material
          uniforms: mesh.material.uniforms ? JSON.parse(JSON.stringify(mesh.material.uniforms)) : null,
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
    
    // ✅ Nettoyer les timeouts précédents
    timeoutsRef.current.forEach(timeout => {
      if (typeof timeout === 'function') {
        timeout();
      } else {
        clearTimeout(timeout);
      }
    });
    timeoutsRef.current = [];

    // Scanner chaque mesh un par un (de bas en haut)
    sortedMeshes.forEach((mesh, index) => {
      // ⚡ Délai fixe et déterministe (pas de random)
      const delay = delayBetweenMeshes * index;
      
      const scanTimeout = setTimeout(() => {
        if (!mesh.material) return;
        
        // ✅ Notifier qu'on commence à scanner ce mesh
        if (onScanMeshRef.current) {
          onScanMeshRef.current(mesh, index + 1, scannableMeshes.length);
        }
        
        const originalState = originalStates.get(mesh);
        
        // ✅ Déterminer le type de matériau pour utiliser les bonnes couleurs X-ray
        const isAntenna = mesh.userData?.isAntenna || false;
        const isShellPiece = mesh.userData?.isShellPiece || false;
        const isBigLens = (mesh.userData?.materialName || mesh.material?.name || '').toLowerCase().includes('big_lens') ||
                         (mesh.userData?.materialName || mesh.material?.name || '').toLowerCase().includes('small_lens') ||
                         (mesh.userData?.materialName || mesh.material?.name || '').toLowerCase().includes('lens_d40') ||
                         (mesh.userData?.materialName || mesh.material?.name || '').toLowerCase().includes('lens_d30');
        
        // ✅ Couleur X-ray finale selon le type de matériau (même logique que getXrayMaterial)
        let targetXrayColor;
        if (isAntenna) {
          targetXrayColor = 0x5A6B7C; // Gris moyen-bleuté
        } else if (isBigLens) {
          targetXrayColor = 0x6B7B7A; // Gris clair-verdâtre
        } else if (isShellPiece) {
          targetXrayColor = 0x5A6570; // Gris moyen
        } else {
          const originalColor = mesh.userData?.originalColor || 0xFF9500;
          const r = (originalColor >> 16) & 0xFF;
          const g = (originalColor >> 8) & 0xFF;
          const b = originalColor & 0xFF;
          const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
          
          if (luminance > 200) targetXrayColor = 0x6B757D;
          else if (luminance > 150) targetXrayColor = 0x5A6570;
          else if (luminance > 100) targetXrayColor = 0x4A5560;
          else if (luminance > 50) targetXrayColor = 0x3A4550;
          else targetXrayColor = 0x2A3540;
        }
        
        // ✅ Opacité finale avec transparence accrue pour les pièces 3D imprimées
        const baseOpacity = originalState.opacity || 0.5;
        const finalOpacity = isShellPiece ? baseOpacity * 0.3 : baseOpacity;
        
        // ✨ ANIMATION AAA avec rim lighting et bloom
        const highlightDuration = 500; // Durée totale du highlight en ms (légèrement augmentée)
        const startTime = Date.now();
        
        // Animation frame pour un effet fluide AAA
        const animate = () => {
          if (!mesh.material) return;
          
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / highlightDuration, 1.0);
          
          // ✨ Phase 1: Scan intense (0-40% du temps)
          if (progress < 0.4) {
            const scanProgress = progress / 0.4;
            const pulse = Math.sin(scanProgress * Math.PI * 2); // Pulse rapide
            
            // Créer/appliquer le matériau de scan avec rim lighting intense (un par mesh)
            // ✅ Utiliser un vert plus foncé pour éviter le flash blanc
            if (!mesh.userData.scanMaterial) {
              const scanColorHex = new THREE.Color(scanColor).getHex();
              // Vert success plus foncé pour la phase de scan
              const darkGreenHex = new THREE.Color(scanColor).multiplyScalar(0.7).getHex();
              mesh.userData.scanMaterial = createXrayMaterial(darkGreenHex, {
                rimColor: scanColorHex, // Rim avec le vert success original
                rimPower: 1.5, // Rim plus prononcé pendant le scan
                rimIntensity: 0.6, // Rim moins intense pour éviter le flash
                opacity: 0.8, // Opacité réduite pour transition plus douce
                edgeIntensity: 0.4, // Bords visibles mais moins agressifs
                subsurfaceColor: darkGreenHex,
                subsurfaceIntensity: 0.25,
              });
            }
            mesh.material = mesh.userData.scanMaterial;
            
            // Pulse d'intensité du rim lighting (plus subtil)
            if (mesh.material.uniforms) {
              mesh.material.uniforms.rimIntensity.value = 0.6 + (pulse * 0.2); // 0.6 -> 0.8 -> 0.6
              mesh.material.uniforms.opacity.value = 0.75 + (pulse * 0.1); // Légère variation d'opacité
            }
            
            mesh.material.needsUpdate = true;
          }
          // ✨ Phase 2: Transition fluide vers X-ray (40-100% du temps)
          else {
            const transitionProgress = (progress - 0.4) / 0.6;
            const easeOut = 1 - Math.pow(1 - transitionProgress, 3); // Easing cubique
            
            // Créer le matériau X-ray final
            const rimColor = isAntenna ? 0x8A9AAC :
                           isBigLens ? 0x7A8A8A :
                           isShellPiece ? 0x7A8590 :
                           0x6A7580;
            
            const finalMaterial = createXrayMaterial(targetXrayColor, {
              rimColor: rimColor,
              rimPower: 2.0,
              rimIntensity: 0.25,
              opacity: finalOpacity,
              edgeIntensity: 0.2,
              subsurfaceColor: isAntenna ? 0x4A5A6C :
                               isBigLens ? 0x5A6A6A :
                               0x4A5560,
              subsurfaceIntensity: 0.15,
            });
            
            // Interpolation entre scan vert foncé et X-ray (transition vert -> gris)
            if (mesh.material.uniforms) {
              // ✅ Interpoler depuis un vert foncé (pas blanc) vers la couleur X-ray
              const darkGreenColor = new THREE.Color(scanColor).multiplyScalar(0.7); // Vert foncé
              const xrayColorVec = new THREE.Color(targetXrayColor);
              const lerpedColor = darkGreenColor.clone().lerp(xrayColorVec, easeOut);
              mesh.material.uniforms.baseColor.value.copy(lerpedColor);
              
              // Interpoler le rim color
              const scanRimColor = new THREE.Color(scanColor);
              const xrayRimColor = new THREE.Color(rimColor);
              const lerpedRimColor = scanRimColor.clone().lerp(xrayRimColor, easeOut);
              mesh.material.uniforms.rimColor.value.copy(lerpedRimColor);
              
              // Interpoler l'opacité
              mesh.material.uniforms.opacity.value = THREE.MathUtils.lerp(1.0, finalOpacity, easeOut);
              
              // Interpoler l'intensité du rim
              mesh.material.uniforms.rimIntensity.value = THREE.MathUtils.lerp(0.8, 0.25, easeOut);
              mesh.material.uniforms.edgeIntensity.value = THREE.MathUtils.lerp(0.5, 0.2, easeOut);
              
              // Interpoler subsurface color
              const scanSubsurfaceColor = new THREE.Color(scanColor).multiplyScalar(0.6);
              const xraySubsurfaceColor = new THREE.Color(
                isAntenna ? 0x4A5A6C :
                isBigLens ? 0x5A6A6A :
                0x4A5560
              );
              const lerpedSubsurfaceColor = scanSubsurfaceColor.clone().lerp(xraySubsurfaceColor, easeOut);
              mesh.material.uniforms.subsurfaceColor.value.copy(lerpedSubsurfaceColor);
              mesh.material.uniforms.subsurfaceIntensity.value = THREE.MathUtils.lerp(0.3, 0.15, easeOut);
          }
          
          mesh.material.needsUpdate = true;
            
            // À la fin de la transition, remplacer par le matériau X-ray final
            if (transitionProgress >= 0.95) {
              mesh.material = finalMaterial;
            }
          }
          
          // Continuer l'animation ou terminer
          if (progress < 1.0) {
            const frameId = requestAnimationFrame(animate);
            timeoutsRef.current.push(() => cancelAnimationFrame(frameId));
          } else {
            // ✅ Animation terminée - s'assurer que le matériau X-ray final est appliqué
            const rimColor = isAntenna ? 0x8A9AAC :
                           isBigLens ? 0x7A8A8A :
                           isShellPiece ? 0x7A8590 :
                           0x6A7580;
            
            const finalMaterial = createXrayMaterial(targetXrayColor, {
              rimColor: rimColor,
              rimPower: 2.0,
              rimIntensity: 0.25,
              opacity: finalOpacity,
              edgeIntensity: 0.2,
              subsurfaceColor: isAntenna ? 0x4A5A6C :
                               isBigLens ? 0x5A6A6A :
                               0x4A5560,
              subsurfaceIntensity: 0.15,
            });
            
            mesh.material = finalMaterial;
            mesh.material.needsUpdate = true;
            mesh.userData.scanned = true;
            
            // Vérifier si tous les meshes scannables sont scannés
            scannedCount++;
            if (scannedCount === scannableMeshes.length) {
              console.log('✅ All meshes scanned with AAA effect');
              isScanningRef.current = false; // ✅ Réinitialiser le flag
              
              if (onCompleteRef.current) {
                onCompleteRef.current();
              }
            }
          }
        };
        
        // Démarrer l'animation
        animate();
      }, delay); // ⚡ Délai fixe
      
      timeoutsRef.current.push(scanTimeout);
    });

    // Cleanup au démontage
    return () => {
      // Annuler tous les timeouts et animations en cours
      timeoutsRef.current.forEach(timeout => {
        if (typeof timeout === 'function') {
          timeout(); // Annuler les animations requestAnimationFrame
        } else {
          clearTimeout(timeout);
          clearInterval(timeout);
            }
      });
      timeoutsRef.current = [];
      isScanningRef.current = false;
      
      // Note: On ne restaure pas les matériaux car ils doivent rester en mode X-ray après le scan
      // Les matériaux X-ray finaux sont déjà appliqués à la fin de chaque animation
    };
  }, [enabled, meshes.length, scanColor]); // ✅ Utiliser meshes.length au lieu de meshes pour éviter les relances

  return null; // Pas de rendu visuel, juste la logique
}

