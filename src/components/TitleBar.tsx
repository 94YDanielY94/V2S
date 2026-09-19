import React, { useState, useEffect } from 'react';
import { Plus, Home, X, Minus, Square, Copy } from 'lucide-react';
import type { PresentationTab } from '../types';

interface TitleBarProps {
  tabs: PresentationTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onGoToHome: () => void;
  onNewPresentation: () => void;
  activeTab: PresentationTab | null;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onGoToHome,
  onNewPresentation,
  activeTab: _activeTab,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    }
    if (window.electronAPI?.onMaximizeChange) {
      const unsub = window.electronAPI.onMaximizeChange(setIsMaximized);
      return unsub;
    }
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.closeWindow();
  };

  return (
    <header className="app-topbar" onDoubleClick={handleMaximize}>
      {/* Left: Brand + Home Button + Tab Strip (as in Figma image.png) */}
      <div className="topbar-left">
        
        {/* Home Icon Button */}
        <button
          className={`tab-home-btn ${activeTabId === 'home' ? 'active' : ''}`}
          onClick={onGoToHome}
          title="Home page (Saved presentations)"
          aria-label="Home"
        >
          <Home size={18} />
        </button>

        {/* Tabs Bar */}
        <div className="tab-strip">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <div
                key={tab.id}
                className={`tab-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
                title={tab.title}
              >
                {/* <Play size={13} className="tab-play-icon" /> */}
                <span className="tab-title">{tab.title}</span>
                <button
                  className="tab-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close tab"
                  aria-label="Close tab"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}

          {/* Plus icon to add new tab (Open video) */}
          <button
            className="tab-add-btn"
            onClick={onNewPresentation}
            title="New presentation (Open video)"
            aria-label="New presentation"
          >
            <Plus size={17} />
          </button>
        </div>
      </div>

      {/* Right: Quick Settings + Theme + Window Controls */}
      <div className="topbar-right">
       

        {/* Window Controls: Minimize, Maximize / Restore, Close */}
        <div className="window-controls-group">
          <button
            className="btn-win-control"
            onClick={handleMinimize}
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus size={16} />
          </button>

          <button
            className="btn-win-control"
            onClick={handleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label="Maximize"
          >
            {isMaximized ? <Copy size={14} /> : <Square size={14} />}
          </button>

          <button
            className="btn-win-control btn-win-close"
            onClick={handleClose}
            title="Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
