import React from 'react';
import { Box, Typography, Button, Chip, Collapse, CircularProgress, IconButton, Tooltip } from '@mui/material';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LaunchIcon from '@mui/icons-material/Launch';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DiscoverAppsButton from '../discover/Button';
import ReachiesCarousel from '@components/ReachiesCarousel';

/**
 * Opens an external URL in the system browser
 * Works in both Tauri and web contexts
 */
const openExternalUrl = async (url) => {
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch {
    // Fallback to window.open for web version
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Opens the app's custom web interface in the browser
 * Remaps hostname to match current location (for network access)
 */
const openAppWebInterface = async (customAppUrl) => {
  try {
    const url = new URL(customAppUrl);
    // Remap hostname to current location (handles localhost vs IP)
    url.hostname = window.location.hostname;
    await openExternalUrl(url.toString());
  } catch (err) {
    console.error('Failed to open app web interface:', err);
    // Last resort fallback
    await openExternalUrl(customAppUrl);
  }
};

/**
 * Section displaying installed apps with call-to-actions for discovery and creation
 * 
 * New compact design:
 * - Actions always visible (Start/Stop, Open if custom_app_url)
 * - Settings button (⚙️) toggles accordion for details/uninstall
 * - Visual indicator when app is running (green accent)
 */
export default function InstalledAppsSection({
  installedApps,
  darkMode,
  expandedApp,
  setExpandedApp,
  startingApp,
  currentApp,
  isBusy,
  isJobRunning,
  handleStartApp,
  handleUninstall,
  getJobInfo,
  stopCurrentApp,
  onOpenDiscover,
  onOpenCreateTutorial,
}) {

  return (
    <Box sx={{ px: 3, mb: 0 }}>
      {/* No apps installed yet - Full height, centered */}
      {installedApps.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
            py: 3.5,
            borderRadius: '14px',
            bgcolor: 'transparent',
            border: darkMode 
              ? '1px dashed rgba(255, 255, 255, 0.3)' 
              : '1px dashed rgba(0, 0, 0, 0.3)',
            gap: 1.5,
            minHeight: '280px',
          }}
        >
          {/* Reachies Carousel - Scrolling images */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 0.25,
            }}
          >
            <ReachiesCarousel 
              width={100}
              height={100}
              interval={750}
              transitionDuration={150}
              zoom={1.6}
              verticalAlign="60%"
              darkMode={darkMode}
            />
          </Box>
              
          <Typography
            sx={{
              fontSize: 14,
              color: darkMode ? '#aaa' : '#666',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            No apps installed yet...
          </Typography>

          <DiscoverAppsButton onClick={onOpenDiscover} darkMode={darkMode} />
          
          <Typography
            component="button"
            onClick={onOpenCreateTutorial}
            sx={{
              fontSize: 11,
              fontWeight: 500,
              color: darkMode ? '#666' : '#999',
              textDecoration: 'underline',
              textDecorationColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              textUnderlineOffset: '2px',
              cursor: 'pointer',
              bgcolor: 'transparent',
              border: 'none',
              p: 0,
              mt: -0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                color: darkMode ? '#888' : '#777',
                textDecorationColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
              },
            }}
          >
            or build your own
          </Typography>
        </Box>
      )}

      {/* Installed Apps List */}
      {installedApps.length > 0 && (
        <>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1, 
              mb: 0,
              minHeight: '280px',
              borderRadius: '14px',
              bgcolor: 'transparent',
              border: darkMode 
                ? '1px solid rgba(255, 255, 255, 0.08)' 
                : '1px solid rgba(0, 0, 0, 0.08)',
              p: 2,
            }}
          >
          {installedApps.map(app => {
            const isExpanded = expandedApp === app.name;
            const isRemoving = isJobRunning(app.name, 'remove');
            
            // Handle all current app states
            const isThisAppCurrent = currentApp && currentApp.info && currentApp.info.name === app.name;
            const appState = isThisAppCurrent && currentApp.state ? currentApp.state : null;
            const isCurrentlyRunning = appState === 'running';
            const isAppStarting = appState === 'starting';
            const isAppError = appState === 'error';
            const hasAppError = isThisAppCurrent && (currentApp.error || isAppError);
            
            const isStarting = startingApp === app.name || isAppStarting;
            
            // Check if app has custom web interface (only show when running)
            const hasCustomAppUrl = !!(app.extra?.custom_app_url && isCurrentlyRunning);
            
            // Get author from app data
            const author = app.extra?.id?.split('/')?.[0] || app.extra?.author || null;
            
            // Get HuggingFace URL
            const hfUrl = app.url || (app.extra?.id ? `https://huggingface.co/spaces/${app.extra.id}` : null);
            
            return (
              <Box
                key={app.name}
                sx={{
                  borderRadius: '14px',
                  bgcolor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'white',
                  // Green border when running, orange when expanded, default otherwise
                  border: `1px solid ${
                    isCurrentlyRunning 
                      ? '#22c55e' 
                      : isExpanded 
                        ? '#FF9500' 
                        : (darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')
                  }`,
                  transition: 'opacity 0.25s ease, filter 0.25s ease, border-color 0.2s ease',
                  overflow: 'hidden',
                  boxShadow: isCurrentlyRunning 
                    ? '0 0 0 1px rgba(34, 197, 94, 0.2)' 
                    : 'none',
                  opacity: isRemoving ? 0.5 : (isBusy && !isCurrentlyRunning ? 0.4 : 1),
                  filter: (isBusy && !isCurrentlyRunning) ? 'grayscale(50%)' : 'none',
                }}
              >
                {/* Header - Always visible */}
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: isCurrentlyRunning
                      ? (darkMode ? 'rgba(34, 197, 94, 0.05)' : 'rgba(34, 197, 94, 0.03)')
                      : 'transparent',
                  }}
                >
                  {/* Left: Emoji + Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0, overflow: 'hidden', pr: 1 }}>
                    {/* Emoji */}
                    <Box sx={{ flexShrink: 0 }}>
                      <Box
                        sx={{
                          fontSize: 28,
                          width: 52,
                          height: 52,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          bgcolor: isCurrentlyRunning
                            ? (darkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)')
                            : (darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
                          border: `1px solid ${
                            isCurrentlyRunning
                              ? 'rgba(34, 197, 94, 0.3)'
                              : (darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')
                          }`,
                        }}
                      >
                        {app.extra?.cardData?.emoji || app.icon || '📦'}
                      </Box>
                    </Box>
                    
                    {/* App name and metadata */}
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: darkMode ? '#f5f5f5' : '#333',
                            letterSpacing: '-0.2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {app.name}
                        </Typography>
                        
                        {/* Error indicator only */}
                        {hasAppError && (
                          <Chip 
                            label="Error" 
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: 9,
                              fontWeight: 700,
                              bgcolor: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}
                      </Box>
                      
                      {/* Author or job status */}
                      {(() => {
                        const jobInfo = getJobInfo(app.name);
                        
                        if (jobInfo) {
                          return (
                            <Typography
                              sx={{
                                fontSize: 9,
                                color: jobInfo.type === 'remove' ? '#ef4444' : '#FF9500',
                                fontWeight: 500,
                                fontFamily: 'monospace',
                                letterSpacing: '0.2px',
                              }}
                            >
                              {jobInfo.type === 'remove' ? 'Removing...' : 'Installing...'}
                            </Typography>
                          );
                        }
                        if (author) {
                          return (
                            <Typography
                              sx={{
                                fontSize: 9,
                                fontWeight: 500,
                                color: darkMode ? '#666' : '#999',
                                fontFamily: 'monospace',
                                letterSpacing: '0.2px',
                              }}
                            >
                              {author}
                            </Typography>
                          );
                        }
                        return null;
                      })()}
                    </Box>
                  </Box>
                  
                  {/* Right: Action buttons */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {/* Settings button - toggles accordion */}
                    <Tooltip title="Settings" arrow placement="top">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedApp(isExpanded ? null : app.name);
                        }}
                        sx={{
                          width: 32,
                          height: 32,
                          color: isExpanded ? '#FF9500' : (darkMode ? '#888' : '#999'),
                          bgcolor: isExpanded 
                            ? (darkMode ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.08)')
                            : 'transparent',
                          border: `1px solid ${
                            isExpanded 
                              ? '#FF9500' 
                              : (darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')
                          }`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: '#FF9500',
                            bgcolor: darkMode ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 149, 0, 0.08)',
                            borderColor: '#FF9500',
                          },
                        }}
                      >
                        <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Open button - only if custom_app_url exists and app is running */}
                    {hasCustomAppUrl && (
                      <Tooltip title="Open web interface" arrow placement="top">
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAppWebInterface(app.extra.custom_app_url);
                          }}
                          endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                          sx={{
                            minWidth: 'auto',
                            px: 1.5,
                            py: 0.75,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: '8px',
                            flexShrink: 0,
                            bgcolor: 'transparent',
                            color: '#FF9500',
                            border: '1px solid #FF9500',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(255, 149, 0, 0.08)',
                              borderColor: '#FF9500',
                            },
                          }}
                        >
                          Open
                        </Button>
                      </Tooltip>
                    )}
                    
                    {/* Start/Stop button */}
                    {isCurrentlyRunning ? (
                      <Tooltip title="Stop app" arrow placement="top">
                        <IconButton
                          size="small"
                          disabled={isBusy && !isCurrentlyRunning}
                          onClick={(e) => {
                            e.stopPropagation();
                            stopCurrentApp();
                          }}
                          sx={{
                            width: 32,
                            height: 32,
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(239, 68, 68, 0.08)',
                            },
                            '&:disabled': {
                              color: darkMode ? '#555' : '#999',
                              borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
                            },
                          }}
                        >
                          <StopCircleOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Button
                        size="small"
                        disabled={isStarting || isBusy || isRemoving}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartApp(app.name);
                        }}
                        endIcon={isStarting ? <CircularProgress size={12} sx={{ color: '#FF9500' }} /> : <PlayArrowOutlinedIcon sx={{ fontSize: 13 }} />}
                        sx={{
                          minWidth: 'auto',
                          px: 1.5,
                          py: 0.75,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'none',
                          borderRadius: '8px',
                          flexShrink: 0,
                          bgcolor: 'transparent',
                          color: '#FF9500',
                          border: '1px solid #FF9500',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(255, 149, 0, 0.08)',
                            borderColor: '#FF9500',
                          },
                          '&:disabled': {
                            bgcolor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                            color: darkMode ? '#555' : '#999',
                            borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
                          },
                        }}
                      >
                        {isStarting ? 'Starting...' : 'Start'}
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Expanded Content - Settings panel */}
                <Collapse in={isExpanded}>
                  <Box
                    sx={{
                      px: 2,
                      pb: 2,
                      pt: 1.5,
                      borderTop: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                    }}
                  >
                    {/* Description */}
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: darkMode ? '#aaa' : '#666',
                        lineHeight: 1.5,
                      }}
                    >
                      {app.description || 'No description available'}
                    </Typography>

                    {/* Actions row */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        pt: 1,
                        borderTop: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                      }}
                    >
                      {/* View on HuggingFace link */}
                      {hfUrl && (
                        <Button
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await openExternalUrl(hfUrl);
                          }}
                          startIcon={<LaunchIcon sx={{ fontSize: 12 }} />}
                          sx={{
                            fontSize: 10,
                            fontWeight: 500,
                            textTransform: 'none',
                            color: darkMode ? '#888' : '#999',
                            px: 1,
                            py: 0.5,
                            '&:hover': {
                              bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                              color: darkMode ? '#aaa' : '#666',
                            },
                          }}
                        >
                          View on HuggingFace
                        </Button>
                      )}
                      
                      {/* Spacer */}
                      <Box sx={{ flex: 1 }} />
                      
                      {/* Uninstall button */}
                      <Button
                        size="small"
                        disabled={isRemoving || isCurrentlyRunning}
                        startIcon={isRemoving ? <CircularProgress size={12} /> : <DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUninstall(app.name);
                        }}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'none',
                          color: '#ef4444',
                          borderRadius: '6px',
                          '&:hover': {
                            bgcolor: 'rgba(239, 68, 68, 0.08)',
                          },
                          '&:disabled': {
                            color: darkMode ? '#555' : '#999',
                          },
                        }}
                      >
                        {isRemoving ? 'Uninstalling...' : 'Uninstall'}
                      </Button>
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            );
          })}

          {/* Compact version: Discover apps / Build your own */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              px: 2,
              py: 1.5,
              borderRadius: '12px',
              bgcolor: 'transparent',
              border: darkMode 
                ? '1px dashed rgba(255, 255, 255, 0.2)' 
                : '1px dashed rgba(0, 0, 0, 0.2)',
              mt: 1,
            }}
          >
            <DiscoverAppsButton onClick={onOpenDiscover} darkMode={darkMode} />
            
            <Typography
              component="button"
              onClick={onOpenCreateTutorial}
              sx={{
                fontSize: 11,
                fontWeight: 500,
                color: darkMode ? '#666' : '#999',
                textDecoration: 'underline',
                textDecorationColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                textUnderlineOffset: '2px',
                cursor: 'pointer',
                bgcolor: 'transparent',
                border: 'none',
                p: 0,
                transition: 'color 0.2s ease, textDecorationColor 0.2s ease',
                '&:hover': {
                  color: darkMode ? '#888' : '#777',
                  textDecorationColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                },
              }}
            >
              or build your own
            </Typography>
          </Box>
          </Box>
        </>
      )}

    </Box>
  );
}
