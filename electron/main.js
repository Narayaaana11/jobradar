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

// Centralized Scraper Selectors for Electron Main Process (mirrored from src/app-core/scraperSelectors.ts)
const SCRAPER_SELECTORS = {
  whatsapp: {
    rootContainer: [
      '#pane-side',
      'div[role="listitem"]',
      'div[data-testid="cell-frame-container"]',
      'div[data-testid="chat-list"]',
      'div[data-testid="newsletter-list"]',
      '#app div[tabindex="-1"]',
    ],
    challengeOrLoginIndicators: [
      'div[data-testid="qrcode"]',
      'canvas[aria-label="Scan me!"]',
      'canvas[aria-label*="Scan"]',
      '.landing-wrapper',
      'div[data-testid="intro-title"]',
      'div[data-testid="landing-title"]',
      'div[data-testid="alert-phone-disconnected"]',
    ],
    chatListItems: [
      'div[role="listitem"]',
      'div[data-testid="cell-frame-container"]',
      'div[data-testid="newsletter-list"] > div',
      '#pane-side > div > div > div > div',
      'div._ak72',
      'div._ak8l',
    ],
    chatListTitle: [
      'span[data-testid="cell-frame-title"]',
      'span[data-testid="chat-title"]',
      'span[dir="auto"]',
      'span[title]',
      'div._ak8q span',
    ],
    chatListPreviewSnippet: [
      'span[title]:not([data-testid="cell-frame-title"])',
      'span.x1rg5ohu',
      'span[data-testid="last-msg-status"] + span',
      'div._ak8k span',
      'div._ak8l span',
      'span._ao3e',
    ],
    chatListTimestamp: [
      'div[data-testid="cell-frame-meta"] span',
      'div._ak8i',
      'span[dir="auto"]',
    ],
    activeConversationHeader: [
      'header span[data-testid="conversation-info-header-chat-title"]',
      'header span[title]',
      'header div[role="button"] span',
    ],
    activeConversationMessages: [
      'div.message-in',
      'div.message-out',
      'div[data-testid="msg-container"]',
      'div._amk4',
    ],
    activeConversationText: [
      '.selectable-text',
      'span._ao3e',
      'div.copyable-text',
      'div._akbu span',
    ],
    activeConversationTime: [
      'span[data-testid="msg-meta"]',
      'div[data-pre-plain-text]',
    ],
  },
  telegram: {
    rootContainer: [
      '.chatlist',
      '.chat-list',
      '.ListItem',
      '.chatlist-chat',
      '#middle-column',
      '#column-left',
    ],
    challengeOrLoginIndicators: [
      '.login-header',
      'input[type="tel"]',
      '.qr-container',
      '.auth-form',
      '#auth-pages',
      '.login-form',
    ],
    chatListItems: [
      '.chatlist-chat',
      '.ListItem',
      '.chat-item',
      'a.chatlist-chat',
    ],
    chatListTitle: [
      '.peer-title',
      '.title',
      '.ListItem-title',
      '.chat-title',
      '.dialog-title .peer-title',
    ],
    chatListPreviewSnippet: [
      '.subtitle',
      '.dialog-subtitle',
      '.ListItem-subtitle',
      '.last-message',
      '.message',
    ],
    chatListTimestamp: [
      '.dialog-title-details',
      '.time',
      '.ListItem-meta',
    ],
    activeConversationHeader: [
      '.chat-info .title',
      '.topbar .peer-title',
      '.user-caption .dialog-title',
    ],
    activeConversationMessages: [
      '.message',
      '.Message',
      '.bubble',
      '.im_message_body',
    ],
    activeConversationText: [
      '.text-content',
      '.message-content',
      '.copyable-area',
      '.im_message_text',
    ],
    activeConversationTime: [
      '.message-time',
      '.time',
    ],
  },
};

