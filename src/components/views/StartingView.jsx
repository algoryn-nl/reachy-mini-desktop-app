import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckIcon from '@mui/icons-material/Check';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import Viewer3D from '../viewer3d';
import { getShortComponentName } from '../../utils/componentNames';
import useAppStore from '../../store/useAppStore';
import { DAEMON_CONFIG } from '../../config/daemon';

/**
 * View displayed during daemon startup
 * Shows the robot in X-ray mode with a scan effect
 * Displays errors if startup fails
 */
function StartingView({ startupError }) {
  const appWindow = window.mockGetCurrentWindow ? window.mockGetCurrentWindow() : getCurrentWindow();
  const { setHardwareError, darkMode } = useAppStore();
  const [currentComponent, setCurrentComponent] = useState(null);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [scanError, setScanError] = useState(null);
  const [errorMesh, setErrorMesh] = useState(null); // The mesh in error for camera focus
  const [isRetrying, setIsRetrying] = useState(false);
  const [scannedComponents, setScannedComponents] = useState([]); // List of scanned components
  const [scanComplete, setScanComplete] = useState(false); // Scan completed successfully
  const logBoxRef = useRef(null);
  
  // Auto-scroll to bottom on each component addition
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [scannedComponents]);
  
  const handleRetry = useCallback(async () => {
    console.log('🔄 Retrying scan...');
    setIsRetrying(true);
    
    try {
      // 1. Stop the daemon (without goto_sleep)
      console.log('🛑 Stopping daemon...');
      await invoke('stop_daemon');
      
      // 2. Wait for the daemon to be fully stopped
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Reset all states
      setScanError(null);
      setErrorMesh(null);
      setScanProgress({ current: 0, total: 0 });
      setCurrentComponent(null);
      setScannedComponents([]);
      setScanComplete(false);
      setHardwareError(null);
      
      // 4. Reload to restart a complete scan
      console.log('🔄 Reloading app...');
      window.location.reload();
    } catch (err) {
      console.error('Failed to stop daemon:', err);
      // Reload anyway
      window.location.reload();
    }
  }, [setHardwareError]);
  
  const handleScanComplete = useCallback(() => {
    console.log('✅ Scan 3D completed (visually finished)');
    // Force progression to 100%
    setScanProgress(prev => ({ ...prev, current: prev.total }));
    setCurrentComponent(null);
    setScanComplete(true); // ✅ Display success
    
    // ⚡ WAIT for pause to see success, then trigger transition
    console.log(`⏱️ Waiting ${DAEMON_CONFIG.ANIMATIONS.SCAN_COMPLETE_PAUSE}ms before transition...`);
    setTimeout(() => {
      console.log('🚀 Triggering transition to ActiveView');
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
  
  const handleScanMesh = useCallback((mesh, index, total) => {
    const componentName = getShortComponentName(mesh, index, total);
    setCurrentComponent(componentName);
    // index comes from ScanEffect which counts from 1 to total (not 0 to total-1)
    // Never regress: if current > index, keep current
    setScanProgress(prev => ({
      current: Math.max(prev.current, index),
      total: total
    }));
    
    // Add component to scanned list after a delay
    // to synchronize with visual animation (which takes ~200ms to be clearly visible)
    setTimeout(() => {
      setScannedComponents(prev => [...prev, componentName]);
    }, 200);
    
    // ========================================================================
    // ⚠️ HARDWARE ERROR SIMULATION - To test error UI
    // ========================================================================
    // 
    // Error simulation during scan to test:
    // - Stopping scan at specified mesh
    // - Camera focus on error component
    // - Component color change to red
    // - Error message display with instructions
    // - Retry button that restarts daemon
    // - Blocking transition to ActiveRobotView
    //
    // For production, this code must be replaced with real polling
    // of the daemon API to detect real hardware errors.
    // 
    // ========================================================================
    
    // if (index === 50) {
    //   const errorData = {
    //     code: "Camera Error - Communication timeout (0x03)",
    //     action: "Check the camera cable connection and restart",
    //     component: componentName,
    //   };
    //   console.log('⚠️ Hardware error detected on mesh:', mesh);
    //   console.log('⚠️ Component:', componentName);
    //   setScanError(errorData);
    //   setErrorMesh(mesh); // Store mesh for camera focus
    //   setHardwareError(errorData.code); // Block transition
    // }
  }, [setHardwareError]);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: darkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(253, 252, 250, 0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        overflow: 'hidden',
      }}
    >
      {/* Titlebar */}
      <Box
        onMouseDown={async (e) => {
          e.preventDefault();
          try {
            await appWindow.startDragging();
          } catch (err) {
            console.error('Drag error:', err);
          }
        }}
        sx={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <Box sx={{ width: 12, height: 12 }} />
        <Box sx={{ height: 20 }} /> {/* Space for drag */}
        <Box sx={{ width: 20, height: 20 }} />
      </Box>

      {/* Centered content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100% - 44px)',
          px: 4,
          gap: 1.5,
        }}
      >
        {/* Robot Viewer 3D - Clean design */}
        <Box
          sx={{
            width: '100%',
            maxWidth: '400px',
            position: 'relative',
          }}
        >
          {/* Robot 3D */}
          <Box
            sx={{
              width: '100%',
              height: '360px',
              position: 'relative',
            }}
          >
            <Viewer3D 
              isActive={true}
              antennas={[-10, -10]}
              initialMode="xray" 
              hideControls={true}
              forceLoad={true}
              hideGrid={true}
              hideBorder={true}
              showScanEffect={!startupError && !scanError}
              onScanComplete={handleScanComplete}
              onScanMesh={handleScanMesh}
              cameraPreset="scan"
              useCinematicCamera={true}
              errorFocusMesh={errorMesh}
              backgroundColor="transparent"
            />
          </Box>
        </Box>

        {/* Status - Minimalist design */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '400px',
            minHeight: '90px',
          }}
        >
          {(startupError || scanError) ? (
            // ❌ Error - Modern design with instruction upfront
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                maxWidth: '360px',
                minHeight: '90px', // Same height as scan mode
              }}
            >
              
              {/* Compact title */}
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: darkMode ? '#666' : '#999',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                Hardware Error
              </Typography>
              
              {/* Main instruction - Larger with bold words */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: darkMode ? '#f5f5f5' : '#333',
                    lineHeight: 1.5,
                  }}
                >
                  {scanError?.action ? (
                    <>
                      <Box component="span" sx={{ fontWeight: 700 }}>Check</Box> the{' '}
                      <Box component="span" sx={{ fontWeight: 700 }}>camera cable</Box> connection and{' '}
                      <Box component="span" sx={{ fontWeight: 700 }}>restart</Box>
                    </>
                  ) : (
                    startupError
                  )}
                </Typography>
              </Box>
              
              {/* Technical error code - Smaller, secondary */}
              {scanError?.code && (
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: darkMode ? '#666' : '#999',
                    fontFamily: 'monospace',
                    bgcolor: darkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {scanError.code}
                </Typography>
              )}
              
              {/* Retry button */}
              <Button
                variant="outlined"
                startIcon={isRetrying ? <CircularProgress size={15} sx={{ color: '#ef4444' }} /> : <RefreshIcon sx={{ fontSize: 15 }} />}
                onClick={handleRetry}
                disabled={isRetrying}
                sx={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: 11,
                  px: 2.5,
                  py: 0.75,
                  borderRadius: '10px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#dc2626',
                    bgcolor: 'rgba(239, 68, 68, 0.04)',
                  },
                  '&:disabled': {
                    borderColor: '#fca5a5',
                    color: '#fca5a5',
                  },
                }}
              >
                {isRetrying ? 'Restarting...' : 'Retry Scan'}
              </Button>
            </Box>
          ) : (
            // 🔄 Scanning in progress - Clean design with logs
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
                width: '100%',
              }}
            >
              {/* Title + spinner/checkmark + discrete counter */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {scanComplete ? (
                  // ✅ Success checkmark (outlined)
                  <CheckCircleOutlinedIcon
                    sx={{
                      fontSize: 18,
                      color: darkMode ? '#22c55e' : '#16a34a',
                    }}
                  />
                ) : (
                  // 🔄 Spinner in progress
                  <CircularProgress 
                    size={16} 
                    thickness={4} 
                    sx={{ 
                      color: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)',
                    }} 
                  />
                )}
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: scanComplete 
                      ? (darkMode ? '#22c55e' : '#16a34a')
                      : (darkMode ? '#f5f5f5' : '#333'),
                    letterSpacing: '0.2px',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {scanComplete ? 'Scan complete' : 'Scanning hardware'}
                </Typography>
                {!scanComplete && (
                  <Typography
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: darkMode ? '#666' : '#999',
                      fontFamily: 'monospace',
                      ml: 0.5,
                    }}
                  >
                    {scanProgress.current}/{scanProgress.total}
                  </Typography>
                )}
              </Box>
              
              {/* Log box - Max 3 lines, scrolled to bottom */}
              <Box
                ref={logBoxRef}
                sx={{
                  width: '80%',
                  maxWidth: '320px',
                  height: '57px', // Environ 3 lignes
                  bgcolor: darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
                  borderRadius: '8px',
                  px: 1.5,
                  py: 0.75,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                  opacity: 0.5,
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '2px',
                  },
                }}
              >
                {scannedComponents.map((component, idx) => (
                  <Box 
                    key={idx}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.75,
                      minHeight: '16px',
                    }}
                  >
                    <CheckIcon
                      sx={{
                        fontSize: 10,
                        color: darkMode ? '#22c55e' : '#16a34a',
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 9,
                        fontWeight: 500,
                        color: darkMode ? '#888' : '#666',
                        fontFamily: 'monospace',
                        lineHeight: 1,
                      }}
                    >
                      {component}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          </Box>
      </Box>
    </Box>
  );
}

export default StartingView;
