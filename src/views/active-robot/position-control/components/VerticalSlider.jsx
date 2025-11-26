import React from 'react';
import { Box, Typography, IconButton, Tooltip, Slider } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Vertical Slider Control - For height/position Z
 */
export default function VerticalSlider({ label, value, onChange, onReset, min = -1, max = 1, unit = 'm', darkMode, disabled = false }) {
  const displayValue = typeof value === 'number' ? value.toFixed(unit === 'deg' ? 1 : 3) : (unit === 'deg' ? '0.0' : '0.000');
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.75,
      p: 1,
      borderRadius: '12px',
      bgcolor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
      '&:hover': {
        bgcolor: disabled ? (darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)') : (darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
        borderColor: disabled ? (darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)') : (darkMode ? 'rgba(255, 149, 0, 0.2)' : 'rgba(255, 149, 0, 0.3)'),
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: darkMode ? '#f5f5f5' : '#333', letterSpacing: '-0.2px' }}>
            {label}
          </Typography>
          <Typography sx={{ 
            fontSize: 9, 
            fontFamily: 'monospace', 
            fontWeight: 500, 
            color: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            letterSpacing: '0.02em',
          }}>
            {displayValue}{unit === 'deg' ? '°' : ` ${unit}`}
          </Typography>
        </Box>
        <Tooltip title="Reset to center" arrow>
          <IconButton 
            size="small" 
            onClick={onReset}
            disabled={disabled} 
            sx={{ 
              width: 20, 
              height: 20,
              color: darkMode ? '#888' : '#999',
              '&:hover': {
                color: '#FF9500',
                bgcolor: darkMode ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.05)',
              }
            }}
          >
            <RefreshIcon sx={{ fontSize: 10 }} />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 1.5,
        height: 160,
        width: '100%',
        position: 'relative',
      }}>
        {/* Max label (top) */}
        <Typography sx={{ 
          fontSize: 8, 
          color: darkMode ? '#666' : '#888', 
          fontWeight: 600, 
          position: 'absolute', 
          top: 0, 
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
        }}>
          {max.toFixed(3)}{unit === 'deg' ? '°' : ` ${unit}`}
        </Typography>
        
        {/* Vertical Slider */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          py: 1.5,
          px: 2,
        }}>
          <Slider 
            orientation="vertical"
            value={value} 
            onChange={(e, newValue) => onChange(newValue, true)}
            onChangeCommitted={(e, newValue) => onChange(newValue, false)}
            min={min} 
            max={max} 
            step={0.001}
            disabled={disabled}
            sx={{ 
              color: '#FF9500', 
              width: 4,
              height: 'calc(100% - 8px)',
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
                boxShadow: '0 2px 8px rgba(255, 149, 0, 0.4)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(255, 149, 0, 0.6)',
                  width: 18,
                  height: 18,
                },
                '&:active': {
                  boxShadow: '0 4px 12px rgba(255, 149, 0, 0.8)',
                }
              },
              '& .MuiSlider-track': {
                width: 4,
                border: 'none',
              },
              '& .MuiSlider-rail': {
                width: 4,
                opacity: darkMode ? 0.2 : 0.3,
              }
            }} 
          />
        </Box>
        
        {/* Min label (bottom) */}
        <Typography sx={{ 
          fontSize: 8, 
          color: darkMode ? '#666' : '#888', 
          fontWeight: 600, 
          position: 'absolute', 
          bottom: 0, 
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
        }}>
          {min.toFixed(3)}{unit === 'deg' ? '°' : ` ${unit}`}
        </Typography>
      </Box>
      
    </Box>
  );
}

