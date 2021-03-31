const customTitlebar = require('custom-electron-titlebar');
const ipcRenderer2 = require('electron').ipcRenderer;




let fetchSteamDataTries = 5;
ipcRenderer2.send('getUserInfo');
ipcRenderer2.send('getDevInfo');

ipcRenderer2.on('sendDevInfo', function (event, args) {
  let iconPath = null;
  console.log(args.path);
  if(args.dev) {
    iconPath = args.path.replace(/\\/g, '\/') + '/icon.ico'// when in dev mode
  } else {
    iconPath = args.path.replace(/\\/g, '\/') + '/icon.ico';
  }

  const titlebar = new customTitlebar.Titlebar({
    backgroundColor: customTitlebar.Color.fromHex('#444'),
      maximizable: false,
      menu: null,
      titleHorizontalAlignment: 'left',
      icon: iconPath
  });
});

ipcRenderer2.on('sendUserInfo', function (event, args) {
  console.log(args[0]);
  console.log(args[1]);
  if(args[0]) {
    const userNameElement = document.getElementById("userName")
    if (userNameElement) userNameElement.innerText = args[0];

    const userImageElement = document.getElementById("userImage")
    if (userImageElement) userImageElement.src = args[1];
  } else {
    fetchSteamDataTries--;
    if(fetchSteamDataTries) {
      setTimeout(function() {ipcRenderer2.send('getUserInfo')}, 200) ;
    }
  }
});

function logout() {
    ipcRenderer2.send('logout');
}