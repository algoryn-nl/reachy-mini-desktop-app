# 📋 Project Conventions

This document defines code, organization, and structure conventions for the Reachy Mini Standalone App project.

> **Note**: This file is intended for all developers and AI agents working on the project.

---

## 🌍 Language Convention

### English Only

**✅ All code, comments, documentation, and messages MUST be in English:**

- **Code**: Variable names, function names, class names
- **Comments**: Inline comments, JSDoc comments, block comments
- **Documentation**: README files, code documentation, API docs
- **Messages**: Console logs, error messages, user-facing strings
- **Git commits**: Commit messages and descriptions
- **File names**: Use English names (e.g., `useRobotState.js`, not `useEtatRobot.js`)

**❌ Do NOT use:**
- French, Spanish, or any other language in code
- Mixed languages (e.g., English code with French comments)
- Non-English variable names or function names

**Examples:**

```javascript
// ✅ GOOD
/**
 * Fetches the robot's current power state
 * @returns {object} Power state with isOn and isMoving flags
 */
export function useRobotPowerState() {
  const [isOn, setIsOn] = useState(false);
  // Check if motors are active
  return { isOn, isMoving };
}

// ❌ BAD
/**
 * Récupère l'état d'alimentation du robot
 * @returns {object} État avec isOn et isMoving
 */
export function useEtatRobot() {
  const [estAllume, setEstAllume] = useState(false);
  // Vérifie si les moteurs sont actifs
  return { estAllume, enMouvement };
}
```

**Exception**: User-facing UI text can be localized, but the code itself (variable names, comments) must remain in English.

---

## 📁 Folder Structure

### Main Organization

```
src/
├── components/     # Reusable React components
├── hooks/          # Custom hooks (organized by category)
├── views/          # Main application views
├── utils/          # Utilities and helpers
├── store/          # State management (Zustand)
├── config/         # Centralized configuration
└── constants/      # Shared constants
```

### Hooks Organized by Category

```
hooks/
├── apps/           # Application-related hooks
├── daemon/         # Daemon-related hooks
├── robot/          # Robot-related hooks
├── system/         # System hooks (updates, USB, logs, window)
└── index.js        # Main barrel export (optional)
```

---

## 📦 Barrel Exports (index.js)

### Convention

**✅ Use barrel exports (`index.js`) only if:**
- The module is imported from multiple places
- The barrel export actually simplifies imports
- The module defines a clear public interface

**❌ Do NOT create barrel exports if:**
- The module is not used
- Direct imports are clearer
- The module has only one export

### Current Barrel Exports

**✅ Used (keep):**
- `views/index.js` - Exports all main views
- `application-store/index.js` - Application store entry point
- `viewer3d/index.js` - Main 3D module

**❌ Unused (remove or use):**
- `hooks/*/index.js` - Created but never used (direct imports preferred)
- `views/active-robot/index.js` - Not used
- `views/active-robot/camera/index.js` - Not used

### Golden Rule

> **If a barrel export is not used within 2 weeks of creation, remove it.**

---

## 🎯 Naming Conventions

### Files and Folders

- **Hooks**: `useXxx.js` (e.g., `useApps.js`, `useRobotPowerState.js`)
- **Views**: `XxxView.jsx` (e.g., `UpdateView.jsx`, `ReadyToStartView.jsx`)
- **Components**: `Xxx.jsx` or `XxxComponent.jsx` (e.g., `AppTopBar.jsx`)
- **Utils**: `xxxUtils.js` (e.g., `errorUtils.js`, `windowUtils.js`)
- **Config**: `xxx.js` (e.g., `daemon.js`)

### Exports

- **Hooks**: `export function useXxx()` or `export const useXxx = () => {}`
- **Components**: `export default function Xxx()`
- **Utils**: `export function xxx()` (named exports)
- **Constants**: `export const XXX = {}`

### Variables and Functions

