#!/usr/bin/env bash
# Compile quicksort-graphics-C to WebAssembly for the in-browser demo.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/wasm/quicksort-graphics-C"
out="$root/public/demos/quicksort"
mkdir -p "$out"
emcc "$src/main.c" "$src/quicksort.c" \
  -O2 -pthread -sPTHREAD_POOL_SIZE=1 \
  -sUSE_GLFW=3 -sLEGACY_GL_EMULATION -sGL_UNSAFE_OPTS=0 \
  -o "$out/quicksort.js"
echo "Built $out/quicksort.js"
