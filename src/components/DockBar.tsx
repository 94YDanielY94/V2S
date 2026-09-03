import React from 'react';
import { Video, Layers, Sparkles, Play, HelpCircle } from 'lucide-react';

interface DockBarProps {
  activeView: 'editor' | 'scenes';
  setActiveView: (view: 'editor' | 'scenes') => void;
  onLoadDemo: () => void;
  onStartPresentation: () => void;
  hasVideo: boolean;
  scenesCount: number;
}

export const DockBar: React.FC<DockBarProps> = ({
  activeView,
  setActiveView,
  onLoadDemo,
  onStartPresentation,
  hasVideo,
  scenesCount,
}) => {
  return (
    <aside className="app-dockbar">
      {/* Top Logo Mark */}
      <div className="dock-logo">
        <div className="dock-logo-badge">
          <Video size={18} />
        </div>
      </div>

      {/* Main Navigation Icons */}
      <div className="dock-nav">
        <button
          className={`dock-btn ${activeView === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveView('editor')}
          title="Video Editor & Timeline"
        >
          <Video size={18} />
        </button>

        <button
          className={`dock-btn ${activeView === 'scenes' ? 'active' : ''}`}
          onClick={() => setActiveView('scenes')}
          title={`Scene Stops (${scenesCount})`}
        >
          <Layers size={18} />
          {scenesCount > 0 && <span className="dock-badge">{scenesCount}</span>}
        </button>

        <button
          className="dock-btn"
          onClick={onLoadDemo}
          title="Load Demo Video"
        >
          <Sparkles size={18} />
        </button>
      </div>

      {/* Bottom Present Button */}
      <div className="dock-bottom">
        <button
          className="dock-btn btn-dock-present"
          onClick={onStartPresentation}
          disabled={!hasVideo || scenesCount === 0}
          title="Start Presentation (F5)"
        >
          <Play size={16} />
        </button>

        <div className="dock-info" title="Video to Slide Presentation">
          <HelpCircle size={16} />
        </div>
      </div>
    </aside>
  );
};
