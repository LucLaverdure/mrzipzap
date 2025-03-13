const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const os = require('os');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 1024,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: true
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

            // Format the date
            const formattedDate = stats.mtime.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit', // Full month name (e.g., "January")
                day: '2-digit', // Day with leading zero
                hour: '2-digit', // Hour in 12-hour format
                minute: '2-digit', // Minutes with leading zero
                second: '2-digit', // Seconds with leading zero
            });

            return {
                name: file,
                size: stats.size, // File size in bytes
                modifiedDate: formattedDate, // Last modified date
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

// Helper function to fetch all files recursively
function getAllFiles(filePaths) {
    let allFiles = [];

    filePaths.forEach((filePath) => {
        if (fs.statSync(filePath).isDirectory()) {
            // If it's a directory, read its contents
            const subFiles = fs.readdirSync(filePath).map((subFile) => path.join(filePath, subFile));
            allFiles = allFiles.concat(getAllFiles(subFiles)); // Recursively fetch files
        } else {
            // If it's a file, add it to the list
            allFiles.push(filePath);
        }
    });

    return allFiles;
}

// Handle zipping in the main process
ipcMain.on('zip-files', async (event, { files, outputZipPath }) => {
    try {
        // Create a zip stream
        const output = fs.createWriteStream(__dirname + '/' + outputZipPath);
        const archive = archiver('zip', { zlib: { level: 9 }, statConcurrency: 8 });

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

        const allFiles = getAllFiles(files);

        // Append files to the archive
        allFiles.forEach((file) => {
            const fileName = path.basename(file); // Extract file name
            archive.file(file, { name: fileName });
        });

        // Finalize the archive
        await archive.finalize();
    } catch (error) {
        event.reply('zip-error', error.message);
    }
});

// Read and parse ~/.ssh/config
ipcMain.handle('get-ssh-config-hosts', async () => {
    const sshConfigPath = path.join(os.homedir(), '.ssh', 'config');
    try {
        if (!fs.existsSync(sshConfigPath)) {
            throw new Error('~/.ssh/config file does not exist');
        }

        const configContent = fs.readFileSync(sshConfigPath, 'utf-8');
        const hostEntries = parseSSHConfig(configContent);
        return hostEntries; // Send host entries to the renderer
    } catch (error) {
        console.error('Error reading SSH config:', error);
        throw error;
    }
});

// Helper function to parse SSH config and extract `Host` entries
function parseSSHConfig(configContent) {
    const lines = configContent.split('\n');
    const hosts = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Host ') && !trimmed.startsWith('Host *')) {
            const host = trimmed.split(' ')[1]; // Get the host name
            hosts.push(host);
        }
    }
    return hosts;
}
