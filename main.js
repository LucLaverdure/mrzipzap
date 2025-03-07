const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 1024,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        },
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

// Handle the "open-directory" event from the renderer process
ipcMain.handle('open-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'], // Open directory only
    });

    // Return the selected directory path or undefined if canceled
    return result.canceled ? null : result.filePaths[0];
});

// Handle zipping in the main process
ipcMain.on('zip-files', async (event, { files, outputZipPath }) => {
    try {
        // Create a zip stream
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Handle progress and completion
        archive.on('progress', (progress) => {
            const percent = Math.round((progress.entries.processed / progress.entries.total) * 100);
            event.reply('zip-progress', percent); // Send progress to renderer
        });

        archive.on('error', (err) => {
            event.reply('zip-error', err.message); // Send error to renderer
        });

        archive.on('end', () => {
            event.reply('zip-done'); // Notify renderer when zipping is complete
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Append files to the archive
        files.forEach((file) => {
            const fileName = path.basename(file); // Extract file name
            archive.file(file, { name: fileName });
        });

        // Finalize the archive
        await archive.finalize();
    } catch (error) {
        event.reply('zip-error', error.message);
    }
});