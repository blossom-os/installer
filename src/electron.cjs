const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Logging function that writes to both console and file
const LOG_FILE = '/home/liveuser/installer.log';
function log(...args) {
	const timestamp = new Date().toISOString();
	const message = args
		.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
		.join(' ');
	const logEntry = `[${timestamp}] ${message}\n`;

	// Write to console
	console.log(...args);

	// Write to log file
	try {
		fs.appendFileSync(LOG_FILE, logEntry);
	} catch (error) {
		console.error('Failed to write to log file:', error.message);
	}
}

function logError(...args) {
	const timestamp = new Date().toISOString();
	const message = args
		.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
		.join(' ');
	const logEntry = `[${timestamp}] ERROR: ${message}\n`;

	// Write to console
	console.error(...args);

	// Write to log file
	try {
		fs.appendFileSync(LOG_FILE, logEntry);
	} catch (error) {
		console.error('Failed to write to log file:', error.message);
	}
}

// Try to require electron-context-menu safely
let contextMenu;
try {
	const contextMenuModule = require('electron-context-menu');
	contextMenu = contextMenuModule.default || contextMenuModule;
} catch (e) {
	log('Could not load electron-context-menu:', e.message);
	contextMenu = () => {}; // Fallback function
}

try {
	require('electron-reloader')(module);
} catch (e) {
	logError(e);
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
		log('Error loading URL, retrying', e);
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

	// Check for postinstall file
	const isPostInstall = fs.existsSync('/home/liveuser/.postinstall');

	if (dev) {
		loadVite(port);
		// Navigate to postinstall route if flag is present
		if (isPostInstall) {
			mainWindow.webContents.once('dom-ready', () => {
				mainWindow.webContents.executeJavaScript(`
					window.location.hash = '#/postinstall';
				`);
			});
		}
	} else {
		// Load the built app from the build directory
		if (isPostInstall) {
			mainWindow.loadFile(path.join(__dirname, '../index.html'), { hash: 'postinstall' });
		} else {
			mainWindow.loadFile(path.join(__dirname, '../index.html'));
		}
	}
}

app.once('ready', createMainWindow);
app.on('activate', () => {
	if (!mainWindow) {
		createMainWindow();
	}
});

// IPC handler to check if running in postinstall mode
ipcMain.handle('check-postinstall-mode', async () => {
	return fs.existsSync('/home/liveuser/.postinstall');
});

// IPC handler to get timezone based on IP location
ipcMain.handle('get-timezone-by-ip', async () => {
	try {
		log('Attempting to detect timezone via IP geolocation...');
		const response = await fetch('http://ip-api.com/json/?fields=timezone', {
			timeout: 10000, // 10 second timeout
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		log('Geolocation API response:', data);

		if (data.timezone) {
			log(`Detected timezone: ${data.timezone}`);
			return data.timezone;
		} else {
			log('No timezone in response, using UTC fallback');
			return 'UTC';
		}
	} catch (error) {
		logError('Failed to get timezone by IP:', error);
		log('Using UTC as fallback timezone');
		return 'UTC'; // Fallback to UTC
	}
});

// IPC handler to get available locales
ipcMain.handle('get-available-locales', async () => {
	try {
		const result = await execPromise('locale -a');
		const locales = result.stdout
			.split('\n')
			.filter((locale) => locale.includes('UTF-8') || locale.includes('utf8'));

		// Common locales with display names
		const commonLocales = [
			{ code: 'en_US.UTF-8', name: 'English (United States)', lang: 'en' },
			{ code: 'en_GB.UTF-8', name: 'English (United Kingdom)', lang: 'en' },
			{ code: 'de_DE.UTF-8', name: 'Deutsch (Deutschland)', lang: 'de' },
			{ code: 'fr_FR.UTF-8', name: 'Français (France)', lang: 'fr' },
			{ code: 'es_ES.UTF-8', name: 'Español (España)', lang: 'es' },
			{ code: 'it_IT.UTF-8', name: 'Italiano (Italia)', lang: 'it' },
			{ code: 'pt_PT.UTF-8', name: 'Português (Portugal)', lang: 'pt' },
			{ code: 'ru_RU.UTF-8', name: 'Русский (Россия)', lang: 'ru' },
			{ code: 'zh_CN.UTF-8', name: '中文 (中国)', lang: 'zh' },
			{ code: 'ja_JP.UTF-8', name: '日本語 (日本)', lang: 'ja' },
		];

		return commonLocales;
	} catch (error) {
		logError('Failed to get available locales:', error);
		return [{ code: 'en_US.UTF-8', name: 'English (United States)', lang: 'en' }];
	}
});

// IPC handler to get available keyboard layouts
ipcMain.handle('get-available-keyboard-layouts', async () => {
	const keyboardLayouts = [
		{ code: 'us', name: 'US English', lang: 'en' },
		{ code: 'gb', name: 'UK English', lang: 'en' },
		{ code: 'de-latin1-nodeadkeys', name: 'German', lang: 'de' },
		{ code: 'fr', name: 'French', lang: 'fr' },
		{ code: 'es', name: 'Spanish', lang: 'es' },
		{ code: 'it', name: 'Italian', lang: 'it' },
		{ code: 'pt', name: 'Portuguese', lang: 'pt' },
		{ code: 'ru', name: 'Russian', lang: 'ru' },
		{ code: 'cn', name: 'Chinese', lang: 'zh' },
		{ code: 'jp', name: 'Japanese', lang: 'ja' },
	];

	return keyboardLayouts;
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
			logError('Shutdown error:', error);
			return;
		}
		log('Shutdown command executed successfully');
	});
});

