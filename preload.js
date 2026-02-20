const { contextBridge } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the dashboard here
});
