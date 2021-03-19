const ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.send('getUserInfo');

ipcRenderer.on('sendUserInfo', function (event, args) {
  console.log(args[0]);
  console.log(args[1]);
  const userNameElement = document.getElementById("userName")
  if (userNameElement) userNameElement.innerText = args[0];

  const userImageElement = document.getElementById("userImage")
  if (userImageElement) userImageElement.src = args[1];
});


function logout() {
    console.log("LOGOUT!");
}