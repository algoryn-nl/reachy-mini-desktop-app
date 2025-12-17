/**
 * Robot Slice - Manages robot connection, status, and state machine
 * 
 * This slice handles:
 * - Connection state (USB, WiFi, Simulation)
 * - Robot status (disconnected, starting, ready, busy, stopping, crashed)
 * - Robot state polling data
 * - Visual effects
 */
import { logConnect, logDisconnect, logReset, logReady, logBusy, logCrash } from '../storeLogger';

/**
 * Initial state for robot slice
 */
export const robotInitialState = {
  // ✨ Main robot state (State Machine)
  // Possible states: 'disconnected', 'ready-to-start', 'starting', 'ready', 'busy', 'stopping', 'crashed'
  robotStatus: 'disconnected',
  
  // ✨ Reason if status === 'busy'
  // Possible values: null, 'moving', 'command', 'app-running', 'installing'
  busyReason: null,
  
  // Legacy states (for backwards compatibility)
  isActive: false,
  isStarting: false,
  isStopping: false,
  
  // Daemon metadata
  daemonVersion: null,
  startupError: null,
  hardwareError: null,
  isDaemonCrashed: false,
  consecutiveTimeouts: 0,
  startupTimeoutId: null,
  
  // Robot connection state
  isUsbConnected: false,
  usbPortName: null,
  isFirstCheck: true,
  
  // 🌐 Connection mode (USB vs WiFi vs Simulation)
  connectionMode: null,
  remoteHost: null,
  
  // 🎯 Centralized robot state (polled by useRobotState)
  robotStateFull: {
    data: null,
    lastUpdate: null,
    error: null,
  },
  
  // 🎯 Centralized active moves
  activeMoves: [],
  
  // Activity Lock
  isCommandRunning: false,
  isAppRunning: false,
  isInstalling: false,
  currentAppName: null,
  
  // Visual Effects (3D particles)
  activeEffect: null,
  effectTimestamp: 0,
};

/**
 * Create robot slice
 * @param {Function} set - Zustand set function
 * @param {Function} get - Zustand get function
 * @returns {Object} Robot slice state and actions
 */
