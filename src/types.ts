export interface SceneStop {
  id: string;
  name: string;
  timestamp: number; // seconds in continuous / stitched timeline
  capturedImage?: string;
  isLooping?: boolean; // When true, scene strip loops in presentation mode
}

export interface VideoClip {
  id: string;
  name: string;
  url: string;
  duration: number; // duration in seconds
  file?: File;
  thumbnail?: string;
}

export interface SavedPresentation {
  id: string;
  name: string;
  updatedAt: number;
  clipNames: string[];
  scenes: SceneStop[];
  totalDuration: number;
  thumbnail?: string;
}

export interface ProjectSettings {
  videoName?: string;
  videoUrl?: string;
  scenes: SceneStop[];
}

export interface AppSettings {
  // Auto-Save
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in seconds
  showSaveNotifications: boolean;

  // Presentation Mode
  presentationTransition: 'smooth' | 'instant';
  presentationSpeed: number; // 0.5, 0.75, 1, 1.25, 1.5, 2
  presentationLoop: boolean;
  presentationShowProgress: boolean;
  presentationAutoHideDelay: number; // in ms

  // Editor & Player
  smallTweakStep: number;
  largeTweakStep: number;
  showMilliseconds: boolean;
  videoFit: 'contain' | 'cover';
  defaultScenePrefix: string;
  showShortcutsLegend: boolean;
  autoPauseOnAddStop: boolean;

  // Appearance
  theme: 'dark' | 'light';
}

export interface PresentationTab {
  id: string;
  projectId: string;
  title: string;
  fileName: string | null;
  videoUrl: string | null;
  clips: VideoClip[];
  scenes: SceneStop[];
  selectedSceneId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'unsaved';
}

