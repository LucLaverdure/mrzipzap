const { ipcRenderer } = require('electron');

document.getElementById('listFilesBtn').addEventListener('click', async () => {
    const folderPath = document.getElementById('folderPath').value; // Get input value
    if (!folderPath) {
        alert('Please enter a folder path!');
        return;
    }

    try {
        // Request the list of files from the main process
        const files = await ipcRenderer.invoke('list-files', folderPath);
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = ''; // Clear previous results

        if (files.length === 0) {
            fileList.innerHTML = '<li>No files found in the folder.</li>';
        } else {
            // Display the files in a list
            let output = '';
            files.forEach((file) => {
                output =+ '<tr><th><input type="checkbox" /></th><td>' + file + '</td><td>size</td><td>date</td></tr>';
            });
            fileList.innerHTML(output);
        }
    } catch (error) {
        console.error('Error listing files:', error);
        alert('Failed to list files. Check the console for details.');
    }
});