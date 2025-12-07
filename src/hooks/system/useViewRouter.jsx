import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { PermissionsRequiredView, RobotNotDetectedView, StartingView, ReadyToStartView, TransitionView, ActiveRobotView, ClosingView, UpdateView } from '../../views';
import AppTopBar from '../../components/AppTopBar';

/**
 * Hook to determine which view to display based on app state
 * 
 * Priority order:
 * 0. Permissions (macOS only) - Blocks app until permissions granted
 * 1. Update view - Always first, before everything else
 * 2. USB check view - Show during USB detection (minimum 2s)
 * 3. Robot not connected (after USB check minimum time)
 * 4. Starting daemon (visual scan)
 * 5. Transition view - After scan, during resize
 * 6. Stopping daemon - Show spinner
 * 7. Ready to start - Robot connected but daemon not active
 * 8. Active robot - Full control view
 * 
 * @param {object} props - View routing props
 * @returns {object} { viewComponent, viewProps }
 */
export function useViewRouter({
  // Permissions
  permissionsGranted,
  isRestarting,
  
  // Update
  shouldShowUpdateView,
  isChecking,
  isDownloading,
  downloadProgress,
  updateAvailable,
  updateError,
  onInstallUpdate,
  
  // USB
  shouldShowUsbCheck,
  isUsbConnected,
  
  // Daemon
  isStarting,
  isStopping,
  isActive,
  isTransitioning,
  hardwareError,
  startupError,
  startDaemon,
  stopDaemon,
  
  // Robot commands
  sendCommand,
  playRecordedMove,
  isCommandRunning,
  
  // Other
  logs,
  daemonVersion,
  usbPortName,
  onAppsReady,
}) {
  return useMemo(() => {
    // PRIORITY 0: Permissions view
    if (!permissionsGranted || isRestarting) {
      return {
        viewComponent: PermissionsRequiredView,
        viewProps: { isRestarting },
        showTopBar: true,
      };
    }

    // PRIORITY 1: Update view
    if (shouldShowUpdateView) {
      return {
        viewComponent: UpdateView,
        viewProps: {
          isChecking,
          isDownloading,
          downloadProgress,
          updateAvailable,
          updateError,
          onInstallUpdate,
        },
        showTopBar: true,
      };
    }

    // PRIORITY 2: USB check view
    if (shouldShowUsbCheck) {
      return {
        viewComponent: RobotNotDetectedView,
        viewProps: {},
        showTopBar: true,
      };
    }

    // PRIORITY 3: Robot not connected
    if (!isUsbConnected) {
      return {
        viewComponent: RobotNotDetectedView,
        viewProps: {},
        showTopBar: true,
      };
    }

    // PRIORITY 4: Starting daemon
    if (isStarting || hardwareError) {
      return {
        viewComponent: StartingView,
        viewProps: {
          startupError: hardwareError || startupError,
          startDaemon,
        },
        showTopBar: true,
      };
    }

    // PRIORITY 5: Transition view
    if (isTransitioning) {
      return {
        viewComponent: TransitionView,
        viewProps: {},
        showTopBar: true,
        backgroundComponent: ActiveRobotView,
        backgroundProps: {
          isActive,
          isStarting,
          isStopping,
          stopDaemon,
          sendCommand,
          playRecordedMove,
          isCommandRunning,
          logs,
          daemonVersion,
          usbPortName,
          onAppsReady,
        },
      };
    }

    // PRIORITY 6: Stopping daemon
    if (isStopping) {
      return {
        viewComponent: ClosingView,
        viewProps: {},
        showTopBar: false, // ClosingView has its own topbar
      };
    }

    // PRIORITY 7: Ready to start
    if (isUsbConnected && !isActive && !isStarting) {
      return {
        viewComponent: ReadyToStartView,
        viewProps: {
          startDaemon,
          isStarting,
          usbPortName,
        },
        showTopBar: true,
      };
    }

    // PRIORITY 8: Active robot
    return {
      viewComponent: ActiveRobotView,
      viewProps: {
        isActive,
        isStarting,
        isStopping,
        stopDaemon,
        sendCommand,
        playRecordedMove,
        isCommandRunning,
        logs,
        daemonVersion,
        usbPortName,
        onAppsReady,
      },
      showTopBar: true,
    };
  }, [
    permissionsGranted,
    isRestarting,
    shouldShowUpdateView,
    isChecking,
    isDownloading,
    downloadProgress,
    updateAvailable,
    updateError,
    onInstallUpdate,
    shouldShowUsbCheck,
    isUsbConnected,
    isStarting,
    isStopping,
    isActive,
    isTransitioning,
    hardwareError,
    startupError,
    startDaemon,
    stopDaemon,
    sendCommand,
    playRecordedMove,
    isCommandRunning,
    logs,
    daemonVersion,
    usbPortName,
    onAppsReady,
  ]);
}

/**
 * Component wrapper that renders the routed view
 */
export function ViewRouterWrapper({ viewConfig }) {
  const { viewComponent: ViewComponent, viewProps, showTopBar, backgroundComponent: BackgroundComponent, backgroundProps } = viewConfig;

  if (BackgroundComponent) {
    // Transition view with background component
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100vh' }}>
        {showTopBar && <AppTopBar />}
        <Box sx={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <BackgroundComponent {...backgroundProps} />
        </Box>
        <ViewComponent {...viewProps} />
      </Box>
    );
  }

  if (!showTopBar) {
    // View has its own topbar (e.g., ClosingView)
    return <ViewComponent {...viewProps} />;
  }

  // Standard view with topbar
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh' }}>
      <AppTopBar />
      <ViewComponent {...viewProps} />
    </Box>
  );
}

