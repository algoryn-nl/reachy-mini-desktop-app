import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, Tooltip, InputBase } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import West from '@mui/icons-material/West';
import East from '@mui/icons-material/East';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import { EmojiPicker } from '@components/emoji-grid';
import { CHOREOGRAPHY_DATASETS, QUICK_ACTIONS, EMOTIONS, DANCES, EMOTION_EMOJIS, DANCE_EMOJIS } from '@constants/choreographies';
import { useRobotCommands } from '@hooks/robot';
import { useActiveRobotContext } from '../../context';
import { useLogger } from '@/utils/logging';

// Constants - moved outside component to avoid recreation
const BUSY_DEBOUNCE_MS = 150;
const EFFECT_DURATION_MS = 4000;

// Effect mapping for 3D visual effects - moved outside component
const EFFECT_MAP = {
  'goto_sleep': 'sleep',
  'wake_up': null,
  'loving1': 'love',
  'sad1': 'sad',
  'surprised1': 'surprised',
};

/**
 * Expressions Section - Wrapper for SpinningWheel in right panel
 * Displays the Expressions component in the right column instead of a separate window
 * Uses ActiveRobotContext for decoupling from global stores
 */
export default function ExpressionsSection({ 
  isActive: isActiveProp = false,
  isBusy: isBusyProp = false,
  darkMode = false,
}) {
  // Get state and actions from context
  const { robotState, actions } = useActiveRobotContext();
  const { 
    isActive: isActiveFromContext,
    robotStatus, 
    isCommandRunning, 
    isAppRunning, 
    isInstalling 
  } = robotState;
  const { setRightPanelView, triggerEffect, stopEffect } = actions;
  
  // Use context value or prop fallback
  const isActive = isActiveFromContext ?? isActiveProp;
  
  // Compute isReady and isBusy from state
  const isReady = robotStatus === 'ready';
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  
  // Debounce isBusy to prevent flickering when state changes rapidly
  const rawIsBusy = robotStatus === 'busy' || isCommandRunning || isAppRunning || isInstalling;
  const [debouncedIsBusy, setDebouncedIsBusy] = useState(rawIsBusy);
  const debounceTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (rawIsBusy && !debouncedIsBusy) {
      setDebouncedIsBusy(true);
    } else if (!rawIsBusy && debouncedIsBusy) {
      debounceTimeoutRef.current = setTimeout(() => {
        setDebouncedIsBusy(false);
      }, BUSY_DEBOUNCE_MS);
    }
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [rawIsBusy, debouncedIsBusy]);
  
  const { sendCommand, playRecordedMove } = useRobotCommands();
  const logger = useLogger();

  // Store timeout ref for effect cleanup
  const effectTimeoutRef = useRef(null);

  // Handler for quick actions
  const handleQuickAction = useCallback((action) => {
    // Find the specific emoji for this expression
    let emoji = null;
    if (action.type === 'emotion') {
      emoji = EMOTION_EMOJIS[action.name] || null;
    } else if (action.type === 'dance') {
      emoji = DANCE_EMOJIS[action.name] || null;
    }
    
    // Log the action with emoji if found, otherwise just the label
    const logMessage = emoji ? `${emoji} ${action.label}` : action.label;
    logger.userAction(logMessage);
    
    if (action.type === 'action') {
      sendCommand(`/api/move/play/${action.name}`, action.label);
    } else if (action.type === 'dance') {
      playRecordedMove(CHOREOGRAPHY_DATASETS.DANCES, action.name);
    } else {
      playRecordedMove(CHOREOGRAPHY_DATASETS.EMOTIONS, action.name);
    }
    
    // Trigger corresponding 3D visual effect
    const effectType = EFFECT_MAP[action.name];
    if (effectType) {
      triggerEffect(effectType);
      
      // Clear previous timeout if exists
      if (effectTimeoutRef.current) {
        clearTimeout(effectTimeoutRef.current);
      }
      
      effectTimeoutRef.current = setTimeout(() => {
        stopEffect();
        effectTimeoutRef.current = null;
      }, EFFECT_DURATION_MS);
    }
  }, [sendCommand, playRecordedMove, triggerEffect, stopEffect]);

  // Cleanup effect timeout on unmount
  useEffect(() => {
    return () => {
      if (effectTimeoutRef.current) {
        clearTimeout(effectTimeoutRef.current);
        effectTimeoutRef.current = null;
      }
    };
  }, []);

  const quickActions = QUICK_ACTIONS;

  // Handle grid action
  const handleGridAction = useCallback((action) => {
    if (debouncedIsBusy) return;
    handleQuickAction(action);
  }, [debouncedIsBusy, handleQuickAction]);

  const handleBack = () => {
    setRightPanelView(null);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
        overflow: 'visible', // Allow wheel to overflow container
      }}
    >
      {/* Header with back button, title and library tabs */}
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          bgcolor: 'transparent',
          position: 'relative',
          zIndex: 1000, // Above wheel and all its components
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <IconButton
            onClick={handleBack}
            size="small"
            sx={{
              color: '#FF9500',
              '&:hover': {
                bgcolor: darkMode ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.05)',
              },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 700,
              color: darkMode ? '#f5f5f5' : '#333',
              letterSpacing: '-0.3px',
            }}
          >
            Expressions
          </Typography>
          <Tooltip
            title={
              <Box sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.9)',
                        }}
                      >
                        <West sx={{ fontSize: '12px' }} />
                      </Box>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.9)',
                        }}
                      >
                        <East sx={{ fontSize: '12px' }} />
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Keyboard navigate
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '65px',
                        height: '20px',
                        px: 1,
                        borderRadius: '3px',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        fontSize: '9px',
                        fontFamily: 'system-ui, sans-serif',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.9)',
                      }}
                    >
                      Space
                    </Box>
                    <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Keyboard trigger
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.9)',
                      }}
                    >
                      <SwapHoriz sx={{ fontSize: '12px' }} />
                    </Box>
                    <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Mouse drag
                    </Typography>
                  </Box>
                </Box>
              </Box>
            }
            arrow
            placement="bottom"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(50, 50, 50, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`,
                  maxWidth: 'none',
                },
              },
              arrow: {
                sx: {
                  color: darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(50, 50, 50, 0.95)',
                },
              },
            }}
          >
            <IconButton
              size="small"
              sx={{
                color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                '&:hover': {
                  color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                  bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                },
                p: 0.5,
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          
          {/* Spacer */}
          <Box sx={{ flex: 1 }} />
          
          {/* Search input - discrete */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              bgcolor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              transition: 'all 0.2s ease',
              '&:focus-within': {
                bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderColor: 'rgba(255,149,0,0.4)',
              },
            }}
          >
            <SearchIcon 
              sx={{ 
                fontSize: 14, 
                color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
              }} 
            />
            <InputBase
              ref={searchInputRef}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                fontSize: 12,
                color: darkMode ? '#fff' : '#333',
                width: searchQuery ? 100 : 60,
                transition: 'width 0.2s ease',
                '& input': {
                  padding: 0,
                  '&::placeholder': {
                    color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                    opacity: 1,
                  },
                },
              }}
            />
            {searchQuery && (
              <IconButton
                size="small"
                onClick={() => setSearchQuery('')}
                sx={{
                  p: 0.25,
                  color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                  '&:hover': {
                    color: '#FF9500',
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            )}
          </Box>
        </Box>
        
      </Box>
      {/* Emoji Grid Section */}
      <Box
        sx={{
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'transparent',
          position: 'relative',
          overflow: 'auto',
          minHeight: 0,
          px: 2,
          py: 2,
        }}
      >
        <EmojiPicker
          emotions={EMOTIONS}
          dances={DANCES}
          onAction={handleGridAction}
          darkMode={darkMode}
          disabled={debouncedIsBusy || !isActive}
          searchQuery={searchQuery}
        />
      </Box>
    </Box>
  );
}


