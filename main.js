const { app, BrowserWindow, ipcMain, Tray, Menu  } = require('electron')
const path = require('path')
const SteamCommunity = require('steamcommunity');
const fs = require('fs');
let community = new SteamCommunity();

var _sessionID = null;
var _cookies = null;
var _steamguard = null;
var _oAthToken = null;

var _tempUser = null;
var _tempPass = null;

var _2facWindow = null;

var _mainWindow = null;


function createWindow () {
   _mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: "hidden",
    frame: false,
    resizable: false,
    webPreferences: {
	    nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })
  _mainWindow.loadFile('index.html');

  _mainWindow.on('minimize',function(event){
    event.preventDefault();
    _mainWindow.hide();
  });
  
  _mainWindow.on('close', function (event) {
    if(!app.isQuiting){
        event.preventDefault();
        _mainWindow.hide();
    }
  
    return false;
  });
}

app.whenReady().then(() => {
  createWindow()
  initLogin();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  var contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click:  function(){
      _mainWindow.show();
    } },
    { label: 'Quit', click:  function(){
      app.isQuiting = true;
      app.quit();
    } }
  ]);

  appIcon = new Tray('./steam.png');
  appIcon.setToolTip('Steam Avatar Changer');
  appIcon.setContextMenu(contextMenu);
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})





function initLogin() {
  if (fs.existsSync("./secrets/guard.secret")) {
    _steamguard= fs.readFileSync("./secrets/guard.secret").toString();
    _oAthToken = fs.readFileSync("./secrets/auth.secret").toString();
    
    community.oAuthLogin(_steamguard, _oAthToken, (err, sessionID, cookies) => {
      if(err) {
        console.log("Error: ", err.message);
      }else {
        console.log("Login succesfully");
        _sessionID = sessionID;
        _cookies = cookies;
        _mainWindow.loadFile('./windows/Overview/overview.html');
      }
    })
  }
}

function login(details) {
	community.login(details, function(err, sessionID, cookies, steamguard, oAuthToken) {
		if(err) {
      if(err.message == "The account name or password that you have entered is incorrect.") {
        // TODO
      } else {
        getSteamGuardCode(details);
      }
			console.log("Error: ", err.message);
		} else {
			_sessionID = sessionID;
			_cookies = cookies;
			_steamguard = steamguard;
			_oAthToken = oAuthToken;
			fs.writeFile("./secrets/guard.secret", steamguard, function() {
				console.log("guard writen.");
			})
			fs.writeFile("./secrets/auth.secret", oAuthToken, function() {
				console.log("auth writen.");
			})
      console.log("Login Erfolgreich");
		}
	})
}

function getSteamGuardCode(details) {
  _tempPass = details.password;
  _tempUser = details.accountName;

  _2facWindow = new BrowserWindow({
    width: 300,
    height: 300,
    titleBarStyle: "hidden",
    frame: false,
    resizable: false,
    webPreferences: {
	    nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })
  _2facWindow.removeMenu();
  _2facWindow.loadFile('./windows/2fac/2fac.html');
}


ipcMain.on('login', function (event, details) {
  details.disableMobile = false;
  login(details);
});

ipcMain.on('2FacLogin', function (event, details) {
  _2facWindow.close();
  details.disableMobile = false;
  details.accountName = _tempUser;
  details.password = _tempPass;
  _tempPass = null;
  _tempUser = null;
  login(details);
});

function changeImage(imagePath) {
	community.uploadAvatar(imagePath, "png", function(err, url) {
		console.log(url);
	})
}