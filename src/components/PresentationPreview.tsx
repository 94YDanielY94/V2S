import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SceneStop } from '../types';
import { X, ChevronLeft, ChevronRight, Play, Pause, Maximize, Minimize } from 'lucide-react';
import { formatTime } from '../utils/time';

interface PresentationPreviewProps {
  videoUrl: string;
  scenes: SceneStop[];
  initialSceneIndex?: number;
  onClose: () => void;
}

export const PresentationPreview: React.FC<PresentationPreviewProps> = ({
  videoUrl,
  scenes,
  initialSceneIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialSceneIndex, scenes.length - 1))
  );
  const [isPlayingBetweenScenes, setIsPlayingBetweenScenes] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const currentScene = scenes[currentIndex];

  // Advance to next scene: plays the continuous video until reaching next scene stop timestamp!
  const advanceToNextScene = useCallback(() => {
    if (!videoRef.current || scenes.length === 0) return;

    if (isPlayingBetweenScenes && targetIndex !== null) {
      // If already playing, immediately skip to the target stop point
      videoRef.current.pause();
      videoRef.current.currentTime = scenes[targetIndex].timestamp;
      setCurrentIndex(targetIndex);
      setIsPlayingBetweenScenes(false);
      setTargetIndex(null);
      return;
    }

    if (currentIndex < scenes.length - 1) {
      const nextIdx = currentIndex + 1;
      setTargetIndex(nextIdx);
      setIsPlayingBetweenScenes(true);
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, isPlayingBetweenScenes, targetIndex, scenes]);

  // Return to previous scene: pauses and rewinds to previous stop point
  const returnToPreviousScene = useCallback(() => {
    if (!videoRef.current || scenes.length === 0) return;

    if (isPlayingBetweenScenes) {
      // Stop current transition and return to the starting scene
      videoRef.current.pause();
      videoRef.current.currentTime = scenes[currentIndex].timestamp;
      setIsPlayingBetweenScenes(false);
      setTargetIndex(null);
      return;
    }

    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      videoRef.current.pause();
      videoRef.current.currentTime = scenes[prevIdx].timestamp;
      setCurrentIndex(prevIdx);
      setIsPlayingBetweenScenes(false);
      setTargetIndex(null);
    }
  }, [currentIndex, isPlayingBetweenScenes, scenes]);

  // Monitor video playback with requestAnimationFrame for frame-accurate pausing at scene boundary
  useEffect(() => {
    const checkBoundary = () => {
      if (
        isPlayingBetweenScenes &&
        targetIndex !== null &&
        videoRef.current &&
        scenes[targetIndex]
      ) {
        const targetTime = scenes[targetIndex].timestamp;
        const currentVideoTime = videoRef.current.currentTime;

        // If we reached or passed the target scene's timestamp, pause automatically!
        if (currentVideoTime >= targetTime) {
          videoRef.current.pause();
          videoRef.current.currentTime = targetTime;
          setCurrentIndex(targetIndex);
          setIsPlayingBetweenScenes(false);
          setTargetIndex(null);
        }
      }

      animationFrameRef.current = requestAnimationFrame(checkBoundary);
    };

    animationFrameRef.current = requestAnimationFrame(checkBoundary);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlayingBetweenScenes, targetIndex, scenes]);

  // Initialize presentation at initialScene timestamp paused
  useEffect(() => {
    if (videoRef.current && scenes[currentIndex]) {
      videoRef.current.currentTime = scenes[currentIndex].timestamp;
      videoRef.current.pause();
    }
  }, []);

  // Keyboard navigation: ArrowRight / Space -> next scene; ArrowLeft -> previous scene; Esc -> exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
        case 'PageDown':
          e.preventDefault();
          advanceToNextScene();
          break;

        case 'ArrowLeft':
        case 'Backspace':
        case 'PageUp':
          e.preventDefault();
          returnToPreviousScene();
          break;

        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceToNextScene, returnToPreviousScene, onClose]);

  // Auto-hide controls overlay after inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2400);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      className="presentation-view"
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Fullscreen continuous video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="presentation-video"
        playsInline
      />

      {/* Floating Header Overlay */}
      <div className={`presentation-header ${showControls ? 'visible' : ''}`}>
        <div className="header-scene-info">
          <span className="scene-counter">
            Scene {currentIndex + 1} / {scenes.length}
          </span>
          <span className="scene-name-display">{currentScene?.name}</span>
          <span className="scene-time-display">
            ({formatTime(currentScene?.timestamp ?? 0, false)})
          </span>
          {isPlayingBetweenScenes && targetIndex !== null && (
            <span className="transition-badge">
              Playing to Scene {targetIndex + 1}...
            </span>
          )}
        </div>

        <div className="header-actions">
          <button
            className="btn-overlay-icon"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
          <button
            className="btn-overlay-close"
            onClick={onClose}
            title="Exit Presentation (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Subtle Navigation Arrows */}
      <button
        className={`presentation-nav-btn nav-prev ${showControls ? 'visible' : ''}`}
        onClick={returnToPreviousScene}
        disabled={currentIndex === 0 && !isPlayingBetweenScenes}
        title="Previous Scene (← Left Arrow)"
      >
        <ChevronLeft size={32} />
      </button>

      <button
        className={`presentation-nav-btn nav-next ${showControls ? 'visible' : ''}`}
        onClick={advanceToNextScene}
        disabled={currentIndex === scenes.length - 1 && !isPlayingBetweenScenes}
        title="Next Scene (→ Right Arrow or Space)"
      >
        <ChevronRight size={32} />
      </button>

      {/* Bottom Timeline and Progress Bar */}
      <div className={`presentation-footer ${showControls ? 'visible' : ''}`}>
        <div className="scene-progress-bar">
          <div
            className="scene-progress-fill"
            style={{
              width: `${((currentIndex + 1) / scenes.length) * 100}%`,
            }}
          />
        </div>

        <div className="footer-controls">
          <button
            className="btn-footer-step"
            onClick={returnToPreviousScene}
            disabled={currentIndex === 0 && !isPlayingBetweenScenes}
          >
            <ChevronLeft size={14} />
            <span>Prev Scene</span>
          </button>

          <div className="footer-status">
            {isPlayingBetweenScenes ? (
              <span className="status-playing">
                <Play size={12} /> Playing animation to next scene
              </span>
            ) : (
              <span className="status-paused">
                <Pause size={12} /> Paused at Scene {currentIndex + 1} &bull; Press &rarr; or Space to continue
              </span>
            )}
          </div>

          <button
            className="btn-footer-step"
            onClick={advanceToNextScene}
            disabled={currentIndex === scenes.length - 1 && !isPlayingBetweenScenes}
          >
            <span>Next Scene</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
