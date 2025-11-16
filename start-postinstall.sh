#!/bin/bash
CONFIG="$HOME/.config/plasma-org.kde.plasma.desktop-appletsrc"
BACKUP="$CONFIG.bak"

cp "$CONFIG" "$BACKUP"
echo "Backup erstellt: $BACKUP"

awk '
  /^\[Containments/ {in_panel=0}
  /plugin=panel/ {in_panel=1; next}
  !in_panel {print}
' "$CONFIG" > "${CONFIG}.tmp" && mv "${CONFIG}.tmp" "$CONFIG"

killall plasmashell
sleep 1
plasmashell &

cd /opt/blossomos-installer
/home/$USER/.bun/bin/bun dev