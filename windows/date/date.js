const dialog = require('electron').remote.dialog;
const BrowserWindow = require('electron').BrowserWindow;

let filePath = null;

function loadImage() {
    dialog.showOpenDialog(BrowserWindow, {
        title: 'Choose Image',
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png']}
        ]
    }).then((fileData) => {
        if(!fileData.canceled) {
            filePath = fileData.filePaths[0].replace(/\\/g, '\/');
            const imageArea = document.getElementById("imageArea");
            if (imageArea) imageArea.style.backgroundImage = "url('"+ fileData.filePaths[0].replace(/\\/g, '\/') +"')";
        }
    });
}

function sendForm(event) {
    event.preventDefault() // stop the form from submitting
    let name = document.getElementById("name").value;
    let dateFrom = document.getElementById("dateFrom").value;
    let dateTo = document.getElementById("dateTo").value;
    let isDefault = document.getElementById("isDefault").value;


    // TODO check if dateFrom < dateTo
    if(name && dateFrom && dateTo && filePath) {
        ipcRenderer.send('saveDate', {name, filePath, dateFrom, dateTo, isDefault});
    }
}