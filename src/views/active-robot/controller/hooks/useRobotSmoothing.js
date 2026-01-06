import { useEffect, useRef, useState } from 'react';
import { TargetSmoothingManager } from '@utils/targetSmoothing';
import { ROBOT_POSITION_RANGES, EXTENDED_ROBOT_RANGES } from '@utils/inputConstants';
import { clamp } from '@utils/inputHelpers';
import { mapRobotToAPI } from '@utils/inputMappings';

// ⚡ PERF: Throttle UI updates to 15fps instead of 60fps
const UI_UPDATE_INTERVAL_MS = 1000 / 15; // ~66ms = 15fps for UI

/**
 * Hook for managing robot position smoothing
 * Handles the continuous smoothing loop that applies to ALL input sources
 * 
 * 🚀 ARCHITECTURE:
 * - Smoothing loop runs at 60fps for smooth interpolation
 * - Calls sendCommand every frame with latest smoothed values
 * - useAdaptiveCommandSender handles:
 *   • Backpressure (max 1 request in-flight)
 *   • Adaptive throttling (USB: ~60fps, WiFi: 10-20fps based on latency)
 *   • Latest value wins (skipped frames don't queue up)
 * - UI state updates throttled to 15fps (React re-renders)
 */
export function useRobotSmoothing(isActive, isDraggingRef, sendCommandRef, setLocalValues) {
  const targetSmoothingRef = useRef(new TargetSmoothingManager());
  const smoothingRafRef = useRef(null);
  const lastUIUpdateRef = useRef(0); // ⚡ Track last UI update time
  const [smoothedValues, setSmoothedValues] = useState({
    headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    bodyYaw: 0,
    antennas: [0, 0],
  });

  // Start continuous smoothing loop (runs every frame)
  // This applies smoothing to ALL input sources (mouse, gamepad, keyboard)
  useEffect(() => {
    if (!isActive) return;

    const smoothingLoop = () => {
      // Update smoothed values towards targets
      const currentSmoothed = targetSmoothingRef.current.update();
      const targetValues = targetSmoothingRef.current.getTargetValues();
      
      // Check if ghost has reached destination (game-like pattern: keep sending until caught up)
      // Calculate difference between current smoothed values and targets
      const headPoseDiff = Math.abs(currentSmoothed.headPose.x - targetValues.headPose.x) +
                          Math.abs(currentSmoothed.headPose.y - targetValues.headPose.y) +
                          Math.abs(currentSmoothed.headPose.z - targetValues.headPose.z) +
                          Math.abs(currentSmoothed.headPose.pitch - targetValues.headPose.pitch) +
                          Math.abs(currentSmoothed.headPose.yaw - targetValues.headPose.yaw) +
                          Math.abs(currentSmoothed.headPose.roll - targetValues.headPose.roll);
      const bodyYawDiff = Math.abs(currentSmoothed.bodyYaw - targetValues.bodyYaw);
      const antennasDiff = Math.abs(currentSmoothed.antennas[0] - targetValues.antennas[0]) +
                          Math.abs(currentSmoothed.antennas[1] - targetValues.antennas[1]);
      
      // Tolerance for considering ghost has reached target (larger to avoid micro-updates)
      const TOLERANCE = 0.01;
      const hasReachedTarget = headPoseDiff < TOLERANCE && bodyYawDiff < TOLERANCE && antennasDiff < TOLERANCE;
      
      // Send smoothed values to robot if:
      // 1. We're actively dragging (mouse or gamepad), OR
      // 2. Ghost hasn't reached target yet (game-like continuous update pattern)
      // This ensures smooth movement continues until ghost catches up
      // IMPORTANT: Always send when dragging, and continue sending until ghost catches up
      const shouldSend = isDraggingRef.current || !hasReachedTarget;
      
      if (shouldSend) {
        // Clamp to actual robot limits before sending
        // Use centralized mappings to transform robot coordinates to API coordinates
        // positionX and positionY are inverted for API
        const apiClampedHeadPose = {
          x: clamp(
            mapRobotToAPI(currentSmoothed.headPose.x, 'positionX'),
            ROBOT_POSITION_RANGES.POSITION.min,
            ROBOT_POSITION_RANGES.POSITION.max
          ),
          y: clamp(
            mapRobotToAPI(currentSmoothed.headPose.y, 'positionY'),
            ROBOT_POSITION_RANGES.POSITION.min,
            ROBOT_POSITION_RANGES.POSITION.max
          ),
          z: clamp(currentSmoothed.headPose.z, ROBOT_POSITION_RANGES.POSITION.min, ROBOT_POSITION_RANGES.POSITION.max),
          pitch: clamp(
            mapRobotToAPI(currentSmoothed.headPose.pitch, 'pitch'),
            ROBOT_POSITION_RANGES.PITCH.min,
            ROBOT_POSITION_RANGES.PITCH.max
          ),
          yaw: clamp(
            mapRobotToAPI(currentSmoothed.headPose.yaw, 'yaw'),
            ROBOT_POSITION_RANGES.YAW.min,
            ROBOT_POSITION_RANGES.YAW.max
          ),
          roll: clamp(
            mapRobotToAPI(currentSmoothed.headPose.roll, 'roll'),
            ROBOT_POSITION_RANGES.ROLL.min,
            ROBOT_POSITION_RANGES.ROLL.max
          ),
        };
        
        sendCommandRef.current(
          apiClampedHeadPose,
          currentSmoothed.antennas,
          currentSmoothed.bodyYaw
        );
      }
      
      // ⚡ PERF: Throttle UI state updates to 15fps
      // Robot commands are adaptively throttled by useAdaptiveCommandSender above
      // Only React re-renders are limited here
      const now = performance.now();
      if (now - lastUIUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
        lastUIUpdateRef.current = now;
      setSmoothedValues({
        headPose: { ...currentSmoothed.headPose },
        bodyYaw: currentSmoothed.bodyYaw,
        antennas: [...currentSmoothed.antennas],
      });
      }
      
      smoothingRafRef.current = requestAnimationFrame(smoothingLoop);
    };

    smoothingRafRef.current = requestAnimationFrame(smoothingLoop);

    return () => {
      if (smoothingRafRef.current) {
        cancelAnimationFrame(smoothingRafRef.current);
        smoothingRafRef.current = null;
      }
    };
  }, [isActive]); // Removed unnecessary dependencies - refs don't need to be in deps

  return {
    targetSmoothingRef,
    smoothingRafRef,
    smoothedValues, // Expose smoothed values for ghost visualization
  };
}

