import type { VideoClip } from '../types';

export function getTotalDuration(clips: VideoClip[]): number {
  return clips.reduce((acc, clip) => acc + (clip.duration || 0), 0);
}

export function getClipForGlobalTime(clips: VideoClip[], globalTime: number) {
  if (clips.length === 0) {
    return { clipIndex: -1, clip: null, localTime: 0, clipStartTime: 0 };
  }

  let accumulated = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipDuration = clip.duration || 0;
    const isLast = i === clips.length - 1;

    if (globalTime < accumulated + clipDuration || isLast) {
      const local = Math.max(0, Math.min(globalTime - accumulated, clipDuration));
      return {
        clipIndex: i,
        clip,
        localTime: local,
        clipStartTime: accumulated,
      };
    }
    accumulated += clipDuration;
  }

  return {
    clipIndex: 0,
    clip: clips[0],
    localTime: 0,
    clipStartTime: 0,
  };
}

export function getClipBoundaries(clips: VideoClip[]): { clipIndex: number; timestamp: number }[] {
  const boundaries: { clipIndex: number; timestamp: number }[] = [];
  let accumulated = 0;

  for (let i = 0; i < clips.length - 1; i++) {
    accumulated += clips[i].duration || 0;
    boundaries.push({
      clipIndex: i,
      timestamp: accumulated,
    });
  }

  return boundaries;
}