ipcMain.handle('run-command', (event, command) => {
	exec(command, (error, stdout, stderr) => {
		if (error) {
			logError(`Command error (${command}):`, error);
			return;
		}
		log(`Command executed successfully: ${command}`);
		if (stdout) log('stdout:', stdout);
		if (stderr) log('stderr:', stderr);
	});
});

ipcMain.handle('run-command-async', async (event, command) => {
	return execPromise(command);
});

// WiFi scanning handler
ipcMain.handle('scan-wifi', async (event) => {
	return new Promise((resolve, reject) => {
		exec('nmcli -t -f SSID,SIGNAL,SECURITY dev wifi', (error, stdout, stderr) => {
			if (error) {
				logError('WiFi scan error:', error);
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
						bssid: '',
					});
				}
			}

			// Remove duplicates and sort by signal strength
			const uniqueNetworks = networks.reduce((acc, network) => {
				const existing = acc.find((n) => n.ssid === network.ssid);
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
			command = `sudo nmcli dev wifi connect "${ssid}" password "${password}"`;
		} else {
			// For open networks
			command = `sudo nmcli dev wifi connect "${ssid}"`;
		}

		exec(command, (error, stdout, stderr) => {
			if (error) {
				logError('WiFi connection error:', error);
				// Check if it's a password error
				const isPasswordError =
					stderr.includes('Secrets were required') ||
					stderr.includes('802-1x authentication') ||
					stderr.includes('No suitable device found') ||
					error.message.includes('Secrets were required');

				reject({
					error: error.message,
					isPasswordError,
					stderr: stderr || '',
				});
				return;
			}

			log(`Successfully connected to ${ssid}`);
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

// Delete WiFi connection configuration
ipcMain.handle('delete-wifi-config', async (event, ssid) => {
	return new Promise((resolve) => {
		exec(`sudo nmcli connection delete "${ssid}"`, (error, stdout, stderr) => {
			if (error) {
				logError('Failed to delete WiFi config:', error);
				resolve(false);
				return;
			}

			log(`Deleted WiFi configuration for ${ssid}`);
			resolve(true);
		});
	});
});

// Disk scanning handler (filters out USB devices)
ipcMain.handle('scan-disks', async (event) => {
	return new Promise((resolve, reject) => {
		exec(
			'lsblk -J -o NAME,SIZE,MODEL,TYPE,TRAN,MOUNTPOINT,FSTYPE,ROTA',
			(error, stdout, stderr) => {
				if (error) {
					logError('Disk scan error:', error);
					resolve([]);
					return;
				}

				try {
					const data = JSON.parse(stdout);
					const disks = [];

					for (const device of data.blockdevices || []) {
						// Filter out USB devices and only include physical disks
						if (
							device.type === 'disk' &&
							device.tran !== 'usb' &&
							!device.name.startsWith('sr') && // CD/DVD drives
							!device.name.startsWith('loop')
						) {
							// Loop devices

							const partitions = [];
							if (device.children) {
								for (const child of device.children) {
									partitions.push({
										name: child.name,
										size: child.size,
										fstype: child.fstype,
										mountpoint: child.mountpoint,
									});
								}
							}

							// Improved disk type detection
							let diskType = 'HDD'; // Default to HDD

							if (device.tran === 'nvme') {
								diskType = 'NVMe';
							} else if (device.rota === false) {
								// ROTA=0 means no rotation, indicating SSD
								diskType = 'SSD';
							} else if (device.model?.toLowerCase().includes('ssd')) {
								// Fallback: check model name for "ssd"
								diskType = 'SSD';
							}

							disks.push({
								name: `/dev/${device.name}`,
								size: device.size,
								model: device.model || 'Unknown',
								type: diskType,
								partitions: partitions,
							});
						}
					}

					resolve(disks);
				} catch (parseError) {
					logError('Failed to parse disk data:', parseError);
					resolve([]);
				}
			},
		);
	});
});

// Check if system is UEFI or BIOS
ipcMain.handle('check-boot-mode', async (event) => {
	return new Promise((resolve) => {
		exec('ls /sys/firmware/efi', (error, stdout, stderr) => {
			resolve(!error); // true if UEFI, false if BIOS
		});
	});
});

// Detect NVIDIA graphics card
ipcMain.handle('detect-nvidia', async (event) => {
	return new Promise((resolve) => {
		exec('lspci | grep -i nvidia', (error, stdout, stderr) => {
			if (error) {
				log('NVIDIA detection: No NVIDIA card found or lspci failed');
				resolve({ hasNvidia: false, error: error.message });
				return;
			}

			const gpuLines = stdout
				.trim()
				.split('\n')
				.filter((line) => line.trim());
			if (gpuLines.length === 0) {
				log('NVIDIA detection: No NVIDIA cards in lspci output');
				resolve({ hasNvidia: false });
				return;
			}

			log('NVIDIA detection: Found NVIDIA hardware');

			// Parse GPU information
			const gpuInfo = gpuLines.map((line) => {
				// Extract GPU name from lspci output
				const match = line.match(/NVIDIA.*?: (.+)/);
				return {
					name: match ? match[1].trim() : 'NVIDIA Graphics Card',
					raw: line.trim(),
				};
			});

			// Try to get additional info with nvidia-smi if available
			exec(
				'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits',
				(smiError, smiOut) => {
					if (!smiError && smiOut.trim()) {
						const smiLines = smiOut.trim().split('\n');
						smiLines.forEach((smiLine, index) => {
							if (gpuInfo[index]) {
								const [name, memory] = smiLine.split(',').map((s) => s.trim());
								if (name && name !== 'N/A') gpuInfo[index].name = name;
								if (memory && memory !== 'N/A')
									gpuInfo[index].memory = `${memory} MB`;
							}
						});
					}

					log('NVIDIA detection result:', { hasNvidia: true, gpuInfo });
					resolve({ hasNvidia: true, gpuInfo });
				},
			);
		});
	});
});

// Store language and keyboard settings
let installerSettings = {
	language: 'en',
	keyboard: 'us',
	locale: 'en_US.UTF-8',
};

const languageToLocaleMap = {
	en: 'en_US.UTF-8',
	de: 'de_DE.UTF-8',
	fr: 'fr_FR.UTF-8',
	es: 'es_ES.UTF-8',
};

ipcMain.handle('set-language', async (event, languageCode) => {
	installerSettings.language = languageCode;
	installerSettings.locale = languageToLocaleMap[languageCode] || 'en_US.UTF-8';
	log(`Language set to: ${languageCode} (${installerSettings.locale})`);
	return true;
});

ipcMain.handle('set-keyboard', async (event, keyboardCode) => {
	installerSettings.keyboard = keyboardCode;
	log(`Keyboard set to: ${keyboardCode}`);
	return true;
});

ipcMain.handle('get-installer-settings', async (event) => {
	return installerSettings;
});

// Install blossomOS
ipcMain.handle('install-system', async (event, diskPath) => {
	return new Promise(async (resolve, reject) => {
		try {
			log(`Starting installation on ${diskPath}`);

			const isUEFI = await new Promise((res) => {
				exec('ls /sys/firmware/efi', (error) => {
					log('Boot mode check:', error ? 'BIOS' : 'UEFI');
					res(!error);
				});
			});

			// Step 1: Analyze disk and create partitions
			event.sender.send('installation-progress', { step: 'analyze', progress: 10 });
			log('Analyzing disk...');

			const hasNTFS = await checkForNTFS(diskPath);
			const hasFreeSpace = await checkFreeSpace(diskPath);
			log(`NTFS detected: ${hasNTFS}, Free space: ${hasFreeSpace}`);

			let installPartition;
			if (hasNTFS && hasFreeSpace) {
				// Install alongside Windows
				event.sender.send('installation-progress', {
					step: 'partition-alongside',
					progress: 20,
				});
				log('Creating partition alongside existing data...');
				installPartition = await createAlongsidePartition(diskPath, isUEFI);
			} else {
				// Wipe entire disk
				event.sender.send('installation-progress', {
					step: 'partition-wipe',
					progress: 20,
				});
				log('Wiping and partitioning disk...');
				installPartition = await wipeAndPartition(diskPath, isUEFI);
			}
			log('Partitions created:', installPartition);

			// Step 2: Format partitions
			event.sender.send('installation-progress', { step: 'format', progress: 30 });
			log('Formatting partitions...');
			await formatPartitions(installPartition, isUEFI);

			// Step 3: Mount partitions
			event.sender.send('installation-progress', { step: 'mount', progress: 40 });
			log('Mounting partitions...');
			await mountPartitions(installPartition, isUEFI);

			// Step 4: Install base system
			event.sender.send('installation-progress', { step: 'install-base', progress: 50 });
			log('Installing base system...');
			await installBaseSystem(installPartition.root);

			// Step 5: Configure system
			event.sender.send('installation-progress', { step: 'configure', progress: 70 });
			log('Configuring system...');

			let timezone = 'UTC';

			// Try to get timezone by IP
			try {
				const response = await fetch('http://ip-api.com/json/?fields=timezone');
				const data = await response.json();
				if (data.timezone) {
					timezone = data.timezone;
					log(`Detected timezone: ${timezone}`);
				}
			} catch (error) {
				logError('Failed to detect timezone, using UTC:', error);
			}

			// Use saved installer settings for configuration
			log(
				`Using installer settings - Language: ${installerSettings.language}, Locale: ${installerSettings.locale}, Keyboard: ${installerSettings.keyboard}, Timezone: ${timezone}`,
			);
			await configureSystem(installerSettings.locale, installerSettings.keyboard, timezone);

			// Step 6: Install bootloader
			event.sender.send('installation-progress', { step: 'bootloader', progress: 85 });
			log('Installing bootloader...');
			if (isUEFI) {
				await installEFIBootloader(installPartition.root);
			} else {
				await installGRUB(diskPath);
			}

			// Step 7: Copy blossomOS files
			event.sender.send('installation-progress', { step: 'finalize', progress: 90 });
			log('Copying blossomOS files...');
			await execPromiseWithSudo(`cp /etc/issue /mnt/etc/issue`);
			await execPromiseWithSudo(`cp /etc/os-release /mnt/etc/os-release`);
			await execPromiseWithSudo(`cp /etc/motd /mnt/etc/motd`);
			await execPromiseWithSudo(`cp /opt/blossomos-installer/static/logo.svg /mnt/usr/share/pixmaps/blossomos-logo.svg`);

			// Create hooks directory
			await execPromiseWithSudo(`mkdir -p /mnt/etc/pacman.d/hooks`);

			// Create hook to preserve blossomOS files
			const hookContent = `[Trigger]\nOperation = Install\nOperation = Upgrade\nType = Package\nTarget = filesystem\n\n[Action]\nDescription = Preserving blossomOS branding files...\nWhen = PostTransaction\nExec = /bin/bash -c 'cp /etc/issue.blossom /etc/issue 2>/dev/null || true; cp /etc/os-release.blossom /etc/os-release 2>/dev/null || true; cp /etc/motd.blossom /etc/motd 2>/dev/null || true'`;

			await execPromise(
				`echo -e '${hookContent}' | sudo tee /mnt/etc/pacman.d/hooks/blossom-branding.hook`,
			);

			// Backup original files
			await execPromiseWithSudo(`cp /etc/issue /mnt/etc/issue.blossom`);
			await execPromiseWithSudo(`cp /etc/os-release /mnt/etc/os-release.blossom`);
			await execPromiseWithSudo(`cp /etc/motd /mnt/etc/motd.blossom`);
			await execPromiseWithSudo(`cp -r /usr/share/blossomos/ /mnt/usr/share/blossomos/`);

			// Create snapshot
			log('Creating initial BTRFS snapshot...');
			event.sender.send('installation-progress', { step: 'finalize', progress: 95 });
			await execPromiseWithSudo(
				`arch-chroot /mnt bash -c "timeshift --create --comments 'Initial Snapshot' --tags D"`,
			);

			// Step 8: Cleanup
			event.sender.send('installation-progress', { step: 'cleanup', progress: 100 });
			log('Cleaning up...');
			await cleanupMounts();

			log('Installation completed successfully!');
			resolve({ success: true, message: 'Installation completed successfully!' });
		} catch (error) {
			logError('Installation error:', error);

			// Properly serialize error information for IPC
			let errorMessage = 'Unknown error occurred';
			let errorDetails = {};

			if (error) {
				// Extract error message from various possible sources
				errorMessage =
					error.message ||
					error.error?.message ||
					error.stderr ||
					error.stdout ||
					String(error);

				// Create serializable error details
				errorDetails = {
					type: error.constructor?.name || 'Error',
					message: errorMessage,
					stack: error.stack,
					stderr: error.stderr,
					stdout: error.stdout,
					command: error.command,
					code: error.code,
					signal: error.signal,
				};

				// Log detailed error information
				logError('Error type:', errorDetails.type);
				logError('Error message:', errorDetails.message);
				logError('Error stderr:', errorDetails.stderr);
				logError('Error stdout:', errorDetails.stdout);
				logError('Error command:', errorDetails.command);
				logError('Error stack:', errorDetails.stack);
			}

			// Send detailed error information that can be properly serialized
			reject({
				error: errorMessage,
				details: errorDetails,
				timestamp: new Date().toISOString(),
			});
		}
	});
});

// Helper functions for installation
function execPromise(command) {
	return new Promise((resolve, reject) => {
		log(`Executing: ${command}`);
		exec(command, (error, stdout, stderr) => {
			if (error) {
				logError(`Command failed: ${command}`);
				logError(`Error code: ${error.code}`);
				logError(`Error signal: ${error.signal}`);
				logError(`Error message: ${error.message}`);
				logError(`Stdout: ${stdout}`);
				logError(`Stderr: ${stderr}`);

				// Create a serializable error object
				const execError = {
					message: error.message,
					code: error.code,
					signal: error.signal,
					stdout: stdout,
					stderr: stderr,
					command: command,
				};

				reject(execError);
			} else {
				log(`Command success: ${command}`);
				if (stdout) log(`Stdout: ${stdout}`);
				if (stderr) log(`Stderr: ${stderr}`);
				resolve({ stdout, stderr });
			}
		});
	});
}

function execPromiseWithSudo(command) {
	return execPromise(`sudo ${command}`);
}

async function checkForNTFS(diskPath) {
	try {
		const result = await execPromise(`lsblk -f ${diskPath}`);
		return result.stdout.includes('ntfs');
	} catch (error) {
		return false;
	}
}

async function checkFreeSpace(diskPath) {
	try {
		const result = await execPromiseWithSudo(`parted ${diskPath} print free`);
		return result.stdout.includes('Free Space');
	} catch (error) {
		log(`Could not check free space on ${diskPath}:`, error.stderr);
		return false;
	}
}

async function createAlongsidePartition(diskPath, isUEFI) {
	try {
		// Find the end of the last partition and create new ones
		const partInfo = await execPromiseWithSudo(`parted ${diskPath} print`);

		// Get the end of the last partition
		const lines = partInfo.stdout.split('\n');
		let lastEnd = '50%'; // Fallback to 50% of disk

		for (const line of lines) {
			if (line.trim().match(/^\d+\s+/)) {
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 3) {
					lastEnd = parts[2];
				}
			}
		}

		// Create root partition (BTRFS) - use remaining space
		await execPromiseWithSudo(`parted ${diskPath} mkpart primary btrfs ${lastEnd} 100%`);

		// Get partition number
		const partNum = await getLastPartitionNumber(diskPath);
		return {
			root: `${diskPath}${partNum}`,
			efi: null, // Use existing EFI partition
		};
	} catch (error) {
		throw new Error(`Failed to create alongside partition: ${error.stderr || error.message}`);
	}
}

async function wipeAndPartition(diskPath, isUEFI) {
	try {
		// Wipe the disk
		await execPromiseWithSudo(`wipefs -a ${diskPath}`);

		if (isUEFI) {
			// Create GPT partition table
			await execPromiseWithSudo(`parted ${diskPath} mklabel gpt`);

			// Create EFI partition (512MB)
			await execPromiseWithSudo(`parted ${diskPath} mkpart primary fat32 1MiB 513MiB`);
			await execPromiseWithSudo(`parted ${diskPath} set 1 esp on`);

			// Create root partition (rest of disk)
			await execPromiseWithSudo(`parted ${diskPath} mkpart primary btrfs 513MiB 100%`);

			return {
				efi: `${diskPath}1`,
				root: `${diskPath}2`,
			};
		} else {
			// Create MBR partition table
			await execPromiseWithSudo(`parted ${diskPath} mklabel msdos`);

			// Create root partition (entire disk)
			await execPromiseWithSudo(`parted ${diskPath} mkpart primary btrfs 1MiB 100%`);
			await execPromiseWithSudo(`parted ${diskPath} set 1 boot on`);

			return {
				root: `${diskPath}1`,
				efi: null,
			};
		}
	} catch (error) {
		throw new Error(`Failed to wipe and partition disk: ${error.stderr || error.message}`);
	}
}

async function formatPartitions(partitions, isUEFI) {
	try {
		if (isUEFI && partitions.efi) {
			await execPromiseWithSudo(`mkfs.fat -F32 ${partitions.efi}`);
		}
		await execPromiseWithSudo(`mkfs.btrfs -f ${partitions.root}`);
	} catch (error) {
		throw new Error(`Failed to format partitions: ${error.stderr || error.message}`);
	}
}

async function mountPartitions(partitions, isUEFI) {
	try {
		// Create mount directories
		await execPromiseWithSudo(`mkdir -p /mnt`);

		// Mount root partition
		await execPromiseWithSudo(`mount ${partitions.root} /mnt`);

		// Create subvolumes
		await execPromiseWithSudo(`btrfs subvolume create /mnt/@`);
		await execPromiseWithSudo(`btrfs subvolume create /mnt/@home`);
		await execPromiseWithSudo(`btrfs subvolume create /mnt/@var`);

		// Unmount and remount with subvolumes
		await execPromiseWithSudo(`umount /mnt`);
		await execPromiseWithSudo(`mount -o subvol=@ ${partitions.root} /mnt`);
		await execPromiseWithSudo(`mkdir -p /mnt/home /mnt/var`);
		await execPromiseWithSudo(`mount -o subvol=@home ${partitions.root} /mnt/home`);
		await execPromiseWithSudo(`mount -o subvol=@var ${partitions.root} /mnt/var`);

		if (isUEFI && partitions.efi) {
			await execPromiseWithSudo(`mkdir -p /mnt/boot`);
			await execPromiseWithSudo(`mount ${partitions.efi} /mnt/boot`);
		}
	} catch (error) {
		throw new Error(`Failed to mount partitions: ${error.stderr || error.message}`);
	}
}

async function installBaseSystem(rootPartition) {
	// Update package databases
	await execPromiseWithSudo(`pacman -Sy`);

	// Install base system
	await execPromiseWithSudo(
		`pacstrap /mnt base base-devel linux linux-firmware btrfs-progs networkmanager `,
	);

	// Generate fstab
	await execPromise(`genfstab -U /mnt | sudo tee /mnt/etc/fstab`);

	// Initialize pacman keyring
	await execPromiseWithSudo(`arch-chroot /mnt pacman-key --init`);
	await execPromiseWithSudo(`arch-chroot /mnt pacman-key --populate archlinux`);
	await execPromiseWithSudo(`arch-chroot /mnt pacman-key --refresh-keys`);

	// Install minimal KDE in chroot
	await installMinimalKDEChroot(rootPartition);
}

async function installMinimalKDEChroot(rootPartition) {
	const CHROOT = 'arch-chroot /mnt';
	const USER = 'liveuser';

	log('Starting minimal KDE installation in chroot...');

	// Minimal KDE packages
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -Sy --noconfirm --needed plasma-meta flatpak unzip git bash-completion"`,
	);

	// Debloat Plasma
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -R --noconfirm discover plasma-meta archlinux-appstream-data plasma-welcome"`,
	);

	// User setup
	await execPromiseWithSudo(`cp /etc/skel/.bashrc /mnt/etc/skel/.bashrc`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "useradd -m -G wheel,audio,video,optical,storage,power,network ${USER}"`,
	);
	await execPromiseWithSudo(`${CHROOT} bash -c "cp /etc/skel/.bashrc /home/${USER}/.bashrc"`);
	await execPromiseWithSudo(`${CHROOT} bash -c "passwd -d ${USER}"`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "sed -i 's/# %wheel ALL=(ALL:ALL) NOPASSWD: ALL/%wheel ALL=(ALL:ALL) NOPASSWD: ALL/' /etc/sudoers"`,
	);

	// Bun installation
	await execPromiseWithSudo(
		`${CHROOT} bash -c "sudo -u ${USER} bash -c 'curl -fsSL https://bun.sh/install | bash'"`,
	);

	log('Configuring SDDM autologin...');
	await execPromiseWithSudo(`${CHROOT} bash -c "mkdir -p /etc/sddm.conf.d"`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "cat >/etc/sddm.conf.d/autologin.conf <<EOF\n[Autologin]\nUser=${USER}\nSession=plasma.desktop\nRelogin=true\nEOF"`,
	);

	// Autostart desktop entry
	await execPromiseWithSudo(`${CHROOT} bash -c "mkdir -p /home/${USER}/.config/autostart"`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "cat >/home/${USER}/.config/autostart/postinstall.desktop <<EOF\n[Desktop Entry]\nName=BlossomOS Post Install\nExec=/opt/blossomos-installer/start.sh\nType=Application\nX-KDE-autostart-after=panel\nHidden=false\nNoDisplay=false\nEOF"`,
	);
	await execPromiseWithSudo(`${CHROOT} chown -R ${USER}:${USER} /home/${USER}`);
	await execPromiseWithSudo(`${CHROOT} systemctl enable sddm.service`);

	// Copy installer files
	log('Copying installer files...');
	await execPromiseWithSudo(`cp -r /opt/blossomos-installer /mnt/opt/blossomos-installer`);
	await execPromiseWithSudo(`chmod +x /mnt/opt/blossomos-installer/start.sh`);
	await execPromiseWithSudo(`touch /mnt/home/${USER}/.postinstall`);
	await execPromiseWithSudo(`${CHROOT} chown ${USER}:${USER} /home/${USER}/.postinstall`);
	await execPromiseWithSudo(`${CHROOT} chown -R ${USER}:${USER} /opt/blossomos-installer`);

	// Essential packages
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -S --noconfirm --needed c-ares ffmpeg gtk3 libevent libvpx libxslt libxss minizip nss re2 snappy libnotify libappindicator-gtk3 curl unzip git at-spi2-core"`,
	);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -S --noconfirm --needed pipewire pipewire-alsa pipewire-pulse wireplumber bluez bluez-utils gnome-bluetooth alsa-utils"`,
	);
	await execPromiseWithSudo(`${CHROOT} systemctl enable bluetooth.service`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -S --noconfirm --needed cups cups-browsed avahi nss-mdns hplip system-config-printer cups-pk-helper python-pysmbc"`,
	);
	await execPromiseWithSudo(`${CHROOT} systemctl enable cups cups-browsed avahi-daemon`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "sed -i '/^hosts:/ s/mymachines resolve \\[!UNAVAIL=return\\] files myhostname dns/mymachines mdns_minimal [NOTFOUND=return] resolve [!UNAVAIL=return] files myhostname dns/' /etc/nsswitch.conf"`,
	);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -S --noconfirm --needed kdeconnect skanpage qt6-tools sshfs"`,
	);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -S --noconfirm --needed noto-fonts-emoji noto-fonts-cjk noto-fonts-extra noto-fonts ttf-dejavu"`,
	);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -S --noconfirm --needed dolphin konsole kate systemsettings okular ark spectacle solaar"`,
	);

	// Chaotic-AUR setup
	log('Enabling Chaotic-AUR repository...');
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman-key --recv-key 3056513887B78AEB --keyserver keyserver.ubuntu.com"`,
	);
	await execPromiseWithSudo(`${CHROOT} bash -c "pacman-key --lsign-key 3056513887B78AEB"`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -U --noconfirm 'https://cdn-mirror.chaotic.cx/chaotic-aur/chaotic-keyring.pkg.tar.zst'"`,
	);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -U --noconfirm 'https://cdn-mirror.chaotic.cx/chaotic-aur/chaotic-mirrorlist.pkg.tar.zst'"`,
	);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "echo -e '\\n[chaotic-aur]\\nInclude = /etc/pacman.d/chaotic-mirrorlist' >> /etc/pacman.conf"`,
	);
	await execPromiseWithSudo(`${CHROOT} bash -c "pacman -Syu --noconfirm"`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "pacman -S --noconfirm --needed yay konsave bazaar-git krunner-bazaar kwin-effect-rounded-corners-git"`,
	);

	// Flatpaks
	await execPromiseWithSudo(
		`${CHROOT} bash -c "flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo"`,
	);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "flatpak install -y flathub org.mozilla.firefox org.libreoffice.LibreOffice org.videolan.VLC it.mijorus.gearlever"`,
	);

	// Timeshift setup with dynamic UUIDs
	await execPromiseWithSudo(`${CHROOT} bash -c "pacman -S --noconfirm --needed timeshift"`);

	// Dynamically fetch UUIDs
	const backupUUID = await new Promise((resolve) => {
		exec(`blkid -s UUID -o value ${rootPartition}`, (error, stdout) => {
			resolve(!error && stdout.trim().length > 0 ? stdout.trim() : '');
		});
	});
	log(`Detected UUID for Timeshift: ${backupUUID}`);

	await execPromiseWithSudo(`${CHROOT} bash -c "mkdir -p /etc/timeshift"`);
	await execPromiseWithSudo(
		`${CHROOT} bash -c "echo '{\\\"backup_device_uuid\\\" : \\\"${backupUUID}\\\", \\\"parent_device_uuid\\\" : \\\"${backupUUID}\\\", \\\"do_first_run\\\" : \\\"false\\\", \\\"btrfs_mode\\\" : \\\"true\\\", \\\"include_btrfs_home_for_backup\\\" : \\\"true\\\", \\\"include_btrfs_home_for_restore\\\" : \\\"false\\\", \\\"stop_cron_emails\\\" : \\\"true\\\", \\\"schedule_monthly\\\" : \\\"false\\\", \\\"schedule_weekly\\\" : \\\"false\\\", \\\"schedule_daily\\\" : \\\"true\\\", \\\"schedule_hourly\\\" : \\\"true\\\", \\\"schedule_boot\\\" : \\\"true\\\", \\\"count_monthly\\\" : \\\"2\\\", \\\"count_weekly\\\" : \\\"3\\\", \\\"count_daily\\\" : \\\"5\\\", \\\"count_hourly\\\" : \\\"6\\\", \\\"count_boot\\\" : \\\"5\\\", \\\"date_format\\\" : \\\"%Y-%m-%d %H:%M:%S\\\", \\\"exclude\\\" : [], \\\"exclude-apps\\\" : [] }' > /etc/timeshift/timeshift.json"`,
	);

	log('Minimal KDE installation in chroot completed.');
}

async function configureSystem(locale = 'en_US.UTF-8', keyboardLayout = 'us', timezone = 'UTC') {
	log(
		`Configuring system with locale: ${locale}, keyboard: ${keyboardLayout}, timezone: ${timezone}`,
	);
	log(`Installer settings keyboard: ${installerSettings.keyboard}`);

	// Use the installer settings keyboard layout if available, fallback to parameter
	const finalKeyboardLayout = installerSettings.keyboard || keyboardLayout;
	log(`Final keyboard layout to be used: ${finalKeyboardLayout}`);

	// Set timezone based on IP location or user selection
	const timezoneFile = timezone.replace('/', '\\/'); // Escape for sed
	await execPromiseWithSudo(
		`arch-chroot /mnt ln -sf /usr/share/zoneinfo/${timezone} /etc/localtime`,
	);
	await execPromiseWithSudo(`arch-chroot /mnt hwclock --systohc`);

	// Configure locale based on selection
	const localeBase = locale.split('.')[0]; // e.g., en_US from en_US.UTF-8
	await execPromiseWithSudo(`arch-chroot /mnt sed -i 's/#${locale}/${locale}/' /etc/locale.gen`);

	// Also enable en_US.UTF-8 as fallback if different locale selected
	if (locale !== 'en_US.UTF-8') {
		await execPromiseWithSudo(
			`arch-chroot /mnt sed -i 's/#en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen`,
		);
	}

	await execPromiseWithSudo(`arch-chroot /mnt locale-gen`);
	await execPromise(`echo 'LANG=${locale}' | sudo tee /mnt/etc/locale.conf`);

	// Set keyboard layout
	await execPromise(`echo 'KEYMAP=${finalKeyboardLayout}' | sudo tee /mnt/etc/vconsole.conf`);

	// Configure X11 keyboard layout
	await execPromiseWithSudo(`arch-chroot /mnt mkdir -p /etc/X11/xorg.conf.d`);
	await execPromise(`cat << EOF | sudo tee /mnt/etc/X11/xorg.conf.d/00-keyboard.conf
Section "InputClass"
    Identifier "system-keyboard"
    MatchIsKeyboard "on"
    Option "XkbLayout" "${finalKeyboardLayout}"
EndSection
EOF`);

	// Set hostname
	await execPromise(`echo 'blossomos' | sudo tee /mnt/etc/hostname`);

	// Set root password (empty for recovery)
	await execPromiseWithSudo(`arch-chroot /mnt passwd -d root`);

	// Enable essential services
	await execPromiseWithSudo(`arch-chroot /mnt systemctl enable NetworkManager`);

	// Install NVIDIA drivers if detected
	try {
		// Check if NVIDIA was detected during installation
		const nvidiaDetected = await new Promise((resolve) => {
			exec('lspci | grep -i nvidia', (error, stdout) => {
				resolve(!error && stdout.trim().length > 0);
			});
		});

		if (nvidiaDetected) {
			log('NVIDIA card detected, installing NVIDIA drivers...');
			progressCallback({ step: 'nvidia-install', progress: 85 });

			// Install NVIDIA packages
			await execPromiseWithSudo(`arch-chroot /mnt pacman -S --noconfirm nvidia nvidia-utils`);
			log('NVIDIA drivers installed successfully');
		} else {
			log('No NVIDIA card detected, skipping NVIDIA driver installation');
		}
	} catch (error) {
		log('Error checking/installing NVIDIA drivers:', error.message);
		// Don't fail the installation if NVIDIA installation fails
	}
}

