const { ipcRenderer } = require('electron');
const $ = require('jquery'); // Import jQuery

const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

$(document).ready(function () {

    console.log("clicker");

    $(document).on('click', 'a.dir-link', async function () {
        let new_dir = $('#local_dir_path').val();
        if (!new_dir.endsWith("/")) {
            new_dir = new_dir + "/";
        }
        new_dir = new_dir + $(this).text();
        $('#local_dir_path').val(new_dir);
        $("#list_local_files_button").click();
    });

    // Trigger file listing when the button is clicked
    $('#list_local_files_button').on('click', async function () {
        const folderPath = $('#local_dir_path').val(); // Get the folder path from the textbox

        if (!folderPath) {
            alert('Please enter a folder path!');
            return;
        }

        try {
            // Ask the main process to list files in the specified folder
            const files = await ipcRenderer.invoke('list-files', folderPath);

            const tableBody = $('#local_file_list');
            tableBody.empty(); // Clear previous results

            if (files.error) {
                // Display error message
                tableBody.append(`<tr><td colspan="4" style="color: red;">${files.error}</td></tr>`);
            } else if (files.length === 0) {
                // If no files are found
                tableBody.append('<tr><td colspan="4">No files found in this folder.</td></tr>');
            } else {
                // Display the list of files with details
                tableBody.append(`
                        <tr>
                            <th><input type="checkbox" /></th>
                            <td><a class="dir-link" href="#" class="folder">..</a></td>
                            <td></td>
                            <td></td>
                        </tr>
                    `);

                files.forEach((file) => {
                    let name = file.name;
                    if (file.isDirectory) {
                        name = `<a class="dir-link" href="#" class="folder">${name}</a>`;
                    }
                    tableBody.append(`
                        <tr>
                            <th><input type="checkbox" /></th>
                            <td>${name}</td>
                            <td>${file.isDirectory ? '' : formatSize(file.size)}</td>
                            <td>${new Date(file.modifiedDate).toLocaleString()}</td>
                        </tr>
                    `);
                });
            }
        } catch (error) {
            console.error('Error listing files:', error);
            alert('An error occurred. Check the console for details.');
        }
    });

    $("#list_local_files_button").click();

});
