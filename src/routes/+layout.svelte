<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
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

	// Check if current route should use card layout (exclude postinstall)
	$: isPostinstall = $page.route?.id === '/postinstall';
</script>

<div class="dragbar"></div>

{#if ready}
	{#if isPostinstall}
		<!-- Fullscreen layout for postinstall -->
		<div class="min-h-screen bg-background p-8">
			<slot />
		</div>
	{:else}
		<!-- Card layout for all other pages -->
		<Card.Root>
			<Card.Content>
				<slot />
			</Card.Content>
		</Card.Root>
	{/if}
{/if}

<style>
	.dragbar {
		-webkit-app-region: drag;
		position: absolute;
		z-index: 100;
		height: 40px;
		width: 100%;
	}
</style>
