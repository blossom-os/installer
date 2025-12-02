# blossomOS Installer

<p align="center">
  <strong>A modern, user-friendly system installer for blossomOS</strong>
</p>

## Overview

The blossomOS installer is a full-featured system installation and post-installation setup application built with SvelteKit and Electron. It provides an intuitive graphical interface for installing blossomOS (Arch Linux-based) onto user hardware, configuring the system, and setting up the user environment.

## Features

### Installation Flow
- **Recovery Environment**: Boot into a live environment with system recovery tools
- **Internet Connectivity Check**: Validates network connection before proceeding
- **Language & Keyboard Selection**: Multi-language support (English, German, French, Spanish)
- **NVIDIA Detection**: Automatically detects and installs NVIDIA drivers when applicable
- **Disk Management**: 
  - Automatic disk scanning and selection
  - Support for UEFI and BIOS boot modes
  - Dual-boot support with Windows detection
  - BTRFS filesystem with subvolumes (@, @home, @var)
  - Smart partitioning (alongside existing OS or full disk wipe)
- **WiFi Manager**: Built-in WiFi connection utility with NetworkManager integration
- **Progress Tracking**: Real-time installation progress with detailed logging

### Post-Installation Setup
- **User Account Creation**: Set up username, password, computer name, and user details
- **Application Installation**: Curated selection of popular apps via Flatpak
  - Browsers (Firefox, Chrome, Zen, Edge)
  - Gaming (Steam, Lutris, Heroic Games Launcher)
  - Messengers (Signal, Telegram, Discord)
  - Media (Spotify, Tidal, VLC)
- **System Configuration**: 
  - Timeshift backup system with automatic snapshots
  - KDE Plasma desktop environment
  - Custom blossomOS branding and theming
  - Natural scroll configuration for touchpads
  - Docker and Distrobox support

### System Tools
- Partition Manager (GParted)
- Backup & Restore (Timeshift)
- Terminal access
- Firefox web browser
- System shutdown controls

## Technology Stack

- **Frontend**: SvelteKit 5 with TypeScript
- **UI Framework**: Tailwind CSS 4 + bits-ui components
- **Desktop**: Electron 39
- **Build Tool**: Vite 7
- **Package Manager**: Bun (recommended for development)
- **Base System**: Arch Linux with KDE Plasma
- **Filesystem**: BTRFS with subvolumes
- **Package Management**: Pacman + Flatpak + Chaotic-AUR

## Project Structure

```
installer/
├── src/
│   ├── routes/                    # SvelteKit pages
│   │   ├── +page.svelte          # Recovery environment main page
│   │   ├── installer/            # Installation flow pages
│   │   │   ├── welcome/          # Welcome & internet check
│   │   │   ├── language/         # Language selection
│   │   │   ├── nvidia/           # NVIDIA detection
│   │   │   ├── select-disk/      # Disk selection
│   │   │   └── install/          # Installation process
│   │   ├── postinstall/          # Post-installation setup
│   │   │   ├── welcome/          # Post-install welcome
│   │   │   ├── wifi/             # WiFi setup
│   │   │   ├── apps/             # App installation
│   │   │   └── setup/            # User account creation
│   │   └── wifi/                 # WiFi manager
│   ├── lib/
│   │   ├── components/ui/        # Reusable UI components
│   │   └── stores/               # Svelte stores (i18n)
│   ├── electron.cjs              # Electron main process
│   └── preload.cjs               # Electron preload script
├── static/
│   ├── locales/                  # Translation files (en, de, es, fr)
│   └── apps/                     # App icons
└── build.config.json             # Electron builder configuration
```

## Development Setup

### Prerequisites
- Node.js 18+ or Bun
- Electron dependencies for your platform

### Installation

```bash
# Clone the repository
git clone https://github.com/blossom-os/installer.git
cd installer

# Install dependencies
bun install
# or
bun install

# Start development server
bun run dev
# or
bun run dev
```

The development environment will start two processes:
1. Vite dev server (SvelteKit frontend)
2. Electron window displaying the application

### Build

```bash
# Build for production
bun run build
# or
bun run build
```

This creates a production build in the `dist` folder for Linux systems.

## Installation Process

### Phase 1: System Installation

1. **Boot into Recovery Environment**: Live ISO with installer and recovery tools
2. **Internet Connection**: Validates connectivity (required for installation)
3. **Language & Keyboard**: Select system language and keyboard layout
4. **NVIDIA Detection**: Automatically detects NVIDIA GPUs and plans driver installation
5. **Disk Selection**: Choose target disk and partition strategy
6. **Installation**: 
   - Partition disk (GPT for UEFI, MBR for BIOS)
   - Format partitions (FAT32 for EFI, BTRFS for root)
   - Create BTRFS subvolumes
   - Install base system with pacstrap
   - Configure locale, timezone, and keyboard
   - Install KDE Plasma desktop
   - Set up systemd-boot (UEFI) or GRUB (BIOS)
   - Install NVIDIA drivers if detected
   - Configure Timeshift for backups
   - Create initial system snapshot