async function installEFIBootloader(rootPartition) {
	// Install systemd-boot
	await execPromiseWithSudo(`arch-chroot /mnt bootctl install`);

	// Create bootloader entry with disk identifier and BTRFS subvolume support
	const bootEntry = `title   blossomOS
linux   /vmlinuz-linux
initrd  /initramfs-linux.img
options root=${rootPartition} rootflags=subvol=@ rw quiet`;

	await execPromise(`echo -e '${bootEntry}' | sudo tee /mnt/boot/loader/entries/blossomos.conf`);

	// Add Windows entry if Windows is detected
	try {
		const windowsPartition = await detectWindowsPartition();
		if (windowsPartition) {
			log(`Windows detected on ${windowsPartition}, adding boot entry...`);
			const windowsEntry = `title   Windows
	efi     /EFI/Microsoft/Boot/bootmgfw.efi`;

			await execPromise(
				`echo -e '${windowsEntry}' | sudo tee /mnt/boot/loader/entries/windows.conf`,
			);
			log('Windows boot entry added successfully');
		}
	} catch (error) {
		log('Error detecting/adding Windows entry:', error.message);
		// Don't fail installation if Windows detection fails
	}

	// Configure loader
	const loaderConfig = `default  blossomos
timeout  3
console-mode max
editor   no`;

	await execPromise(`echo -e '${loaderConfig}' | sudo tee /mnt/boot/loader/loader.conf`);
}

