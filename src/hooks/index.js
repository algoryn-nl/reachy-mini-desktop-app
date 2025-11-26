/**
 * Main barrel export for all hooks
 * Organized by category: apps, daemon, robot, system
 */

// Apps
export { useApps, useAppHandlers, useAppInstallation } from './apps';

// Daemon
export { useDaemon, useDaemonHealthCheck } from './daemon';

// Robot
export { useRobotCommands, useRobotPowerState, useRobotState, useRobotWebSocket } from './robot';

// System
export { useLogs, useUpdater, useUsbDetection, useWindowResize } from './system';