- **Variables**: `camelCase` (e.g., `isActive`, `updateAvailable`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DAEMON_CONFIG`, `MIN_DISPLAY_TIMES`)
- **Functions**: `camelCase` (e.g., `checkForUpdates`, `extractErrorMessage`)
- **Components**: `PascalCase` (e.g., `UpdateView`, `AppTopBar`)

---

## 🏗️ Code Organization

### Hooks

**Recommended structure:**
```javascript
import { useState, useEffect, useCallback } from 'react';
import useAppStore from '../../store/useAppStore';
import { DAEMON_CONFIG } from '../../config/daemon';

/**
 * Hook description
 * @param {type} param - Description
 * @returns {object} State and functions
 */
export function useXxx(param) {
  // State
  const [state, setState] = useState(initial);
  
  // Effects
  useEffect(() => {
    // ...
    return () => {
      // Cleanup
    };
  }, [deps]);
  
  // Callbacks
  const handleAction = useCallback(() => {
    // ...
  }, [deps]);
  
  return { state, handleAction };
}
```

**Categories:**
- `apps/` - Application management
- `daemon/` - Daemon management
- `robot/` - Robot commands and state
- `system/` - System (updates, USB, logs, window)

### Components

**Recommended structure:**
```javascript
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import useAppStore from '../store/useAppStore';

/**
 * Component description
 */
export default function XxxComponent({ prop1, prop2 }) {
  const { state } = useAppStore();
  
  return (
    <Box>
      {/* JSX */}
    </Box>
  );
}
```

### Utils

**Recommended structure:**
```javascript
/**
 * Utility function description
 * @param {type} param - Description
 * @returns {type} Description
 */
export function utilityFunction(param) {
  // Implementation
}
```

---

## 🔄 React Patterns

### Custom Hooks

- ✅ Always use `useCallback` for returned functions
- ✅ Always use `useMemo` for expensive calculations
- ✅ Always clean up resources in `useEffect` (cleanup)
- ✅ Use `useRef` for mutable values without re-renders

### State Management

- ✅ **Zustand** for global state (`useAppStore`)
- ✅ **useState** for local state
- ✅ Avoid prop drilling (use store if needed)

### Optimizations

- ✅ Use `React.memo` for heavy components
- ✅ Use `useMemo` for expensive calculations
- ✅ Use `useCallback` for callbacks passed as props
- ✅ Avoid unnecessary re-renders

---

## 📝 Imports

### Import Order

1. **React** and React libraries
2. **External libraries** (MUI, Tauri, etc.)
3. **Local components**
4. **Local hooks**
5. **Utils and config**
6. **Store**

**Example:**
```javascript
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { invoke } from '@tauri-apps/api/core';

import AppTopBar from '../components/AppTopBar';
import { useDaemon } from '../hooks/daemon/useDaemon';
import { DAEMON_CONFIG } from '../config/daemon';
import useAppStore from '../store/useAppStore';
```

### Relative Paths

- ✅ Use relative paths (`../`, `../../`)
- ✅ Prefer direct imports for clarity
- ✅ Use barrel exports only if really useful

---

## 🎨 Styling

### MUI `sx` Prop

- ✅ Use `sx` for inline styling
- ✅ Use MUI theme values when possible
- ✅ Avoid classic inline styles (`style={{}}`)

**Example:**
```javascript
<Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    bgcolor: darkMode ? '#1a1a1a' : '#ffffff',
  }}
>
```

---

## 🧹 DRY (Don't Repeat Yourself)

### Centralization

- ✅ **Constants**: `config/daemon.js` for all configs
- ✅ **Utils**: `utils/errorUtils.js` for error handling
- ✅ **Helpers**: Create reusable functions in `utils/`

### Examples

- ✅ `DAEMON_CONFIG.MIN_DISPLAY_TIMES` instead of magic values
- ✅ `extractErrorMessage()` instead of duplicating logic
- ✅ `isDevMode()` instead of checking `import.meta.env.DEV` everywhere

---

## 🚨 Error Handling

### Convention

- ✅ Use `errorUtils.js` to extract and format errors
- ✅ Always log errors with `console.error`
- ✅ Display user-friendly messages
- ✅ Handle recoverable errors (retry logic)

**Example:**
```javascript
import { extractErrorMessage, formatUserErrorMessage } from '../utils/errorUtils';

try {
  // ...
} catch (err) {
  const errorMsg = formatUserErrorMessage(extractErrorMessage(err));
  console.error('❌ Error:', errorMsg);
  setError(errorMsg);
}
```

---

## 🔧 Cleanup and Resources

### Convention

- ✅ Always clean up timers, intervals, WebSockets in `useEffect` cleanup
- ✅ Use `useRef` for values that should not trigger re-renders
- ✅ Clean up event listeners

**Example:**
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    // ...
  }, 1000);
  
  return () => {
    clearInterval(interval);
  };
}, [deps]);
```

---

## 📚 Documentation

### Comments

- ✅ Document complex functions with JSDoc
- ✅ Explain the "why" not the "what"
- ✅ Use emojis for important sections (✅, ⚠️, 🚀, etc.)
- ✅ **All comments MUST be in English**

**Example:**
```javascript
/**
 * ✅ OPTIMIZED: Hook to fetch robot power state
 * Uses HTTP polling every 500ms to detect motor state
 * 
 * @param {boolean} isActive - Whether daemon is active
 * @returns {object} Robot power state { isOn, isMoving }
 */
export function useRobotPowerState(isActive) {
  // Check if daemon is running before polling
  if (!isActive) return { isOn: false, isMoving: false };
  
  // Poll every 500ms for real-time updates
  // ...
}
```

---

## ✅ Pre-Commit Checklist

- [ ] All relative imports are correct
- [ ] No unused hooks/components
- [ ] Resource cleanup (timers, intervals, WebSockets)
- [ ] Appropriate error handling
- [ ] No magic values (use constants)
- [ ] DRY code (no duplication)
- [ ] Comments for complex parts (in English)
- [ ] All code, comments, and variable names in English
- [ ] No linter errors

---

## 🔄 Conventions Changelog

- **2024**: Hooks organized into subfolders by category
- **2024**: Renamed `useRobotState` → `useRobotPowerState` for clarity
- **2024**: Centralized hooks and utils (moved from `viewer3d/`)
- **2024**: **English-only convention** - All code, comments, and documentation must be in English

---

## 📖 References

- [React Hooks Best Practices](https://react.dev/reference/react)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Material-UI Documentation](https://mui.com/)

---

**Last updated**: 2024
