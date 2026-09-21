import React, { useState } from 'react';
import {
  X,
  Save,
  Play,
  Sliders,
  Sun,
  Moon,
  Keyboard,
  Download,
  RotateCcw,
  Check,
  Film,
  Info,
} from 'lucide-react';
import type { AppSettings, SavedPresentation } from '../types';
import { exportAllProjectsJSON } from '../utils/settings';
import { APP_VERSION } from '../version';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onClose: () => void;
  savedPresentations: SavedPresentation[];
  showToast: (msg: string) => void;
}

type TabKey = 'autosave' | 'presentation' | 'editor' | 'appearance' | 'shortcuts' | 'data';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  onClose,
  savedPresentations,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('autosave');

  const handleToggleAutoSave = () => {
    const nextVal = !settings.autoSaveEnabled;
    onUpdateSettings({ autoSaveEnabled: nextVal });
    showToast(nextVal ? 'Auto-save enabled' : 'Auto-save disabled (Manual save mode)');
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all settings to default values?')) {
      onResetSettings();
      showToast('Settings reset to defaults');
    }
  };

  const handleExportData = () => {
    if (savedPresentations.length === 0) {
      showToast('No saved presentations to export');
      return;
    }
    exportAllProjectsJSON(savedPresentations);
    showToast(`Exported ${savedPresentations.length} presentations!`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="settings-modal-header">
          <div className="settings-modal-title-wrap">
            <div>
              <h2 className="settings-modal-title">Preferences & Settings</h2>
            </div>
            <span className="settings-version-badge">v{APP_VERSION}</span>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Modal Main Layout: Navigation Sidebar + Tab Content */}
        <div className="settings-modal-layout">
          {/* Navigation Sidebar */}
          <nav className="settings-nav-sidebar">
            <button
              className={`settings-nav-item ${activeTab === 'autosave' ? 'active' : ''}`}
              onClick={() => setActiveTab('autosave')}
            >
              <Save size={15} />
              <span>Auto-Save & Saving</span>
            </button>

            <button
              className={`settings-nav-item ${activeTab === 'presentation' ? 'active' : ''}`}
              onClick={() => setActiveTab('presentation')}
            >
              <Play size={15} />
              <span>Presentation Mode</span>
            </button>

            <button
              className={`settings-nav-item ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Sliders size={15} />
              <span>Editor & Tweaking</span>
            </button>

            <button
              className={`settings-nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Sun size={15} />
              <span>Theme & Display</span>
            </button>

            <button
              className={`settings-nav-item ${activeTab === 'shortcuts' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              <Keyboard size={15} />
              <span>Keyboard Shortcuts</span>
            </button>

            <button
              className={`settings-nav-item ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <Film size={15} />
              <span>Storage & Backup</span>
            </button>
          </nav>

          {/* Tab Content Panel */}
          <div className="settings-tab-panel">
            {/* 1. AUTO-SAVE & SAVING */}
            {activeTab === 'autosave' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>Auto-Save & Persistence</h3>
                  <p>Choose whether presentations save automatically in the background or require manual confirmation.</p>
                </div>

                <div className="settings-card">
                  {/* Enable Auto-save Toggle */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Automatic Background Saving</label>
                      <span className="settings-row-desc">
                        {settings.autoSaveEnabled
                          ? 'Changes are automatically saved to storage after editing stops or timestamps.'
                          : 'Manual saving enabled. You must click "Save" or press Ctrl+S to persist changes.'}
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.autoSaveEnabled}
                        onChange={handleToggleAutoSave}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Auto-save Interval */}
                  <div className={`settings-row ${!settings.autoSaveEnabled ? 'disabled' : ''}`}>
                    <div className="settings-row-text">
                      <label className="settings-row-label">Auto-Save Delay</label>
                      <span className="settings-row-desc">
                        Delay after you finish modifying a timestamp or scene name before background saving occurs.
                      </span>
                    </div>
                    <select
                      className="settings-select"
                      disabled={!settings.autoSaveEnabled}
                      value={settings.autoSaveInterval}
                      onChange={(e) => onUpdateSettings({ autoSaveInterval: parseFloat(e.target.value) })}
                    >
                      <option value={0.5}>0.5 seconds (Instant)</option>
                      <option value={1.0}>1.0 second</option>
                      <option value={1.2}>1.2 seconds (Default)</option>
                      <option value={2.0}>2.0 seconds</option>
                      <option value={3.0}>3.0 seconds</option>
                      <option value={5.0}>5.0 seconds (Relaxed)</option>
                    </select>
                  </div>

                  {/* Save Toast Notifications */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Save Notifications</label>
                      <span className="settings-row-desc">
                        Display a banner toast notification when manual save completes.
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.showSaveNotifications}
                        onChange={(e) => onUpdateSettings({ showSaveNotifications: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div className="settings-callout">
                  <Info size={16} />
                  <span>
                    When auto-save is turned off, a prominent <strong>&quot;Save Changes&quot;</strong> button appears in the bottom editor toolbar whenever there are unsaved edits.
                  </span>
                </div>
              </div>
            )}

            {/* 2. PRESENTATION MODE */}
            {activeTab === 'presentation' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>Presentation Mode Behavior</h3>
                  <p>Fine-tune how slides and transitions behave when presenting in fullscreen mode (F5).</p>
                </div>

                <div className="settings-card">
                  {/* Transition Mode */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Slide Transition Style</label>
                      <span className="settings-row-desc">
                        Control how the player advances from one scene stop to the next.
                      </span>
                    </div>
                    <select
                      className="settings-select"
                      value={settings.presentationTransition}
                      onChange={(e) =>
                        onUpdateSettings({
                          presentationTransition: e.target.value as 'smooth' | 'instant',
                        })
                      }
                    >
                      <option value="smooth">Smooth Animated Playback</option>
                      <option value="instant">Instant Jump (Direct Cut)</option>
                    </select>
                  </div>

                  {/* Playback Speed */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Presentation Playback Speed</label>
                      <span className="settings-row-desc">
                        Default playback rate during animated transitions between slides.
                      </span>
                    </div>
                    <select
                      className="settings-select"
                      value={settings.presentationSpeed}
                      onChange={(e) => onUpdateSettings({ presentationSpeed: parseFloat(e.target.value) })}
                    >
                      <option value={0.5}>0.5x (Slow)</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1.0x (Normal)</option>
                      <option value={1.25}>1.25x (Faster)</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2.0x (Double speed)</option>
                    </select>
                  </div>

                  {/* Loop at End */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Loop Presentation at End</label>
                      <span className="settings-row-desc">
                        Automatically wrap back to the first scene stop when advancing past the final stop.
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.presentationLoop}
                        onChange={(e) => onUpdateSettings({ presentationLoop: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Slide Counter & Progress */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Show Slide Progress Header</label>
                      <span className="settings-row-desc">
                        Show the floating overlay with current slide number (&ldquo;Scene 2 / 8&rdquo;) and timeline progress bar.
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.presentationShowProgress}
                        onChange={(e) => onUpdateSettings({ presentationShowProgress: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Auto-Hide Overlay Delay */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Auto-Hide Controls Delay</label>
                      <span className="settings-row-desc">
                        Hide floating buttons and slide progress when the mouse stops moving.
                      </span>
                    </div>
                    <select
                      className="settings-select"
                      value={settings.presentationAutoHideDelay}
                      onChange={(e) =>
                        onUpdateSettings({ presentationAutoHideDelay: parseInt(e.target.value, 10) })
                      }
                    >
                      <option value={1500}>1.5 seconds</option>
                      <option value={2400}>2.4 seconds (Default)</option>
                      <option value={4000}>4.0 seconds</option>
                      <option value={0}>Never hide controls</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EDITOR & TWEAKING */}
            {activeTab === 'editor' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>Editor & Precision Tweaking</h3>
                  <p>Configure frame adjustment step sizes, timecode formatting, and timeline interaction.</p>
                </div>

                <div className="settings-card">
                  {/* Fine Tweak Step */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Fine Frame Step ([ and ] keys)</label>
                      <span className="settings-row-desc">
                        Timestamp nudge amount when using the inner tweaker buttons or bracket keys.
                      </span>
                    </div>
                    <select
                      className="settings-select"
                      value={settings.smallTweakStep}
                      onChange={(e) => onUpdateSettings({ smallTweakStep: parseFloat(e.target.value) })}
                    >
                      <option value={0.01}>0.01s (Frame-accurate / ~30fps)</option>
                      <option value={0.02}>0.02s</option>
                      <option value={0.05}>0.05s (Default)</option>
                      <option value={0.1}>0.10s</option>
                    </select>
                  </div>

                  {/* Coarse Tweak Step */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Coarse Frame Step ({'{'} and {'}'} keys)</label>
                      <span className="settings-row-desc">
                        Timestamp nudge amount when using the outer tweaker buttons or curly brace keys.
                      </span>
                    </div>
                    <select
                      className="settings-select"
                      value={settings.largeTweakStep}
                      onChange={(e) => onUpdateSettings({ largeTweakStep: parseFloat(e.target.value) })}
                    >
                      <option value={0.05}>0.05s</option>
                      <option value={0.1}>0.10s (Default)</option>
                      <option value={0.25}>0.25s (Quarter second)</option>
                      <option value={0.5}>0.50s (Half second)</option>
                      <option value={1.0}>1.00s (Full second)</option>
                    </select>
                  </div>

                  {/* Milliseconds display */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Show Milliseconds in Timecode</label>
                      <span className="settings-row-desc">
                        Display high-precision hundredths of a second (e.g. 01:24.45 vs 01:24).
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.showMilliseconds}
                        onChange={(e) => onUpdateSettings({ showMilliseconds: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Video Viewport Scaling */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Video Viewport Fit</label>
                      <span className="settings-row-desc">
                        How the video should size itself inside the preview display.
                      </span>
                    </div>
                    <select
                      className="settings-select"
                      value={settings.videoFit}
                      onChange={(e) =>
                        onUpdateSettings({ videoFit: e.target.value as 'contain' | 'cover' })
                      }
                    >
                      <option value="contain">Contain (Preserve aspect ratio with bars)</option>
                      <option value="cover">Cover (Fill entire screen area)</option>
                    </select>
                  </div>

                  {/* Default Scene Stop Prefix */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Default Stop Name Prefix</label>
                      <span className="settings-row-desc">
                        Default name prefix assigned when clicking &ldquo;Add Stop&rdquo; (e.g. &ldquo;Slide 1&rdquo; or &ldquo;Scene 1&rdquo;).
                      </span>
                    </div>
                    <input
                      type="text"
                      className="settings-input-text"
                      value={settings.defaultScenePrefix}
                      maxLength={16}
                      onChange={(e) => onUpdateSettings({ defaultScenePrefix: e.target.value })}
                      placeholder="Slide"
                    />
                  </div>

                  {/* Auto-Pause on Add Stop */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Auto-Pause on Adding Stop</label>
                      <span className="settings-row-desc">
                        Automatically pause playback whenever you press &ldquo;Add Stop&rdquo; or hotkey K.
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.autoPauseOnAddStop}
                        onChange={(e) => onUpdateSettings({ autoPauseOnAddStop: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Show shortcuts legend */}
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Show Toolbar Shortcuts Hints</label>
                      <span className="settings-row-desc">
                        Display the hotkey hints pill in the bottom toolbar.
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.showShortcutsLegend}
                        onChange={(e) => onUpdateSettings({ showShortcutsLegend: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. THEME & DISPLAY */}
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>Theme & Visual Appearance</h3>
                  <p>Customize the interface color scheme and visual appearance.</p>
                </div>

                <div className="settings-card">
                  <div className="theme-picker-group">
                    <div
                      className={`theme-card-option ${settings.theme === 'dark' ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                    >
                      <div className="theme-card-preview dark-preview">
                        <div className="preview-topbar" />
                        <div className="preview-body">
                          <div className="preview-box" />
                        </div>
                      </div>
                      <div className="theme-card-meta">
                        <Moon size={14} />
                        <span>Dark (Warm Stone)</span>
                        {settings.theme === 'dark' && <Check size={14} className="active-check" />}
                      </div>
                    </div>

                    <div
                      className={`theme-card-option ${settings.theme === 'light' ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                    >
                      <div className="theme-card-preview light-preview">
                        <div className="preview-topbar" />
                        <div className="preview-body">
                          <div className="preview-box" />
                        </div>
                      </div>
                      <div className="theme-card-meta">
                        <Sun size={14} />
                        <span>Light (Clean Stone)</span>
                        {settings.theme === 'light' && <Check size={14} className="active-check" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. KEYBOARD SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>Keyboard Shortcuts Reference</h3>
                  <p>All available keyboard shortcuts for rapid editing and presenting.</p>
                </div>

                <div className="shortcuts-table-card">
                  <table className="shortcuts-table">
                    <thead>
                      <tr>
                        <th>Shortcut</th>
                        <th>Action</th>
                        <th>Context</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><kbd>F5</kbd></td>
                        <td>Start presentation from selected stop</td>
                        <td>Global / Editor</td>
                      </tr>
                      <tr>
                        <td><kbd>Space</kbd></td>
                        <td>Play / Pause video (Editor) or Advance slide (Present)</td>
                        <td>Editor & Presentation</td>
                      </tr>
                      <tr>
                        <td><kbd>K</kbd> or <kbd>S</kbd></td>
                        <td>Add new scene stop at current video timestamp</td>
                        <td>Editor</td>
                      </tr>
                      <tr>
                        <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
                        <td>Manual save presentation to local storage</td>
                        <td>Editor</td>
                      </tr>
                      <tr>
                        <td><kbd>[</kbd> / <kbd>]</kbd></td>
                        <td>Fine frame nudge (-{settings.smallTweakStep}s / +{settings.smallTweakStep}s)</td>
                        <td>Editor</td>
                      </tr>
                      <tr>
                        <td><kbd>{'{'}</kbd> / <kbd>{'}'}</kbd></td>
                        <td>Coarse frame nudge (-{settings.largeTweakStep}s / +{settings.largeTweakStep}s)</td>
                        <td>Editor</td>
                      </tr>
                      <tr>
                        <td><kbd>&rarr;</kbd> or <kbd>Space</kbd></td>
                        <td>Next slide (double click to snap instantly)</td>
                        <td>Presentation</td>
                      </tr>
                      <tr>
                        <td><kbd>&larr;</kbd></td>
                        <td>Previous slide stop</td>
                        <td>Presentation</td>
                      </tr>
                      <tr>
                        <td><kbd>F</kbd></td>
                        <td>Toggle fullscreen display</td>
                        <td>Presentation</td>
                      </tr>
                      <tr>
                        <td><kbd>Esc</kbd></td>
                        <td>Exit presentation or close modal window</td>
                        <td>Global</td>
                      </tr>
                      <tr>
                        <td><kbd>Ctrl</kbd> + <kbd>,</kbd></td>
                        <td>Open Settings & Preferences</td>
                        <td>Global</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. STORAGE & BACKUP */}
            {activeTab === 'data' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>Storage & Project Backup</h3>
                  <p>Manage your saved presentations database, backup projects, and reset settings.</p>
                </div>

                <div className="settings-card">
                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Saved Presentations in Storage</label>
                      <span className="settings-row-desc">
                        {savedPresentations.length} {savedPresentations.length === 1 ? 'presentation' : 'presentations'} stored locally in your browser/desktop database.
                      </span>
                    </div>
                    <button className="btn" onClick={handleExportData} title="Download JSON backup">
                      <Download size={14} />
                      <span>Export All Projects</span>
                    </button>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-text">
                      <label className="settings-row-label">Reset Preferences to Defaults</label>
                      <span className="settings-row-desc">
                        Restore all auto-save, presentation, editor, and appearance options to original defaults.
                      </span>
                    </div>
                    <button className="btn" onClick={handleResetToDefaults} title="Reset all settings">
                      <RotateCcw size={14} />
                      <span>Reset Defaults</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="settings-modal-footer">
          <span className="settings-version-text">V2S v{APP_VERSION}</span>
          <button className="btn" onClick={onClose}>
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
