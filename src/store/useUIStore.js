import { create } from 'zustand';

/**
 * UI store - Manages theme, windows, and UI state
 */

// Detect system preference
const getSystemPreference = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Read stored preference
const getStoredPreference = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('darkMode');
  return stored ? JSON.parse(stored) : null;
};

// Determine initial dark mode
const getInitialDarkMode = () => {
  const storedPreference = getStoredPreference();
  // If user has stored preference, use it
  if (storedPreference !== null) {
    return storedPreference;
  }
  // Otherwise, use system preference
  return getSystemPreference();
};

export const useUIStore = create((set) => ({
  // Theme (initialized with system or stored preference)
  darkMode: getInitialDarkMode(),
  
  // Window management - Track open secondary windows
  openWindows: [], // Array of window labels that are currently open
  
  // Right panel view management - Controls what's displayed in the right column
  // Possible values: null (default/applications), 'controller', 'expressions'
  rightPanelView: null,
  
  // Window management actions
  addOpenWindow: (windowLabel) => set((state) => {
    if (!state.openWindows.includes(windowLabel)) {
      return { openWindows: [...state.openWindows, windowLabel] };
    }
    return state;
  }),
  
  removeOpenWindow: (windowLabel) => set((state) => ({
    openWindows: state.openWindows.filter(label => label !== windowLabel),
  })),
  
  isWindowOpen: (windowLabel) => {
    const state = useUIStore.getState();
    return state.openWindows.includes(windowLabel);
  },
  
  // Right panel view management actions
  setRightPanelView: (view) => set({ rightPanelView: view }), // view: null | 'controller' | 'expressions'
  
  // Toggle dark mode (with persistence)
  setDarkMode: (value) => {
    localStorage.setItem('darkMode', JSON.stringify(value));
    set({ darkMode: value });
  },
  
  toggleDarkMode: () => set((state) => {
    const newValue = !state.darkMode;
    localStorage.setItem('darkMode', JSON.stringify(newValue));
    return { darkMode: newValue };
  }),
  
  // Reset to system preference
  resetDarkMode: () => {
    localStorage.removeItem('darkMode');
    const systemPreference = getSystemPreference();
    set({ darkMode: systemPreference });
  },
}));

// Listen to system preference changes
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleSystemPreferenceChange = (e) => {
    // Only update if user has no stored preference
    const storedPreference = getStoredPreference();
    if (storedPreference === null) {
      useUIStore.setState({ darkMode: e.matches });
    }
  };
  
  // Modern method
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemPreferenceChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleSystemPreferenceChange);
  }
}

