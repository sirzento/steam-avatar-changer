const { app, BrowserWindow, ipcMain, Tray, Menu, dialog  } = require('electron')

if (handleSquirrelEvent(app)) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

const path = require('path')
const {imageHash} = require('image-hash');
const SteamCommunity = require('steamcommunity');
const fs = require('fs');
let community = new SteamCommunity();
const schedule = require('node-schedule');
const AutoLaunch = require('auto-launch');
const { autoUpdater } = require('electron-updater');
let autoLaunch;

const appDataPath = process.env.APPDATA.replace(/\\/g, '\/') + "/SteamAvatarChanger";
const avatarsPath = appDataPath + "/avatars";
const secretsPath = appDataPath + "/secrets";
const dataFilePath = appDataPath + "/data.json";
const imageHashFilePath = appDataPath + "/imageHashData.json";

const job = schedule.scheduleJob('0 0 * * *', () => { 
  checkAndChangeAvatar();
}) // run everyday at midnight

//#region internal variables
var _sessionID = null;
var _cookies = null;
var _steamguard = null;
var _oAthToken = null;
var _steamUsername = null;
var _steamAvatarUrl = null;

var _tempUser = null;
var _tempPass = null;
var _tempDateToEdit = null;

var _2facWindow = null;

var _mainWindow = null;

//#endregion

//#region window UI

