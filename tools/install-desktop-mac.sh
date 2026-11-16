#!/bin/bash
# Corner Stone (King James Bible): install as a desktop app on a Mac.
# Makes ~/Applications/"Corner Stone.app", which opens the app in its own window (Chrome or Edge "app mode"),
# or in Safari if neither is installed (then use Safari's File > Add to Dock for a window of its own).
#
# The simplest way needs no script: Safari > File > Add to Dock.
# To use this script instead: download it, read it, then in Terminal run
#   bash install-desktop-mac.sh
# Remove again:
#   rm -rf ~/Applications/"Corner Stone.app"
set -euo pipefail

APP_URL="https://sparx78.github.io/Corner-Stone-Bible-/"
APP="$HOME/Applications/Corner Stone.app"
rm -rf "$HOME/Applications/Scripture.app"   # from before the app was renamed
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# The launcher: Chrome or Edge in app mode, otherwise Safari
cat > "$APP/Contents/MacOS/Scripture" <<EOF
#!/bin/bash
URL="$APP_URL"
for b in "Google Chrome" "Microsoft Edge"; do
  if [ -d "/Applications/\$b.app" ] || [ -d "\$HOME/Applications/\$b.app" ]; then
    exec open -na "\$b" --args --app="\$URL" --window-size=1100,860
  fi
done
exec open -a Safari "\$URL"
EOF
chmod +x "$APP/Contents/MacOS/Scripture"

cat > "$APP/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Corner Stone</string>
  <key>CFBundleDisplayName</key><string>Corner Stone</string>
  <key>CFBundleIdentifier</key><string>io.github.sparx78.scripture</string>
  <key>CFBundleExecutable</key><string>Scripture</string>
  <key>CFBundleIconFile</key><string>Scripture</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
</dict></plist>
EOF

# The icon, made from the app's own picture
TMP="$(mktemp -d)"
curl -fsSL "${APP_URL}icons/icon-512.png" -o "$TMP/icon.png"
mkdir -p "$TMP/Scripture.iconset"
for s in 16 32 64 128 256 512; do
  sips -z $s $s "$TMP/icon.png" --out "$TMP/Scripture.iconset/icon_${s}x${s}.png" >/dev/null
  d=$((s * 2)); [ $d -le 512 ] && sips -z $d $d "$TMP/icon.png" --out "$TMP/Scripture.iconset/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$TMP/Scripture.iconset" -o "$APP/Contents/Resources/Scripture.icns"
rm -rf "$TMP"
touch "$APP"

echo "Corner Stone is installed in ~/Applications. Opening it now..."
echo "Tip: while it is open, right-click its Dock icon > Options > Keep in Dock."
open "$APP"
