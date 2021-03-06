const electron = require('electron');
const url = require('url');
const path = require('path');
const dirTree = require('dir-tree-creator');
const mongoose = require('mongoose');
const { app, BrowserWindow, ipcMain } = electron;

// Mongoose setup.
mongoose.Promise = global.Promise;
// TODO: Set autoindex false for production.
mongoose.connect('mongodb://localhost/drivetracker', { useMongoClient: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() { console.log("connected"); });

const driveSchema = mongoose.Schema({
  name: String,
  notes: String,
  lastUpdated: String,
  data: String
});
const Drive = mongoose.model('Drive', driveSchema);

const walk = require('walk');

addDrive('/Volumes/UNTITLED');

function addDrive(drive) {
  const files = [];
  const walker = walk.walk(drive, { followLinks: false });
  const driveName = drive.split('/').pop();
  console.log("LOADING...");

  dirTree(drive, { hidden: false }, (err, tr) => {
    // TODO: Better error handling.
    if (err) return console.error(err);
    const newDrive = new Drive({
      name: driveName,
      notes: "",
      lastUpdated: "",
      data: tr
    });
    newDrive.save(function (err, newDrive) {
      // TODO: Better error handling.
      if (err) return console.error(err);
      console.log("DONE");
    });
  });

  /*walker.on('file', function(root, stat, next) {
    files.push({
      file: root + '/' + stat.name,
      created: stat.ctime
    });
    next();
  });
  walker.on('end', function() {
    const newDrive = new Drive({
      name: driveName,
      notes: "",
      data: files
    })
    newDrive.save(function (err, newDrive) {
      if (err) return console.error(err);
      console.log("DONE!");
    });
  });*/
}



//addDrive('/Volumes/onslot_2');

//process.env.NODE_ENV = 'production';

let mainWindow;
let addWindow;

app.on('ready', function() {
  mainWindow = new BrowserWindow({});
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'views/home.html'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.webContents.on('did-finish-load', () => {
    Drive.find({}, 'name id',function(err, drives) {
      // TODO: Better error handling.
      if (err) return console.error(err);
      mainWindow.webContents.send('loadDriveList', JSON.stringify(drives));
    });
  });



  // Quit app when main window closed.
  mainWindow.on('close', function() {
    app.quit();
  });

});

ipcMain.on('addWindow:open', function() {
  createAddWindow();
});

ipcMain.on('addDrive', function(e, pathname) {
  addWindow.close();
});

ipcMain.on('getFiles', function(e, id) {
  Drive.findOne({ '_id': id }, function(err, drive) {
    // TODO: Handle error better.
    if (err) return console.error(err);
    mainWindow.webContents.send('loadDriveContents', JSON.stringify(drive));
  });
});

// Handle create add window.
function createAddWindow() {
  if (addWindow == null) {
    // Create new window.
    addWindow = new BrowserWindow({
      width: 200,
      height: 200,
      title: 'Add Drive'
    });
    // Load html into window.
    addWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'views/addWindow.html'),
      protocol: 'file:',
      slashes: true
    }));



    // Handle garble collection.
    addWindow.on('close', function() {
      addWindow = null
      addWindowOpen = false;
    });
  }
}
