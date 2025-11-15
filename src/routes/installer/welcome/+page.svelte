<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let internetStatus: 'checking' | 'connected' | 'disconnected' = 'checking';
	let showConnectionError = false;
	let connectionErrorMessage = '';

	async function checkInternetConnection() {
		internetStatus = 'checking';
		showConnectionError = false;

		try {
			// Check internet connectivity by pinging GitHub API
			const response = await fetch('https://api.github.com', {
				method: 'HEAD',
				mode: 'no-cors',
				cache: 'no-cache',
				signal: AbortSignal.timeout(10000), // 10 second timeout
			});

			internetStatus = 'connected';
			showConnectionError = false;
		} catch (error) {
			internetStatus = 'disconnected';
			showConnectionError = true;

			if (error instanceof Error) {
				if (error.name === 'AbortError' || error.message.includes('timeout')) {
					connectionErrorMessage =
						'Connection timeout. Please check your internet connection or try again.';
				} else if (
					error.message.includes('Failed to fetch') ||
					error.message.includes('NetworkError')
				) {
					connectionErrorMessage =
						'Unable to connect to the internet. Please check your network connection.';
				} else {
					connectionErrorMessage =
						'Network connectivity check failed. Please verify your internet connection.';
				}
			} else {
				connectionErrorMessage =
					'Unable to verify internet connection. Please check your network settings.';
			}
		}
	}

	function handleNext() {
		if (internetStatus === 'connected') {
			goto('/installer/select-disk');
		} else {
			// Recheck connection before proceeding
			checkInternetConnection();
		}
	}

	function handleBack() {
		goto('/');
	}

	function handleConnectWifi() {
		goto('/wifi');
	}

	onMount(() => {
		// Check internet connection when page loads
		checkInternetConnection();
	});
</script>

<main class="h-full flex flex-col">
	<Card.Header class="mt-4 shrink-0">
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
				Back
			</Button>
			<div>
				<Card.Title>Welcome to blossomOS Installer</Card.Title>
				<Card.Description class="mt-2 text-muted-foreground">
					Install blossomOS on your computer and enjoy a modern, secure operating system.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<div class="flex-1 overflow-y-auto pr-2">
		<Card.Content class="mt-6">
			<div class="space-y-6">
				<!-- Welcome Message -->
				<div class="text-center space-y-4">
					<div
						class="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-12 text-primary"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
							/>
						</svg>
					</div>
					<h2 class="text-2xl font-bold">Ready to Install blossomOS</h2>
					<p class="text-muted-foreground max-w-md mx-auto">
						This installer will guide you through the process of installing blossomOS on
						your computer. The installation process typically takes 10-20 minutes.
					</p>
				</div>

				<!-- Internet Connection Status -->
				<div class="space-y-3">
					<h4 class="font-medium text-sm flex items-center gap-2">
						Internet Connection:
						{#if internetStatus === 'checking'}
							<div
								class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"
							></div>
						{:else if internetStatus === 'connected'}
							<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
						{:else}
							<div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
						{/if}
					</h4>

					{#if internetStatus === 'checking'}
						<p class="text-sm text-muted-foreground">
							Checking internet connectivity...
						</p>
					{:else if internetStatus === 'connected'}
						<p class="text-sm text-green-600 dark:text-green-400">
							✓ Connected to the internet
						</p>
					{:else if showConnectionError}
						<div class="space-y-3">
							<p class="text-sm text-red-600 dark:text-red-400">
								✗ No internet connection detected
							</p>
							<div
								class="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30 rounded-lg"
							>
								<p class="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
									Internet connection required
								</p>
								<p class="text-xs text-red-700 dark:text-red-300 mb-3">
									{connectionErrorMessage}
								</p>
								<div class="space-y-2 text-xs text-red-600 dark:text-red-400">
									<p class="font-medium">Troubleshooting steps:</p>
									<ul class="list-disc list-inside space-y-1 ml-2">
										<li>Connect to a WiFi network using the WiFi Manager</li>
										<li>Check if a firewall is blocking internet access</li>
										<li>Verify proxy settings are not interfering</li>
										<li>Ensure web filters are not blocking access</li>
										<li>Try connecting to a different network</li>
									</ul>
								</div>
								<div class="flex gap-2 mt-3">
									<Button variant="outline" size="sm" onclick={handleConnectWifi}>
										WiFi Manager
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={checkInternetConnection}
									>
										Retry Check
									</Button>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- System Requirements -->
				<div class="bg-muted/50 p-4 rounded-lg space-y-2">
					<h4 class="font-medium text-sm">Minimum System Requirements:</h4>
					<div class="text-sm text-muted-foreground space-y-1">
						<div>• 4 GB RAM (8 GB recommended)</div>
						<div>• 25 GB available disk space</div>
						<div>• 64-bit processor</div>
						<div>• Internet connection (required)</div>
					</div>
				</div>

				<!-- Next Button -->
				{#if internetStatus !== 'disconnected'}
					<div class="flex justify-end pt-4">
						<Button
							onclick={handleNext}
							class="px-8"
							disabled={internetStatus === 'checking'}
						>
							{#if internetStatus === 'checking'}
								<div
									class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"
								></div>
								Checking Connection...
							{:else}
								Get Started
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="size-4 ml-2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="m8.25 4.5 7.5 7.5-7.5 7.5"
									/>
								</svg>
							{/if}
						</Button>
					</div>
				{/if}
			</div>
		</Card.Content>
	</div>
</main>
