import { create } from 'zustand';

// Détecter la préférence système
const getSystemPreference = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Lire la préférence stockée
const getStoredPreference = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('darkMode');
  return stored ? JSON.parse(stored) : null;
};

// Déterminer le dark mode initial
const getInitialDarkMode = () => {
  const storedPreference = getStoredPreference();
  // Si l'utilisateur a une préférence stockée, l'utiliser
  if (storedPreference !== null) {
    console.log('🎨 Using stored dark mode preference:', storedPreference);
    return storedPreference;
  }
  // Sinon, utiliser la préférence système
  const systemPreference = getSystemPreference();
  console.log('🎨 Using system dark mode preference:', systemPreference);
  return systemPreference;
};

const useAppStore = create((set) => ({
  // ✨ État principal du robot (State Machine)
  // États possibles : 'disconnected', 'ready-to-start', 'starting', 'ready', 'busy', 'stopping', 'crashed'
  robotStatus: 'disconnected',
  
  // ✨ Raison si status === 'busy'
  // Valeurs possibles : null, 'moving', 'command', 'app-running', 'installing'
  busyReason: null,
  
  // États legacy (pour compatibilité backwards, mais seront dérivés)
  isActive: false,
  isStarting: false,
  isStopping: false,
  isTransitioning: false, // Transition entre scan et vue active (resize fenêtre)
  
  // Daemon metadata
  daemonVersion: null,
  startupError: null, // Erreur pendant le démarrage
  hardwareError: null, // Erreur hardware détectée pendant le scan
  isDaemonCrashed: false, // Daemon crashé/bloqué détecté
  consecutiveTimeouts: 0, // Compteur de timeouts consécutifs
  
  // Robot state
  isUsbConnected: false,
  usbPortName: null,
  isFirstCheck: true,
  
  // Logs
  logs: [],
  frontendLogs: [],
  
  // Activity Lock - Verrouillage global pour toutes les actions
  // isCommandRunning : quick actions en cours
  // isAppRunning : app en cours d'exécution
  // isInstalling : installation/désinstallation en cours
  // isBusy : helper computed (quick action OU app en cours OU installation)
  isCommandRunning: false,
  isAppRunning: false,
  isInstalling: false,
  currentAppName: null, // Nom de l'app en cours
  installingAppName: null, // Nom de l'app en cours d'installation
  installJobType: null, // Type de job : 'install' ou 'remove'
  installResult: null, // Résultat de l'installation : 'success', 'failed', null
  
  // Visual Effects (particules 3D)
  activeEffect: null, // Type d'effet actif ('sleep', 'love', etc.)
  effectTimestamp: 0, // Timestamp pour forcer le re-render
  
  // Theme (initialisé avec préférence système ou stockée)
  darkMode: getInitialDarkMode(),
  
  // Actions - Setter générique DRY
  update: (updates) => set(updates),
  
  // ✨ Actions de transition (State Machine)
  // Mettent à jour robotStatus + busyReason + états legacy (backwards compat)
  transitionTo: {
    disconnected: () => {
      console.log('🤖 [STATE] → disconnected');
      set({
        robotStatus: 'disconnected',
        busyReason: null,
        isActive: false,
        isStarting: false,
        isStopping: false,
        isCommandRunning: false,
        isAppRunning: false,
        isInstalling: false,
      });
    },
    
    readyToStart: () => {
      console.log('🤖 [STATE] → ready-to-start');
      set({
        robotStatus: 'ready-to-start',
        busyReason: null,
        isActive: false,
        isStarting: false,
        isStopping: false,
      });
    },
    
    starting: () => {
      console.log('🤖 [STATE] → starting');
      set({
        robotStatus: 'starting',
        busyReason: null,
        isActive: false,
        isStarting: true,
        isStopping: false,
      });
    },
    
    ready: () => {
      console.log('🤖 [STATE] → ready');
      set({
        robotStatus: 'ready',
        busyReason: null,
        isActive: true,
        isStarting: false,
        isStopping: false,
        isCommandRunning: false,
        isAppRunning: false,
        isInstalling: false,
      });
    },
    
    busy: (reason) => {
      console.log(`🤖 [STATE] → busy (${reason})`);
      set((state) => {
        const updates = {
          robotStatus: 'busy',
          busyReason: reason,
          isActive: true,
        };
        
        // Mettre à jour les flags legacy selon la raison
        if (reason === 'command') updates.isCommandRunning = true;
        if (reason === 'app-running') updates.isAppRunning = true;
        if (reason === 'installing') updates.isInstalling = true;
        
        return updates;
      });
    },
    
    stopping: () => {
      console.log('🤖 [STATE] → stopping');
      set({
        robotStatus: 'stopping',
        busyReason: null,
        isActive: false,
        isStopping: true,
      });
    },
    
    crashed: () => {
      console.log('🤖 [STATE] → crashed');
      set({
        robotStatus: 'crashed',
        busyReason: null,
        isActive: false,
        isDaemonCrashed: true,
      });
    },
  },
  
  // Helper pour vérifier si le robot est occupé (granularité fine)
  isBusy: () => {
    const state = useAppStore.getState();
    return state.robotStatus === 'busy' || state.isCommandRunning || state.isAppRunning || state.isInstalling;
  },
  
  // Helper global : le robot est-il prêt à recevoir des commandes ?
  // Utilisé partout dans l'UI pour verrouiller les interactions
  isReady: () => {
    const state = useAppStore.getState();
    return state.robotStatus === 'ready';
  },
  
  // ✨ Helper pour obtenir un status lisible (debug & UI)
  getRobotStatusLabel: () => {
    const state = useAppStore.getState();
    const { robotStatus, busyReason } = state;
    
    if (robotStatus === 'busy' && busyReason) {
      const reasonLabels = {
        'moving': 'Moving',
        'command': 'Executing Command',
        'app-running': 'Running App',
        'installing': 'Installing',
      };
      return reasonLabels[busyReason] || 'Busy';
    }
    
    const statusLabels = {
      'disconnected': 'Disconnected',
      'ready-to-start': 'Ready to Start',
      'starting': 'Starting',
      'ready': 'Ready',
      'busy': 'Busy',
      'stopping': 'Stopping',
      'crashed': 'Crashed',
    };
    
    return statusLabels[robotStatus] || 'Unknown';
  },
  
  // Gestion du verrouillage pour les apps
  lockForApp: (appName) => {
    const state = useAppStore.getState();
    state.transitionTo.busy('app-running');
    set({ currentAppName: appName });
  },
  unlockApp: () => {
    const state = useAppStore.getState();
    state.transitionTo.ready();
    set({ currentAppName: null });
  },
  
  // Gestion du verrouillage pour les installations
  lockForInstall: (appName, jobType = 'install') => {
    const state = useAppStore.getState();
    state.transitionTo.busy('installing');
    set({
      installingAppName: appName,
      installJobType: jobType, // 'install' ou 'remove'
      installResult: null,
    });
  },
  unlockInstall: () => {
    const state = useAppStore.getState();
    state.transitionTo.ready();
    set({
      installingAppName: null,
      installJobType: null,
      installResult: null,
    });
  },
  setInstallResult: (result) => set({
    installResult: result, // 'success', 'failed' ou null
  }),
  
  // Helpers spécifiques pour les logs (logique métier)
  addFrontendLog: (message) => set((state) => ({ 
    frontendLogs: [
      ...state.frontendLogs.slice(-50), // Garder max 50 logs
      {
        timestamp: new Date().toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        message,
        source: 'frontend', // Pour distinguer visuellement
      }
    ]
  })),
  
  // Legacy setters (backwards compatible, synchronisent avec robotStatus)
  setIsActive: (value) => {
    const state = useAppStore.getState();
    if (value && !state.isStarting && !state.isStopping) {
      // Daemon devient actif → ready (sauf si déjà busy)
      if (state.robotStatus !== 'busy') {
        state.transitionTo.ready();
      }
    } else if (!value && state.robotStatus !== 'starting' && state.robotStatus !== 'stopping') {
      // Daemon devient inactif → ready-to-start
      state.transitionTo.readyToStart();
    }
    set({ isActive: value });
  },
  
  setIsStarting: (value) => {
    const state = useAppStore.getState();
    if (value) {
      state.transitionTo.starting();
    }
    set({ isStarting: value });
  },
  
  setIsStopping: (value) => {
    const state = useAppStore.getState();
    if (value) {
      state.transitionTo.stopping();
    } else {
      state.transitionTo.readyToStart();
    }
    set({ isStopping: value });
  },
  
  setIsTransitioning: (value) => set({ isTransitioning: value }),
  setDaemonVersion: (value) => set({ daemonVersion: value }),
  setStartupError: (value) => set({ startupError: value }),
  setHardwareError: (value) => set({ hardwareError: value }),
  
  setIsUsbConnected: (value) => {
    const state = useAppStore.getState();
    if (!value) {
      state.transitionTo.disconnected();
    } else if (state.robotStatus === 'disconnected') {
      state.transitionTo.readyToStart();
    }
    set({ isUsbConnected: value });
  },
  
  setUsbPortName: (value) => set({ usbPortName: value }),
  setIsFirstCheck: (value) => set({ isFirstCheck: value }),
  setLogs: (logs) => set({ logs }),
  
  setIsCommandRunning: (value) => {
    const state = useAppStore.getState();
    if (value) {
      state.transitionTo.busy('command');
    } else if (state.busyReason === 'command') {
      state.transitionTo.ready();
    }
    set({ isCommandRunning: value });
  },
  
  // Gestion des timeouts/crashes
  incrementTimeouts: () => {
    const state = useAppStore.getState();
    const newCount = state.consecutiveTimeouts + 1;
    const isCrashed = newCount >= 3; // ⚡ Crash après 3 timeouts sur 4s (~1.33s × 3)
    
    if (isCrashed && !state.isDaemonCrashed) {
      console.error(`💥 DAEMON CRASHED - ${newCount} timeouts consécutifs`);
      state.transitionTo.crashed();
    }
    
    set({ consecutiveTimeouts: newCount });
  },
  
  resetTimeouts: () => set({ 
    consecutiveTimeouts: 0, 
    isDaemonCrashed: false 
  }),
  
  markDaemonCrashed: () => {
    const state = useAppStore.getState();
    state.transitionTo.crashed();
  },
  
  // Déclencher un effet visuel 3D
  triggerEffect: (effectType) => set({ 
    activeEffect: effectType, 
    effectTimestamp: Date.now() 
  }),
  
  // Arrêter l'effet actif
  stopEffect: () => set({ activeEffect: null }),
  
  // Toggle dark mode (avec persistance)
  setDarkMode: (value) => {
    console.log('🎨 Setting dark mode to:', value);
    localStorage.setItem('darkMode', JSON.stringify(value));
    set({ darkMode: value });
  },
  toggleDarkMode: () => set((state) => {
    const newValue = !state.darkMode;
    console.log('🎨 Toggling dark mode to:', newValue);
    localStorage.setItem('darkMode', JSON.stringify(newValue));
    return { darkMode: newValue };
  }),
  
  // Reset à la préférence système
  resetDarkMode: () => {
    console.log('🎨 Resetting to system preference');
    localStorage.removeItem('darkMode');
    const systemPreference = getSystemPreference();
    set({ darkMode: systemPreference });
  },
}));

// Écouter les changements de préférence système
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleSystemPreferenceChange = (e) => {
    // Ne mettre à jour que si l'utilisateur n'a pas de préférence stockée
    const storedPreference = getStoredPreference();
    if (storedPreference === null) {
      console.log('🎨 System preference changed:', e.matches);
      useAppStore.setState({ darkMode: e.matches });
    }
  };
  
  // Méthode moderne
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemPreferenceChange);
  } else {
    // Fallback pour anciens navigateurs
    mediaQuery.addListener(handleSystemPreferenceChange);
  }
}

export default useAppStore;

