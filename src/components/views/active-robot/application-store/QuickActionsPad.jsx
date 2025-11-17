import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';

/**
 * Quick Actions Pad Component
 * A mini touchpad-style grid of emoji buttons for quick actions
 */
export default function QuickActionsPad({
  actions = [],
  onActionClick = null,
  isReady = false,
  isActive = false,
  isBusy = false,
  darkMode = false,
}) {
  if (!actions || actions.length === 0) return null;

  const handleActionClick = (action) => {
    if (!isActive || isBusy || !isReady || !onActionClick) return;
    onActionClick(action);
  };

  // Grid 4x2 pour 8 cases
  const columns = 4;

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        mb: 2,
      }}
    >
      {/* Pad Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 0.5,
          width: '100%',
        }}
      >
        {actions.map((action, index) => {
          const isDisabled = !isActive || isBusy || !isReady;
          
          return (
            <Tooltip key={action.name || index} title={action.label || action.name} placement="top" arrow>
              <IconButton
                onClick={() => handleActionClick(action)}
                disabled={isDisabled}
                sx={{
                  width: '100%',
                  minHeight: 64,
                  maxHeight: 72,
                  borderRadius: '10px',
                  bgcolor: darkMode 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(0, 0, 0, 0.03)',
                  border: darkMode
                    ? '1px solid rgba(255, 255, 255, 0.08)'
                    : '1px solid rgba(0, 0, 0, 0.08)',
                  fontSize: '20px',
                  padding: 0,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: isDisabled ? 0.4 : 1,
                  filter: isDisabled ? 'grayscale(100%)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    bgcolor: isDisabled 
                      ? (darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')
                      : (darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'),
                    borderColor: isDisabled
                      ? (darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')
                      : '#FF9500',
                    transform: isDisabled ? 'none' : 'scale(1.05)',
                    boxShadow: isDisabled 
                      ? 'none'
                      : darkMode
                      ? '0 3px 8px rgba(255, 149, 0, 0.2)'
                      : '0 3px 8px rgba(255, 149, 0, 0.15)',
                  },
                  '&:active': {
                    transform: isDisabled ? 'none' : 'scale(0.95)',
                  },
                  '&:disabled': {
                    opacity: 0.3,
                  },
                }}
              >
                {action.emoji || '⚡'}
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

