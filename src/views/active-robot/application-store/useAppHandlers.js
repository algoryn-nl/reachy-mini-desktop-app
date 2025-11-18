import { useState, useEffect, useRef } from 'react';
import useAppStore from '../../../store/useAppStore';

/**
 * Hook to handle all app actions
 * Extracted from ApplicationStore.jsx to clarify logic
 */
export function useAppHandlers({
  currentApp,
  activeJobs,
  installApp,
  removeApp,
  startApp,
  stopCurrentApp,
  showToast,
  refreshApps, // Callback to force list refresh
}) {
  const { lockForApp, unlockApp, lockForInstall, unlockInstall, setInstallResult } = useAppStore();
  
  const [expandedApp, setExpandedApp] = useState(null);
  const [appSettings, setAppSettings] = useState({});
  const [startingApp, setStartingApp] = useState(null);
  const notifiedJobs = useRef(new Set());
  const installStartTime = useRef(null); // Track start time for minimum display duration (4s)
  const installJobType = useRef(null); // Track job type (install/remove) for messages
  const pendingTimeouts = useRef([]); // Track timeouts for cleanup

  // Effect to detect completed installations/uninstallations and show a toast
  useEffect(() => {
    if (!showToast) return;
    
    // Iterate through all active jobs
    activeJobs.forEach((job, jobId) => {
      // If the job is completed and not yet notified
      if (job.status === 'completed' && !notifiedJobs.current.has(jobId)) {
        // Mark as notified
        notifiedJobs.current.add(jobId);
        
        // Show success toast
        if (job.type === 'install') {
          showToast(`✅ ${job.appName} installed successfully!`, 'success');
        } else if (job.type === 'remove') {
          showToast(`✅ ${job.appName} uninstalled successfully!`, 'success');
        }
      }
    });
    
    // Clean up refs of jobs that are no longer in activeJobs
    const currentJobIds = new Set(activeJobs.keys());
    notifiedJobs.current.forEach(jobId => {
      if (!currentJobIds.has(jobId)) {
        notifiedJobs.current.delete(jobId);
      }
    });
  }, [activeJobs, showToast]);

  // ✅ Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      // Clean all pending timeouts
      pendingTimeouts.current.forEach(clearTimeout);
      pendingTimeouts.current = [];
    };
  }, []);

  // ✅ Check if all jobs are finished to unlock immediately
  useEffect(() => {
    const state = useAppStore.getState();
    const installingAppName = state.installingAppName;
    
    // If no installation in progress but there are still jobs, do nothing
    if (!installingAppName) {
      // ✅ If no installation but there was a job, ensure everything is cleaned up
      if (activeJobs.size === 0 && installStartTime.current) {
        installStartTime.current = null;
        installJobType.current = null;
      }
      return;
    }
    
    // ✅ Check if all installation jobs are finished
    const hasActiveInstallJobs = Array.from(activeJobs.values()).some(
      job => job.appName === installingAppName && 
             job.status !== 'completed' && 
             job.status !== 'failed'
    );
    
    // If no more active jobs for this app, job is finished (even if not yet cleaned up)
    if (!hasActiveInstallJobs && installStartTime.current) {
      // Cleanup will be done by the other useEffect that manages overlay
    }
  }, [activeJobs]);
  
  // ✅ Listen to active jobs and manage overlay lifecycle
  // Minimum delay of 4s for uninstalls + 2s result display
  useEffect(() => {
    const installingAppName = useAppStore.getState().installingAppName;
    
    // If no installation in progress, nothing to do
    if (!installingAppName) {
      return;
    }
    
    // Check if current app's job is finished
    let jobFound = null;
    for (const [jobId, job] of activeJobs.entries()) {
      if (job.appName === installingAppName) {
        jobFound = job;
        break;
      }
    }
    
    // If job no longer exists OR if it's marked completed/failed
    // ✅ Also check if job was removed (sign it's finished)
    const jobWasRemoved = !jobFound && installStartTime.current !== null;
    if (jobWasRemoved || (jobFound && (jobFound.status === 'completed' || jobFound.status === 'failed'))) {
      
      // ✨ Intelligent success detection from logs
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
      
      // Use type stored at start (because jobFound can be undefined)
      const jobType = installJobType.current || 'install';
      const isUninstall = jobType === 'remove';
      
      // ⏱️ Calculate minimum display time (4s for uninstall, 0s for install)
      const MINIMUM_DISPLAY_TIME = isUninstall ? 4000 : 0;
      const elapsedTime = installStartTime.current ? Date.now() - installStartTime.current : MINIMUM_DISPLAY_TIME;
      const remainingTime = Math.max(0, MINIMUM_DISPLAY_TIME - elapsedTime);
      
      // 🎯 Function to show result then close
      const showResultThenClose = () => {
        // 1️⃣ Show result in overlay
        setInstallResult(wasCompleted ? 'success' : 'failed');
        
        // ✅ Unlock IMMEDIATELY to allow health checks to resume
        // (but keep overlay open for result display)
        unlockInstall();
        
        // 2️⃣ Wait 2s then close and show toast
        const toastTimeout = setTimeout(() => {
          installStartTime.current = null;
          installJobType.current = null;
          
          // Refresh apps list (to ensure installed app appears)
          if (refreshApps) {
            refreshApps();
          }
          
          // Result toast
          if (showToast) {
            const appName = installingAppName;
            if (wasCompleted) {
              const actionType = isUninstall ? 'uninstalled' : 'installed';
              showToast(`✅ ${appName} ${actionType} successfully`, 'success');
            } else if (wasFailed) {
              const actionType = isUninstall ? 'uninstall' : 'install';
              showToast(`❌ Failed to ${actionType} ${appName}`, 'error');
            }
          }
        }, 2000);
        
        pendingTimeouts.current.push(toastTimeout);
      };
      
      // Wait minimum delay if necessary
      if (remainingTime > 0) {
        const delayTimeout = setTimeout(showResultThenClose, remainingTime);
        pendingTimeouts.current.push(delayTimeout);
      } else {
        showResultThenClose();
      }
    }
  }, [activeJobs, unlockInstall, showToast, setInstallResult]);

  const handleInstall = async (appInfo) => {
    try {
      // ✅ Lock with job type
      lockForInstall(appInfo.name, 'install');
      installStartTime.current = Date.now();
      installJobType.current = 'install'; // 📝 Local backup
      
      // Launch installation (returns job_id, doesn't block)
      await installApp(appInfo);
      
      // Note: Unlocking and completion toasts are managed by useEffect
      // that listens to activeJobs and detects when job finishes
    } catch (err) {
      console.error('Failed to install:', err);
      
      // ✅ Error at start: reset everything
      installStartTime.current = null;
      installJobType.current = null;
      setInstallResult(null);
      unlockInstall();
      
      // Specific user message for permission errors
      if (err.name === 'PermissionDeniedError' || err.name === 'SystemPopupTimeoutError') {
        const message = err.userFriendly 
          ? err.message 
          : `🔒 ${appInfo.name}: System permission required. Please accept the permission dialog if it appears.`;
        
        if (showToast) {
          showToast(message, 'warning'); // Use 'warning' instead of 'error' for permissions
        }
      } else {
        // Standard error
        if (showToast) {
          showToast(`❌ Failed to start install ${appInfo.name}: ${err.message}`, 'error');
        }
      }
    }
  };
  
  const handleUninstall = async (appName) => {
    try {
      // ✅ Lock with job type
      lockForInstall(appName, 'remove');
      installStartTime.current = Date.now();
      installJobType.current = 'remove'; // 📝 Local backup
      
      await removeApp(appName);
      setExpandedApp(null);
      
      // Note: Unlocking and completion toasts are managed by useEffect
      // that listens to activeJobs and detects when job finishes
    } catch (err) {
      console.error('Failed to uninstall:', err);
      
      // ✅ Error at start: reset everything
      installStartTime.current = null;
      installJobType.current = null;
      setInstallResult(null);
      unlockInstall();
      
      // Specific user message for permission errors
      if (err.name === 'PermissionDeniedError' || err.name === 'SystemPopupTimeoutError') {
        const message = err.userFriendly 
          ? err.message 
          : `🔒 ${appName}: System permission required. Please accept the permission dialog if it appears.`;
        
        if (showToast) {
          showToast(message, 'warning');
        }
      } else {
        if (showToast) {
          showToast(`❌ Failed to start uninstall ${appName}: ${err.message}`, 'error');
        }
      }
    }
  };
  
  const handleStartApp = async (appName) => {
    try {
      // ✅ Check if robot is busy (quick action in progress)
      if (useAppStore.getState().isCommandRunning) {
        showToast('⚠️ Please wait for the current action to finish', 'warning');
        console.warn(`⚠️ Cannot start ${appName}: quick action is running`);
        return;
      }
      
      // Check if another app is already running
      if (currentApp && currentApp.info && currentApp.info.name !== appName) {
        const shouldStop = window.confirm(`${currentApp.info.name} is currently running. Stop it and launch ${appName}?`);
        if (!shouldStop) return;
        
        // Stop the current app
        await stopCurrentApp();
        unlockApp(); // Unlock
        // Wait a bit for the app to stop
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setStartingApp(appName);
      const result = await startApp(appName);
      
      // ✅ Lock to prevent quick actions
      lockForApp(appName);
      
      setStartingApp(null);
    } catch (err) {
      console.error(`❌ Failed to start ${appName}:`, err);
      setStartingApp(null);
      unlockApp(); // Ensure unlock on error
      alert(`Failed to start app: ${err.message}`);
    }
  };
  
  const updateAppSetting = (appName, key, value) => {
    setAppSettings(prev => ({
      ...prev,
      [appName]: {
        ...prev[appName],
        [key]: value,
      },
    }));
    // TODO: Call API to save settings (if available)
  };
  
  // Check if an app is being installed/removed
  const isJobRunning = (appName, jobType) => {
    for (const [jobId, job] of activeJobs.entries()) {
      if (job.appName === appName && job.type === jobType) {
        return true;
      }
    }
    return false;
  };
  
  // Get job info (status + logs)
  const getJobInfo = (appName, jobType) => {
    for (const [jobId, job] of activeJobs.entries()) {
      if (job.appName === appName && job.type === jobType) {
        return job;
      }
    }
    return null;
  };

  return {
    expandedApp,
    setExpandedApp,
    appSettings,
    updateAppSetting,
    startingApp,
    handleInstall,
    handleUninstall,
    handleStartApp,
    isJobRunning,
    getJobInfo,
    stopCurrentApp,
  };
}

