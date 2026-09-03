import React, { useRef } from 'react';
import { Play, Plus, Upload, Download, Sparkles, FolderOpen, Image as ImageIcon } from 'lucide-react';

interface TitleBarProps {
  fileName: string | null;
  slidesCount: number;
  onOpenVideoFile: (file: File) => void;
  onOpenImageFile: (file: File) => void;
  onLoadDemo: () => void;
  onAddKeyframe: () => void;
  onOpenPreview: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onExportSlidesImages: () => void;
  hasVideo: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  fileName,
  slidesCount,
  onOpenVideoFile,
  onOpenImageFile,
  onLoadDemo,
  onAddKeyframe,
  onOpenPreview,
  onExportProject,
  onImportProject,
  onExportSlidesImages,
  hasVideo,
}) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenVideoFile(file);
      e.target.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenImageFile(file);
      e.target.value = '';
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProject(file);
      e.target.value = '';
    }
  };

  return (
    <header className="app-titlebar">
      <div className="titlebar-left">
        <div className="titlebar-app-icon">
          <div className="icon-badge">VS</div>
        </div>
        <span className="titlebar-title">Video to Slide</span>
        {fileName && <span className="titlebar-filename">— {fileName}</span>}
      </div>

      <div className="titlebar-actions">
        <input
          type="file"
          ref={videoInputRef}
          onChange={handleVideoChange}
          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/mkv"
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={projectInputRef}
          onChange={handleProjectChange}
          accept=".json"
          style={{ display: 'none' }}
        />

        <button
          className="btn-toolbar"
          onClick={() => videoInputRef.current?.click()}
          title="Open Video File (.mp4, .webm, .mov)"
        >
          <Upload size={14} />
          <span>Open Video</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={() => imageInputRef.current?.click()}
          title="Upload Slide Image"
        >
          <ImageIcon size={14} />
          <span>Add Image</span>
        </button>

        <button
          className="btn-toolbar"
          onClick={onLoadDemo}
          title="Load Sample Demo Video with 4 Keyframe Slides"
        >
          <Sparkles size={14} />
          <span>Demo Video</span>
        </button>

        {hasVideo && (
          <button
            className="btn-toolbar btn-accent-subtle"
            onClick={onAddKeyframe}
            title="Add keyframe stop point at current video position (Hotkey: K)"
          >
            <Plus size={14} />
            <span>Add Keyframe</span>
          </button>
        )}

        <div className="toolbar-separator" />

        <button
          className="btn-toolbar btn-primary"
          onClick={onOpenPreview}
          disabled={slidesCount === 0}
          title="Start PowerPoint-style slide preview (Hotkey: F5)"
        >
          <Play size={14} />
          <span>Preview Slides ({slidesCount})</span>
        </button>

        <div className="toolbar-separator" />

        <div className="dropdown">
          <button className="btn-toolbar" title="Project and Export Options">
            <Download size={14} />
            <span>Export</span>
          </button>
          <div className="dropdown-menu">
            <button
              className="dropdown-item"
              onClick={onExportSlidesImages}
              disabled={slidesCount === 0}
            >
              <Download size={14} />
              <span>Download Slides Images</span>
            </button>
            <button className="dropdown-item" onClick={onExportProject}>
              <Download size={14} />
              <span>Save Project (.json)</span>
            </button>
            <button
              className="dropdown-item"
              onClick={() => projectInputRef.current?.click()}
            >
              <FolderOpen size={14} />
              <span>Open Project (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
