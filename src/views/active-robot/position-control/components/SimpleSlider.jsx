import React from 'react';
import { Box, Typography, IconButton, Tooltip, Slider } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Simple Slider Control - Enhanced with more information
 */
export default function SimpleSlider({ label, value, onChange, onReset, min = -1, max = 1, unit = 'rad', darkMode, disabled = false }) {
  const displayValue = typeof value === 'number' ? value.toFixed(unit === 'deg' ? 1 : 3) : (unit === 'deg' ? '0.0' : '0.000');
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
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
      <Slider 
        value={value} 
        onChange={(e, newValue) => onChange(newValue, true)}
        onChangeCommitted={(e, newValue) => onChange(newValue, false)}
        min={min} 
        max={max} 
        step={0.01}
        disabled={disabled} 
        sx={{ 
          color: '#FF9500', 
          height: 3,
          '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
            boxShadow: '0 2px 6px rgba(255, 149, 0, 0.4)',
          },
          '& .MuiSlider-track': {
            height: 3,
          },
          '& .MuiSlider-rail': {
            height: 3,
            opacity: darkMode ? 0.2 : 0.3,
          }
        }} 
      />
    </Box>
  );
}

