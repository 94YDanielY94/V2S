import React, { useState } from 'react';
import type { SceneStop } from '../types';
import { formatTime, parseTimeToSeconds } from '../utils/time';
import { Plus, Trash2, Clock, Check, Edit2 } from 'lucide-react';

interface SidebarProps {
  scenes: SceneStop[];
  selectedSceneId: string | null;
  currentTime: number;
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
    setTempTime(formatTime(scene.timestamp, true));
  };

  const saveTime = (id: string) => {
    const parsed = parseTimeToSeconds(tempTime);
    if (parsed !== null && parsed >= 0) {
      onUpdateScene(id, { timestamp: parsed });
    }
    setEditingTimeId(null);
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">SCENE STOPS ({scenes.length})</span>
      </div>

      <div className="sidebar-toolbar">
        <button
          className="btn-add-scene"
          onClick={onAddStop}
          disabled={!hasVideo}
          title="Add a scene stop point at current video time"
        >
          <Plus size={14} />
          <span>Add Stop at {formatTime(currentTime, false)}</span>
        </button>
      </div>

      <div className="sidebar-content">
        {scenes.length === 0 ? (
          <div className="sidebar-empty">
            <p className="empty-title">No Scenes Defined</p>
            <p className="empty-desc">
              Play or scrub the video to a slide transition point and click &ldquo;Add Stop&rdquo;.
            </p>
          </div>
        ) : (
          <div className="scenes-list">
            {scenes.map((scene, index) => {
              const isSelected = scene.id === selectedSceneId;
              const isCurrent = Math.abs(currentTime - scene.timestamp) < 0.4;

              return (
                <div
                  key={scene.id}
                  className={`scene-item ${isSelected ? 'selected' : ''} ${
                    isCurrent ? 'active-time' : ''
                  }`}
                  onClick={() => {
                    onSelectScene(scene);
                    onSeek(scene.timestamp);
                  }}
                >
                  <div className="scene-item-left">
                    <span className="scene-index">{index + 1}</span>

                    {editingId === scene.id ? (
                      <div className="edit-box" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveName(scene.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="input-scene-name"
                        />
                        <button className="btn-confirm" onClick={() => saveName(scene.id)}>
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="name-box">
                        <span className="scene-name" title={scene.name}>
                          {scene.name}
                        </span>
                        <button
                          className="btn-rename"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditName(scene);
                          }}
                          title="Rename scene"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="scene-item-right" onClick={(e) => e.stopPropagation()}>
                    {editingTimeId === scene.id ? (
                      <div className="edit-box">
                        <input
                          type="text"
                          value={tempTime}
                          onChange={(e) => setTempTime(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTime(scene.id);
                            if (e.key === 'Escape') setEditingTimeId(null);
                          }}
                          autoFocus
                          className="input-scene-time"
                        />
                        <button className="btn-confirm" onClick={() => saveTime(scene.id)}>
                          <Check size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-scene-time"
                        onClick={() => onSeek(scene.timestamp)}
                        onDoubleClick={() => startEditTime(scene)}
                        title="Seek video to this stop. Double click to adjust time."
                      >
                        <Clock size={11} />
                        <span>{formatTime(scene.timestamp, false)}</span>
                      </button>
                    )}

                    <button
                      className="btn-delete"
                      onClick={() => onDeleteScene(scene.id)}
                      title="Delete scene stop"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
