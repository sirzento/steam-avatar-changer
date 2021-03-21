const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event) {
    event.preventDefault() // stop the form from submitting
    let user = document.getElementById("user").value;
    let pass = document.getElementById("pass").value;
    ipcRenderer.send('login', {accountName: user, password: pass});
}

