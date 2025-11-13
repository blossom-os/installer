<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Item from '$lib/components/ui/item/index.js';

	function handleGparted() {
		if (window.electron) {
			window.electron.runCommand('gparted');
		} else {
			console.log('Electron API not available');
		}
	}

	function handleTimeshift() {
		if (window.electron) {
			window.electron.runCommand('timeshift-gtk');
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
</script>

<main>
	<Card.Header class="mt-4">
		<Card.Title>blossomOS Recovery Environment</Card.Title>
		<Card.Description class="mt-2 text-muted-foreground">
			This is the blossomOS recovery environment where you can reinstall the operating system
			or perform system recovery tasks.
		</Card.Description>
	</Card.Header>
	<Card.Content class="mt-6">
		<Item.Root class="cursor-pointer">
			<Item.Media />
			<Item.Content>
				<Item.Title>Install blossomOS</Item.Title>
				<Item.Description>
					Launch the blossomOS installer to install the operating system.
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<button>
					<img
						src="/installer.svg"
						alt="Install blossomOS"
						width="64"
						height="64"
						class="cursor-pointer"
					/>
				</button>
			</Item.Actions>
		</Item.Root>
		<Item.Root class="cursor-pointer">
			<Item.Media />
			<Item.Content>
				<Item.Title>Partition Manager</Item.Title>
				<Item.Description>
					Launch the partition manager to manage disk partitions and format drives.
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<button on:click={handleGparted}>
					<img
						src="/gparted.svg"
						alt="Partition Manager"
						width="64"
						height="64"
						class="cursor-pointer"
					/>
				</button>
			</Item.Actions>
		</Item.Root>
		<Item.Root class="cursor-pointer">
			<Item.Media />
			<Item.Content>
				<Item.Title>Backup and Restore</Item.Title>
				<Item.Description>
					Access Timeshift to create or restore system backups.
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<button on:click={handleTimeshift}>
					<img
						src="/backup.svg"
						alt="Backup and Restore"
						width="64"
						height="64"
						class="cursor-pointer"
					/>
				</button>
			</Item.Actions>
		</Item.Root>
		<Item.Root class="cursor-pointer">
			<Item.Media />
			<Item.Content>
				<Item.Title>Terminal</Item.Title>
				<Item.Description>
					Open a terminal to perform advanced system recovery tasks using command-line
					tools.
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<button on:click={handleTerminal}>
					<img
						src="/terminal.svg"
						alt="System Terminal"
						width="64"
						height="64"
						class="cursor-pointer"
					/>
				</button>
			</Item.Actions>
		</Item.Root>
		<Item.Root class="cursor-pointer">
			<Item.Media />
			<Item.Content>
				<Item.Title>Firefox</Item.Title>
				<Item.Description>
					Launch the Firefox web browser to access online help and resources.
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<button on:click={handleFirefox}>
					<img
						src="/firefox.svg"
						alt="Firefox"
						width="64"
						height="64"
						class="cursor-pointer"
					/>
				</button>
			</Item.Actions>
		</Item.Root>
		<Item.Root class="cursor-pointer">
			<Item.Media />
			<Item.Content>
				<Item.Title>WiFi Manager</Item.Title>
				<Item.Description>
					Open the WiFi manager to connect to wireless networks.
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<button>
					<img
						src="/wifi.svg"
						alt="WiFi Manager"
						width="64"
						height="64"
						class="cursor-pointer"
					/>
				</button>
			</Item.Actions>
		</Item.Root>
		<Item.Root class="cursor-pointer">
			<Item.Media />
			<Item.Content>
				<Item.Title>Shutdown</Item.Title>
				<Item.Description>Shut down the system safely.</Item.Description>
			</Item.Content>
			<Item.Actions>
				<button on:click={handleShutdown}>
					<img
						src="/shutdown.svg"
						alt="System Shutdown"
						width="64"
						height="64"
						class="cursor-pointer"
					/>
				</button>
			</Item.Actions>
		</Item.Root>
	</Card.Content>
</main>
