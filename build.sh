#!/usr/bin/env bash
set -euo pipefail

# Always work from the repo root, no matter where the script is invoked from.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# Name of the plugin folder inside the archive. This is the on-device folder name
# and stays the same as the official release so it replaces an existing install.
PLUGIN_DIR_NAME="TabMaster"

# Identity stamped into the packaged plugin.json for local/dev builds.
# Decky Loader identifies plugins (and checks for updates) by the "name" field in
# plugin.json, so a different name means the store's "TabMaster" entry will never
# match this build and auto-update it.
DEV_PLUGIN_NAME="TabMaster-Dev"

VERSION="$(node -p "require('./package.json').version")"
ZIP_NAME="TabMaster_dev_v${VERSION}.zip"
STAGE_DIR="$REPO_ROOT/.build"
MANIFEST_DIR="$STAGE_DIR/dev-manifest"

echo "Building TabMaster v${VERSION}"

# 1. Create the dev manifest before building so the name embedded in dist/index.js
#    matches the plugin.json that will be installed by Decky.
mkdir -p "$MANIFEST_DIR"
node -e '
  const fs = require("fs");
  const sourcePath = process.argv[1];
  const outputPath = process.argv[2];
  const devName = process.argv[3];
  const plugin = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  plugin.name = devName;
  fs.writeFileSync(outputPath, JSON.stringify(plugin, null, 2) + "\n");
' "$REPO_ROOT/plugin.json" "$MANIFEST_DIR/plugin.json" "$DEV_PLUGIN_NAME"

# Build using that manifest (normal builds continue to use the root plugin.json).
DECKY_PLUGIN_MANIFEST_DIR="$MANIFEST_DIR" npm run build

# 2. Assemble a clean plugin folder from scratch instead of patching an existing zip.
#    Only the files that ship in a release are included.
rm -rf "$STAGE_DIR/$PLUGIN_DIR_NAME"
mkdir -p "$STAGE_DIR/$PLUGIN_DIR_NAME"

INCLUDE_FILES=(plugin.json package.json main.py README.md LICENSE)
for file in "${INCLUDE_FILES[@]}"; do
  cp "$file" "$STAGE_DIR/$PLUGIN_DIR_NAME/$file"
done

# dist/ (index.js + source map) goes in its own subfolder.
cp -R dist "$STAGE_DIR/$PLUGIN_DIR_NAME/dist"

# 3. Stamp the dev-only plugin name so Decky Loader does not auto-update this build.
node -e '
  const fs = require("fs");
  const pluginPath = process.argv[1];
  const devName = process.argv[2];
  const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
  plugin.name = devName;
  fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n");
' "$STAGE_DIR/$PLUGIN_DIR_NAME/plugin.json" "$DEV_PLUGIN_NAME"

# 4. Create the archive from scratch (never update an existing zip, so stale files can't linger).
rm -f "$ZIP_NAME"
( cd "$STAGE_DIR" && zip -r -q "$REPO_ROOT/$ZIP_NAME" "$PLUGIN_DIR_NAME" )

# 5. Ship it to the Deck.
scp "$ZIP_NAME" deck:/home/deck/

echo "Done: $ZIP_NAME"
