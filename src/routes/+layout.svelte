<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import '../app.css';
	import { loadLanguageTranslations, getCurrentLanguage } from '$lib/stores/i18n.js';

	let ready: boolean = false;

	onMount(async () => {
		// Load saved language and translations on app start
		const savedLanguage = getCurrentLanguage();
		await loadLanguageTranslations(savedLanguage);
		ready = true;
	});
</script>

<div class="dragbar"></div>

<Card.Root>
	<Card.Content>
		{#if ready}
			<slot />
		{/if}
	</Card.Content>
</Card.Root>

<style>
	.dragbar {
		-webkit-app-region: drag;
		position: absolute;
		z-index: 100;
		height: 40px;
		width: 100%;
	}
</style>
