<script lang="ts">
    import Spinner from '$lib/components/ui/spinner/spinner.svelte';

    let isInstalling = false;
    function getTileClass(appId: string) {
        return [
            'p-4 border rounded-lg flex flex-col items-center justify-center transition-all duration-150',
            selectedApps[appId] ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
        ].join(' ');
    }
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { onMount } from 'svelte';
    import * as Card from '$lib/components/ui/card/index.js';
    import * as Item from '$lib/components/ui/item';

    let isPostinstallMode = false;
    let error = false;
    let errorMessage = '';

    onMount(async () => {
		if (window.electron) {
			try {
				isPostinstallMode = await window.electron.checkPostinstallMode();

				// Enter fullscreen mode for postinstall
				if (isPostinstallMode) {
					// Request fullscreen for the document
					if (document.documentElement.requestFullscreen) {
						await document.documentElement.requestFullscreen();
					} else if ((document.documentElement as any).webkitRequestFullscreen) {
						await (document.documentElement as any).webkitRequestFullscreen();
					} else if ((document.documentElement as any).msRequestFullscreen) {
						await (document.documentElement as any).msRequestFullscreen();
					}
				}

                await window.electron.runCommand(`kwriteconfig6 --file kcm_touchpad --group "Touchpad" --key "NaturalScrolling" "true"`);
                await window.electron.runCommand('sudo systemctl enable --now NetworkManager && sudo systemctl disable NetworkManager-wait-online.service');

                fetch("https://api.github.com/")
                    .then(() => {
                        // Connected to the internet
                    })
                    .catch(() => {
                        error = true;
                        errorMessage = "Unable to reach servers. Please check your internet connection.";
                    });
			} catch (error) {
				console.error('Failed to check postinstall mode or enter fullscreen:', error);
			}
		}
	});

    // App categories and apps
    interface App {
        id: string;
        name: string;
        icon: string;
        flatpak: string;
        selected: boolean;
    }

    interface AppCategory {
        name: string;
        key: string;
        apps: App[];
    }

    const appCategories: AppCategory[] = [
        {
            name: 'Choose your browser',
            key: 'browser',
            apps: [
                { id: 'firefox', name: 'Firefox', icon: '/apps/firefox.svg', flatpak: 'org.mozilla.firefox', selected: true },
                { id: 'chrome', name: 'Chrome', icon: '/apps/chrome.svg', flatpak: 'com.google.Chrome', selected: false },
                { id: 'zen', name: 'Zen', icon: '/apps/zen.png', flatpak: 'app.zen_browser.zen', selected: false },
                { id: 'edge', name: 'Microsoft Edge', icon: '/apps/edge.svg', flatpak: 'com.microsoft.Edge', selected: false },
            ],
        },
        {
            name: 'Gaming apps',
            key: 'gaming',
            apps: [
                { id: 'steam', name: 'Steam', icon: '/apps/steam.svg', flatpak: 'com.valvesoftware.Steam', selected: false },
                { id: 'lutris', name: 'Lutris', icon: '/apps/lutris.svg', flatpak: 'net.lutris.Lutris', selected: false },
                { id: 'heroic', name: 'Heroic Games Launcher', icon: '/apps/heroic.svg', flatpak: 'com.heroicgameslauncher.hgl', selected: false },
            ],
        },
        {
            name: 'Messenger apps',
            key: 'messenger',
            apps: [
                { id: 'signal', name: 'Signal', icon: '/apps/signal.svg', flatpak: 'org.signal.Signal', selected: false },
                { id: 'telegram', name: 'Telegram', icon: '/apps/telegram.svg', flatpak: 'org.telegram.desktop', selected: false },
                { id: 'discord', name: 'Discord', icon: '/apps/discord.png', flatpak: 'com.discordapp.Discord', selected: false },
            ],
        },
        {
            name: 'Music & Media apps',
            key: 'music',
            apps: [
                { id: 'spotify', name: 'Spotify', icon: '/apps/spotify.png', flatpak: 'com.spotify.Client', selected: false },
                { id: 'tidal', name: 'Tidal Hi-Fi', icon: '/apps/tidal.svg', flatpak: 'com.mastermindzh.tidal-hifi', selected: false },
                { id: 'vlc', name: 'VLC', icon: '/apps/vlc.png', flatpak: 'org.videolan.VLC', selected: true },
            ],
        },
    ];

    // Selection state
    let selectedApps: Record<string, boolean> = {};
    if (appCategories && appCategories.length) {
        for (const category of appCategories) {
            for (const app of category.apps) {
                selectedApps[app.id] = app.selected;
            }
        }
    }

    function toggleApp(appId: string) {
        selectedApps[appId] = !selectedApps[appId];
        // If Firefox is deselected, uninstall it
        if (appId === 'firefox' && !selectedApps[appId]) {
            if (window.electron) {
                window.electron.runCommand('flatpak uninstall -y org.mozilla.firefox');
            }
        }
        if (appId === 'vlc' && !selectedApps[appId]) {
            if (window.electron) {
                window.electron.runCommand('flatpak uninstall -y org.videolan.VLC');
            }
        }
    }

    async function handleContinue() {
        isInstalling = true;
        if (window.electron) {
            await window.electron.runCommandAsync('flatpak update -y');
            for (const category of appCategories) {
                for (const app of category.apps) {
                    if (!selectedApps[app.id]) {
                        await window.electron.runCommandAsync(`flatpak uninstall -y ${app.flatpak}`);
                    }
                }
            }
            for (const category of appCategories) {
                for (const app of category.apps) {
                    if (selectedApps[app.id]) {
                        await window.electron.runCommandAsync(`flatpak install -y flathub ${app.flatpak}`);
                    }
                }
            }
        }
        goto('/postinstall/setup');
    }
