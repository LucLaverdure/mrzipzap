const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
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

        // Sort: Directories first, then files, then alphabetically by name
        fileDetails.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1; // Directories come first
            if (!a.isDirectory && b.isDirectory) return 1;  // Files come after directories
            return a.name.localeCompare(b.name); // Alphabetical order
        });

        return fileDetails;
    } catch (error) {
        console.error('Error reading directory:', error);
        return { error: 'Failed to read the directory. Make sure the path is correct.' };
    }
});