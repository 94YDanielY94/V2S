import type { SceneStop } from '../types';

/**
 * Generates an interactive continuous animation video showing seamless transitions
 * between 4 scenes: 0s, 4s, 8s, 12s.
 */
export async function generateContinuousDemoVideo(): Promise<{
  videoUrl: string;
  scenes: SceneStop[];
}> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const defaultScenes: SceneStop[] = [
      { id: 'scene-1', name: 'Scene 1: Introduction', timestamp: 0 },
      { id: 'scene-2', name: 'Scene 2: Core Concept', timestamp: 4 },
      { id: 'scene-3', name: 'Scene 3: Navigation Flow', timestamp: 8 },
      { id: 'scene-4', name: 'Scene 4: Summary', timestamp: 12 },
    ];

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);
      resolve({ videoUrl, scenes: defaultScenes });
    };

    recorder.start();

    const totalSeconds = 16;
    const fps = 30;
    const totalFrames = totalSeconds * fps;
    let frame = 0;

    const interval = setInterval(() => {
      const time = frame / fps;
      renderFrame(ctx, time);
      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 1000 / fps);

    function renderFrame(c: CanvasRenderingContext2D, t: number) {
      // Solid neutral dark background #1a1a1a (no gradient)
      c.fillStyle = '#1a1a1a';
      c.fillRect(0, 0, 1280, 720);

      // Section calculation (each scene is 4 seconds)
      const sceneIndex = Math.min(3, Math.floor(t / 4));
      const sceneProgress = (t % 4) / 4;

      // Card container #242424 with 1px border #383838
      c.fillStyle = '#242424';
      c.fillRect(100, 80, 1080, 560);
      c.strokeStyle = '#383838';
      c.lineWidth = 1;
      c.strokeRect(100, 80, 1080, 560);

      // Subtle indicator badge
      c.fillStyle = '#2e2e2e';
      c.fillRect(140, 120, 110, 32);
      c.fillStyle = '#cccccc';
      c.font = '600 13px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText(`SCENE ${sceneIndex + 1} OF 4`, 195, 141);

      // Scene headers
      const sceneTitles = [
        'Scene 1: One Continuous Video as a Slide Deck',
        'Scene 2: Automatic Stop Points on the Timeline',
        'Scene 3: Pressing Arrow Key Plays to Next Scene',
        'Scene 4: The Presentation is Complete'
      ];

      const sceneDescriptions = [
        'The video itself contains all the fluid slide animations and transitions.',
        'At each scene stop, playback pauses automatically until you press Next.',
        'Pressing [→] or [Space] plays smoothly to the next point and pauses.',
        'Pressing [←] rewinds back to the previous scene stop point.'
      ];

      c.fillStyle = '#f0f0f0';
      c.font = 'bold 32px system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillText(sceneTitles[sceneIndex], 140, 210);

      c.fillStyle = '#9e9e9e';
      c.font = '20px system-ui, sans-serif';
      c.fillText(sceneDescriptions[sceneIndex], 140, 260);

      // Continuous animated transition element showing video motion between scenes!
      // This makes it visible that it's a real continuous playing video
      const circleX = 140 + ((t / 16) * 1000);
      c.fillStyle = '#333333';
      c.fillRect(140, 360, 1000, 8);

      // Accent color used minimally only on the moving playhead
      c.fillStyle = '#007acc';
      c.fillRect(circleX - 8, 356, 16, 16);

      // Visual timeline stops
      for (let s = 0; s < 4; s++) {
        const stopX = 140 + ((s * 4) / 16) * 1000;
        c.fillStyle = s <= sceneIndex ? '#007acc' : '#555555';
        c.fillRect(stopX - 3, 352, 6, 24);

        c.fillStyle = '#777777';
        c.font = '12px monospace';
        c.textAlign = 'center';
        c.fillText(`${s * 4}s`, stopX, 395);
      }

      // Live animated motion box in center to show transition between scene 1 -> 2 -> 3 -> 4
      const boxOffset = (sceneProgress * 200);
      c.fillStyle = '#1e1e1e';
      c.fillRect(140, 440, 1000, 120);
      c.strokeStyle = '#333333';
      c.strokeRect(140, 440, 1000, 120);

      c.fillStyle = '#007acc';
      c.fillRect(160 + boxOffset, 480, 40, 40);

      c.fillStyle = '#aaaaaa';
      c.font = '14px system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillText(`Video Timecode: ${t.toFixed(2)}s — Status: ${sceneProgress > 0.85 ? 'Approaching Next Scene Boundary...' : 'Playing continuous animation'}`, 220 + boxOffset, 505);
    }
  });
}
