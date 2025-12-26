import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import useAppStore from '../../../store/useAppStore';
import useWebRTCStream, { StreamState } from '../../../hooks/media/useWebRTCStream';
import { fetchWithTimeout, buildApiUrl } from '../../../config/daemon';

/**
 * CameraFeed Component - Displays camera stream when available
 * Shows WebRTC stream only on wireless WiFi Reachy when awake, placeholder otherwise
 */
export default function CameraFeed({ isLarge = false }) {
  const videoRef = useRef(null);
  const { connectionMode, remoteHost, robotStatus } = useAppStore();
  const isWifiMode = connectionMode === 'wifi';
  const isRobotAwake = robotStatus === 'ready' || robotStatus === 'busy';
  
  // Check if this is a wireless version (only wireless has WebRTC streaming)
  const [isWirelessVersion, setIsWirelessVersion] = useState(null); // null = checking
  const [checkFailed, setCheckFailed] = useState(false);
  
  useEffect(() => {
    if (!isWifiMode) return;
    
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
        console.warn('[CameraFeed] Failed to check wireless version:', e);
        setCheckFailed(true);
      }
    };
    
    checkWirelessVersion();
  }, [isWifiMode]);
  
  // Only attempt WebRTC if:
  // 1. WiFi mode
  // 2. Wireless version confirmed
  // 3. Robot is awake (daemon in running state = WebRTC pipeline active)
  const shouldConnectWebRTC = isWifiMode && isWirelessVersion === true && isRobotAwake;
  
  const {
    state,
    stream,
    connect,
    isConnected,
    isConnecting,
  } = useWebRTCStream(shouldConnectWebRTC ? remoteHost : null, shouldConnectWebRTC);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => {
        console.warn('[CameraFeed] Autoplay failed:', e);
      });
    }
  }, [stream]);

  // Common placeholder box style
  const placeholderStyle = {
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: isLarge ? '16px' : '12px',
        overflow: 'hidden',
        border: isLarge ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
        bgcolor: '#000000',
  };

  // Non-WiFi mode - Coming soon placeholder
  if (!isWifiMode) {
    return (
      <Box sx={placeholderStyle}>
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
        <VideocamOutlinedIcon
          sx={{
            fontSize: isLarge ? 64 : 32,
            color: 'rgba(255, 255, 255, 0.3)',
          }}
        />
        <Typography
          sx={{
            fontSize: isLarge ? 12 : 9,
            color: 'rgba(255, 255, 255, 0.4)',
            fontFamily: 'SF Mono, Monaco, Menlo, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Camera coming soon
        </Typography>
      </Box>
      </Box>
    );
  }

  // WiFi but non-wireless version - Stream not available
  if (isWirelessVersion === false) {
    return (
      <Box sx={placeholderStyle}>
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
          <VideocamOffIcon
            sx={{
              fontSize: isLarge ? 64 : 32,
              color: 'rgba(255, 255, 255, 0.3)',
            }}
          />
          <Typography
            sx={{
              fontSize: isLarge ? 12 : 9,
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'SF Mono, Monaco, Menlo, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Stream not available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Still checking if wireless version
  if (isWirelessVersion === null && !checkFailed) {
    return (
      <Box sx={placeholderStyle}>
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
            gap: 1.5,
          }}
        >
          <CircularProgress size={isLarge ? 32 : 20} sx={{ color: '#FF9500' }} />
          <Typography
            sx={{
              fontSize: isLarge ? 12 : 9,
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: 'SF Mono, Monaco, Menlo, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Checking stream...
          </Typography>
        </Box>
      </Box>
    );
  }

  // WiFi wireless version but robot not awake - show "wake up" hint
  if (!isRobotAwake) {
    return (
      <Box sx={placeholderStyle}>
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
          <VideocamOutlinedIcon
            sx={{
              fontSize: isLarge ? 48 : 28,
              color: 'rgba(255, 255, 255, 0.3)',
            }}
          />
          <Typography
            sx={{
              fontSize: isLarge ? 12 : 9,
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'SF Mono, Monaco, Menlo, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              textAlign: 'center',
              px: 2,
            }}
          >
            Wake up robot to stream
          </Typography>
        </Box>
      </Box>
    );
  }

  // WiFi wireless mode, robot awake - show WebRTC stream
  return (
    <Box sx={placeholderStyle}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: isConnected ? 'block' : 'none',
        }}
      />

      {/* Connecting state */}
      {isConnecting && (
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
            gap: 1.5,
          }}
        >
          <CircularProgress size={isLarge ? 32 : 20} sx={{ color: '#FF9500' }} />
          <Typography
            sx={{
              fontSize: isLarge ? 12 : 9,
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: 'SF Mono, Monaco, Menlo, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Connecting...
          </Typography>
        </Box>
      )}

      {/* Disconnected / Error state */}
      {(state === StreamState.DISCONNECTED || state === StreamState.ERROR) && !isConnecting && (
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
            cursor: 'pointer',
            transition: 'background 0.2s',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
          onClick={connect}
        >
          <VideocamOffIcon
            sx={{
              fontSize: isLarge ? 48 : 28,
              color: state === StreamState.ERROR ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.3)',
            }}
          />
          <Typography
            sx={{
              fontSize: isLarge ? 12 : 9,
              color: state === StreamState.ERROR ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'SF Mono, Monaco, Menlo, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {state === StreamState.ERROR ? 'Connection failed' : 'Click to connect'}
          </Typography>
        </Box>
      )}

      {/* Live indicator when connected */}
      {isConnected && (
        <Box
          sx={{
            position: 'absolute',
            top: isLarge ? 12 : 8,
            left: isLarge ? 12 : 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1,
            py: 0.5,
            borderRadius: '6px',
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#22c55e',
              animation: 'pulse-live 2s infinite',
              '@keyframes pulse-live': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '0.5px',
            }}
          >
            LIVE
          </Typography>
        </Box>
      )}
    </Box>
  );
}
