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
    // Ne pas checker si déjà détecté comme crashé
    if (isDaemonCrashed) return;
    
    // ⚠️ SKIP pendant installations (daemon peut être surchargé par pip install)
    const { isInstalling } = useAppStore.getState();
    if (isInstalling) {
      console.log('⏭️ Skipping status check (installation in progress)');
      return;
    }
    
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(DAEMON_CONFIG.ENDPOINTS.STATE_FULL),
        {},
        DAEMON_CONFIG.TIMEOUTS.HEALTHCHECK,
        { silent: true } // ⚡ Ne pas logger les healthchecks
      );
      const isRunning = response.ok;
      setIsActive(isRunning);
      // ✅ Pas de incrementTimeouts() ici, géré par useDaemonHealthCheck
    } catch (error) {
      // ✅ Ne pas mettre isActive à false immédiatement en cas d'erreur
      // Laisser le health check gérer la détection de crash avec son compteur de timeouts
      // Cela évite de mettre isActive à false lors de timeouts temporaires (ex: après arrêt d'app)
      // Le health check détectera un vrai crash après 3 timeouts consécutifs
      // ✅ Pas de incrementTimeouts() ici, géré par useDaemonHealthCheck
    }
  }, [setIsActive, isDaemonCrashed]);

  const fetchDaemonVersion = useCallback(async () => {
    // ⚠️ SKIP pendant installations (daemon peut être surchargé par pip install)
    const { isInstalling } = useAppStore.getState();
    if (isInstalling) {
      return; // Skip silencieusement
    }
    
    try {
      const response = await fetchWithTimeout(
        buildApiUrl(DAEMON_CONFIG.ENDPOINTS.DAEMON_STATUS),
        {},
        DAEMON_CONFIG.TIMEOUTS.VERSION,
        { silent: true } // ⚡ Ne pas logger les checks de version
      );
      if (response.ok) {
        const data = await response.json();
        // L'API retourne un objet avec la version
        setDaemonVersion(data.version || null);
        // ✅ Pas de resetTimeouts() ici, géré par useDaemonHealthCheck
      }
    } catch (error) {
      console.log('Could not fetch daemon version:', error);
      // ✅ Pas de incrementTimeouts() ici, géré par useDaemonHealthCheck
    }
  }, [setDaemonVersion]);

  const startDaemon = useCallback(async () => {
    // D'abord reset les erreurs mais ne pas encore changer de vue
    setStartupError(null);
    setHardwareError(null);
    
    console.log('🚀 Starting daemon (transition will be triggered by scan completion)');
    
    // Attendre un petit instant pour que React render le spinner
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
          console.log('✅ Daemon already running, showing scan view');
          // Attendre 500ms pour voir le spinner dans le bouton
          await new Promise(resolve => setTimeout(resolve, 500));
          setIsStarting(true);
          return;
        }
      } catch (e) {
        console.log('No daemon detected, starting new one');
      }

      // Launch new daemon (non-bloquant - on ne l'attend pas)
      invoke('start_daemon').then(() => {
        console.log('✅ Daemon started, scan will trigger transition');
      }).catch((e) => {
        console.error('❌ Daemon startup error:', e);
        setStartupError(e.message || 'Error starting the daemon');
        setIsStarting(false);
      });
      
      // Attendre 500ms pour voir le spinner dans le bouton, puis passer à la vue scan
      console.log('⏱️ Waiting 500ms before showing scan view...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Switching to scan view');
      setIsStarting(true);
      
      // Vérifier périodiquement que le daemon est bien démarré (mais pas bloquer)
      const checkInterval = setInterval(async () => {
        try {
          await checkStatus();
          console.log('✅ Daemon is ready');
          clearInterval(checkInterval);
        } catch (e) {
          console.warn('⚠️ Daemon not ready yet, checking again...');
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
        console.log('Robot already inactive or sleep error:', e);
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