### Phase 2: Post-Installation

1. **First Boot**: Auto-login to temporary user account
2. **WiFi Setup**: Connect to wireless network if needed
3. **App Installation**: Select and install applications via Flatpak
4. **User Account**: Create permanent user account with name, email, and password
5. **Finalization**: 
   - Apply blossomOS theme
   - Configure natural scrolling
   - Remove temporary installer files
   - Reboot into new system

## Key Features in Detail

### Dual-Boot Support
- Automatically detects Windows installations
- Creates boot entries for Windows in systemd-boot/GRUB
- Safely partitions alongside existing systems when possible

### BTRFS & Snapshots
- BTRFS filesystem with compression and CoW
- Separate subvolumes for root, home, and var
- Automated Timeshift snapshots (hourly, daily, boot, weekly, monthly)
- Easy system rollback via Timeshift

### Multi-Language Support
Supported languages with full localization:
- English (en)
- German (de)
- French (fr)
- Spanish (es)

Translation files located in `static/locales/`.

### Package Management
- **Pacman**: Core system packages
- **Flatpak**: User applications with Flathub integration
- **Chaotic-AUR**: Access to AUR packages via trusted repository
- **yay**: AUR helper pre-installed

### System Branding
- Custom `/etc/os-release` with blossomOS identity
- Pacman hooks to preserve branding after system updates
- Custom SDDM theme and KDE configuration
- Removal of non-essential KDE Control Modules for security

## Configuration Files

### `build.config.json`
Electron builder configuration for packaging the installer.

### `package.json`
Key scripts:
- `dev`: Run development environment
- `build`: Build production application
- `build:svelte`: Build SvelteKit app
- `build:electron`: Package Electron application

### `src/electron.cjs`
Main Electron process handling:
- IPC communication for system operations
- Disk scanning and partitioning
- WiFi management via NetworkManager
- System installation orchestration
- Command execution with sudo privileges

## IPC Handlers

The installer uses Electron IPC for system operations:

- `check-postinstall-mode`: Check if running in post-install phase
- `scan-disks`: List available storage devices
- `check-boot-mode`: Detect UEFI vs BIOS
- `detect-nvidia`: Scan for NVIDIA graphics cards
- `scan-wifi`: List available WiFi networks
- `connect-wifi`: Connect to WiFi network
- `install-system`: Execute system installation
- `setup-user-account`: Create user account and finalize setup
- `get-timezone-by-ip`: Auto-detect timezone
- `set-language`: Store language preference
- `set-keyboard`: Store keyboard layout preference

## Security Considerations

- Installer runs with elevated privileges (sudo) during system setup
- Temporary user account removed after final user creation
- Passwordless sudo disabled after setup
- Dangerous KDE Control Modules removed to prevent system misconfiguration
- NVIDIA drivers sourced from official repositories

## Logging

All installation operations are logged to `/home/liveuser/installer.log` for debugging and troubleshooting.

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style conventions
- UI changes maintain accessibility standards
- Translation files are updated for all supported languages
- System operations include proper error handling

## License

See [LICENSE](LICENSE) file for details.

## Authors

**blossomOS Team**  
Website: [https://blossom-os.com](https://blossom-os.com)  
Support: <support@blossom-os.com>

## Related Projects

- [blossomOS ISO Builder](../iso/README.md) - Build the live ISO image
- [Arch Linux](https://archlinux.org/) - Base distribution
- [SvelteKit](https://kit.svelte.dev/) - Frontend framework
- [Electron](https://www.electronjs.org/) - Desktop application framework

## Recommended IDE Setup

- [Visual Studio Code](https://code.visualstudio.com/)
- [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) extension
- [TypeScript](https://www.typescriptlang.org/) support

## Troubleshooting

### Installation Fails
- Check `/home/liveuser/installer.log` for detailed error messages
- Ensure internet connectivity is stable throughout installation
- Verify disk has sufficient space (minimum 25GB)
- Check UEFI/BIOS settings if boot issues occur

### WiFi Not Working
- Ensure NetworkManager is running: `systemctl status NetworkManager`
- Check for hardware switches or function key combinations
- Verify WiFi is not blocked: `rfkill list`

### Post-Install Issues
- If installer doesn't auto-start, check for `.postinstall` file in user home
- Review systemd logs: `journalctl -xe`
- Check SDDM status: `systemctl status sddm`
