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

// Handle file listing with details (filename, size, and date modified)
ipcMain.handle('list-files', async (event, folderPath) => {
    try {
        const files = fs.readdirSync(folderPath); // Read all files in the directory
        const fileDetails = files.map((file) => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath); // Get file details

            return {
                name: file,
                size: stats.size, // File size in bytes
                modifiedDate: stats.mtime, // Last modified date
                isDirectory: stats.isDirectory(), // Check if it's a directory
            };
        });
        return fileDetails;
    } catch (error) {
        console.error('Error reading directory:', error);
        return { error: 'Failed to read the directory. Make sure the path is correct.' };
    }
});