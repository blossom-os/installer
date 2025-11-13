const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
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
		// Load the built app from the build directory
		mainWindow.loadFile(path.join(__dirname, '../index.html'));
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

ipcMain.on('shutdown', (event) => {
	exec('sudo poweroff', (error, stdout, stderr) => {
		if (error) {
			console.error('Shutdown error:', error);
			return;
		}
		console.log('Shutdown command executed successfully');
	});
});

ipcMain.on('run-command', (event, command) => {
	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Command error (${command}):`, error);
			return;
		}
		console.log(`Command executed successfully: ${command}`);
		if (stdout) console.log('stdout:', stdout);
		if (stderr) console.log('stderr:', stderr);
	});
});

// WiFi scanning handler
ipcMain.handle('scan-wifi', async (event) => {
	return new Promise((resolve, reject) => {
		exec('nmcli -t -f SSID,SIGNAL,SECURITY dev wifi', (error, stdout, stderr) => {
			if (error) {
				console.error('WiFi scan error:', error);
				resolve([]);
				return;
			}
			
			const networks = [];
			const lines = stdout.trim().split('\n');
			
			for (const line of lines) {
				if (!line) continue;
				const [ssid, signal, security] = line.split(':');
				
				if (ssid && ssid !== '--') {
					let securityType = 'open';
					if (security.includes('WPA3')) securityType = 'wpa3';
					else if (security.includes('WPA2')) securityType = 'wpa2';
					else if (security.includes('WPA')) securityType = 'wpa';
					
					networks.push({
						ssid,
						signal: parseInt(signal) || 0,
						security: securityType,
						connected: false, // Will be checked individually
						bssid: ''
					});
				}
			}
			
			// Remove duplicates and sort by signal strength
			const uniqueNetworks = networks.reduce((acc, network) => {
				const existing = acc.find(n => n.ssid === network.ssid);
				if (!existing || network.signal > existing.signal) {
					if (existing) {
						acc.splice(acc.indexOf(existing), 1);
					}
					acc.push(network);
				}
				return acc;
			}, []);
			
			resolve(uniqueNetworks.sort((a, b) => b.signal - a.signal));
		});
	});
});

// Check connection status for a specific network
ipcMain.handle('check-network-connection', async (event, ssid) => {
	return new Promise((resolve) => {
		exec(`nmcli -t -f NAME,DEVICE connection show --active`, (error, stdout, stderr) => {
			if (error) {
				resolve(false);
				return;
			}
			
			const activeConnections = stdout.trim().split('\n');
			for (const connection of activeConnections) {
				const [name, device] = connection.split(':');
				// Check if this is the SSID we're looking for and it's on a WiFi device
				if (name === ssid && device && device.startsWith('wl')) {
					resolve(true);
					return;
				}
			}
			resolve(false);
		});
	});
});

// Get currently connected WiFi network
ipcMain.handle('get-current-wifi', async (event) => {
	return new Promise((resolve) => {
		exec(`nmcli -t -f NAME,TYPE,DEVICE connection show --active`, (error, stdout, stderr) => {
			if (error) {
				resolve(null);
				return;
			}
			
			const activeConnections = stdout.trim().split('\n');
			for (const connection of activeConnections) {
				const [name, type, device] = connection.split(':');
				// Look for WiFi connections (type 802-11-wireless or device starting with wl)
				if ((type === '802-11-wireless' || (device && device.startsWith('wl'))) && name) {
					resolve(name);
					return;
				}
			}
			resolve(null);
		});
	});
});

// WiFi connection handler
ipcMain.handle('connect-wifi', async (event, ssid, password) => {
	return new Promise((resolve, reject) => {
		let command;
		if (password) {
			// For secured networks
			command = `nmcli dev wifi connect "${ssid}" password "${password}"`;
		} else {
			// For open networks
			command = `nmcli dev wifi connect "${ssid}"`;
		}
		
		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error('WiFi connection error:', error);
				reject(error);
				return;
			}
			
			console.log(`Successfully connected to ${ssid}`);
			resolve({ success: true, message: `Connected to ${ssid}` });
		});
	});
});

// Check for saved WiFi configuration
ipcMain.handle('check-saved-wifi-config', async (event, ssid) => {
	return new Promise((resolve) => {
		exec(`nmcli -t -f NAME connection show | grep "^${ssid}$"`, (error, stdout, stderr) => {
			if (error) {
				// No saved configuration found
				resolve(false);
				return;
			}
			
			// Found saved configuration
			resolve(stdout.trim() === ssid);
		});
	});
});
