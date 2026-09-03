import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Plus, Upload, Sparkles, Clock, Maximize2 } from 'lucide-react';
import type { SceneStop } from '../types';
import { formatTime } from '../utils/time';

interface VideoPlayerProps {
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  scenes: SceneStop[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onAddStop: () => void;
  onOpenVideoFile: (file: File) => void;
  onLoadDemo: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  videoRef,
  scenes,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onTogglePlay,
  onSeek,
  onAddStop,
  onOpenVideoFile,
  onLoadDemo,
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTrackMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = pos / rect.width;
    const time = ratio * duration;
    setHoverTime(time);
    setHoverX(pos);

    if (isDragging) {
      onSeek(time);
    }
  };

  const handleTrackDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || duration <= 0) return;
    setIsDragging(true);
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = pos / rect.width;
    onSeek(ratio * duration);
  };

  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!videoUrl) {
    return (
      <div className="player-card empty-state-card">
        <div className="empty-content-box">
          <div className="empty-badge">Interactive Video Presentation</div>
          <h2 className="empty-title">Turn Continuous Videos into Interactive Slides</h2>
          <p className="empty-description">
            Import your video, mark keyframe scene stops along the timeline, and present.
            Your continuous video automatically pauses at every stop point, waiting for your arrow key to advance.
          </p>

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

          <div className="empty-button-row">
            <button
              className="btn-pill-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} />
              <span>Import Video</span>
            </button>

            <button className="btn-pill-secondary" onClick={onLoadDemo}>
              <Sparkles size={15} />
              <span>Load Interactive Demo</span>
            </button>
          </div>

          <div className="quick-guide-card">
            <div className="guide-item">
              <span className="guide-num">1</span>
              <span>Scrub video to slide transition</span>
            </div>
            <div className="guide-sep">&rarr;</div>
            <div className="guide-item">
              <span className="guide-num">2</span>
              <span>Click Add Stop (Hotkey: K)</span>
            </div>
            <div className="guide-sep">&rarr;</div>
            <div className="guide-item">
              <span className="guide-num">3</span>
              <span>Present with Arrow Keys (F5)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-card">
      {/* Player Header */}
      <div className="player-card-header">
        <div className="player-header-title">
          <h3 className="section-title">Video Timeline &amp; Preview</h3>
          <span className="section-sub">
            {scenes.length} {scenes.length === 1 ? 'scene stop' : 'scene stops'} configured
          </span>
        </div>

        <div className="player-header-actions">
          <div className="timecode-pill">
            <Clock size={12} />
            <span className="time-val-curr">{formatTime(currentTime, false)}</span>
            <span className="time-val-sep">/</span>
            <span className="time-val-total">{formatTime(duration, false)}</span>
          </div>

          <button
            className="btn-icon-pill"
            onClick={() => {
              if (videoRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  videoRef.current.requestFullscreen();
                }
              }
            }}
            title="Toggle fullscreen player"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Video Screen Container */}
      <div className="player-screen-wrapper" onClick={onTogglePlay}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="video-render-element"
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
          <div className="video-pause-badge">
            <div className="pause-icon-pill">
              <Play size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Modern Scrubber Timeline (inspired by Image 1 & 2) */}
      <div className="timeline-card-module">
        <div
          ref={trackRef}
          className="timeline-scrub-track"
          onMouseMove={handleTrackMove}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={handleTrackDown}
        >
          {/* Base rail */}
          <div className="timeline-rail" />

          {/* Played progress fill */}
          <div className="timeline-rail-fill" style={{ width: `${progressPercent}%` }} />

          {/* Scene Stop Pins */}
          {duration > 0 &&
            scenes.map((scene, idx) => {
              const markerPercent = (scene.timestamp / duration) * 100;
              const isAtCurrent = Math.abs(currentTime - scene.timestamp) < 0.3;

              return (
                <div
                  key={scene.id}
                  className={`scene-timeline-marker ${isAtCurrent ? 'active' : ''}`}
                  style={{ left: `${markerPercent}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(scene.timestamp);
                  }}
                  title={`${scene.name} (${formatTime(scene.timestamp, false)})`}
                >
                  <div className="pin-shape" />
                  <span className="pin-badge">{idx + 1}</span>
                </div>
              );
            })}

          {/* Handle */}
          <div
            className="timeline-scrub-handle"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Tooltip */}
          {hoverTime !== null && (
            <div className="timeline-hover-bubble" style={{ left: `${hoverX}px` }}>
              {formatTime(hoverTime, false)}
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="player-toolbar-bottom">
        <div className="toolbar-left-group">
          <button
            className="btn-pill-play"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            className="btn-pill-secondary"
            onClick={onAddStop}
            title="Add scene stop at current frame (Hotkey: K or S)"
          >
            <Plus size={14} />
            <span>Add Stop at Frame</span>
          </button>
        </div>

        <div className="toolbar-right-group">
          <span className="shortcuts-legend">
            <kbd>Space</kbd> Play/Pause &bull; <kbd>K</kbd> Add Stop &bull; <kbd>F5</kbd> Present
          </span>
        </div>
      </div>
    </div>
  );
};
