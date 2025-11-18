import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { DAEMON_CONFIG, fetchWithTimeout, buildApiUrl } from '../config/daemon';

/**
 * 🏥 Centralized hook for daemon health detection
 * 
 * ONE SINGLE place to increment timeout counter
 * Replaces scattered calls in useDaemon and useRobotState
 * 
 * ⚠️ SKIP during installations (daemon may be overloaded)
 */
export function useDaemonHealthCheck() {
  const { 
    isDaemonCrashed, 
    isInstalling,
    isActive,
    incrementTimeouts, 
    resetTimeouts 
  } = useAppStore();
  
  useEffect(() => {
    // Don't check if already detected as crashed
    if (isDaemonCrashed) {
      console.warn('⚠️ Daemon marked as crashed, health check disabled');
      return;
    }
    
    // Don't check if daemon not active
    if (!isActive) {
      return;
    }
    
    const checkHealth = async () => {
      // ⚠️ SKIP during installations (daemon may be overloaded by pip install)
      if (isInstalling) {
        return;
      }
      
      try {
        const response = await fetchWithTimeout(
          buildApiUrl(DAEMON_CONFIG.ENDPOINTS.STATE_FULL),
          {},
          DAEMON_CONFIG.TIMEOUTS.HEALTHCHECK,
          { silent: true } // Don't log (polling)
        );
        
        if (response.ok) {
          resetTimeouts(); // ✅ Success → reset counter
        } else {
          // Response but not OK → not a timeout, don't increment
          console.warn('⚠️ Daemon responded but not OK:', response.status);
        }
      } catch (error) {
        // ❌ Timeout → increment counter
        if (error.name === 'TimeoutError' || error.message?.includes('timed out')) {
          console.warn('⚠️ Health check timeout, incrementing counter');
          incrementTimeouts();
        }
      }
    };
    
    // First immediate check
    checkHealth();
    
    // ✅ Health check every ~1.33s to detect crash in 4s (3 timeouts)
    const interval = setInterval(checkHealth, DAEMON_CONFIG.TIMEOUTS.HEALTHCHECK);
    
    return () => clearInterval(interval);
  }, [isDaemonCrashed, isInstalling, isActive, incrementTimeouts, resetTimeouts]);
}

