import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { listen } from '@tauri-apps/api/event';

/**
 * Component to display real-time logs for a running app
 * Similar to InstallOverlay logs display
 * Listens to sidecar-stdout/stderr events and filters logs relevant to the app
 */
export default function AppLogs({ appName, isRunning, darkMode }) {
  const [logs, setLogs] = useState([]);
  const logsContainerRef = useRef(null);
  const unlistenStdoutRef = useRef(null);
  const unlistenStderrRef = useRef(null);
  
  // Helper: Check if a log line should be filtered out (system messages, etc.)
  const shouldFilterOut = (logLine) => {
    if (!logLine) return true;
    
    const line = typeof logLine === 'string' ? logLine : logLine.toString();
    const lineLower = line.toLowerCase();
    
    // Filter out system messages
    const systemPatterns = [
      /^WARNING: All log messages before absl::InitializeLog/i,
      /^INFO:.*127\.0\.0\.1.*GET \/api\//i,  // HTTP logs
      /^Sidecar (stdout|stderr):/i,
      /GET \/api\/state\/full/i,
      /GET \/api\/daemon\//i,
      /GET \/api\/apps\/current-app-status/i,
      /GET \/api\/apps\/.*\/logs/i,  // Our failed log requests
      /GET \/api\/apps\/logs\//i,
      /GET \/api\/apps\/.*\/output/i,
      /GET \/api\/apps\/.*\/stdout/i,
    ];
    
    return systemPatterns.some(pattern => pattern.test(line));
  };
  
  // Helper: Check if a log line is relevant to this app
  const isAppLog = (logLine) => {
    if (!logLine || !appName) return false;
    
    const line = typeof logLine === 'string' ? logLine : logLine.toString();
    const appNameLower = appName.toLowerCase();
    const lineLower = line.toLowerCase();
    
    // Filter out system logs first
    if (shouldFilterOut(line)) {
      return false;
    }
    
    // Check if log contains app name (but not in a path/URL)
    if (lineLower.includes(appNameLower)) {
      // Make sure it's not just in a file path
      const nameIndex = lineLower.indexOf(appNameLower);
      const beforeChar = line[nameIndex - 1];
      const afterChar = line[nameIndex + appNameLower.length];
      const isInPath = beforeChar === '/' || afterChar === '/' || beforeChar === '\\' || afterChar === '\\';
      
      if (!isInPath) {
        return true;
      }
    }
    
    // Check for common app log patterns (e.g., [RadioSet], [RadioDecoder] for reachy_mini_radio)
    // Patterns that typically indicate app-specific logs
    const appPatterns = [
      /^\[.*\]/,  // Logs starting with brackets (common for app modules like [RadioSet])
      /ERROR:reachy_mini\.apps/i,  // App-specific errors
      /INFO:reachy_mini\.apps/i,   // App-specific info
    ];
    
    return appPatterns.some(pattern => pattern.test(line));
  };
  
  // Helper: Determine log level and format
  const formatLogLine = (logLine) => {
    const line = typeof logLine === 'string' ? logLine : logLine.toString();
    const lineLower = line.toLowerCase();
    
    // Check for error patterns (not warnings)
    if (lineLower.includes('error:') || lineLower.includes('exception') || lineLower.includes('traceback')) {
      return { level: 'error', message: line };
    }
    
    // Check for warning patterns
    if (lineLower.includes('warning:')) {
      // Filter out system warnings that aren't interesting
      if (lineLower.includes('old firmware') || 
          lineLower.includes('absl::initializelog') ||
          lineLower.includes('all log messages before')) {
        return null; // Don't show these
      }
      return { level: 'warning', message: line };
    }
    
    // Regular log
    return { level: 'info', message: line };
  };
  
  // Listen to sidecar stdout/stderr events and filter logs for this app
  useEffect(() => {
    if (!appName || !isRunning) {
      setLogs([]);
      return;
    }
    
    const setupListeners = async () => {
      try {
        // Listen to stdout
        unlistenStdoutRef.current = await listen('sidecar-stdout', (event) => {
          const logLine = typeof event.payload === 'string' 
            ? event.payload 
            : event.payload?.toString() || '';
          
          // Extract actual log (remove "Sidecar stdout: " prefix if present)
          const cleanLine = logLine.replace(/^Sidecar stdout:\s*/, '').trim();
          
          // Skip empty lines and HTTP logs
          if (!cleanLine || cleanLine.includes('GET /api/') || cleanLine.includes('INFO:     127.0.0.1')) {
            return;
          }
          
          // Check if this log is relevant to the app
          if (isAppLog(cleanLine)) {
            const formatted = formatLogLine(cleanLine);
            if (formatted) {
              setLogs(prev => {
                const prefix = formatted.level === 'error' ? '[ERROR]' : formatted.level === 'warning' ? '[WARNING]' : '';
                const newLogs = [...prev, prefix ? `${prefix} ${formatted.message}` : formatted.message];
                // Keep only last 50 logs
                return newLogs.slice(-50);
              });
            }
          }
        });
        
        // Listen to stderr (errors and warnings)
        unlistenStderrRef.current = await listen('sidecar-stderr', (event) => {
          const logLine = typeof event.payload === 'string' 
            ? event.payload 
            : event.payload?.toString() || '';
          
          // Extract actual log (remove "Sidecar stderr: " prefix if present)
          const cleanLine = logLine.replace(/^Sidecar stderr:\s*/, '').trim();
          
          // Skip empty lines
          if (!cleanLine) {
            return;
          }
          
          // Check if this log is relevant to the app
          if (isAppLog(cleanLine)) {
            const formatted = formatLogLine(cleanLine);
            if (formatted) {
              setLogs(prev => {
                const prefix = formatted.level === 'error' ? '[ERROR]' : formatted.level === 'warning' ? '[WARNING]' : '';
                const newLogs = [...prev, prefix ? `${prefix} ${formatted.message}` : formatted.message];
                // Keep only last 50 logs
                return newLogs.slice(-50);
              });
            }
          }
        });
      } catch (error) {
        console.error('Failed to setup sidecar log listeners:', error);
      }
    };
    
    setupListeners();
    
    return () => {
      if (unlistenStdoutRef.current) {
        unlistenStdoutRef.current();
        unlistenStdoutRef.current = null;
      }
      if (unlistenStderrRef.current) {
        unlistenStderrRef.current();
        unlistenStderrRef.current = null;
      }
    };
  }, [appName, isRunning]);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsContainerRef.current && logs.length > 0) {
      logsContainerRef.current.scrollTo({
        top: logsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs.length]);
  
  if (!isRunning) {
    return null;
  }
  
  // Show last 20 logs (most recent at bottom)
  const displayLogs = logs.slice(-20);
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pt: 1,
        borderTop: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 600,
          color: darkMode ? '#888' : '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Logs
      </Typography>
      
      <Box
        ref={logsContainerRef}
        sx={{
          width: '100%',
          bgcolor: darkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.03)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
          borderRadius: '8px',
          p: 1.5,
          height: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: displayLogs.length > 0 ? 'flex-start' : 'center',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderRadius: '2px',
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      >
        {displayLogs.length > 0 ? (
          displayLogs.map((log, idx) => {
            // Handle different log formats
            const logText = typeof log === 'string' ? log : log.message || log.text || JSON.stringify(log);
            
            // Determine color based on log level
            const isError = logText.startsWith('[ERROR]');
            const isWarning = logText.startsWith('[WARNING]');
            
            // Remove prefix for display (already in color)
            const displayText = logText.replace(/^\[(ERROR|WARNING)\]\s*/, '');
            
            return (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  mb: idx < displayLogs.length - 1 ? 0.75 : 0,
                  animation: 'slideIn 0.2s ease',
                  '@keyframes slideIn': {
                    from: { 
                      opacity: 0, 
                      transform: 'translateY(-3px)' 
                    },
                    to: { 
                      opacity: 1, 
                      transform: 'translateY(0)' 
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    bgcolor: isError ? '#ef4444' : isWarning ? '#f59e0b' : '#FF9500',
                    mt: 0.6,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 9,
                    fontFamily: 'monospace',
                    color: isError 
                      ? (darkMode ? '#ff5555' : '#dc2626')
                      : isWarning
                      ? (darkMode ? '#fbbf24' : '#d97706')
                      : (darkMode ? '#d1d5db' : '#666'),
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {displayText}
                </Typography>
              </Box>
            );
          })
        ) : (
          <Typography
            sx={{
              fontSize: 10,
              color: darkMode ? '#888' : '#999',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            No logs available yet
          </Typography>
        )}
      </Box>
    </Box>
  );
}

