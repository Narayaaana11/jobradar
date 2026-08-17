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

// IPC Handler: Scrape live chat/group/channel titles directly from active WhatsApp & Telegram sessions
ipcMain.handle('scrape-social-chats', async () => {
  const discovered = [];

  // 1. Live scrape from Telegram Web window if open
  if (telegramWindow && !telegramWindow.isDestroyed()) {
    try {
      const tgChats = await telegramWindow.webContents.executeJavaScript(`
        (() => {
          const chats = [];
          const seen = new Set();
          
          // Telegram Web K & A selectors
          const selectors = [
            '.chatlist-chat .peer-title',
            '.ListItem .ListItem-title',
            '.chat-item .title',
            '.user-caption .dialog-title',
            '.chat-title',
            '.ListItem-button .title',
            'a.chatlist-chat',
            '.dialog-title .peer-title',
            '.sidebar-header .chat-info .title',
            '.chat-list .chat-title'
          ];

          document.querySelectorAll(selectors.join(', ')).forEach((el) => {
            const name = el.textContent ? el.textContent.trim() : '';
            if (name && name.length > 1 && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase());
              const isChannel =
                name.toLowerCase().includes('channel') ||
                name.toLowerCase().includes('updates') ||
                name.toLowerCase().includes('jobs') ||
                name.toLowerCase().includes('campus') ||
                name.toLowerCase().includes('hunt') ||
                name.toLowerCase().includes('careers') ||
                name.toLowerCase().includes('freshers');

              chats.push({
                platform: 'telegram',
                type: isChannel ? 'channel' : 'group',
                name: name,
                enabled: true
              });
            }
          });

          return chats;
        })()
      `);

      if (Array.isArray(tgChats) && tgChats.length > 0) {
        discovered.push(...tgChats);
      }
    } catch (e) {
      console.error('Error scraping live Telegram session:', e);
    }
  }

  // 2. Live scrape from WhatsApp Web window if open
  if (whatsappWindow && !whatsappWindow.isDestroyed()) {
    try {
      const waChats = await whatsappWindow.webContents.executeJavaScript(`
        (() => {
          const chats = [];
          const seen = new Set();

          // WhatsApp Web chat list, channel (newsletter), and communities selectors
          const selectors = [
            'span[data-testid="cell-frame-title"]',
            'span[data-testid="chat-title"]',
            'div[data-testid="cell-frame-container"] span[title]',
            '#pane-side span[title]',
            'div[data-testid="newsletter-list"] span[title]',
            'div[data-testid="newsletter-list"] span[dir="auto"]',
            'div[role="listitem"] span[title]',
            'div[role="listitem"] span[dir="auto"]',
            'div[tabindex="-1"] span[title]',
            'div._ak8q span',
            'div._ak72 span',
            'span._ao3e'
          ];

          document.querySelectorAll(selectors.join(', ')).forEach((el) => {
            const name = (el.getAttribute('title') || el.textContent || '').trim();
            // Filter out timestamps, single numbers, unread counters, UI labels
            if (
              name &&
              name.length > 2 &&
              !seen.has(name.toLowerCase()) &&
              !/^[0-9]+(:[0-9]+)?\\s*(am|pm)?$/i.test(name) &&
              !/^(yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|[0-9]{1,2}\\/[0-9]{1,2}\\/[0-9]{2,4})$/i.test(name) &&
              !['chats', 'channels', 'communities', 'status', 'discover channels', 'new community', 'view all', 'announcements'].includes(name.toLowerCase())
            ) {
              seen.add(name.toLowerCase());
              const isChannel =
                name.toLowerCase().includes('channel') ||
                name.toLowerCase().includes('drive') ||
                name.toLowerCase().includes('alert') ||
                name.toLowerCase().includes('jobs') ||
                name.toLowerCase().includes('tech') ||
                name.toLowerCase().includes('hiring') ||
                name.toLowerCase().includes('freshers') ||
                name.toLowerCase().includes('campus');

              chats.push({
                platform: 'whatsapp',
                type: isChannel ? 'channel' : 'group',
                name: name,
                enabled: true
              });
            }
          });

          return chats;
        })()
      `);

      if (Array.isArray(waChats) && waChats.length > 0) {
        discovered.push(...waChats);
      }
    } catch (e) {
      console.error('Error scraping live WhatsApp session:', e);
    }
  }

  return discovered;
});

