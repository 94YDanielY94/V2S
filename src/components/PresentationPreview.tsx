import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize,
  Minimize,
  FileText,
  Layers,
  Image as ImageIcon,
  Video,
  Play,
  Pause
} from 'lucide-react';
import type { KeyframeSlide, PresentationViewMode } from '../types';
import { formatTime } from '../utils/time';

interface PresentationPreviewProps {
  slides: KeyframeSlide[];
  videoUrl: string | null;
  initialSlideIndex?: number;
  onClose: () => void;
  onSeekVideo?: (timestamp: number) => void;
}

export const PresentationPreview: React.FC<PresentationPreviewProps> = ({
  slides,
  videoUrl,
  initialSlideIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialSlideIndex, slides.length - 1))
  );
  const [viewMode, setViewMode] = useState<PresentationViewMode>('snapshot');
  const [showNotes, setShowNotes] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentSlide = slides[currentIndex];

  // Navigate next / prev
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Synchronize video element when slide index changes if in video mode
  useEffect(() => {
    if (viewMode === 'video' && videoRef.current && currentSlide) {
      videoRef.current.currentTime = currentSlide.timestamp;
      videoRef.current.pause();
      setIsPlayingVideo(false);
    }
  }, [currentIndex, viewMode, currentSlide]);

  // Keyboard navigation (PowerPoint style: ArrowLeft, ArrowRight, Space, Escape, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;

        case 'ArrowLeft':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault();
          handlePrev();
          break;

        case ' ': // Space key: toggle video play in video mode or advance slide
          e.preventDefault();
          if (viewMode === 'video' && videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
              setIsPlayingVideo(true);
            } else {
              videoRef.current.pause();
              setIsPlayingVideo(false);
            }
          } else {
            handleNext();
          }
          break;

        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;

        case 'n':
        case 'N':
          e.preventDefault();
          setShowNotes((prev) => !prev);
          break;

        case 't':
        case 'T':
          e.preventDefault();
          setShowThumbnails((prev) => !prev);
          break;

        case 'v':
        case 'V':
          e.preventDefault();
          setViewMode((prev) => (prev === 'snapshot' ? 'video' : 'snapshot'));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, slides.length, viewMode, onClose]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  if (!currentSlide) {
    return null;
  }

  return (
    <div className="preview-overlay" ref={containerRef}>
      {/* Top Floating Control Bar */}
      <div className="preview-topbar">
        <div className="preview-topbar-left">
          <div className="preview-slide-indicator">
            <span className="current-num">{currentIndex + 1}</span>
            <span className="sep">/</span>
            <span className="total-num">{slides.length}</span>
          </div>
          <span className="preview-slide-title">{currentSlide.title}</span>
          <span className="preview-timestamp">
            ({formatTime(currentSlide.timestamp, true)})
          </span>
        </div>

        <div className="preview-topbar-center">
          {videoUrl && (
            <div className="mode-toggle-group">
              <button
                className={`btn-mode ${viewMode === 'snapshot' ? 'active' : ''}`}
                onClick={() => setViewMode('snapshot')}
                title="Slide Image Mode (instant PowerPoint snapshot)"
              >
                <ImageIcon size={13} />
                <span>Slide Snapshot</span>
              </button>
              <button
                className={`btn-mode ${viewMode === 'video' ? 'active' : ''}`}
                onClick={() => setViewMode('video')}
                title="Video Playback Mode (seeks directly to keyframe timestamp)"
              >
                <Video size={13} />
                <span>Video Seek</span>
              </button>
            </div>
          )}
        </div>

        <div className="preview-topbar-right">
          <button
            className={`btn-preview-tool ${showNotes ? 'active' : ''}`}
            onClick={() => setShowNotes((prev) => !prev)}
            title="Toggle Speaker Notes (N)"
          >
            <FileText size={14} />
            <span>Notes</span>
          </button>

          <button
            className={`btn-preview-tool ${showThumbnails ? 'active' : ''}`}
            onClick={() => setShowThumbnails((prev) => !prev)}
            title="Toggle Thumbnails Bar (T)"
          >
            <Layers size={14} />
            <span>Thumbnails</span>
          </button>

          <button
            className="btn-preview-tool"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>

          <button
            className="btn-preview-close"
            onClick={onClose}
            title="Exit Preview (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Slide Presentation Stage */}
      <div className="preview-stage">
        {/* Previous Navigation Button */}
        <button
          className="nav-arrow nav-arrow-left"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          title="Previous Slide (← Arrow Key)"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Slide Display Area */}
        <div className="slide-display-frame">
          {viewMode === 'snapshot' || !videoUrl ? (
            currentSlide.imageUrl ? (
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.title}
                className="slide-presentation-img"
              />
            ) : (
              <div className="slide-blank-placeholder">
                <p className="placeholder-title">{currentSlide.title}</p>
                <p className="placeholder-sub">
                  Keyframe at {formatTime(currentSlide.timestamp, true)}
                </p>
              </div>
            )
          ) : (
            <div className="slide-video-container">
              <video
                ref={videoRef}
                src={videoUrl}
                className="slide-presentation-video"
                onPlay={() => setIsPlayingVideo(true)}
                onPause={() => setIsPlayingVideo(false)}
                controls
              />
              <div className="video-seek-badge">
                <button
                  className="btn-play-pause-small"
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                      } else {
                        videoRef.current.pause();
                      }
                    }
                  }}
                >
                  {isPlayingVideo ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlayingVideo ? 'Pause' : 'Play from this stop point'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Speaker Notes Drawer / Overlay */}
          {showNotes && (
            <div className="preview-notes-drawer">
              <div className="notes-drawer-header">
                <FileText size={14} />
                <span>Speaker Notes &bull; Slide {currentIndex + 1}</span>
                <button
                  className="btn-close-notes"
                  onClick={() => setShowNotes(false)}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="notes-drawer-body">
                {currentSlide.notes ? (
                  <p className="notes-content">{currentSlide.notes}</p>
                ) : (
                  <p className="notes-empty">No notes recorded for this slide.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Next Navigation Button */}
        <button
          className="nav-arrow nav-arrow-right"
          onClick={handleNext}
          disabled={currentIndex === slides.length - 1}
          title="Next Slide (→ Arrow Key or Space)"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Bottom Thumbnail Strip for fast hopping */}
      {showThumbnails && (
        <div className="preview-bottom-bar">
          <div className="thumbnails-scroll-container">
            {slides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.id}
                  className={`preview-thumb-card ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  title={`Slide ${idx + 1}: ${slide.title}`}
                >
                  <div className="thumb-header">
                    <span className="thumb-num">#{idx + 1}</span>
                    <span className="thumb-time">{formatTime(slide.timestamp, false)}</span>
                  </div>
                  <div className="thumb-media">
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt="" className="thumb-img" />
                    ) : (
                      <div className="thumb-empty" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clean Bottom Progress Bar */}
      <div className="preview-progress-track">
        <div
          className="preview-progress-fill"
          style={{
            width: `${((currentIndex + 1) / slides.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};
