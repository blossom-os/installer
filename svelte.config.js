import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			fallback: 'index.html',
		}),
		prerender: { entries: [] },
		alias: {
			$lib: 'src/lib',
			'$lib/*': 'src/lib/*',
			 "@/*": "src/lib/*",
		}
	},

	// Svelte 5 specific options
	compilerOptions: {
		// Remove any format options as they're no longer supported
	}
};

export default config;
