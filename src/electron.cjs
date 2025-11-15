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
			logError('Shutdown error:', error);
			return;
		}
		log('Shutdown command executed successfully');
	});
});

ipcMain.on('run-command', (event, command) => {
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
		exec('lsblk -J -o NAME,SIZE,MODEL,TYPE,TRAN,MOUNTPOINT,FSTYPE,ROTA', (error, stdout, stderr) => {
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
		});
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
			await installBaseSystem();

			// Step 5: Configure system
			event.sender.send('installation-progress', { step: 'configure', progress: 70 });
			log('Configuring system...');
			await configureSystem();

			// Step 6: Install bootloader
			event.sender.send('installation-progress', { step: 'bootloader', progress: 85 });
			log('Installing bootloader...');
			if (isUEFI) {
				await installEFIBootloader(installPartition.root);
			} else {
				await installGRUB(diskPath);
			}

			// Step 7: Copy blossomOS files
			event.sender.send('installation-progress', { step: 'finalize', progress: 95 });
			log('Copying blossomOS files...');
			await copyBlossomFiles();
			await createPacmanHook();

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

async function installBaseSystem() {
	// Update package databases
	await execPromiseWithSudo(`pacman -Sy`);

	// Install base system
	await execPromiseWithSudo(
		`pacstrap /mnt base base-devel linux linux-firmware btrfs-progs networkmanager`,
	);

	// Generate fstab
	await execPromise(`genfstab -U /mnt | sudo tee /mnt/etc/fstab`);
}

async function configureSystem() {
	// Set timezone
	await execPromiseWithSudo(`arch-chroot /mnt ln -sf /usr/share/zoneinfo/UTC /etc/localtime`);
	await execPromiseWithSudo(`arch-chroot /mnt hwclock --systohc`);

	// Configure locale
	await execPromiseWithSudo(
		`arch-chroot /mnt sed -i 's/#en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen`,
	);
	await execPromiseWithSudo(`arch-chroot /mnt locale-gen`);
	await execPromise(`echo 'LANG=en_US.UTF-8' | sudo tee /mnt/etc/locale.conf`);

	// Set hostname
	await execPromise(`echo 'blossomos' | sudo tee /mnt/etc/hostname`);

	// Configure hosts file
	const hostsContent = `127.0.0.1\tlocalhost\n::1\t\tlocalhost\n127.0.1.1\tblossomos.localdomain\tblossomos`;
	await execPromise(`echo -e '${hostsContent}' | sudo tee /mnt/etc/hosts`);

	// Set root password (empty for recovery)
	await execPromiseWithSudo(`arch-chroot /mnt passwd -d root`);

	// Enable essential services
	await execPromiseWithSudo(`arch-chroot /mnt systemctl enable NetworkManager`);
}

async function installEFIBootloader(rootPartition) {
	// Install systemd-boot
	await execPromiseWithSudo(`arch-chroot /mnt bootctl install`);

	// Create bootloader entry with disk identifier and BTRFS subvolume support
	const bootEntry = `title   blossomOS
linux   /vmlinuz-linux
initrd  /initramfs-linux.img
options root=${rootPartition} rootflags=subvol=@ rw quiet`;

	await execPromise(
		`echo -e '${bootEntry}' | sudo tee /mnt/boot/loader/entries/blossomos.conf`,
	);

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
		`arch-chroot /mnt sed -i 's/GRUB_DISABLE_OS_PROBER=true/GRUB_DISABLE_OS_PROBER=false/' /etc/default/grub`,
	);

	// Generate GRUB config
	await execPromiseWithSudo(`arch-chroot /mnt grub-mkconfig -o /boot/grub/grub.cfg`);
}

async function copyBlossomFiles() {
	// Copy blossomOS branding files
	await execPromiseWithSudo(`cp /etc/issue /mnt/etc/issue`);
	await execPromiseWithSudo(`cp /etc/os-release /mnt/etc/os-release`);
	await execPromiseWithSudo(`cp /etc/motd /mnt/etc/motd`);
}

async function createPacmanHook() {
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
