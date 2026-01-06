/**
 * ✅ REFACTORED: Simplified hook that uses centralized store
 * 
 * This hook is now a thin wrapper around useAppsStore which manages
 * all app state in the global store. This ensures:
 * - Single source of truth
 * - Shared cache across all components (1 day cache)
 * - Single global fetch (official + community apps together)
 * - Client-side filtering via useAppFiltering
 * 
 * @param {boolean} isActive - Whether the robot is active
 * @param {boolean} _official - DEPRECATED: no longer used for fetching, kept for backward compatibility
 */
import { useAppsStore } from './useAppsStore';

export function useApps(isActive, _official = true) {
  // Delegate to centralized store hook
  // Note: official param is ignored - all apps are fetched once and filtered client-side
  return useAppsStore(isActive);
}