function createWindow () {
  let iconPath = null;
  if(!app.isPackaged) {
    iconPath = 'icon.ico'// when in dev mode
  } else {
    iconPath = './resources/app/icon.ico';
  }
   _mainWindow = new BrowserWindow({
    width: 600,
    height: 600,
    titleBarStyle: "hidden",
    frame: false,
    resizable: false,
    webPreferences: {
	    nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: iconPath,
    show: false
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
  _mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

app.whenReady().then(() => {
  init();
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

  let trayIcon = null
  if(!app.isPackaged) {
    trayIcon = './icon.png'; // when in dev mode
  } else {
    trayIcon = './resources/app/icon.png';
  }
  appIcon = new Tray(trayIcon);
  appIcon.on('double-click', function() {
    _mainWindow.show();
  })
  appIcon.setToolTip('Steam Avatar Changer');
  appIcon.setContextMenu(contextMenu);


  autoLaunch = new AutoLaunch({
    name: 'SteamAvatarChanger',
    isHidden: true
  });
  autoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) autoLaunch.enable();
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function loadOverview() {
  let exists = fs.existsSync(dataFilePath);
  let empty = true;
  if(exists) {
    let data = JSON.parse(fs.readFileSync(dataFilePath));
    if(data.length > 0) {
      empty = false;
    }
  }
  if(exists && !empty) {
    _mainWindow.loadFile('./windows/Overview/overview.html');
  } else {
    _mainWindow.loadFile('./windows/Overview/empty/overviewEmpty.html');
  }
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

//#endregion

//#region steam functions

function initLogin() {
  if (fs.existsSync(secretsPath + "/guard.secret")) {
    _steamguard= fs.readFileSync(secretsPath + "/guard.secret").toString();
    _oAthToken = fs.readFileSync(secretsPath + "/auth.secret").toString();
    
    community.oAuthLogin(_steamguard, _oAthToken, (err, sessionID, cookies) => {
      if(err) {
        console.log("Error: ", err.message);
      }else {
        console.log("Login succesfully");
        _sessionID = sessionID;
        _cookies = cookies;
        getSteamUserInfo().then(x => {
          loadOverview();
          checkAndChangeAvatar();
        });
      }
    })
  }
}

function login(details) {
	community.login(details, function(err, sessionID, cookies, steamguard, oAuthToken) {
		if(err) {
      if(err.message == "The account name or password that you have entered is incorrect.") {
        dialog.showMessageBox({
          type: 'error',
          message: 'Login failed',
          detail: 'The account name or password that you have entered is incorrect.'
        })
      } else {
        getSteamGuardCode(details);
      }
			console.log("Error: ", err.message);
		} else {
			_sessionID = sessionID;
			_cookies = cookies;
			_steamguard = steamguard;
			_oAthToken = oAuthToken;
			fs.writeFile(secretsPath + "/guard.secret", steamguard, function() {
				console.log("guard writen.");
			});
			fs.writeFile(secretsPath + "/auth.secret", oAuthToken, function() {
				console.log("auth writen.");
			});
      console.log("Login Erfolgreich");
      getSteamUserInfo().then(x => {
        loadOverview();
        checkAndChangeAvatar();
      });
		}
	})
}

function getSteamUserInfo() {
  return new Promise((res, rej) => {
    community.getSteamUser(community.steamID, (err, user) => {
      if(err) {
        console.log(err.message);
      }
      let avatarURL = user.getAvatarURL().split('.');
      avatarURL[avatarURL.length - 2] = avatarURL[avatarURL.length - 2] + "_full";
      _steamAvatarUrl = avatarURL.join('.');
      _steamUsername = user.name;
      res();
    });
  })
}

function changeImage(imagePath) {
  let fileInfo = imagePath.split('.');
	community.uploadAvatar(imagePath, fileInfo[fileInfo.length - 1], function(err, url) {
    if(err) {
      dialog.showMessageBox({
        type: 'error',
        message: 'Error Code: 21',
        detail: err.message
      })
    } else {
      console.log("Avatar changed. New URL: ", url);
      _steamAvatarUrl = url;
      _mainWindow.webContents.send('sendUserInfo', [_steamUsername, _steamAvatarUrl]);
      checkAndSaveImageHash(imagePath);
    }
	})
}

//#endregion

//#region ipc Events

ipcMain.on('login', function (event, details) {
  details.disableMobile = false;
  login(details);
});

ipcMain.on('logout', function(event) {
    _sessionID = null;
    _cookies = null;
    _steamguard = null;
    _oAthToken = null;
    _steamUsername = null;
    _steamAvatarUrl = null;
    if(fs.existsSync(secretsPath + '/guard.secret')) {
      fs.rmSync(secretsPath + '/guard.secret');
      fs.rmSync(secretsPath + '/auth.secret');
    }
    _mainWindow.loadFile('index.html');
})

ipcMain.on('newDate', function (event) {
  _mainWindow.loadFile('./windows/date/date.html');
});

ipcMain.on('editDate', function (event, id) {
  let data = JSON.parse(fs.readFileSync(dataFilePath));
  _tempDateToEdit = data.find(x => x.id == id);
  _mainWindow.loadFile('./windows/date/date.html');
});

ipcMain.on('isEditDate', function (event) {
  if(_tempDateToEdit) {
    event.sender.send('isEditDateAnswer', {isNew: false, date: _tempDateToEdit});
    _tempDateToEdit = null;
  } else {
    event.sender.send('isEditDateAnswer', {isNew: true, date: null});
  }
});

ipcMain.on('deleteDate', function (event, id) {
  let data = JSON.parse(fs.readFileSync(dataFilePath));
  let exists = data.find(x => x.id == id);
  if(exists) {
    data = data.filter(x => x.id != id);
    fs.writeFileSync(dataFilePath, JSON.stringify(data));
    event.sender.send('refreshList');
  }
});

ipcMain.on('saveDate', function (event, date) {
  if(date.filePath.includes('/')){
    let newFilePath = date.filePath.split('/')[date.filePath.split('/').length - 1];
    fs.copyFileSync(date.filePath, avatarsPath + '/' + newFilePath);
    
    date.filePath = newFilePath;
  }
  let startDate = new Date(date.dateFrom);
  let endDate = new Date(date.dateTo);

  date.betweenYear = startDate.setFullYear(2021) > endDate.setFullYear(2021);

  let data = JSON.parse(fs.readFileSync(dataFilePath));
  let exists = data.find(x => x.id == date.id);
  if(exists) {
    exists.betweenYear = date.betweenYear;
    exists.name = date.name;
    exists.filePath = date.filePath;
    exists.dateFrom = date.dateFrom;
    exists.dateTo = date.dateTo;
    exists.isDefault = date.isDefault;
  } else {
    data.push(date);
  }

  fs.writeFileSync(dataFilePath, JSON.stringify(data));
  checkAndChangeAvatar();
  _mainWindow.loadFile('./windows/Overview/overview.html');
});

ipcMain.on('showOverview', function (event) {
  _mainWindow.loadFile('./windows/Overview/overview.html');
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

ipcMain.on('getUserInfo', function (event) {
  event.sender.send('sendUserInfo', [_steamUsername, _steamAvatarUrl]);
});

ipcMain.on('getDevInfo', function (event) {
  event.sender.send('sendDevInfo', { dev: !app.isPackaged, path: app.getAppPath()});
});

//#endregion

//#region functions

function init() {
  if(!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath);
  }
  if(!fs.existsSync(secretsPath)) {
    fs.mkdirSync(secretsPath);
  }
  if(!fs.existsSync(avatarsPath)) {
    fs.mkdirSync(avatarsPath);
  }
  if(!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, '[]');
  }
  if(!fs.existsSync(imageHashFilePath)) {
    fs.writeFileSync(imageHashFilePath, '[]');
  }
}

function checkAndChangeAvatar() {
  console.log('Checking for new avatar...')
  let today = new Date();

  let data = JSON.parse(fs.readFileSync(dataFilePath));

  let todaysData = data.filter((x) => {
    let dateFromArray = x.dateFrom.split('-');
    let dateToArray = x.dateTo.split('-');

    if(x.betweenYear) {
      return (new Date(today.getFullYear() + '-' + dateFromArray[1] + '-' + dateFromArray[2] + ' 00:00:00') < today || new Date(today.getFullYear() + '-' + dateToArray[1] + '-' + dateToArray[2] + ' 23:59:59') > today) && !x.isDefault;
    } else {
      return (new Date(today.getFullYear() + '-' + dateFromArray[1] + '-' + dateFromArray[2] + ' 00:00:00') < today && new Date(today.getFullYear() + '-' + dateToArray[1] + '-' + dateToArray[2] + ' 23:59:59') > today) && !x.isDefault;
    }
  });

  if(todaysData.length) {
    isSameImageAsCurrent(avatarsPath + '/' + todaysData[0].filePath).then(isSame => {
      if(!isSame){
        changeImage(avatarsPath + '/' + todaysData[0].filePath);
      } else {
        console.log("Avatar is already in use");
      }
    });
  } else {
    todaysData = data.filter(x => x.isDefault);
    if(todaysData.length) {
      let imageIndex = randomIntFromInterval(0, todaysData.length - 1)
      isSameImageAsCurrent(avatarsPath + '/' + todaysData[imageIndex].filePath).then(isSame => {
        if(!isSame) {
          changeImage(avatarsPath + '/' + todaysData[imageIndex].filePath);
        }else{
          console.log("Avatar is already in use");
        }
      });
    } else {
      console.log('No new avatar needed')
    }
  }
}

function isSameImageAsCurrent(imagePath) {
  return new Promise((res, rej) => {
    if(fs.existsSync(imageHashFilePath)) {

      let data = JSON.parse(fs.readFileSync(imageHashFilePath));
      if(data.length){
        let imageHashDataIndex = data.findIndex((x => x.imagePath === imagePath));

        if(imageHashFilePath !== -1) {
          imageHash(_steamAvatarUrl, 16, true, (error, onlineHash) => {
            if (error) res(false); 
            res(onlineHash === data[imageHashDataIndex].hash);
          });
        } else 
        {
          res(false);
        }
      } else {
        res(false);
      }
    } else {
      res(false);
    }
  })
}

function checkAndSaveImageHash(imagePath){
  if(fs.existsSync(imageHashFilePath)) {
    let data = JSON.parse(fs.readFileSync(imageHashFilePath));
    let imageHashDataIndex = data.findIndex((x => x.imagePath === imagePath));

    if(imageHashDataIndex === -1) {
      imageHash(_steamAvatarUrl, 16, true, (error, onlineHash) => {
        if (error) return; 
        data.push({imagePath, "hash": onlineHash});
        fs.writeFileSync(imageHashFilePath, JSON.stringify(data));
      });
    }
  }
}

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

//#endregion

//#region installer

autoUpdater.on('update-downloaded', () => {
  console.log("Update downloaded. Installing now..");
  autoUpdater.quitAndInstall(true,true);
});

function handleSquirrelEvent(application) {
  if (process.argv.length === 1) {
      return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
      let spawnedProcess, error;

      try {
          spawnedProcess = ChildProcess.spawn(command, args, {
              detached: true
          });
      } catch (error) {}

      return spawnedProcess;
  };

  const spawnUpdate = function(args) {
      return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
      case '--squirrel-install':
      case '--squirrel-updated':
          // Optionally do things such as:
          // - Add your .exe to the PATH
          // - Write to the registry for things like file associations and
          //   explorer context menus

          // Install desktop and start menu shortcuts
          spawnUpdate(['--createShortcut', exeName]);

          setTimeout(application.quit, 1000);
          return true;

      case '--squirrel-uninstall':
          // Undo anything you did in the --squirrel-install and
          // --squirrel-updated handlers

          // Remove desktop and start menu shortcuts
          spawnUpdate(['--removeShortcut', exeName]);

          setTimeout(application.quit, 1000);
          return true;

      case '--squirrel-obsolete':
          // This is called on the outgoing version of your app before
          // we update to the new version - it's the opposite of
          // --squirrel-updated

          application.quit();
          return true;
  }
};

//#endregion