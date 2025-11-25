import { useEffect, useRef } from 'react';
import useAppStore from '../../../store/useAppStore';

/**
 * Hook to manage app installation/uninstallation lifecycle
 * Handles job tracking, overlay display, and completion
 */
export function useAppInstallation({
  activeJobs,
  showToast,
  refreshApps,
  onInstallSuccess,
}) {
  const pendingTimeouts = useRef([]);
  
  // ✅ Get state from store (reactive)
  const installingAppName = useAppStore(state => state.installingAppName);
  const installJobType = useAppStore(state => state.installJobType);
  const installStartTime = useAppStore(state => state.installStartTime);
  const jobSeenOnce = useAppStore(state => state.jobSeenOnce);
  const processedJobs = useAppStore(state => state.processedJobs);
  
  // ✅ Get actions from store
  const { unlockInstall, setInstallResult, markJobAsSeen, markJobAsProcessed } = useAppStore();
  
  // ✅ Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(clearTimeout);
      pendingTimeouts.current = [];
    };
  }, []);
  
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
    
    // ⏱️ Calculate minimum display time (4s for uninstall, 0s for install)
    const MINIMUM_DISPLAY_TIME = isUninstall ? 4000 : 0;
    const elapsedTime = installStartTime ? Date.now() - installStartTime : MINIMUM_DISPLAY_TIME;
    const remainingTime = Math.max(0, MINIMUM_DISPLAY_TIME - elapsedTime);
    
    // 🎯 Function to show result then close
    const showResultThenClose = () => {
      // 1️⃣ Show result in overlay
      setInstallResult(wasCompleted ? 'success' : 'failed');
      
      // 2️⃣ Wait 2s then close overlay and show toast
      const toastTimeout = setTimeout(() => {
        // Unlock (closes overlay)
        unlockInstall();
        
        // Refresh apps list (to ensure installed app appears)
        if (refreshApps) {
          refreshApps();
        }
        
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
  }, [
    activeJobs,
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

