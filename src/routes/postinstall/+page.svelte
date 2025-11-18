<script lang="ts">
	import { goto } from '$app/navigation';
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
			
			try {
				await window.electron.runCommand('amixer set Master 62% unmute');
			} catch (error) {
				console.error('Failed to set volume:', error);
			}
		}
	});

	function handleEnd() {
		goto('/postinstall/welcome');
	}
</script>

<main class="bg-background">
	<video autoplay muted onended={handleEnd} class="w-full h-full object-cover">
		<source src="/intro.mp4" type="video/mp4" />
		Your browser does not support the video tag.
	</video>
</main>
