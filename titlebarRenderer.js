const customTitlebar = require('custom-electron-titlebar');
const ipcRenderer2 = require('electron').ipcRenderer;

// let iconPath = null;
//   if(!app.isPackaged) {
//     iconPath = 'icon.ico'// when in dev mode
//   } else {
//     iconPath = './resources/app/icon.ico';
//   }

new customTitlebar.Titlebar({
	backgroundColor: customTitlebar.Color.fromHex('#444'),
    maximizable: false,
    menu: null,
    icon: '../../icon.ico',
    titleHorizontalAlignment: 'left'
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