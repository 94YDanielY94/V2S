import React from 'react';
import { Clock } from 'lucide-react';
import { formatTime } from '../utils/time';

interface StatusBarProps {
  scenesCount: number;
  currentTime: number;
  duration: number;
  fileName: string | null;
  onStartPresentation: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  scenesCount,
  currentTime,
  duration,
  fileName,
  onStartPresentation,
}) => {
  return (
    <footer className="app-statusbar">
      <div className="statusbar-left">
        {scenesCount > 0 && (
          <button
            className="statusbar-link"
            onClick={onStartPresentation}
            title="Start presentation (F5)"
          >
            <span>Present ({scenesCount} {scenesCount === 1 ? 'scene' : 'scenes'})</span>
          </button>
        )}

        {duration > 0 && (
          <div className="statusbar-text">
            <Clock size={11} />
            <span>
              {formatTime(currentTime, false)} / {formatTime(duration, false)}
            </span>
          </div>
        )}

        {fileName && (
          <span className="statusbar-text">{fileName}</span>
        )}
      </div>

      <div className="statusbar-right">
        <span className="statusbar-muted">
          &rarr; or Space: Play to Next Scene &bull; &larr;: Prev Scene &bull; K: Add Stop &bull; F5: Present
        </span>
      </div>
    </footer>
  );
};
