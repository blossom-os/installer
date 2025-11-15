<script lang="ts">
	import { onMount } from 'svelte';

	let isPostinstallMode = false;

	onMount(async () => {
		if (window.electron) {
			try {
				isPostinstallMode = await window.electron.checkPostinstallMode();
			} catch (error) {
				console.error('Failed to check postinstall mode:', error);
			}
		}
	});
</script>

<main>
	<h1>Postinstall</h1>
	{#if isPostinstallMode}
		<p>Running in postinstall mode</p>
	{:else}
		<p>Not in postinstall mode</p>
	{/if}
</main>
