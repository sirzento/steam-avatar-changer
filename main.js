const { app, BrowserWindow, ipcMain, Tray, Menu  } = require('electron')
const path = require('path')
const SteamCommunity = require('steamcommunity');
const fs = require('fs');
let community = new SteamCommunity();
const schedule = require('node-schedule');

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


function createWindow () {
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
        getSteamUserInfo();
        loadOverview();
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
      getSteamUserInfo();
      console.log("Login Erfolgreich");
      loadOverview();
		}
	})
}

function loadOverview() {
  let exists = fs.existsSync("./data.json");
  let empty = true;
  if(exists) {
    let data = JSON.parse(fs.readFileSync('./data.json'));
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

function getSteamUserInfo() {
  community.getSteamUser(community.steamID, (err, user) => {
    if(err) {
      console.log(err.message);
    }
    _steamAvatarUrl = user.getAvatarURL();
    _steamUsername = user.name;
  })
}


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
    if(fs.existsSync('./secrets/guard.secret')) {
      fs.rmSync('./secrets/guard.secret');
      fs.rmSync('./secrets/auth.secret');
    }
    _mainWindow.loadFile('index.html');
})

ipcMain.on('newDate', function (event) {
  _mainWindow.loadFile('./windows/date/date.html');
});

ipcMain.on('editDate', function (event, id) {
  let data = JSON.parse(fs.readFileSync('./data.json'));
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
  let data = JSON.parse(fs.readFileSync('./data.json'));
  let exists = data.find(x => x.id == id);
  if(exists) {
    data = data.filter(x => x.id != id);
    fs.writeFileSync('./data.json', JSON.stringify(data));
    event.sender.send('refreshList');
  }
});

ipcMain.on('saveDate', function (event, date) {
  if(date.filePath.includes('/')){
    let newFilePath = date.filePath.split('/')[date.filePath.split('/').length - 1];
    fs.copyFileSync(date.filePath, './avatars/' + newFilePath);
    date.filePath = newFilePath;
  }
  let startYear = parseInt(date.dateFrom.split('-')[0]);
  let endYear = parseInt(date.dateTo.split('-')[0]);

  date.betweenYear = endYear - startYear > 0;


  // TODO nur ein default gleichzeitig
  let data = JSON.parse(fs.readFileSync('./data.json'));
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

  fs.writeFileSync('./data.json', JSON.stringify(data));
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

const job = schedule.scheduleJob('0 0 * * *', () => { 
  checkAndChangeAvatar();
}) // run everyday at midnight
checkAndChangeAvatar();

function checkAndChangeAvatar() {
  let today = new Date();

  let data = JSON.parse(fs.readFileSync('./data.json'));

  let todaysData = data.filter((x) => {
    let dateFromArray = x.dateFrom.split('-');
    let dateToArray = x.dateTo.split('-');

    if(x.betweenYear) {
      return new Date(today.getFullYear() + '-' + dateFromArray[1] + '-' + dateFromArray[2] + ' 00:00:00') < today || new Date(today.getFullYear() + '-' + dateToArray[1] + '-' + dateToArray[2] + ' 23:59:59') > today
    } else {
      return new Date(today.getFullYear() + '-' + dateFromArray[1] + '-' + dateFromArray[2] + ' 00:00:00') < today && new Date(today.getFullYear() + '-' + dateToArray[1] + '-' + dateToArray[2] + ' 23:59:59') > today
    }
  });

  if(todaysData.length) {
    changeImage('./avatars/' + todaysData[0].filePath);
  } else {
    todaysData = data.filter(x => x.isDefault);
    if(todaysData.length) {
      changeImage('./avatars/' + todaysData[0].filePath);
    }
  }
}

function changeImage(imagePath) {
	community.uploadAvatar(imagePath, "png", function(err, url) {
		console.log(url);
    _steamAvatarUrl = url;
	})
}