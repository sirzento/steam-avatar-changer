const customTitlebar = require('custom-electron-titlebar');
const ipcRenderer2 = require('electron').ipcRenderer;

new customTitlebar.Titlebar({
	backgroundColor: customTitlebar.Color.fromHex('#444'),
    maximizable: false,
    menu: null
});

ipcRenderer2.send('getUserInfo');

ipcRenderer2.on('sendUserInfo', function (event, args) {
  console.log(args[0]);
  console.log(args[1]);
  const userNameElement = document.getElementById("userName")
  if (userNameElement) userNameElement.innerText = args[0];

  const userImageElement = document.getElementById("userImage")
  if (userImageElement) userImageElement.src = args[1];
});

function logout() {
    ipcRenderer2.send('logout');
}