import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import HardwareScanView from './HardwareScanView';
import useAppStore from '../../store/useAppStore';
import { DAEMON_CONFIG } from '../../config/daemon';

/**
 * View displayed during daemon startup
 * Wrapper around HardwareScanView that handles the transition logic
 */
function StartingView({ startupError, startDaemon }) {
  const { darkMode, setIsStarting, setIsActive, setHardwareError, hardwareError } = useAppStore();
  
  const handleScanComplete = useCallback(() => {
    // ✅ HardwareScanView only calls this callback after successful healthcheck
    // ⚡ WAIT for pause to see "Starting Software..." message, then go to ActiveRobotView
    setTimeout(() => {
      // ✅ Clear any hardware errors when scan completes successfully
      setHardwareError(null);
      // ✅ Direct transition to ActiveRobotView (no intermediate TransitionView)
      // ActiveRobotView handles its own loading state for apps
      setIsStarting(false);
      setIsActive(true);
    }, DAEMON_CONFIG.ANIMATIONS.SCAN_COMPLETE_PAUSE);
  }, [setIsStarting, setIsActive, setHardwareError]);

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
          startDaemon={startDaemon}
        />
      </Box>
    </Box>
  );
}

export default StartingView;
