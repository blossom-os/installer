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
	$: pageRoute = $page.route?.id || '';
</script>

<div class="dragbar"></div>

{#if ready}
	{#if pageRoute?.startsWith('/postinstall')}
		<!-- Fullscreen layout for postinstall -->
		 <audio autoplay src="/intro_audio.mp3"></audio>
		<div class="min-h-screen bg-background">
			<slot />
		</div>
	{:else if pageRoute === '/intro'}
		<!-- Fullscreen layout for intro -->
		<div class="min-h-screen bg-background">
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
