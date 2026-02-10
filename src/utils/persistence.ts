import { useConfigStore } from '../store/useConfigStore';

const STORAGE_KEY = 'balkong-konfigurator-state';

/** Keys to persist (only data, not functions/computed) */
const PERSIST_KEYS = [
  'levels',
  'guidePoints',
  'snapEnabled',
  'snapAngle',
  'activeMode',
  'activeView',
  'projectConfig',
  'profileConfig',
  'frameWidthSettings',
  'edgeConfigs',
  'expandedSections',
  'pointCloudEnabled',
  'pointCloudClipY',
  'pointCloudBrightness',
  'pointCloudPointSize',
  'pointCloudFile',
  'pointCloudOriginY',
  'pointCloudBoundsY',
] as const;

/** Save current store state to localStorage */
export function saveState(): boolean {
  try {
    const state = useConfigStore.getState();
    const data: Record<string, unknown> = {};
    for (const key of PERSIST_KEYS) {
      data[key] = (state as Record<string, unknown>)[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to save state:', e);
    return false;
  }
}

/** Load state from localStorage into the store */
export function loadState(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    useConfigStore.setState(data);
    return true;
  } catch (e) {
    console.error('Failed to load state:', e);
    return false;
  }
}

/** Check if saved state exists */
export function hasSavedState(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/** Clear saved state */
export function clearSavedState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
