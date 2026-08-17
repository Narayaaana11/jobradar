const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    title: 'JobRadar — Autonomous Career Agent',
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Make external links open in user's default browser (Chrome/Edge)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load Vite dev server if running locally, otherwise load built index.html
  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.PROD);
  const devUrl = 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      // Fallback if dev server is not on port 5173
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

// IPC Handler: Open External URL safely
ipcMain.handle('open-external-url', async (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// IPC Handler: Save PDF to disk with Native Windows Dialog
ipcMain.handle('save-pdf-file', async (_event, { filename, base64Data }) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save ATS Tailored Resume PDF',
    defaultPath: filename,
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
  });

  if (filePath) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, canceled: true };
});

// IPC Handler: Native Zero-CORS LLM API Execution
ipcMain.handle('call-llm-api', async (_event, { endpoint, headers, body }) => {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const status = res.status;
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }

    if (!res.ok) {
      return {
        success: false,
        status,
        error: data?.error?.message || data?.error || `HTTP ${status}: ${text || 'Request failed'}`,
      };
    }

    return {
      success: true,
      status,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Native network request failed',
    };
  }
});

