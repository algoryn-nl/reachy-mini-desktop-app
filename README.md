# Reachy Mini Control

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)
![Tauri](https://img.shields.io/badge/tauri-2.0-FFC131?logo=tauri&logoColor=white)

A modern desktop application for controlling and monitoring your Reachy Mini robot. Built with Tauri and React for a native, performant experience.

## ✨ Features

- 🤖 **Robot Control** - Start, stop, and monitor your Reachy Mini daemon
- 📊 **Real-time Monitoring** - Live 3D visualization of robot state
- 🏪 **Application Store** - Discover, install, and manage apps from Hugging Face Spaces
  - Browse official and community apps
  - Search and filter by categories
  - One-click installation and removal
  - Start and stop apps directly from the interface
- 📚 **Create Your Own Apps** - Tutorials and guides to build custom applications
  - Learn how to interact with the daemon API
  - Build apps with the Python SDK
  - Deploy and share on Hugging Face Spaces
- 🔄 **Auto Updates** - Seamless automatic updates with progress tracking
- 🎨 **Modern UI** - Clean, intuitive interface built with Material-UI
  - Dark mode support
  - Responsive design
- 🔌 **USB Detection** - Automatic detection of Reachy Mini via USB
- 🎭 **Simulation Mode** - Test and develop without hardware using MuJoCo simulation
- 📱 **Cross-platform** - Works on macOS and Windows

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and Yarn
- Rust (latest stable)
- System dependencies for Tauri ([see Tauri docs](https://v2.tauri.app/start/prerequisites/))

### Installation

```bash
# Clone the repository
git clone https://github.com/pollen-robotics/reachy-mini-control.git
cd reachy-mini-control/tauri-app

# Install dependencies
yarn install

# Run in development mode
yarn tauri:dev
```

### Building

```bash
# Build for production (uses PyPI release by default)
yarn tauri:build

# Build with develop branch from GitHub
REACHY_MINI_SOURCE=develop yarn build:sidecar-macos
# or for Linux
REACHY_MINI_SOURCE=develop yarn build:sidecar-linux

# Build for specific platform
yarn tauri build --target aarch64-apple-darwin
```

#### Installing the daemon from different sources

By default, the `reachy-mini` package is installed from PyPI (latest stable release). You can also install from the `develop` branch on GitHub by using the `REACHY_MINI_SOURCE` environment variable:

- **PyPI (default)** : `REACHY_MINI_SOURCE=pypi` or omit the variable
- **GitHub develop** : `REACHY_MINI_SOURCE=develop`

Example to build the sidecar with the develop version:
```bash
REACHY_MINI_SOURCE=develop bash ./build_sidecar_unix.sh
```

## 📖 Documentation

- [Update Pipelines](./docs/UPDATE_PIPELINES.md) - Dev and production update workflows
- [Testing Guide](./docs/TESTING_GUIDE.md) - How to test the application
- [Architecture](./docs/STATE_MACHINE.md) - Application state machine and architecture

### Application Store

The application includes a built-in store for discovering and installing apps:

- **Discover Apps**: Browse apps from Hugging Face Spaces tagged with `reachy_mini`
- **Install & Manage**: Install, uninstall, start, and stop apps with a simple interface
- **Search & Filter**: Find apps by name or filter by categories
- **Create Apps**: Access tutorials to learn how to build your own Reachy Mini applications

Apps are managed through the FastAPI daemon API, which handles installation and execution.

## 🛠️ Development

### Available Scripts

```bash
yarn dev              # Start Vite dev server
yarn tauri:dev        # Run Tauri app in dev mode
yarn tauri:dev:sim    # Run Tauri app in simulation mode (skip USB detection)
yarn tauri:build      # Build production bundle
yarn build:update:dev # Build update for local testing
yarn serve:updates    # Serve updates locally for testing
```

### 🎭 Simulation Mode

To develop or test the application without a USB-connected robot, use simulation mode:

```bash
# Via npm/yarn script (recommended)
yarn tauri:dev:sim

# Or manually with environment variable
VITE_SIM_MODE=true yarn tauri:dev

# Or via localStorage (in browser console)
localStorage.setItem('simMode', 'true')
# Then reload the application
```

**Simulation mode behavior:**
- ✅ Skip USB detection (goes directly to `ReadyToStartView`)
- ✅ Simulates a USB connection (`/dev/tty.usbserial-SIMULATED`)
- ✅ Visual indicator "🎭 SIM" in the top bar
- ✅ **The daemon automatically starts in simulation mode (MuJoCo)** with the `--sim` argument
- ✅ **MuJoCo is automatically installed** on first startup in simulation mode
  - Installation happens in the background via `uv pip install reachy-mini[mujoco]`
  - If MuJoCo is already installed, installation will be quick (verification only)
- 🍎 **On macOS**: Automatically uses `mjpython` (required by MuJoCo) with automatic shebang correction

**Disable simulation mode:**
```bash
# Supprimer la variable d'environnement
yarn tauri:dev

# Ou via localStorage
localStorage.removeItem('simMode')
```

### Project Structure

```
tauri-app/
├── src/                              # Frontend React code
│   ├── components/                   # React components
│   │   └── viewer3d/                # 3D robot visualization
│   ├── hooks/                        # Custom React hooks
│   │   └── useApps.js               # App management hook
│   ├── store/                        # State management (Zustand)
│   ├── views/                        # Main views
│   │   └── active-robot/
│   │       └── application-store/    # Application store UI
│   └── utils/                        # Utility functions
├── src-tauri/                        # Rust backend
│   ├── src/                          # Rust source code
│   ├── tauri.conf.json               # Tauri configuration
│   └── capabilities/                 # Tauri security capabilities
├── scripts/                          # Build and utility scripts
├── uv-wrapper/                       # UV wrapper for Python package management
└── docs/                             # Documentation
```

## 🔄 Updates

The application includes automatic update functionality:

- **Development**: Test updates locally with `yarn build:update:dev` and `yarn serve:updates`
- **Production**: Updates are automatically built and signed via GitHub Actions

See [UPDATE_PIPELINES.md](./docs/UPDATE_PIPELINES.md) for detailed information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Framework for building desktop apps
- [React](https://react.dev/) - UI library
- [Material-UI](https://mui.com/) - Component library
- [Reachy Mini](https://www.pollen-robotics.com/reachy-mini/) - The robot this app controls

---

Made with ❤️ for the Reachy Mini community
