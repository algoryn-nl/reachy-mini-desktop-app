/**
 * WebRTCStreamContext
 * Provides a shared WebRTC stream connection across multiple components.
 * This avoids multiple CameraFeed instances creating duplicate connections.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import { fetchWithTimeout, buildApiUrl } from '../config/daemon';

// Import the GStreamer WebRTC API
import '../lib/gstwebrtc-api';

const SIGNALING_PORT = 8443;
const RECONNECT_DELAY = 5000;

/**
 * Connection states for the WebRTC stream
 */
export const StreamState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

// Context
const WebRTCStreamContext = createContext(null);

/**
 * Provider component that manages the shared WebRTC connection
 */
export function WebRTCStreamProvider({ children }) {
  const { connectionMode, remoteHost, robotStatus } = useAppStore();
  const isWifiMode = connectionMode === 'wifi';
  const isRobotAwake = robotStatus === 'ready' || robotStatus === 'busy';

  // Stream state
  const [state, setState] = useState(StreamState.DISCONNECTED);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  // Check if wireless version
  const [isWirelessVersion, setIsWirelessVersion] = useState(null);
  const [checkFailed, setCheckFailed] = useState(false);

  // Refs for cleanup
  const apiRef = useRef(null);
  const sessionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const producersListenerRef = useRef(null);
  const connectionListenerRef = useRef(null);

  // Check wireless version on mount
  useEffect(() => {
    if (!isWifiMode) {
      setIsWirelessVersion(false);
      return;
    }

    const checkWirelessVersion = async () => {
      try {
        const response = await fetchWithTimeout(
          buildApiUrl('/api/daemon/status'),
          {},
          5000,
          { silent: true }
        );
        if (response.ok) {
          const data = await response.json();
          setIsWirelessVersion(data.wireless_version === true);
        } else {
          setCheckFailed(true);
        }
      } catch (e) {
        console.warn('[WebRTCContext] Failed to check wireless version:', e);
        setCheckFailed(true);
      }
    };

    checkWirelessVersion();
  }, [isWifiMode]);

  // Should we connect?
  const shouldConnect = isWifiMode && isWirelessVersion === true && isRobotAwake;

  /**
   * Clean up session and API
   */
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn('[WebRTCContext] Error closing session:', e);
      }
      sessionRef.current = null;
    }

    if (apiRef.current) {
      try {
        if (producersListenerRef.current) {
          apiRef.current.unregisterProducersListener(producersListenerRef.current);
          producersListenerRef.current = null;
        }
        if (connectionListenerRef.current) {
          apiRef.current.unregisterConnectionListener(connectionListenerRef.current);
          connectionListenerRef.current = null;
        }
      } catch (e) {
        console.warn('[WebRTCContext] Error cleaning up API:', e);
      }
      apiRef.current = null;
    }

    setStream(null);
  }, []);

  /**
   * Connect to the WebRTC stream
   */
  const connect = useCallback(() => {
    if (!remoteHost || !mountedRef.current) {
      setError('No robot host specified');
      setState(StreamState.ERROR);
      return;
    }

    // Clean up any existing connection first
    cleanup();

    setState(StreamState.CONNECTING);
    setError(null);

    const signalingUrl = `ws://${remoteHost}:${SIGNALING_PORT}`;
    console.log(`[WebRTCContext] Connecting to signaling server: ${signalingUrl}`);

    try {
      const GstWebRTCAPI = window.GstWebRTCAPI;
      if (!GstWebRTCAPI) {
        throw new Error('GstWebRTCAPI not loaded');
      }

      const api = new GstWebRTCAPI({
        signalingServerUrl: signalingUrl,
        reconnectionTimeout: 0,
        meta: { name: 'reachy-desktop-app' },
        webrtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      apiRef.current = api;

      // Connection listener
      connectionListenerRef.current = {
        connected: (clientId) => {
          if (!mountedRef.current) return;
          console.log('[WebRTCContext] Connected to signaling server, client ID:', clientId);
        },
        disconnected: () => {
          if (!mountedRef.current) return;
          console.log('[WebRTCContext] Disconnected from signaling server');
          setState(StreamState.DISCONNECTED);
          setStream(null);

          // Schedule reconnect if still should connect
          if (mountedRef.current && !reconnectTimeoutRef.current) {
            console.log(`[WebRTCContext] Scheduling reconnect in ${RECONNECT_DELAY}ms`);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (mountedRef.current) {
                connect();
              }
            }, RECONNECT_DELAY);
          }
        },
      };

      api.registerConnectionListener(connectionListenerRef.current);

      // Producers listener
      producersListenerRef.current = {
        producerAdded: (producer) => {
          if (!mountedRef.current) return;
          console.log('[WebRTCContext] Producer found:', producer.id, producer.meta);

          if (sessionRef.current) {
            console.log('[WebRTCContext] Already have a session, ignoring producer');
            return;
          }

          console.log('[WebRTCContext] Creating consumer session for producer:', producer.id);

          const session = api.createConsumerSession(producer.id);
          if (!session) {
            console.error('[WebRTCContext] Failed to create consumer session');
            return;
          }

          sessionRef.current = session;

          session.addEventListener('error', (e) => {
            if (!mountedRef.current) return;
            // Log the full error details to understand ICE failures
            console.error('[WebRTCContext] Session error:', e.message);
            console.error('[WebRTCContext] Error details:', e.error);
            console.error('[WebRTCContext] Full event:', e);
            // Also log RTCPeerConnection state if available
            if (session.rtcPeerConnection) {
              const pc = session.rtcPeerConnection;
              console.error('[WebRTCContext] ICE state:', pc.iceConnectionState);
              console.error('[WebRTCContext] ICE gathering:', pc.iceGatheringState);
              console.error('[WebRTCContext] Signaling state:', pc.signalingState);
              console.error('[WebRTCContext] Connection state:', pc.connectionState);
            }
            setError(e.message || 'Stream error');
            setState(StreamState.ERROR);
          });

          session.addEventListener('closed', () => {
            if (!mountedRef.current) return;
            console.log('[WebRTCContext] Session closed');
            sessionRef.current = null;
            setStream(null);
            setState((prev) => prev === StreamState.CONNECTED ? StreamState.DISCONNECTED : prev);
          });

          session.addEventListener('streamsChanged', () => {
            if (!mountedRef.current) return;
            const streams = session.streams;
            console.log('[WebRTCContext] Streams changed:', streams?.length || 0);

            if (streams && streams.length > 0) {
              setStream(streams[0]);
              setState(StreamState.CONNECTED);
            }
          });

          session.connect();
        },

        producerRemoved: (producer) => {
          if (!mountedRef.current) return;
          console.log('[WebRTCContext] Producer removed:', producer.id);

          if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
            setStream(null);
            setState(StreamState.DISCONNECTED);
          }
        },
      };

      api.registerProducersListener(producersListenerRef.current);

    } catch (e) {
      console.error('[WebRTCContext] Connection error:', e);
      setError(e.message);
      setState(StreamState.ERROR);
    }
  }, [remoteHost, cleanup]);

  /**
   * Disconnect from the stream
   */
  const disconnect = useCallback(() => {
    console.log('[WebRTCContext] Disconnecting...');
    cleanup();
    setState(StreamState.DISCONNECTED);
  }, [cleanup]);

  // Auto-connect when conditions are met
  useEffect(() => {
    mountedRef.current = true;

    if (shouldConnect) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [shouldConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    // State
    state,
    stream,
    error,
    isConnected: state === StreamState.CONNECTED,
    isConnecting: state === StreamState.CONNECTING,
    
    // Derived state (for CameraFeed placeholders)
    isWifiMode,
    isWirelessVersion,
    checkFailed,
    isRobotAwake,
    shouldConnect,
    
    // Actions
    connect,
    disconnect,
  };

  return (
    <WebRTCStreamContext.Provider value={value}>
      {children}
    </WebRTCStreamContext.Provider>
  );
}

/**
 * Hook to consume the WebRTC stream context
 */
export function useWebRTCStreamContext() {
  const context = useContext(WebRTCStreamContext);
  if (!context) {
    throw new Error('useWebRTCStreamContext must be used within a WebRTCStreamProvider');
  }
  return context;
}

export default WebRTCStreamContext;

