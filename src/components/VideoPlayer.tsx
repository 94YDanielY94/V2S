import React, { useRef, useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Scissors,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Save,
  Loader2,
} from 'lucide-react';
import type { SceneStop, VideoClip, AppSettings } from '../types';
import { formatTime } from '../utils/time';
import { getClipForGlobalTime, getClipBoundaries } from '../utils/stitch';
import { captureFrameAtTimestamp } from '../utils/capture';

/**
 * Intentional Dot Calculator
 * Calculates how many in-between dots to render between the beginning number (startNum)
 * and ending number (endNum) based on the distance between them.
 * You can tweak or customize this calculation at any time:
 *
 * E.g. If the distance is 1 sec, it contains 10 dots.
 */
export const calcDotsBetweenNumbers = (startNum: number, endNum: number): number => {
  const distance = Math.abs(endNum - startNum);

  // If distance is 1 second, contain 10 dots (user-configurable)
  if (distance <= 1) return 10;
  if (distance <= 2) return 9;   // 0.2s intervals
  if (distance <= 5) return 4;   // 1s intervals (1s, 2s, 3s, 4s)
  if (distance <= 10) return 4;  // 2s intervals (like Screenshot 3)
  if (distance <= 15) return 4;  // 3s intervals
  if (distance <= 20) return 3;  // 5s intervals
  if (distance <= 30) return 5;  // 5s intervals
  if (distance <= 60) return 5;  // 10s intervals (10s, 20s, 30s, 40s, 50s)
  if (distance <= 120) return 3; // 30s intervals
  if (distance <= 300) return 4; // 1m intervals
  if (distance <= 600) return 4; // 2m intervals
  return 5;
};

