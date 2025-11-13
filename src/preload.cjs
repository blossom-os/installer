const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
	send: (channel, data) => {
		ipcRenderer.send(channel, data);
	},
	sendSync: (channel, data) => {
		ipcRenderer.sendSync(channel, data);
	},
	receive: (channel, func) => {
		ipcRenderer.on(channel, (event, ...args) => func(...args));
	},
	shutdown: () => {
		ipcRenderer.send('shutdown');
	},
	runCommand: (command) => {
		ipcRenderer.send('run-command', command);
	},
	scanWifi: () => {
		return ipcRenderer.invoke('scan-wifi');
	},
	connectWifi: (ssid, password) => {
		return ipcRenderer.invoke('connect-wifi', ssid, password);
	},
	checkSavedWifiConfig: (ssid) => {
		return ipcRenderer.invoke('check-saved-wifi-config', ssid);
	},
	checkNetworkConnection: (ssid) => {
		return ipcRenderer.invoke('check-network-connection', ssid);
	},
	getCurrentWifi: () => {
		return ipcRenderer.invoke('get-current-wifi');
	},
	navigate: (path) => {
		window.location.hash = path;
	},
});
