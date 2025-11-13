const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Try to require electron-context-menu safely
let contextMenu;
try {
	const contextMenuModule = require('electron-context-menu');
	contextMenu = contextMenuModule.default || contextMenuModule;
} catch (e) {
	console.log('Could not load electron-context-menu:', e.message);
	contextMenu = () => {}; // Fallback function
}

try {
	require('electron-reloader')(module);
} catch (e) {
	console.error(e);
}

const port = process.env.PORT || 5173;
const dev = !app.isPackaged;
let mainWindow;

function createWindow() {

	const mainWindow = new BrowserWindow({
		titleBarStyle: 'hidden',
		autoHideMenuBar: true,
		trafficLightPosition: {
			x: 17,
			y: 32,
		},
		width: 800,
		height: 900,
		webPreferences: {
			enableRemoteModule: true,
			contextIsolation: true,
			nodeIntegration: true,
			spellcheck: false,
			devTools: dev,
			preload: path.join(__dirname, 'preload.cjs'),
		},
		frame: false,
		transparent: true,
	});

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});

	return mainWindow;
}

function loadVite(port) {
	mainWindow.loadURL(`http://localhost:${port}`).catch((e) => {
		console.log('Error loading URL, retrying', e);
		setTimeout(() => {
			loadVite(port);
		}, 200);
	});
}

function createMainWindow() {
	mainWindow = createWindow();
	mainWindow.once('close', () => {
		mainWindow = null;
	});

	if (dev) loadVite(port);
	else {
		// Load the built app
		mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
	}
}

app.once('ready', createMainWindow);
app.on('activate', () => {
	if (!mainWindow) {
		createMainWindow();
	}
});
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('to-main', (event, count) => {
	return mainWindow.webContents.send('from-main', `next count is ${count + 1}`);
});
