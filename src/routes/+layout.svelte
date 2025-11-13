<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import '../app.css';

	let ready: boolean = false;
	onMount(() => (ready = true));
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
