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
	let showAllNetworks = false;
	let scanning = false;
	let connecting = false;
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

			// If no saved config, navigate to password entry for secured networks
			connecting = false;
			goto(
				`/wifi/connect?ssid=${encodeURIComponent(network.ssid)}&security=${encodeURIComponent(network.security)}`,
			);
		} catch (error) {
			console.error('Failed to connect:', error);
			connecting = false;
		}
	}

	function toggleShowAllNetworks() {
		showAllNetworks = !showAllNetworks;
		networks = showAllNetworks ? allNetworks : allNetworks.slice(0, MAX_DISPLAYED_NETWORKS);
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
				{#if scanning}
					Scanning...
				{:else}
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
							d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
						/>
					</svg>
				{/if}
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
					<Item.Root class="cursor-pointer">
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
								<span class="text-xs text-gray-500">
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
											d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
										/>
									</svg>
								</span>
							{:else}
								<span class="text-xs text-gray-500">
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
											d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
										/>
									</svg>
								</span>
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
</main>
