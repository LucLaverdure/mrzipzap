const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    zipFiles: (files, outputZipPath) => ipcRenderer.send('zip-files', { files, outputZipPath }),
    onProgress: (callback) => ipcRenderer.on('zip-progress', (event, percent) => callback(percent)),
    onDone: (callback) => ipcRenderer.on('zip-done', callback),
    onError: (callback) => ipcRenderer.on('zip-error', (event, error) => callback(error)),
});