// IPC Handler: Intercept recent message texts from active WhatsApp & Telegram sessions with date tracking
ipcMain.handle('intercept-channel-messages', async (_event, { daysBack = 7 }) => {
  const intercepted = [];
  const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  const now = Date.now();

  // 1. Scrape message text elements & list previews from active WhatsApp Web window
  if (whatsappWindow && !whatsappWindow.isDestroyed()) {
    try {
      const waMessages = await whatsappWindow.webContents.executeJavaScript(`
        (() => {
          const results = [];
          const seen = new Set();
          const now = Date.now();

          // Helper to parse WhatsApp timestamp strings (e.g. "10:24 pm", "Yesterday", "8/15/2026", "Saturday")
          function parseWaTime(timeStr, index) {
            if (!timeStr) return now - (index * 20 * 60 * 1000);
            const lower = timeStr.toLowerCase().trim();
            if (lower === 'yesterday') return now - (24 * 60 * 60 * 1000);
            if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(lower)) {
              return now - (3 * 24 * 60 * 60 * 1000);
            }
            if (/\\d{1,2}:\\d{2}\\s*(am|pm)?/i.test(lower)) {
              return now - (index * 15 * 60 * 1000);
            }
            const dateParsed = Date.parse(timeStr);
            if (!isNaN(dateParsed)) return dateParsed;
            return now - (index * 25 * 60 * 1000);
          }

          // A. Scrape all Channel & Chat Preview Snippets from WhatsApp list items
          const listItems = document.querySelectorAll(
            'div[role="listitem"], div[data-testid="cell-frame-container"], div[data-testid="newsletter-list"] > div, #pane-side > div > div > div > div'
          );

          listItems.forEach((item, index) => {
            // Find title / channel name
            const titleEl = item.querySelector('span[data-testid="cell-frame-title"], span[data-testid="chat-title"], span[dir="auto"], span[title]');
            const channelName = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim() : '';

            // Find last message preview snippet
            const snippetEl = item.querySelector('span[title]:not([data-testid="cell-frame-title"]), span.x1rg5ohu, span[data-testid="last-msg-status"] + span, div._ak8k span, div._ak8l span');
            const previewText = snippetEl ? snippetEl.innerText.trim() : '';

            // Find time element
            const timeEl = item.querySelector('div[data-testid="cell-frame-meta"] span, div._ak8i, span[dir="auto"]');
            const timeStr = timeEl ? timeEl.textContent.trim() : '';
            const msgTime = parseWaTime(timeStr, index);

            // Filter valid text
            const fullText = previewText || (item.innerText ? item.innerText.replace(channelName, '').trim() : '');
            if (
              channelName &&
              channelName.length > 2 &&
              fullText &&
              fullText.length > 20 &&
              !seen.has(fullText.substring(0, 60).toLowerCase())
            ) {
              seen.add(fullText.substring(0, 60).toLowerCase());
              results.push({
                platform: 'whatsapp',
                channelName,
                text: fullText,
                timestamp: new Date(msgTime).toISOString(),
                timestampMs: msgTime
              });
            }
          });

          // B. Scrape deep messages from the currently active opened conversation (if any)
          const msgEls = document.querySelectorAll('div.message-in, div.message-out, div[data-testid="msg-container"], div._amk4');
          const headerEl = document.querySelector('header span[data-testid="conversation-info-header-chat-title"], header span[title]');
          const currentChatName = headerEl ? (headerEl.getAttribute('title') || headerEl.textContent || 'WhatsApp Chat').trim() : 'WhatsApp Group';

          msgEls.forEach((el, index) => {
            const textEl = el.querySelector('.selectable-text, span._ao3e, div.copyable-text');
            const text = textEl ? textEl.innerText.trim() : el.innerText.trim();

            if (text && text.length > 25 && !seen.has(text.substring(0, 60).toLowerCase())) {
              seen.add(text.substring(0, 60).toLowerCase());
              const timeEl = el.querySelector('span[data-testid="msg-meta"], div[data-pre-plain-text]');
              let msgTime = now - (index * 15 * 60 * 1000);

              if (timeEl && timeEl.getAttribute('data-pre-plain-text')) {
                const rawMeta = timeEl.getAttribute('data-pre-plain-text');
                const timeMatch = rawMeta.match(/\\[([^\\]]+)\\]/);
                if (timeMatch) {
                  const parsed = Date.parse(timeMatch[1]);
                  if (!isNaN(parsed)) msgTime = parsed;
                }
              }

              results.push({
                platform: 'whatsapp',
                channelName: currentChatName,
                text,
                timestamp: new Date(msgTime).toISOString(),
                timestampMs: msgTime
              });
            }
          });

          return results;
        })()
      `);

      if (Array.isArray(waMessages)) {
        intercepted.push(...waMessages.filter(m => m.timestampMs >= cutoffTime));
      }
    } catch (e) {
      console.error('Error intercepting WhatsApp messages:', e);
    }
  }

  // 2. Scrape message text elements & list previews from active Telegram Web window
  if (telegramWindow && !telegramWindow.isDestroyed()) {
    try {
      const tgMessages = await telegramWindow.webContents.executeJavaScript(`
        (() => {
          const results = [];
          const seen = new Set();
          const now = Date.now();

          // A. Scrape chat list previews
          const chatItems = document.querySelectorAll('.chatlist-chat, .ListItem, .chat-item');
          chatItems.forEach((item, index) => {
            const titleEl = item.querySelector('.peer-title, .title, .ListItem-title, .chat-title');
            const channelName = titleEl ? titleEl.textContent.trim() : '';

            const subEl = item.querySelector('.subtitle, .dialog-subtitle, .ListItem-subtitle, .last-message, .message');
            const previewText = subEl ? subEl.innerText.trim() : '';

            if (channelName && previewText && previewText.length > 20 && !seen.has(previewText.substring(0, 60).toLowerCase())) {
              seen.add(previewText.substring(0, 60).toLowerCase());
              const msgTime = now - (index * 25 * 60 * 1000);
              results.push({
                platform: 'telegram',
                channelName,
                text: previewText,
                timestamp: new Date(msgTime).toISOString(),
                timestampMs: msgTime
              });
            }
          });

          // B. Scrape open conversation bubbles
          const headerEl = document.querySelector('.chat-info .title, .topbar .peer-title, .user-caption .dialog-title');
          const currentChatName = headerEl ? headerEl.textContent.trim() : 'Telegram Channel';

          const msgEls = document.querySelectorAll('.message, .Message, .bubble, .im_message_body');
          msgEls.forEach((el, index) => {
            const textEl = el.querySelector('.text-content, .message-content, .copyable-area, .im_message_text');
            const text = textEl ? textEl.innerText.trim() : el.innerText.trim();

            if (text && text.length > 25 && !seen.has(text.substring(0, 60).toLowerCase())) {
              seen.add(text.substring(0, 60).toLowerCase());
              const msgTime = now - (index * 15 * 60 * 1000);
              results.push({
                platform: 'telegram',
                channelName: currentChatName,
                text,
                timestamp: new Date(msgTime).toISOString(),
                timestampMs: msgTime
              });
            }
          });

          return results;
        })()
      `);

      if (Array.isArray(tgMessages)) {
        intercepted.push(...tgMessages.filter(m => m.timestampMs >= cutoffTime));
      }
    } catch (e) {
      console.error('Error intercepting Telegram messages:', e);
    }
  }

  return intercepted;
});

// IPC Handler: Open External URL safely
ipcMain.handle('open-external-url', async (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// IPC Handler: Save Text/LaTeX File with Native Windows Dialog
ipcMain.handle('save-text-file', async (_event, { filename, content, extension = 'tex', filterName = 'LaTeX Document' }) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${filterName}`,
    defaultPath: filename,
    filters: [{ name: filterName, extensions: [extension, 'txt'] }],
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, canceled: true };
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


