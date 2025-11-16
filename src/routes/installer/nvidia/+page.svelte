<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import {
		loadLanguageTranslations,
		translations as translationsStore,
		getCurrentLanguage,
	} from '$lib/stores/i18n.js';

	interface Translations {
		installer?: {
			nvidia?: {
				title?: string;
				description?: string;
				message?: string;
				detected?: string;
				support?: string;
				optimization?: string;
				noDetected?: string;
				standardInstall?: string;
				detectedCards?: string;
				memory?: string;
				benefits?: {
					performance?: string;
					acceleration?: string;
					development?: string;
				};
			};
		};
		buttons?: {
			continue?: string;
			back?: string;
		};
		common?: {
			loading?: string;
		};
	}

	let translations: Translations | null = null;
	let isLoading = true;
	let nvidiaInfo: any = null;

	// Subscribe to translations store
	translationsStore.subscribe((value) => {
		translations = value;
	});

	async function detectNvidiaCard() {
		try {
			if (typeof window !== 'undefined' && window.electron) {
				const result = await window.electron.detectNvidia();
				nvidiaInfo = result;
				console.log('NVIDIA detection result:', result);

				// Save NVIDIA status for use during installation
				sessionStorage.setItem('hasNvidia', result.hasNvidia ? 'true' : 'false');
				if (result.hasNvidia && result.gpuInfo) {
					sessionStorage.setItem('nvidiaInfo', JSON.stringify(result.gpuInfo));
				}
			}
		} catch (error) {
			console.error('Error detecting NVIDIA card:', error);
			nvidiaInfo = {
				hasNvidia: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async function handleContinue() {
		goto('/installer/select-disk');
	}

	async function handleBack() {
		goto('/installer/language');
	}

	onMount(async () => {
		// Load saved language and translations
		const savedLanguage = getCurrentLanguage();
		await loadLanguageTranslations(savedLanguage);

		// Detect NVIDIA card
		await detectNvidiaCard();

		isLoading = false;
	});
</script>

<div class="flex flex-col min-h-screen">
	<main class="flex-1 overflow-auto">
		<div class="max-w-4xl mx-auto">
			{#if isLoading}
				<div class="flex justify-center items-center min-h-[400px]">
					<div class="text-lg">
						{translations?.common?.loading || 'Loading...'}
					</div>
				</div>
			{:else}
				<Card.Header class="mt-4 shrink-0 mb-6">
					<div class="flex items-center gap-4">
						<Button variant="outline" onclick={handleBack}>
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
							{translations?.buttons?.back || 'Back'}
						</Button>
						<div>
							<Card.Title>
								{translations?.installer?.nvidia?.title ||
									'Graphics Card Detection'}
							</Card.Title>
							<Card.Description class="mt-2 text-muted-foreground">
								{translations?.installer?.nvidia?.description ||
									'Checking for NVIDIA graphics hardware to optimize your installation.'}
							</Card.Description>
						</div>
					</div>
				</Card.Header>

				{#if nvidiaInfo?.hasNvidia}
					<!-- NVIDIA Detected -->
					<Card.Root class="mb-6">
						<Card.Content class="pt-6">
							<div class="text-center space-y-6">
								<!-- NVIDIA Logo -->
								<div class="flex justify-center">
									<img src="/nvidia.svg" alt="NVIDIA Logo" class="h-12 w-auto" />
								</div>

								<!-- Detection Message -->
								<div class="space-y-3">
									<h2 class="text-2xl font-bold text-green-600">
										{translations?.installer?.nvidia?.detected ||
											'NVIDIA Graphics Detected!'}
									</h2>
									<p class="text-muted-foreground max-w-md mx-auto">
										{translations?.installer?.nvidia?.message ||
											"We detected an NVIDIA graphics card in your system. We'll automatically install the NVIDIA drivers for the best experience."}
									</p>
								</div>

								<!-- GPU Information -->
								{#if nvidiaInfo.gpuInfo && nvidiaInfo.gpuInfo.length > 0}
									<div class="space-y-3">
										<h3 class="font-medium">
											{translations?.installer?.nvidia?.detectedCards ||
												'Detected Graphics Cards:'}
										</h3>
										<div class="space-y-2">
											{#each nvidiaInfo.gpuInfo as gpu}
												<div class="p-3 bg-muted/50 rounded-lg">
													<div class="font-medium">
														{gpu.name || 'NVIDIA Graphics Card'}
													</div>
													{#if gpu.memory}
														<div class="text-sm text-muted-foreground">
															{translations?.installer?.nvidia
																?.memory || 'Memory:'}
															{gpu.memory}
														</div>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Benefits -->
								<div class="p-4 bg-green-50 border border-green-200 rounded-lg">
									<h4 class="font-medium text-green-800 mb-2">
										{translations?.installer?.nvidia?.support ||
											'What this means:'}
									</h4>
									<ul class="text-sm text-green-700 space-y-1 text-left">
										<li>
											• {translations?.installer?.nvidia?.optimization ||
												'Automatic NVIDIA driver installation'}
										</li>
										<li>
											• {translations?.installer?.nvidia?.benefits
												?.performance ||
												'Better gaming and graphics performance'}
										</li>
										<li>
											• {translations?.installer?.nvidia?.benefits
												?.acceleration || 'Hardware acceleration support'}
										</li>
										<li>
											• {translations?.installer?.nvidia?.benefits
												?.development ||
												'CUDA and OpenCL support for development'}
										</li>
									</ul>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<!-- No NVIDIA or Detection Failed -->
					<Card.Root class="mb-6">
						<Card.Content class="pt-6">
							<div class="text-center space-y-4">
								<div
									class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="size-8 text-muted-foreground"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
										/>
									</svg>
								</div>
								<h2 class="text-xl font-semibold">
									{translations?.installer?.nvidia?.noDetected ||
										'No NVIDIA Graphics Detected'}
								</h2>
								<p class="text-muted-foreground">
									{translations?.installer?.nvidia?.standardInstall ||
										"We'll continue with the standard installation process."}
								</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Continue Button -->
				<div class="flex justify-end">
					<Button size="lg" onclick={handleContinue}>
						{translations?.buttons?.continue || 'Continue'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-4 ml-2"
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
