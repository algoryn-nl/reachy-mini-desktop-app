/**
 * @fileoverview Command Sender with Fire-and-Forget pattern
 * 
 * Simple and efficient: sends commands without waiting for response.
 * Uses time-based throttling to prevent overwhelming the robot.
 * 
 * - USB: 60fps max (16ms throttle)
 * - WiFi: 20fps max (50ms throttle)
 */

import { useRef, useCallback } from 'react';
import { isWiFiMode } from '../../../../config/daemon';

// Configuration
const CONFIG = {
  // Throttle intervals (minimum time between sends)
  // Lower = more frequent = smoother robot movement
  THROTTLE_USB: 16,    // 60fps for USB
  THROTTLE_WIFI: 16,   // 60fps for WiFi too (was 33ms/30fps)
  
  // Max concurrent requests (higher = better latency tolerance)
  MAX_IN_FLIGHT: 6,    // was 4
  
  // Logging
  DEBUG: false,
};

/**
 * Standalone factory for creating a fire-and-forget command sender
 */
export function createAdaptiveCommandSender(sendRequest) {
  let inFlightCount = 0;
  let pendingCommand = null;
  let lastSendTime = 0;
  const throttle = isWiFiMode() ? CONFIG.THROTTLE_WIFI : CONFIG.THROTTLE_USB;
  
  const processPending = () => {
    if (!pendingCommand) return;
    if (inFlightCount >= CONFIG.MAX_IN_FLIGHT) return;
    
    const now = Date.now();
    if (now - lastSendTime < throttle) {
      // Schedule for later
      setTimeout(processPending, throttle - (now - lastSendTime));
      return;
    }
    
    const command = pendingCommand;
    pendingCommand = null;
    sendInternal(command);
  };
  
  const sendInternal = (command) => {
    if (inFlightCount >= CONFIG.MAX_IN_FLIGHT) {
      pendingCommand = command;
      return;
    }
    
    inFlightCount++;
    lastSendTime = Date.now();
    
    if (CONFIG.DEBUG) {
      console.log(`[CommandSender] Sending (${inFlightCount} in-flight)`);
    }
    
    // Fire and forget - don't await
    sendRequest(command)
      .catch(() => {}) // Ignore errors silently
      .finally(() => {
        inFlightCount--;
        processPending();
      });
  };
  
  return {
    send: (command) => {
      const now = Date.now();
      
      // Throttle check
      if (now - lastSendTime < throttle) {
        pendingCommand = command; // Latest value wins
        return;
      }
      
      // In-flight check
      if (inFlightCount >= CONFIG.MAX_IN_FLIGHT) {
        pendingCommand = command;
        return;
      }
      
      sendInternal(command);
    },
    
    forceSend: (command) => {
      // Bypass throttle but respect max in-flight
      if (inFlightCount >= CONFIG.MAX_IN_FLIGHT) {
        pendingCommand = command;
        return;
      }
      sendInternal(command);
    },
    
    reset: () => {
      pendingCommand = null;
      inFlightCount = 0;
      lastSendTime = 0;
    },
    
    getStats: () => ({
      throttle,
      inFlightCount,
      hasPending: pendingCommand !== null,
      mode: isWiFiMode() ? 'WiFi' : 'USB',
    }),
  };
}

/**
 * React hook version
 */
export function useAdaptiveCommandSender(sendRequest) {
  const senderRef = useRef(null);
  
  if (!senderRef.current) {
    senderRef.current = createAdaptiveCommandSender(sendRequest);
  }
  
  const send = useCallback((command) => {
    senderRef.current.send(command);
  }, []);
  
  const forceSend = useCallback((command) => {
    senderRef.current.forceSend(command);
  }, []);
  
  const reset = useCallback(() => {
    senderRef.current.reset();
  }, []);
  
  const getStats = useCallback(() => {
    return senderRef.current.getStats();
  }, []);
  
  return { send, forceSend, reset, getStats };
}

export default useAdaptiveCommandSender;
