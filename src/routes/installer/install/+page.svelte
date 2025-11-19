<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import {
		loadLanguageTranslations,
		translations as translationsStore,
		getCurrentLanguage,
	} from '$lib/stores/i18n.js';

	interface InstallStep {
		id: string;
		title: string;
		description: string;
		completed: boolean;
		current: boolean;
		progress: number;
	}

	interface Translations {
		installer?: {
			install?: {
				title?: string;
				description?: string;
				progress?: string;
				finalizing?: string;
				preparing?: string;
				steps?: {
					prepare?: string;
					partition?: string;
					format?: string;
					install?: string;
					bootloader?: string;
					config?: string;
					descriptions?: {
						prepare?: string;
						partition?: string;
						format?: string;
						install?: string;
						bootloader?: string;
						config?: string;
					};
				};
				error?: {
					title?: string;
					description?: string;
					message?: string;
					details?: string;
					contactSupport?: string;
				};
				success?: {
					title?: string;
					description?: string;
					message?: string;
					restartOption?: string;
				};
				log?: {
					title?: string;
					show?: string;
					hide?: string;
					empty?: string;
					toggle?: string;
					starting?: string;
				};
				actions?: {
					tryAgain?: string;
					returnToRecovery?: string;
					shutdown?: string;
					restart?: string;
				};
			};
		};
		buttons?: {
			back?: string;
		};
	}

	let selectedDisk = sessionStorage.getItem('selectedDisk') || '/dev/sda';
	let translations: Translations | null = null;

	// Subscribe to translations store
	translationsStore.subscribe((value) => {
		translations = value;
	});

	let installSteps: InstallStep[] = [
		{
			id: 'prepare',
			title: 'Preparing Installation',
			description: 'Initializing installation environment...',
			completed: false,
			current: false,
			progress: 0,
		},
		{
			id: 'partition',
			title: 'Creating Partitions',
			description: 'Setting up disk partitions...',
			completed: false,
			current: false,
			progress: 0,
		},
		{
			id: 'format',
			title: 'Formatting Disk',
			description: 'Formatting file systems...',
			completed: false,
			current: false,
			progress: 0,
		},
		{
			id: 'install',
			title: 'Installing System',
			description: 'Copying system files...',
			completed: false,
			current: false,
			progress: 0,
		},
		{
			id: 'bootloader',
			title: 'Installing Bootloader',
			description: 'Setting up GRUB bootloader...',
			completed: false,
			current: false,
			progress: 0,
		},
		{
			id: 'config',
			title: 'Configuring System',
			description: 'Applying final configuration...',
			completed: false,
			current: false,
			progress: 0,
		},
	];

	let currentStepIndex = 0;
	let overallProgress = 0;
	let isInstalling = false;
	let isComplete = false;
	let installationLog: string[] = [];
	let showLog = false;
	let shouldRestart = false;
	let currentSlide = 1;
	let error: string | null = null;
	let slideInterval: NodeJS.Timeout | null = null;
	const totalSlides = 6; // Number of presentation images

	// Initialize steps with translations
	function initializeSteps() {
		installSteps = [
			{
				id: 'prepare',
				title: translations?.installer?.install?.steps?.prepare || 'Preparing Installation',
				description:
					translations?.installer?.install?.steps?.descriptions?.prepare ||
					'Initializing installation environment...',
				completed: false,
				current: false,
				progress: 0,
			},
			{
				id: 'partition',
				title: translations?.installer?.install?.steps?.partition || 'Creating Partitions',
				description:
					translations?.installer?.install?.steps?.descriptions?.partition ||
					'Setting up disk partitions...',
				completed: false,
				current: false,
				progress: 0,
			},
			{
				id: 'format',
				title: translations?.installer?.install?.steps?.format || 'Formatting Disk',
				description:
					translations?.installer?.install?.steps?.descriptions?.format ||
					'Formatting file systems...',
				completed: false,
				current: false,
				progress: 0,
			},
			{
				id: 'install',
				title: translations?.installer?.install?.steps?.install || 'Installing System',
				description:
					translations?.installer?.install?.steps?.descriptions?.install ||
					'Copying system files...',
				completed: false,
				current: false,
				progress: 0,
			},
			{
				id: 'bootloader',
				title:
					translations?.installer?.install?.steps?.bootloader || 'Installing Bootloader',
				description:
					translations?.installer?.install?.steps?.descriptions?.bootloader ||
					'Setting up GRUB bootloader...',
				completed: false,
				current: false,
				progress: 0,
			},
			{
				id: 'config',
				title: translations?.installer?.install?.steps?.config || 'Configuring System',
				description:
					translations?.installer?.install?.steps?.descriptions?.config ||
					'Applying final configuration...',
				completed: false,
				current: false,
				progress: 0,
			},
		];
	}

	function startSlideshow() {
		currentSlide = 1;

		// First slide shows for 30 seconds
		setTimeout(() => {
			currentSlide = 2;

			// Subsequent slides change every 20 seconds
			slideInterval = setInterval(() => {
				currentSlide = (currentSlide % totalSlides) + 1;
			}, 20000);
		}, 30000);
	}

	function stopSlideshow() {
		if (slideInterval) {
			clearInterval(slideInterval);
			slideInterval = null;
		}
	}

	function updateSlide() {
		// This function is kept for compatibility but slideshow is now time-based
		// Show final slide when installation is complete
		if (isComplete) {
			stopSlideshow();
			currentSlide = totalSlides;
		}
	}

	async function startInstallation() {
		isInstalling = true;
		installationLog = [`Starting blossomOS installation on ${selectedDisk}...`];

		// Start the time-based slideshow
		startSlideshow();

		try {
			// Set up progress listener
			window.electron.onInstallationProgress((data: any) => {
				handleInstallationProgress(data);
			});

			const selectedKeyboard =
				localStorage.getItem('installer-keyboard') || 'us';

			// Start the real installation
			const result = await window.electron.installSystem(selectedDisk, selectedKeyboard);

			if (result.success) {
				isComplete = true;
				isInstalling = false;
				updateSlide(); // Show final slide
				installationLog.push(
					`${new Date().toLocaleTimeString()}: Installation completed successfully!`,
				);
				installationLog = [...installationLog];
			}
		} catch (installError: any) {
			console.error('Installation failed:', installError);
			console.error('Error type:', typeof installError);
			console.error('Error keys:', Object.keys(installError));
			console.error('Full error object:', JSON.stringify(installError, null, 2));
			isInstalling = false;
			stopSlideshow(); // Stop slideshow on error

			// Extract detailed error information with better debugging
			let errorMessage = 'Unknown error occurred';
			let errorDetails = null;

			// Try different ways to extract the error message
			if (typeof installError === 'string') {
				errorMessage = installError;
			} else if (installError && typeof installError === 'object') {
				// Check various common error properties
				if (installError.error) {
					if (typeof installError.error === 'string') {
						errorMessage = installError.error;
					} else if (typeof installError.error === 'object') {
						errorMessage = JSON.stringify(installError.error);
						errorDetails = installError.error;
					}
				} else if (installError.message) {
					errorMessage = installError.message;
				} else if (installError.stderr) {
					errorMessage = installError.stderr;
				} else if (installError.stdout) {
					errorMessage = `Command output: ${installError.stdout}`;
				} else {
					// If none of the above, stringify the whole object
					errorMessage = `Installation error: ${JSON.stringify(installError)}`;
					errorDetails = installError;
				}
			}

			// Add detailed error to log
			installationLog.push(
				`${new Date().toLocaleTimeString()}: Installation failed: ${errorMessage}`,
			);

			// Add more debugging information to the log
			installationLog.push(
				`${new Date().toLocaleTimeString()}: Error type: ${typeof installError}`,
			);

			// If there are additional details, add them too
			if (errorDetails || installError.details) {
				const details = errorDetails || installError.details;
				installationLog.push(
					`${new Date().toLocaleTimeString()}: Error details: ${JSON.stringify(details, null, 2)}`,
				);
			}

			// Add the full error object for debugging
			installationLog.push(
				`${new Date().toLocaleTimeString()}: Full error object: ${JSON.stringify(installError, null, 2)}`,
			);

			installationLog = [...installationLog];

			// Set error state for UI
			error = errorMessage;
		}
	}

	function handleInstallationProgress(data: any) {
		const { step, progress } = data;

		// Update overall progress
		overallProgress = progress;

		// Find and update the current step
		const stepMappings: Record<string, string> = {
			analyze: 'prepare',
			'partition-alongside': 'partition',
			'partition-wipe': 'partition',
			format: 'format',
			mount: 'format',
			'install-base': 'install',
			configure: 'config',
			'nvidia-install': 'config',
			bootloader: 'bootloader',
			finalize: 'config',
			cleanup: 'config',
		};

		const mappedStep = stepMappings[step] || step;
		const stepIndex = installSteps.findIndex((s) => s.id === mappedStep);

		if (stepIndex !== -1) {
			// Complete previous steps
			for (let i = 0; i < stepIndex; i++) {
				installSteps[i].completed = true;
				installSteps[i].current = false;
			}

			// Update current step
			installSteps[stepIndex].current = true;
			installSteps[stepIndex].progress = Math.min(progress, 100);
			currentStepIndex = stepIndex;

			const stepTitles: Record<string, string> = {
				analyze: 'Analyzing disk layout',
				'partition-alongside': 'Creating partition alongside existing data',
				'partition-wipe': 'Partitioning disk',
				format: 'Formatting partitions',
				mount: 'Mounting filesystems',
				'install-base': 'Installing base system',
				configure: 'Configuring system',
				'nvidia-install': 'Installing NVIDIA drivers',
				bootloader: 'Installing bootloader',
				finalize: 'Finalizing installation',
				cleanup: 'Cleaning up',
			};

			const message = stepTitles[step] || `Processing ${step}`;
			installationLog.push(`${new Date().toLocaleTimeString()}: ${message}`);
			installationLog = [...installationLog];

			// Trigger reactivity
			installSteps = [...installSteps];
		}
	}

	function handleBack() {
		if (!isInstalling) {
			// Reset error state when going back
			error = null;
			goto('/installer/select-disk');
		}
	}

	function handleRestart() {
		// In a real implementation, this would restart the system
		if (window.electron) {
			window.electron.runCommand('sudo reboot');
		} else {
			alert('System will restart now...');
		}
	}

	function handleShutdown() {
		// In a real implementation, this would shutdown the system
		if (window.electron) {
			window.electron.shutdown();
		} else {
			alert('System will shutdown now...');
		}
	}

	function handlePowerAction() {
		if (shouldRestart) {
			handleRestart();
		} else {
			handleShutdown();
		}
	}

	function handleReturnToRecovery() {
		goto('/');
	}

	function toggleLog() {
		showLog = !showLog;
	}

	onMount(async () => {
		// Load saved language and translations
		const savedLanguage = getCurrentLanguage();
		await loadLanguageTranslations(savedLanguage);

		// Initialize steps with translations
		initializeSteps();

		// Auto-start installation (in real app, you might want user confirmation)
		setTimeout(() => {
			startInstallation();
		}, 1000);
	});

	onDestroy(() => {
		// Clean up progress listener
		if (window.electron) {
			window.electron.removeInstallationProgressListener();
		}
		// Clean up slideshow interval
		stopSlideshow();
	});
