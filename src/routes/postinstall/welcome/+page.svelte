<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
    import * as Card from '$lib/components/ui/card/index.js';

	let isPostinstallMode = false;
	let showContent = false;

	onMount(async () => {
		if (window.electron) {
			try {
				isPostinstallMode = await window.electron.checkPostinstallMode();

				// Enter fullscreen mode for postinstall
				if (isPostinstallMode) {
					// Request fullscreen for the document
					if (document.documentElement.requestFullscreen) {
						await document.documentElement.requestFullscreen();
					} else if ((document.documentElement as any).webkitRequestFullscreen) {
						await (document.documentElement as any).webkitRequestFullscreen();
					} else if ((document.documentElement as any).msRequestFullscreen) {
						await (document.documentElement as any).msRequestFullscreen();
					}
				}
			} catch (error) {
				console.error('Failed to check postinstall mode or enter fullscreen:', error);
			}
		}
		
		// Trigger fade-in animation after a brief delay
		setTimeout(() => {
			showContent = true;
		}, 100);
	});
</script>

<main class="bg-background h-screen flex items-center justify-center p-8">
	{#if showContent}
		<div transition:fade={{ duration: 800, delay: 0 }}>
			<Card.Root class="w-3xl mx-auto my-16">
				<Card.Header>
					<Card.Title>Welcome to blossomOS</Card.Title>
					<Card.Description>Your computer is ready to be set up</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="mb-4">Thank you for choosing blossomOS. You can now continue setting up your computer.</p>
				</Card.Content>
				<Card.Footer>
					<Button onclick={() => goto('/postinstall/setup')}>Continue Setup</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	{/if}
</main>