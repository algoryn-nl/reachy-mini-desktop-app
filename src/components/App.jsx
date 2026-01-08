import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

import { useDaemon, useDaemonHealthCheck } from '../hooks/daemon';
import {
  useUsbDetection,
  useLogs,
  useWindowResize,
  useUpdater,
  useUpdateViewState,
  usePermissions,
  useUsbCheckTiming,
  useDeepLink,
} from '../hooks/system';
import { useViewRouter, ViewRouterWrapper } from '../hooks/system/useViewRouter';
import { useRobotCommands, useRobotState, useActiveMoves } from '../hooks/robot';
import { DAEMON_CONFIG, setAppStoreInstance } from '../config/daemon';
import { isDevMode } from '../utils/devMode';
import useAppStore from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import Toast from './Toast/Toast';

// Initialize diagnostic export tools (exposes window.reachyDiagnostic)
import '../utils/diagnosticExport';

function App() {
  // Initialize the store in daemon.js for centralized logging
  useEffect(() => {
    setAppStoreInstance(useAppStore);
  }, []);
  const {
    daemonVersion,
    hardwareError,
    connectionMode,
    isAppRunning,
    robotStatus,
    busyReason,
    isInstalling,
    isStoppingApp,
    isCommandRunning,
    darkMode,
    setPendingDeepLinkInstall,
  } = useAppStore();
  const {
    isActive,
    isStarting,
    isStopping,
    startupError,
    startDaemon,
    stopDaemon,
    fetchDaemonVersion,
  } = useDaemon();
  const { isUsbConnected, usbPortName, checkUsbRobot } = useUsbDetection();
  const { sendCommand, playRecordedMove } = useRobotCommands(); // Note: isCommandRunning comes from store
  const { logs, fetchLogs } = useLogs();

  // 🍞 Global toast for deep link feedback
  const { toast, toastProgress, showToast, handleCloseToast } = useToast();

  // 🔗 Deep link handler - at root level for global access
  // Note: Toast is shown in ActiveRobotView when processing completes (with accurate status)
  const handleDeepLinkInstall = useCallback(
    appName => {
      console.log('[App] Deep link install requested for:', appName);
      // Store pending install - ActiveRobotView will pick it up and process it
      setPendingDeepLinkInstall(appName);
    },
    [setPendingDeepLinkInstall]
  );

  useDeepLink({
    isActive,
    isAppRunning,
    // Detailed busy state for specific error messages
    robotStatus,
    busyReason,
    isInstalling,
    isStoppingApp,
    isCommandRunning,
    onInstallRequest: handleDeepLinkInstall,
    showToast,
  });

  // 🔐 Permissions check (macOS only)
  // Blocks the app until camera and microphone permissions are granted
  const {
    allGranted: permissionsGranted,
    cameraGranted,
    microphoneGranted,
    hasChecked,
  } = usePermissions({ checkInterval: 2000 });
  const [isRestarting, setIsRestarting] = useState(false);
  const restartTimerRef = useRef(null);
  const restartStartedRef = useRef(false);
  // Track if permissions were already granted on the first check (mount)
  const permissionsGrantedOnFirstCheckRef = useRef(null);

  // Check if permissions were already granted on first check (to avoid restart loop)
  useEffect(() => {
    if (hasChecked && permissionsGrantedOnFirstCheckRef.current === null) {
      // First check completed - remember if permissions were already granted
      permissionsGrantedOnFirstCheckRef.current = permissionsGranted;
    }
  }, [hasChecked, permissionsGranted]);

  // Handle restart when permissions are granted
  useEffect(() => {
    // Only start restart flow if:
    // 1. Permissions are granted
    // 2. We haven't started the restart yet
    // 3. Permissions were NOT already granted on first check (to avoid restart loop)
    if (
      permissionsGranted &&
      !restartStartedRef.current &&
      permissionsGrantedOnFirstCheckRef.current === false
    ) {
      restartStartedRef.current = true;
      const isDev = isDevMode();
      setIsRestarting(true);

      if (isDev) {
        // Dev mode: show restart UI for 3 seconds, then continue (simulate restart)
        restartTimerRef.current = setTimeout(() => {
          setIsRestarting(false);
          restartTimerRef.current = null;
        }, 3000); // 3 seconds in dev mode
      } else {
        // Production: wait 4 seconds then restart
        // Note: relaunch() is cross-platform (Windows, macOS, Linux)
        restartTimerRef.current = setTimeout(async () => {
          try {
            const { relaunch } = await import('@tauri-apps/plugin-process');
            await relaunch();
            // If relaunch succeeds, this code won't execute (app will restart)
          } catch (error) {
            console.error('[App] ❌ Failed to restart app:', error);
            console.error('[App] Error details:', {
              message: error.message,
              name: error.name,
              code: error.code,
            });
            // Reset state so user can try again
            setIsRestarting(false);
            restartStartedRef.current = false;
            restartTimerRef.current = null;
          }
        }, 4000); // 4 seconds in production
      }
    }

    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };
  }, [permissionsGranted]);

  // 🔄 Automatic update system
  // Tries to fetch latest.json directly - if it works, we have internet + we know if there's an update
  // In dev mode, skip automatic check but still show the view for minimum time
  const isDev = isDevMode();
  const {
    updateAvailable,
    isChecking,
    isDownloading,
    downloadProgress,
    error: updateError,
    checkForUpdates,
    installUpdate,
  } = useUpdater({
    autoCheck: !isDev, // Disable auto check in dev mode
    checkInterval: DAEMON_CONFIG.UPDATE_CHECK.INTERVAL,
    silent: false,
  });

  // 🔍 DEBUG: Force update check in dev mode for testing
  useEffect(() => {
    if (isDev) {
    }
  }, [isDev, checkForUpdates]);

  // ✨ Update view state management with useReducer
  // Handles all cases: dev mode, production mode, minimum display time, errors
  const shouldShowUpdateView = useUpdateViewState({
    isDev,
    isChecking,
    updateAvailable,
    isDownloading,
    updateError,
    isActive,
    isStarting,
    isStopping,
  });

  // 🕐 USB check timing - manages when to start USB check after update view
  const { shouldShowUsbCheck } = useUsbCheckTiming(shouldShowUpdateView);

  // 🎯 Centralized daemon health check (POST /health-check every 1.33s)
  // Handles crash detection via timeout counting (3 consecutive timeouts = crash)
  // This is separate from useRobotState to avoid polling heavy data for health checks
  useDaemonHealthCheck(isActive);

  // 🎯 Centralized robot state polling (GET /api/state/full every 500ms for UI data)
  // Does NOT handle crash detection anymore (that's useDaemonHealthCheck's job)
  useRobotState(isActive);

  // 🎯 Real-time active moves tracking (WebSocket /api/move/ws/updates)
  // Replaces the old polling of GET /api/move/running every 500ms
  useActiveMoves(isActive);

  // ⚡ Cleanup is handled on Rust side in lib.rs:
  // - Signal handler (SIGTERM/SIGINT) → cleanup_system_daemons()
  // - on_window_event(CloseRequested) → kill_daemon()
  // - on_window_event(Destroyed) → cleanup_system_daemons()
  // → No need for JS handler (avoids redundancy)

  // Determine current view for automatic resize
  const currentView = useMemo(() => {
    // Compact view: ClosingView (stopping)
    if (isStopping) {
      return 'compact';
    }

    // Expanded view: daemon active
    if (isActive && !hardwareError) {
      return 'expanded';
    }

    // Compact view: all others (FindingRobot, Starting, ReadyToStart)
    return 'compact';
  }, [isActive, hardwareError, isStopping]);

  // Hook to automatically resize the window
  useWindowResize(currentView);

  useEffect(() => {
    // Fetch logs and version on mount
    fetchLogs();
    fetchDaemonVersion();

    // 🔌 USB polling: ONLY when searching for a robot (not connected)
    // Once connected, the daemon handles everything (healthcheck detects disconnection)
    // This prevents race conditions where polling could set isUsbConnected=false during startup
    const shouldPollUsb = !connectionMode;

    // ⚠️ IMPORTANT: Don't check USB until update check is complete
    // This ensures UpdateView is shown FIRST, before USB check
    if (!shouldShowUpdateView && shouldPollUsb) {
      checkUsbRobot();
    }

    const logsInterval = setInterval(fetchLogs, DAEMON_CONFIG.INTERVALS.LOGS_FETCH);
    const usbInterval = setInterval(() => {
      // Only check USB if update check is complete AND we should poll
      if (!shouldShowUpdateView && shouldPollUsb) {
        checkUsbRobot();
      }
    }, DAEMON_CONFIG.INTERVALS.USB_CHECK);
    const versionInterval = setInterval(fetchDaemonVersion, DAEMON_CONFIG.INTERVALS.VERSION_FETCH);
    return () => {
      clearInterval(logsInterval);
      clearInterval(usbInterval);
      clearInterval(versionInterval);
    };
  }, [fetchLogs, checkUsbRobot, fetchDaemonVersion, shouldShowUpdateView, connectionMode]);

  // ✅ USB disconnection detection is now handled by:
  // 1. useRobotState health check (daemon stops responding → crash detection)
  // 2. USB polling only runs when !connectionMode (searching for robot)
  // 3. startConnection() sets isUsbConnected atomically, no race condition
  // 4. hardwareError is reset in startConnection(), no need for separate useEffect

  // Determine which view to display based on app state
  const viewConfig = useViewRouter({
    permissionsGranted,
    isRestarting,
    shouldShowUpdateView,
    isChecking,
    isDownloading,
    downloadProgress,
    updateAvailable,
    updateError,
    onInstallUpdate: installUpdate,
    shouldShowUsbCheck,
    isUsbConnected,
    connectionMode,
    isStarting,
    isStopping,
    isActive,
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
  });

  return (
    <>
      <ViewRouterWrapper viewConfig={viewConfig} />
      {/* 🍞 Global Toast - single instance for all notifications */}
      <Toast
        toast={toast}
        toastProgress={toastProgress}
        onClose={handleCloseToast}
        darkMode={darkMode}
      />
    </>
  );
}

export default App;
