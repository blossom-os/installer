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
		try {
			if (window.electron) {
				await window.electron.connectWifi(ssid, password);
				// Go back to WiFi list after successful connection
				goto('/wifi');
			}
		} catch (error) {
			console.error('Failed to connect:', error);
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
				<Card.Title>Connect to {ssid}</Card.Title>
				<Card.Description class="mt-2 text-muted-foreground">
					Enter the password for this {getSecurityText(security)} network.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content class="mt-6">
		<div class="space-y-4">
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
