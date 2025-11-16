#!/bin/bash
plasmashell --script /opt/blossomos-installer/remove-panels.js
cd /opt/blossomos-installer
/home/$USER/.bun/bin/bun dev --postinstall