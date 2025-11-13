<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let password = '';
	let connecting = false;
	let ssid = '';
	let security = '';
	let error = '';
	let showError = false;

	onMount(() => {
		// Get network details from URL params
		ssid = $page.url.searchParams.get('ssid') || '';
		security = $page.url.searchParams.get('security') || '';

		if (!ssid) {
			// If no SSID provided, go back to WiFi list
			goto('/wifi');
		}
	});

	function handleBack() {
		goto('/wifi');
	}

	async function connectWithPassword() {
		if (!ssid || !password) return;

		connecting = true;
		showError = false;
		error = '';

		try {
			if (window.electron) {
				await window.electron.connectWifi(ssid, password);
				// Go back to WiFi list after successful connection
				goto('/wifi');
			}
		} catch (err: any) {
			console.error('Failed to connect:', err);

			// Handle different types of errors
			if (err.isPasswordError) {
				error = 'Incorrect password. Please check your password and try again.';
				// Delete the failed connection configuration
				if (window.electron) {
					await window.electron.deleteWifiConfig(ssid);
				}
			} else {
				error = 'Failed to connect to the network. Please try again.';
			}

			showError = true;
		} finally {
			connecting = false;
		}
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
</script>

<main>
	<Card.Header class="mt-4">
		<div class="flex items-center gap-4">
			<div>
				<Card.Title>Connect to {ssid}</Card.Title>
				<Card.Description class="mt-2 text-muted-foreground">
					Enter the password for this {getSecurityText(security)} network.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content class="mt-6">
		<div class="space-y-4">
			{#if showError}
				<div class="p-3 bg-red-50 border border-red-200 rounded-lg">
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 bg-red-500 rounded-full"></div>
						<span class="text-sm font-medium text-red-700">{error}</span>
					</div>
				</div>
			{/if}

			<div>
				<label
					for="password"
					class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Network Password
				</label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter network password"
					class="mt-1"
					disabled={connecting}
					onkeydown={(e) => e.key === 'Enter' && connectWithPassword()}
				/>
			</div>

			<div class="flex gap-2">
				<Button variant="outline" onclick={handleBack} disabled={connecting} class="flex-1">
					Cancel
				</Button>
				<Button
					onclick={connectWithPassword}
					disabled={!password || connecting}
					class="flex-1"
				>
					{#if connecting}
						<Spinner class="mr-2" />
						Connecting...
					{:else}
						Connect
					{/if}
				</Button>
			</div>
		</div>
	</Card.Content>
</main>
