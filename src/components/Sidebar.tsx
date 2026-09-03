import { useState } from 'react';
import type { KeyframeSlide } from '../types';
import { formatTime, parseTimeToSeconds } from '../utils/time';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Camera,
  Layers,
  Clock,
  FileText,
  Edit2,
  Check,
  Play
} from 'lucide-react';

interface SidebarProps {
  slides: KeyframeSlide[];
  selectedSlideId: string | null;
  currentTime: number;
  onSelectSlide: (slide: KeyframeSlide) => void;
  onAddKeyframe: () => void;
  onDeleteSlide: (id: string) => void;
  onMoveSlide: (index: number, direction: 'up' | 'down') => void;
  onUpdateSlide: (id: string, updates: Partial<KeyframeSlide>) => void;
  onRetakeSnapshot: (id: string) => void;
  onSeekToTimestamp: (timestamp: number) => void;
  onClearAllSlides: () => void;
  hasVideo: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  slides,
  selectedSlideId,
  currentTime,
  onSelectSlide,
  onAddKeyframe,
  onDeleteSlide,
  onMoveSlide,
  onUpdateSlide,
  onRetakeSnapshot,
  onSeekToTimestamp,
  onClearAllSlides,
  hasVideo,
}) => {
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState('');

  const selectedSlide = slides.find((s) => s.id === selectedSlideId) || slides[0] || null;

  const startEditTitle = (slide: KeyframeSlide) => {
    setEditingTitleId(slide.id);
    setTempTitle(slide.title);
  };

  const saveTitle = (id: string) => {
    if (tempTitle.trim()) {
      onUpdateSlide(id, { title: tempTitle.trim() });
    }
    setEditingTitleId(null);
  };

  const startEditTime = (slide: KeyframeSlide) => {
    setEditingTimeId(slide.id);
    setTempTime(formatTime(slide.timestamp, true));
  };

  const saveTime = (id: string) => {
    const parsed = parseTimeToSeconds(tempTime);
    if (parsed !== null && parsed >= 0) {
      onUpdateSlide(id, { timestamp: parsed });
    }
    setEditingTimeId(null);
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Layers size={14} />
          <span>KEYFRAME SLIDES</span>
          <span className="badge-count">{slides.length}</span>
        </div>

        <div className="sidebar-header-actions">
          {slides.length > 0 && (
            <button
              className="btn-icon"
              onClick={onClearAllSlides}
              title="Clear all slides"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-toolbar">
        <button
          className="btn-sidebar-add"
          onClick={onAddKeyframe}
          disabled={!hasVideo}
          title="Add keyframe stop at current video timestamp"
        >
          <Plus size={14} />
          <span>Add Stop Point ({formatTime(currentTime, false)})</span>
        </button>
      </div>

      <div className="sidebar-content">
        {slides.length === 0 ? (
          <div className="sidebar-empty">
            <Clock size={28} className="empty-icon" />
            <p className="empty-title">No Keyframes Marked</p>
            <p className="empty-desc">
              Scrub the video timeline and click &ldquo;Add Stop Point&rdquo; or press &lsquo;K&rsquo; to register keyframes.
            </p>
          </div>
        ) : (
          <div className="slides-list">
            {slides.map((slide, index) => {
              const isSelected = slide.id === (selectedSlide?.id ?? null);
              const isCurrentTimeClose = Math.abs(currentTime - slide.timestamp) < 0.5;

              return (
                <div
                  key={slide.id}
                  className={`slide-card ${isSelected ? 'selected' : ''} ${
                    isCurrentTimeClose ? 'active-playhead' : ''
                  }`}
                  onClick={() => onSelectSlide(slide)}
                >
                  <div className="slide-card-top">
                    <div className="slide-index-badge">
                      <span>#{index + 1}</span>
                    </div>

                    {editingTimeId === slide.id ? (
                      <div className="time-edit-wrapper" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={tempTime}
                          onChange={(e) => setTempTime(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTime(slide.id);
                            if (e.key === 'Escape') setEditingTimeId(null);
                          }}
                          autoFocus
                          className="time-input"
                        />
                        <button className="btn-mini" onClick={() => saveTime(slide.id)}>
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="slide-timestamp-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeekToTimestamp(slide.timestamp);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditTime(slide);
                        }}
                        title="Click to jump video to this keyframe. Double-click to edit time."
                      >
                        <Clock size={11} />
                        <span>{formatTime(slide.timestamp, true)}</span>
                      </button>
                    )}

                    <div className="slide-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-card-action"
                        disabled={index === 0}
                        onClick={() => onMoveSlide(index, 'up')}
                        title="Move slide up"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        className="btn-card-action"
                        disabled={index === slides.length - 1}
                        onClick={() => onMoveSlide(index, 'down')}
                        title="Move slide down"
                      >
                        <ChevronDown size={12} />
                      </button>
                      <button
                        className="btn-card-action"
                        onClick={() => onDeleteSlide(slide.id)}
                        title="Delete keyframe slide"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="slide-card-body">
                    <div className="slide-thumbnail-wrapper">
                      {slide.imageUrl ? (
                        <img
                          src={slide.imageUrl}
                          alt={slide.title}
                          className="slide-thumbnail-img"
                        />
                      ) : (
                        <div className="slide-thumbnail-placeholder">
                          <span>Frame</span>
                        </div>
                      )}
                      <button
                        className="btn-thumbnail-overlay"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeekToTimestamp(slide.timestamp);
                        }}
                        title="Jump video to this timestamp"
                      >
                        <Play size={14} />
                      </button>
                    </div>

                    <div className="slide-info">
                      {editingTitleId === slide.id ? (
                        <div className="title-edit-box" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTitle(slide.id);
                              if (e.key === 'Escape') setEditingTitleId(null);
                            }}
                            autoFocus
                            className="input-title-edit"
                          />
                          <button className="btn-mini" onClick={() => saveTitle(slide.id)}>
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="title-display-box">
                          <span
                            className="slide-title-text"
                            title="Click to select. Double-click to edit title."
                            onDoubleClick={() => startEditTitle(slide)}
                          >
                            {slide.title}
                          </span>
                          <button
                            className="btn-edit-title"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTitle(slide);
                            }}
                            title="Edit Title"
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                      )}

                      {slide.notes && (
                        <div className="slide-notes-preview">
                          <FileText size={10} />
                          <span>{slide.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && hasVideo && (
                    <div className="slide-card-footer" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-secondary-mini"
                        onClick={() => onRetakeSnapshot(slide.id)}
                        title="Update slide snapshot using the current video frame"
                      >
                        <Camera size={11} />
                        <span>Update Snapshot from Current Frame</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSlide && (
        <div className="sidebar-notes-panel">
          <div className="notes-panel-header">
            <FileText size={12} />
            <span>Speaker Notes &bull; Slide #{slides.findIndex((s) => s.id === selectedSlide.id) + 1}</span>
          </div>
          <textarea
            className="notes-textarea"
            placeholder="Type speaker notes for this slide..."
            value={selectedSlide.notes || ''}
            onChange={(e) =>
              onUpdateSlide(selectedSlide.id, { notes: e.target.value })
            }
          />
        </div>
      )}
    </aside>
  );
};