async function installGRUB(diskPath) {
	// Install GRUB packages
	await execPromiseWithSudo(`arch-chroot /mnt pacman -S --noconfirm grub`);

	// Install GRUB to disk
	await execPromiseWithSudo(`arch-chroot /mnt grub-install --target=i386-pc ${diskPath}`);

	await execPromiseWithSudo(`arch-chroot /mnt pacman -S --noconfirm os-prober`);
	await execPromiseWithSudo(
		`arch-chroot /mnt sed -i 's/#GRUB_DISABLE_OS_PROBER=false/GRUB_DISABLE_OS_PROBER=false/' /etc/default/grub`,
	);
	await execPromiseWithSudo(`arch-chroot /mnt sed -i 's/Arch/blossomOS/' /etc/default/grub`);

	// Generate GRUB config
	await execPromiseWithSudo(`arch-chroot /mnt grub-mkconfig -o /boot/grub/grub.cfg`);
}

async function cleanupMounts() {
	// Unmount all partitions
	await execPromiseWithSudo(`umount -R /mnt`).catch(() => {});
}

async function getLastPartitionNumber(diskPath) {
	try {
		const result = await execPromiseWithSudo(`parted ${diskPath} print`);
		const lines = result.stdout.split('\n');
		let maxPartNum = 0;

		for (const line of lines) {
			const match = line.trim().match(/^(\d+)\s+/);
			if (match) {
				maxPartNum = Math.max(maxPartNum, parseInt(match[1]));
			}
		}

		return maxPartNum;
	} catch (error) {
		throw new Error(`Failed to get partition number: ${error.stderr || error.message}`);
	}
}

