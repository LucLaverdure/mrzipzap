const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
        icon: path.join(__dirname, 'assets', 'logo.png'), // Path to your icon
    });
    mainWindow.loadFile('index.html'); // Load your GUI (HTML file)
});

// Listen for a request from the renderer to list files
ipcMain.handle('list-files', async (event, folderPath) => {
    try {
        const files = fs.readdirSync(folderPath); // Get files in the folder
        return files;
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
});
