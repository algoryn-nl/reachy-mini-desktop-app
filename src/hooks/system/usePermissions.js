import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isMacOS } from '../../utils/platform';

/**
 * Hook to check macOS permissions (camera, microphone)
 * Uses tauri-plugin-macos-permissions plugin
 * Checks periodically and returns the current status
 * Exposes a manual refresh function for immediate checks
 *
 * On non-macOS platforms (Windows, Linux), permissions are automatically granted
 * as these platforms handle permissions at the browser/webview level.
 *
 * Uses a version counter to prevent race conditions where stale
 * API responses could overwrite more recent permission states.
 */
export function usePermissions({ checkInterval = 2000 } = {}) {
  const isMac = isMacOS();
  const [cameraGranted, setCameraGranted] = useState(!isMac); // Auto-grant on non-macOS
  const [microphoneGranted, setMicrophoneGranted] = useState(!isMac); // Auto-grant on non-macOS
  const [isChecking, setIsChecking] = useState(isMac); // Only check on macOS
  const [hasChecked, setHasChecked] = useState(!isMac); // Already "checked" on non-macOS

  // 🔒 Race condition protection: track the current check version
  // If a newer check is launched, older responses will be ignored
  const checkVersionRef = useRef(0);

  const checkPermissions = useCallback(async () => {
    // Skip permission checks on non-macOS platforms
    // Windows and Linux handle camera/microphone permissions at the webview level
    if (!isMac) {
      console.log('[usePermissions] ℹ️ Non-macOS platform detected - skipping permission checks (auto-granted)');
      return;
    }

    // Increment version for this check - any older pending checks become stale
    const currentVersion = ++checkVersionRef.current;

    try {
      setIsChecking(true);

      // Use tauri-plugin-macos-permissions plugin
      // Format: plugin:macos-permissions|check_camera_permission (with underscores, no params)
      console.log(`[usePermissions] 🔍 Checking camera permission via plugin... (v${currentVersion})`);
      const cameraStartTime = Date.now();
      const cameraStatus = await invoke('plugin:macos-permissions|check_camera_permission');
      const cameraDuration = Date.now() - cameraStartTime;

      // 🔒 Check if this response is stale (a newer check was launched)
      if (currentVersion !== checkVersionRef.current) {
        console.log(`[usePermissions] ⏭️ Skipping stale camera result (v${currentVersion} < v${checkVersionRef.current})`);
        return;
      }

      console.log(`[usePermissions] ✅ Camera check completed in ${cameraDuration}ms, result: ${cameraStatus} (type: ${typeof cameraStatus})`);

      console.log(`[usePermissions] 🔍 Checking microphone permission via plugin... (v${currentVersion})`);
      const micStartTime = Date.now();
      const micStatus = await invoke('plugin:macos-permissions|check_microphone_permission');
      const micDuration = Date.now() - micStartTime;

      // 🔒 Check again after mic check (another check could have started)
      if (currentVersion !== checkVersionRef.current) {
        console.log(`[usePermissions] ⏭️ Skipping stale microphone result (v${currentVersion} < v${checkVersionRef.current})`);
        return;
      }

      console.log(`[usePermissions] ✅ Microphone check completed in ${micDuration}ms, result: ${micStatus} (type: ${typeof micStatus})`);

      setCameraGranted(cameraStatus === true);
      setMicrophoneGranted(micStatus === true);
      setHasChecked(true);

      console.log(`[usePermissions] 📊 Final state (v${currentVersion}) - Camera: ${cameraStatus === true ? '✅ Granted' : '❌ Not granted'}, Microphone: ${micStatus === true ? '✅ Granted' : '❌ Not granted'}`);
    } catch (error) {
      // 🔒 Don't update state if this check is stale
      if (currentVersion !== checkVersionRef.current) {
        console.log(`[usePermissions] ⏭️ Skipping stale error result (v${currentVersion} < v${checkVersionRef.current})`);
        return;
      }

      console.error('[usePermissions] ❌ Error checking permissions:', error);
      console.error('[usePermissions] Error details:', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        stack: error?.stack,
        toString: String(error)
      });
      setCameraGranted(false);
      setMicrophoneGranted(false);
      setHasChecked(true);
    } finally {
      // 🔒 Only update isChecking if this is still the current check
      if (currentVersion === checkVersionRef.current) {
      setIsChecking(false);
      }
    }
  }, [isMac]);

  useEffect(() => {
    // Check immediately
    checkPermissions();

    // Check periodically
    const interval = setInterval(checkPermissions, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval, checkPermissions]);

  const allGranted = cameraGranted && microphoneGranted;

  return {
    cameraGranted,
    microphoneGranted,
    allGranted,
    isChecking,
    hasChecked,
    refresh: checkPermissions, // Expose manual refresh function
  };
}

