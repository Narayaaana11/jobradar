const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

let mainWindow = null;

const appIcon = process.platform === 'win32' && fs.existsSync(path.join(__dirname, 'icon.ico'))
  ? path.join(__dirname, 'icon.ico')
  : path.join(__dirname, 'icon.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    title: 'JobRadar — Autonomous Career Agent',
    icon: appIcon,
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

// IPC Handler: Open Real WhatsApp Web Companion Window for genuine QR scan & live listening
let whatsappWindow = null;
ipcMain.handle('open-whatsapp-web-window', async () => {
  if (whatsappWindow && !whatsappWindow.isDestroyed()) {
    whatsappWindow.focus();
    return { success: true };
  }

  whatsappWindow = new BrowserWindow({
    width: 1100,
    height: 850,
    title: 'JobRadar — WhatsApp Web Companion & Live Listener',
    icon: appIcon,
    backgroundColor: '#111b21',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:whatsapp_session',
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  whatsappWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  whatsappWindow.loadURL('https://web.whatsapp.com');

  whatsappWindow.on('closed', () => {
    whatsappWindow = null;
  });

  return { success: true };
});

// IPC Handler: Open Real Telegram Web Companion Window for genuine QR scan & live listening
let telegramWindow = null;
ipcMain.handle('open-telegram-web-window', async () => {
  if (telegramWindow && !telegramWindow.isDestroyed()) {
    telegramWindow.focus();
    return { success: true };
  }

  telegramWindow = new BrowserWindow({
    width: 1100,
    height: 850,
    title: 'JobRadar — Telegram Web Companion & Live Listener',
    icon: appIcon,
    backgroundColor: '#17212b',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:telegram_session',
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  telegramWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  telegramWindow.loadURL('https://web.telegram.org/k/');

  telegramWindow.on('closed', () => {
    telegramWindow = null;
  });

  return { success: true };
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
ipcMain.handle('call-llm-api', async (_event, { endpoint, headers, body, method = 'POST' }) => {
  try {
    const fetchOptions = {
      method,
      headers: headers || { 'Content-Type': 'application/json' },
    };
    if (method !== 'GET' && body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const res = await fetch(endpoint, fetchOptions);

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

// IPC Handler: Native Zero-CORS S3 PutObject
ipcMain.handle('s3-put-object', async (_event, { config, key, body, contentType }) => {
  try {
    const client = new S3Client({
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    const bytes = typeof body === 'string' ? Buffer.from(body, 'utf-8') : Buffer.from(body);

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType || 'application/json',
    });

    await client.send(command);
    return {
      success: true,
      url: `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'S3 PutObject failed',
    };
  }
});

// IPC Handler: Native Zero-CORS S3 Sync All
ipcMain.handle('s3-sync-all', async (_event, { config, jobs, queue, profile, masterResume }) => {
  try {
    const client = new S3Client({
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    // 1. data/jobs.json
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: 'data/jobs.json',
      Body: Buffer.from(JSON.stringify(jobs, null, 2), 'utf-8'),
      ContentType: 'application/json',
    }));

    // 2. data/queue.json
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: 'data/queue.json',
      Body: Buffer.from(JSON.stringify(queue, null, 2), 'utf-8'),
      ContentType: 'application/json',
    }));

    // 3. data/profile.json & data/master_resume.md
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: 'data/profile.json',
      Body: Buffer.from(JSON.stringify(profile, null, 2), 'utf-8'),
      ContentType: 'application/json',
    }));

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: 'data/master_resume.md',
      Body: Buffer.from(masterResume || '', 'utf-8'),
      ContentType: 'text/markdown',
    }));

    // 4. data/backup_latest.json
    const backupPayload = {
      jobs,
      queue,
      profile,
      masterResume,
      syncedAt: new Date().toISOString(),
    };
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: 'data/backup_latest.json',
      Body: Buffer.from(JSON.stringify(backupPayload, null, 2), 'utf-8'),
      ContentType: 'application/json',
    }));

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'S3 Sync All failed',
    };
  }
});

// IPC Handler: Native Zero-CORS S3 Pull All
ipcMain.handle('s3-pull-all', async (_event, { config }) => {
  try {
    const client = new S3Client({
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: 'data/backup_latest.json',
    });

    const res = await client.send(command);
    const text = await res.Body.transformToString();
    const data = JSON.parse(text);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'S3 Pull All failed' };
  }
});


