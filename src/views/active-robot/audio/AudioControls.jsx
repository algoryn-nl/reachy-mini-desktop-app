import React from 'react';
import { Box, Typography, IconButton, Slider, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AudioLevelBars from './AudioLevelBars';

/**
 * Audio Controls Component - Speaker and Microphone controls
 */
function AudioControls({
  volume,
  microphoneVolume,
  speakerDevice,
  microphoneDevice,
  speakerPlatform,
  microphonePlatform,
  onVolumeChange,
  onMicrophoneChange,
  onMicrophoneVolumeChange,
  onSpeakerMute,
  onMicrophoneMute,
  darkMode,
}) {
  return (
    <Box
      sx={{
        width: '100%',
        mb: 1.5,
        display: 'flex',
        gap: 2, // ✅ Doubled gap between columns
        alignItems: 'stretch',
      }}
    >
      {/* Speaker Control - 50% */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
        }}
      >
        {/* Label with tooltip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: darkMode ? '#888' : '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Speaker
          </Typography>
          <Tooltip title="Adjust the robot's audio output volume" arrow placement="top">
            <InfoOutlinedIcon sx={{ fontSize: 12, color: darkMode ? '#666' : '#999', opacity: 0.6, cursor: 'help' }} />
          </Tooltip>
        </Box>
        
        {/* Card with fixed height */}
        <Box
          sx={{
            height: 64, // ✅ Fixed height for consistency (same for both cards)
            borderRadius: '14px',
            bgcolor: darkMode ? '#1a1a1a' : '#ffffff', // Same as Logs card
            border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.15)', // Same as Logs card
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // ✅ Prevent content overflow
            position: 'relative',
            paddingBottom: 0,
          }}
        >
          {/* Port name and control row */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 1,
            flexShrink: 0,
            height: 'auto',
            p: 1.5,
            pb: 0,
          }}>
            {/* Device name and platform */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <Typography sx={{ 
                fontSize: 9,
                fontWeight: 500, 
                color: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                fontFamily: 'SF Mono, Monaco, Menlo, monospace',
                letterSpacing: '0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {speakerDevice || 'Built-in Speaker'}
              </Typography>
              {speakerPlatform && (
                <Typography sx={{ 
                  fontSize: 8,
                  fontWeight: 400, 
                  color: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                  fontFamily: 'SF Mono, Monaco, Menlo, monospace',
                  letterSpacing: '0.02em',
                }}>
                  {speakerPlatform}
                </Typography>
              )}
            </Box>
            
            {/* Mute button and slider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <IconButton
                onClick={onSpeakerMute}
                size="small"
                sx={{
                  width: 20,
                  height: 20,
                  padding: 0,
                  color: volume > 0 ? (darkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)') : (darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'),
                  '&:hover': {
                    color: volume > 0 ? '#FF9500' : (darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'),
                    bgcolor: 'transparent',
                  },
                }}
              >
                {volume > 0 ? (
                  <VolumeUpIcon sx={{ fontSize: 14 }} />
                ) : (
                  <VolumeOffIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
              <Box sx={{ width: 60, height: 24, display: 'flex', alignItems: 'center' }}>
                <Slider
                value={volume}
                onChange={(e, val) => onVolumeChange(val)}
                size="small"
                sx={{
                  mb: 0,
                  color: '#FF9500',
                  height: 3,
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                    backgroundColor: '#FF9500',
                    border: `1.5px solid ${darkMode ? '#1a1a1a' : '#fff'}`,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 0 0 6px rgba(255, 149, 0, 0.12)',
                    },
                    '&.Mui-focusVisible': {
                      boxShadow: '0 0 0 6px rgba(255, 149, 0, 0.16)',
                    },
                    '&.Mui-active': {
                      boxShadow: '0 0 0 6px rgba(255, 149, 0, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#FF9500',
                    border: 'none',
                    height: 1.5,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                    height: 1.5,
                    opacity: 1,
                  },
                }}
              />
            </Box>
            </Box>
          </Box>
          
          {/* Audio visualizer - Integrated at the bottom of the card */}
          <Box sx={{ 
            width: '100%', 
            height: 28, 
            flexShrink: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingBottom: 0,
            paddingTop: 0,
            position: 'relative', // ✅ Explicit positioning for better sizing
            minWidth: 0, // ✅ Critical for flexbox sizing
            minHeight: 0, // ✅ Critical for flexbox sizing
          }}>
            <AudioLevelBars 
              isActive={volume > 0} 
              color={darkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.3)'} 
              barCount={8} 
            />
          </Box>
        </Box>
      </Box>

      {/* Microphone Control - 50% */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
        }}
      >
        {/* Label with tooltip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: darkMode ? '#888' : '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Microphone
          </Typography>
          <Tooltip title="Adjust the robot's microphone input volume" arrow placement="top">
            <InfoOutlinedIcon sx={{ fontSize: 12, color: darkMode ? '#666' : '#999', opacity: 0.6, cursor: 'help' }} />
          </Tooltip>
        </Box>
        
        {/* Card with fixed height (same as Speaker) */}
        <Box
          sx={{
            height: 64, // ✅ Same fixed height as Speaker
            borderRadius: '14px',
            bgcolor: darkMode ? '#1a1a1a' : '#ffffff', // Same as Logs card
            border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.15)', // Same as Logs card
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // ✅ Prevent content overflow
            position: 'relative',
            paddingBottom: 0,
          }}
        >
          {/* Port name and control row */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 1,
            flexShrink: 0,
            height: 'auto',
            p: 1.5,
            pb: 0,
          }}>
            {/* Device name and platform */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <Typography sx={{ 
                fontSize: 9, 
                fontWeight: 500, 
                color: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                fontFamily: 'SF Mono, Monaco, Menlo, monospace',
                letterSpacing: '0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {microphoneDevice || 'USB Microphone'}
              </Typography>
              {microphonePlatform && (
                <Typography sx={{ 
                  fontSize: 8,
                  fontWeight: 400, 
                  color: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                  fontFamily: 'SF Mono, Monaco, Menlo, monospace',
                  letterSpacing: '0.02em',
                }}>
                  {microphonePlatform}
                </Typography>
              )}
            </Box>
            
            {/* Mute button and slider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <IconButton
                onClick={onMicrophoneMute}
                size="small"
                sx={{
                  width: 20,
                  height: 20,
                  padding: 0,
                  color: microphoneVolume > 0 ? (darkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)') : (darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'),
                  '&:hover': {
                    color: microphoneVolume > 0 ? '#FF9500' : (darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'),
                    bgcolor: 'transparent',
                  },
                }}
              >
                {microphoneVolume > 0 ? (
                  <MicIcon sx={{ fontSize: 14 }} />
                ) : (
                  <MicOffIcon sx={{ fontSize: 14 }} />
                )}
              </IconButton>
              <Box sx={{ width: 60, height: 24, display: 'flex', alignItems: 'center' }}>
                <Slider
                value={microphoneVolume}
                onChange={(e, val) => {
                  if (onMicrophoneVolumeChange) {
                    onMicrophoneVolumeChange(val);
                  } else if (onMicrophoneChange) {
                    // Fallback: toggle behavior if onMicrophoneVolumeChange not provided
                    onMicrophoneChange(val > 0);
                  }
                }}
                size="small"
                sx={{
                  mb: 0,
                  color: '#FF9500',
                  height: 3,
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                    backgroundColor: '#FF9500',
                    border: `1.5px solid ${darkMode ? '#1a1a1a' : '#fff'}`,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 0 0 6px rgba(255, 149, 0, 0.12)',
                    },
                    '&.Mui-focusVisible': {
                      boxShadow: '0 0 0 6px rgba(255, 149, 0, 0.16)',
                    },
                    '&.Mui-active': {
                      boxShadow: '0 0 0 6px rgba(255, 149, 0, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#FF9500',
                    border: 'none',
                    height: 1.5,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                    height: 1.5,
                    opacity: 1,
                  },
                }}
              />
            </Box>
            </Box>
          </Box>
          
          {/* Audio visualizer - Integrated at the bottom of the card */}
          <Box sx={{ 
            width: '100%', 
            height: 28, 
            flexShrink: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingBottom: 0,
            paddingTop: 0,
            position: 'relative', // ✅ Explicit positioning for better sizing
            minWidth: 0, // ✅ Critical for flexbox sizing
            minHeight: 0, // ✅ Critical for flexbox sizing
          }}>
            <AudioLevelBars 
              isActive={microphoneVolume > 0} 
              color={darkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.3)'} 
              barCount={8} 
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(AudioControls);

