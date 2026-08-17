const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  openWhatsAppWeb: () => ipcRenderer.invoke('open-whatsapp-web-window'),
  openTelegramWeb: () => ipcRenderer.invoke('open-telegram-web-window'),
  scrapeSocialChats: () => ipcRenderer.invoke('scrape-social-chats'),
  interceptChannelMessages: (options) => ipcRenderer.invoke('intercept-channel-messages', options || {}),
  savePdfFile: (options) => ipcRenderer.invoke('save-pdf-file', options),
  saveTextFile: (options) => ipcRenderer.invoke('save-text-file', options),
  callLlmApi: (options) => ipcRenderer.invoke('call-llm-api', options),
  s3PutObject: (options) => ipcRenderer.invoke('s3-put-object', options),
  s3SyncAll: (options) => ipcRenderer.invoke('s3-sync-all', options),
  s3PullAll: (options) => ipcRenderer.invoke('s3-pull-all', options),
  isDesktop: true,
});
