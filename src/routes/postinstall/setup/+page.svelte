<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';

	let isPostinstallMode = false;

    let name = '';
    let computerName = '';
    let email = '';
    let username = '';
    let password = '';
    let confirmPassword = '';

    let error = false;
    let errorMessage = '';

    let isLoading = false;

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
			} catch (error) {
				console.error('Failed to check postinstall mode or enter fullscreen:', error);
			}
		}
	});

	function handleContinue() {
        if (password !== confirmPassword) {
            error = true;
            errorMessage = "Passwords do not match.";
            return;
        }
        if (window.electron) {
            isLoading = true;
            window.electron.setupUserAccount({
                name,
                computerName,
                email,
                username,
                password
            }).then(() => {
                goto('/postinstall/finish');
            }).catch((err: Error) => {
                isLoading = false;
                error = true;
                errorMessage = err.message;
            });
        }
	}
</script>

<main class="bg-background h-screen flex items-center justify-center p-8">
    <Card.Root class="w-3xl mx-auto my-16">
        <Card.Header>
            <Card.Title>Set up your user account</Card.Title>
            <Card.Description>This account is a local account. It is not connected to any online services.</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
            {#if error}
                <div class="space-y-3">
                    <p class="text-sm text-red-600 dark:text-red-400">
                        ✗ {errorMessage}
                    </p>
                </div>
            {/if}

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
                <Label for="name" class="text-sm font-medium">Your name</Label>
                <Input id="name" type="text" placeholder="Enter your name" />
            </div>
            <div class="space-y-2">
                <Label for="computer" class="text-sm font-medium">Computer name</Label>
                <Input id="computer" type="text" placeholder="Enter computer name" />
            </div>
            </div>

            <div class="space-y-2">
                <Label for="email" class="text-sm font-medium">Email address (optional)</Label>
                <Input id="email" type="email" placeholder="Enter your email address" />
            </div>
            
            <div class="space-y-2">
                <Label for="username" class="text-sm font-medium">Username</Label>
                <Input id="username" type="text" placeholder="Enter your username" />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
                <Label for="password" class="text-sm font-medium">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" />
            </div>
            <div class="space-y-2">
                <Label for="confirm" class="text-sm font-medium">Confirm password</Label>
                <Input id="confirm" type="password" placeholder="Confirm your password" />
            </div>
            </div>
        </Card.Content>
        <Card.Footer class="flex justify-end">
            <Button onclick={handleContinue} disabled={isLoading}>
                {#if isLoading}
                    <Spinner class="mr-2" />
                    Setting up...
                {:else}
                    Finish Setup
                {/if}
            </Button>
        </Card.Footer>
    </Card.Root>
</main>