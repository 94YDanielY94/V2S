import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Plus,
  Volume2,
  VolumeX,
  Maximize2,
  Upload,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock
} from 'lucide-react';
import type { KeyframeSlide } from '../types';
import { formatTime } from '../utils/time';

interface VideoPlayerProps {
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  slides: KeyframeSlide[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onAddKeyframe: () => void;
  onOpenVideoFile: (file: File) => void;
  onLoadDemo: () => void;
  onSelectSlide: (slide: KeyframeSlide) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  videoRef,
  slides,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onTogglePlay,
  onSeek,
  onAddKeyframe,
  onOpenVideoFile,
  onLoadDemo,
  onSelectSlide,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hoverTimelineTime, setHoverTimelineTime] = useState<number | null>(null);
  const [hoverPositionX, setHoverPositionX] = useState<number>(0);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current || duration <= 0) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = pos / rect.width;
    const time = ratio * duration;
    setHoverTimelineTime(time);
    setHoverPositionX(pos);

    if (isDraggingTimeline) {
      onSeek(time);
    }
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current || duration <= 0) return;
    setIsDraggingTimeline(true);
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = pos / rect.width;
    onSeek(ratio * duration);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingTimeline(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleStepFrames = (secondsDelta: number) => {
    const newTime = Math.max(0, Math.min(currentTime + secondsDelta, duration || 0));
    onSeek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onOpenVideoFile(file);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!videoUrl) {
    return (
      <div
        className="editor-empty-container"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="empty-hero">
          <div className="empty-hero-icon">
            <Sparkles size={36} />
          </div>
          <h2 className="empty-hero-title">Video to Slide Presentation Maker</h2>
          <p className="empty-hero-desc">
            Upload your video, scrub through the timeline to specify keyframe stop points,
            and preview your slides with PowerPoint-style arrow key navigation.
          </p>

          <div className="empty-hero-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onOpenVideoFile(file);
              }}
              accept="video/*"
              style={{ display: 'none' }}
            />

            <button
              className="btn-primary-large"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>Open Video File (.mp4, .webm, .mov)</span>
            </button>

            <button className="btn-secondary-large" onClick={onLoadDemo}>
              <Sparkles size={16} />
              <span>Load Interactive Demo Presentation</span>
            </button>
          </div>

          <div className="shortcuts-card">
            <div className="shortcuts-title">KEYBOARD SHORTCUTS</div>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>Space</kbd>
                <span>Play / Pause</span>
              </div>
              <div className="shortcut-item">
                <kbd>K</kbd>
                <span>Add Keyframe Stop Point</span>
              </div>
              <div className="shortcut-item">
                <kbd>&larr;</kbd> <kbd>&rarr;</kbd>
                <span>Previous / Next Slide in Preview</span>
              </div>
              <div className="shortcut-item">
                <kbd>F5</kbd>
                <span>Start Presentation Preview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-player-container">
      {/* Video Screen */}
      <div className="video-viewport" onClick={onTogglePlay}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="video-element"
          onTimeUpdate={() => {
            if (videoRef.current) {
              onTimeUpdate(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              onDurationChange(videoRef.current.duration);
            }
          }}
          playsInline
        />

        {!isPlaying && (
          <div className="video-play-overlay">
            <div className="play-overlay-circle">
              <Play size={32} />
            </div>
          </div>
        )}
      </div>

      {/* Timeline with Keyframe Stop Markers */}
      <div className="timeline-section">
        <div
          ref={timelineTrackRef}
          className="timeline-track"
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={() => setHoverTimelineTime(null)}
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Base Track */}
          <div className="timeline-bar-bg" />

          {/* Progress fill */}
          <div
            className="timeline-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Keyframe Stop Markers */}
          {duration > 0 &&
            slides.map((slide, index) => {
              const markerPos = (slide.timestamp / duration) * 100;
              const isClose = Math.abs(currentTime - slide.timestamp) < 0.3;
              return (
                <div
                  key={slide.id}
                  className={`keyframe-marker ${isClose ? 'active' : ''}`}
                  style={{ left: `${markerPos}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(slide.timestamp);
                    onSelectSlide(slide);
                  }}
                  title={`Slide ${index + 1}: ${slide.title} (${formatTime(
                    slide.timestamp,
                    true
                  )})`}
                >
                  <div className="marker-pin" />
                </div>
              );
            })}

          {/* Playhead Handle */}
          <div
            className="timeline-playhead"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverTimelineTime !== null && (
            <div
              className="timeline-tooltip"
              style={{ left: `${hoverPositionX}px` }}
            >
              <span>{formatTime(hoverTimelineTime, true)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Controls Bar */}
      <div className="player-controls-bar">
        <div className="controls-left">
          <button
            className="btn-control btn-play-pause"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            className="btn-control"
            onClick={() => onSeek(0)}
            title="Jump to Start"
          >
            <RotateCcw size={14} />
          </button>

          <button
            className="btn-control"
            onClick={() => handleStepFrames(-1)}
            title="Step backward 1s"
          >
            <ChevronLeft size={14} />
            <span className="btn-label-tiny">1s</span>
          </button>

          <button
            className="btn-control"
            onClick={() => handleStepFrames(-1 / 30)}
            title="Step backward 1 frame"
          >
            <span className="btn-label-tiny">-1f</span>
          </button>

          <button
            className="btn-control"
            onClick={() => handleStepFrames(1 / 30)}
            title="Step forward 1 frame"
          >
            <span className="btn-label-tiny">+1f</span>
          </button>

          <button
            className="btn-control"
            onClick={() => handleStepFrames(1)}
            title="Step forward 1s"
          >
            <span className="btn-label-tiny">1s</span>
            <ChevronRight size={14} />
          </button>

          <div className="timecode-display">
            <Clock size={12} className="timecode-icon" />
            <span className="current-time">{formatTime(currentTime, true)}</span>
            <span className="time-sep">/</span>
            <span className="total-time">{formatTime(duration, false)}</span>
          </div>
        </div>

        <div className="controls-center">
          <button
            className="btn-add-keyframe-main"
            onClick={onAddKeyframe}
            title="Mark current frame as slide stop point (Hotkey: K)"
          >
            <Plus size={15} />
            <span>Add Keyframe Stop Point (K)</span>
          </button>
        </div>

        <div className="controls-right">
          <div className="speed-selector">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                className={`btn-speed ${playbackRate === rate ? 'active' : ''}`}
                onClick={() => handleRateChange(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="volume-control">
            <button className="btn-control" onClick={toggleMute} title="Mute/Unmute">
              {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>

          <button
            className="btn-control"
            onClick={() => {
              if (videoRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  videoRef.current.requestFullscreen();
                }
              }
            }}
            title="Fullscreen Video"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
