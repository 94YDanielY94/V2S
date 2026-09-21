import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SceneStop, VideoClip, AppSettings } from '../types';
import { X, ChevronLeft, ChevronRight, Maximize, Minimize, RotateCcw, CheckCircle2, RotateCw } from 'lucide-react';
import { formatTime } from '../utils/time';
import { getClipForGlobalTime } from '../utils/stitch';

interface PresentationPreviewProps {
  videoUrl: string;
  clips?: VideoClip[];
  scenes: SceneStop[];
  totalDuration: number;
  initialSceneIndex?: number;
  settings?: AppSettings;
  onUpdateScene?: (id: string, updates: Partial<SceneStop>) => void;
  onClose: () => void;
}

export const PresentationPreview: React.FC<PresentationPreviewProps> = ({
  videoUrl,
  clips = [],
  scenes,
  totalDuration,
  initialSceneIndex = 0,
  settings,
  onUpdateScene,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialSceneIndex, scenes.length - 1))
  );
  const [isPlayingBetweenScenes, setIsPlayingBetweenScenes] = useState(false);
  const [isLoopingScene, setIsLoopingScene] = useState(false);
  const [isLoopExitPending, setIsLoopExitPending] = useState(false);
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
  const lastLoopSeekTimeRef = useRef<number>(0);
  const isLoopingSceneRef = useRef(false);
  const isLoopExitPendingRef = useRef(false);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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

  // Toggle looping for current scene
  const toggleCurrentSceneLoop = useCallback(() => {
    if (!currentScene) return;
    const newLoop = !isLoopingScene;
    isLoopingSceneRef.current = newLoop;
    setIsLoopingScene(newLoop);
    if (isLoopExitPendingRef.current) {
      isLoopExitPendingRef.current = false;
      setIsLoopExitPending(false);
    }
    if (newLoop) {
      syncToGlobalTime(currentScene.timestamp, true);
    } else {
      videoRef.current?.pause();
      syncToGlobalTime(currentScene.timestamp, false);
    }
    if (onUpdateScene) {
      onUpdateScene(currentScene.id, { isLooping: newLoop });
    }
  }, [currentScene, isLoopingScene, syncToGlobalTime, onUpdateScene]);

  // Core Forward / Advance handler:
  // - If at end: replays from beginning.
  // - If loop exit already pending (second click while finishing loop): skips remainder and advances to next slide immediately.
  // - If currently looping: finishes current loop cycle, then auto-flows into the next scene like a normal slide!
  // - If currently paused on a loop slide: clicks Next to START the loop!
  // - If playing between scenes (fast-forward click): snaps immediately to target scene and pauses.
  // - If normal slide (paused): plays through normal slide and pauses at the end of the scene (next stop).
  const handleAdvance = useCallback(() => {
    if (!videoRef.current || scenes.length === 0) return;

    // 1. Replay from beginning if at presentation end
    if (isAtEnd) {
      setIsAtEnd(false);
      setIsTargetEnd(false);
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      isLoopingSceneRef.current = false;
      setIsLoopingScene(false);
      isLoopExitPendingRef.current = false;
      setIsLoopExitPending(false);
      setIsPlayingBetweenScenes(false);
      setTargetIndex(null);
      videoRef.current.pause();
      syncToGlobalTime(scenes[0]?.timestamp ?? 0, false);
      return;
    }

    // 2. Second click while already finishing loop -> skip remainder and proceed immediately
    if (isLoopExitPendingRef.current) {
      isLoopExitPendingRef.current = false;
      setIsLoopExitPending(false);
      isLoopingSceneRef.current = false;
      setIsLoopingScene(false);

      if (currentIndex < scenes.length - 1) {
        const nextIdx = currentIndex + 1;
        const nextScene = scenes[nextIdx];
        currentIndexRef.current = nextIdx;
        setCurrentIndex(nextIdx);

        if (nextScene?.isLooping) {
          // Next scene is also a loop slide: pause at its start (waiting for presenter to start its loop)
          setIsPlayingBetweenScenes(false);
          setTargetIndex(null);
          videoRef.current.pause();
          syncToGlobalTime(nextScene.timestamp, false);
        } else {
          // Next scene is normal: auto-play it like a normal slide and stop at its end
          if (nextIdx < scenes.length - 1) {
            setTargetIndex(nextIdx + 1);
            setIsTargetEnd(false);
          } else {
            setIsTargetEnd(true);
            setTargetIndex(null);
          }
          setIsPlayingBetweenScenes(true);
          syncToGlobalTime(nextScene.timestamp, true);
        }
      } else {
        videoRef.current.pause();
        syncToGlobalTime(totalDuration, false);
        setIsAtEnd(true);
        setIsPlayingBetweenScenes(false);
        setIsTargetEnd(false);
      }
      return;
    }

    // 3. First click while actively looping -> finish this loop cycle, and auto-play the next scene!
    if (isLoopingSceneRef.current) {
      isLoopExitPendingRef.current = true;
      setIsLoopExitPending(true);
      videoRef.current.play().catch(() => {});
      return;
    }

    // 4. Current scene is a loop slide, but currently paused -> Presenter clicks Next to START THE LOOP!
    if (currentScene?.isLooping && !isPlayingBetweenScenes) {
      isLoopingSceneRef.current = true;
      setIsLoopingScene(true);
      isLoopExitPendingRef.current = false;
      setIsLoopExitPending(false);
      setIsPlayingBetweenScenes(false);
      syncToGlobalTime(currentScene.timestamp, true);
      return;
    }

    // 5. Instant transition mode
    if (settings?.presentationTransition === 'instant') {
      if (currentIndex < scenes.length - 1) {
        const nextIdx = currentIndex + 1;
        currentIndexRef.current = nextIdx;
        setCurrentIndex(nextIdx);
        isLoopingSceneRef.current = false;
        setIsLoopingScene(false);
        isLoopExitPendingRef.current = false;
        setIsLoopExitPending(false);
        setIsPlayingBetweenScenes(false);
        videoRef.current?.pause();
        syncToGlobalTime(scenes[nextIdx].timestamp, false);
      } else if (currentIndex === scenes.length - 1) {
        if (settings.presentationLoop) {
          currentIndexRef.current = 0;
          setCurrentIndex(0);
          isLoopingSceneRef.current = false;
          setIsLoopingScene(false);
          isLoopExitPendingRef.current = false;
          setIsLoopExitPending(false);
          setIsPlayingBetweenScenes(false);
          videoRef.current?.pause();
          syncToGlobalTime(scenes[0]?.timestamp ?? 0, false);
        } else {
          isLoopingSceneRef.current = false;
          setIsLoopingScene(false);
          isLoopExitPendingRef.current = false;
          setIsLoopExitPending(false);
          setIsPlayingBetweenScenes(false);
          videoRef.current?.pause();
          syncToGlobalTime(totalDuration, false);
          setIsAtEnd(true);
        }
      }
      return;
    }

    // 6. Click detected while transitioning between scenes -> snap immediately to target stop and pause
    if (isPlayingBetweenScenes) {
      videoRef.current.pause();
      if (isTargetEnd) {
        setIsPlayingBetweenScenes(false);
        setIsTargetEnd(false);
        setTargetIndex(null);
        syncToGlobalTime(totalDuration, false);
        setIsAtEnd(true);
      } else if (targetIndex !== null && scenes[targetIndex]) {
        const destIdx = targetIndex;
        const targetScene = scenes[destIdx];
        currentIndexRef.current = destIdx;
        setCurrentIndex(destIdx);
        setIsPlayingBetweenScenes(false);
        setTargetIndex(null);
        isLoopingSceneRef.current = false;
        setIsLoopingScene(false);
        isLoopExitPendingRef.current = false;
        setIsLoopExitPending(false);
        syncToGlobalTime(targetScene.timestamp, false);
      }
      return;
    }

    // 7. Normal forward playback: plays scene smoothly and stops at the end of the scene (next stop)
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
    currentIndex,
    currentScene,
    isPlayingBetweenScenes,
    isTargetEnd,
    targetIndex,
    scenes,
    totalDuration,
    clips.length,
    syncToGlobalTime,
    settings,
  ]);

  const handleForward = handleAdvance;
  const handleSpace = handleAdvance;

  // Backward (Left Arrow / Prev button):
  // Steps backward without animating, always pauses at destination
  const handleBackward = useCallback(() => {
    if (!videoRef.current || scenes.length === 0) return;

    if (isLoopingScene || isLoopExitPending) {
      isLoopExitPendingRef.current = false;
      setIsLoopExitPending(false);
      isLoopingSceneRef.current = false;
      setIsLoopingScene(false);
      videoRef.current.pause();
      syncToGlobalTime(scenes[currentIndex]?.timestamp ?? 0, false);
      return;
    }

    if (isPlayingBetweenScenes) {
      isLoopExitPendingRef.current = false;
      setIsLoopExitPending(false);
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
      currentIndexRef.current = lastIdx;
      setCurrentIndex(lastIdx);
      isLoopingSceneRef.current = false;
      setIsLoopingScene(false);
      videoRef.current.pause();
      syncToGlobalTime(scenes[lastIdx].timestamp, false);
      return;
    }

    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      currentIndexRef.current = prevIdx;
      setCurrentIndex(prevIdx);
      setIsPlayingBetweenScenes(false);
      setTargetIndex(null);
      setIsTargetEnd(false);
      isLoopingSceneRef.current = false;
      setIsLoopingScene(false);
      videoRef.current.pause();
      syncToGlobalTime(scenes[prevIdx].timestamp, false);
    }
  }, [currentIndex, isLoopingScene, isLoopExitPending, isPlayingBetweenScenes, isAtEnd, scenes, syncToGlobalTime]);

  // Monitor video playback with requestAnimationFrame for frame-accurate pausing & looping
  useEffect(() => {
    const checkBoundary = () => {
      if ((isPlayingBetweenScenes || isLoopingScene || isLoopExitPending) && videoRef.current) {
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

        // 1. Scene strip loop handler:
        // - While looping: rewinds back to loopStart upon reaching loopEnd
        // - When user clicked Next while looping (isLoopExitPending): finishes this loop iteration,
        //   then auto-plays into the next scene like a normal slide, and stops at the end of that scene!
        if (isLoopingScene || isLoopExitPending) {
          const curIdx = currentIndexRef.current;
          const loopStart = scenes[curIdx]?.timestamp ?? 0;
          const loopEnd =
            curIdx < scenes.length - 1
              ? scenes[curIdx + 1].timestamp
              : (totalDuration > 0 ? totalDuration : 999999);

          const playbackRate = videoRef.current.playbackRate || 1;
          const leadTime = Math.max(0.02, 0.03 * playbackRate);

          if (
            loopEnd > loopStart + 0.08 &&
            (currentGlobalTime >= loopEnd - leadTime || videoRef.current.ended)
          ) {
            if (isLoopExitPendingRef.current) {
              // User clicked Next while looping: loop iteration finished!
              isLoopExitPendingRef.current = false;
              setIsLoopExitPending(false);
              isLoopingSceneRef.current = false;
              setIsLoopingScene(false);

              if (curIdx < scenes.length - 1) {
                const nextIdx = curIdx + 1;
                const nextScene = scenes[nextIdx];
                currentIndexRef.current = nextIdx;
                setCurrentIndex(nextIdx);

                if (nextScene?.isLooping) {
                  // Next scene is also a loop scene: pause at its start, wait for presenter to click Next to start loop!
                  setIsPlayingBetweenScenes(false);
                  setTargetIndex(null);
                  videoRef.current.pause();
                  syncToGlobalTime(nextScene.timestamp, false);
                } else {
                  // Next scene is normal: auto-plays the next scene, then stops at the end of that scene!
                  if (nextIdx < scenes.length - 1) {
                    setTargetIndex(nextIdx + 1);
                    setIsTargetEnd(false);
                    setIsPlayingBetweenScenes(true);
                  } else {
                    setIsTargetEnd(true);
                    setTargetIndex(null);
                    setIsPlayingBetweenScenes(true);
                  }
                  // Continue playing into next scene smoothly
                  videoRef.current.play().catch(() => {});
                }
              } else {
                // Loop scene was the last scene: reach end of video
                videoRef.current.pause();
                syncToGlobalTime(totalDuration, false);
                setIsAtEnd(true);
                setIsPlayingBetweenScenes(false);
                setIsTargetEnd(false);
              }
            } else if (isLoopingSceneRef.current) {
              // Normal looper: rewind to start of current scene strip
              const now = performance.now();
              if (now - lastLoopSeekTimeRef.current > 250) {
                lastLoopSeekTimeRef.current = now;
                syncToGlobalTime(loopStart, true);
              }
            }
          }
        }

        // 2. Normal forward playback between scenes handler:
        // Plays smoothly from scene start and stops at the end of the scene (targetTime)
        if (isPlayingBetweenScenes) {
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
            const targetScene = scenes[targetIndex];
            const targetTime = targetScene.timestamp;
            const playbackRate = videoRef.current.playbackRate || 1;
            // Compensate for media thread halt latency (~15-20ms) so the video pauses
            // directly on the target slide frame without overshooting into the next frame
            const leadTime = Math.max(0.015, 0.02 * playbackRate);

            if (currentGlobalTime >= targetTime - leadTime) {
              currentIndexRef.current = targetIndex;
              setCurrentIndex(targetIndex);
              setIsPlayingBetweenScenes(false);
              setTargetIndex(null);

              // Crucial: ALWAYS pause when arriving at the target scene stop!
              // (If targetScene is a loop scene, presenter clicks Next to start the loop).
              isLoopingSceneRef.current = false;
              setIsLoopingScene(false);
              isLoopExitPendingRef.current = false;
              setIsLoopExitPending(false);
              videoRef.current.pause();
              // Avoid micro-seeks within the same frame (< 50ms) that cause jarring rewind jerk
              if (Math.abs(currentGlobalTime - targetTime) > 0.05) {
                syncToGlobalTime(targetTime, false);
              }
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
    isLoopingScene,
    isLoopExitPending,
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

        case 'l':
        case 'L':
          e.preventDefault();
          toggleCurrentSceneLoop();
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
  }, [handleSpace, handleForward, handleBackward, handleClosePresentation, toggleFullscreen, toggleCurrentSceneLoop]);

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
                ({formatTime(totalDuration, false, totalDuration)})
              </span>
            </>
          ) : (
            <>
              <span className="scene-counter">
                Scene {currentIndex + 1} / {scenes.length}
              </span>
              <span className="scene-name-display">{currentScene?.name}</span>
              <span className="scene-time-display">
                ({formatTime(currentScene?.timestamp ?? 0, false, totalDuration)})
              </span>
            </>
          )}

          {isLoopExitPending ? (
            <span className="transition-badge looper-presentation-badge">
              <RotateCw size={12} className="animate-spin" />
              <span>Finishing Scene &bull; Flowing into Scene {currentIndex + 2}...</span>
            </span>
          ) : isLoopingScene ? (
            <span className="transition-badge looper-presentation-badge">
              <RotateCw size={12} className="animate-spin" />
              <span>Looping Strip &bull; Press Next or Space to finish &amp; advance</span>
            </span>
          ) : currentScene?.isLooping && !isPlayingBetweenScenes ? (
            <span className="transition-badge looper-presentation-badge">
              <RotateCw size={12} />
              <span>Loop Ready &bull; Press Next to Start</span>
            </span>
          ) : isTargetEnd ? (
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
            className={`btn-overlay-icon ${isLoopingScene || isLoopExitPending ? 'active-loop' : ''}`}
            onClick={toggleCurrentSceneLoop}
            title={
              isLoopExitPending
                ? 'Finishing Scene (Click to keep looping)'
                : isLoopingScene
                ? 'Scene looping is ON (Click or press L to stop loop)'
                : currentScene?.isLooping
                ? 'Loop ready (Click to start loop now or press L to disable loop)'
                : 'Enable loop for this scene strip (L)'
            }
          >
            <RotateCw size={15} className={isLoopingScene || isLoopExitPending ? 'animate-spin' : ''} />
          </button>
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
        disabled={currentIndex === 0 && !isPlayingBetweenScenes && !isAtEnd && !isLoopingScene && !isLoopExitPending}
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
            : isLoopExitPending
            ? 'Finishing Scene &bull; Click to skip immediately (→ Right Arrow or Space)'
            : isLoopingScene
            ? 'Finish Scene & Flow to Next Slide (→ Right Arrow or Space)'
            : currentScene?.isLooping && !isPlayingBetweenScenes
            ? 'Start Looping Scene (→ Right Arrow or Space)'
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
            ) : isLoopExitPending ? (
              <span className="status-playing looper-status">
                <RotateCw size={13} className="animate-spin" />
                <span>Finishing Scene {currentIndex + 1} &bull; Flowing into Scene {currentIndex + 2}... (Click Next to skip immediately)</span>
              </span>
            ) : isLoopingScene ? (
              <span className="status-playing looper-status">
                <RotateCw size={13} className="animate-spin" />
                <span>Looping Scene {currentIndex + 1} ({formatTime(currentScene?.timestamp ?? 0, false, totalDuration)} &ndash; {formatTime(currentIndex < scenes.length - 1 ? scenes[currentIndex + 1].timestamp : totalDuration, false, totalDuration)}) &bull; Click Next (or Space) to finish scene &amp; flow to next slide</span>
              </span>
            ) : currentScene?.isLooping && !isPlayingBetweenScenes ? (
              <span className="status-paused looper-ready-status">
                <RotateCw size={13} />
                <span>Scene {currentIndex + 1} of {scenes.length} (Loop Slide) &bull; Press Next or Space to start loop</span>
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

