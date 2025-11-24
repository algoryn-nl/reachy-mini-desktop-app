import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { getCurrentWindow } from '@tauri-apps/api/window';
import unpluggedCableSvg from '../assets/unplugged-cable.svg';
import useAppStore from '../store/useAppStore';

/**
 * View displayed when robot is not detected via USB
 */
export default function RobotNotDetectedView() {
  const appWindow = window.mockGetCurrentWindow ? window.mockGetCurrentWindow() : getCurrentWindow();
  const { darkMode } = useAppStore();
  const [dots, setDots] = useState('');

  // Animated ellipsis dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500); // Change every 500ms (slow enough)
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        background: darkMode ? 'rgba(26, 26, 26, 0.95)' : 'rgba(253, 252, 250, 0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Continuous zig-zag scan effect (up-down-up-down) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: 'linear-gradient(180deg, transparent 0%, transparent 35%, rgba(255, 149, 0, 0.08) 43%, rgba(255, 149, 0, 0.16) 50%, rgba(255, 149, 0, 0.08) 57%, transparent 65%, transparent 100%)',
          backgroundSize: '100% 150%',
          animation: 'scanZigZag 2s linear infinite alternate',
          '@keyframes scanZigZag': {
            '0%': {
              backgroundPosition: '0% 100%',
            },
            '100%': {
              backgroundPosition: '0% 0%',
            },
          },
        }}
      />
      {/* Robot Not Detected Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 44px)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Full-width illustration */}
        <Box 
          sx={{ 
            width: '100%',
            maxWidth: '100%',
            mb: 4,
            px: 0,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <img 
            src={unpluggedCableSvg} 
            alt="USB Unplugged" 
            style={{ 
              width: '100%',
              maxWidth: '450px',
              height: 'auto',
              opacity: .9,
            }} 
          />
        </Box>
        
        <Box sx={{ px: 4 }}>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 600,
              color: darkMode ? '#f5f5f5' : '#333',
              mb: 1,
              textAlign: 'center',
            }}
          >
            Robot Not Detected
          </Typography>
          
          <Typography
            sx={{
              fontSize: 14,
              color: darkMode ? '#aaa' : '#666',
              textAlign: 'center',
              maxWidth: 360,
              lineHeight: 1.6,
            }}
          >
            Connect your Reachy Mini via <strong>USB</strong> to get started
          </Typography>

          {/* Invisible box with same height as "Start" button (minHeight: 42 + py: 1.25) */}
          <Box
            sx={{
              mt: 4,
              minHeight: 42,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: darkMode ? '#888' : '#666',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              Scanning for USB connection{dots}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

