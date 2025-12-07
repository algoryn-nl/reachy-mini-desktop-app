import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Hook to check macOS permissions (camera, microphone)
 * Uses tauri-plugin-macos-permissions plugin directly
 * Checks periodically and returns the current status
 */
export function usePermissions({ checkInterval = 2000 } = {}) {
  const [cameraGranted, setCameraGranted] = useState(false);
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setIsChecking(true);
        
        // Use plugin commands directly
        // Plugin returns boolean directly: true = granted, false = not granted
        const cameraStatus = await invoke('plugin:macos-permissions|check_camera_permission');
        const micStatus = await invoke('plugin:macos-permissions|check_microphone_permission');
        
        // Plugin returns boolean directly (true = granted, false = not granted)
        setCameraGranted(cameraStatus === true);
        setMicrophoneGranted(micStatus === true);
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCameraGranted(false);
        setMicrophoneGranted(false);
        setHasChecked(true);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkPermissions();

    // Check periodically
    const interval = setInterval(checkPermissions, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  const allGranted = cameraGranted && microphoneGranted;

  return {
    cameraGranted,
    microphoneGranted,
    allGranted,
    isChecking,
    hasChecked,
  };
}

