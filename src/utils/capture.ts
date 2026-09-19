export function captureVideoFrame(videoElement: HTMLVideoElement): string {
  try {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return '';
    }
    const canvas = document.createElement('canvas');
    const aspect = videoElement.videoHeight / videoElement.videoWidth;
    canvas.width = Math.min(640, videoElement.videoWidth);
    canvas.height = Math.round(canvas.width * aspect);

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('Failed to capture video frame:', err);
    return '';
  }
}

export function generateThumbnailFromBlob(blob: Blob, atTime = 1): Promise<string> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
          video.remove();
        } catch {
          // ignore
        }
      };

      video.onloadeddata = () => {
        const seekTime = Math.min(atTime, Math.max(0.1, (video.duration || 10) * 0.1));
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const aspect = (video.videoHeight || 9) / (video.videoWidth || 16);
          canvas.width = Math.min(640, video.videoWidth || 640);
          canvas.height = Math.round(canvas.width * aspect);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.warn('Thumbnail generation error:', e);
        }
        cleanup();
        resolve('');
      };

      video.onerror = () => {
        cleanup();
        resolve('');
      };
    } catch {
      resolve('');
    }
  });
}

export function captureFromImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const frameCache = new Map<string, string>();

export function captureFrameAtTimestamp(videoSrc: string, timestamp: number): Promise<string> {
  if (!videoSrc) return Promise.resolve('');
  const rounded = Math.max(0, parseFloat(timestamp.toFixed(1)));
  const cacheKey = `${videoSrc}#${rounded}`;
  if (frameCache.has(cacheKey)) {
    return Promise.resolve(frameCache.get(cacheKey)!);
  }

  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = videoSrc;
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        try {
          video.src = '';
          video.remove();
        } catch {
          // ignore
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve('');
      }, 2500);

      video.onloadeddata = () => {
        video.currentTime = rounded;
      };

      video.onseeked = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          const aspect = (video.videoHeight || 9) / (video.videoWidth || 16);
          canvas.width = Math.min(360, video.videoWidth || 360);
          canvas.height = Math.round(canvas.width * aspect);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            frameCache.set(cacheKey, dataUrl);
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch {
          // ignore
        }
        cleanup();
        resolve('');
      };

      video.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve('');
      };
    } catch {
      resolve('');
    }
  });
}

