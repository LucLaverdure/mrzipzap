const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true },
        icon: path.join(__dirname, 'assets', 'logo.png'), // Path to your icon
    });
    mainWindow.loadFile('index.html'); // Load your GUI (HTML file)
});

