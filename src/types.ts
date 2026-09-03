export interface KeyframeSlide {
  id: string;
  timestamp: number; // in seconds
  title: string;
  notes?: string;
  imageUrl?: string; // high-resolution captured snapshot
  createdAt: number;
}

export type PresentationViewMode = 'snapshot' | 'video';

export interface ProjectData {
  title: string;
  videoName?: string;
  videoDuration: number;
  slides: KeyframeSlide[];
  version: string;
}
