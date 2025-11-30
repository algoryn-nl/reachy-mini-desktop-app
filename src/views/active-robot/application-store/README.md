# Application Store Module

Module for managing Reachy Mini applications: discovery, installation, and management.

## 📁 Structure

```
application-store/
├── ApplicationStore.jsx       # Main component (orchestration)
├── DiscoverModal.jsx          # Fullscreen modal for app discovery
├── discover/                  # Discovery-related components
│   ├── Modal.jsx             # Discover modal wrapper
│   ├── Section.jsx           # Discover section (compact view)
│   ├── Button.jsx             # Button to open discover modal
│   └── components/            # Discover modal sub-components
│       ├── Header.jsx         # Modal header with title and description
│       ├── SearchBar.jsx       # Search and filter controls
│       ├── CategoryFilters.jsx # Category filter chips
│       ├── AppCard.jsx        # App card display
│       ├── EmptyState.jsx     # Empty state when no results
│       └── Footer.jsx         # Modal footer with actions
├── installed/                  # Installed apps management
│   ├── InstalledAppsSection.jsx  # Section displaying installed apps
│   └── AppLogs.jsx            # App logs viewer
├── installation/               # Installation process
│   └── Overlay.jsx            # Fullscreen installation overlay
├── modals/                     # Additional modals
│   └── CreateAppTutorial.jsx # Tutorial for creating apps
├── quick-actions/              # Quick action components
│   ├── Donut.jsx             # Donut-shaped quick actions
│   ├── Pad.jsx               # Pad quick actions
│   └── HandwrittenArrows.jsx # Arrow indicators
└── index.js                    # Main exports
```

## 🎯 Architecture

### Main Component
- **ApplicationStore**: Main orchestrator component
  - Manages app state (installed, available)
  - Handles installation/uninstallation
  - Coordinates modals and overlays
  - Props: `isActive`, `darkMode`, etc.

### Discovery Flow
1. **DiscoverModal**: Fullscreen modal for browsing apps
   - Fetches apps from Hugging Face dataset
   - Search and category filtering
   - Installation from discovery

2. **Discover Section**: Compact view in right panel
   - Button to open full modal
   - Quick access to discovery

### Installation Flow
1. **Installation Overlay**: Fullscreen overlay during installation
   - Shows progress and logs
   - Handles success/error states
   - Minimum display time for UX

2. **Installed Apps Section**: Management of installed apps
   - List of installed apps
   - Start/stop controls
   - Uninstall functionality
   - App logs integration

### Quick Actions
- **Donut**: Circular quick actions interface
- **Pad**: Pad-style quick actions
- Used in various contexts (discovery, installed apps)

## 🔧 Key Features

### App Discovery
- Fetches from Hugging Face dataset
- Search by name/description
- Category filtering
- Official apps filter
- Real-time installation status

### Installation Management
- Automatic installation from discovery
- Progress tracking
- Error handling and retry
- Minimum display time for smooth UX

### App Management
- Start/stop running apps
- View app logs
- Uninstall apps
- Status indicators (running, error, etc.)

## 📦 Exports

```javascript
// Main component
import ApplicationStore from '@views/active-robot/application-store';

// Utilities
import { fetchHuggingFaceAppList, HUGGINGFACE_APP_LIST_URL } from '@views/active-robot/application-store';
import { useAppHandlers } from '@views/active-robot/application-store';
```

## 🎨 Design Patterns

- **Fullscreen Overlays**: Used for modals and installation to focus user attention
- **Minimum Display Times**: Ensures smooth UX transitions (no flickering)
- **Centralized State**: Uses Zustand store for app state management
- **Component Composition**: Small, focused components composed into larger features

## 🔗 Dependencies

- `@hooks/apps`: App management hooks
- `@utils/huggingFaceApi`: Hugging Face API utilities
- `@components/FullscreenOverlay`: Overlay component
- `@store/useAppStore`: Global state management

