import React, { useRef } from 'react';
import { Play, Plus, Upload, Sparkles } from 'lucide-react';

interface TitleBarProps {
  fileName: string | null;
  scenesCount: number;
  onOpenVideoFile: (file: File) => void;
  onLoadDemo: () => void;
  onAddStop: () => void;
  onStartPresentation: () => void;
  hasVideo: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  fileName,
  scenesCount,
  onOpenVideoFile,
  onLoadDemo,
  onAddStop,
  onStartPresentation,
  hasVideo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="app-titlebar">
      <div className="titlebar-left">
        <span className="titlebar-title">Video to Slide</span>
        {fileName && <span className="titlebar-filename">— {fileName}</span>}
      </div>

      <div className="titlebar-actions">
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
          className="btn-toolbar"
          onClick={() => fileInputRef.current?.click()}
          title="Import continuous presentation video"
        >
          <Upload size={14} />
          <span>Open Video</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={onLoadDemo}
          title="Load demo video with 4 continuous scenes"
        >
          <Sparkles size={14} />
          <span>Demo Video</span>
        </button>

        {hasVideo && (
          <button
            className="btn-toolbar"
            onClick={onAddStop}
            title="Mark current frame as a scene stop point (Hotkey: K or S)"
          >
            <Plus size={14} />
            <span>Add Scene Stop</span>
          </button>
        )}

        <div className="toolbar-separator" />

        <button
          className="btn-toolbar btn-present"
          onClick={onStartPresentation}
          disabled={!hasVideo || scenesCount === 0}
          title="Start fullscreen presentation mode (Hotkey: F5)"
        >
          <Play size={14} />
          <span>Present ({scenesCount} {scenesCount === 1 ? 'scene' : 'scenes'})</span>
        </button>
      </div>
    </header>
  );
};
