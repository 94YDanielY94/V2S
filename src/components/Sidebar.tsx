import React, { useState } from 'react';
import type { SceneStop } from '../types';
import { formatTime, parseTimeToSeconds } from '../utils/time';
import { Plus, Trash2, Clock, Check, Edit2, Play } from 'lucide-react';

interface SidebarProps {
  scenes: SceneStop[];
  selectedSceneId: string | null;
  currentTime: number;
  duration: number;
  onSelectScene: (scene: SceneStop) => void;
  onAddStop: () => void;
  onDeleteScene: (id: string) => void;
  onUpdateScene: (id: string, updates: Partial<SceneStop>) => void;
  onSeek: (time: number) => void;
  hasVideo: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  scenes,
  selectedSceneId,
  currentTime,
  duration,
  onSelectScene,
  onAddStop,
  onDeleteScene,
  onUpdateScene,
  onSeek,
  hasVideo,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState('');

  const startEditName = (scene: SceneStop) => {
    setEditingId(scene.id);
    setTempName(scene.name);
  };

  const saveName = (id: string) => {
    if (tempName.trim()) {
      onUpdateScene(id, { name: tempName.trim() });
    }
    setEditingId(null);
  };

  const startEditTime = (scene: SceneStop) => {
    setEditingTimeId(scene.id);
    setTempTime(formatTime(scene.timestamp, false));
  };

  const saveTime = (id: string) => {
    const parsed = parseTimeToSeconds(tempTime);
    if (parsed !== null && parsed >= 0) {
      onUpdateScene(id, { timestamp: parsed });
    }
    setEditingTimeId(null);
  };

  return (
    <div className="scene-panel-card">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-wrap">
          <h2 className="panel-title">Presentation Scenes</h2>
          <span className="panel-subtitle">Defined stop points in continuous video</span>
        </div>
        <span className="count-pill">{scenes.length} stops</span>
      </div>

      {/* Add Stop Button */}
      <button
        className="btn-card-action-add"
        onClick={onAddStop}
        disabled={!hasVideo}
      >
        <Plus size={14} />
        <span>Add Stop at {formatTime(currentTime, false)}</span>
      </button>

      {/* Scenes List */}
      <div className="scenes-scroll-area">
        {scenes.length === 0 ? (
          <div className="empty-scenes-box">
            <p className="empty-title">No Scenes Configured</p>
            <p className="empty-desc">
              Play or scrub to a slide transition point in the video, then click &ldquo;Add Stop&rdquo;.
            </p>
          </div>
        ) : (
          <div className="scenes-cards-stack">
            {scenes.map((scene, index) => {
              const isSelected = scene.id === selectedSceneId;
              const isCurrent = Math.abs(currentTime - scene.timestamp) < 0.4;

              return (
                <div
                  key={scene.id}
                  className={`scene-card ${isSelected ? 'selected' : ''} ${
                    isCurrent ? 'active-playback' : ''
                  }`}
                  onClick={() => {
                    onSelectScene(scene);
                    onSeek(scene.timestamp);
                  }}
                >
                  <div className="scene-card-header">
                    <div className="scene-number-tag">Scene {index + 1}</div>

                    <div className="scene-card-tools" onClick={(e) => e.stopPropagation()}>
                      {editingTimeId === scene.id ? (
                        <div className="time-edit-inline">
                          <input
                            type="text"
                            value={tempTime}
                            onChange={(e) => setTempTime(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTime(scene.id);
                              if (e.key === 'Escape') setEditingTimeId(null);
                            }}
                            autoFocus
                            className="input-time-edit"
                          />
                          <button className="btn-save-mini" onClick={() => saveTime(scene.id)}>
                            <Check size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-timecode-tag"
                          onClick={() => onSeek(scene.timestamp)}
                          onDoubleClick={() => startEditTime(scene)}
                          title="Click to seek. Double-click to edit time."
                        >
                          <Clock size={11} />
                          <span>{formatTime(scene.timestamp, false)}</span>
                        </button>
                      )}

                      <button
                        className="btn-card-del"
                        onClick={() => onDeleteScene(scene.id)}
                        title="Delete scene stop"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="scene-card-body">
                    {editingId === scene.id ? (
                      <div className="title-edit-inline" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveName(scene.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="input-title-edit"
                        />
                        <button className="btn-save-mini" onClick={() => saveName(scene.id)}>
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="scene-title-row">
                        <span className="scene-title" title={scene.name}>
                          {scene.name}
                        </span>
                        <button
                          className="btn-edit-inline"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditName(scene);
                          }}
                          title="Rename"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="scene-card-footer">
                    <button
                      className="btn-jump-scene"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(scene.timestamp);
                      }}
                    >
                      <Play size={11} />
                      <span>Jump to scene</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overview Stat Footer (inspired by Image 2 and 3) */}
      <div className="panel-stats-footer">
        <div className="stat-col">
          <span className="stat-label">Total Scenes</span>
          <span className="stat-val">{scenes.length}</span>
        </div>
        <div className="stat-col">
          <span className="stat-label">Video Length</span>
          <span className="stat-val">{formatTime(duration, false)}</span>
        </div>
        <div className="stat-col">
          <span className="stat-label">Playhead</span>
          <span className="stat-val">{formatTime(currentTime, false)}</span>
        </div>
      </div>
    </div>
  );
};
