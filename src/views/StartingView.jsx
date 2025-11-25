import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import { getAppWindow } from '../utils/windowUtils';
import HardwareScanView from './HardwareScanView';
import useAppStore from '../store/useAppStore';
import { DAEMON_CONFIG } from '../config/daemon';

/**
 * View displayed during daemon startup
 * Wrapper around HardwareScanView that handles the transition logic
 */
function StartingView({ startupError, startDaemon }) {
  const appWindow = getAppWindow();
  const { darkMode } = useAppStore();
  
  const handleScanComplete = useCallback(() => {
    // ⚡ WAIT for pause to see success, then trigger transition
    setTimeout(() => {
      // Trigger transition via store
      const { setIsStarting, setIsTransitioning, setIsActive } = useAppStore.getState();
      
      // ✅ Transition: keep TransitionView displayed until apps are loaded
      // (the onAppsReady callback in ActiveRobotView will close TransitionView)
      setIsStarting(false);
      setIsTransitioning(true);
      setIsActive(true);
      // ✅ No longer close TransitionView automatically after TRANSITION_DURATION
      // It will be closed by onAppsReady when apps are loaded
    }, DAEMON_CONFIG.ANIMATIONS.SCAN_COMPLETE_PAUSE);
  }, []);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: darkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(250, 250, 252, 0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        overflow: 'hidden',
      }}
    >
      {/* Centered content */}
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HardwareScanView 
          startupError={startupError}
          onScanComplete={handleScanComplete}
          showTitlebar={false}
          startDaemon={startDaemon}
        />
      </Box>
    </Box>
  );
}

export default StartingView;
