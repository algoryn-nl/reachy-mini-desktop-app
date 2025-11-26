import { useEffect } from 'react';
import useAppStore from '../../store/useAppStore';

/**
 * 🏥 Centralized hook for daemon health detection
 * 
 * Monitors robotStateFull updates from useRobotState
 * 
 * ⚠️ Note: useRobotState already handles timeout detection and incrementTimeouts/resetTimeouts
 * This hook is kept for backwards compatibility but the actual health checking is done in useRobotState
 * 
 * ⚠️ Now uses centralized robotStateFull from useRobotState instead of making its own API calls
 */
export function useDaemonHealthCheck() {
  const { 
    isDaemonCrashed, 
    isActive,
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
    
    // ✅ Health checking is now done by useRobotState
    // This hook is kept for backwards compatibility
    // useRobotState handles:
    // - API calls to /api/state/full
    // - Timeout detection
    // - incrementTimeouts/resetTimeouts
    // - Updating robotStateFull in the store
    
  }, [isDaemonCrashed, isActive]);
}

