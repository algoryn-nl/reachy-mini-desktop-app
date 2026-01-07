import { useCallback, useRef } from 'react';
import { ROBOT_POSITION_RANGES, EXTENDED_ROBOT_RANGES } from '@utils/inputConstants';
import { clamp } from '@utils/inputHelpers';
import {
  hasSignificantChange,
  generateHeadPositionLog,
  generateBodyYawLog,
  generateAntennasLog,
} from '../utils';

// Body yaw range constants
const BODY_YAW_RANGE = { min: (-160 * Math.PI) / 180, max: (160 * Math.PI) / 180 };

/**
 * Hook to manage position change handlers (UI sliders, joysticks)
 * Extracts handler logic from useRobotPosition for better separation of concerns
 *
 * 🚀 OPTIMIZED: Uses unified command system via sendSingleCommand
 * This ensures all commands go through the adaptive sender with:
 * - Backpressure management (max 1 request in-flight)
 * - Adaptive throttling based on measured latency
 * - Works seamlessly for USB and WiFi
 *
 * @param {Object} params - Hook parameters
 * @param {boolean} params.isActive - Whether the robot is active
 * @param {Object} params.localValues - Current local values state
 * @param {Object} params.robotState - Current robot state
 * @param {Function} params.setLocalValues - Setter for local values
 * @param {Function} params.setIsDragging - Setter for dragging state
 * @param {React.MutableRefObject} params.isDraggingRef - Ref to dragging state
 * @param {React.MutableRefObject} params.lastDragEndTimeRef - Ref to last drag end time
 * @param {React.MutableRefObject} params.targetSmoothingRef - Ref to target smoothing manager
 * @param {React.MutableRefObject} params.antennasRef - Ref to current antennas values
 * @param {Function} params.sendSingleCommand - Function to send single API command (unified system)
 * @param {Function} params.safeAddFrontendLog - Safe logging function
 */
