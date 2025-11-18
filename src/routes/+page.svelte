<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Item from '$lib/components/ui/item/index.js';

	// Check for postinstall mode on component mount
	onMount(async () => {
		if (window.electron) {
			try {
				const isPostinstall = await window.electron.checkPostinstallMode();
				if (isPostinstall) {
					goto('/postinstall');
				}
			} catch (error) {
				console.error('Failed to check postinstall mode:', error);
			}
		}
	});

	function handleGparted() {
		if (window.electron) {
			window.electron.runCommand('pkexec gparted');
		} else {
			console.log('Electron API not available');
		}
	}

	function handleTimeshift() {
		if (window.electron) {
			window.electron.runCommand('timeshift-launcher');
		} else {
			console.log('Electron API not available');
		}
	}

	function handleTerminal() {
		if (window.electron) {
			window.electron.runCommand('kitty');
		} else {
			console.log('Electron API not available');
		}
	}

	function handleFirefox() {
		if (window.electron) {
			window.electron.runCommand('firefox');
		} else {
			console.log('Electron API not available');
		}
	}

	function handleShutdown() {
		if (window.electron) {
			window.electron.shutdown();
		} else {
			console.log('Electron API not available');
		}
	}

	function handleWifi() {
		goto('/wifi');
	}

	function handleInstaller() {
		goto('/installer/welcome');
	}
</script>

<main>
	<Card.Header class="mt-4">
		<Card.Title>blossomOS Recovery Environment</Card.Title>
		<Card.Description class="mt-2 text-muted-foreground">
			This is the blossomOS recovery environment where you can reinstall the operating system
			or perform system recovery tasks.
		</Card.Description>
	</Card.Header>
	<Card.Content class="mt-2">
		<button on:click={handleInstaller} class="block w-full">
			<Item.Root class="cursor-pointer">
				<Item.Media />
				<Item.Content>
					<Item.Title>Install blossomOS</Item.Title>
					<Item.Description class="text-left">
						Launch the blossomOS installer to install the operating system.
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<img
						src="/installer.svg"
						alt="Install blossomOS"
						width="48"
						height="48"
						class="cursor-pointer"
					/>
				</Item.Actions>
			</Item.Root>
		</button>
		<button on:click={handleGparted} class="block w-full">
			<Item.Root class="cursor-pointer">
				<Item.Media />
				<Item.Content>
					<Item.Title>Partition Manager</Item.Title>
					<Item.Description class="text-left">
						Launch the partition manager to manage disk partitions and format drives.
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<img
						src="/gparted.svg"
						alt="Partition Manager"
						width="48"
						height="48"
						class="cursor-pointer"
					/>
				</Item.Actions>
			</Item.Root>
		</button>
		<button on:click={handleTimeshift} class="block w-full">
			<Item.Root class="cursor-pointer">
				<Item.Media />
				<Item.Content>
					<Item.Title>Backup and Restore</Item.Title>
					<Item.Description class="text-left">
						Access Timeshift to create or restore system backups.
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<img
						src="/backup.svg"
						alt="Backup and Restore"
						width="48"
						height="48"
						class="cursor-pointer"
					/>
				</Item.Actions>
			</Item.Root>
		</button>
		<button on:click={handleTerminal} class="block w-full">
			<Item.Root class="cursor-pointer">
				<Item.Media />
				<Item.Content>
					<Item.Title>Terminal</Item.Title>
					<Item.Description class="text-left">
						Open a terminal to perform advanced system recovery tasks using command-line
						tools.
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<img
						src="/terminal.svg"
						alt="System Terminal"
						width="48"
						height="48"
						class="cursor-pointer"
					/>
				</Item.Actions>
			</Item.Root>
		</button>
		<button on:click={handleFirefox} class="block w-full">
			<Item.Root class="cursor-pointer">
				<Item.Media />
				<Item.Content>
					<Item.Title>Firefox</Item.Title>
					<Item.Description class="text-left">
						Launch the Firefox web browser to access online help and resources.
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<img
						src="/firefox.svg"
						alt="Firefox"
						width="48"
						height="48"
						class="cursor-pointer"
					/>
				</Item.Actions>
			</Item.Root>
		</button>
		<button on:click={handleWifi} class="block w-full">
			<Item.Root class="cursor-pointer">
				<Item.Media />
				<Item.Content>
					<Item.Title>WiFi Manager</Item.Title>
					<Item.Description class="text-left">
						Open the WiFi manager to connect to wireless networks.
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<img
						src="/wifi.svg"
						alt="WiFi Manager"
						width="48"
						height="48"
						class="cursor-pointer"
					/>
				</Item.Actions>
			</Item.Root>
		</button>
		<button on:click={handleShutdown} class="block w-full">
			<Item.Root class="cursor-pointer">
				<Item.Media />
				<Item.Content>
					<Item.Title>Shutdown</Item.Title>
					<Item.Description class="text-left">
						Shut down the system safely.
					</Item.Description>
				</Item.Content>
				<Item.Actions>
					<img
						src="/shutdown.svg"
						alt="System Shutdown"
						width="48"
						height="48"
						class="cursor-pointer"
					/>
				</Item.Actions>
			</Item.Root>
		</button>
	</Card.Content>
</main>
