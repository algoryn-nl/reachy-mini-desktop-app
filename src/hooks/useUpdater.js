import { useState, useEffect, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Hook to manage automatic application updates
 * Enhanced version with retry logic and robust error handling
 * 
 * @param {object} options - Configuration options
 * @param {boolean} options.autoCheck - Automatically check on startup (default: true)
 * @param {number} options.checkInterval - Check interval in ms (default: 3600000 = 1h)
 * @param {boolean} options.silent - Silent mode (no notification if no update)
 * @param {number} options.maxRetries - Maximum number of retries on error (default: 3)
 * @param {number} options.retryDelay - Initial delay between retries in ms (default: 1000)
 * @returns {object} State and update functions
 */
export const useUpdater = ({
  autoCheck = true,
  checkInterval = 3600000, // 1 hour by default
  silent = false,
  maxRetries = 3,
  retryDelay = 1000,
} = {}) => {
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);
  const lastCheckTimeRef = useRef(null);

  /**
   * Detects if an error is recoverable (network, timeout)
   */
  const isRecoverableError = useCallback((err) => {
    if (!err) return false;
    const errorMsg = err.message?.toLowerCase() || '';
    const errorName = err.name?.toLowerCase() || '';
    
    // Recoverable errors: network, timeout, connection
    const recoverablePatterns = [
      'network',
      'timeout',
      'connection',
      'fetch',
      'econnrefused',
      'enotfound',
      'etimedout',
    ];
    
    return recoverablePatterns.some(pattern => 
      errorMsg.includes(pattern) || errorName.includes(pattern)
    );
  }, []);

  /**
   * Retry with exponential backoff
   */
  const sleep = useCallback((ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }, []);

  /**
   * Checks if an update is available with automatic retry
   */
  const checkForUpdates = useCallback(async (retryCount = 0) => {
    setIsChecking(true);
    setError(null);

    try {
      const update = await check();
      
      // Reset retry count on success
      retryCountRef.current = 0;
      lastCheckTimeRef.current = Date.now();
      
      if (update) {
        setUpdateAvailable(update);
        return update;
      } else {
        setUpdateAvailable(null);
        return null;
      }
    } catch (err) {
      console.error(`❌ Error checking for updates (attempt ${retryCount + 1}/${maxRetries}):`, err);
      console.error('❌ Error details:', err.message, err.stack);
      
      // Automatic retry for recoverable errors
      if (isRecoverableError(err) && retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
        
        await sleep(delay);
        retryCountRef.current = retryCount + 1;
        return checkForUpdates(retryCount + 1);
      }
      
      // Non-recoverable error or max retries reached
      const errorMessage = isRecoverableError(err)
        ? `Network error while checking for updates (${retryCount + 1}/${maxRetries} attempts)`
        : err.message || 'Error checking for updates';
      
      setError(errorMessage);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [silent, maxRetries, retryDelay, isRecoverableError, sleep]);

  /**
   * Downloads and installs the update with robust error handling
   */
  const downloadAndInstall = useCallback(async (update, retryCount = 0) => {
    if (!update) {
      console.warn('⚠️ No update available');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      let lastProgress = 0;
      let lastUpdateTime = Date.now();
      let progressTimeout = null;
      let animationFrameId = null;
      let targetProgress = 0;
      let currentDisplayProgress = 0;

      // Animation function for smooth interpolation
      const animateProgress = () => {
        if (currentDisplayProgress < targetProgress) {
          // Linear interpolation for smooth animation
          const increment = Math.max(0.5, (targetProgress - currentDisplayProgress) * 0.1);
          currentDisplayProgress = Math.min(targetProgress, currentDisplayProgress + increment);
          setDownloadProgress(Math.round(currentDisplayProgress));
          animationFrameId = requestAnimationFrame(animateProgress);
        } else {
          animationFrameId = null;
        }
      };

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            lastProgress = 0;
            targetProgress = 0;
            // Safety timeout: if no progress for 30s, consider as error
            progressTimeout = setTimeout(() => {
              console.warn('⚠️ Download stalled, timeout...');
            }, 30000);
            break;
          
          case 'Progress':
            const { chunkLength, contentLength } = event.data;
            const progress = contentLength > 0 
              ? Math.round((chunkLength / contentLength) * 100)
              : 0;
            
            // Always update target, even for small changes
            targetProgress = progress;
            
            // Update immediately if significant change or if it's the first time
            const timeSinceLastUpdate = Date.now() - lastUpdateTime;
            if (Math.abs(progress - lastProgress) >= 0.5 || timeSinceLastUpdate > 100 || progress === 100) {
              // Stop animation if target reached
              if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
              }
              currentDisplayProgress = progress;
              setDownloadProgress(progress);
              lastProgress = progress;
              lastUpdateTime = Date.now();
            } else {
              // Start animation for smooth interpolation
              if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(animateProgress);
              }
            }
            
            // Reset timeout if progress detected
            if (progressTimeout) {
              clearTimeout(progressTimeout);
              progressTimeout = setTimeout(() => {
                console.warn('⚠️ Download stalled, timeout...');
              }, 30000);
            }
            
            break;
          
          case 'Finished':
            // Stop animation
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
            setDownloadProgress(100);
            targetProgress = 100;
            if (progressTimeout) {
              clearTimeout(progressTimeout);
            }
            break;
          
          default:
            break;
        }
      });
      
      // downloadAndInstall should handle restart automatically,
      // but we call relaunch() explicitly to ensure restart happens
      // Note: In dev mode, relaunch might not work correctly
      try {
        // Small delay to ensure installation is complete before restarting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Attempt to relaunch
        await relaunch();
        
        // If we reach here, relaunch didn't work (shouldn't happen)
        console.warn('⚠️ Relaunch returned without error, but app should have restarted');
      } catch (relaunchError) {
        console.error('❌ Error during relaunch:', relaunchError);
        // In dev mode, relaunch might fail - this is expected
        // The app should still restart automatically via Tauri's updater mechanism
        // Don't throw here, as the update was successful
      }
    } catch (err) {
      console.error(`❌ Error installing update (attempt ${retryCount + 1}/${maxRetries}):`, err);
      
      // Extract error message and clean it
      let errorMessage = err.message || err.toString() || 'Error installing update';
      // Remove backticks and extra formatting
      errorMessage = errorMessage.replace(/`/g, '').trim();
      
      // Handle specific error cases
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = 'Update file not found on server. The update may not be available yet.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'Access denied. Please check your update server configuration.';
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      // Automatic retry for recoverable errors during download
      if (isRecoverableError(err) && retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(2, retryCount);
        
        await sleep(delay);
        return downloadAndInstall(update, retryCount + 1);
      }
      
      // Non-recoverable error or max retries reached
      if (isRecoverableError(err)) {
        errorMessage = `Network error while downloading update (${retryCount + 1}/${maxRetries} attempts). Please try again later.`;
      }
      
          setError(errorMessage);
          setIsDownloading(false);
          setDownloadProgress(0);
          // Clean up animation on error
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      }, [maxRetries, retryDelay, isRecoverableError, sleep]);

  /**
   * Installe la mise à jour disponible
   */
  const installUpdate = useCallback(async () => {
    if (updateAvailable) {
      await downloadAndInstall(updateAvailable);
    }
  }, [updateAvailable, downloadAndInstall]);

  /**
   * Ignore la mise à jour disponible
   */
  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(null);
  }, []);

  // Automatic check on startup (with delay to avoid blocking startup)
  useEffect(() => {
    if (autoCheck) {
      // Wait for app to be fully loaded before checking
      const timeout = setTimeout(() => {
        checkForUpdates();
      }, 2000); // 2 seconds after startup
      
      return () => clearTimeout(timeout);
    }
  }, [autoCheck, checkForUpdates]);

  // Periodic check (only if no recent check)
  useEffect(() => {
    if (!autoCheck || checkInterval <= 0) return;

    const interval = setInterval(() => {
      // Don't check if a check was done recently (< 5 min)
      const timeSinceLastCheck = lastCheckTimeRef.current 
        ? Date.now() - lastCheckTimeRef.current 
        : Infinity;
      
      if (timeSinceLastCheck > 5 * 60 * 1000) { // 5 minutes
        checkForUpdates();
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [autoCheck, checkInterval, checkForUpdates]);

  return {
    updateAvailable,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    checkForUpdates,
    installUpdate,
    dismissUpdate,
  };
};

