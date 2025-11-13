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
	navigate: (path) => {
		window.location.hash = path;
	},
});
