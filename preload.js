const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
    // Expose zipFiles function
    zipFiles: (files, outputZipPath) => ipcRenderer.send('zip-files', { files, outputZipPath }),

    // Expose progress listener
    onProgress: (callback) => ipcRenderer.on('zip-progress', (event, percent) => callback(percent)),

    // Expose completion listener
    onDone: (callback) => ipcRenderer.on('zip-done', callback),

    // Expose error listener
    onError: (callback) => ipcRenderer.on('zip-error', (event, error) => callback(error)),

    invoke: (channel, args) => ipcRenderer.invoke(channel, args),

});