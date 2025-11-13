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
	let scanning = false;
	let connecting = false;
	let selectedNetwork: WiFiNetwork | null = null;
	let password = '';
	let showPasswordInput = false;

	function handleBack() {
		goto('/');
	}

	async function scanNetworks() {
		scanning = true;
		try {
			if (window.electron) {
				const result = await window.electron.scanWifi();
				networks = result || [];
			}
		} catch (error) {
			console.error('Failed to scan networks:', error);
		} finally {
			scanning = false;
		}
	}

	async function connectToNetwork(network: WiFiNetwork) {
		if (network.security === 'open') {
			// Connect directly for open networks
			connecting = true;
			try {
				if (window.electron) {
					await window.electron.connectWifi(network.ssid, '');
				}
			} catch (error) {
				console.error('Failed to connect:', error);
			} finally {
				connecting = false;
			}
		} else {
			// Show password input for secured networks
			selectedNetwork = network;
			showPasswordInput = true;
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
			<Button variant="outline" onclick={handleBack}>←</Button>
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
								{#if network.connected}
									<span class="text-green-600 text-sm">Connected</span>
								{/if}
							</Item.Description>
						</Item.Content>
						<Item.Actions>
							{#if network.connected}
								<div class="w-4 h-4 bg-green-500 rounded-full"></div>
							{:else if network.security === 'open'}
								<span class="text-xs text-gray-500">Click to connect</span>
							{:else}
								<span class="text-xs text-gray-500">🔒</span>
							{/if}
						</Item.Actions>
					</Item.Root>
				</button>
			{/each}
		{/if}

		{#if showPasswordInput && selectedNetwork}
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title>Connect to {selectedNetwork.ssid}</Card.Title>
					<Card.Description>
						This network is secured with {getSecurityText(selectedNetwork.security)}.
						Please enter the password.
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
		{/if}
	</Card.Content>
</main>