</script>

<main class="bg-background p-8">
    <Card.Root class="w-4xl mx-auto my-16">
        <Card.Header>
            <Card.Title>Install your favourite apps</Card.Title>
            <Card.Description>
                You can install additional applications now or skip this step and install them later.
            </Card.Description>
        </Card.Header>
        {#if isInstalling}
            <Card.Content class="flex flex-col items-center justify-center py-16">
                <Spinner class="h-10 w-10 mb-4" />
                <div class="text-lg text-muted-foreground">Installing selected apps…</div>
            </Card.Content>
        {:else}
            <Card.Content class="space-y-6">
                {#if error}
                    <div class="space-y-3">
                        <p class="text-sm text-red-600 dark:text-red-400">
                            ✗ {errorMessage}
                        </p>
                        <div class="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30 rounded-lg">
                            <Button size="sm" onclick={() => { error = false; errorMessage = ''; goto("/postinstall/wifi"); }}>
                                Open WiFi manager
                            </Button>
                        </div>
                    </div>
                {:else}
                    {#each appCategories as category}
                        <div class="max-h-[400px] overflow-y-auto">
                            <h3 class="font-semibold mb-2">{category.name}</h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {#each category.apps as app}
                                    <button type="button" class="w-full" aria-pressed={selectedApps[app.id]} aria-label={app.name} on:click={() => toggleApp(app.id)}>
                                        <Item.Root class={getTileClass(app.id)}>
                                            <div class="text-3xl mb-2">
                                                <img src={app.icon} alt={app.name + ' icon'} class="h-12 w-12 rounded-lg" />
                                            </div>
                                            <div class="font-medium">{app.name}</div>
                                            {#if selectedApps[app.id]}
                                                <div class="mt-2 text-primary">✓ Selected</div>
                                            {/if}
                                        </Item.Root>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}
                {/if}
            </Card.Content>
            <Card.Footer class="flex justify-end gap-2">
                <Button variant="outline" onclick={() => goto('/postinstall/setup')}>Skip</Button>
                <div class="flex-1"></div>
                <Button onclick={handleContinue}>Install Selected Apps</Button>
            </Card.Footer>
        {/if}
    </Card.Root>
</main>