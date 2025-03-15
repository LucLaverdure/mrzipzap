const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

function resolvePath(path) {
    const parts = path.split('/'); // Split the path into segments
    const stack = [];

    for (const part of parts) {
        if (part === '' || part === '.') {
            // Ignore empty or current directory segments
            continue;
        } else if (part === '..') {
            // Go up one directory (remove the last valid segment)
            stack.pop();
        } else {
            // Add the segment to the stack
            stack.push(part);
        }
    }

    return '/' + stack.join('/');
}

jQuery(document).ready(function ($) {

    $(document).on('click', '#local-zip', async function () {
        let files = $.map($('#file-explorer .file-item.selected'), (row) => {
            return $(row).find('.pointer').attr('data-dir');
        });

        if (files.length === 0) {
            alert('Please select files to zip!');
            return;
        }

        const outputZipPath = `tmp-mr-zip-zap.zip`; // Define output location

        // Start zipping via IPC
        window.electron.zipFiles(files, outputZipPath);

        // Listen for progress updates
        window.electron.onProgress((percent) => {
            const $progressBar = $('#progress-bar-zip');
            $progressBar.css('width', `${percent}%`);
            $progressBar.text(`${percent}%`);
        });

        // Handle completion
        window.electron.onDone(() => {
            // alert('Zipping completed successfully!');
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
        new_dir = $(this).attr('data-dir');
        $('#local_dir_path').val(new_dir);
        $("#list_local_files_button").click();
    });

    // Trigger file listing when the button is clicked
    $('#list_local_files_button').on('click', async function () {
        const folderPath = resolvePath($('#local_dir_path').val());
        $('#local_dir_path').val(folderPath);

        if (!folderPath) {
            alert('Please enter a folder path!');
            return;
        }

        try {
            // Ask the main process to list files in the specified folder
            const files = await window.electron.invoke('list-files', folderPath);

            const tableBody = $('#file-explorer');
            tableBody.empty(); // Clear previous results

            if (files.error) {
                // Display error message
                tableBody.append(`<div style="color: red;">${files.error}</div>`);
            } else if (files.length === 0) {
                // If no files are found
                tableBody.append(`<div style="color: red;">No files found in this folder.</div>`);
            } else {
                // Display the list of files with details
                let name = '..';
                let icon = 'fas fa-folder';
                let dir = folderPath.replace(/\/?$/, '/');
                let new_name = `<a class="dir-link pointer folder" href="#" data-dir="${dir}${name}"> ${name}</a>`;
                tableBody.append(`
                        <div class="file-item" draggable="true" data-file="${name}"><i style="color:yellow;" class="${icon}" aria-hidden="true"></i> ${new_name}</div>
                    `);

                files.forEach((file) => {
                    let name = file.name;
                    let icon = file.isDirectory ? 'fas fa-folder' : 'fas fa-file';
                    let dir = folderPath.replace(/\/?$/, '/');
                    let new_name = file.isDirectory ? `<a class="dir-link pointer folder" href="#" data-dir="${dir}${name}"> ${name}</a>` : `<span class="pointer" data-dir="${dir}${name}"> ${name}</span>`;
                    tableBody.append(`
                        <div class="file-item" draggable="true" data-file="${name}"><i style="color:yellow;" class="${icon}" aria-hidden="true"></i> ${new_name} ${file.isDirectory ? '' : '('+formatSize(file.size)+')'} - ${file.modifiedDate}</div>
                    `);
                });
            }
        } catch (error) {
            console.error('Error listing files:', error);
            alert('An error occurred. Check the console for details.');
        }
    });

    $("#list_local_files_button").click();


// Initialize variables
    const $fileExplorer = $('#file-explorer');
    const $dropContainer = $('#drop-container');
    const $droppedFilesList = $('#dropped-files');
    let selectedItems = []; // To keep track of selected items

// Add click event for selecting multiple files
    $fileExplorer.on('click', '.file-item', function () {
        const $fileItem = $(this);

        if ($fileItem.attr('data-file').endsWith('..')) {
            return;
        }

        // Toggle selection
        if ($fileItem.hasClass('selected')) {
            $fileItem.removeClass('selected');
            selectedItems = selectedItems.filter(item => item !== this);
        } else {
            $fileItem.addClass('selected');
            selectedItems.push(this);
        }
    });

// Drag start event for multiple selection
    $fileExplorer.on('dragstart', '.file-item', function (e) {
        if (selectedItems.length === 0) {
            // If no files are selected, use the current dragged item
            selectedItems = [this];
            $(this).addClass('selected');
        }

        // Add dragging class to all selected items
        selectedItems.forEach(item => $(item).addClass('dragging'));

        // Allow the drag event
        e.originalEvent.dataTransfer.setData('text/plain', ''); // Required for some browsers
    });

// Drag end event to remove dragging class
    $fileExplorer.on('dragend', '.file-item', function () {
        selectedItems.forEach(item => $(item).removeClass('dragging'));
    });

// Drop container event listeners
    $dropContainer.on('dragover', function (e) {
        e.preventDefault(); // Allow drop
        $(this).addClass('drag-over');
    });

    $dropContainer.on('dragleave', function () {
        $(this).removeClass('drag-over');
    });

    $dropContainer.on('drop', function (e) {
        e.preventDefault();
        $(this).removeClass('drag-over');

        // Add dropped files to the list
        selectedItems.forEach(item => {
            const fileName = $(item).data('file');

            // Append file name to the dropped files list
            const $listItem = $('<li></li>').text(fileName);
            $droppedFilesList.append($listItem);
        });

        console.log('Files dropped:', selectedItems.map(item => $(item).data('file')));

        // Clear selection after drop
        selectedItems.forEach(item => $(item).removeClass('selected'));
        selectedItems = [];
    });

});

$(document).ready(async function () {
    const $sshSelect = $('#ssh-list');

    try {
        // Get the list of hosts from the main process
        const hosts = await window.electron.getSSHConfigHosts();

        if (hosts.length === 0) {
            // Add an option indicating no SSH hosts were found
            $sshSelect.append('<option disabled>No SSH hosts found</option>');
        } else {
            // Populate the dropdown with host entries
            hosts.forEach((host) => {
                $sshSelect.append(`<option value="${host}">${host}</option>`);
            });
        }
    } catch (error) {
        console.error('Error loading SSH hosts:', error);
        // Add an option indicating an error occurred
        $sshSelect.append('<option disabled>Error loading SSH hosts</option>');
    }
});
