import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { HomePage } from './components/HomePage';
import { VideoPlayer } from './components/VideoPlayer';
import { PresentationPreview } from './components/PresentationPreview';
import { SettingsModal } from './components/SettingsModal';
import type { SceneStop, VideoClip, SavedPresentation, PresentationTab, AppSettings } from './types';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './utils/settings';
import { getTotalDuration, getClipForGlobalTime } from './utils/stitch';
import { formatTime, setGlobalVideoDuration } from './utils/time';
import {
  savePresentationToStorage,
  savePresentationMetadata,
  getAllPresentationsFromStorage,
  loadPresentationFromStorage,
  deletePresentationFromStorage,
} from './utils/storage';
import { captureVideoFrame, generateThumbnailFromBlob } from './utils/capture';

// Maximum video import limit: 40 minutes
const MAX_VIDEO_DURATION_MINUTES = 40;
const MAX_VIDEO_DURATION_SECONDS = MAX_VIDEO_DURATION_MINUTES * 60; // 2400 seconds

export function App() {
  // Tabs & Active View State ('home' or tab.id)
  const [tabs, setTabs] = useState<PresentationTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('home');

  // Presentation Mode & Notifications
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // App Settings & Preferences
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Saved presentations list from IndexedDB
  const [savedPresentations, setSavedPresentations] = useState<SavedPresentation[]>([]);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return settings.theme || (localStorage.getItem('vts-theme') as 'dark' | 'light') || 'dark';
  });

  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      if (newSettings.theme && newSettings.theme !== prev.theme) {
        setTheme(newSettings.theme);
        localStorage.setItem('vts-theme', newSettings.theme);
      }
      return updated;
    });
  }, []);

  const handleResetSettings = useCallback(() => {
    const defaults = { ...DEFAULT_SETTINGS };
    saveSettings(defaults);
    setSettings(defaults);
    setTheme(defaults.theme);
    localStorage.setItem('vts-theme', defaults.theme);
  }, []);

  useEffect(() => {
    if (window.electronAPI?.isElectron) {
      document.documentElement.classList.add('in-electron');
      window.electronAPI.setTheme(theme);
    }
  }, [theme]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimersRef = useRef<Map<string, number>>(new Map());

  // Show auto-dismiss toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  // Refresh saved presentations from storage
  const refreshSavedPresentations = useCallback(async () => {
    try {
      const list = await getAllPresentationsFromStorage();
      setSavedPresentations(list);
    } catch (e) {
      console.error('Failed to load presentations from storage', e);
    }
  }, []);

  useEffect(() => {
    void refreshSavedPresentations();
  }, [refreshSavedPresentations]);

  // Helper to extract duration from video file
  const getVideoDuration = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        resolve(tempVideo.duration || 0);
      };
      tempVideo.onerror = () => resolve(0);
    });
  };

  // Currently active tab object
  const activeTab = useMemo(() => {
    if (activeTabId === 'home') return null;
    return tabs.find((t) => t.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  // Synchronize global video duration for formatTime and parseTimeToSeconds
  useEffect(() => {
    if (activeTab && activeTab.duration !== undefined && activeTab.duration > 0) {
      setGlobalVideoDuration(activeTab.duration);
    }
  }, [activeTab?.duration]);

  // Auto-save debounce per tab (optional via settings)
  const triggerAutoSaveForTab = useCallback((
    tabId: string,
    updatedScenes: SceneStop[],
    updatedClips: VideoClip[],
    updatedFileName: string | null,
    updatedDuration: number
  ) => {
    if (!settings.autoSaveEnabled) {
      // Auto-save is disabled: mark tab as having unsaved changes
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, saveStatus: 'unsaved' } : t))
      );
      return;
    }

    const existing = autoSaveTimersRef.current.get(tabId);
    if (existing) {
      clearTimeout(existing);
    }

    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, saveStatus: 'saving' } : t))
    );

    const debounceMs = Math.max(300, (settings.autoSaveInterval || 1.2) * 1000);

    const timer = window.setTimeout(async () => {
      try {
        let thumbnail = '';
        if (videoRef.current && videoRef.current.videoWidth > 0 && activeTabId === tabId) {
          thumbnail = captureVideoFrame(videoRef.current);
        }

        const presUpdate: SavedPresentation = {
          id: tabId,
          name: updatedFileName || 'Untitled Presentation',
          updatedAt: Date.now(),
          clipNames: updatedClips.length > 0 ? updatedClips.map((c) => c.name) : (updatedFileName ? [updatedFileName] : []),
          scenes: updatedScenes,
          totalDuration: updatedDuration,
          thumbnail: thumbnail || undefined,
        };

        await savePresentationMetadata(presUpdate);
        await refreshSavedPresentations();

        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, saveStatus: 'saved' } : t))
        );
      } catch (e) {
        console.error('Auto-save error:', e);
        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, saveStatus: 'unsaved' } : t))
        );
      }
    }, debounceMs);

    autoSaveTimersRef.current.set(tabId, timer);
  }, [activeTabId, refreshSavedPresentations, settings.autoSaveEnabled, settings.autoSaveInterval]);

  // Update active tab state helper
  const updateActiveTab = useCallback((updater: (prevTab: PresentationTab) => PresentationTab) => {
    if (activeTabId === 'home') return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? updater(t) : t))
    );
  }, [activeTabId]);

  // Switch to a tab
  const handleSelectTab = useCallback((tabId: string) => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    setTabs((prev) => prev.map((t) => ({ ...t, isPlaying: false })));
    setActiveTabId(tabId);
  }, []);

  // Go to Home page
  const handleGoToHome = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    setTabs((prev) => prev.map((t) => ({ ...t, isPlaying: false })));
    setActiveTabId('home');
  }, []);

  // Close a tab
  const handleCloseTab = useCallback((tabId: string) => {
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (tabToClose?.videoUrl && tabToClose.videoUrl.startsWith('blob:')) {
      const otherUsingSameUrl = tabs.some(
        (t) => t.id !== tabId && t.videoUrl === tabToClose.videoUrl
      );
      if (!otherUsingSameUrl) {
        try {
          URL.revokeObjectURL(tabToClose.videoUrl);
        } catch {
          // Ignore
        }
      }
    }

    if (activeTabId === tabId) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      const idx = tabs.findIndex((t) => t.id === tabId);
      const remaining = tabs.filter((t) => t.id !== tabId);
      if (remaining.length > 0) {
        const nextIdx = Math.max(0, Math.min(idx, remaining.length - 1));
        setActiveTabId(remaining[nextIdx].id);
      } else {
        setActiveTabId('home');
      }
    }
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
  }, [activeTabId, tabs]);

  // Open file dialog when user clicks "New" or "+"
  const handleTriggerNewPresentation = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Import video file into a new tab
  const handleOpenVideoFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    const clipDuration = await getVideoDuration(url);

    // Duration limit check: Max 40 minutes
    if (clipDuration > MAX_VIDEO_DURATION_SECONDS) {
      URL.revokeObjectURL(url);
      showToast(
        `Video duration (${formatTime(clipDuration, false)}) exceeds the 40-minute limit. Please select a shorter video.`
      );
      return;
    }

    const newProjectId = `pres-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const firstClip: VideoClip = {
      id: `clip-${Date.now()}`,
      name: file.name,
      url,
      duration: clipDuration,
      file,
    };

    const firstScene: SceneStop = {
      id: `scene-${Date.now()}`,
      name: 'Scene 1: Opening',
      timestamp: 0,
    };

    let thumbnail = '';
    try {
      thumbnail = await generateThumbnailFromBlob(file);
    } catch {
      // Ignored
    }

    const initialPres: SavedPresentation = {
      id: newProjectId,
      name: cleanName,
      updatedAt: Date.now(),
      clipNames: [file.name],
      scenes: [firstScene],
      totalDuration: clipDuration,
      thumbnail: thumbnail || undefined,
    };

    try {
      await savePresentationToStorage(initialPres, [firstClip]);
      await refreshSavedPresentations();
    } catch (e) {
      console.error('Failed initial save:', e);
    }

    const newTab: PresentationTab = {
      id: newProjectId,
      projectId: newProjectId,
      title: cleanName,
      fileName: cleanName,
      videoUrl: url,
      clips: [firstClip],
      scenes: [firstScene],
      selectedSceneId: firstScene.id,
      currentTime: 0,
      duration: clipDuration,
      isPlaying: false,
      saveStatus: 'saved',
    };

    // Pause any playing tab
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }

    setTabs((prev) => [...prev.map((t) => ({ ...t, isPlaying: false })), newTab]);
    setActiveTabId(newTab.id);
    showToast(`Opened "${cleanName}" in new tab.`);
  };

  // Open saved presentation from Home page
  const handleOpenSavedProject = async (project: SavedPresentation) => {
    // If already open in a tab, switch directly to it
    const existing = tabs.find((t) => t.projectId === project.id);
    if (existing) {
      handleSelectTab(existing.id);
      showToast(`Switched to "${project.name}".`);
      return;
    }

    try {
      const result = await loadPresentationFromStorage(project.id);
      const clips = result?.clips || [];
      const videoUrl = result?.videoUrl || (clips[0]?.url ?? '');
      const scenes = result?.presentation.scenes || project.scenes;
      const totalDur = result?.presentation.totalDuration || project.totalDuration || (clips[0]?.duration ?? 0);

      const loadedTab: PresentationTab = {
        id: project.id,
        projectId: project.id,
        title: project.name,
        fileName: project.name,
        videoUrl: videoUrl || null,
        clips,
        scenes,
        selectedSceneId: scenes[0]?.id || null,
        currentTime: 0,
        duration: totalDur,
        isPlaying: false,
        saveStatus: 'saved',
      };

      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }

      setTabs((prev) => [...prev.map((t) => ({ ...t, isPlaying: false })), loadedTab]);
      setActiveTabId(loadedTab.id);
      showToast(`Opened "${project.name}".`);
    } catch (err) {
      console.error('Failed to load presentation:', err);
      showToast('Error loading presentation video');
    }
  };

  // Delete saved presentation
  const handleDeleteSavedProject = async (id: string) => {
    try {
      await deletePresentationFromStorage(id);
      await refreshSavedPresentations();
      // If open in a tab, close it
      const openTab = tabs.find((t) => t.projectId === id);
      if (openTab) {
        handleCloseTab(openTab.id);
      }
      showToast('Presentation deleted.');
    } catch (err) {
      console.error('Failed to delete presentation:', err);
    }
  };

  // Play / Pause toggle in editor
  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        updateActiveTab((tab) => ({ ...tab, isPlaying: true }));
      }).catch(() => {});
    } else {
      videoRef.current.pause();
      const currentLocal = videoRef.current.currentTime;
      let accumulated = 0;
      if (activeTab && activeTab.clips.length > 0) {
        const { clipStartTime } = getClipForGlobalTime(activeTab.clips, activeTab.currentTime);
        accumulated = clipStartTime;
      }
      const actualTime = accumulated + currentLocal;
      updateActiveTab((tab) => ({ ...tab, isPlaying: false, currentTime: actualTime }));
    }
  }, [updateActiveTab, activeTab]);

  // Seek video
  const handleSeek = useCallback((time: number) => {
    if (!activeTab) return;
    const totalDur = activeTab.duration || (videoRef.current?.duration ?? 0);
    const clamped = Math.max(0, Math.min(time, totalDur || time));
    updateActiveTab((tab) => ({ ...tab, currentTime: clamped }));

    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  }, [activeTab, updateActiveTab]);

  // Undo / Redo history for scene stops
  const [undoStack, setUndoStack] = useState<SceneStop[][]>([]);
  const [redoStack, setRedoStack] = useState<SceneStop[][]>([]);

  // Clear undo/redo stacks when switching active tabs
  useEffect(() => {
    setUndoStack((prev) => (prev.length > 0 ? [] : prev));
    setRedoStack((prev) => (prev.length > 0 ? [] : prev));
  }, [activeTabId]);

  const recordUndoCheckpoint = useCallback((scenes: SceneStop[]) => {
    setUndoStack((prev) => [...prev.slice(-30), scenes]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (!activeTab || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, activeTab.scenes]);
    updateActiveTab((tab) => ({
      ...tab,
      scenes: previous,
      selectedSceneId: previous.some((s) => s.id === tab.selectedSceneId)
        ? tab.selectedSceneId
        : (previous[0]?.id ?? null),
    }));
    triggerAutoSaveForTab(activeTab.id, previous, activeTab.clips, activeTab.fileName, activeTab.duration);
  }, [activeTab, undoStack, updateActiveTab, triggerAutoSaveForTab]);

  const handleRedo = useCallback(() => {
    if (!activeTab || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, activeTab.scenes]);
    updateActiveTab((tab) => ({
      ...tab,
      scenes: next,
      selectedSceneId: next.some((s) => s.id === tab.selectedSceneId)
        ? tab.selectedSceneId
        : (next[0]?.id ?? null),
    }));
    triggerAutoSaveForTab(activeTab.id, next, activeTab.clips, activeTab.fileName, activeTab.duration);
  }, [activeTab, redoStack, updateActiveTab, triggerAutoSaveForTab]);

  // Add scene stop
  const handleAddStop = useCallback(() => {
    if (!activeTab) return;
    const time = videoRef.current ? videoRef.current.currentTime : activeTab.currentTime;

    if (settings.autoPauseOnAddStop && activeTab.isPlaying) {
      handleTogglePlay();
    }

    recordUndoCheckpoint(activeTab.scenes);

    const frameImage = videoRef.current ? captureVideoFrame(videoRef.current) : undefined;
    const prefix = settings.defaultScenePrefix?.trim() || 'Slide';
    const newScene: SceneStop = {
      id: `scene-${Date.now()}`,
      name: `${prefix} ${activeTab.scenes.length + 1}`,
      timestamp: parseFloat(time.toFixed(2)),
      capturedImage: frameImage,
      isLooping: false,
    };

    const updatedScenes = [...activeTab.scenes, newScene].sort((a, b) => a.timestamp - b.timestamp);
    updateActiveTab((tab) => ({
      ...tab,
      scenes: updatedScenes,
      selectedSceneId: newScene.id,
    }));

    triggerAutoSaveForTab(activeTab.id, updatedScenes, activeTab.clips, activeTab.fileName, activeTab.duration);
  }, [activeTab, updateActiveTab, triggerAutoSaveForTab, settings.defaultScenePrefix, settings.autoPauseOnAddStop, handleTogglePlay, recordUndoCheckpoint]);

  // Delete scene stop
  const handleDeleteScene = useCallback((sceneId: string) => {
    if (!activeTab) return;
    recordUndoCheckpoint(activeTab.scenes);

    const updatedScenes = activeTab.scenes.filter((s) => s.id !== sceneId);
    const nextSelectedId = activeTab.selectedSceneId === sceneId ? null : activeTab.selectedSceneId;

    updateActiveTab((tab) => ({
      ...tab,
      scenes: updatedScenes,
      selectedSceneId: nextSelectedId,
    }));

    triggerAutoSaveForTab(activeTab.id, updatedScenes, activeTab.clips, activeTab.fileName, activeTab.duration);
  }, [activeTab, updateActiveTab, triggerAutoSaveForTab, recordUndoCheckpoint]);

  // Update scene stop
  const handleUpdateScene = useCallback((sceneId: string, updates: Partial<SceneStop>) => {
    if (!activeTab) return;
    // Only record undo when timestamp or name changes
    if (updates.timestamp !== undefined || updates.name !== undefined) {
      recordUndoCheckpoint(activeTab.scenes);
    }

    const updatedScenes = activeTab.scenes
      .map((s) => (s.id === sceneId ? { ...s, ...updates } : s))
      .sort((a, b) => a.timestamp - b.timestamp);

    updateActiveTab((tab) => ({
      ...tab,
      scenes: updatedScenes,
    }));

    triggerAutoSaveForTab(activeTab.id, updatedScenes, activeTab.clips, activeTab.fileName, activeTab.duration);
  }, [activeTab, updateActiveTab, triggerAutoSaveForTab, recordUndoCheckpoint]);

  // Stitch clip into active tab
  const handleAddStitchClip = useCallback(async (file: File) => {
    if (!activeTab) return;
    const url = URL.createObjectURL(file);
    const clipDur = await getVideoDuration(url);

    if (activeTab.duration + clipDur > MAX_VIDEO_DURATION_SECONDS) {
      URL.revokeObjectURL(url);
      showToast(
        `Cannot stitch "${file.name}": Total presentation duration would exceed 40 minutes.`
      );
      return;
    }

    const newClip: VideoClip = {
      id: `clip-${Date.now()}`,
      name: file.name,
      url,
      duration: clipDur,
      file,
    };

    const updatedClips = [...activeTab.clips, newClip];
    const newTotal = getTotalDuration(updatedClips);

    let startOfNewClip = 0;
    for (let i = 0; i < activeTab.clips.length; i++) {
      startOfNewClip += activeTab.clips[i].duration || 0;
    }

    const newScene: SceneStop = {
      id: `scene-${Date.now()}`,
      name: `Scene ${activeTab.scenes.length + 1} (${file.name})`,
      timestamp: parseFloat(startOfNewClip.toFixed(2)),
    };
    const updatedScenes = [...activeTab.scenes, newScene];

    updateActiveTab((tab) => ({
      ...tab,
      clips: updatedClips,
      duration: newTotal,
      scenes: updatedScenes,
      saveStatus: 'saving',
    }));

    const pres: SavedPresentation = {
      id: activeTab.projectId,
      name: activeTab.fileName || 'Untitled Presentation',
      updatedAt: Date.now(),
      clipNames: updatedClips.map((c) => c.name),
      scenes: updatedScenes,
      totalDuration: newTotal,
    };
    await savePresentationToStorage(pres, updatedClips);
    await refreshSavedPresentations();

    updateActiveTab((tab) => ({ ...tab, saveStatus: 'saved' }));
    showToast(`Stitched "${file.name}" into presentation!`);
  }, [activeTab, updateActiveTab, showToast, refreshSavedPresentations]);

  // Remove stitched clip
  const handleRemoveClip = useCallback((clipId: string) => {
    if (!activeTab) return;
    const updatedClips = activeTab.clips.filter((c) => c.id !== clipId);
    const newTotal = getTotalDuration(updatedClips);

    updateActiveTab((tab) => ({
      ...tab,
      clips: updatedClips,
      duration: newTotal,
    }));

    triggerAutoSaveForTab(activeTab.id, activeTab.scenes, updatedClips, activeTab.fileName, newTotal);
  }, [activeTab, updateActiveTab, triggerAutoSaveForTab]);

  // Manual save for active tab
  const handleManualSave = useCallback(async () => {
    if (!activeTab) return;
    let thumbnail = '';
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      thumbnail = captureVideoFrame(videoRef.current);
    }
    if (!thumbnail && activeTab.clips.length > 0 && activeTab.clips[0].file) {
      thumbnail = await generateThumbnailFromBlob(activeTab.clips[0].file);
    }

    const savedPres: SavedPresentation = {
      id: activeTab.projectId,
      name: activeTab.fileName || 'Untitled Presentation',
      updatedAt: Date.now(),
      clipNames: activeTab.clips.length > 0 ? activeTab.clips.map((c) => c.name) : (activeTab.fileName ? [activeTab.fileName] : []),
      scenes: activeTab.scenes,
      totalDuration: activeTab.duration,
      thumbnail: thumbnail || undefined,
    };

    try {
      updateActiveTab((tab) => ({ ...tab, saveStatus: 'saving' }));
      await savePresentationToStorage(savedPres, activeTab.clips);
      await refreshSavedPresentations();
      updateActiveTab((tab) => ({ ...tab, saveStatus: 'saved' }));
      if (settings.showSaveNotifications) {
        showToast(`Presentation "${savedPres.name}" saved!`);
      }
    } catch (err) {
      console.error('Save failed:', err);
      updateActiveTab((tab) => ({ ...tab, saveStatus: 'unsaved' }));
      showToast('Failed to save presentation');
    }
  }, [activeTab, updateActiveTab, refreshSavedPresentations, showToast, settings.showSaveNotifications]);

  // Global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Settings shortcut Ctrl+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // Present F5
      if (e.key === 'F5') {
        e.preventDefault();
        if (activeTab && activeTab.scenes.length > 0 && (activeTab.videoUrl || activeTab.clips.length > 0)) {
          setIsPresentationOpen((prev) => !prev);
        }
        return;
      }

      if (isPresentationOpen) return;

      // Only process editor shortcuts when inside an active tab
      if (!activeTab) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        void handleManualSave();
        return;
      }

      // Undo / Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete selected stop with Delete or Backspace (when not in an input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeTab.selectedSceneId) {
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          handleDeleteScene(activeTab.selectedSceneId);
          return;
        }
      }

      if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      if (e.key === 'k' || e.key === 'K' || (!e.ctrlKey && !e.metaKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        handleAddStop();
        return;
      }

      // Frame tweaker hotkeys with customizable steps from settings
      if (e.key === '[') {
        e.preventDefault();
        handleSeek(Math.max(0, activeTab.currentTime - settings.smallTweakStep));
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        handleSeek(Math.min(activeTab.duration || Infinity, activeTab.currentTime + settings.smallTweakStep));
        return;
      }
      if (e.key === '{') {
        e.preventDefault();
        handleSeek(Math.max(0, activeTab.currentTime - settings.largeTweakStep));
        return;
      }
      if (e.key === '}') {
        e.preventDefault();
        handleSeek(Math.min(activeTab.duration || Infinity, activeTab.currentTime + settings.largeTweakStep));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPresentationOpen,
    activeTab,
    handleTogglePlay,
    handleAddStop,
    handleDeleteScene,
    handleUndo,
    handleRedo,
    handleSeek,
    handleManualSave,
    settings.smallTweakStep,
    settings.largeTweakStep,
  ]);

  return (
    <div className={`app-shell ${theme}`} data-theme={theme}>
      {/* Hidden File Picker Input for "New" and "+" */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleOpenVideoFile(file);
            e.target.value = '';
          }
        }}
        accept="video/*"
        style={{ display: 'none' }}
      />

      {/* Top Application Header / Tab Bar */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onGoToHome={handleGoToHome}
        onNewPresentation={handleTriggerNewPresentation}
        activeTab={activeTab}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="app-toast-banner">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSettings={handleResetSettings}
          onClose={() => setIsSettingsOpen(false)}
          savedPresentations={savedPresentations}
          showToast={showToast}
        />
      )}

      {/* Main Workspace */}
      <main className="app-main-workspace">
        {activeTabId === 'home' ? (
          <HomePage
            savedList={savedPresentations}
            onNewPresentation={handleTriggerNewPresentation}
            onOpenProject={handleOpenSavedProject}
            onDeleteProject={handleDeleteSavedProject}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : activeTab ? (
          <VideoPlayer
            key={activeTab.id}
            videoUrl={activeTab.videoUrl}
            videoRef={videoRef}
            clips={activeTab.clips}
            scenes={activeTab.scenes}
            selectedSceneId={activeTab.selectedSceneId}
            currentTime={activeTab.currentTime}
            duration={activeTab.duration}
            isPlaying={activeTab.isPlaying}
            saveStatus={activeTab.saveStatus}
            settings={settings}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onTimeUpdate={(time) => updateActiveTab((tab) => ({ ...tab, currentTime: time }))}
            onDurationChange={(dur) => updateActiveTab((tab) => ({ ...tab, duration: dur }))}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onAddStop={handleAddStop}
            onSelectScene={(scene) => updateActiveTab((tab) => ({ ...tab, selectedSceneId: scene.id }))}
            onUpdateScene={handleUpdateScene}
            onDeleteScene={handleDeleteScene}
            onOpenVideoFile={handleOpenVideoFile}
            onAddStitchClip={handleAddStitchClip}
            onRemoveClip={handleRemoveClip}
            onManualSave={handleManualSave}
            onStartPresentation={() => setIsPresentationOpen(true)}
          />
        ) : null}
      </main>

      {/* Fullscreen Video Presentation Mode */}
      {isPresentationOpen && activeTab && (activeTab.videoUrl || activeTab.clips.length > 0) && activeTab.scenes.length > 0 && (
        <PresentationPreview
          videoUrl={activeTab.videoUrl || (activeTab.clips[0]?.url ?? '')}
          clips={activeTab.clips}
          scenes={activeTab.scenes}
          totalDuration={activeTab.duration}
          settings={settings}
          initialSceneIndex={
            activeTab.selectedSceneId
              ? Math.max(0, activeTab.scenes.findIndex((s) => s.id === activeTab.selectedSceneId))
              : 0
          }
          onUpdateScene={handleUpdateScene}
          onClose={() => setIsPresentationOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
