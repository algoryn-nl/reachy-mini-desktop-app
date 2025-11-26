import { useState, useEffect, useCallback, useRef } from 'react';
import { buildApiUrl, fetchWithTimeout, DAEMON_CONFIG } from '../../../../config/daemon';
import useAppStore from '../../../../store/useAppStore';
import { formatPoseForLog, hasSignificantChange } from '../utils';

/**
 * Hook to manage robot position control logic
 * Handles state synchronization, API calls, continuous updates, and logging
 */
export function useRobotPosition(isActive) {
  const { robotStateFull, addFrontendLog } = useAppStore();
  
  const [robotState, setRobotState] = useState({
    headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    bodyYaw: 0,
    antennas: [0, 0],
  });

  const [localValues, setLocalValues] = useState({
    headPose: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    bodyYaw: 0,
    antennas: [0, 0], // [left, right] in radians
  });
  
  // Initialize antennasRef with initial state
  useEffect(() => {
    if (localValues.antennas && localValues.antennas.length === 2) {
      antennasRef.current = localValues.antennas;
    }
  }, []);

  // Removed interpolation - only using set_target (no interpolation needed)
  const [isDragging, setIsDragging] = useState(false);
  const rafRef = useRef(null);
  const pendingPoseRef = useRef(null);
  const lastSentPoseRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastDragEndTimeRef = useRef(0);
  const lastLoggedPoseRef = useRef(null);
  const dragStartPoseRef = useRef(null);
  const lastLogTimeRef = useRef(0);
  const antennasRef = useRef([0, 0]); // Track antennas during drag for smooth continuous updates

  // ✅ Update robotState from centralized data (NO POLLING)
  useEffect(() => {
    if (!isActive || !robotStateFull.data) return;

    const data = robotStateFull.data;
    const timeSinceDragEnd = Date.now() - lastDragEndTimeRef.current;
    
    if (data.head_pose) {
      const newState = {
        headPose: {
          x: data.head_pose.x || 0,
          y: data.head_pose.y || 0,
          z: data.head_pose.z || 0,
          pitch: data.head_pose.pitch || 0,
          yaw: data.head_pose.yaw || 0,
          roll: data.head_pose.roll || 0,
        },
        bodyYaw: typeof data.body_yaw === 'number' ? data.body_yaw : 0,
        antennas: data.antennas_position || [0, 0],
      };
      
      setRobotState(newState);
      
      // ✅ Only update localValues if user is not dragging (checked via ref)
      // Increase delay to 2000ms (2s) to prevent stick repositioning after drag
      if (!isDraggingRef.current && timeSinceDragEnd >= 2000) {
        // Only update if values changed significantly (tolerance to avoid micro-adjustments)
        const tolerance = 0.001; // 1mm tolerance for positions, 0.001 rad for rotations
        const headPoseChanged = 
          Math.abs(newState.headPose.x - localValues.headPose.x) > tolerance ||
          Math.abs(newState.headPose.y - localValues.headPose.y) > tolerance ||
          Math.abs(newState.headPose.z - localValues.headPose.z) > tolerance ||
          Math.abs(newState.headPose.pitch - localValues.headPose.pitch) > tolerance ||
          Math.abs(newState.headPose.yaw - localValues.headPose.yaw) > tolerance ||
          Math.abs(newState.headPose.roll - localValues.headPose.roll) > tolerance;
        const bodyYawChanged = Math.abs(newState.bodyYaw - localValues.bodyYaw) > tolerance;
        
        const antennasChanged = 
          !localValues.antennas ||
          Math.abs(newState.antennas[0] - (localValues.antennas[0] || 0)) > tolerance ||
          Math.abs(newState.antennas[1] - (localValues.antennas[1] || 0)) > tolerance;
        
        if (headPoseChanged || bodyYawChanged || antennasChanged) {
          antennasRef.current = newState.antennas;
          setLocalValues({
            headPose: newState.headPose,
            bodyYaw: newState.bodyYaw,
            antennas: newState.antennas,
          });
        }
      }
    }
  }, [isActive, robotStateFull]);

  // Stop continuous updates
  const stopContinuousUpdates = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPoseRef.current = null;
  }, []);

  // Continuous update loop
  const startContinuousUpdates = useCallback(() => {
    if (rafRef.current) return;
    
    const updateLoop = () => {
      if (pendingPoseRef.current && isDraggingRef.current) {
        const { headPose, antennas, bodyYaw } = pendingPoseRef.current;
        // Include antennas in poseKey to detect changes properly
        const poseKey = JSON.stringify({ headPose, antennas, bodyYaw });
        
        if (lastSentPoseRef.current !== poseKey) {
          const validBodyYaw = typeof bodyYaw === 'number' ? bodyYaw : 0;
          
          // ✅ If only body_yaw is changing, send body_yaw with current values for others
          // The API needs the current state to properly calculate body yaw movement
          if (headPose === null && antennas === null) {
            // Send current values so API can preserve them and calculate body yaw correctly
            const requestBody = {
              target_body_yaw: validBodyYaw,
              target_head_pose: robotState.headPose, // Send current head pose
              target_antennas: robotState.antennas || [0, 0], // Send current antennas
            };
            fetchWithTimeout(
              buildApiUrl('/api/move/set_target'),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
              },
              DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
              { label: 'Continuous move (body_yaw)', silent: true }
            ).catch((error) => {
              console.error('❌ set_target (body_yaw only) error:', error);
            });
          } else {
            // Normal case: send everything
            const requestBody = {
              target_head_pose: headPose,
              target_antennas: antennas,
              target_body_yaw: validBodyYaw,
            };
            fetchWithTimeout(
              buildApiUrl('/api/move/set_target'),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
              },
              DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
              { label: 'Continuous move', silent: true }
            ).catch((error) => {
              console.error('❌ set_target error:', error);
            });
          }
          
          lastSentPoseRef.current = poseKey;
        }
        // Keep pendingPoseRef.current during drag - it will be updated by sendCommand calls
        // Only clear it when drag ends (handled by stopContinuousUpdates)
      }
      
      // Continue loop if still dragging
      if (isDraggingRef.current) {
        rafRef.current = requestAnimationFrame(updateLoop);
      } else {
        rafRef.current = null;
        stopContinuousUpdates();
      }
    };
    
    rafRef.current = requestAnimationFrame(updateLoop);
  }, [robotState, stopContinuousUpdates]);

  useEffect(() => {
    if (!isDragging) {
      stopContinuousUpdates();
    }
    return () => stopContinuousUpdates();
  }, [isDragging, stopContinuousUpdates]);

  // Send command using set_target (always continuous mode)
  const sendCommand = useCallback((headPose, antennas, bodyYaw) => {
    if (!isActive) return;
    const validBodyYaw = typeof bodyYaw === 'number' ? bodyYaw : (robotState.bodyYaw || 0);

    // Always use set_target (continuous mode)
    pendingPoseRef.current = { headPose, antennas, bodyYaw: validBodyYaw };
    if (!rafRef.current) {
      startContinuousUpdates();
    }
  }, [isActive, startContinuousUpdates, robotState.bodyYaw]);

  // Handle drag end with logging
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    lastDragEndTimeRef.current = Date.now();
    
    // ✅ Log drag end with final pose (if significant change)
    const finalPose = {
      headPose: localValues.headPose,
      bodyYaw: localValues.bodyYaw,
    };
    
    if (dragStartPoseRef.current && hasSignificantChange(dragStartPoseRef.current, finalPose)) {
      const now = Date.now();
      if (now - lastLogTimeRef.current > 500) {
        const formatted = formatPoseForLog(finalPose.headPose, finalPose.bodyYaw);
        addFrontendLog(`→ Position: ${formatted}`);
        lastLoggedPoseRef.current = finalPose;
        lastLogTimeRef.current = now;
      }
    }
    
    dragStartPoseRef.current = null;
    // No need to send goto anymore - just stop continuous updates
  }, [localValues, addFrontendLog]);

  // Handle head pose changes (always continuous with set_target)
  const handleChange = useCallback((updates, continuous = false) => {
    const newHeadPose = { ...localValues.headPose, ...updates };
    
    setLocalValues(prev => ({
      ...prev,
      headPose: newHeadPose
    }));

    if (continuous) {
      // ✅ Log drag start (only once)
      if (!isDraggingRef.current && !dragStartPoseRef.current) {
        dragStartPoseRef.current = {
          headPose: { ...localValues.headPose },
          bodyYaw: localValues.bodyYaw,
        };
        addFrontendLog(`▶️ Moving head...`);
      }
      
      setIsDragging(true);
      isDraggingRef.current = true;
      const antennas = robotState.antennas || [0, 0];
      sendCommand(newHeadPose, antennas, localValues.bodyYaw);
    } else {
      // For non-continuous (onChangeCommitted), still use set_target but log it
      const newPose = {
        headPose: newHeadPose,
        bodyYaw: localValues.bodyYaw,
      };
      
      const now = Date.now();
      if (hasSignificantChange(lastLoggedPoseRef.current, newPose) && now - lastLogTimeRef.current > 500) {
        const formatted = formatPoseForLog(newPose.headPose, newPose.bodyYaw);
        addFrontendLog(`→ Position: ${formatted}`);
        lastLoggedPoseRef.current = newPose;
        lastLogTimeRef.current = now;
      }
      
      // Send via set_target as a one-time target
      const antennas = robotState.antennas || [0, 0];
      const validBodyYaw = typeof localValues.bodyYaw === 'number' ? localValues.bodyYaw : 0;
      
      const requestBody = {
        target_head_pose: newHeadPose,
        target_antennas: antennas,
        target_body_yaw: validBodyYaw,
      };
      
      fetchWithTimeout(
        buildApiUrl('/api/move/set_target'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
        { label: 'Set target', silent: true }
      ).catch((error) => {
        console.error('❌ set_target error:', error);
      });
    }
  }, [localValues, robotState.antennas, sendCommand, addFrontendLog]);

  // Handle body yaw changes (always using set_target)
  const handleBodyYawChange = useCallback((value, continuous = false) => {
    const validValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    
    setLocalValues(prev => ({ ...prev, bodyYaw: validValue }));
    
    if (continuous) {
      // ✅ Log body yaw drag start (only once)
      if (!isDraggingRef.current) {
        addFrontendLog(`▶️ Rotating body...`);
      }
      
      setIsDragging(true);
      isDraggingRef.current = true;
      pendingPoseRef.current = {
        headPose: null,
        antennas: null,
        bodyYaw: validValue,
      };
      if (!rafRef.current) {
        startContinuousUpdates();
      }
    } else {
      // For non-continuous (onChangeCommitted), send set_target as one-time target
      const now = Date.now();
      const bodyYawDeg = (validValue * 180 / Math.PI).toFixed(1);
      if (now - lastLogTimeRef.current > 500) {
        addFrontendLog(`→ Body Yaw: ${bodyYawDeg}°`);
        lastLogTimeRef.current = now;
        lastLoggedPoseRef.current = {
          headPose: localValues.headPose,
          bodyYaw: validValue,
        };
      }
      
      setIsDragging(false);
      isDraggingRef.current = false;
      lastDragEndTimeRef.current = Date.now();
      
      // Send via set_target as a one-time target
      // Send current values so API can preserve them and calculate body yaw correctly
      if (!isActive) return;
      
      const requestBody = {
        target_body_yaw: validValue,
        target_head_pose: robotState.headPose, // Send current head pose
        target_antennas: robotState.antennas || [0, 0], // Send current antennas
      };

      fetchWithTimeout(
        buildApiUrl('/api/move/set_target'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
        { label: 'Set target (body_yaw)', silent: true }
      ).catch((error) => {
        console.error('❌ set_target (body_yaw) error:', error);
      });
    }
  }, [robotState.bodyYaw, robotState.headPose, robotState.antennas, startContinuousUpdates, localValues.headPose, addFrontendLog, isActive]);

  // Handle antennas changes (always using set_target)
  // Changed signature: now accepts 'left' or 'right' as first param, and the new value as second
  const handleAntennasChange = useCallback((antenna, value, continuous = false) => {
    // Always use ref to get the most current values (especially during continuous drag)
    const currentAntennas = antennasRef.current.length === 2 ? antennasRef.current : (localValues.antennas || [0, 0]);
    
    const newAntennas = antenna === 'left' 
      ? [value, currentAntennas[1]] 
      : [currentAntennas[0], value];
    
    // Update ref immediately (before state update) to ensure next call has latest values
    antennasRef.current = newAntennas;
    
    setLocalValues(prev => ({ ...prev, antennas: newAntennas }));
    
    if (continuous) {
      // Log antennas drag start (only once)
      if (!isDraggingRef.current) {
        addFrontendLog(`▶️ Moving antennas...`);
      }
      
      setIsDragging(true);
      isDraggingRef.current = true;
      // Use sendCommand for consistency with other controls - use new values immediately from ref
      sendCommand(robotState.headPose, newAntennas, robotState.bodyYaw || 0);
    } else {
      // For non-continuous (onChangeCommitted), send set_target as one-time target
      const now = Date.now();
      const leftDeg = (newAntennas[0] * 180 / Math.PI).toFixed(1);
      const rightDeg = (newAntennas[1] * 180 / Math.PI).toFixed(1);
      if (now - lastLogTimeRef.current > 500) {
        addFrontendLog(`→ Antennas: L:${leftDeg}° R:${rightDeg}°`);
        lastLogTimeRef.current = now;
      }
      
      setIsDragging(false);
      isDraggingRef.current = false;
      lastDragEndTimeRef.current = Date.now();
      
      // Send via set_target as a one-time target
      if (!isActive) return;
      
      const requestBody = {
        target_head_pose: robotState.headPose,
        target_antennas: newAntennas,
        target_body_yaw: robotState.bodyYaw || 0,
      };

      fetchWithTimeout(
        buildApiUrl('/api/move/set_target'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        DAEMON_CONFIG.MOVEMENT.CONTINUOUS_MOVE_TIMEOUT,
        { label: 'Set target (antennas)', silent: true }
      ).catch((error) => {
        console.error('❌ set_target (antennas) error:', error);
      });
    }
  }, [robotState.headPose, robotState.bodyYaw, localValues.antennas, sendCommand, addFrontendLog, isActive]);

  return {
    localValues,
    handleChange,
    handleBodyYawChange,
    handleAntennasChange,
    handleDragEnd,
    addFrontendLog,
  };
}

