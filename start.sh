#!/bin/bash

OUT=$(sudo libinput list-devices)

TOUCH_KERNELS=$(echo "$OUT" | awk '
    BEGIN{IGNORECASE=1}
    /^Device:.*touchpad/{touch=1}
    touch && /^Kernel:/ {print $2; touch=0}
')

if [ -z "$TOUCH_KERNELS" ]; then
    exit 1
fi

for KERNEL in $TOUCH_KERNELS; do
    DEVICE_NAME=$(basename "$KERNEL")
    DBUS_PATH="/org/kde/KWin/InputDevice/$DEVICE_NAME"

    busctl --user set-property org.kde.KWin "$DBUS_PATH" org.kde.KWin.InputDevice naturalScroll b true
done

konsave -i /usr/share/blossomos/theme.knsv
konsave -a theme
killall plasmashell
cd /opt/blossomos-installer
/home/$USER/.bun/bin/bun dev