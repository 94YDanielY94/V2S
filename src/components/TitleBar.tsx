import React, { useRef } from 'react';
import { Play, Plus, Upload, Sparkles } from 'lucide-react';

interface TitleBarProps {
  fileName: string | null;
  scenesCount: number;
  activeView: 'editor' | 'scenes';
  setActiveView: (view: 'editor' | 'scenes') => void;
  onOpenVideoFile: (file: File) => void;
  onLoadDemo: () => void;
  onAddStop: () => void;
  onStartPresentation: () => void;
  hasVideo: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  fileName,
  scenesCount,
  activeView,
  setActiveView,
  onOpenVideoFile,
  onLoadDemo,
  onAddStop,
  onStartPresentation,
  hasVideo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-topbar">
      {/* Title & Video Info */}
      <div className="topbar-left">
        <h1 className="topbar-heading">Video to Slide</h1>
        {fileName ? (
          <span className="topbar-tag">{fileName}</span>
        ) : (
          <span className="topbar-tag muted">No video loaded</span>
        )}
      </div>

      {/* Segmented Pill Tabs (Inspired by Image 1, 2, & 3) */}
      <div className="topbar-center">
        <div className="segmented-pill-group">
          <button
            className={`pill-tab ${activeView === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveView('editor')}
          >
            Editor & Timeline
          </button>
          <button
            className={`pill-tab ${activeView === 'scenes' ? 'active' : ''}`}
            onClick={() => setActiveView('scenes')}
          >
            Scene Stops ({scenesCount})
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="topbar-right">
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
          className="btn-pill-secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} />
          <span>Open Video</span>
        </button>

        <button className="btn-pill-secondary" onClick={onLoadDemo}>
          <Sparkles size={14} />
          <span>Demo Video</span>
        </button>

        {hasVideo && (
          <button className="btn-pill-secondary" onClick={onAddStop}>
            <Plus size={14} />
            <span>Add Stop</span>
          </button>
        )}

        <button
          className="btn-pill-primary"
          onClick={onStartPresentation}
          disabled={!hasVideo || scenesCount === 0}
          title="Start fullscreen presentation (F5)"
        >
          <Play size={14} />
          <span>Present</span>
        </button>
      </div>
    </header>
  );
};
