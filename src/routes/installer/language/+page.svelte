<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import {
		loadLanguageTranslations,
		availableLanguages,
		currentLanguage,
		currentKeyboard,
		translations as translationsStore,
		setLanguage,
		setKeyboard,
		getCurrentLanguage,
		getCurrentKeyboard,
	} from '$lib/stores/i18n.js';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';

	interface Translations {
		welcome?: {
			title?: string;
			description?: string;
		};
		language?: {
			title?: string;
			description?: string;
			label?: string;
		};
		keyboard?: {
			title?: string;
			description?: string;
			label?: string;
		};
		buttons?: {
			continue?: string;
		};
		common?: {
			loading?: string;
		};
	}

	let keyboards = [
		{ code: 'us', name: 'US English', description: 'United States' },
		{ code: 'uk', name: 'UK English', description: 'United Kingdom' },
		{ code: 'de', name: 'German', description: 'Germany' },
		{ code: 'fr', name: 'French', description: 'France' },
		{ code: 'es', name: 'Spanish', description: 'Spain' },
	];
	let timezone = 'UTC';
	let selectedLanguage = getCurrentLanguage();
	let selectedKeyboard = getCurrentKeyboard();
	let translations: Translations | null = null;
	let isLoading = true;

	// Subscribe to store changes
	$: translations = $translationsStore;

	async function loadAvailableOptions() {
		try {
			if (typeof window !== 'undefined' && (window as any).installer) {
				const [keyboardsResult, timezoneResult] = await Promise.all([
					(window as any).installer.getAvailableKeyboards?.().catch(() => keyboards),
					(window as any).installer.getTimezone?.().catch(() => timezone),
				]);

				keyboards = keyboardsResult.length ? keyboardsResult : keyboards;
				timezone = timezoneResult || 'UTC';
				console.log('Loaded timezone:', timezone);
			}
		} catch (error) {
			console.error('Error loading options:', error);
		}
	}

	async function loadTranslations(languageCode: string) {
		try {
			translations = await loadLanguageTranslations(languageCode);
		} catch (error) {
			console.error('Error loading translations:', error);
		}
	}

	async function handleLanguageChange(languageCode: string) {
		selectedLanguage = languageCode;
		setLanguage(languageCode);
		await loadTranslations(languageCode);
	}

	async function handleContinue() {
		try {
			// Save language and keyboard settings
			setLanguage(selectedLanguage);
			setKeyboard(selectedKeyboard);

			// Also save via installer API if available
			if (typeof window !== 'undefined' && (window as any).installer) {
				await (window as any).installer.setLanguage?.(selectedLanguage);
				await (window as any).installer.setKeyboard?.(selectedKeyboard);
			}

			console.log('Language saved:', selectedLanguage);
			console.log('Keyboard saved:', selectedKeyboard);

			goto('/installer/nvidia');
		} catch (error) {
			console.error('Error saving settings:', error);
			goto('/installer/nvidia');
		}
	}

	onMount(async () => {
		await loadAvailableOptions();
		await loadTranslations(selectedLanguage);
		isLoading = false;
	});
</script>

<div class="flex flex-col min-h-screen">
	<main class="flex-1 overflow-auto">
		<div class="max-w-4xl mx-auto">
			{#if isLoading}
				<div class="flex justify-center items-center">
					<div class="text-lg">
						{translations?.common?.loading || 'Loading...'}
					</div>
				</div>
			{:else}
				<Card.Header class="mt-4 shrink-0 mb-6">
					<div class="flex items-center gap-4">
						<Button variant="outline" onclick={() => goto('/installer/welcome')}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-4"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M15.75 19.5 8.25 12l7.5-7.5"
								/>
							</svg>
							Back
						</Button>
						<div>
							<Card.Title>
								{translations?.welcome?.title || 'Welcome to blossomOS'}
							</Card.Title>
							<Card.Description class="mt-2 text-muted-foreground">
								{translations?.welcome?.description ||
									'Select your language and keyboard layout to continue with the installation.'}
							</Card.Description>
						</div>
					</div>
				</Card.Header>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Language Selection -->
					<Card.Root>
						<Card.Header>
							<Card.Title>{translations?.language?.title || 'Language'}</Card.Title>
							<Card.Description>
								{translations?.language?.description ||
									'Select your preferred language for the installation process.'}
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								<Label class="text-sm font-medium">
									{translations?.language?.label || 'Language'}
								</Label>
								<RadioGroup bind:value={selectedLanguage}>
									<div class="space-y-2">
										{#each availableLanguages as language}
											<div class="flex items-center space-x-2">
												<RadioGroupItem
													value={language.code}
													id="lang-{language.code}"
													onclick={() =>
														handleLanguageChange(language.code)}
												/>
												<Label
													for="lang-{language.code}"
													class="flex-1 cursor-pointer"
												>
													<div class="font-medium">
														{language.nativeName}
													</div>
													<div class="text-sm">
														{language.name}
													</div>
												</Label>
											</div>
										{/each}
									</div>
								</RadioGroup>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Keyboard Layout Selection -->
					<Card.Root>
						<Card.Header>
							<Card.Title>
								{translations?.keyboard?.title || 'Keyboard Layout'}
							</Card.Title>
							<Card.Description>
								{translations?.keyboard?.description ||
									'Select your keyboard layout.'}
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								<Label class="text-sm font-medium">
									{translations?.keyboard?.label || 'Keyboard Layout'}
								</Label>
								<div class="max-h-64 overflow-auto border rounded-md">
									<RadioGroup bind:value={selectedKeyboard}>
										<div class="space-y-1 p-2">
											{#each keyboards as keyboard}
												<div
													class="flex items-center space-x-2 p-2 rounded"
												>
													<RadioGroupItem
														value={keyboard.code}
														id="kbd-{keyboard.code}"
													/>
													<Label
														for="kbd-{keyboard.code}"
														class="flex-1 cursor-pointer"
													>
														<div class="font-medium">
															{keyboard.name}
														</div>
														<div class="text-sm">
															{keyboard.description}
														</div>
													</Label>
												</div>
											{/each}
										</div>
									</RadioGroup>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Continue Button -->
				<div class="flex justify-end mt-6">
					<Button size="lg" onclick={handleContinue}>
						{translations?.buttons?.continue || 'Continue'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-4"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="m8.25 4.5 7.5 7.5-7.5 7.5"
							/>
						</svg>
					</Button>
				</div>
			{/if}
		</div>
	</main>
</div>
