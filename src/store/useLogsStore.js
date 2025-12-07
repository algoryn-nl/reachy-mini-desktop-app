import { create } from 'zustand';
import { DAEMON_CONFIG } from '../config/daemon';

/**
 * Logs store - Manages all types of logs (daemon, frontend, app)
 */
export const useLogsStore = create((set) => ({
  // Logs - Centralized system
  logs: [],              // Daemon logs (from Tauri IPC)
  frontendLogs: [],      // Frontend action logs (API calls, user actions)
  appLogs: [],           // App logs (from running apps via sidecar stdout/stderr)
  
  // Set daemon logs - merge intelligently to avoid unnecessary re-renders
  setLogs: (newLogs) => set((state) => {
    // If logs haven't changed, don't update (avoid re-renders)
    if (state.logs === newLogs || (Array.isArray(state.logs) && Array.isArray(newLogs) && 
        state.logs.length === newLogs.length && 
        state.logs.length > 0 && 
        state.logs[state.logs.length - 1] === newLogs[newLogs.length - 1])) {
      return state; // No change
    }
    return { logs: newLogs };
  }),
  
  // Specific helpers for logs (business logic)
  addFrontendLog: (message, level = 'info') => {
    // Validate and sanitize input
    if (message == null) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[addFrontendLog] Received null/undefined message, skipping');
      }
      return;
    }
    
    // Validate level
    const validLevels = ['info', 'success', 'warning', 'error'];
    const normalizedLevel = validLevels.includes(level) ? level : 'info';
    
    // Convert to string and truncate if too long (prevent memory issues)
    const sanitizedMessage = String(message).slice(0, 10000); // Max 10KB per log
    
    try {
      const now = Date.now();
      let formattedTimestamp;
      try {
        formattedTimestamp = new Date(now).toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false // 24-hour format
        });
      } catch (e) {
        // Fallback if toLocaleTimeString fails (shouldn't happen, but be safe)
        formattedTimestamp = new Date(now).toISOString().substring(11, 19);
      }
      
      set((state) => {
        const newLog = {
          timestamp: formattedTimestamp,
          timestampNumeric: now,
          message: sanitizedMessage,
          source: 'frontend',
          level: normalizedLevel, // Store level for filtering/display
        };
        
        const newFrontendLogs = [
          ...state.frontendLogs.slice(-DAEMON_CONFIG.LOGS.MAX_FRONTEND), // Keep max logs
          newLog
        ];
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[addFrontendLog] Adding log:', sanitizedMessage, 'level:', normalizedLevel);
          console.log('[addFrontendLog] New frontendLogs count:', newFrontendLogs.length);
        }
        
        return { frontendLogs: newFrontendLogs };
      });
    } catch (error) {
      // Fail silently in production, log in dev
      if (process.env.NODE_ENV === 'development') {
        console.error('[addFrontendLog] Error adding log:', error);
      }
    }
  },
  
  // Add app log to centralized system
  addAppLog: (message, appName, level = 'info') => {
    // Validate inputs
    if (message == null) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[addAppLog] Received null/undefined message, skipping');
      }
      return;
    }
    
    // Sanitize inputs
    const sanitizedMessage = String(message).slice(0, 10000); // Max 10KB per log
    const sanitizedAppName = appName ? String(appName).slice(0, 100) : undefined;
    const sanitizedLevel = ['info', 'warning', 'error'].includes(level) ? level : 'info';
    
    try {
      const now = Date.now();
      let formattedTimestamp;
      try {
        formattedTimestamp = new Date(now).toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
        });
      } catch (e) {
        formattedTimestamp = new Date(now).toISOString().substring(11, 19);
      }
      
      const newLog = {
        timestamp: formattedTimestamp,
        timestampNumeric: now,
        message: sanitizedMessage,
        source: 'app',
        appName: sanitizedAppName,
        level: sanitizedLevel,
      };
    
      set((state) => {
        // ✅ Deduplication: Check if the last log is the same (avoid duplicates)
        // Use numeric timestamp for more accurate comparison
        const lastLog = state.appLogs[state.appLogs.length - 1];
        const isDuplicate = lastLog && 
            lastLog.message === sanitizedMessage && 
            lastLog.appName === sanitizedAppName &&
            // Allow same message if timestamp is different (at least 100ms apart)
            lastLog.timestampNumeric && 
            (now - lastLog.timestampNumeric) < 100;
        
        if (isDuplicate) {
          // Don't add duplicate
          return state;
        }
        
        return {
          appLogs: [
            ...state.appLogs.slice(-DAEMON_CONFIG.LOGS.MAX_APP), // Keep max app logs
            newLog
          ]
        };
      });
    } catch (error) {
      // Fail silently in production, log in dev
      if (process.env.NODE_ENV === 'development') {
        console.error('[addAppLog] Error adding log:', error);
      }
    }
  },
  
  // Clear app logs (when app stops)
  clearAppLogs: (appName) => set((state) => ({
    appLogs: appName 
      ? state.appLogs.filter(log => log.appName !== appName)
      : [] // Clear all if no appName provided
  })),
}));