export function usePositionHandlers({
  isActive,
  localValues,
  robotState,
  setLocalValues,
  setIsDragging,
  isDraggingRef,
  lastDragEndTimeRef,
  targetSmoothingRef,
  antennasRef,
  sendSingleCommand,
  safeAddFrontendLog,
}) {
  const lastLoggedPoseRef = useRef(null);
  const lastLogTimeRef = useRef(0);
  const dragStartPoseRef = useRef(null);

  // Handle drag end with logging
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    lastDragEndTimeRef.current = Date.now();

    const finalPose = {
      headPose: localValues.headPose,
      bodyYaw: localValues.bodyYaw,
    };

    if (dragStartPoseRef.current && hasSignificantChange(dragStartPoseRef.current, finalPose)) {
      const now = Date.now();
      if (now - lastLogTimeRef.current > 500) {
        const headLog = generateHeadPositionLog(
          finalPose.headPose,
          dragStartPoseRef.current.headPose
        );
        const bodyLog = generateBodyYawLog(finalPose.bodyYaw, dragStartPoseRef.current.bodyYaw);

        if (headLog && bodyLog) {
          safeAddFrontendLog(`[Controller] ${headLog} | ${bodyLog}`);
        } else if (headLog) {
          safeAddFrontendLog(`[Controller] ${headLog}`);
        } else if (bodyLog) {
          safeAddFrontendLog(`[Controller] ${bodyLog}`);
        }

        lastLoggedPoseRef.current = finalPose;
        lastLogTimeRef.current = now;
      }
    }

    dragStartPoseRef.current = null;
  }, [localValues, setIsDragging, isDraggingRef, lastDragEndTimeRef, safeAddFrontendLog]);

  // Handle head pose changes
  const handleChange = useCallback(
    (updates, continuous = false) => {
      const newHeadPose = { ...localValues.headPose, ...updates };

      const clampedHeadPose = {
        x: clamp(
          newHeadPose.x,
          EXTENDED_ROBOT_RANGES.POSITION.min,
          EXTENDED_ROBOT_RANGES.POSITION.max
        ),
        y: clamp(
          newHeadPose.y,
          EXTENDED_ROBOT_RANGES.POSITION.min,
          EXTENDED_ROBOT_RANGES.POSITION.max
        ),
        z: clamp(
          newHeadPose.z,
          ROBOT_POSITION_RANGES.POSITION.min,
          ROBOT_POSITION_RANGES.POSITION.max
        ),
        pitch: clamp(
          newHeadPose.pitch,
          EXTENDED_ROBOT_RANGES.PITCH.min,
          EXTENDED_ROBOT_RANGES.PITCH.max
        ),
        yaw: clamp(newHeadPose.yaw, EXTENDED_ROBOT_RANGES.YAW.min, EXTENDED_ROBOT_RANGES.YAW.max),
        roll: clamp(
          newHeadPose.roll,
          ROBOT_POSITION_RANGES.ROLL.min,
          ROBOT_POSITION_RANGES.ROLL.max
        ),
      };

      if (continuous) {
        if (!isDraggingRef.current && !dragStartPoseRef.current) {
          dragStartPoseRef.current = {
            headPose: { ...localValues.headPose },
            bodyYaw: localValues.bodyYaw,
          };
        }

        setLocalValues(prev => ({ ...prev, headPose: clampedHeadPose }));

        const antennas = robotState.antennas || [0, 0];
        targetSmoothingRef.current.setTargets({
          headPose: clampedHeadPose,
          antennas: antennas,
          bodyYaw: localValues.bodyYaw,
        });

        setIsDragging(true);
        isDraggingRef.current = true;
      } else {
        const antennas = robotState.antennas || [0, 0];
        targetSmoothingRef.current.setTargets({
          headPose: clampedHeadPose,
          antennas: antennas,
          bodyYaw: localValues.bodyYaw,
        });

        const newPose = { headPose: clampedHeadPose, bodyYaw: localValues.bodyYaw };
        const now = Date.now();
        if (
          hasSignificantChange(lastLoggedPoseRef.current, newPose) &&
          now - lastLogTimeRef.current > 500
        ) {
          const headLog = generateHeadPositionLog(
            newPose.headPose,
            lastLoggedPoseRef.current?.headPose
          );
          if (headLog) {
            safeAddFrontendLog(`→ ${headLog}`);
          }
          lastLoggedPoseRef.current = newPose;
          lastLogTimeRef.current = now;
        }

        // Send API call via unified command system (handles throttling/backpressure)
        // Small delay to let smoothing start, then send final position
        setTimeout(() => {
          const smoothed = targetSmoothingRef.current.getCurrentValues();
          sendSingleCommand(smoothed.headPose, smoothed.antennas, smoothed.bodyYaw);
        }, 50);
      }
    },
    [
      localValues,
      robotState.antennas,
      setLocalValues,
      setIsDragging,
      isDraggingRef,
      targetSmoothingRef,
      sendSingleCommand,
      safeAddFrontendLog,
    ]
  );

  // Handle body yaw changes
  const handleBodyYawChange = useCallback(
    (value, continuous = false) => {
      const validValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const clampedValue = clamp(validValue, BODY_YAW_RANGE.min, BODY_YAW_RANGE.max);

      if (continuous) {
        setLocalValues(prev => ({ ...prev, bodyYaw: clampedValue }));
        targetSmoothingRef.current.setTargets({ bodyYaw: clampedValue });
        setIsDragging(true);
        isDraggingRef.current = true;
      } else {
        targetSmoothingRef.current.setTargets({ bodyYaw: clampedValue });

        const now = Date.now();
        if (now - lastLogTimeRef.current > 500) {
          const bodyLog = generateBodyYawLog(clampedValue, lastLoggedPoseRef.current?.bodyYaw);
          if (bodyLog) {
            safeAddFrontendLog(`→ ${bodyLog}`);
          }
          lastLogTimeRef.current = now;
          lastLoggedPoseRef.current = { headPose: localValues.headPose, bodyYaw: clampedValue };
        }

        setIsDragging(false);
        isDraggingRef.current = false;
        lastDragEndTimeRef.current = Date.now();

        // Send via unified command system
        setTimeout(() => {
          if (!isActive) return;
          const smoothed = targetSmoothingRef.current.getCurrentValues();
          sendSingleCommand(robotState.headPose, robotState.antennas, smoothed.bodyYaw);
        }, 50);
      }
    },
    [
      isActive,
      localValues.headPose,
      robotState.headPose,
      robotState.antennas,
      setLocalValues,
      setIsDragging,
      isDraggingRef,
      lastDragEndTimeRef,
      targetSmoothingRef,
      sendSingleCommand,
      safeAddFrontendLog,
    ]
  );

  // Handle antennas changes
  const handleAntennasChange = useCallback(
    (antenna, value, continuous = false) => {
      const currentAntennas =
        antennasRef.current.length === 2 ? antennasRef.current : localValues.antennas || [0, 0];
      const newAntennas =
        antenna === 'left' ? [value, currentAntennas[1]] : [currentAntennas[0], value];

      const clampedAntennas = [
        clamp(newAntennas[0], ROBOT_POSITION_RANGES.ANTENNA.min, ROBOT_POSITION_RANGES.ANTENNA.max),
        clamp(newAntennas[1], ROBOT_POSITION_RANGES.ANTENNA.min, ROBOT_POSITION_RANGES.ANTENNA.max),
      ];

      antennasRef.current = clampedAntennas;

      if (continuous) {
        setLocalValues(prev => ({ ...prev, antennas: clampedAntennas }));
        targetSmoothingRef.current.setTargets({ antennas: clampedAntennas });
        setIsDragging(true);
        isDraggingRef.current = true;
      } else {
        targetSmoothingRef.current.setTargets({ antennas: clampedAntennas });

        const now = Date.now();
        if (now - lastLogTimeRef.current > 500) {
          const antennasLog = generateAntennasLog(
            clampedAntennas,
            lastLoggedPoseRef.current?.antennas
          );
          if (antennasLog) {
            safeAddFrontendLog(`→ ${antennasLog}`);
          }
          lastLogTimeRef.current = now;
        }

        setIsDragging(false);
        isDraggingRef.current = false;
        lastDragEndTimeRef.current = Date.now();

        // Send via unified command system
        setTimeout(() => {
          if (!isActive) return;
          const smoothed = targetSmoothingRef.current.getCurrentValues();
          sendSingleCommand(robotState.headPose, smoothed.antennas, robotState.bodyYaw);
        }, 50);
      }
    },
    [
      isActive,
      localValues.antennas,
      robotState.headPose,
      robotState.bodyYaw,
      antennasRef,
      setLocalValues,
      setIsDragging,
      isDraggingRef,
      lastDragEndTimeRef,
      targetSmoothingRef,
      sendSingleCommand,
      safeAddFrontendLog,
    ]
  );

  return {
    handleChange,
    handleBodyYawChange,
    handleAntennasChange,
    handleDragEnd,
  };
}
