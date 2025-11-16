#!/bin/bash
qdbus6 org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript '
var ids = panelIds();
for (var i = 0; i < ids.length; i++) {
    var p = panelById(ids[i]);
    // Panel komplett verstecken, wenn möglich:
    p.height = 0;
    // Oder zumindest autohide einstellen:
    p.hiding = "autohide";
}
'
cd /opt/blossomos-installer
/home/$USER/.bun/bin/bun dev --postinstall