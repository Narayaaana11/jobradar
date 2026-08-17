const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  openWhatsAppWeb: () => ipcRenderer.invoke('open-whatsapp-web-window'),
  savePdfFile: (options) => ipcRenderer.invoke('save-pdf-file', options),
  callLlmApi: (options) => ipcRenderer.invoke('call-llm-api', options),
  s3PutObject: (options) => ipcRenderer.invoke('s3-put-object', options),
  s3SyncAll: (options) => ipcRenderer.invoke('s3-sync-all', options),
  s3PullAll: (options) => ipcRenderer.invoke('s3-pull-all', options),
  isDesktop: true,
});
