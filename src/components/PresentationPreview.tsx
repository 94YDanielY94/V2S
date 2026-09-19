import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SceneStop, VideoClip, AppSettings } from '../types';
import { X, ChevronLeft, ChevronRight, Maximize, Minimize, RotateCcw, CheckCircle2 } from 'lucide-react';
import { formatTime } from '../utils/time';
import { getClipForGlobalTime } from '../utils/stitch';

interface PresentationPreviewProps {
  videoUrl: string;
  clips?: VideoClip[];
  scenes: SceneStop[];
  totalDuration: number;
  initialSceneIndex?: number;
  settings?: AppSettings;
  onClose: () => void;
}

export const PresentationPreview: React.FC<PresentationPreviewProps> = ({
  videoUrl,
  clips = [],
  scenes,
  totalDuration,
  initialSceneIndex = 0,
  settings,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialSceneIndex, scenes.length - 1))
  );
  const [isPlayingBetweenScenes, setIsPlayingBetweenScenes] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [isTargetEnd, setIsTargetEnd] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Active clip state for stitched multi-clip playback
  const [activeClipIndex, setActiveClipIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  const currentScene = scenes[currentIndex];

  // Helper to sync video element to global timeline time
  const syncToGlobalTime = useCallback(
    (globalTime: number, shouldPlay: boolean = false) => {
      if (!videoRef.current) return;

      if (clips.length > 0) {
        const { clipIndex, clip, localTime } = getClipForGlobalTime(clips, globalTime);
        if (clip) {
          if (clipIndex !== activeClipIndex || videoRef.current.src !== clip.url) {
            setActiveClipIndex(clipIndex);
            videoRef.current.src = clip.url;
            videoRef.current.onloadeddata = () => {
              if (videoRef.current) {
                videoRef.current.currentTime = localTime;
                if (shouldPlay) {
                  videoRef.current.play().catch(() => {});
                } else {
                  videoRef.current.pause();
                }
              }
            };
            return;
          }
          if (Math.abs(videoRef.current.currentTime - localTime) > 0.04) {
            videoRef.current.currentTime = localTime;
          }
          if (shouldPlay) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
      } else {
        if (Math.abs(videoRef.current.currentTime - globalTime) > 0.04) {
          videoRef.current.currentTime = globalTime;
        }
        if (shouldPlay) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      }
    },
    [clips, activeClipIndex]
  );

  // Sync playback speed from settings
  useEffect(() => {
    if (videoRef.current && settings?.presentationSpeed) {
      videoRef.current.playbackRate = settings.presentationSpeed;
    }
  }, [settings?.presentationSpeed, activeClipIndex]);

  // Right Arrow / Forward:
  // 1 click: plays smoothly to next scene (or instant if configured)
  // 2+ clicks while transitioning: jumps forward directly to that specific keyframe without animating
  const handleForward = useCallback(() => {
    if (!videoRef.current || scenes.length === 0) return;

    if (isAtEnd) {
      // Replay from beginning
      setIsAtEnd(false);
      setIsTargetEnd(false);
      setCurrentIndex(0);
      syncToGlobalTime(scenes[0]?.timestamp ?? 0, false);
      return;
    }

    // Instant transition mode
    if (settings?.presentationTransition === 'instant') {
      if (currentIndex < scenes.length - 1) {
        const nextIdx = currentIndex + 1;
        videoRef.current.pause();
        syncToGlobalTime(scenes[nextIdx].timestamp, false);
        setCurrentIndex(nextIdx);
      } else if (currentIndex === scenes.length - 1) {
        if (settings.presentationLoop) {
          syncToGlobalTime(scenes[0]?.timestamp ?? 0, false);
          setCurrentIndex(0);
        } else {
          syncToGlobalTime(totalDuration, false);
          setIsAtEnd(true);
        }
      }
      return;
    }

    if (isPlayingBetweenScenes) {
      // Multiple clicks detected! Skip animation and jump to next target immediately
      const currentDest = isTargetEnd ? scenes.length : (targetIndex ?? currentIndex + 1);
      const nextDest = currentDest + 1;

      if (nextDest >= scenes.length) {
        // Exceeded last scene -> snap to end of video without animating
        videoRef.current.pause();
        syncToGlobalTime(totalDuration, false);
        setIsAtEnd(true);
        setIsPlayingBetweenScenes(false);
        setIsTargetEnd(false);
        setTargetIndex(null);
      } else {
        // Jump directly to that specific keyframe without animating
        videoRef.current.pause();
        const targetTime = scenes[nextDest].timestamp;
        syncToGlobalTime(targetTime, false);
        setCurrentIndex(nextDest);
        setIsPlayingBetweenScenes(false);
        setIsTargetEnd(false);
        setTargetIndex(null);
      }
      return;
    }

    // Normal forward playback
    if (currentIndex < scenes.length - 1) {
      const nextIdx = currentIndex + 1;
      setTargetIndex(nextIdx);
      setIsTargetEnd(false);
      setIsPlayingBetweenScenes(true);

      if (clips.length > 0) {
        syncToGlobalTime(scenes[currentIndex].timestamp, true);
      } else {
        videoRef.current.play().catch(() => {});
      }
    } else if (currentIndex === scenes.length - 1) {
      // Last scene stop -> play to end of video
      setIsTargetEnd(true);
      setTargetIndex(null);
      setIsPlayingBetweenScenes(true);

      if (clips.length > 0) {
        syncToGlobalTime(scenes[currentIndex].timestamp, true);
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [
    isAtEnd,
    isPlayingBetweenScenes,
    isTargetEnd,
    targetIndex,
    currentIndex,
    scenes,
    totalDuration,
    clips.length,
    syncToGlobalTime,
    settings,
  ]);

  // Space key:
  // 1 click: advances smoothly to next stop
  // 2 clicks (double-space): immediately finishes/snaps to that next stop without waiting for animation
  const handleSpace = useCallback(() => {
    if (!videoRef.current || scenes.length === 0) return;

    if (isAtEnd) {
      // Restart from first scene
      setIsAtEnd(false);
      setIsTargetEnd(false);
      setCurrentIndex(0);
      syncToGlobalTime(scenes[0]?.timestamp ?? 0, false);
      return;
    }

    // Instant transition mode
    if (settings?.presentationTransition === 'instant') {
      if (currentIndex < scenes.length - 1) {
        const nextIdx = currentIndex + 1;
        videoRef.current.pause();
        syncToGlobalTime(scenes[nextIdx].timestamp, false);
        setCurrentIndex(nextIdx);
      } else if (currentIndex === scenes.length - 1) {
        if (settings.presentationLoop) {
          syncToGlobalTime(scenes[0]?.timestamp ?? 0, false);
          setCurrentIndex(0);
        } else {
          syncToGlobalTime(totalDuration, false);
          setIsAtEnd(true);
        }
      }
      return;
    }

    if (isPlayingBetweenScenes) {
      // Double space detected! Instantly complete transition to target
      videoRef.current.pause();
      if (isTargetEnd) {
        syncToGlobalTime(totalDuration, false);
        setIsAtEnd(true);
        setIsPlayingBetweenScenes(false);
        setIsTargetEnd(false);
      } else if (targetIndex !== null && scenes[targetIndex]) {
        const targetTime = scenes[targetIndex].timestamp;
        syncToGlobalTime(targetTime, false);
        setCurrentIndex(targetIndex);
        setIsPlayingBetweenScenes(false);
        setTargetIndex(null);
      }
      return;
    }

    // Single space: start smooth playback to next stop
    if (currentIndex < scenes.length - 1) {
      const nextIdx = currentIndex + 1;
      setTargetIndex(nextIdx);
      setIsTargetEnd(false);
      setIsPlayingBetweenScenes(true);

      if (clips.length > 0) {
        syncToGlobalTime(scenes[currentIndex].timestamp, true);
      } else {
        videoRef.current.play().catch(() => {});
      }
    } else if (currentIndex === scenes.length - 1) {
      setIsTargetEnd(true);
      setTargetIndex(null);
      setIsPlayingBetweenScenes(true);

      if (clips.length > 0) {
        syncToGlobalTime(scenes[currentIndex].timestamp, true);
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [
    isAtEnd,
    isPlayingBetweenScenes,
    isTargetEnd,
    targetIndex,
    currentIndex,
    scenes,
    totalDuration,
    clips.length,
    syncToGlobalTime,
    settings,
  ]);

  // Left Arrow / Backward:
  // Steps backward without animating
  const handleBackward = useCallback(() => {
    if (!videoRef.current || scenes.length === 0) return;

    if (isPlayingBetweenScenes) {
      // Cancel playback and snap directly back to current scene stop without animating
      videoRef.current.pause();
      syncToGlobalTime(scenes[currentIndex].timestamp, false);
      setIsPlayingBetweenScenes(false);
      setTargetIndex(null);
      setIsTargetEnd(false);
      return;
    }

    if (isAtEnd) {
      setIsAtEnd(false);
      setIsTargetEnd(false);
      setIsPlayingBetweenScenes(false);
      const lastIdx = scenes.length - 1;
      setCurrentIndex(lastIdx);
      syncToGlobalTime(scenes[lastIdx].timestamp, false);
      return;
    }

    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      syncToGlobalTime(scenes[prevIdx].timestamp, false);
      setCurrentIndex(prevIdx);
      setIsPlayingBetweenScenes(false);
      setTargetIndex(null);
      setIsTargetEnd(false);
    }
  }, [currentIndex, isPlayingBetweenScenes, isAtEnd, scenes, syncToGlobalTime]);

  // Monitor video playback with requestAnimationFrame for frame-accurate pausing
  useEffect(() => {
    const checkBoundary = () => {
      if (isPlayingBetweenScenes && videoRef.current) {
        // Calculate global current time
        let currentGlobalTime = videoRef.current.currentTime;
        if (clips.length > 0) {
          let accumulated = 0;
          for (let i = 0; i < activeClipIndex; i++) {
            accumulated += clips[i].duration || 0;
          }
          currentGlobalTime = accumulated + videoRef.current.currentTime;

          // Check if current clip ended while playing to target in next clip
          const currentClipDuration = clips[activeClipIndex]?.duration || 0;
          if (
            videoRef.current.currentTime >= currentClipDuration - 0.05 &&
            activeClipIndex < clips.length - 1
          ) {
            const nextClipIdx = activeClipIndex + 1;
            setActiveClipIndex(nextClipIdx);
            videoRef.current.src = clips[nextClipIdx].url;
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
            animationFrameRef.current = requestAnimationFrame(checkBoundary);
            return;
          }
        }

        if (isTargetEnd) {
          // Reached or approaching end of the full video timeline
          const endLimit = totalDuration > 0 ? totalDuration - 0.08 : 999999;
          if (currentGlobalTime >= endLimit || videoRef.current.ended) {
            videoRef.current.pause();
            setIsPlayingBetweenScenes(false);
            setIsTargetEnd(false);
            setIsAtEnd(true);
          }
        } else if (targetIndex !== null && scenes[targetIndex]) {
          const targetTime = scenes[targetIndex].timestamp;
          const playbackRate = videoRef.current.playbackRate || 1;
          // Compensate for media thread halt latency (~15-20ms) so the video pauses
          // directly on the target slide frame without overshooting into the next frame
          const leadTime = Math.max(0.015, 0.02 * playbackRate);

          if (currentGlobalTime >= targetTime - leadTime) {
            videoRef.current.pause();
            setCurrentIndex(targetIndex);
            setIsPlayingBetweenScenes(false);
            setTargetIndex(null);

            // Avoid micro-seeks within the same frame (< 50ms) that cause the jarring rewind jerk
            if (Math.abs(currentGlobalTime - targetTime) > 0.05) {
              syncToGlobalTime(targetTime, false);
            }
          }
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
  }, [
    isPlayingBetweenScenes,
    isTargetEnd,
    targetIndex,
    scenes,
    clips,
    activeClipIndex,
    totalDuration,
    syncToGlobalTime,
  ]);

  // Initialize presentation at initialScene timestamp paused (only on mount)
  useEffect(() => {
    if (!isInitializedRef.current && scenes[initialSceneIndex]) {
      isInitializedRef.current = true;
      syncToGlobalTime(scenes[initialSceneIndex].timestamp, false);
    }
  }, [initialSceneIndex, scenes, syncToGlobalTime]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const handleClosePresentation = useCallback(() => {
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleSpace();
          break;

        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          handleForward();
          break;

        case 'ArrowLeft':
        case 'Backspace':
        case 'PageUp':
          e.preventDefault();
          handleBackward();
          break;

        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            handleClosePresentation();
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
  }, [handleSpace, handleForward, handleBackward, handleClosePresentation, toggleFullscreen]);

  // Auto-hide controls overlay after inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    const delay = settings?.presentationAutoHideDelay ?? 2400;
    if (delay > 0) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, delay);
    }
  };

  // Progress strictly reaches 100% when video is complete
  const progressPercent = isAtEnd
    ? 100
    : scenes.length > 0
    ? Math.max(0, Math.min(96, (currentIndex / scenes.length) * 100))
    : 0;

  const initialVideoSrc = clips.length > 0 ? clips[0]?.url : videoUrl;

  return (
    <div
      className="presentation-view"
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Fullscreen continuous video */}
      <video
        ref={videoRef}
        src={initialVideoSrc}
        className="presentation-video"
        style={{ objectFit: settings?.videoFit || 'contain' }}
        playsInline
      />

      {/* Floating Header Overlay */}
      <div className={`presentation-header ${showControls ? 'visible' : ''}`}>
        {(!settings || settings.presentationShowProgress) && (
          <div className="header-scene-info">
          {isAtEnd ? (
            <>
              <span className="scene-counter completed">Completed</span>
              <span className="scene-name-display">End of Presentation</span>
              <span className="scene-time-display">
                ({formatTime(totalDuration, false)})
              </span>
            </>
          ) : (
            <>
              <span className="scene-counter">
                Scene {currentIndex + 1} / {scenes.length}
              </span>
              <span className="scene-name-display">{currentScene?.name}</span>
              <span className="scene-time-display">
                ({formatTime(currentScene?.timestamp ?? 0, false)})
              </span>
            </>
          )}

          {isTargetEnd ? (
            <span className="transition-badge end-transition">
              Playing to End of Video...
            </span>
          ) : (
            isPlayingBetweenScenes && targetIndex !== null && (
              <span className="transition-badge">
                Playing to Scene {targetIndex + 1}...
              </span>
            )
          )}
        </div>
        )}

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
            onClick={handleClosePresentation}
            title="Exit Presentation (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Middle-Left: Previous Scene button (the only prev button) */}
      <button
        className={`presentation-nav-btn nav-prev ${showControls ? 'visible' : ''}`}
        onClick={handleBackward}
        disabled={currentIndex === 0 && !isPlayingBetweenScenes && !isAtEnd}
        title="Previous Scene (← Left Arrow)"
      >
        <ChevronLeft size={32} />
      </button>

      {/* Middle-Right: Next Scene button (the only next button) */}
      <button
        className={`presentation-nav-btn nav-next ${showControls ? 'visible' : ''}`}
        onClick={handleForward}
        title={
          isAtEnd
            ? 'Replay from Start (→ Right Arrow or Space)'
            : currentIndex === scenes.length - 1
            ? 'Play to End of Video (→ Right Arrow or Space)'
            : 'Next Scene (→ Right Arrow or Space)'
        }
      >
        {isAtEnd ? <RotateCcw size={26} /> : <ChevronRight size={32} />}
      </button>

      {/* Clean Bottom Timeline & Progress Bar (No duplicate buttons) */}
      {(!settings || settings.presentationShowProgress) && (
        <div className={`presentation-footer ${showControls ? 'visible' : ''}`}>
          <div className="scene-progress-bar">
            <div
              className="scene-progress-fill"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>

          <div className="footer-status-bar">
            {isAtEnd ? (
              <span className="status-completed">
                <CheckCircle2 size={13} /> Presentation Complete &bull; Press &rarr; to Replay or Esc to exit
              </span>
            ) : isTargetEnd ? (
              <span className="status-playing">
                Playing to end of video...
              </span>
            ) : isPlayingBetweenScenes && targetIndex !== null ? (
              <span className="status-playing">
                Playing to Scene {targetIndex + 1}...
              </span>
            ) : (
              <span className="status-paused">
                Scene {currentIndex + 1} of {scenes.length} &bull; Press Space or &rarr; to advance
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

