import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isSimulationModeEnabled, enableSimulationMode, disableSimulationMode, SIMULATION_CONFIG } from '../config/simulation';

/**
 * Hook pour gérer le mode simulation
 * 
 * Le mode simulation permet de:
 * - Bypasser la détection USB
 * - Démarrer le daemon directement en mode simulation (Mujoco)
 * - Développer sans avoir besoin du robot physique
 * 
 * @returns {object} État et fonctions pour gérer le mode simulation
 */
export const useSimulationMode = () => {
  const [isEnabled, setIsEnabled] = useState(() => {
    // Initialiser depuis la config (qui lit localStorage)
    return isSimulationModeEnabled();
  });
  const [isChecking, setIsChecking] = useState(false);

  // Vérifier le mode simulation depuis Rust au démarrage
  useEffect(() => {
    const checkSimulationMode = async () => {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        try {
          setIsChecking(true);
          const rustMode = await invoke('get_simulation_mode');
          
          // Si Rust dit que c'est activé, synchroniser localStorage
          if (rustMode) {
            enableSimulationMode();
            setIsEnabled(true);
          } else {
            // Sinon, utiliser la valeur de localStorage
            const localMode = isSimulationModeEnabled();
            setIsEnabled(localMode);
          }
        } catch (e) {
          console.warn('Could not check simulation mode from Rust:', e);
          // Fallback sur localStorage
          setIsEnabled(isSimulationModeEnabled());
        } finally {
          setIsChecking(false);
        }
      } else {
        // En mode navigateur, utiliser localStorage uniquement
        setIsEnabled(isSimulationModeEnabled());
      }
    };

    checkSimulationMode();
  }, []);

  const enable = useCallback(() => {
    enableSimulationMode();
    setIsEnabled(true);
    console.log('🎮 Simulation mode enabled');
  }, []);

  const disable = useCallback(() => {
    disableSimulationMode();
    setIsEnabled(false);
    console.log('🎮 Simulation mode disabled');
  }, []);

  const toggle = useCallback(() => {
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [isEnabled, enable, disable]);

  return {
    isEnabled,
    isChecking,
    enable,
    disable,
    toggle,
    simulatedUsbPort: SIMULATION_CONFIG.SIMULATED_USB_PORT,
  };
};

