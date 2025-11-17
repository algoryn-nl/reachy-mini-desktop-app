import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import useAppStore from '../store/useAppStore';

/**
 * Hook pour écouter les erreurs du sidecar et détecter des erreurs spécifiques
 * comme l'absence de MuJoCo en mode simulation
 */
export const useSidecarErrors = () => {
  const { setStartupError, setHardwareError } = useAppStore();
  const [mujocoError, setMujocoError] = useState(false);

  useEffect(() => {
    let stderrListener = null;
    let stdoutListener = null;

    const setupListeners = async () => {
      // Skip if not in Tauri environment
      if (typeof window === 'undefined' || !window.__TAURI__) {
        return;
      }

      try {
        // Écouter les erreurs stderr du sidecar
        stderrListener = await listen('sidecar-stderr', (event) => {
          const errorMessage = event.payload;
          
          // Détecter l'erreur MuJoCo spécifique
          if (typeof errorMessage === 'string') {
            if (errorMessage.includes('MuJoCo is not installed') || 
                errorMessage.includes('mujoco') && errorMessage.includes('not available')) {
              console.error('🎮 MuJoCo error detected:', errorMessage);
              setMujocoError(true);
              
              // Créer un message d'erreur clair et utile
              const mujocoErrorMsg = 'MuJoCo is not installed. To use simulation mode, please install MuJoCo dependencies:\n\npip install reachy_mini[mujoco]';
              setStartupError(mujocoErrorMsg);
              setHardwareError(null); // Pas une erreur hardware
            }
            
            // Détecter d'autres erreurs critiques
            if (errorMessage.includes('Application startup failed') && !mujocoError) {
              // Ne pas écraser l'erreur MuJoCo si elle est déjà détectée
              console.error('❌ Daemon startup failed:', errorMessage);
            }
          }
        });

        // Écouter aussi stdout pour détecter des patterns d'erreur
        stdoutListener = await listen('sidecar-stdout', (event) => {
          const output = event.payload;
          
          // Parfois les erreurs peuvent apparaître dans stdout
          if (typeof output === 'string') {
            if (output.includes('MuJoCo is not installed') || 
                output.includes('mujoco') && output.includes('not available')) {
              console.error('🎮 MuJoCo error detected in stdout:', output);
              setMujocoError(true);
              
              const mujocoErrorMsg = 'MuJoCo is not installed. To use simulation mode, please install MuJoCo dependencies:\n\npip install reachy_mini[mujoco]';
              setStartupError(mujocoErrorMsg);
              setHardwareError(null);
            }
          }
        });
      } catch (error) {
        console.warn('Could not setup sidecar error listeners:', error);
      }
    };

    setupListeners();

    // Cleanup
    return () => {
      if (stderrListener) {
        stderrListener();
      }
      if (stdoutListener) {
        stdoutListener();
      }
    };
  }, [setStartupError, setHardwareError, mujocoError]);

  return {
    mujocoError,
    clearMujocoError: () => setMujocoError(false),
  };
};

