import { useEffect, useRef } from 'react';
import useAppStore from '../../store/useAppStore';
import { DAEMON_CONFIG } from '../../config/daemon';

/**
 * Hook to manage app installation/uninstallation lifecycle
 * Handles job tracking, overlay display, and completion
 */
export function useAppInstallation({
  activeJobs,
  installedApps,
  showToast,
  refreshApps,
  onInstallSuccess,
}) {
  const pendingTimeouts = useRef([]);
  const pollingIntervalRef = useRef(null);
  
  // ✅ Get state from store (reactive)
  const installingAppName = useAppStore(state => state.installingAppName);
  const installJobType = useAppStore(state => state.installJobType);
  const installStartTime = useAppStore(state => state.installStartTime);
  const jobSeenOnce = useAppStore(state => state.jobSeenOnce);
  const processedJobs = useAppStore(state => state.processedJobs);
  
  // ✅ Get actions from store
  const { unlockInstall, setInstallResult, markJobAsSeen, markJobAsProcessed } = useAppStore();
  
  // ✅ Cleanup pending timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(clearTimeout);
      pendingTimeouts.current = [];
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);
  
  // ✅ Cleanup polling interval when installation is cancelled/stopped
  useEffect(() => {
    if (!installingAppName && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [installingAppName]);
  
  // ✅ Main effect: Track job progress and handle completion
  useEffect(() => {
    // If no installation in progress, nothing to do
    if (!installingAppName) {
      return;
    }
    
    // Check if we've already processed this job to avoid infinite loops
    const jobKey = `${installingAppName}_${installJobType}`;
    if (processedJobs.includes(jobKey)) {
      return; // Already processed, skip
    }
    
    // Find the current job in activeJobs
    let jobFound = null;
    for (const [jobId, job] of activeJobs.entries()) {
      if (job.appName === installingAppName) {
        jobFound = job;
        break;
      }
    }
    
    // If we found the job, mark it as seen
    if (jobFound && !jobSeenOnce) {
      markJobAsSeen();
    }
    
    // Determine if job is finished
    // IMPORTANT: Only consider job "removed" if we've seen it at least once
    const jobWasRemoved = !jobFound && installStartTime !== null && jobSeenOnce;
    const jobIsCompleted = jobFound && (jobFound.status === 'completed' || jobFound.status === 'failed');
    
    if (!jobWasRemoved && !jobIsCompleted) {
      return; // Job still in progress
    }
    
    // ✅ Mark this job as processed IMMEDIATELY to avoid re-processing
    markJobAsProcessed(installingAppName, installJobType);
    
    // ✨ Detect success/failure from job status or logs
    let wasCompleted = false;
    let wasFailed = false;
    
    if (jobFound?.status === 'completed') {
      wasCompleted = true;
    } else if (jobFound?.status === 'failed') {
      wasFailed = true;
    } else if (jobFound?.logs) {
      // Analyze logs to detect result
      const allLogs = jobFound.logs.join(' ');
      const hasSuccess = allLogs.includes('Successfully installed') || 
                        allLogs.includes('Successfully uninstalled') || 
                        allLogs.includes('completed successfully');
      const hasError = allLogs.includes('Failed') || 
                      allLogs.includes('Error:') || 
                      allLogs.includes('error:');
      
      if (hasSuccess) {
        wasCompleted = true;
      } else if (hasError) {
        wasFailed = true;
      } else {
        // Default: success if job disappeared cleanly
        wasCompleted = true;
      }
    } else {
      // No logs available: consider as success by default
      wasCompleted = true;
    }
    
    const isUninstall = installJobType === 'remove';
    
    // ⏱️ Calculate minimum display time (from config for uninstall, 0s for install)
    const MINIMUM_DISPLAY_TIME = isUninstall ? DAEMON_CONFIG.MIN_DISPLAY_TIMES.APP_UNINSTALL : 0;
    const elapsedTime = installStartTime ? Date.now() - installStartTime : MINIMUM_DISPLAY_TIME;
    const remainingTime = Math.max(0, MINIMUM_DISPLAY_TIME - elapsedTime);
    
    // 🎯 Helper: Check if app is in installedApps list (case-insensitive)
    const isAppInInstalledList = (appName) => {
      if (!appName || !installedApps || installedApps.length === 0) return false;
      const appNameLower = appName.toLowerCase();
      return installedApps.some(app => 
        app.name?.toLowerCase() === appNameLower ||
        app.id?.toLowerCase() === appNameLower
      );
    };
    
    // 🎯 Function to wait for app to appear in list, then show success and close
    const waitForAppThenClose = () => {
      // For uninstall, check if app is removed from list
      // For install, check if app appears in list
      const shouldWaitForListUpdate = wasCompleted && !isUninstall;
      
      if (!shouldWaitForListUpdate || wasFailed) {
        // For uninstall or failed install: show result immediately, then close after delay
        setInstallResult(wasCompleted ? 'success' : 'failed');
        
        const closeTimeout = setTimeout(() => {
          unlockInstall();
        
        // Close discover modal if installation succeeded (not uninstall)
        if (wasCompleted && !isUninstall && onInstallSuccess) {
          onInstallSuccess();
        }
        
        // Result toast
        if (showToast) {
          if (wasCompleted) {
            const actionType = isUninstall ? 'uninstalled' : 'installed';
            showToast(`✅ ${installingAppName} ${actionType} successfully`, 'success');
          } else if (wasFailed) {
            const actionType = isUninstall ? 'uninstall' : 'install';
            showToast(`❌ Failed to ${actionType} ${installingAppName}`, 'error');
          }
        }
      }, DAEMON_CONFIG.APP_INSTALLATION.RESULT_DISPLAY_DELAY);
      
        pendingTimeouts.current.push(closeTimeout);
        return;
      }
      
      // 1️⃣ For successful install: Refresh apps list first
      if (refreshApps) {
        refreshApps();
      }
      
      // 2️⃣ Poll until app appears in installedApps list
      let attempts = 0;
      const MAX_ATTEMPTS = 30; // 30 attempts × 500ms = 15s max
      const POLL_INTERVAL = 500; // Check every 500ms
      
      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      pollingIntervalRef.current = setInterval(() => {
        attempts++;
        
        // Check if app is now in the list
        if (isAppInInstalledList(installingAppName)) {
          // Clear polling interval
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          // 3️⃣ App found! Now show success state
          setInstallResult('success');
          
          // 4️⃣ Wait 3 seconds to show success state, then close
          const closeTimeout = setTimeout(() => {
            unlockInstall();
            
            // Close discover modal if installation succeeded
            if (onInstallSuccess) {
              onInstallSuccess();
            }
            
            // Result toast
            if (showToast) {
              showToast(`✅ ${installingAppName} installed successfully`, 'success');
            }
          }, DAEMON_CONFIG.APP_INSTALLATION.RESULT_DISPLAY_DELAY);
          
          pendingTimeouts.current.push(closeTimeout);
        } else if (attempts >= MAX_ATTEMPTS) {
          // Timeout: show success anyway and close after delay
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          console.warn(`⚠️ App ${installingAppName} did not appear in list after ${MAX_ATTEMPTS} attempts`);
          
          // Show success state even if not found in list (might be a delay issue)
          setInstallResult('success');
          
          const closeTimeout = setTimeout(() => {
            unlockInstall();
            
            if (onInstallSuccess) {
              onInstallSuccess();
            }
            
            if (showToast) {
              showToast(`✅ ${installingAppName} installed successfully`, 'success');
            }
          }, DAEMON_CONFIG.APP_INSTALLATION.RESULT_DISPLAY_DELAY);
          
          pendingTimeouts.current.push(closeTimeout);
        } else {
          // Continue polling: refresh apps list periodically
          if (refreshApps && attempts % 4 === 0) {
            // Refresh every 2s (4 attempts × 500ms)
            refreshApps();
          }
        }
      }, POLL_INTERVAL);
    };
    
    // Wait minimum delay if necessary, then start waiting for app to appear
    if (remainingTime > 0) {
      const delayTimeout = setTimeout(waitForAppThenClose, remainingTime);
      pendingTimeouts.current.push(delayTimeout);
    } else {
      waitForAppThenClose();
    }
  }, [
    activeJobs,
    installedApps,
    installingAppName,
    installJobType,
    installStartTime,
    jobSeenOnce,
    processedJobs,
    unlockInstall,
    setInstallResult,
    markJobAsSeen,
    markJobAsProcessed,
    showToast,
    refreshApps,
    onInstallSuccess,
  ]);
}

