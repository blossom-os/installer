#!/bin/bash
panel_ids=$(qdbus org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.panels)
for pid in $panel_ids; do
    qdbus org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.removePanel $pid
done
cd /opt/blossomos-installer
/home/$USER/.bun/bin/bun dev --postinstall