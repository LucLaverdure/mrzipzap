const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

jQuery(document).ready(function ($) {

    $(document).on('click', '#local-zip', async function () {
        let files = $.map($('#local_file_list input[type="checkbox"]:checked').closest('tr'), (row) => {
            return $(row).find('.pointer').attr('data-dir');
        });

        const outputZipPath = `tmp-mr-zip-zap.zip`; // Define output location

        // Start zipping via IPC
        window.electron.zipFiles(files, outputZipPath);

        // Listen for progress updates
        window.electron.onProgress((percent) => {
            const $progressBar = $('#progress-bar');
            $progressBar.css('width', `${percent}%`);
            $progressBar.text(`${percent}%`);
        });

        // Handle completion
        window.electron.onDone(() => {
            alert('Zipping completed successfully!');
        });

        // Handle errors
        window.electron.onError((error) => {
            alert(`Error: ${error}`);
        });
    });

    $(document).on('click', 'table tr td', async function () {
        if ($(this).hasClass('op')) {
            return;
        }
        const row = $(this).closest('tr');
        const checkbox = row.find('input[type="checkbox"]');
        checkbox.prop('checked', !checkbox.prop('checked'));
    });

    $(document).on('keypress', '#local_dir_path', async function (event) {
        if (event.which === 13) {
            $("#list_local_files_button").click();
        }
    });

    $(document).on('click', '#select-folder', async function () {
        const input = document.getElementById('local_dir_path');
        // Ask the main process to open the directory dialog
        const selectedDirectory = await window.electron.invoke('open-directory');
        if (selectedDirectory) {
            // Update the input field with the selected directory path
            input.value = selectedDirectory;
            // Trigger the file listing
            $("#list_local_files_button").click();
        } else {
            console.log('No directory selected');
        }
    });

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
            const files = await window.electron.invoke('list-files', folderPath);

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
                            <td class="op">&nbsp;</td>
                            <td><i style="color:yellow;" class="fas fa-folder" aria-hidden="true"></i><a class="dir-link" href="#" class="folder">..</a></td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                        </tr>
                    `);

                files.forEach((file) => {
                    let name = file.name;
                    let icon = file.isDirectory ? 'fas fa-folder' : 'fas fa-file';
                    let dir = folderPath.replace(/\/?$/, '/');
                    name = file.isDirectory ? `<a class="dir-link pointer" href="#" class="folder" data-dir="${dir}${name}">${name}</a>` : `<span class="pointer" data-dir="${dir}${name}">${name}</span>`;
                    tableBody.append(`
                        <tr>
                            <td class="op"><input type="checkbox" /></td>
                            <td><i style="color:yellow;" class="${icon}" aria-hidden="true"></i> ${name}</td>
                            <td>${file.isDirectory ? '' : formatSize(file.size)}</td>
                            <td>${file.modifiedDate}</td>
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