interface VideoPlayerProps {
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  clips: VideoClip[];
  scenes: SceneStop[];
  selectedSceneId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'unsaved';
  settings: AppSettings;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onAddStop: () => void;
  onSelectScene: (scene: SceneStop) => void;
  onUpdateScene: (id: string, updates: Partial<SceneStop>) => void;
  onDeleteScene: (id: string) => void;
  onOpenVideoFile: (file: File) => void;
  onAddStitchClip: (file: File) => void;
  onRemoveClip: (id: string) => void;
  onManualSave: () => void;
  onStartPresentation: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  videoRef,
  clips,
  scenes,
  selectedSceneId,
  currentTime,
  duration,
  isPlaying,
  saveStatus = 'idle',
  settings,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onTimeUpdate,
  onDurationChange,
  onTogglePlay,
  onSeek,
  onAddStop,
  onSelectScene,
  onUpdateScene,
  onDeleteScene,
  onOpenVideoFile,
  onAddStitchClip,
  onManualSave,
  onStartPresentation,
}) => {
  // Timeline zoom level (1x to 3x) matching reference image 3
  const [zoom, setZoom] = useState(1);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isAnimatingZoom, setIsAnimatingZoom] = useState(false);
  const zoomAnimRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const prevZoomRef = useRef(zoom);


  // Custom scrollbar state reserving room under container
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollLeft: 0,
    scrollWidth: 1,
    clientWidth: 1,
  });
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);


  // Cancel any in-flight zoom animation
  const cancelZoomAnim = useCallback(() => {
    if (zoomAnimRef.current !== null) {
      cancelAnimationFrame(zoomAnimRef.current);
      zoomAnimRef.current = null;
      setIsAnimatingZoom(false);
    }
  }, []);

  // Smoothly animates zoom to a target value using ease-out curve
  const smoothSetZoom = useCallback(
    (targetZoom: number, durationMs = 240) => {
      const clampedTarget = Math.max(1, Math.min(3, parseFloat(targetZoom.toFixed(3))));
      cancelZoomAnim();

      const startZoom = zoom;
      const diff = clampedTarget - startZoom;
      if (Math.abs(diff) < 0.005) {
        setZoom(clampedTarget);
        return;
      }

      setIsAnimatingZoom(true);
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        // Quartic ease-out: 1 - (1 - t)^4 for fluid, natural deceleration
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = startZoom + diff * ease;
        setZoom(parseFloat(current.toFixed(3)));

        if (progress < 1) {
          zoomAnimRef.current = requestAnimationFrame(step);
        } else {
          setZoom(clampedTarget);
          zoomAnimRef.current = null;
          setIsAnimatingZoom(false);
        }
      };

      zoomAnimRef.current = requestAnimationFrame(step);
    },
    [zoom, cancelZoomAnim]
  );

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // Dragging states for playhead and trim handles
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [trimmingHandle, setTrimmingHandle] = useState<{
    sceneId: string;
    type: 'start' | 'end';
  } | null>(null);

  // Inline editing state for scene name
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // Fallback frame capture cache for scene thumbnails
  const [dynamicThumbnails, setDynamicThumbnails] = useState<Record<string, string>>({});

  const trackContainerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stitchInputRef = useRef<HTMLInputElement>(null);

  // Stitched clip seam boundaries
  const clipBoundaries = useMemo(() => getClipBoundaries(clips), [clips]);

  // Derive active clip for multi-clip playback
  const currentClipInfo = useMemo(
    () => getClipForGlobalTime(clips, currentTime),
    [clips, currentTime]
  );
  const activeClipIndex = currentClipInfo.clipIndex;
  const prevClipIdRef = useRef<string | null>(null);
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Synchronize multi-clip video element
  useEffect(() => {
    if (currentClipInfo.clip && videoRef.current) {
      if (prevClipIdRef.current !== currentClipInfo.clip.id) {
        prevClipIdRef.current = currentClipInfo.clip.id;
        const wasPlaying = !videoRef.current.paused;
        videoRef.current.src = currentClipInfo.clip.url;
        videoRef.current.onloadeddata = () => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentClipInfo.localTime;
            if (wasPlaying) videoRef.current.play().catch(() => {});
          }
        };
      }
    }
  }, [currentClipInfo, videoRef]);

  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const activeClipIndexRef = useRef(activeClipIndex);
  activeClipIndexRef.current = activeClipIndex;

  // Smooth continuous needle movement via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    const updatePlayhead = () => {
      const dur = durationRef.current;
      if (videoRef.current && playheadRef.current && dur > 0) {
        let currentT = videoRef.current.currentTime;
        const currentClips = clipsRef.current;
        if (currentClips.length > 0) {
          let accumulated = 0;
          const curIdx = activeClipIndexRef.current;
          for (let i = 0; i < curIdx; i++) {
            accumulated += currentClips[i].duration || 0;
          }
          currentT += accumulated;
        }
        const pct = Math.max(0, Math.min(100, (currentT / dur) * 100));
        playheadRef.current.style.left = `${pct}%`;
      }
      animId = requestAnimationFrame(updatePlayhead);
    };

    animId = requestAnimationFrame(updatePlayhead);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, videoRef]);

  // Synchronize needle position when paused, seeking, or scrubbed
  useLayoutEffect(() => {
    if (!isPlaying && playheadRef.current) {
      playheadRef.current.style.left = `${playheadPercent}%`;
    }
  }, [isPlaying, playheadPercent]);

  // Automatically generate missing frame thumbnails for scenes so cards display real preview
  useEffect(() => {
    const src = clips[0]?.url || videoUrl || '';
    if (!src || scenes.length === 0) return;

    scenes.forEach((scene) => {
      if (!scene.capturedImage && !dynamicThumbnails[scene.id]) {
        captureFrameAtTimestamp(src, scene.timestamp).then((img) => {
          if (img) {
            setDynamicThumbnails((prev) => ({ ...prev, [scene.id]: img }));
          }
        });
      }
    });
  }, [scenes, videoUrl, clips, dynamicThumbnails]);

  // Calculate timeline time from mouse X coordinate relative to track
  const getTimeFromClientX = useCallback(
    (clientX: number): number => {
      if (!trackContainerRef.current || duration <= 0) return 0;
      const rect = trackContainerRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = pos / rect.width;
      return ratio * duration;
    },
    [duration]
  );

  // Handle timeline scrubbing
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    setIsScrubbing(true);
    const time = getTimeFromClientX(e.clientX);
    const pct = Math.max(0, Math.min(100, (time / duration) * 100));
    if (playheadRef.current) {
      playheadRef.current.style.left = `${pct}%`;
    }
    onSeek(parseFloat(time.toFixed(2)));
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackContainerRef.current || duration <= 0) return;
    const rect = trackContainerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const time = (pos / rect.width) * duration;

    setHoverTime(time);
    setHoverX(pos);

    if (isScrubbing) {
      const pct = Math.max(0, Math.min(100, (time / duration) * 100));
      if (playheadRef.current) {
        playheadRef.current.style.left = `${pct}%`;
      }
      onSeek(parseFloat(time.toFixed(2)));
    } else if (trimmingHandle) {
      const clamped = parseFloat(Math.max(0, Math.min(time, duration)).toFixed(2));
      onUpdateScene(trimmingHandle.sceneId, { timestamp: clamped });
      onSeek(clamped);
    }
  };

  // Global mouse/touch up handlers
  useEffect(() => {
    const handleMouseUp = () => {
      setIsScrubbing(false);
      setTrimmingHandle(null);
      setIsDraggingSlider(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  // Global mousemove for seamless drag scrubbing even when cursor leaves track
  useEffect(() => {
    if (!isScrubbing && !trimmingHandle) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!trackContainerRef.current || duration <= 0) return;
      const rect = trackContainerRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const time = (pos / rect.width) * duration;
      if (isScrubbing) {
        const pct = Math.max(0, Math.min(100, (time / duration) * 100));
        if (playheadRef.current) {
          playheadRef.current.style.left = `${pct}%`;
        }
        onSeek(parseFloat(time.toFixed(2)));
      } else if (trimmingHandle) {
        const clamped = parseFloat(Math.max(0, Math.min(time, duration)).toFixed(2));
        onUpdateScene(trimmingHandle.sceneId, { timestamp: clamped });
        onSeek(clamped);
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [isScrubbing, trimmingHandle, duration, onSeek, onUpdateScene]);

  // Anchor scroll viewport smoothly around playhead (or visible center) on zoom changes
  useEffect(() => {
    const prevZoom = prevZoomRef.current;
    prevZoomRef.current = zoom;

    if (viewportRef.current && duration > 0 && Math.abs(prevZoom - zoom) > 0.001) {
      const viewport = viewportRef.current;
      const viewportWidth = viewport.clientWidth;
      if (viewportWidth <= 0) return;

      const playheadRatio = Math.max(0, Math.min(1, currentTime / duration));
      const prevTotalWidth = viewportWidth * prevZoom;
      const prevPlayheadX = playheadRatio * prevTotalWidth;
      const scrollLeft = viewport.scrollLeft;

      // Check if playhead is currently inside the visible viewport
      const isInView = prevPlayheadX >= scrollLeft && prevPlayheadX <= scrollLeft + viewportWidth;

      let anchorRatio: number;
      let anchorScreenOffset: number;

      if (isInView) {
        anchorRatio = playheadRatio;
        anchorScreenOffset = prevPlayheadX - scrollLeft;
      } else {
        anchorRatio = (scrollLeft + viewportWidth / 2) / prevTotalWidth;
        anchorScreenOffset = viewportWidth / 2;
      }

      const newTotalWidth = viewportWidth * zoom;
      const targetScrollLeft = anchorRatio * newTotalWidth - anchorScreenOffset;
      const maxScroll = Math.max(0, newTotalWidth - viewportWidth);
      const clampedScrollLeft = Math.max(0, Math.min(maxScroll, targetScrollLeft));

      viewport.scrollLeft = clampedScrollLeft;
    }
  }, [zoom, currentTime, duration]);

  // Listen to scroll events to update custom scrollbar metrics
  const updateScrollMetrics = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setScrollMetrics({
      scrollLeft: el.scrollLeft,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    updateScrollMetrics();
    el.addEventListener('scroll', updateScrollMetrics, { passive: true });
    window.addEventListener('resize', updateScrollMetrics);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateScrollMetrics);
      ro.observe(el);
      if (trackContainerRef.current) {
        ro.observe(trackContainerRef.current);
      }
    }

    return () => {
      el.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
      if (ro) ro.disconnect();
    };
  }, [updateScrollMetrics, zoom, duration, clips]);

  // When zoomed out completely (zoom <= 1.01), ensure scrollLeft resets to 0 and scrollbar disappears
  useEffect(() => {
    if (zoom <= 1.01 && viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      updateScrollMetrics();
    }
  }, [zoom, updateScrollMetrics]);

  // Smooth wheel zoom with Ctrl/Alt keys or touchpad pinch-to-zoom; horizontal panning otherwise
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) {
        e.preventDefault();
        cancelZoomAnim();
        const delta = -e.deltaY * 0.002;
        setZoom((prev) => {
          const next = Math.max(1, Math.min(3, prev + delta));
          return parseFloat(next.toFixed(3));
        });
      } else if (el.scrollWidth > el.clientWidth && zoom > 1.01) {
        if (Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) === 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [cancelZoomAnim, zoom]);

  // Custom scrollbar calculations (room reserved under container, opacity 0 until overflow)
  // When zoom <= 1.01, the user is completely zoomed out -> scrollbar MUST disappear completely
  const isZoomedOut = zoom <= 1.01;
  const hasOverflow = !isZoomedOut && scrollMetrics.scrollWidth > scrollMetrics.clientWidth + 4;
  const maxScroll = Math.max(0, scrollMetrics.scrollWidth - scrollMetrics.clientWidth);
  const rawThumbWidth = scrollMetrics.scrollWidth > 0 ? (scrollMetrics.clientWidth / scrollMetrics.scrollWidth) * 100 : 100;
  const thumbWidthPct = Math.max(6, Math.min(100, rawThumbWidth));
  const scrollRatio = maxScroll > 0 ? scrollMetrics.scrollLeft / maxScroll : 0;
  const thumbLeftPct = Math.max(0, Math.min(100 - thumbWidthPct, scrollRatio * (100 - thumbWidthPct)));

  const handleScrollbarTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = scrollbarTrackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport || maxScroll <= 0) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    viewport.scrollLeft = clickRatio * maxScroll;
  };

  const handleScrollbarThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingScrollbar(true);
    dragStartXRef.current = e.clientX;
    dragStartScrollLeftRef.current = viewportRef.current?.scrollLeft || 0;
  };

  useEffect(() => {
    if (!isDraggingScrollbar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const track = scrollbarTrackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport || maxScroll <= 0) return;

      const deltaX = e.clientX - dragStartXRef.current;
      const trackWidth = track.clientWidth;
      const availableThumbTravel = trackWidth * (1 - thumbWidthPct / 100);
      if (availableThumbTravel <= 0) return;

      const scrollDelta = (deltaX / availableThumbTravel) * maxScroll;
      viewport.scrollLeft = Math.max(0, Math.min(maxScroll, dragStartScrollLeftRef.current + scrollDelta));
    };

    const handleMouseUp = () => {
      setIsDraggingScrollbar(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScrollbar, maxScroll, thumbWidthPct]);

  // Frame tweak nudge handlers
  const handleTweakTime = (delta: number) => {
    const next = Math.max(0, Math.min(duration || Infinity, currentTime + delta));
    onSeek(parseFloat(next.toFixed(3)));
  };

  // Jump to previous stop (or rewind by 5s)
  const handleJumpPrev = () => {
    if (scenes.length > 0) {
      const prev = [...scenes].filter((s) => s.timestamp < currentTime - 0.2);
      if (prev.length > 0) {
        const target = prev[prev.length - 1];
        onSelectScene(target);
        onSeek(target.timestamp);
        return;
      }
    }
    handleTweakTime(-5);
  };

  // Jump to next stop (or advance by 5s)
  const handleJumpNext = () => {
    if (scenes.length > 0) {
      const next = [...scenes].filter((s) => s.timestamp > currentTime + 0.2);
      if (next.length > 0) {
        const target = next[0];
        onSelectScene(target);
        onSeek(target.timestamp);
        return;
      }
    }
    handleTweakTime(5);
  };

  // Rename scene handlers
  const startRenameScene = (scene: SceneStop, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNameId(scene.id);
    setTempName(scene.name);
  };

  const saveRenameScene = (id: string) => {
    if (tempName.trim()) {
      onUpdateScene(id, { name: tempName.trim() });
    }
    setEditingNameId(null);
  };

  // Generate clean time ruler with intentional dots calculated between beginning and end numbers
  const rulerItems = useMemo(() => {
    if (duration <= 0) return [];

    // Choose interval so labels are comfortably spaced (~80px - 140px apart)
    const targetCount = Math.max(5, Math.min(12, Math.round(7 * zoom)));
    const rawStep = duration / targetCount;

    // Available human-friendly steps between major numbers
    const candidateSteps = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1200, 1800];
    let majorStep = candidateSteps[0];
    let minDiff = Math.abs(rawStep - majorStep);
    for (let i = 1; i < candidateSteps.length; i++) {
      const diff = Math.abs(rawStep - candidateSteps[i]);
      if (diff < minDiff) {
        minDiff = diff;
        majorStep = candidateSteps[i];
      }
    }

    const items: Array<{
      key: string;
      type: 'number' | 'dot';
      time: number;
      percent: number;
      label?: string;
    }> = [];

    // Format timestamp label cleanly (e.g. 0s, 5s, 10s, 30s, 1m, 1m 15s)
    const formatLabel = (t: number): string => {
      if (t === 0) return '0s';
      const rounded = Math.round(t);
      if (rounded < 60) return `${rounded}s`;
      const m = Math.floor(rounded / 60);
      const s = rounded % 60;
      return s === 0 ? `${m}m` : `${m}m ${s}s`;
    };

    // Step interval by interval from 0 up to duration
    let startNum = 0;
    const epsilon = 0.001;

    while (startNum <= duration + epsilon) {
      const startPercent = (startNum / duration) * 100;
      items.push({
        key: `num-${startNum.toFixed(2)}`,
        type: 'number',
        time: startNum,
        percent: startPercent,
        label: formatLabel(startNum),
      });

      const endNum = startNum + majorStep;
      // Calculate intentional dot count between beginning number and end number
      const dotsCount = calcDotsBetweenNumbers(startNum, endNum);

      if (dotsCount > 0) {
        for (let i = 1; i <= dotsCount; i++) {
          const dotTime = startNum + (i / (dotsCount + 1)) * (endNum - startNum);
          if (dotTime > duration + epsilon) break;

          items.push({
            key: `dot-${dotTime.toFixed(3)}`,
            type: 'dot',
            time: dotTime,
            percent: (dotTime / duration) * 100,
          });
        }
      }

      startNum = endNum;
    }

    return items;
  }, [duration, zoom]);

  // Video segments for the filmstrip track
  const videoSegments = useMemo(() => {
    if (duration <= 0) return [];
    if (scenes.length === 0) {
      return [
        {
          id: 'base-segment',
          sceneId: null,
          startTime: 0,
          endTime: duration,
          name: 'Video',
          thumbnail: clips[0]?.thumbnail || '',
        },
      ];
    }

    const sorted = [...scenes].sort((a, b) => a.timestamp - b.timestamp);
    const segs: {
      id: string;
      sceneId: string | null;
      startTime: number;
      endTime: number;
      name: string;
      thumbnail?: string;
      scene?: SceneStop;
      isFirstPreStop?: boolean;
    }[] = [];

    // Optional lead-in segment before first scene stop
    if (sorted[0].timestamp > 0.4) {
      segs.push({
        id: 'intro-segment',
        sceneId: null,
        startTime: 0,
        endTime: sorted[0].timestamp,
        name: 'Intro',
        thumbnail: clips[0]?.thumbnail,
        isFirstPreStop: true,
      });
    }

    sorted.forEach((sc, idx) => {
      const nextTime = idx < sorted.length - 1 ? sorted[idx + 1].timestamp : duration;
      segs.push({
        id: `seg-${sc.id}`,
        sceneId: sc.id,
        scene: sc,
        startTime: sc.timestamp,
        endTime: nextTime,
        name: sc.name,
        thumbnail: sc.capturedImage || dynamicThumbnails[sc.id] || clips[0]?.thumbnail,
      });
    });

    return segs;
  }, [scenes, duration, clips, dynamicThumbnails]);


  // Empty state when no video is loaded
  if (!videoUrl && clips.length === 0) {
    return (
      <div className="player-card empty-state-card">
        <div className="empty-content-box">
          <h2 className="empty-title">No Video In This Tab</h2>
          <p className="empty-description">Import a video to start creating slide stops.</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onOpenVideoFile(file);
                e.target.value = '';
              }
            }}
            accept="video/*"
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={14} />
            <span>Import Video</span>
          </button>
        </div>
      </div>
    );
  }

  const currentDisplayUrl =
    clips.length > 0 ? (clips[activeClipIndex]?.url || clips[0]?.url) : (videoUrl || '');

  return (
    <div className="player-card ref-timeline-theme">
      {/* Video Viewport */}
      <div className="player-screen-wrapper" onClick={onTogglePlay}>
        <video
          ref={videoRef}
          src={currentDisplayUrl}
          className="video-render-element"
          style={{ objectFit: settings.videoFit }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              if (clips.length > 0) {
                let accumulated = 0;
                for (let i = 0; i < activeClipIndex; i++) {
                  accumulated += clips[i].duration || 0;
                }
                const globalT = accumulated + videoRef.current.currentTime;
                onTimeUpdate(globalT);

                // Auto advance to next stitched clip on completion
                const currentClipDur = clips[activeClipIndex]?.duration || 0;
                if (
                  videoRef.current.currentTime >= currentClipDur - 0.05 &&
                  activeClipIndex < clips.length - 1 &&
                  isPlaying
                ) {
                  onSeek(accumulated + currentClipDur);
                }
              } else {
                onTimeUpdate(videoRef.current.currentTime);
              }
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              if (clips.length === 0) {
                onDurationChange(videoRef.current.duration);
              }
              if (currentTime > 0) {
                videoRef.current.currentTime = currentTime;
              }
            }
          }}
          onEnded={() => {
            if (isPlaying) {
              onTogglePlay();
            }
          }}
          playsInline
        />

        {!isPlaying && (
          <div className="video-pause-badge">
            <div className="pause-icon-pill" title="Play (Space)">
              <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />
            </div>
          </div>
        )}
      </div>

      {/* Modern Unified Timeline Toolbar (Matching Screenshot 1, 2, 3) */}
      <div className="timeline-action-toolbar">
        {/* Left: Action controls (Undo, Redo, Cut/Split, Delete selected) + Timecode Display */}
        <div className="tb-group-left">
          <button
            className="btn-tb-icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <RotateCcw size={16} />
          </button>

          <button
            className="btn-tb-icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <RotateCw size={16} />
          </button>

          <div className="tb-separator" />

          {/* Split / Add Stop at current playhead */}
          <button
            className="btn-tb-icon btn-tb-split"
            onClick={onAddStop}
            title="Split / Add Scene Stop at Playhead (Hotkey: K or S)"
            aria-label="Add stop"
          >
            <Scissors size={16} />
          </button>

          {/* Delete selected scene stop */}
          <button
            className={`btn-tb-icon btn-tb-trash ${selectedSceneId ? 'active-del' : ''}`}
            onClick={() => {
              if (selectedSceneId) onDeleteScene(selectedSceneId);
            }}
            disabled={!selectedSceneId}
            title={selectedSceneId ? 'Delete Selected Scene Stop (Delete)' : 'Select a stop to delete'}
            aria-label="Delete stop"
          >
            <Trash2 size={16} />
          </button>

          <div className="tb-separator" />

          {/* Formatted Timecode Display (Shuffled to left for balanced centering) */}
          <div className="tb-timecode-box">
            <span className="tb-time-curr">{formatTime(currentTime, settings.showMilliseconds)}</span>
            <span className="tb-time-sep">/</span>
            <span className="tb-time-dur">{formatTime(duration, settings.showMilliseconds)}</span>
          </div>
        </div>

        {/* Center: Playback & Tweak controls (<<, <, [Play/Pause], >, >>) — PERFECTLY CENTERED */}
        <div className="tb-group-center">
          <button
            className="btn-tb-nav"
            onClick={handleJumpPrev}
            title="Jump to Previous Stop (or -5s)"
            aria-label="Jump previous"
          >
            <ChevronsLeft size={18} />
          </button>

          <button
            className="btn-tb-nav"
            onClick={() => handleTweakTime(-settings.smallTweakStep)}
            title={`Step Frame Backward -${settings.smallTweakStep}s (Hotkey: [)`}
            aria-label="Step back"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Prominent Circular Play/Pause button */}
          <button
            className="btn-tb-play-circle"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label="Play/Pause"
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            className="btn-tb-nav"
            onClick={() => handleTweakTime(settings.smallTweakStep)}
            title={`Step Frame Forward +${settings.smallTweakStep}s (Hotkey: ])`}
            aria-label="Step forward"
          >
            <ChevronRight size={18} />
          </button>

          <button
            className="btn-tb-nav"
            onClick={handleJumpNext}
            title="Jump to Next Stop (or +5s)"
            aria-label="Jump next"
          >
            <ChevronsRight size={18} />
          </button>
        </div>

        {/* Right: Zoom slider, Auto-Save Status, Present Button */}
        <div className="tb-group-right">

          {/* Zoom Slider Controls (from Screenshot 3) */}
          <div className="tb-zoom-box" title="Zoom Timeline">
            <button
              className="btn-zoom-icon"
              onClick={() => smoothSetZoom(zoom - 0.25)}
              title="Zoom out"
              disabled={zoom <= 1}
            >
              <ZoomOut size={13} />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.005"
              value={zoom}
              onMouseDown={() => {
                cancelZoomAnim();
                setIsDraggingSlider(true);
              }}
              onTouchStart={() => {
                cancelZoomAnim();
                setIsDraggingSlider(true);
              }}
              onChange={(e) => {
                cancelZoomAnim();
                setZoom(parseFloat(e.target.value));
              }}
              className="tb-zoom-slider"
              style={{
                background: `linear-gradient(to right, var(--timeline-rail-fill) 0%, var(--timeline-rail-fill) ${((zoom - 1) / 2) * 100}%, var(--timeline-rail-bg) ${((zoom - 1) / 2) * 100}%, var(--timeline-rail-bg) 100%)`,
              }}
            />
            <button
              className="btn-zoom-icon"
              onClick={() => smoothSetZoom(zoom + 0.25)}
              title="Zoom in"
              disabled={zoom >= 3}
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Auto-Save Status / Manual Save Button */}
          {settings.autoSaveEnabled ? (
            <div className="tb-save-pill" title="Auto-save enabled. Edits are saved automatically.">
              <div className={`tb-save-status ${saveStatus}`}>
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 size={12} className="spin-icon" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={12} />
                    <span>Auto saved</span>
                  </>
                )}
              </div>
              <button
                className="btn-tb-icon btn-tb-split"
                onClick={onManualSave}
                title="Save immediately (Ctrl+S)"
              >
                <Save size={16} />
              </button>
            </div>
          ) : (
            <button
              className={`btn btn-save-manual ${saveStatus === 'unsaved' ? 'btn-primary has-unsaved' : ''}`}
              onClick={onManualSave}
              title={saveStatus === 'unsaved' ? 'Unsaved changes! Click to save (Ctrl+S)' : 'All changes saved (Ctrl+S)'}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 size={12} className="spin-icon" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'unsaved' ? (
                <>
                  <Save size={12} />
                  <span>Save</span>
                  <span className="unsaved-dot-indicator" />
                </>
              ) : (
                <>
                  <Check size={12} />
                  <span>Saved</span>
                </>
              )}
            </button>
          )}

          {/* Hidden File Input for Stitching Video Clips */}
          <input
            type="file"
            ref={stitchInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onAddStitchClip(file);
                e.target.value = '';
              }
            }}
            accept="video/*"
            style={{ display: 'none' }}
          />

          {/* Stitch Clip Button */}
          <button
            className="btn btn-tb-stitch"
            onClick={() => stitchInputRef.current?.click()}
            title="Stitch another video clip onto the timeline"
          >
            <Plus size={13} />
            <span>Stitch</span>
          </button>

          {/* Present Button */}
          <button
            className="btn btn-primary btn-tb-present"
            onClick={onStartPresentation}
            disabled={scenes.length === 0}
            title={scenes.length === 0 ? 'Add at least one scene stop to present' : 'Start Presentation (F5)'}
          >
            <Play size={13} fill="currentColor" />
            <span>Present</span>
          </button>
        </div>
      </div>

      {/* Main NLE Timeline Workspace (Matching Screenshot 1 & 2) */}
      <div className="timeline-editor-box">
        

        {/* Viewport column reserving room under the container for scrollbar */}
        <div className="timeline-viewport-column">
          {/* Scrollable Track Content (Horizontally scrollable when zoom > 1) */}
          <div
            className="timeline-scroll-viewport"
            ref={viewportRef}
            style={{
              overflowX: zoom > 1.01 ? 'auto' : 'hidden',
            }}
          >
          <div
            ref={trackContainerRef}
            className="timeline-tracks-content"
            style={{
              width: `${zoom * 100}%`,
              transition:
                isDraggingSlider || isAnimatingZoom
                  ? 'none'
                  : 'width 0.22s cubic-bezier(0.25, 1, 0.5, 1)',
              willChange: 'width',
            }}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* 1. Time Ruler Bar (Equally spaced numbers with in-between dots - Screenshot 2 & 3) */}
            <div className="timeline-ruler">
              {rulerItems.map((item) => {
                if (item.type === 'number') {
                  const isStart = item.percent <= 0.5;
                  const isEnd = item.percent >= 97;
                  return (
                    <div
                      key={item.key}
                      className="ruler-item ruler-number-item"
                      style={{
                        left: `${item.percent}%`,
                        transform: isStart
                          ? 'translateX(0)'
                          : isEnd
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                        paddingLeft: isStart ? '6px' : undefined,
                        paddingRight: isEnd ? '6px' : undefined,
                      }}
                    >
                      <span className="ruler-number-label">{item.label}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.key}
                    className="ruler-item ruler-dot-item"
                    style={{
                      left: `${item.percent}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <span className="ruler-dot" />
                  </div>
                );
              })}
            </div>

            {/* 2. Video Filmstrip Track (Thumbnail Segments - Middle Row) */}
            <div className="timeline-filmstrip-track">
              {videoSegments.map((segment) => {
                const isSelected = segment.sceneId !== null && segment.sceneId === selectedSceneId;
                const segLeft = duration > 0 ? (segment.startTime / duration) * 100 : 0;
                const segWidth =
                  duration > 0 ? ((segment.endTime - segment.startTime) / duration) * 100 : 100;

                return (
                  <div
                    key={segment.id}
                    className={`filmstrip-card ${isSelected ? 'selected-neon-highlight' : ''}`}
                    style={{
                      left: `${segLeft}%`,
                      width: `${Math.max(1, segWidth)}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (segment.scene) {
                        onSelectScene(segment.scene);
                      }
                    }}
                  >
                    {/* Background Preview Frame */}
                    {segment.thumbnail ? (
                      <img
                        src={segment.thumbnail}
                        alt={segment.name}
                        className="filmstrip-bg-img"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="filmstrip-placeholder-bg" />
                    )}

                    {/* Gradient Overlay for Clean Look */}
                    {/* <div className="filmstrip-card-overlay" /> */}

                    {/* Segment Timecode in Corner (unobscured preview) */}
                    <div className="filmstrip-card-meta">
                      <span className="filmstrip-card-time">{formatTime(segment.startTime, false)}</span>
                    </div>

                    {/* Left & Right Capsule Grab Handles on Selected Segment */}
                    {isSelected && segment.scene && (
                      <>
                        <div
                          className="filmstrip-trim-handle handle-left"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setTrimmingHandle({ sceneId: segment.scene!.id, type: 'start' });
                          }}
                          title="Drag to trim start time"
                        >
                          <div className="handle-pill-grip" />
                        </div>

                        <div
                          className="filmstrip-trim-handle handle-right"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setTrimmingHandle({ sceneId: segment.scene!.id, type: 'end' });
                          }}
                          title="Drag to trim end time"
                        >
                          <div className="handle-pill-grip" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Stitched Seams Dividers */}
              {duration > 0 &&
                clipBoundaries.map((boundary) => (
                  <div
                    key={boundary.clipIndex}
                    className="timeline-seam-divider"
                    style={{ left: `${(boundary.timestamp / duration) * 100}%` }}
                    title={`Stitched clip boundary at ${formatTime(boundary.timestamp, false)}`}
                  />
                ))}
            </div>

            {/* 3. Slide Naming Track (UNDER each timeline block - Screenshot 2) */}
            <div className="timeline-chips-row">
              {videoSegments.map((segment) => {
                const segLeft = duration > 0 ? (segment.startTime / duration) * 100 : 0;
                const segWidth =
                  duration > 0 ? ((segment.endTime - segment.startTime) / duration) * 100 : 100;

                // Intro lead-in before the first scene stop
                if (!segment.scene) {
                  return (
                    <div
                      key={segment.id}
                      className="scene-chip-pill intro-chip"
                      style={{
                        left: `${segLeft}%`,
                        width: `calc(${segWidth}% - 4px)`,
                        minWidth: '60px',
                      }}
                      title="Intro (before first slide)"
                    >
                      <span className="chip-tag">Intro</span>
                      <span className="chip-time">{formatTime(segment.startTime, false)}</span>
                    </div>
                  );
                }

                const scene = segment.scene;
                const isSelected = scene.id === selectedSceneId;
                const stopIndex = scenes.findIndex((s) => s.id === scene.id);

                return (
                  <div
                    key={scene.id}
                    className={`scene-chip-pill ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${segLeft}%`,
                      width: `calc(${segWidth}% - 4px)`,
                      minWidth: '70px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectScene(scene);
                      onSeek(scene.timestamp);
                    }}
                    title={`Slide ${stopIndex + 1}: ${scene.name} (${formatTime(scene.timestamp, false)})`}
                  >
                    {/* <span className="chip-tag">Slide {stopIndex + 1}</span> */}

                    {editingNameId === scene.id ? (
                      <div className="chip-edit-box" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRenameScene(scene.id);
                            if (e.key === 'Escape') setEditingNameId(null);
                          }}
                          autoFocus
                          className="chip-input-inline"
                        />
                        <button
                          className="chip-save-btn"
                          onClick={() => saveRenameScene(scene.id)}
                          title="Save name"
                        >
                          <Check size={10} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="chip-name"
                        onDoubleClick={(e) => startRenameScene(scene, e)}
                        title="Double-click to rename"
                      >
                        {scene.name}
                      </span>
                    )}

                    <button
                      className="chip-rename-trigger"
                      onClick={(e) => startRenameScene(scene, e)}
                      title="Rename slide"
                    >
                      <Edit2 size={9} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 4. Full-Height Needle Playhead Indicator */}
            <div
              ref={playheadRef}
              className="signature-playhead"
            >
              {/* Full-Height Vertical Needle Line */}
              <div className="playhead-needle-line" />
            </div>

            {/* Hover Tooltip Timestamp */}
            {hoverTime !== null && !isScrubbing && (
              <div
                className="timeline-hover-tooltip"
                style={{ left: `${hoverX}px` }}
              >
                {formatTime(hoverTime, true)}
              </div>
            )}
          </div>
        </div>

        {/* Dedicated room under container: opacity 0 and pointer-events none until overflow */}
        <div
          className={`timeline-custom-scrollbar ${hasOverflow ? 'has-overflow' : ''}`}
          ref={scrollbarTrackRef}
          onMouseDown={handleScrollbarTrackMouseDown}
          title={hasOverflow ? 'Scroll Timeline' : undefined}
        >
          <div
            className={`timeline-custom-scrollbar-thumb ${isDraggingScrollbar ? 'dragging' : ''}`}
            style={{
              left: `${thumbLeftPct}%`,
              width: `${thumbWidthPct}%`,
            }}
            onMouseDown={handleScrollbarThumbMouseDown}
          />
        </div>
      </div>
    </div>
    </div>
  );
};
