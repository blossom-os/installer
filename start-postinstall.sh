#!/bin/bash
qdbus6 org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript '
var all = desktopContainments();
for (var i = 0; i < all.length; i++) {
    var c = all[i];
    if (c.type === "Panel") {
        c.height = 0;
        // c.hiding = "autohide";
    }
}
'
cd /opt/blossomos-installer
/home/$USER/.bun/bin/bun dev --postinstall