ipcMain.handle(
  'setup-user-account',
  async (event, name, computerName, email, username, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        log(`Setting up user account: ${username}`);

        await execPromiseWithSudo(
          `useradd -m -G wheel,audio,video,optical,storage,power,network ${username}`
        );
		await execPromiseWithSudo(`cp /etc/skel/.bashrc /home/${username}/.bashrc`);

        if (password && password.length > 0) {
          await execPromise(
            `echo '${username}:${password}' | sudo chpasswd`
          );
        } else {
          await execPromiseWithSudo(`passwd -d ${username}`);
        }

        await execPromise(`echo '${computerName}' | sudo tee /etc/hostname`);

        await execPromiseWithSudo(
          `bash -c "sed -i 's/^Email=.*/Email=${email}/' /var/lib/AccountsService/users/${username} || echo 'Email=${email}' >> /var/lib/AccountsService/users/${username}"`
        );

		const naturalScrollScript = `
#!/bin/bash
OUT=$(sudo libinput list-devices)
TOUCH_KERNELS=$(echo "$OUT" | awk 'BEGIN{IGNORECASE=1} /^Device:.*touchpad/{touch=1} touch && /^Kernel:/ {print $2; touch=0}')
if [ -z "$TOUCH_KERNELS" ]; then
  exit 1
fi

for KERNEL in $TOUCH_KERNELS; do
  DEVICE_NAME=$(basename "$KERNEL")
  DBUS_PATH="/org/kde/KWin/InputDevice/$DEVICE_NAME"
  busctl --user set-property org.kde.KWin "$DBUS_PATH" org.kde.KWin.InputDevice naturalScroll b true
done
`;

		await execPromiseWithSudo(
		`mkdir -p /home/${username}/.config/autostart && echo "${naturalScrollScript.replace(/"/g, '\\"')}" | sudo tee /home/${username}/.config/autostart/set-natural-scroll.sh && sudo chmod +x /home/${username}/.config/autostart/set-natural-scroll.sh`
		);

		await execPromise(
			`echo -e '[Desktop Entry]\\nType=Application\\nExec=bash -c \'/home/${username}/.config/autostart/set-natural-scroll.sh && rm /home/${username}/.config/autostart/set-natural-scroll.sh /home/${username}/.config/autostart/set-natural-scroll.desktop\'\\nHidden=false\\nNoDisplay=false\\nName=Set Natural Scroll\\n' | sudo tee /home/${username}/.config/autostart/set-natural-scroll.desktop`
		);

		await execPromise(
			`echo -e 'konsave -i /usr/share/blossomos/theme.knsv\\nkonsave -a theme\\nkquitapp6 plasmashell && plasmashell &!' | sudo tee /home/${username}/.config/autostart/apply-theme.sh && sudo chmod +x /home/${username}/.config/autostart/apply-theme.sh`
		);

		await execPromise(
			`echo -e '[Desktop Entry]\\nType=Application\\nExec=bash -c \'/home/${username}/.config/autostart/apply-theme.sh && rm /home/${username}/.config/autostart/apply-theme.sh /home/${username}/.config/autostart/apply-theme.desktop\'\\nHidden=false\\nNoDisplay=false\\nName=Apply BlossomOS Theme\\n' | sudo tee /home/${username}/.config/autostart/apply-theme.desktop`
		);

		await execPromiseWithSudo(`chown -R ${username}:${username} /home/${username}`);

        await execPromiseWithSudo(`chfn -f "${name}" ${username}`);

        const removeScript = `#!/bin/bash
set -e
userdel -r liveuser || true
rm -rf /opt/blossomos-installer || true
rm -rf /home/liveuser || true
systemctl disable remove-liveuser.service || true
rm -f /etc/systemd/system/remove-liveuser.service || true
`;
        await execPromiseWithSudo(
          `tee /usr/local/bin/remove-liveuser.sh <<'EOF'\n${removeScript}\nEOF`
        );
        await execPromiseWithSudo(`chmod +x /usr/local/bin/remove-liveuser.sh`);

        const serviceContent = `[Unit]
Description=Remove liveuser and installer after first boot
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/remove-liveuser.sh
RemainAfterExit=true

[Install]
WantedBy=multi-user.target
`;
        await execPromiseWithSudo(
          `tee /etc/systemd/system/remove-liveuser.service <<'EOF'\n${serviceContent}\nEOF`
        );

        await execPromiseWithSudo(`systemctl unmask remove-liveuser.service || true`);
        await execPromiseWithSudo(`systemctl daemon-reload`);
        await execPromiseWithSudo(`systemctl enable remove-liveuser.service`);

        await execPromiseWithSudo(`rm -f /etc/sddm.conf.d/autologin.conf`);

        log('User account setup completed successfully');
        resolve({ success: true });

        await execPromiseWithSudo(`reboot`);
      } catch (error) {
        logError('User account setup error:', error);
        reject({ error: error.message });
      }
    });
  }
);
