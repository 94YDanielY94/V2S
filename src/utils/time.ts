let currentVideoDuration = 0;

export function setGlobalVideoDuration(duration: number): void {
  if (!isNaN(duration) && duration >= 0) {
    currentVideoDuration = duration;
  }
}

export function getGlobalVideoDuration(): number {
  return currentVideoDuration;
}

/**
 * Formats a duration in seconds into a timecode string.
 *
 * Behavior dependent on video total time:
 * - When totalDuration < 60 (seconds-long video):
 *   Formats starting with seconds then milliseconds (ss:ms), e.g. "04:25", "12:00".
 * - When totalDuration >= 3600 (hours-long video):
 *   Formats as hh:mm:ss (or hh:mm:ss.ms if includeMilliseconds).
 * - When totalDuration >= 60 (standard minutes-long video):
 *   Formats as mm:ss (or mm:ss.ms if includeMilliseconds).
 */
export function formatTime(
  seconds: number,
  includeMilliseconds: boolean = true,
  totalDuration?: number
): string {
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }

  const effectiveTotalDuration =
    totalDuration !== undefined && totalDuration > 0
      ? totalDuration
      : currentVideoDuration;

  // If the total duration of the video is under 60 seconds ("second video"):
  // Format starting with seconds then milliseconds (ss:ms)
  if (effectiveTotalDuration > 0 && effectiveTotalDuration < 60) {
    let totalSecs = Math.floor(seconds);
    let ms = Math.round((seconds - totalSecs) * 100);
    if (ms >= 100) {
      totalSecs += 1;
      ms = 0;
    }
    const ss = String(totalSecs).padStart(2, '0');
    const msStr = String(ms).padStart(2, '0');
    return `${ss}:${msStr}`;
  }

  // If the video is 1 hour or more (>= 3600 seconds):
  if (effectiveTotalDuration >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    let secs = Math.floor(seconds % 60);
    const hh = String(hrs).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');

    if (includeMilliseconds) {
      let ms = Math.round((seconds - Math.floor(seconds)) * 100);
      if (ms >= 100) {
        secs += 1;
        ms = 0;
      }
      const ss = String(secs).padStart(2, '0');
      const msStr = String(ms).padStart(2, '0');
      return `${hh}:${mm}:${ss}.${msStr}`;
    }
    const ss = String(secs).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  // Standard minute-length video (>= 60s or unspecified):
  const mins = Math.floor(seconds / 60);
  let secs = Math.floor(seconds % 60);
  const mm = String(mins).padStart(2, '0');

  if (includeMilliseconds) {
    let ms = Math.round((seconds - Math.floor(seconds)) * 100);
    if (ms >= 100) {
      secs += 1;
      ms = 0;
    }
    const ss = String(secs).padStart(2, '0');
    const msStr = String(ms).padStart(2, '0');
    return `${mm}:${ss}.${msStr}`;
  }

  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Parses user-entered timecode strings into seconds.
 *
 * Behavior dependent on video total time:
 * - For a video with totalDuration < 60s:
 *   "05:20" or "5:20" or "05.20" is parsed as seconds and ms (5.20s).
 * - For a video with totalDuration >= 60s:
 *   "01:20" is parsed as minutes and seconds (80s).
 * - For 3-part strings "01:05:20":
 *   If short video: mins:secs:ms.
 *   If long video: hrs:mins:secs.
 */
export function parseTimeToSeconds(timeStr: string, totalDuration?: number): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim().replace(/[sS]$/, '').trim();
  if (!trimmed) return null;

  const effectiveTotalDuration =
    totalDuration !== undefined && totalDuration > 0
      ? totalDuration
      : currentVideoDuration;

  const isShortVideo = effectiveTotalDuration > 0 && effectiveTotalDuration < 60;

  // Handle strings with colons ':'
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');

    // 2 parts: A:B
    if (parts.length === 2) {
      const first = parseFloat(parts[0]);
      const second = parseFloat(parts[1]);
      if (isNaN(first) || isNaN(second)) return null;

      if (isShortVideo) {
        // In a seconds-length video:
        // A is seconds, B is milliseconds / hundredths of a second
        const rawSecond = parts[1].trim();
        let msFraction = 0;
        if (rawSecond.length === 1) {
          msFraction = second / 10;
        } else if (rawSecond.length === 2) {
          msFraction = second / 100;
        } else {
          msFraction = second / Math.pow(10, rawSecond.length);
        }
        return parseFloat((first + msFraction).toFixed(3));
      } else {
        // In a minutes+ video:
        // A is minutes, B is seconds (can have decimals like "23.5")
        return parseFloat((first * 60 + second).toFixed(3));
      }
    }

    // 3 parts: A:B:C
    if (parts.length === 3) {
      const a = parseFloat(parts[0]);
      const b = parseFloat(parts[1]);
      const c = parseFloat(parts[2]);
      if (isNaN(a) || isNaN(b) || isNaN(c)) return null;

      if (isShortVideo) {
        // mins:secs:ms
        const rawThird = parts[2].trim();
        const msFraction = rawThird.length <= 2 ? c / 100 : c / Math.pow(10, rawThird.length);
        return parseFloat((a * 60 + b + msFraction).toFixed(3));
      } else {
        // hrs:mins:secs
        return parseFloat((a * 3600 + b * 60 + c).toFixed(3));
      }
    }
  }

  // Direct number or decimal string (e.g. "5.25", "12")
  const direct = parseFloat(trimmed);
  return isNaN(direct) ? null : direct;
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