// IPC Handler: Scrape live chat/group/channel titles directly from active WhatsApp & Telegram sessions
ipcMain.handle('scrape-social-chats', async () => {
  const discovered = [];
  const diagnostics = [];

  // 1. Live scrape from Telegram Web window if open
  if (telegramWindow && !telegramWindow.isDestroyed()) {
    try {
      const tgRes = await telegramWindow.webContents.executeJavaScript(`
        (async () => {
          const chats = [];
          const seen = new Set();
          const diagnostics = [];
          const delay = (ms) => new Promise((res) => setTimeout(res, ms));

          // 1. Check for Challenge / Login Screen
          const challengeSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.challengeOrLoginIndicators)};
          for (const sel of challengeSels) {
            if (document.querySelector(sel)) {
              return {
                circuitBreakerTripped: true,
                reason: 'Telegram Web session presented login/auth challenge screen (' + sel + ').',
                platform: 'telegram',
                chats: [],
                diagnostics: ['Challenge screen detected via ' + sel]
              };
            }
          }

          // 2. Check for Root Container
          const rootSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.rootContainer)};
          let rootFound = false;
          for (const sel of rootSels) {
            if (document.querySelector(sel)) {
              rootFound = true;
              break;
            }
          }
          if (!rootFound) {
            return {
              circuitBreakerTripped: true,
              reason: 'Telegram Web root chatlist container is absent from DOM.',
              platform: 'telegram',
              chats: [],
              diagnostics: ['Root container not found']
            };
          }

          // 3. Query Chat List Elements with randomized micro-delays
          const titleSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.chatListTitle)};
          const elements = document.querySelectorAll(titleSels.join(', '));
          
          if (elements.length === 0) {
            diagnostics.push('Telegram title selectors returned 0 elements.');
          }

          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (i > 0 && i % 4 === 0) {
              await delay(30 + Math.floor(Math.random() * 60));
            }
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
          }

          return { circuitBreakerTripped: false, chats, diagnostics };
        })()
      `);

      if (tgRes?.circuitBreakerTripped) {
        return {
          circuitBreakerTripped: true,
          reason: tgRes.reason,
          platform: 'telegram',
          discovered: []
        };
      }

      if (Array.isArray(tgRes?.chats) && tgRes.chats.length > 0) {
        discovered.push(...tgRes.chats);
      }
      if (Array.isArray(tgRes?.diagnostics)) {
        diagnostics.push(...tgRes.diagnostics);
      }
    } catch (e) {
      console.error('Error scraping live Telegram session:', e);
    }
  }

  // 2. Live scrape from WhatsApp Web window if open
  if (whatsappWindow && !whatsappWindow.isDestroyed()) {
    try {
      const waRes = await whatsappWindow.webContents.executeJavaScript(`
        (async () => {
          const chats = [];
          const seen = new Set();
          const diagnostics = [];
          const delay = (ms) => new Promise((res) => setTimeout(res, ms));

          // 1. Check for Challenge / QR / Login Screen
          const challengeSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.challengeOrLoginIndicators)};
          for (const sel of challengeSels) {
            if (document.querySelector(sel)) {
              return {
                circuitBreakerTripped: true,
                reason: 'WhatsApp Web presented QR code or unauthenticated login screen (' + sel + ').',
                platform: 'whatsapp',
                chats: [],
                diagnostics: ['Challenge screen detected via ' + sel]
              };
            }
          }

          // 2. Check for Root Container
          const rootSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.rootContainer)};
          let rootFound = false;
          for (const sel of rootSels) {
            if (document.querySelector(sel)) {
              rootFound = true;
              break;
            }
          }
          if (!rootFound) {
            return {
              circuitBreakerTripped: true,
              reason: 'WhatsApp Web root chat pane is absent from DOM.',
              platform: 'whatsapp',
              chats: [],
              diagnostics: ['Root container not found']
            };
          }

          // 3. Query Chat List Elements with randomized micro-delays
          const titleSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.chatListTitle)};
          const elements = document.querySelectorAll(titleSels.join(', '));
          
          if (elements.length === 0) {
            diagnostics.push('WhatsApp title selectors returned 0 elements.');
          }

          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (i > 0 && i % 4 === 0) {
              await delay(30 + Math.floor(Math.random() * 60));
            }
            const name = (el.getAttribute('title') || el.textContent || '').trim();
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
          }

          return { circuitBreakerTripped: false, chats, diagnostics };
        })()
      `);

      if (waRes?.circuitBreakerTripped) {
        return {
          circuitBreakerTripped: true,
          reason: waRes.reason,
          platform: 'whatsapp',
          discovered: []
        };
      }

      if (Array.isArray(waRes?.chats) && waRes.chats.length > 0) {
        discovered.push(...waRes.chats);
      }
      if (Array.isArray(waRes?.diagnostics)) {
        diagnostics.push(...waRes.diagnostics);
      }
    } catch (e) {
      console.error('Error scraping live WhatsApp session:', e);
    }
  }

  return discovered;
});

