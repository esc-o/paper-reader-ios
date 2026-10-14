#!/bin/bash
# Download the font and icon from paper-reader, then build the web bundle into the Xcode project.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

base="https://github.com/esc-o/paper-reader/raw/74e0e631f5f6da3b60b3f15af9717c32bbcb2d50"
mkdir -p public/fonts ios/App/App/public/fonts \
  ios/App/App/Assets.xcassets/AppIcon.appiconset \
  ios/App/App/Assets.xcassets/Splash.imageset

echo "Downloading font and icon"
curl -fsSL "$base/public/fonts/ChironYuan-Medium.ttf" -o public/fonts/ChironYuan-Medium.ttf
curl -fsSL "$base/public/icon.png" -o public/icon.png
cp public/fonts/ChironYuan-Medium.ttf ios/App/App/public/fonts/ChironYuan-Medium.ttf
cp public/icon.png ios/App/App/public/icon.png

icon="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
splash="ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png"
if command -v sips >/dev/null 2>&1; then
  sips -z 1024 1024 public/icon.png --out "$icon" >/dev/null
  sips -z 2732 2732 public/icon.png --out "$splash" >/dev/null
else
  cp public/icon.png "$icon"
  cp public/icon.png "$splash"
fi
cp "$splash" ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png
cp "$splash" ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png

echo "Installing dependencies and syncing the iOS web bundle"
npm install
npm run ios:sync

echo "Ready: open ios/App/App.xcodeproj"
