const ipcRenderer = require('electron').ipcRenderer;

function newDate() {
    ipcRenderer.send('newDate');
}