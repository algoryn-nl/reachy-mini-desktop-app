import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import useAppStore from '../store/useAppStore';
import { DAEMON_CONFIG, fetchWithTimeout, buildApiUrl, transitionToActiveView } from '../config/daemon';

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

      // Launch new daemon (non-blocking - we don't wait for it)
      invoke('start_daemon').then(() => {
        // Daemon started
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

