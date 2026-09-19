const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'Bulletpoint',
    backgroundColor: '#181818',
    frame: false, // Frameless window so navigation and window controls are in one unified bar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  win.on('maximize', () => {
    try {
      win.webContents.send('window-maximize-changed', true);
    } catch {
      // Ignored
    }
  });

  win.on('unmaximize', () => {
    try {
      win.webContents.send('window-maximize-changed', false);
    } catch {
      // Ignored
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (!app.isPackaged) {
    win.loadURL(devServerUrl).catch(() => {
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window Control IPC listeners
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('window-is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isMaximized() : false;
});

ipcMain.on('set-theme', (event, theme) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    try {
      win.setBackgroundColor(theme === 'light' ? '#eeeeee' : '#181818');
    } catch {
      // Ignored
    }
  }
});
