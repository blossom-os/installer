<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Item from '$lib/components/ui/item';
	import { Button } from '$lib/components/ui/button/index.js';
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
	let scanning = false;
	let connecting = false;
	let currentConnection: string | null = null;

	function handleBack() {
		goto('/postinstall/welcome');
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
				networks = allNetworks;
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

			// If no saved config, navigate to password entry for secured networks
			connecting = false;
			goto(
				`/postinstall/wifi/connect?ssid=${encodeURIComponent(network.ssid)}&security=${encodeURIComponent(network.security)}`,
			);
		} catch (error) {
			console.error('Failed to connect:', error);
			connecting = false;
		}
	}

	function getSignalIcon(signal: number, secure: boolean): string {
		if (secure) {
			if (signal > 90) return 'high-sec';
			if (signal > 50) return 'mid-sec';
			if (signal > 25) return 'low-sec';
		} else {
			if (signal > 90) return 'high';
			if (signal > 50) return 'mid';
			if (signal > 25) return 'low';
		}
		return '';
	}

	onMount(() => {
		scanNetworks();
	});
</script>

<main class="bg-background h-screen flex items-center justify-center p-8">
	<Card.Header class="mt-4">
		<div class="flex items-center gap-4">
			<Button variant="outline" onclick={handleBack}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4"
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
				{scanning ? 'Scanning' : 'Refresh'}
			</Button>
		</div>

		{#if networks.length === 0 && !scanning}
			<div class="text-center py-8 text-gray-500">
				No networks found. Click refresh to scan for networks.
			</div>
		{:else if scanning}
			<div class="text-center py-8 text-gray-500">Scanning for networks...</div>
		{:else}
			<div class="max-h-96 overflow-y-auto pr-2">
				{#each networks as network}
					<button
						on:click={() => connectToNetwork(network)}
						disabled={connecting}
						class="block w-full mb-2"
					>
						<Item.Root class="cursor-pointer">
							<Item.Media />
							<Item.Content>
								<Item.Title class="flex items-center justify-between">
									<span>{network.ssid}</span>
								</Item.Title>
							</Item.Content>
							<Item.Actions>
								{#if network.connected}
									<span class="text-green-600 text-sm font-medium">
										Connected
									</span>
								{:else if network.security === 'open'}
									<span class="text-xs text-gray-500">Open</span>
								{:else}
									<span class="text-xs text-gray-500">
										<img
											src={`/wifi/${getSignalIcon(network.signal, true)}.svg`}
											alt="Signal Strength"
											width="16"
											height="16"
											class="inline-block mr-1"
										/>
									</span>
								{/if}
							</Item.Actions>
						</Item.Root>
					</button>
				{/each}
			</div>
		{/if}
	</Card.Content>
</main>
