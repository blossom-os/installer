<script lang="ts">
	import { cn } from '$lib/utils.js';

	let className = '';
	export { className as class };
</script>

<label
	class={cn(
		'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
		className,
	)}
	{...$$restProps}
	on:click
	on:mousedown
	on:mouseup
	on:keydown
	on:keyup
	on:touchstart
	on:touchend
	on:touchcancel
	on:contextmenu
>
	<slot />
</label>
