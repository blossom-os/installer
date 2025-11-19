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
		return ipcRenderer.invoke('run-command', command);
	},
	runCommandAsync: (command) => {
		return ipcRenderer.invoke('run-command-async', command);
	},
	// WiFi functions
	scanWifi: () => {
		return ipcRenderer.invoke('scan-wifi');
	},
	connectWifi: (ssid, password) => {
		return ipcRenderer.invoke('connect-wifi', ssid, password);
	},
	checkSavedWifiConfig: (ssid) => {
		return ipcRenderer.invoke('check-saved-wifi-config', ssid);
	},
	deleteWifiConfig: (ssid) => {
		return ipcRenderer.invoke('delete-wifi-config', ssid);
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
	// Installer functions
	scanDisks: () => {
		return ipcRenderer.invoke('scan-disks');
	},
	checkBootMode: () => {
		return ipcRenderer.invoke('check-boot-mode');
	},
	detectNvidia: () => {
		return ipcRenderer.invoke('detect-nvidia');
	},
	installSystem: (diskPath) => {
		return ipcRenderer.invoke('install-system', diskPath);
	},
	onInstallationProgress: (callback) => {
		ipcRenderer.on('installation-progress', (event, data) => callback(data));
	},
	removeInstallationProgressListener: () => {
		ipcRenderer.removeAllListeners('installation-progress');
	},
	checkPostinstallMode: () => {
		return ipcRenderer.invoke('check-postinstall-mode');
	},
	// Localization functions
	getTimezoneByIP: () => {
		return ipcRenderer.invoke('get-timezone-by-ip');
	},
	getAvailableLocales: () => {
		return ipcRenderer.invoke('get-available-locales');
	},
	getAvailableKeyboardLayouts: () => {
		return ipcRenderer.invoke('get-available-keyboard-layouts');
	},
	setLanguage: (languageCode) => {
		return ipcRenderer.invoke('set-language', languageCode);
	},
	setKeyboard: (keyboardCode) => {
		return ipcRenderer.invoke('set-keyboard', keyboardCode);
	},
	getInstallerSettings: () => {
		return ipcRenderer.invoke('get-installer-settings');
	},
	loadTranslations: async (languageCode) => {
		try {
			const response = await fetch(`/locales/${languageCode}.json`);
			return await response.json();
		} catch (error) {
			console.error('Failed to load translations:', error);
			throw error;
		}
	},
	setupUserAccount: (userData) => {
		return ipcRenderer.invoke('setup-user-account', userData);
	}
});

// Also expose installer-specific functions under window.installer
contextBridge.exposeInMainWorld('installer', {
	getAvailableLanguages: () => {
		return ipcRenderer.invoke('get-available-locales');
	},
	getAvailableKeyboards: () => {
		return ipcRenderer.invoke('get-available-keyboard-layouts');
	},
	getTimezone: () => {
		return ipcRenderer.invoke('get-timezone-by-ip');
	},
	setLanguage: (languageCode) => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('installer-language', languageCode);
		}
		// Also save to electron main process
		ipcRenderer.invoke('set-language', languageCode);
		return Promise.resolve(languageCode);
	},
	setKeyboard: (keyboardCode) => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('installer-keyboard', keyboardCode);
		}
		// Also save to electron main process  
		ipcRenderer.invoke('set-keyboard', keyboardCode);
		return Promise.resolve(keyboardCode);
	},
	getLanguage: () => {
		if (typeof localStorage !== 'undefined') {
			return Promise.resolve(localStorage.getItem('installer-language') || 'en');
		}
		return Promise.resolve('en');
	},
	getKeyboard: () => {
		if (typeof localStorage !== 'undefined') {
			return Promise.resolve(localStorage.getItem('installer-keyboard') || 'us');
		}
		return Promise.resolve('us');
	},
	setKeyboard: (keyboardCode) => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('installer-keyboard', keyboardCode);
		}
		return Promise.resolve(keyboardCode);
	},
	getLanguage: () => {
		if (typeof localStorage !== 'undefined') {
			return Promise.resolve(localStorage.getItem('installer-language') || 'en');
		}
		return Promise.resolve('en');
	},
	getKeyboard: () => {
		if (typeof localStorage !== 'undefined') {
			return Promise.resolve(localStorage.getItem('installer-keyboard') || 'us');
		}
		return Promise.resolve('us');
	},
	loadTranslations: async (languageCode) => {
		try {
			const response = await fetch(`/locales/${languageCode}.json`);
			return await response.json();
		} catch (error) {
			console.error('Failed to load translations:', error);
			throw error;
		}
	}
});
