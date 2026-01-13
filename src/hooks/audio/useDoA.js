import { useMemo, useState, useEffect, useRef } from 'react';
import useAppStore from '../../store/useAppStore';

/**
 * 🚀 REFACTORED: Now reads DoA from centralized store (WebSocket)
 *
 * Previously polled /api/state/doa at 10Hz (HTTP).
 * Now reads from robotStateFull which is streamed via WebSocket at 20Hz.
 *
 * Benefits:
 * - No additional HTTP requests (was 10 req/sec!)
 * - Real-time updates at 20Hz
 * - Single source of truth
 * - Debounced isTalking to prevent flickering
 *
 * The DoA indicates the direction of detected sound:
 * - 0 rad = left
 * - π/2 rad (~1.57) = front/back
 * - π rad (~3.14) = right
 *
 * @param {boolean} isActive - Whether DoA should be active (for API compatibility)
 * @returns {{ angle: number | null, isTalking: boolean, isAvailable: boolean }}
 */
export function useDoA(isActive) {
  // Read DoA from centralized store (selective subscription)
  const doa = useAppStore(state => state.robotStateFull?.data?.doa);

  // Debounced isTalking state (instant ON, delayed OFF to prevent flickering)
  const [debouncedTalking, setDebouncedTalking] = useState(false);
  const timeoutRef = useRef(null);

  const rawTalking = isActive && doa?.speech_detected;

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (rawTalking) {
      // Instant ON - respond immediately to speech
      setDebouncedTalking(true);
    } else {
      // Delayed OFF - wait 200ms before hiding to prevent flickering
      timeoutRef.current = setTimeout(() => {
        setDebouncedTalking(false);
      }, 200);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [rawTalking]);

  // Build DoA state from store data
  const doaState = useMemo(() => {
    if (!isActive || !doa) {
      return {
        angle: null,
        isTalking: false,
        isAvailable: false,
      };
    }

    return {
      angle: doa.angle,
      isTalking: debouncedTalking,
      isAvailable: true,
    };
  }, [isActive, doa, debouncedTalking]);

  return doaState;
}

/**
 * Convert DoA angle (radians) to a human-readable direction
 * @param {number} angleRad - Angle in radians
 * @returns {string} Direction label
 */
export function getDoADirection(angleRad) {
  if (angleRad === null) return 'unknown';

  // Normalize to 0-π range
  const normalized = Math.abs(angleRad % Math.PI);

  if (normalized < Math.PI / 6) return 'left';
  if (normalized < Math.PI / 3) return 'front-left';
  if (normalized < (2 * Math.PI) / 3) return 'front';
  if (normalized < (5 * Math.PI) / 6) return 'front-right';
  return 'right';
}

/**
 * Convert DoA angle (radians) to CSS rotation degrees
 * Maps: 0 rad (left) → -90deg, π/2 rad (front) → 0deg, π rad (right) → 90deg
 * @param {number} angleRad - Angle in radians
 * @returns {number} Rotation in degrees for CSS transform
 */
export function doaToCssRotation(angleRad) {
  if (angleRad === null) return 0;

  // Convert radians to degrees: 0 rad = -90deg, π/2 rad = 0deg, π rad = 90deg
  // Formula: (angleRad / π) * 180 - 90
  return (angleRad / Math.PI) * 180 - 90;
}