</script>

<main>
	<Card.Header class="mt-4">
		<div class="flex items-center gap-4">
			{#if !isInstalling && !isComplete}
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
					Back
				</Button>
			{/if}
			<div>
				{#if error}
					<Card.Title>
						{translations?.installer?.install?.error?.title || 'Installation Failed'}
					</Card.Title>
					<Card.Description class="mt-2 text-destructive">
						{translations?.installer?.install?.error?.description ||
							'An error occurred during the installation process.'}
					</Card.Description>
				{:else if isComplete}
					<Card.Title>
						{translations?.installer?.install?.success?.title ||
							'Installation Complete!'}
					</Card.Title>
					<Card.Description class="mt-2 text-muted-foreground">
						{translations?.installer?.install?.success?.description ||
							'blossomOS has been successfully installed on your computer.'}
					</Card.Description>
				{:else}
					<Card.Title>
						{translations?.installer?.install?.title || 'Installing blossomOS'}
					</Card.Title>
					<Card.Description class="mt-2 text-muted-foreground">
						{translations?.installer?.install?.description ||
							'Please wait while blossomOS is installed on your computer. This may take several minutes.'}
					</Card.Description>
				{/if}
			</div>
		</div>
	</Card.Header>

	<Card.Content class="mt-6">
		<div class="space-y-6">
			{#if error}
				<!-- Error Message -->
				<div class="text-center space-y-4">
					<div
						class="mx-auto w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-12 text-destructive"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
							/>
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-destructive">
						{translations?.installer?.install?.error?.title || 'Installation Failed'}
					</h2>
					<p class="text-muted-foreground max-w-md mx-auto">
						{translations?.installer?.install?.error?.message ||
							'An error occurred during the installation process. Please check the error details below and try again.'}
					</p>
				</div>

				<!-- Error Details -->
				<div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
					<div class="flex items-start gap-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-5 text-destructive mt-0.5 shrink-0"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
							/>
						</svg>
						<div>
							<h4 class="font-medium text-destructive">
								{translations?.installer?.install?.error?.details ||
									'Error Details'}
							</h4>
							<p class="text-sm text-muted-foreground mt-1 font-mono break-all">
								{error}
							</p>
						</div>
					</div>
				</div>

				<!-- Troubleshooting Tips -->
				<div class="p-4 bg-muted/20 border border-muted/30 rounded-lg">
					<h4 class="font-medium mb-2">
						{translations?.installer?.install?.error?.contactSupport ||
							'Troubleshooting Tips'}
					</h4>
					<ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
						<li>Ensure you have sufficient disk space (at least 8GB free)</li>
						<li>Check that the selected disk is not currently mounted or in use</li>
						<li>Verify that you have administrator privileges</li>
						<li>Make sure all required packages (parted, btrfs-progs) are installed</li>
						<li>Try selecting a different disk or partition</li>
					</ul>
				</div>
				<!-- Error Action Buttons -->
				<div class="space-y-4">
					<div class="flex gap-3 justify-center">
						<Button variant="outline" onclick={handleBack}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-4 mr-2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M15.75 19.5 8.25 12l7.5-7.5"
								/>
							</svg>
							Back to Disk Selection
						</Button>
						<Button
							onclick={() => {
								error = null;
								isInstalling = false;
								isComplete = false;
								currentStepIndex = 0;
								overallProgress = 0;
								installationLog = [];
								currentSlide = 1;
								stopSlideshow(); // Clean up any existing slideshow
								startInstallation();
							}}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-4 mr-2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
								/>
							</svg>
							{translations?.installer?.install?.actions?.tryAgain || 'Try Again'}
						</Button>
						<Button variant="outline" onclick={handleReturnToRecovery}>
							{translations?.installer?.install?.actions?.returnToRecovery ||
								'Return to Recovery'}
						</Button>
					</div>
				</div>

				{#if !error}
					<div class="pt-4 border-t">
						<h4 class="font-medium mb-2">
							{translations?.installer?.install?.log?.title || 'Installation Log'}
						</h4>
						<div
							class="p-3 bg-muted/50 rounded-lg max-h-48 overflow-y-auto font-mono text-xs"
						>
							{#each installationLog as logEntry}
								<div class="text-muted-foreground mb-1">{logEntry}</div>
							{/each}
							{#if installationLog.length === 0}
								<div class="text-muted-foreground">
									{translations?.installer?.install?.log?.empty ||
										'No log entries available.'}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{:else if isComplete}
				<!-- Success Message -->
				<div class="text-center space-y-4">
					<div
						class="mx-auto w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-12 text-primary"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
							/>
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-primary">
						{translations?.installer?.install?.success?.title ||
							'Installation Successful!'}
					</h2>
					<p class="text-muted-foreground max-w-md mx-auto">
						{translations?.installer?.install?.success?.message ||
							'blossomOS has been installed successfully. You can now shutdown or restart your computer to boot into your new operating system.'}
					</p>
				</div>

				<!-- Action Buttons -->
				<div class="space-y-4">
					<div class="flex items-center gap-3 justify-center">
						<Checkbox
							id="restart-checkbox"
							bind:checked={shouldRestart}
							class="rounded border-muted-foreground/30 text-primary focus:ring-primary/20 focus:ring-2"
						/>
						<label
							for="restart-checkbox"
							class="text-sm text-muted-foreground cursor-pointer"
						>
							{translations?.installer?.install?.success?.restartOption ||
								'Restart instead of shutdown'}
						</label>
					</div>
					<div class="flex gap-3 justify-center">
						<Button variant="outline" onclick={handleReturnToRecovery}>
							{translations?.installer?.install?.actions?.returnToRecovery ||
								'Return to Recovery'}
						</Button>
						<Button onclick={handlePowerAction}>
							{shouldRestart
								? translations?.installer?.install?.actions?.restart || 'Restart'
								: translations?.installer?.install?.actions?.shutdown || 'Shutdown'}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-4 ml-2"
							>
								{#if shouldRestart}
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
									/>
								{:else}
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9"
									/>
								{/if}
							</svg>
						</Button>
					</div>
				</div>
			{:else}
				<!-- Overall Progress -->
				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<h3 class="font-semibold">
							{translations?.installer?.install?.progress || 'Installation Progress'}
						</h3>
						<span class="text-sm text-muted-foreground">
							{Math.round(overallProgress)}%
						</span>
					</div>
					<Progress value={overallProgress} class="h-3" />
				</div>

				<!-- Presentation Slideshow -->
				<div class="space-y-3">
					<h4 class="font-medium text-center">
						{translations?.installer?.install?.title || 'Installing blossomOS'}
					</h4>
					<div class="flex justify-center">
						<div class="relative w-full max-w-lg aspect-video">
							<img
								src="/{currentSlide}.png"
								alt="Installation step {currentSlide}"
								class="w-full h-full object-cover rounded-lg shadow-lg transition-all duration-500 ease-in-out"
								on:error={() => {
									// Fallback if image doesn't exist
									console.warn(`Image /${currentSlide}.png not found`);
								}}
							/>
							<div
								class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2"
							>
								{#each Array(totalSlides) as _, i}
									<div
										class="w-2 h-2 rounded-full transition-all duration-300 {i +
											1 ===
										currentSlide
											? 'bg-white shadow-md'
											: 'bg-white/50'}"
									></div>
								{/each}
							</div>
						</div>
					</div>
					<div class="text-center">
						<p class="text-sm text-muted-foreground">
							{#if currentStepIndex < installSteps.length}
								{installSteps[currentStepIndex]?.title ||
									translations?.installer?.install?.preparing ||
									'Preparing...'}
							{:else}
								{translations?.installer?.install?.finalizing ||
									'Finalizing installation...'}
							{/if}
						</p>
					</div>
				</div>

				<!-- Installation Log Toggle -->
				<div class="pt-4 border-t">
					<Button variant="ghost" onclick={toggleLog} class="text-xs">
						{showLog
							? translations?.installer?.install?.log?.hide || 'Hide Log'
							: translations?.installer?.install?.log?.show || 'Show Log'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-3 ml-1 transition-transform {showLog ? 'rotate-180' : ''}"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="m19.5 8.25-7.5 7.5-7.5-7.5"
							/>
						</svg>
					</Button>

					{#if showLog}
						<div
							class="mt-2 p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto font-mono text-xs"
						>
							{#each installationLog as logEntry}
								<div class="text-muted-foreground">{logEntry}</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</Card.Content>
</main>
