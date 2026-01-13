/**
 * ScanStepsIndicator - Scan-specific wrapper around StepsProgressIndicator
 *
 * Handles the scan-specific logic for calculating progress and current step,
 * then delegates rendering to the generic StepsProgressIndicator component.
 */

import React from 'react';
import StepsProgressIndicator from '../../../components/ui/StepsProgressIndicator';

// Step definitions for scan flow
const SCAN_STEPS = [
  { id: 'start', label: 'Start' },
  { id: 'connect', label: 'Connect' },
  { id: 'healthcheck', label: 'Healthcheck' },
  { id: 'apps', label: 'Apps' },
];

/**
 * Calculate progress percentage based on current scan state
 * 🎯 Bar NEVER exceeds the current step - only advances when step is COMPLETE
 * Steps positions: Start=0%, Connect=33%, Healthcheck=66%, Apps=100%
 */
function getProgress(
  scanComplete,
  waitingForDaemon,
  waitingForMovements,
  waitingForWebSocket,
  waitingForApps,
  daemonStep,
  scanProgress
) {
  // Start phase: bar stays at 0% (step not complete yet)
  if (!scanComplete) {
    return 0;
  }

  // Start complete → bar reaches Connect (33%)
  // Connect phase: bar stays at 33% (step not complete yet)
  if (waitingForDaemon) {
    return 33;
  }

  // Connect complete → bar reaches Healthcheck (66%)
  // Healthcheck phase: bar stays at 66% (step not complete yet)
  if (waitingForMovements || waitingForWebSocket) {
    return 66;
  }

  // Healthcheck complete → bar reaches Apps (100%)
  // Apps phase: bar at 100%
  if (waitingForApps) {
    return 100;
  }

  // All complete: 100%
  return 100;
}

/**
 * Get current step index (0-3, or 4 if complete)
 */
function getCurrentStepIndex(
  scanComplete,
  waitingForDaemon,
  waitingForMovements,
  waitingForWebSocket, // 🎯 WebSocket sync phase (part of Healthcheck)
  waitingForApps,
  daemonStep
) {
  if (!scanComplete) return 0; // Start

  // Handle transitional state - stay on Start as "just completed"
  const isTransitioning =
    !waitingForDaemon && !waitingForMovements && !waitingForWebSocket && !waitingForApps;
  if (isTransitioning) return 1; // Move to Connect

  if (waitingForDaemon) return 1; // Connect
  // 🎯 WebSocket sync is part of Healthcheck step
  if (waitingForMovements || waitingForWebSocket) return 2; // Healthcheck
  if (waitingForApps) return 3; // Apps
  return 4; // All complete
}

function ScanStepsIndicator({
  scanComplete,
  waitingForDaemon,
  waitingForMovements,
  waitingForWebSocket = false, // 🎯 WebSocket sync phase (part of Healthcheck)
  waitingForApps,
  daemonStep,
  darkMode,
  scanProgress = { current: 0, total: 1 },
}) {
  const currentStep = getCurrentStepIndex(
    scanComplete,
    waitingForDaemon,
    waitingForMovements,
    waitingForWebSocket,
    waitingForApps,
    daemonStep
  );

  const progress = getProgress(
    scanComplete,
    waitingForDaemon,
    waitingForMovements,
    waitingForWebSocket,
    waitingForApps,
    daemonStep,
    scanProgress
  );

  return (
    <StepsProgressIndicator
      steps={SCAN_STEPS}
      currentStep={currentStep}
      progress={progress}
      darkMode={darkMode}
    />
  );
}

export default React.memo(ScanStepsIndicator);
