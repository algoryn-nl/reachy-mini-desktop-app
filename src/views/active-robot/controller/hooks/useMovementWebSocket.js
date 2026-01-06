/**
 * @fileoverview WebSocket hook for robot movement commands
 * 
 * Uses the daemon's WebSocket endpoint /api/move/ws/set_target
 * instead of HTTP POST for much lower latency.
 * 
 * Benefits:
 * - No HTTP overhead (headers, connection setup)
 * - Persistent connection
 * - ~10x lower latency than HTTP POST
 */

import { useRef, useCallback, useEffect } from 'react';
import { getWsBaseUrl } from '../../../../config/daemon';

// Configuration
const CONFIG = {
  // Reconnection
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
  
  // Throttling (minimum time between sends)
  THROTTLE_MS: 33, // ~30fps
  
  // Max queued messages (if WebSocket is busy)
  MAX_IN_FLIGHT: 4,
  
  // Logging
  DEBUG: true, // TEMP: Enable for debugging
};

/**
 * Creates a WebSocket connection for movement commands
 * Fire-and-forget pattern with throttling
 */
export function useMovementWebSocket(isActive) {
  const wsRef = useRef(null);
  const isConnectedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const pendingCommandRef = useRef(null);
  const inFlightCountRef = useRef(0);

  /**
   * Connect to the WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const wsUrl = `${getWsBaseUrl()}/api/move/ws/set_target`;
      
      if (CONFIG.DEBUG) {
        console.log('[MovementWS] Connecting to:', wsUrl);
      }

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (CONFIG.DEBUG) {
          console.log('[MovementWS] Connected');
        }
        isConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        
        // Send any pending command
        if (pendingCommandRef.current) {
          sendInternal(pendingCommandRef.current);
          pendingCommandRef.current = null;
        }
      };

      ws.onclose = (event) => {
        if (CONFIG.DEBUG) {
          console.log('[MovementWS] Closed:', event.code);
        }
        isConnectedRef.current = false;
        wsRef.current = null;
        
        // Reconnect if still active
        if (isActive && reconnectAttemptsRef.current < CONFIG.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, CONFIG.RECONNECT_DELAY);
        }
      };

      ws.onerror = (error) => {
        if (CONFIG.DEBUG) {
          console.warn('[MovementWS] Error:', error);
        }
      };

      ws.onmessage = (event) => {
        // Handle responses (errors, etc.)
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
        
        // Always log responses for debugging
        console.log('[MovementWS] Response:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'error') {
            console.error('[MovementWS] ❌ Error from daemon:', data.detail);
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        // Process pending command if any
        processPending();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[MovementWS] Connection error:', error);
    }
  }, [isActive]);

  /**
   * Disconnect from the WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    isConnectedRef.current = false;
    reconnectAttemptsRef.current = 0;
    inFlightCountRef.current = 0;
    pendingCommandRef.current = null;
  }, []);

  /**
   * Process pending command
   */
  const processPending = useCallback(() => {
    if (!pendingCommandRef.current) return;
    if (inFlightCountRef.current >= CONFIG.MAX_IN_FLIGHT) return;
    
    const now = Date.now();
    if (now - lastSendTimeRef.current < CONFIG.THROTTLE_MS) {
      // Schedule for later
      setTimeout(processPending, CONFIG.THROTTLE_MS - (now - lastSendTimeRef.current));
      return;
    }
    
    const command = pendingCommandRef.current;
    pendingCommandRef.current = null;
    sendInternal(command);
  }, []);

  /**
   * Internal send function
   */
  const sendInternal = useCallback((command) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingCommandRef.current = command;
      return;
    }
    
    if (inFlightCountRef.current >= CONFIG.MAX_IN_FLIGHT) {
      pendingCommandRef.current = command;
      return;
    }
    
    try {
      const payload = JSON.stringify(command);
      if (CONFIG.DEBUG) {
        console.log('[MovementWS] Sending:', payload.substring(0, 200) + '...');
      }
      ws.send(payload);
      inFlightCountRef.current++;
      lastSendTimeRef.current = Date.now();
    } catch (error) {
      console.warn('[MovementWS] Send error:', error);
      pendingCommandRef.current = command;
    }
  }, []);

  /**
   * Send a movement command (public API)
   */
  const send = useCallback((command) => {
    const now = Date.now();
    
    // Throttle check
    if (now - lastSendTimeRef.current < CONFIG.THROTTLE_MS) {
      pendingCommandRef.current = command; // Latest value wins
      return;
    }
    
    // Connection check
    if (!isConnectedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      pendingCommandRef.current = command;
      return;
    }
    
    // In-flight check
    if (inFlightCountRef.current >= CONFIG.MAX_IN_FLIGHT) {
      pendingCommandRef.current = command;
      return;
    }
    
    sendInternal(command);
  }, [sendInternal]);

  /**
   * Force send (bypass throttle)
   */
  const forceSend = useCallback((command) => {
    if (!isConnectedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      pendingCommandRef.current = command;
      return;
    }
    
    if (inFlightCountRef.current >= CONFIG.MAX_IN_FLIGHT) {
      pendingCommandRef.current = command;
      return;
    }
    
    sendInternal(command);
  }, [sendInternal]);

  // Connect/disconnect based on isActive
  useEffect(() => {
    if (isActive) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [isActive, connect, disconnect]);

  return {
    send,
    forceSend,
    isConnected: isConnectedRef.current,
    getStats: () => ({
      isConnected: isConnectedRef.current,
      inFlightCount: inFlightCountRef.current,
      hasPending: pendingCommandRef.current !== null,
      reconnectAttempts: reconnectAttemptsRef.current,
    }),
  };
}

export default useMovementWebSocket;

