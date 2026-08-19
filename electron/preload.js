const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  savePdfFile: (options) => ipcRenderer.invoke('save-pdf-file', options),
  saveTextFile: (options) => ipcRenderer.invoke('save-text-file', options),
  callLlmApi: (options) => ipcRenderer.invoke('call-llm-api', options),
  fetchWebPage: (options) => ipcRenderer.invoke('fetch-web-page', options),
  s3PutObject: (options) => ipcRenderer.invoke('s3-put-object', options),
  s3SyncAll: (options) => ipcRenderer.invoke('s3-sync-all', options),
  s3PullAll: (options) => ipcRenderer.invoke('s3-pull-all', options),
  isDesktop: true,
});

