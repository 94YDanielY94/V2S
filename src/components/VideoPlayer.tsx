import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Plus, Upload, Sparkles, Clock } from 'lucide-react';
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
      <div className="empty-player-view">
        <div className="empty-card">
          <h2 className="empty-heading">Video to Slide Presentation</h2>
          <p className="empty-subheading">
            Load your continuous presentation video, add scene stop points, and present.
            In presentation mode, the video plays continuously between scenes and automatically
            pauses at each stop point.
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

          <div className="empty-actions">
            <button
              className="btn-main"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} />
              <span>Open Video File</span>
            </button>

            <button className="btn-secondary" onClick={onLoadDemo}>
              <Sparkles size={15} />
              <span>Load Interactive Demo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-container">
      {/* Video Viewport */}
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
          <div className="video-center-indicator">
            <div className="play-icon-box">
              <Play size={28} />
            </div>
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="player-timeline-wrapper">
        <div
          ref={trackRef}
          className="timeline-track"
          onMouseMove={handleTrackMove}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={handleTrackDown}
        >
          {/* Base Track */}
          <div className="track-bg" />

          {/* Progress fill */}
          <div className="track-fill" style={{ width: `${progressPercent}%` }} />

          {/* Scene Stop Markers */}
          {duration > 0 &&
            scenes.map((scene, idx) => {
              const markerPercent = (scene.timestamp / duration) * 100;
              const isAtCurrent = Math.abs(currentTime - scene.timestamp) < 0.3;

              return (
                <div
                  key={scene.id}
                  className={`scene-stop-marker ${isAtCurrent ? 'active' : ''}`}
                  style={{ left: `${markerPercent}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(scene.timestamp);
                  }}
                  title={`${scene.name} (${formatTime(scene.timestamp, false)})`}
                >
                  <div className="marker-pin" />
                  <span className="marker-label">{idx + 1}</span>
                </div>
              );
            })}

          {/* Playhead */}
          <div
            className="timeline-playhead"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Tooltip */}
          {hoverTime !== null && (
            <div className="timeline-tooltip" style={{ left: `${hoverX}px` }}>
              {formatTime(hoverTime, false)}
            </div>
          )}
        </div>
      </div>

      {/* Clean Bottom Controls */}
      <div className="controls-bar">
        <div className="controls-left">
          <button
            className="btn-play-pause"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>

          <div className="time-display">
            <Clock size={12} className="time-icon" />
            <span className="time-curr">{formatTime(currentTime, false)}</span>
            <span className="time-sep">/</span>
            <span className="time-dur">{formatTime(duration, false)}</span>
          </div>
        </div>

        <div className="controls-center">
          <button
            className="btn-add-stop-center"
            onClick={onAddStop}
            title="Mark current frame as a scene stop (Hotkey: K or S)"
          >
            <Plus size={14} />
            <span>Add Stop Point at Current Frame</span>
          </button>
        </div>

        <div className="controls-right">
          <span className="keyboard-hint">
            <kbd>Space</kbd> Play/Pause &bull; <kbd>K</kbd> Add Stop &bull; <kbd>F5</kbd> Present
          </span>
        </div>
      </div>
    </div>
  );
};
