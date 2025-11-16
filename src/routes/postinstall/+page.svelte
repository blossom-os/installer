<script lang="ts">
	import { onMount } from 'svelte';

	let isPostinstallMode = false;

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
	});
</script>

<main class="min-h-screen bg-background p-8">
	<h1>Postinstall</h1>
	{#if isPostinstallMode}
		<p>Running in postinstall mode</p>
	{:else}
		<p>Not in postinstall mode</p>
	{/if}
</main>
