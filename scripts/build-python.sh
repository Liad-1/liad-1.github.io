#!/usr/bin/env bash
# Package the Python (pygame) projects in wasm/ with pygbag for the in-browser demos.
# Needs Python 3.10+; pygbag is installed once into .cache/pyvenv/. The Python runtime
# itself is loaded at play time from pygbag's CDN (pygame-web.github.io).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
demos="$root/public/demos"
pygbag_version=0.9.3
venv="$root/.cache/pyvenv"
py="$venv/bin/python"; [[ -x "$venv/Scripts/python" ]] && py="$venv/Scripts/python"
if [[ ! -x "$py" ]] || ! "$py" -m pip show -q pygbag 2>/dev/null; then
  python3 -m venv "$venv" 2>/dev/null || python -m venv "$venv"
  py="$venv/bin/python"; [[ -x "$venv/Scripts/python" ]] && py="$venv/Scripts/python"
  "$py" -m pip install -q "pygbag==$pygbag_version"
fi

# Minesweeper → public/demos/minesweeper/game/ (embedded by public/demos/minesweeper/index.html)
src="$root/wasm/minesweeper"
rm -rf "$src/build"
# --ume_block 0: start without waiting for a click (the game has no sound in the browser).
PYTHONIOENCODING=utf-8 "$py" -m pygbag --build --ume_block 0 --title Minesweeper "$src" >/dev/null
out="$demos/minesweeper/game"
rm -rf "$out" && mkdir -p "$out"
# Match the game's grey background instead of pygbag's default, and open the archive with
# mode "r:*" so it also loads when a server sends .gz files with Content-Encoding: gzip (the
# browser then hands over the plain tar; Astro's dev/preview servers do this, GitHub Pages doesn't).
# can_close 1: otherwise pygbag asks "Are you sure you want to navigate away?" on every
# reload/restart/back navigation.
sed -e 's/body.style.background = "#7f7f7f"/body.style.background = "#c0c0c0"/' \
    -e 's/mode="r:gz"/mode="r:*"/' \
    -e 's/can_close : 0,/can_close : 1,/' \
  "$src/build/web/index.html" > "$out/index.html"
grep -q 'mode="r:\*"' "$out/index.html" && grep -q 'can_close : 1,' "$out/index.html" \
  || { echo "pygbag template changed: patch failed" >&2; exit 1; }
# (pygbag 0.9.3 loads the .tar.gz, not the .apk)
cp "$src/build/web/minesweeper.tar.gz" "$src/build/web/favicon.png" "$out/"
rm -rf "$src/build"
echo "Built $out"
