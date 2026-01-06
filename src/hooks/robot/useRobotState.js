import { useEffect } from 'react';
import useAppStore from '../../store/useAppStore';
import { DAEMON_CONFIG, fetchWithTimeoutSkipInstall, buildApiUrl } from '../../config/daemon';
import { useDaemonEventBus } from '../daemon/useDaemonEventBus';

/**
 * 🎯 Centralized hook for robot state polling
 * 
 * Responsibilities (SINGLE RESPONSIBILITY):
 * 1. Poll /api/state/full every 500ms when isActive=true (for UI data)
 * 
 * NOT responsible for:
 * - Active moves tracking (that's useActiveMoves's job via WebSocket)
 * - Health checking (that's useDaemonHealthCheck's job)
 * - Transitioning to ready (that's HardwareScanView's job)
 * - Clearing startup timeout (that's useDaemon's job)
 * - Clearing hardware errors (that's startConnection's job)
 * 
 * ⚠️ SKIP during installations (daemon may be overloaded)
 */
export function useRobotState(isActive) {
  const { 
    isDaemonCrashed,
    setRobotStateFull,
  } = useAppStore();
  
  // ✅ Event Bus for centralized event handling
  const eventBus = useDaemonEventBus();
  
  useEffect(() => {
    if (!isActive) {
      // Clear state when daemon is not active
      setRobotStateFull({
        data: null,
        lastUpdate: null,
        error: null,
      });
      return;
    }
    
    // Don't poll if daemon is crashed
    if (isDaemonCrashed) {
      console.warn('⚠️ Daemon crashed, stopping robot state polling');
      return;
    }
    
    // ⚠️ Sanity check: if isActive but no connectionMode, force crash state
    // This can happen if state gets corrupted during rapid mode switching
    const { connectionMode } = useAppStore.getState();
    if (isActive && !connectionMode) {
      console.error('🔴 Invalid state detected: isActive=true but connectionMode=null. Triggering crash...');
      useAppStore.getState().transitionTo.crashed();
      return;
    }
    
    const fetchState = async () => {
      // ✅ Fetch state/full for UI data
        try {
          const stateResponse = await fetchWithTimeoutSkipInstall(
            buildApiUrl('/api/state/full?with_control_mode=true&with_head_joints=true&with_body_yaw=true&with_antenna_positions=true'),
            {},
            DAEMON_CONFIG.TIMEOUTS.STATE_FULL,
            { silent: true } // ⚡ Don't log (polling every 500ms)
          );
          
          if (stateResponse.ok) {
            const data = await stateResponse.json();
            
            // ✅ Update centralized state in store
            setRobotStateFull({
              data,
              lastUpdate: Date.now(),
              error: null,
            });
            
          // ✅ Emit state update event to bus
          eventBus.emit('robot:state:updated', { data });
          } else {
          // Response but not OK
            console.warn('⚠️ Daemon responded but not OK:', stateResponse.status);
            setRobotStateFull(prev => ({
              ...prev,
              error: `HTTP ${stateResponse.status}`,
            }));
          }
        } catch (error) {
          // Skip during installation (expected)
          if (error.name === 'SkippedError') {
            return;
          }
          
          // Silently ignore AbortError (expected when component unmounts or dependencies change)
          if (error.name === 'AbortError') {
            return;
          }
          
        // ❌ Error fetching state → just update error state
        // Health check is handled by useDaemonHealthCheck
        console.warn('⚠️ Robot state fetch failed:', error.message);
        
            setRobotStateFull(prev => ({
              ...prev,
              error: error.message || 'Network error',
            }));
      }
    };
    
    // Fetch initial
    fetchState();
    
    // ✅ Poll every 500ms (unified interval)
    const interval = setInterval(fetchState, DAEMON_CONFIG.INTERVALS.ROBOT_STATE);
    
    return () => {
      clearInterval(interval);
    };
  }, [isActive, isDaemonCrashed]); // Removed setters from deps - Zustand setters are stable and don't need to be in deps
}

