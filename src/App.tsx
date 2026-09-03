import { useState, useRef, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { VideoPlayer } from './components/VideoPlayer';
import { PresentationPreview } from './components/PresentationPreview';
import { StatusBar } from './components/StatusBar';
import type { KeyframeSlide, ProjectData } from './types';
import { captureVideoFrame, captureFromImageFile } from './utils/capture';
import { generateDemoVideo } from './utils/demo';

export function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [slides, setSlides] = useState<KeyframeSlide[]>([]);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Play / Pause toggle
  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Seek video to specific timestamp
  const handleSeek = useCallback((time: number) => {
    if (!videoRef.current) {
      setCurrentTime(time);
      return;
    }
    const clamped = Math.max(0, Math.min(time, videoRef.current.duration || duration || time));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  // Open local video file
  const handleOpenVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setCurrentTime(0);
    setIsPlaying(false);

    // If no slides exist yet, add the first slide at 00:00 once video is loaded
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }, 200);
  };

  // Open standalone image file as a slide
  const handleOpenImageFile = async (file: File) => {
    try {
      const dataUrl = await captureFromImageFile(file);
      const newSlide: KeyframeSlide = {
        id: `slide-${Date.now()}`,
        timestamp: currentTime,
        title: file.name.replace(/\.[^/.]+$/, ''),
        notes: '',
        imageUrl: dataUrl,
        createdAt: Date.now(),
      };
      setSlides((prev) => [...prev, newSlide]);
      setSelectedSlideId(newSlide.id);
    } catch (err) {
      console.error('Failed to load image slide:', err);
    }
  };

  // Load interactive demo video & keyframe slides
  const handleLoadDemo = async () => {
    try {
      const { videoUrl: demoUrl, slides: demoSlides } = await generateDemoVideo();
      setVideoUrl(demoUrl);
      setFileName('demo-presentation.webm');
      setSlides(demoSlides);
      setSelectedSlideId(demoSlides[0]?.id || null);
      setCurrentTime(0);
      setDuration(16);
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to load demo video:', err);
    }
  };

  // Add keyframe stop point at current position
  const handleAddKeyframe = useCallback(() => {
    const timestamp = videoRef.current ? videoRef.current.currentTime : currentTime;
    const imageUrl = videoRef.current ? captureVideoFrame(videoRef.current) : '';

    const newSlide: KeyframeSlide = {
      id: `slide-${Date.now()}`,
      timestamp,
      title: `Slide ${slides.length + 1}`,
      notes: '',
      imageUrl,
      createdAt: Date.now(),
    };

    // Insert sorted by timestamp
    setSlides((prev) => {
      const updated = [...prev, newSlide];
      return updated.sort((a, b) => a.timestamp - b.timestamp);
    });

    setSelectedSlideId(newSlide.id);
  }, [currentTime, slides.length]);

  // Retake snapshot of a slide using current frame
  const handleRetakeSnapshot = (id: string) => {
    if (!videoRef.current) return;
    const imageUrl = captureVideoFrame(videoRef.current);
    if (!imageUrl) return;

    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, imageUrl } : s))
    );
  };

  // Delete slide
  const handleDeleteSlide = (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
    if (selectedSlideId === id) {
      setSelectedSlideId(null);
    }
  };

  // Move slide up or down
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    setSlides((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Update slide property
  const handleUpdateSlide = (id: string, updates: Partial<KeyframeSlide>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Clear all slides
  const handleClearAllSlides = () => {
    if (window.confirm('Are you sure you want to clear all keyframe slides?')) {
      setSlides([]);
      setSelectedSlideId(null);
    }
  };

  // Export project to JSON
  const handleExportProject = () => {
    const project: ProjectData = {
      title: fileName || 'Untitled Presentation',
      videoName: fileName || undefined,
      videoDuration: duration,
      slides,
      version: '1.0.0',
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fileName || 'presentation').replace(/\.[^/.]+$/, '')}-slides.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import project from JSON
  const handleImportProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ProjectData;
        if (data.slides && Array.isArray(data.slides)) {
          setSlides(data.slides);
          if (data.slides.length > 0) {
            setSelectedSlideId(data.slides[0].id);
          }
        }
      } catch (err) {
        alert('Invalid project file format: ' + err);
      }
    };
    reader.readAsText(file);
  };

  // Export slides as individual images
  const handleExportSlidesImages = () => {
    slides.forEach((slide, idx) => {
      if (slide.imageUrl) {
        const a = document.createElement('a');
        a.href = slide.imageUrl;
        a.download = `slide_${String(idx + 1).padStart(2, '0')}_${slide.title.replace(/[^a-z0-9_-]/gi, '_')}.jpg`;
        a.click();
      }
    });
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // F5 -> Open / Close PowerPoint preview
      if (e.key === 'F5') {
        e.preventDefault();
        if (slides.length > 0) {
          setIsPreviewOpen((prev) => !prev);
        }
        return;
      }

      // When preview is open, preview handles navigation
      if (isPreviewOpen) return;

      // Space -> Toggle Play / Pause
      if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      // K -> Add Keyframe Stop Point
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleAddKeyframe();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen, slides.length, handleTogglePlay, handleAddKeyframe]);

  return (
    <div className="app-container">
      {/* Top VS Code style TitleBar */}
      <TitleBar
        fileName={fileName}
        slidesCount={slides.length}
        onOpenVideoFile={handleOpenVideoFile}
        onOpenImageFile={handleOpenImageFile}
        onLoadDemo={handleLoadDemo}
        onAddKeyframe={handleAddKeyframe}
        onOpenPreview={() => setIsPreviewOpen(true)}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        onExportSlidesImages={handleExportSlidesImages}
        hasVideo={Boolean(videoUrl)}
      />

      {/* Main Workspace Body */}
      <div className="app-workspace">
        {/* Left Explorer Sidebar */}
        <Sidebar
          slides={slides}
          selectedSlideId={selectedSlideId}
          currentTime={currentTime}
          onSelectSlide={(slide) => {
            setSelectedSlideId(slide.id);
            handleSeek(slide.timestamp);
          }}
          onAddKeyframe={handleAddKeyframe}
          onDeleteSlide={handleDeleteSlide}
          onMoveSlide={handleMoveSlide}
          onUpdateSlide={handleUpdateSlide}
          onRetakeSnapshot={handleRetakeSnapshot}
          onSeekToTimestamp={handleSeek}
          onClearAllSlides={handleClearAllSlides}
          hasVideo={Boolean(videoUrl)}
        />

        {/* Central Video Editor Area */}
        <main className="app-editor-main">
          <VideoPlayer
            videoUrl={videoUrl}
            videoRef={videoRef}
            slides={slides}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onTimeUpdate={(time) => setCurrentTime(time)}
            onDurationChange={(dur) => setDuration(dur)}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onAddKeyframe={handleAddKeyframe}
            onOpenVideoFile={handleOpenVideoFile}
            onLoadDemo={handleLoadDemo}
            onSelectSlide={(slide) => {
              setSelectedSlideId(slide.id);
              handleSeek(slide.timestamp);
            }}
          />
        </main>
      </div>

      {/* PowerPoint Fullscreen / Presentation Preview */}
      {isPreviewOpen && slides.length > 0 && (
        <PresentationPreview
          slides={slides}
          videoUrl={videoUrl}
          initialSlideIndex={
            selectedSlideId
              ? Math.max(
                  0,
                  slides.findIndex((s) => s.id === selectedSlideId)
                )
              : 0
          }
          onClose={() => setIsPreviewOpen(false)}
          onSeekVideo={handleSeek}
        />
      )}

      {/* VS Code Bottom Status Bar */}
      <StatusBar
        slidesCount={slides.length}
        currentTime={currentTime}
        duration={duration}
        fileName={fileName}
        onOpenPreview={() => {
          if (slides.length > 0) setIsPreviewOpen(true);
        }}
      />
    </div>
  );
}

export default App;
