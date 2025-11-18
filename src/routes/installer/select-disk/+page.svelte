<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Item from '$lib/components/ui/item';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		loadLanguageTranslations,
		translations as translationsStore,
		getCurrentLanguage,
	} from '$lib/stores/i18n.js';

	interface Disk {
		name: string;
		size: string;
		model: string;
		type: 'HDD' | 'SSD' | 'NVMe';
		partitions: Array<{
			name: string;
			size: string;
			fstype: string | null;
			mountpoint: string | null;
		}>;
	}

	interface Translations {
		installer?: {
			selectDisk?: {
				title?: string;
				description?: string;
				warning?: string;
				availableDisks?: string;
				selectDisk?: string;
				diskInfo?: string;
				partitions?: string;
				noDisks?: string;
				scanning?: string;
				back?: string;
				continue?: string;
			};
		};
		buttons?: {
			back?: string;
			continue?: string;
		};
		common?: {
			loading?: string;
			warning?: string;
		};
	}

	let disks: Disk[] = [];
	let loading = false;
	let selectedDiskName: string = '';
	let translations: Translations | null = null;

	$: selectedDisk = disks.find((disk) => disk.name === selectedDiskName) || null;

	// Subscribe to translations store
	translationsStore.subscribe((value) => {
		translations = value;
	});

	async function scanDisks() {
		loading = true;
		try {
			disks = await window.electron.scanDisks();
		} catch (error) {
			console.error('Failed to scan disks:', error);
			disks = [];
		}
		loading = false;
	}

	function handleBack() {
		goto('/installer/nvidia');
	}

	function handleNext() {
		if (selectedDisk) {
			// Store the selected disk for the installation page
			sessionStorage.setItem('selectedDisk', selectedDisk.name);
			goto('/installer/install');
		}
	}

	function getDiskIcon(type: string) {
		switch (type) {
			case 'SSD':
				return '💾';
			case 'HDD':
				return '💿';
			case 'NVMe':
				return '⚡';
			default:
				return '💽';
		}
	}

	onMount(async () => {
		// Load saved language and translations
		const savedLanguage = getCurrentLanguage();
		await loadLanguageTranslations(savedLanguage);

		// Scan available disks
		await scanDisks();
	});
</script>

<main>
	<Card.Header class="mt-4">
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
					{translations?.installer?.selectDisk?.title || 'Select Installation Disk'}
				</Card.Title>
				<Card.Description class="mt-2 text-muted-foreground">
					{translations?.installer?.selectDisk?.description ||
						'Choose the disk where you want to install blossomOS. This will erase all data on the selected disk.'}
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content class="mt-6">
		<div class="space-y-6">
			<!-- Warning Message -->
			<div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
				<div class="flex items-start gap-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-5 text-destructive mt-0.5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
						/>
					</svg>
					<div>
						<h4 class="font-medium text-destructive">
							{translations?.common?.warning || 'Warning'}
						</h4>
						<p class="text-sm text-muted-foreground mt-1">
							{translations?.installer?.selectDisk?.warning ||
								'Installing blossomOS will completely erase all data on the selected disk, unless there is an empty partition on a Windows disk available for blossomOS partitions. Make sure you have backed up any important files before proceeding.'}
						</p>
					</div>
				</div>
			</div>

			<!-- Disk List -->
			<div>
				<h3 class="font-semibold mb-4">
					{translations?.installer?.selectDisk?.availableDisks || 'Available Disks:'}
				</h3>

				{#if loading}
					<div class="text-center py-8">
						<div
							class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"
						></div>
						<p class="text-muted-foreground mt-2">
							{translations?.installer?.selectDisk?.scanning || 'Scanning disks...'}
						</p>
					</div>
				{:else if disks.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						{translations?.installer?.selectDisk?.noDisks ||
							'No disks found. Please check your hardware connections.'}
					</div>
				{:else}
					<RadioGroup.Root bind:value={selectedDiskName} class="space-y-2">
						{#each disks as disk}
							<label for={disk.name} class="cursor-pointer">
								<Item.Root
									class="cursor-pointer {selectedDiskName === disk.name
										? 'ring-2 ring-primary bg-primary/5'
										: 'hover:bg-muted/50'}"
								>
									<Item.Media variant="icon">
										<span class="text-lg">{getDiskIcon(disk.type)}</span>
									</Item.Media>
									<Item.Content>
										<Item.Title class="flex items-center justify-between">
											<span>{disk.name} - {disk.model}</span>
											<span
												class="text-sm font-normal bg-muted px-2 py-1 rounded"
											>
												{disk.type}
											</span>
										</Item.Title>
										<Item.Description class="text-left">
											Size: {disk.size}
											{#if disk.partitions && disk.partitions.length > 0}
												<br />
												Partitions: {disk.partitions
													.map(
														(p) =>
															`${p.name} (${p.fstype || 'unformatted'})`,
													)
													.join(', ')}
											{:else}
												<br />
												No partitions (empty disk)
											{/if}
										</Item.Description>
									</Item.Content>
									<Item.Actions>
										<RadioGroup.Item value={disk.name} id={disk.name} />
									</Item.Actions>
								</Item.Root>
							</label>
						{/each}
					</RadioGroup.Root>
				{/if}
			</div>

			<!-- Navigation -->
			<div class="flex justify-between pt-4">
				<Button variant="outline" onclick={handleBack}>
					{translations?.buttons?.back || 'Back'}
				</Button>
				<Button onclick={handleNext} disabled={!selectedDisk} class="px-8">
					{translations?.buttons?.continue || 'Continue Installation'}
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
		</div>
	</Card.Content>
</main>
