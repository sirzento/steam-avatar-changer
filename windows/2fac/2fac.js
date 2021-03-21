const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event) {
    event.preventDefault() // stop the form from submitting
    let code = document.getElementById("code").value;
    ipcRenderer.send('2FacLogin', {twoFactorCode: code});
}