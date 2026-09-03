import { useState, useRef, useEffect, useCallback } from 'react';
import { DockBar } from './components/DockBar';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { VideoPlayer } from './components/VideoPlayer';
import { PresentationPreview } from './components/PresentationPreview';
import type { SceneStop } from './types';
import { generateContinuousDemoVideo } from './utils/demo';

export function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneStop[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'scenes'>('editor');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('vts-theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('vts-theme', next);
      return next;
    });
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Play / Pause toggle in editor
  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Seek video
  const handleSeek = useCallback((time: number) => {
    if (!videoRef.current) {
      setCurrentTime(time);
      return;
    }
    const clamped = Math.max(0, Math.min(time, videoRef.current.duration || duration || time));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  // Open video file
  const handleOpenVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setCurrentTime(0);
    setIsPlaying(false);

    // Default Scene 1 at 0s
    const firstScene: SceneStop = {
      id: `scene-${Date.now()}`,
      name: 'Scene 1: Opening',
      timestamp: 0,
    };
    setScenes([firstScene]);
    setSelectedSceneId(firstScene.id);
  };

  // Load continuous demo video
  const handleLoadDemo = async () => {
    try {
      const { videoUrl: demoUrl, scenes: demoScenes } = await generateContinuousDemoVideo();
      setVideoUrl(demoUrl);
      setFileName('demo-continuous-presentation.webm');
      setScenes(demoScenes);
      setSelectedSceneId(demoScenes[0]?.id || null);
      setCurrentTime(0);
      setDuration(16);
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to load demo video:', err);
    }
  };

  // Add scene stop point at current video time
  const handleAddStop = useCallback(() => {
    const time = videoRef.current ? videoRef.current.currentTime : currentTime;

    const newScene: SceneStop = {
      id: `scene-${Date.now()}`,
      name: `Scene ${scenes.length + 1}`,
      timestamp: parseFloat(time.toFixed(2)),
    };

    setScenes((prev) => {
      const updated = [...prev, newScene];
      return updated.sort((a, b) => a.timestamp - b.timestamp);
    });

    setSelectedSceneId(newScene.id);
  }, [currentTime, scenes.length]);

  // Delete scene stop
  const handleDeleteScene = (id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id));
    if (selectedSceneId === id) {
      setSelectedSceneId(null);
    }
  };

  // Update scene name or timestamp
  const handleUpdateScene = (id: string, updates: Partial<SceneStop>) => {
    setScenes((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      return updated.sort((a, b) => a.timestamp - b.timestamp);
    });
  };

  // Global shortcuts in editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        if (scenes.length > 0 && videoUrl) {
          setIsPresentationOpen((prev) => !prev);
        }
        return;
      }

      if (isPresentationOpen) return;

      if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      if (e.key === 'k' || e.key === 'K' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleAddStop();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationOpen, scenes.length, videoUrl, handleTogglePlay, handleAddStop]);

  return (
    <div className={`app-shell ${theme}`} data-theme={theme}>
      {/* Left Slim Vertical Dock (inspired by Image 1 & 2) */}
      <DockBar
        activeView={activeView}
        setActiveView={setActiveView}
        onLoadDemo={handleLoadDemo}
        onStartPresentation={() => {
          if (scenes.length > 0 && videoUrl) setIsPresentationOpen(true);
        }}
        hasVideo={Boolean(videoUrl)}
        scenesCount={scenes.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main App Content Viewport */}
      <div className="app-main-viewport">
        {/* Modern TopBar with segmented tabs */}
        <TitleBar
          fileName={fileName}
          scenesCount={scenes.length}
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenVideoFile={handleOpenVideoFile}
          onLoadDemo={handleLoadDemo}
          onAddStop={handleAddStop}
          onStartPresentation={() => setIsPresentationOpen(true)}
          hasVideo={Boolean(videoUrl)}
        />

        {/* Floating Cards Grid (inspired by Image 1, 2, & 3) */}
        <div className="app-cards-container">
          {/* Main Video & Scrubber Card */}
          <div className="card-column-main">
            <VideoPlayer
              videoUrl={videoUrl}
              videoRef={videoRef}
              scenes={scenes}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onTimeUpdate={(time) => setCurrentTime(time)}
              onDurationChange={(dur) => setDuration(dur)}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onAddStop={handleAddStop}
              onOpenVideoFile={handleOpenVideoFile}
              onLoadDemo={handleLoadDemo}
            />
          </div>

          {/* Right Column: Scenes Card */}
          <div className="card-column-side">
            <Sidebar
              scenes={scenes}
              selectedSceneId={selectedSceneId}
              currentTime={currentTime}
              duration={duration}
              onSelectScene={(scene) => setSelectedSceneId(scene.id)}
              onAddStop={handleAddStop}
              onDeleteScene={handleDeleteScene}
              onUpdateScene={handleUpdateScene}
              onSeek={handleSeek}
              hasVideo={Boolean(videoUrl)}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Video Presentation Mode (Auto-pauses at scene stops, Arrow Keys to advance) */}
      {isPresentationOpen && videoUrl && scenes.length > 0 && (
        <PresentationPreview
          videoUrl={videoUrl}
          scenes={scenes}
          initialSceneIndex={
            selectedSceneId
              ? Math.max(0, scenes.findIndex((s) => s.id === selectedSceneId))
              : 0
          }
          onClose={() => setIsPresentationOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
