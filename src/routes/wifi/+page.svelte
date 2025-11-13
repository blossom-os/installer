<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Item from '$lib/components/ui/item';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	interface WiFiNetwork {
		ssid: string;
		signal: number;
		security: 'open' | 'wpa' | 'wpa2' | 'wpa3';
		connected: boolean;
		bssid: string;
	}

	let networks: WiFiNetwork[] = [];
	let allNetworks: WiFiNetwork[] = [];
	let showAllNetworks = false;
	let scanning = false;
	let connecting = false;
	let selectedNetwork: WiFiNetwork | null = null;
	let password = '';
	let showPasswordInput = false;
	let currentConnection: string | null = null;

	const MAX_DISPLAYED_NETWORKS = 5;

	function handleBack() {
		goto('/');
	}

	async function scanNetworks() {
		scanning = true;
		try {
			if (window.electron) {
				const result = await window.electron.scanWifi();
				allNetworks = result || [];

				// Get current connection separately
				currentConnection = await window.electron.getCurrentWifi();

				// Check connection status for each network individually
				for (const network of allNetworks) {
					network.connected = await window.electron.checkNetworkConnection(network.ssid);
				}

				// Limit displayed networks
				networks = showAllNetworks
					? allNetworks
					: allNetworks.slice(0, MAX_DISPLAYED_NETWORKS);
			}
		} catch (error) {
			console.error('Failed to scan networks:', error);
		} finally {
			scanning = false;
		}
	}

	async function connectToNetwork(network: WiFiNetwork) {
		// Check if we're already connected to this network
		if (network.connected) {
			console.log(`Already connected to ${network.ssid}`);
			return;
		}

		connecting = true;
		try {
			// First try to connect using saved configuration
			if (window.electron) {
				const hasSavedConfig = await window.electron.checkSavedWifiConfig(network.ssid);

				if (hasSavedConfig || network.security === 'open') {
					// Connect directly for open networks or networks with saved config
					await window.electron.connectWifi(network.ssid, '');
					connecting = false;
					scanNetworks(); // Refresh to show connection status
					return;
				}
			}

			// If no saved config, show password input for secured networks
			connecting = false;
			selectedNetwork = network;
			showPasswordInput = true;
		} catch (error) {
			console.error('Failed to connect:', error);
			connecting = false;
		}
	}

	async function connectWithPassword() {
		if (!selectedNetwork || !password) return;

		connecting = true;
		try {
			if (window.electron) {
				await window.electron.connectWifi(selectedNetwork.ssid, password);
			}
		} catch (error) {
			console.error('Failed to connect:', error);
		} finally {
			connecting = false;
			showPasswordInput = false;
			selectedNetwork = null;
			password = '';
			// Refresh the network list
			scanNetworks();
		}
	}

	function toggleShowAllNetworks() {
		showAllNetworks = !showAllNetworks;
		networks = showAllNetworks ? allNetworks : allNetworks.slice(0, MAX_DISPLAYED_NETWORKS);
	}

	function cancelConnection() {
		showPasswordInput = false;
		selectedNetwork = null;
		password = '';
	}

	function getSecurityText(security: string): string {
		switch (security) {
			case 'open':
				return 'Open';
			case 'wpa':
				return 'WPA';
			case 'wpa2':
				return 'WPA2';
			case 'wpa3':
				return 'WPA3';
			default:
				return 'Unknown';
		}
	}

	function getSignalIcon(signal: number): string {
		if (signal > 75) return '📶';
		if (signal > 50) return '📶';
		if (signal > 25) return '📶';
		return '📶';
	}

	onMount(() => {
		scanNetworks();
	});
</script>

<main>
	<Card.Header class="mt-4">
		<div class="flex items-center gap-4">
			<Button variant="outline" onclick={handleBack}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.75 19.5 8.25 12l7.5-7.5"
					/>
				</svg>
			</Button>
			<div>
				<Card.Title>WiFi Manager</Card.Title>
				<Card.Description class="mt-2 text-muted-foreground">
					Connect to wireless networks in your recovery environment.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content class="mt-6">
		<div class="flex justify-between items-center mb-4">
			<h3 class="text-lg font-semibold">Available Networks</h3>
			<Button onclick={scanNetworks} disabled={scanning} variant="default">
				{scanning ? 'Scanning...' : 'Refresh'}
			</Button>
		</div>

		{#if networks.length === 0 && !scanning}
			<div class="text-center py-8 text-gray-500">
				No networks found. Click refresh to scan for networks.
			</div>
		{:else if scanning}
			<div class="text-center py-8 text-gray-500">Scanning for networks...</div>
		{:else}
			{#each networks as network}
				<button
					on:click={() => connectToNetwork(network)}
					disabled={connecting}
					class="block w-full mb-2"
				>
					<Item.Root class="cursor-pointer hover:bg-gray-50">
						<Item.Media />
						<Item.Content>
							<Item.Title class="flex items-center justify-between">
								<span>{network.ssid}</span>
								<span class="text-sm font-normal">
									{getSignalIcon(network.signal)}
									{network.signal}%
								</span>
							</Item.Title>
							<Item.Description class="text-left flex items-center justify-between">
								<span>{getSecurityText(network.security)}</span>
							</Item.Description>
						</Item.Content>
						<Item.Actions>
							{#if network.connected}
								<span class="text-green-600 text-sm font-medium">Connected</span>
							{:else if network.security === 'open'}
								<span class="text-xs text-gray-500">Click to connect</span>
							{:else}
								<span class="text-xs text-gray-500">🔒</span>
							{/if}
						</Item.Actions>
					</Item.Root>
				</button>
			{/each}

			{#if allNetworks.length > MAX_DISPLAYED_NETWORKS}
				<div class="text-center mt-4">
					<Button variant="outline" onclick={toggleShowAllNetworks} class="w-full">
						{showAllNetworks
							? `Show Less (${MAX_DISPLAYED_NETWORKS} of ${allNetworks.length})`
							: `Show More (${allNetworks.length - MAX_DISPLAYED_NETWORKS} more)`}
					</Button>
				</div>
			{/if}
		{/if}
	</Card.Content>

	{#if showPasswordInput && selectedNetwork}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
				<Card.Root class="border-0 shadow-none">
					<Card.Header>
						<Card.Title>Connect to {selectedNetwork.ssid}</Card.Title>
						<Card.Description>
							This network is secured with {getSecurityText(
								selectedNetwork.security,
							)}. Please enter the password.
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<Input
							type="password"
							bind:value={password}
							placeholder="Enter network password"
							class="mb-4"
							onkeydown={(e) => e.key === 'Enter' && connectWithPassword()}
						/>
						<div class="flex gap-2">
							<Button
								variant="outline"
								onclick={cancelConnection}
								disabled={connecting}
								class="flex-1"
							>
								Cancel
							</Button>
							<Button
								onclick={connectWithPassword}
								disabled={!password || connecting}
								class="flex-1"
							>
								{connecting ? 'Connecting...' : 'Connect'}
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</main>
