const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  savePdfFile: (options) => ipcRenderer.invoke('save-pdf-file', options),
  callLlmApi: (options) => ipcRenderer.invoke('call-llm-api', options),
  isDesktop: true,
});
