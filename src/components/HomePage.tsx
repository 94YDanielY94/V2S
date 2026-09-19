import React from 'react';
import { Film, Plus, Play, Trash2, Settings } from 'lucide-react';
import type { SavedPresentation } from '../types';
import { formatTime, formatRelativeTime } from '../utils/time';

interface HomePageProps {
  savedList: SavedPresentation[];
  onNewPresentation: () => void;
  onOpenProject: (project: SavedPresentation) => void;
  onDeleteProject: (id: string) => void;
  onOpenSettings?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  savedList,
  onNewPresentation,
  onOpenProject,
  onDeleteProject,
  onOpenSettings,
}) => {
  return (
    <div className="player-card empty-state-card">
      <div className="empty-content-box">
        <h2 className="empty-title">Turn Continuous Videos into Interactive Slides</h2>
        <p className="empty-description">
          Import a video (up to 40 minutes) or stitch multiple videos together, mark keyframe scene stops along the timeline, and adjust stop frames with precision.
        </p>

        <div className="empty-button-row">
          <button
            className="btn btn-primary"
            onClick={onNewPresentation}
            title="Start a new presentation (choose a video file)"
          >
            <Plus size={14} />
            <span>New Presentation</span>
          </button>

          {onOpenSettings && (
            <button
              className="btn"
              onClick={onOpenSettings}
              title="Preferences & Settings (Ctrl+,)"
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
          )}
        </div>

        {/* Saved Presentations Showcase Section - ALWAYS VISIBLE ON HOME PAGE */}
        <div className="empty-saved-showcase">
          <div className="empty-saved-header">
            <div className="empty-saved-title-group">
              <Film size={15} />
              <span className="empty-saved-heading">Saved Presentations</span>
              <span className="empty-saved-counter">{savedList.length}</span>
            </div>
          </div>

          {savedList.length > 0 ? (
            <div className="dashboard-grid">
              {savedList.map((item) => (
                <div
                  key={item.id}
                  className="dashboard-card"
                  onClick={() => onOpenProject(item)}
                  title={`Click to open presentation "${item.name}"`}
                >
                  {/* Snapshot / Preview */}
                  <div className="dashboard-card-thumb">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="dashboard-thumb-img"
                      />
                    ) : (
                      <div className="dashboard-thumb-placeholder">
                        <Play size={26} className="thumb-placeholder-icon" />
                      </div>
                    )}
                    <div className="dashboard-thumb-badges">
                      
                      {item.totalDuration > 0 && (
                        <span className="dashboard-badge-dur">
                          {formatTime(item.totalDuration, false)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Meta Row */}
                  <div className="dashboard-card-meta">
                    <div className="dashboard-card-icon-tag">
                      <Play size={11} />
                    </div>
                    <div className="dashboard-card-text">
                      <div className="dashboard-card-title" title={item.name}>
                        {item.name}
                      </div>
                      <div className="dashboard-card-sub">
                        <span>{formatRelativeTime(item.updatedAt)}</span>
                        <span className="dashboard-sub-sep">&bull;</span>
                        <span>{item.scenes.length} stops</span>
                      </div>
                    </div>
                    {onDeleteProject && (
                      <button
                        className="btn-card-del"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(item.id);
                        }}
                        title="Delete presentation"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-saved-placeholder">
              <Film size={28} className="placeholder-film-icon" />
              <div className="placeholder-text-group">
                <span className="placeholder-title">No saved presentations yet</span>
                <span className="placeholder-sub">
                  Click &quot;New Presentation&quot; or the + button above to import a video and start creating slides.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* <div className="quick-guide-card">
          <div className="guide-item">
            <span className="guide-num">1</span>
            <span>Scrub or tweak video frame</span>
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
        </div> */}
      </div>
    </div>
  );
};
