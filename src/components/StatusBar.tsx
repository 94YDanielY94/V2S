import { Layers, Clock, Tv } from 'lucide-react';
import { formatTime } from '../utils/time';

interface StatusBarProps {
  slidesCount: number;
  currentTime: number;
  duration: number;
  fileName: string | null;
  onOpenPreview: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  slidesCount,
  currentTime,
  duration,
  fileName,
  onOpenPreview,
}) => {
  return (
    <footer className="app-statusbar">
      <div className="statusbar-left">
        <button
          className="statusbar-item statusbar-btn"
          onClick={onOpenPreview}
          disabled={slidesCount === 0}
          title="Open PowerPoint Preview (F5)"
        >
          <Tv size={12} />
          <span>Present</span>
        </button>

        <div className="statusbar-item">
          <Layers size={12} />
          <span>{slidesCount} {slidesCount === 1 ? 'Slide' : 'Slides'}</span>
        </div>

        {duration > 0 && (
          <div className="statusbar-item">
            <Clock size={12} />
            <span>
              {formatTime(currentTime, false)} / {formatTime(duration, false)}
            </span>
          </div>
        )}

        {fileName && (
          <div className="statusbar-item">
            <span>{fileName}</span>
          </div>
        )}
      </div>

      <div className="statusbar-right">
        <div className="statusbar-item shortcuts-hint">
          <span>&larr; / &rarr; Navigate Slides</span>
          <span className="dot">&bull;</span>
          <span>Space: Play / Pause</span>
          <span className="dot">&bull;</span>
          <span>K: Add Stop Point</span>
          <span className="dot">&bull;</span>
          <span>F5: Preview</span>
        </div>

        <div className="statusbar-item">
          <span>Desktop v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};
