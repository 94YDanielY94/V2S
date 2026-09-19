import React from 'react';
import { X, Clock, Trash2, FolderOpen, Download, Layers } from 'lucide-react';
import type { SavedPresentation } from '../types';
import { formatTime } from '../utils/time';

interface SavedProjectsModalProps {
  savedList: SavedPresentation[];
  onLoadProject: (project: SavedPresentation) => void;
  onDeleteProject: (id: string) => void;
  onClose: () => void;
}

export const SavedProjectsModal: React.FC<SavedProjectsModalProps> = ({
  savedList,
  onLoadProject,
  onDeleteProject,
  onClose,
}) => {
  const handleExportJSON = (project: SavedPresentation, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_bulletpoint.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="saved-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="saved-modal-header">
          <div className="saved-modal-title-group">
            <FolderOpen size={16} />
            <h2 className="saved-modal-title">Saved Presentations</h2>
            <span className="saved-modal-badge">{savedList.length}</span>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>

        <div className="saved-modal-body">
          {savedList.length === 0 ? (
            <div className="saved-empty-state">
              <Layers size={32} className="saved-empty-icon" />
              <p className="saved-empty-title">No saved presentations yet</p>
              <p className="saved-empty-desc">
                When you finish presenting or work with videos, your presentations are automatically saved here so you can add new videos without losing your work.
              </p>
            </div>
          ) : (
            <div className="saved-cards-list">
              {savedList.map((item) => (
                <div key={item.id} className="saved-card-row" onClick={() => onLoadProject(item)}>
                  {/* Snapshot Thumbnail */}
                  <div className="saved-card-thumb-wrap">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="saved-card-thumbnail"
                      />
                    ) : (
                      <div className="saved-card-thumb-placeholder">
                        <Layers size={22} />
                      </div>
                    )}
                    <span className="saved-card-badge-scenes">
                      {item.scenes.length} {item.scenes.length === 1 ? 'scene' : 'scenes'}
                    </span>
                  </div>

                  {/* Details Info */}
                  <div className="saved-card-info-col">
                    <div className="saved-card-header">
                      <span className="saved-card-name" title={item.name}>
                        {item.name}
                      </span>
                      <div className="saved-card-actions">
                        <button
                          className="btn-saved-action"
                          onClick={(e) => handleExportJSON(item, e)}
                          title="Export project JSON"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          className="btn-saved-action del"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(item.id);
                          }}
                          title="Delete saved presentation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="saved-card-details">
                      <div className="saved-detail-item">
                        <Clock size={11} />
                        <span>
                          {new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {item.totalDuration > 0 && (
                        <div className="saved-detail-pill">
                          {formatTime(item.totalDuration, false)}
                        </div>
                      )}
                    </div>

                    {item.clipNames && item.clipNames.length > 0 && (
                      <div className="saved-clips-summary">
                        Clips: {item.clipNames.join(' + ')}
                      </div>
                    )}

                    <div className="saved-card-load-row">
                      <button
                        className="btn btn-primary"
                        style={{ height: '26px', fontSize: '11px', padding: '0 10px' }}
                        onClick={() => onLoadProject(item)}
                      >
                        Load Presentation &amp; Video
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