export const createRobotSlice = (set, get) => ({
  ...robotInitialState,
  
  // ✨ Transition actions (State Machine)
  transitionTo: {
    disconnected: () => {
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
      set({
        robotStatus: 'ready-to-start',
        busyReason: null,
        isActive: false,
        isStarting: false,
        isStopping: false,
      });
    },
    
    starting: () => {
      set({
        robotStatus: 'starting',
        busyReason: null,
        isActive: false,
        isStarting: true,
        isStopping: false,
      });
    },
    
    ready: () => {
      const state = get();
      
      // Don't transition to ready if there's a hardware error
      if (state.hardwareError) {
        console.warn('[Store] ⚠️ Cannot transition to ready: hardware error present');
        return;
      }
      
      // 🛡️ Guard: Don't transition if stopping (prevents chaos during shutdown)
      if (state.isStopping) {
        return; // Silently ignore during shutdown
      }
      
      // 🛡️ Guard: Don't transition if no connection (prevents crash after resetAll)
      if (!state.connectionMode) {
        return; // Silently ignore after disconnect
      }
      
      // 🛡️ Guard: Don't log/transition if already ready (prevents flicker)
      if (state.robotStatus === 'ready' && state.isActive) {
        return; // Already ready, skip
      }
      
      logReady();
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
      const state = get();
      
      // 🛡️ Guard: Don't transition if stopping (prevents chaos during shutdown)
      if (state.isStopping) {
        return; // Silently ignore during shutdown
      }
      
      // 🛡️ Guard: Don't transition if no connection (prevents issues after resetAll)
      if (!state.connectionMode) {
        return; // Silently ignore after disconnect
      }
      
      logBusy(reason);
      set(() => {
        const updates = {
          robotStatus: 'busy',
          busyReason: reason,
          isActive: true,
        };
        
        if (reason === 'command') updates.isCommandRunning = true;
        if (reason === 'app-running') updates.isAppRunning = true;
        if (reason === 'installing') updates.isInstalling = true;
        
        return updates;
      });
    },
    
    stopping: () => {
      set({
        robotStatus: 'stopping',
        busyReason: null,
        isActive: false,
        isStopping: true,
        // 🛡️ Reset timeouts to prevent false crash detection during intentional stop
        consecutiveTimeouts: 0,
        isDaemonCrashed: false,
      });
    },
    
    crashed: () => {
      logCrash();
      set({
        robotStatus: 'crashed',
        busyReason: null,
        isActive: false,
        isDaemonCrashed: true,
      });
    },
  },
  
  // Helper methods
  isBusy: () => {
    const state = get();
    return state.robotStatus === 'busy' || state.isCommandRunning || state.isAppRunning || state.isInstalling;
  },
  
  isReady: () => {
    const state = get();
    return state.robotStatus === 'ready';
  },
  
  getRobotStatusLabel: () => {
    const state = get();
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
  
  // App locking management
  lockForApp: (appName) => {
    get().transitionTo.busy('app-running');
    set({ currentAppName: appName });
  },
  
  unlockApp: () => {
    get().transitionTo.ready();
    set({ currentAppName: null });
  },
  
  // Legacy setters (minimal logging - key events only via storeLogger)
  setIsActive: (value) => {
    const state = get();
    
    // 🛡️ Guard: Skip if already in desired state (prevents redundant transitions)
    if (value === state.isActive) {
      return;
    }
    
    // 🛡️ Guard: Block setIsActive(true) if stopping (prevents chaos during shutdown)
    if (value && state.isStopping) {
      return; // Silently ignore during shutdown
    }
    
    // 🛡️ Guard: Block setIsActive(true) if no connection (prevents crash after resetAll)
    if (value && !state.connectionMode) {
      return; // Silently ignore after disconnect
    }
    
    if (value && state.hardwareError) {
      console.warn('[Store] ⚠️ Cannot set isActive=true: hardware error present');
      return;
    }
    
    if (value && !state.isStarting && !state.isStopping) {
      if (state.robotStatus !== 'busy') {
        state.transitionTo.ready();
      }
    } else if (!value && state.robotStatus !== 'starting' && state.robotStatus !== 'stopping') {
      state.transitionTo.readyToStart();
    }
    set({ isActive: value });
  },
  
  setIsStarting: (value) => {
    const state = get();
    if (value) {
      state.transitionTo.starting();
    }
    set({ isStarting: value });
  },
  
  setIsStopping: (value) => {
    const state = get();
    if (value) {
      state.transitionTo.stopping();
    } else {
      state.transitionTo.readyToStart();
    }
    set({ isStopping: value });
  },
  
  setDaemonVersion: (value) => set({ daemonVersion: value }),
  setStartupError: (value) => set({ startupError: value }),
  setHardwareError: (value) => set({ hardwareError: value }),
  
  setIsUsbConnected: (value) => {
    const state = get();
    if (!value) {
      state.transitionTo.disconnected();
    } else if (state.robotStatus === 'disconnected') {
      state.transitionTo.readyToStart();
    }
    set({ isUsbConnected: value });
  },
  
  setUsbPortName: (value) => set({ usbPortName: value }),
  setIsFirstCheck: (value) => set({ isFirstCheck: value }),
  
  // 🌐 Connection mode setters
  setConnectionMode: (mode) => set({ connectionMode: mode }),
  setRemoteHost: (host) => set({ remoteHost: host }),
  
  isWifiMode: () => get().connectionMode === 'wifi',
  
  isLocalDaemon: () => {
    const mode = get().connectionMode;
    return mode === 'usb' || mode === 'simulation';
  },
  
  // 🌐 Reset connection state
  resetConnection: () => {
    const prevState = get();
    logDisconnect(prevState.connectionMode);
    
    set({
      robotStatus: 'disconnected',
      busyReason: null,
      isActive: false,
      isStarting: false,
      isStopping: false,
      connectionMode: null,
      remoteHost: null,
      isUsbConnected: false,
      usbPortName: null,
      isFirstCheck: true,
      daemonVersion: null,
      robotStateFull: { data: null, lastUpdate: null, error: null },
      activeMoves: [],
      consecutiveTimeouts: 0,
      isDaemonCrashed: false,
    });
  },
  
  // 🌐 Start connection - atomic action
  startConnection: (mode, options = {}) => {
    const { portName, remoteHost } = options;
    logConnect(mode, options);
    
    set({
      connectionMode: mode,
      remoteHost: remoteHost || null,
      isUsbConnected: mode !== 'wifi',
      usbPortName: portName || null,
      robotStatus: 'starting',
      busyReason: null,
      isStarting: true,
      isActive: false,
      isStopping: false,
      hardwareError: null,
      startupError: null,
      isDaemonCrashed: false,
      consecutiveTimeouts: 0,
      robotStateFull: { data: null, lastUpdate: null, error: null },
      activeMoves: [],
      daemonVersion: null,
      isCommandRunning: false,
      isAppRunning: false,
      isInstalling: false,
      currentAppName: null,
    });
  },
  
  setRobotStateFull: (value) => set((state) => {
    if (typeof value === 'function') {
      return { robotStateFull: value(state.robotStateFull) };
    }
    return { robotStateFull: value };
  }),
  
  setActiveMoves: (value) => set({ activeMoves: value }),
  
  setIsCommandRunning: (value) => {
    const state = get();
    if (value) {
      state.transitionTo.busy('command');
    } else if (state.busyReason === 'command') {
      state.transitionTo.ready();
    }
    set({ isCommandRunning: value });
  },
  
  // Timeout/crash management
  incrementTimeouts: () => {
    const state = get();
    const newCount = state.consecutiveTimeouts + 1;
    const isCrashed = newCount >= 3;
    
    if (isCrashed && !state.isDaemonCrashed) {
      state.transitionTo.crashed();
    }
    
    set({ consecutiveTimeouts: newCount });
  },
  
  resetTimeouts: () => set({ consecutiveTimeouts: 0, isDaemonCrashed: false }),
  
  markDaemonCrashed: () => {
    get().transitionTo.crashed();
  },
  
  // Startup timeout management
  setStartupTimeout: (timeoutId) => set({ startupTimeoutId: timeoutId }),
  
  clearStartupTimeout: () => {
    const state = get();
    if (state.startupTimeoutId !== null) {
      clearTimeout(state.startupTimeoutId);
      set({ startupTimeoutId: null });
    }
  },
  
  // 3D visual effects
  triggerEffect: (effectType) => set({ activeEffect: effectType, effectTimestamp: Date.now() }),
  stopEffect: () => set({ activeEffect: null }),
});

