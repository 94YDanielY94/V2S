import type { AppSettings, SavedPresentation } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  // Auto-Save
  autoSaveEnabled: true,
  autoSaveInterval: 1.2,
  showSaveNotifications: true,

  // Presentation Mode
  presentationTransition: 'smooth',
  presentationSpeed: 1,
  presentationLoop: false,
  presentationShowProgress: true,
  presentationAutoHideDelay: 2400,

  // Editor & Player
  smallTweakStep: 0.05,
  largeTweakStep: 0.1,
  showMilliseconds: true,
  videoFit: 'contain',
  defaultScenePrefix: 'Slide',
  showShortcutsLegend: true,
  autoPauseOnAddStop: true,

  // Appearance
  theme: 'dark',
};

const SETTINGS_STORAGE_KEY = 'vts-app-settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.warn('Failed to parse app settings from localStorage, using defaults', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save app settings to localStorage', err);
  }
}

export function exportAllProjectsJSON(projects: SavedPresentation[]): void {
  const exportPayload = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    projectCount: projects.length,
    projects,
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `video_to_slides_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
