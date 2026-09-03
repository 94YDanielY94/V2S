export interface SceneStop {
  id: string;
  name: string;
  timestamp: number; // seconds in video
}

export interface ProjectSettings {
  videoName?: string;
  videoUrl?: string;
  scenes: SceneStop[];
}
