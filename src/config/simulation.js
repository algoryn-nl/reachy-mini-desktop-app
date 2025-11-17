/**
 * Configuration et utilitaires pour le mode simulation
 * 
 * Le mode simulation permet de bypasser la détection USB et de démarrer
 * le daemon directement en mode simulation (Mujoco) pour le développement.
 * 
 * Activation:
 * - Variable d'environnement: REACHY_SIMULATION_MODE=true
 * - Ou via Tauri: window.__TAURI__.env.REACHY_SIMULATION_MODE === 'true'
 */

/**
 * Détecte si le mode simulation est activé
 * @returns {boolean} true si le mode simulation est activé
 */
export function isSimulationModeEnabled() {
  // En mode Tauri, vérifier la variable d'environnement
  if (typeof window !== 'undefined' && window.__TAURI__) {
    try {
      // Tauri expose les variables d'environnement via window.__TAURI__.env
      // Mais pour l'instant, on utilise une approche plus simple avec localStorage
      // qui peut être set via la ligne de commande ou l'UI
      const envValue = localStorage.getItem('REACHY_SIMULATION_MODE');
      return envValue === 'true';
    } catch (e) {
      console.warn('Could not check simulation mode:', e);
      return false;
    }
  }
  
  // En mode navigateur (dev), vérifier localStorage ou URL params
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sim') === 'true') {
      return true;
    }
    const envValue = localStorage.getItem('REACHY_SIMULATION_MODE');
    return envValue === 'true';
  }
  
  return false;
}

/**
 * Active le mode simulation (persiste dans localStorage)
 */
export function enableSimulationMode() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('REACHY_SIMULATION_MODE', 'true');
    console.log('🎮 Simulation mode enabled');
  }
}

/**
 * Désactive le mode simulation
 */
export function disableSimulationMode() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('REACHY_SIMULATION_MODE');
    console.log('🎮 Simulation mode disabled');
  }
}

/**
 * Configuration par défaut pour le mode simulation
 */
export const SIMULATION_CONFIG = {
  // Port USB simulé (pour l'affichage dans l'UI)
  SIMULATED_USB_PORT: 'sim://mujoco',
  
  // Indique si le mode simulation est actif
  isEnabled: isSimulationModeEnabled(),
};

