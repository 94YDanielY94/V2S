import type { KeyframeSlide } from '../types';

/**
 * Generates an interactive presentation video using HTML5 Canvas & MediaRecorder.
 * Duration: 16 seconds (4 slides, 4 seconds each).
 */
export async function generateDemoVideo(): Promise<{ videoUrl: string; slides: KeyframeSlide[] }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const slideData = [
      {
        timestamp: 0,
        title: '01: Introduction to Video-to-Slide',
        subtitle: 'Effortless Keyframe Extraction & Navigation',
        detail: 'Transform any video into structured, presentable slides with exact keyframe stops.',
        notes: 'Welcome everyone! In this presentation we showcase the power of keyframe stop points in video playback.',
      },
      {
        timestamp: 4,
        title: '02: How Keyframe Stops Work',
        subtitle: 'Precision Timeline Scrubbing',
        detail: 'Pause at any exact frame, register keyframe stops, and preview as seamless slides.',
        notes: 'Every keyframe records the exact timestamp and a high-resolution snapshot for instant PowerPoint-style browsing.',
      },
      {
        timestamp: 8,
        title: '03: Presentation Preview & Navigation',
        subtitle: 'Keyboard Arrow Navigation',
        detail: 'Use Left / Right arrow keys to jump between keyframes just like a PowerPoint deck.',
        notes: 'You can navigate with arrow keys, toggle speaker notes, or play video between keyframe stops.',
      },
      {
        timestamp: 12,
        title: '04: Summary & Export Options',
        subtitle: 'Ready for Desktop & Presentation',
        detail: 'Export your slides as images, save your project file, or present in full screen.',
        notes: 'Thank you for exploring this app! Easily add your own videos and images anytime.',
      }
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

      // Generate keyframe slides with snapshot images rendered from canvas
      const generatedSlides: KeyframeSlide[] = slideData.map((item, idx) => {
        drawFrame(ctx, item, 0, idx + 1);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        return {
          id: `demo-slide-${idx + 1}`,
          timestamp: item.timestamp,
          title: item.title,
          notes: item.notes,
          imageUrl,
          createdAt: Date.now() + idx,
        };
      });

      resolve({ videoUrl, slides: generatedSlides });
    };

    recorder.start();

    const totalSeconds = 16;
    const fps = 30;
    const totalFrames = totalSeconds * fps;
    let frameCount = 0;

    function drawFrame(
      c: CanvasRenderingContext2D,
      item: typeof slideData[0],
      progress: number,
      slideNumber: number
    ) {
      // Background: clean dark background #1e1e1e (no gradients!)
      c.fillStyle = '#1e1e1e';
      c.fillRect(0, 0, 1280, 720);

      // Top accent banner: single solid color #007acc
      c.fillStyle = '#007acc';
      c.fillRect(0, 0, 1280, 8);

      // VS Code style header area
      c.fillStyle = '#252526';
      c.fillRect(40, 40, 1200, 640);
      c.strokeStyle = '#333333';
      c.lineWidth = 1;
      c.strokeRect(40, 40, 1200, 640);

      // Slide number badge
      c.fillStyle = '#007acc';
      c.fillRect(80, 80, 120, 36);
      c.fillStyle = '#ffffff';
      c.font = 'bold 16px "Segoe UI", sans-serif';
      c.textAlign = 'center';
      c.fillText(`SLIDE ${slideNumber} / 4`, 140, 104);

      // Title
      c.fillStyle = '#ffffff';
      c.font = 'bold 36px "Segoe UI", sans-serif';
      c.textAlign = 'left';
      c.fillText(item.title, 80, 170);

      // Subtitle
      c.fillStyle = '#007acc';
      c.font = '600 22px "Segoe UI", sans-serif';
      c.fillText(item.subtitle, 80, 215);

      // Divider line
      c.fillStyle = '#333333';
      c.fillRect(80, 240, 1120, 2);

      // Content Box
      c.fillStyle = '#1e1e1e';
      c.fillRect(80, 270, 1120, 240);
      c.strokeStyle = '#383838';
      c.strokeRect(80, 270, 1120, 240);

      c.fillStyle = '#cccccc';
      c.font = '20px "Segoe UI", sans-serif';
      c.fillText(item.detail, 110, 330);

      // Bullet points
      const bullets = [
        `Keyframe timestamp: ${item.timestamp.toFixed(1)}s`,
        'Use Left / Right arrow keys to navigate slides',
        'Add, edit, or delete keyframes directly in the sidebar'
      ];
      bullets.forEach((bullet, bIdx) => {
        c.fillStyle = '#007acc';
        c.fillRect(110, 370 + bIdx * 34, 8, 8);
        c.fillStyle = '#a0a0a0';
        c.font = '16px "Segoe UI", sans-serif';
        c.fillText(bullet, 130, 380 + bIdx * 34);
      });

      // Animated progress indicator at bottom of slide
      const barWidth = 1120;
      c.fillStyle = '#2d2d2d';
      c.fillRect(80, 600, barWidth, 10);
      c.fillStyle = '#007acc';
      c.fillRect(80, 600, barWidth * progress, 10);

      // Timecode watermark
      c.fillStyle = '#888888';
      c.font = '14px monospace';
      c.textAlign = 'right';
      c.fillText(`Time: ${(slideNumber * 4 - 4 + progress * 4).toFixed(2)}s`, 1200, 640);
    }

    const interval = setInterval(() => {
      const currentSecond = frameCount / fps;
      const slideIndex = Math.min(3, Math.floor(currentSecond / 4));
      const currentItem = slideData[slideIndex];
      const slideProgress = (currentSecond % 4) / 4;

      drawFrame(ctx, currentItem, slideProgress, slideIndex + 1);

      frameCount++;
      if (frameCount >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 1000 / fps);
  });
}
