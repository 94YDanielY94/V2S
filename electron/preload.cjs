const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  setTheme: (theme) => {
    try {
      ipcRenderer.send('set-theme', theme);
    } catch {
      // Ignore
    }
  },
  minimizeWindow: () => {
    try {
      ipcRenderer.send('window-minimize');
    } catch {
      // Ignore
    }
  },
  maximizeWindow: () => {
    try {
      ipcRenderer.send('window-maximize');
    } catch {
      // Ignore
    }
  },
  closeWindow: () => {
    try {
      ipcRenderer.send('window-close');
    } catch {
      // Ignore
    }
  },
  isMaximized: () => {
    try {
      return ipcRenderer.invoke('window-is-maximized');
    } catch {
      return Promise.resolve(false);
    }
  },
  onMaximizeChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window-maximize-changed', handler);
    return () => {
      ipcRenderer.removeListener('window-maximize-changed', handler);
    };
  },
});
