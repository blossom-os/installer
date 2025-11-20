<script lang="ts">
	import { goto } from "$app/navigation";
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

                window.setTimeout(() => {
                    goto('/postinstall');
                }, 5000);
			} catch (error) {
				console.error('Failed to check postinstall mode or enter fullscreen:', error);
			}
		}
	});
</script>

<div class="w-screen h-screen cursor-none">
	<!-- Just wait until KDE fully loaded -->
</div>