// IPC Handler: Intercept recent message texts from active WhatsApp & Telegram sessions with date tracking, micro-delays & circuit breaker
ipcMain.handle('intercept-channel-messages', async (_event, { daysBack = 7 }) => {
  const intercepted = [];
  const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const diagnostics = [];

  // 1. Scrape message text elements & list previews from active WhatsApp Web window
  if (whatsappWindow && !whatsappWindow.isDestroyed()) {
    try {
      const waResult = await whatsappWindow.webContents.executeJavaScript(`
        (async () => {
          const results = [];
          const seen = new Set();
          const diagnostics = [];
          const now = Date.now();
          const delay = (ms) => new Promise((res) => setTimeout(res, ms));

          // 1. Pre-flight Circuit Breaker / Health Check
          const challengeSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.challengeOrLoginIndicators)};
          for (const sel of challengeSels) {
            if (document.querySelector(sel)) {
              return {
                circuitBreakerTripped: true,
                reason: 'WhatsApp Web presented QR code / challenge screen (' + sel + ').',
                platform: 'whatsapp',
                messages: [],
                diagnostics: ['Challenge screen detected via ' + sel]
              };
            }
          }

          const rootSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.rootContainer)};
          let rootFound = false;
          for (const sel of rootSels) {
            if (document.querySelector(sel)) {
              rootFound = true;
              break;
            }
          }
          if (!rootFound) {
            return {
              circuitBreakerTripped: true,
              reason: 'WhatsApp Web root chat pane is absent from DOM.',
              platform: 'whatsapp',
              messages: [],
              diagnostics: ['Root container not found']
            };
          }

          // Helper to parse WhatsApp timestamp strings
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

          // A. Scrape all Channel & Chat Preview Snippets from WhatsApp list items with micro-delays
          const listSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.chatListItems)};
          const listItems = document.querySelectorAll(listSels.join(', '));

          if (listItems.length === 0) {
            diagnostics.push('WhatsApp chatListItems selector returned 0 items.');
          }

          const titleSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.chatListTitle)};
          const snippetSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.chatListPreviewSnippet)};
          const timeSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.chatListTimestamp)};

          for (let index = 0; index < listItems.length; index++) {
            const item = listItems[index];
            if (index > 0 && index % 3 === 0) {
              await delay(35 + Math.floor(Math.random() * 70));
            }

            // Find title / channel name
            const titleEl = item.querySelector(titleSels.join(', '));
            const channelName = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim() : '';

            // Find last message preview snippet
            const snippetEl = item.querySelector(snippetSels.join(', '));
            const previewText = snippetEl ? snippetEl.innerText.trim() : '';

            // Find time element
            const timeEl = item.querySelector(timeSels.join(', '));
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
          }

          // B. Scrape deep messages from the currently active opened conversation (if any)
          const msgSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.activeConversationMessages)};
          const msgEls = document.querySelectorAll(msgSels.join(', '));

          const headerSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.activeConversationHeader)};
          const headerEl = document.querySelector(headerSels.join(', '));
          const currentChatName = headerEl ? (headerEl.getAttribute('title') || headerEl.textContent || 'WhatsApp Chat').trim() : 'WhatsApp Group';

          const textSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.activeConversationText)};
          const timeMetaSels = ${JSON.stringify(SCRAPER_SELECTORS.whatsapp.activeConversationTime)};

          for (let index = 0; index < msgEls.length; index++) {
            const el = msgEls[index];
            if (index > 0 && index % 4 === 0) {
              await delay(30 + Math.floor(Math.random() * 50));
            }

            const textEl = el.querySelector(textSels.join(', '));
            const text = textEl ? textEl.innerText.trim() : el.innerText.trim();

            if (text && text.length > 25 && !seen.has(text.substring(0, 60).toLowerCase())) {
              seen.add(text.substring(0, 60).toLowerCase());
              const timeEl = el.querySelector(timeMetaSels.join(', '));
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
          }

          return { circuitBreakerTripped: false, messages: results, diagnostics };
        })()
      `);

      if (waResult?.circuitBreakerTripped) {
        return {
          circuitBreakerTripped: true,
          reason: waResult.reason,
          platform: 'whatsapp',
          messages: []
        };
      }

      if (Array.isArray(waResult?.messages)) {
        intercepted.push(...waResult.messages.filter(m => m.timestampMs >= cutoffTime));
      }
      if (Array.isArray(waResult?.diagnostics)) {
        diagnostics.push(...waResult.diagnostics);
      }
    } catch (e) {
      console.error('Error intercepting WhatsApp messages:', e);
    }
  }

  // 2. Scrape message text elements & list previews from active Telegram Web window
  if (telegramWindow && !telegramWindow.isDestroyed()) {
    try {
      const tgResult = await telegramWindow.webContents.executeJavaScript(`
        (async () => {
          const results = [];
          const seen = new Set();
          const diagnostics = [];
          const now = Date.now();
          const delay = (ms) => new Promise((res) => setTimeout(res, ms));

          // 1. Pre-flight Circuit Breaker / Health Check
          const challengeSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.challengeOrLoginIndicators)};
          for (const sel of challengeSels) {
            if (document.querySelector(sel)) {
              return {
                circuitBreakerTripped: true,
                reason: 'Telegram Web presented login/OTP screen (' + sel + ').',
                platform: 'telegram',
                messages: [],
                diagnostics: ['Challenge screen detected via ' + sel]
              };
            }
          }

          const rootSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.rootContainer)};
          let rootFound = false;
          for (const sel of rootSels) {
            if (document.querySelector(sel)) {
              rootFound = true;
              break;
            }
          }
          if (!rootFound) {
            return {
              circuitBreakerTripped: true,
              reason: 'Telegram Web root chatlist is absent from DOM.',
              platform: 'telegram',
              messages: [],
              diagnostics: ['Root container not found']
            };
          }

          // A. Scrape chat list previews with micro-delays
          const listSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.chatListItems)};
          const chatItems = document.querySelectorAll(listSels.join(', '));

          if (chatItems.length === 0) {
            diagnostics.push('Telegram chatListItems selector returned 0 items.');
          }

          const titleSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.chatListTitle)};
          const snippetSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.chatListPreviewSnippet)};

          for (let index = 0; index < chatItems.length; index++) {
            const item = chatItems[index];
            if (index > 0 && index % 3 === 0) {
              await delay(35 + Math.floor(Math.random() * 70));
            }

            const titleEl = item.querySelector(titleSels.join(', '));
            const channelName = titleEl ? titleEl.textContent.trim() : '';

            const subEl = item.querySelector(snippetSels.join(', '));
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
          }

          // B. Scrape open conversation bubbles
          const headerSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.activeConversationHeader)};
          const headerEl = document.querySelector(headerSels.join(', '));
          const currentChatName = headerEl ? headerEl.textContent.trim() : 'Telegram Channel';

          const msgSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.activeConversationMessages)};
          const msgEls = document.querySelectorAll(msgSels.join(', '));
          const textSels = ${JSON.stringify(SCRAPER_SELECTORS.telegram.activeConversationText)};

          for (let index = 0; index < msgEls.length; index++) {
            const el = msgEls[index];
            if (index > 0 && index % 4 === 0) {
              await delay(30 + Math.floor(Math.random() * 50));
            }

            const textEl = el.querySelector(textSels.join(', '));
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
          }

          return { circuitBreakerTripped: false, messages: results, diagnostics };
        })()
      `);

      if (tgResult?.circuitBreakerTripped) {
        return {
          circuitBreakerTripped: true,
          reason: tgResult.reason,
          platform: 'telegram',
          messages: []
        };
      }

      if (Array.isArray(tgResult?.messages)) {
        intercepted.push(...tgResult.messages.filter(m => m.timestampMs >= cutoffTime));
      }
      if (Array.isArray(tgResult?.diagnostics)) {
        diagnostics.push(...tgResult.diagnostics);
      }
    } catch (e) {
      console.error('Error intercepting Telegram messages:', e);
    }
  }

  return {
    circuitBreakerTripped: false,
    messages: intercepted,
    diagnostics
  };
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


