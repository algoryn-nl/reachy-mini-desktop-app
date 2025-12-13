import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';

/**
 * CameraFeed Component - Displays live video stream from the robot's camera
 * Connects to the daemon's WebSocket video stream endpoint
 */
export default function CameraFeed({ width = 240, height = 180, isLarge = false }) {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasReceivedFrame, setHasReceivedFrame] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // WebSocket URL for video stream
  const WS_URL = 'ws://localhost:8000/video_stream';

  const connectWebSocket = useCallback(() => {
    if (!mountedRef.current) return;
    
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log('[CameraFeed] 🎥 Connecting to video stream:', WS_URL);
      const ws = new WebSocket(WS_URL);
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('[CameraFeed] ✅ Connected to video stream');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          // The daemon sends JPEG frames as binary data
          const arrayBuffer = event.data;
          const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
          const imageUrl = URL.createObjectURL(blob);
          
          const img = new Image();
          img.onload = () => {
            if (!mountedRef.current) return;
            
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              
              // Set canvas size to match image (first frame only)
              if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
              }
              
              // Draw the frame
              ctx.drawImage(img, 0, 0);
              
              if (!hasReceivedFrame) {
                setHasReceivedFrame(true);
                console.log('[CameraFeed] 🖼️ First frame received:', img.width, 'x', img.height);
              }
            }
            
            // Clean up blob URL
            URL.revokeObjectURL(imageUrl);
          };
          
          img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
          };
          
          img.src = imageUrl;
        } catch (err) {
          console.error('[CameraFeed] ❌ Error processing frame:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[CameraFeed] ❌ WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log('[CameraFeed] 🔌 Disconnected from video stream, code:', event.code);
        setIsConnected(false);
        
        // Reconnect after delay (only if component is still mounted)
        if (mountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              console.log('[CameraFeed] 🔄 Attempting to reconnect...');
              connectWebSocket();
            }
          }, 2000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[CameraFeed] ❌ Failed to create WebSocket:', err);
      setError('Failed to connect');
      
      // Retry after delay
      if (mountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connectWebSocket();
          }
        }, 3000);
      }
    }
  }, [hasReceivedFrame]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Start WebSocket connection
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      
      // Clean up
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Show placeholder when not connected or no frames received
  const showPlaceholder = !isConnected || !hasReceivedFrame;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: isLarge ? '16px' : '12px',
        overflow: 'hidden',
        border: isLarge ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
        bgcolor: '#000000',
      }}
    >
      {/* Canvas for video frames */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showPlaceholder ? 'none' : 'block',
        }}
      />
      
      {/* Placeholder when no video */}
      {showPlaceholder && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          {isConnected ? (
            <VideocamOutlinedIcon
              sx={{
                fontSize: isLarge ? 64 : 32,
                color: 'rgba(255, 255, 255, 0.5)',
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.5 },
                  '50%': { opacity: 1 },
                },
              }}
            />
          ) : (
            <VideocamOffOutlinedIcon
              sx={{
                fontSize: isLarge ? 64 : 32,
                color: 'rgba(255, 255, 255, 0.3)',
              }}
            />
          )}
          <Typography
            sx={{
              fontSize: isLarge ? 10 : 8,
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'SF Mono, Monaco, Menlo, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {error ? error : isConnected ? 'Waiting for video...' : 'Connecting...'}
          </Typography>
        </Box>
      )}
      
      {/* Connection status indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: isConnected ? '#22c55e' : '#ef4444',
          boxShadow: isConnected 
            ? '0 0 8px rgba(34, 197, 94, 0.6)' 
            : '0 0 8px rgba(239, 68, 68, 0.6)',
        }}
      />
    </Box>
  );
}
