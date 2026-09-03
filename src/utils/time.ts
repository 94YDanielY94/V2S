export function formatTime(seconds: number, includeMilliseconds: boolean = true): string {
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  if (includeMilliseconds) {
    const msStr = String(ms).padStart(2, '0');
    return `${mm}:${ss}.${msStr}`;
  }

  return `${mm}:${ss}`;
}

export function parseTimeToSeconds(timeStr: string): number | null {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    if (!isNaN(mins) && !isNaN(secs)) {
      return mins * 60 + secs;
    }
  } else if (parts.length === 3) {
    const hrs = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    if (!isNaN(hrs) && !isNaN(mins) && !isNaN(secs)) {
      return hrs * 3600 + mins * 60 + secs;
    }
  }
  const direct = parseFloat(timeStr);
  return isNaN(direct) ? null : direct;
}
