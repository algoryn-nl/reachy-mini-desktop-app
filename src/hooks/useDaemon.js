import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import useAppStore from '../store/useAppStore';
import { DAEMON_CONFIG, fetchWithTimeout, buildApiUrl, transitionToActiveView } from '../config/daemon';
import { isSimulationMode } from '../utils/simulationMode';
import { findErrorConfig, createErrorFromConfig } from '../utils/hardwareErrors';

export const useDaemon = () => {
  const { 
    isActive,
    isStarting,
    isStopping,
    startupError,
    isDaemonCrashed,
    setIsActive, 
    setIsStarting, 
    setIsStopping,
    setIsTransitioning,
    setDaemonVersion,
    setStartupError,
    setHardwareError,
    addFrontendLog
  } = useAppStore();

  const checkStatus = useCallback(async () => {
    // Don't check if already detected as crashed
    if (isDaemonCrashed) return;
    
    // ⚠️ SKIP during installations (daemon may be overloaded by pip install)
    const { isInstalling } = useAppStore.getState();
    if (isInstalling) {
      return;
    }
    
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(DAEMON_CONFIG.ENDPOINTS.STATE_FULL),
        {},
        DAEMON_CONFIG.TIMEOUTS.HEALTHCHECK,
        { silent: true } // ⚡ Don't log healthchecks
      );
      const isRunning = response.ok;
      setIsActive(isRunning);
      // ✅ No incrementTimeouts() here, handled by useDaemonHealthCheck
    } catch (error) {
      // ✅ Don't immediately set isActive to false on error
      // Let health check handle crash detection with its timeout counter
      // This avoids setting isActive to false during temporary timeouts (e.g., after stopping app)
      // Health check will detect a real crash after 3 consecutive timeouts
      // ✅ No incrementTimeouts() here, handled by useDaemonHealthCheck
    }
  }, [setIsActive, isDaemonCrashed]);

  const fetchDaemonVersion = useCallback(async () => {
    // ⚠️ SKIP during installations (daemon may be overloaded by pip install)
    const { isInstalling } = useAppStore.getState();
    if (isInstalling) {
      return; // Skip silently
    }
    
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(DAEMON_CONFIG.ENDPOINTS.DAEMON_STATUS),
        {},
        DAEMON_CONFIG.TIMEOUTS.VERSION,
        { silent: true } // ⚡ Don't log version checks
      );
      if (response.ok) {
        const data = await response.json();
        // API returns an object with the version
        setDaemonVersion(data.version || null);
        // ✅ No resetTimeouts() here, handled by useDaemonHealthCheck
      }
    } catch (error) {
      // ✅ No incrementTimeouts() here, handled by useDaemonHealthCheck
    }
  }, [setDaemonVersion]);

  // Listen to sidecar stderr events to detect hardware errors
  // Only process errors when daemon is starting
  useEffect(() => {
    let unlistenStderr;
    
    const setupStderrListener = async () => {
      try {
        unlistenStderr = await listen('sidecar-stderr', (event) => {
          // Only process errors when starting
          if (!isStarting) {
            return;
          }
          
          // Extract error line from payload (can be string or object)
          const errorLine = typeof event.payload === 'string' 
            ? event.payload 
            : event.payload?.toString() || '';
          
          // Use centralized error detection
          const errorConfig = findErrorConfig(errorLine);
          
          if (errorConfig) {
            console.warn(`⚠️ Hardware error detected (${errorConfig.type}):`, errorLine);
            const errorObject = createErrorFromConfig(errorConfig, errorLine);
            setHardwareError(errorObject);
            // Keep isStarting = true to stay on StartingView/scan view
          } else if (errorLine.includes('RuntimeError')) {
            // Generic runtime error - no specific config found
            console.warn('⚠️ Generic hardware runtime error detected:', errorLine);
            // Don't override specific error if already set
            const currentError = useAppStore.getState().hardwareError;
            if (!currentError || !currentError.type) {
              setHardwareError({
                type: 'hardware',
                message: errorLine,
                messageParts: null,
                code: null,
                cameraPreset: 'scan',
              });
            }
          }
        });
      } catch (error) {
        console.error('Failed to setup sidecar-stderr listener:', error);
      }
    };
    
    setupStderrListener();
    
    return () => {
      if (unlistenStderr) {
        unlistenStderr();
      }
    };
  }, [isStarting, setHardwareError, setIsStarting]);

  const startDaemon = useCallback(async () => {
    // First reset errors but don't change view yet
    setStartupError(null);
    setHardwareError(null);
    
    // Wait a moment for React to render the spinner
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Check if daemon already running
      try {
        const response = await fetchWithTimeout(
          buildApiUrl(DAEMON_CONFIG.ENDPOINTS.STATE_FULL),
          {},
          DAEMON_CONFIG.TIMEOUTS.STARTUP_CHECK,
          { label: 'Check existing daemon' }
        );
        if (response.ok) {
          // Wait 500ms to see the spinner in the button
          await new Promise(resolve => setTimeout(resolve, 500));
          setIsStarting(true);
          return;
        }
      } catch (e) {
        // No daemon detected, starting new one
      }

      // 🎭 Check if simulation mode is enabled
      const simMode = isSimulationMode();

      // Launch new daemon (non-blocking - we don't wait for it)
      // Pass sim_mode parameter to backend
      invoke('start_daemon', { simMode: simMode }).then(() => {
        // Daemon started
        if (simMode) {
          addFrontendLog('🎭 Daemon started in simulation mode (MuJoCo)');
        }
      }).catch((e) => {
        console.error('❌ Daemon startup error:', e);
        setStartupError(e.message || 'Error starting the daemon');
        setIsStarting(false);
      });
      
      // Wait 500ms to see the spinner in the button, then switch to scan view
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsStarting(true);
      
      // Periodically check that daemon has started (but don't block)
      const checkInterval = setInterval(async () => {
        try {
          // Check if daemon is ready by testing the API
          const response = await fetchWithTimeout(
            buildApiUrl(DAEMON_CONFIG.ENDPOINTS.STATE_FULL),
            {},
            DAEMON_CONFIG.TIMEOUTS.STARTUP_CHECK,
            { silent: true }
          );
          
          if (response.ok) {
            await checkStatus(); // Update state
            clearInterval(checkInterval);
          }
        } catch (e) {
          // Daemon not ready yet, checking again...
        }
      }, 1000);
    } catch (e) {
      console.error('❌ Daemon startup error:', e);
      setStartupError(e.message || 'Error starting the daemon');
      setIsStarting(false);
    }
  }, [setIsStarting, setIsActive, checkStatus, setStartupError, setHardwareError, setIsTransitioning]);

  const stopDaemon = useCallback(async () => {
    setIsStopping(true);
    try {
      // First send robot to sleep position
      try {
        await fetchWithTimeout(
          buildApiUrl('/api/move/play/goto_sleep'),
          { method: 'POST' },
          DAEMON_CONFIG.TIMEOUTS.COMMAND,
          { label: 'Sleep before shutdown' }
        );
        // Wait for movement to complete
        await new Promise(resolve => setTimeout(resolve, DAEMON_CONFIG.ANIMATIONS.SLEEP_DURATION));
      } catch (e) {
        // Robot already inactive or sleep error
      }
      
      // Then kill the daemon
      await invoke('stop_daemon');
      setTimeout(async () => {
        await checkStatus();
        setIsStopping(false);
      }, 2000);
    } catch (e) {
      console.error(e);
      setIsStopping(false);
    }
  }, [setIsStopping, checkStatus]);

  return {
    isActive,
    isStarting,
    isStopping,
    startupError,
    checkStatus,
    startDaemon,
    stopDaemon,
    fetchDaemonVersion,
  };
};

