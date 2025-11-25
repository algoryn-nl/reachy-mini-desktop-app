import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { getAppWindow } from '../utils/windowUtils';
import unpluggedCableLeftSvg from '../assets/unplugged-cable-left.svg';
import unpluggedCableRightSvg from '../assets/unplugged-cable-right.svg';
import useAppStore from '../store/useAppStore';

/**
 * View displayed when robot is not detected via USB
 */
export default function RobotNotDetectedView() {
  const appWindow = getAppWindow();
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
      {/* Robot Not Detected Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh', // TopBar is fixed, doesn't take space
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Full-width illustration with overlapping cables */}
        <Box 
          sx={{ 
            width: '100%',
            maxWidth: '100%',
            mb: 4,
            px: 0,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'visible',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: '450px',
              height: 'auto',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {/* Câble gauche avec animation */}
            <img 
              src={unpluggedCableLeftSvg} 
              alt="USB Cable Left" 
              style={{ 
                width: '105%',
                height: 'auto',
                opacity: .9,
                position: 'absolute',
                top: 0,
                left: '-2.5%',
                animation: 'plugAnimation 2.5s ease-in-out infinite',
              }} 
            />
            
            {/* Câble droit statique */}
            <img 
              src={unpluggedCableRightSvg} 
              alt="USB Cable Right" 
              style={{ 
                width: '105%',
                height: 'auto',
                opacity: .9,
                position: 'relative',
                left: '-2.5%',
              }} 
            />
          </Box>
        </Box>
        
        {/* Animation CSS pour le câble gauche */}
        <style>
          {`
            @keyframes plugAnimation {
              0%, 100% {
                transform: translateX(0px);
              }
              50% {
                transform: translateX(8px);
              }
            }
          `}
        </style>
        
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

