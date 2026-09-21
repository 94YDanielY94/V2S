import React from 'react';
import { Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatTime } from '../utils/time';
import { APP_VERSION } from '../version';

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
              {formatTime(currentTime, false, duration)} / {formatTime(duration, false, duration)}
            </span>
          </div>
        )}

        {fileName && (
          <span className="statusbar-text">{fileName}</span>
        )}
      </div>

      <div className="statusbar-right">
        <span className="statusbar-muted">
          <ArrowRight size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }} />
          or Space: Next &bull;{' '}
          <ArrowLeft size={10} style={{ display: 'inline', verticalAlign: '-1px', margin: '0 2px' }} />
          : Prev &bull; K: Add Stop &bull; F5: Present
        </span>
        <span className="statusbar-text" style={{ opacity: 0.6, fontSize: '11px', marginLeft: 10 }}>
          v{APP_VERSION}
        </span>
      </div>
    </footer>
  );
};
