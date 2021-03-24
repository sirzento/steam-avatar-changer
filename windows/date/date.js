const dialog = require('electron').remote.dialog;
const BrowserWindow = require('electron').BrowserWindow;
const ipcRenderer = require('electron').ipcRenderer;
const { v4: uuidv4 } = require('uuid');
var checkbox = document.getElementById('isDefault');

let filePath = null;
let id = null;


(function() {
    checkbox.addEventListener('change', function() {
        let dateArea = document.getElementById('dateData');
        if (this.checked) {
          console.log("Checkbox is checked..");
          dateArea.style.display = "none";
        } else {
          console.log("Checkbox is not checked..");
          dateArea.style.display = "block";
        }
      });
 })();



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
            if (imageArea) imageArea.src = fileData.filePaths[0].replace(/\\/g, '\/');
        }
    });
}

function sendForm(event) {
    event.preventDefault() // stop the form from submitting
    let name = document.getElementById("name").value;
    let dateFrom = document.getElementById("dateFrom").value;
    let dateTo = document.getElementById("dateTo").value;
    let isDefault = document.getElementById("isDefault").checked;
    if(isDefault) {
        if(!dateFrom) dateFrom = '2020-01-01';
        if(!dateTo) dateTo = '2020-01-01';
    }

    if(name && dateFrom && dateTo && filePath) {
        if(id === null) {
            id = uuidv4();
        }
        ipcRenderer.send('saveDate', {id, name, filePath, dateFrom, dateTo, isDefault});
    }
}

function cancel() {
    ipcRenderer.send('showOverview');
}

ipcRenderer.send('isEditDate');

ipcRenderer.on('isEditDateAnswer', function (event, args) {
    if(!args.isNew) {
        id = args.date.id;
        filePath = args.date.filePath;
        const imageArea = document.getElementById("imageArea");
        if (imageArea) imageArea.src = '../../avatars/'+ filePath;
        document.getElementById("name").value = args.date.name;
        document.getElementById("dateFrom").value = args.date.dateFrom;
        document.getElementById("dateTo").value = args.date.dateTo;
        document.getElementById("isDefault").checked = args.date.isDefault;
        if(args.date.isDefault) {
            let dateArea = document.getElementById('dateData');
            dateArea.style.display = "none";
        }
    }
});