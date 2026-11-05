#!/usr/bin/env bash
# Compile the C/C++ projects in wasm/ to WebAssembly for the in-browser demos.
# Needs Emscripten (brew install emscripten).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
demos="$root/public/demos"
common=(-O2 -pthread -sPTHREAD_POOL_SIZE=1 -sUSE_GLFW=3 -sLEGACY_GL_EMULATION -sGL_UNSAFE_OPTS=0)

# quicksort-graphics-C
mkdir -p "$demos/quicksort"
src="$root/wasm/quicksort-graphics-C"
emcc "$src/main.c" "$src/quicksort.c" "${common[@]}" \
  -o "$demos/quicksort/quicksort.js"
echo "Built $demos/quicksort/quicksort.js"

# Pathfinder (recursion depth up to 1296 → bigger thread stack; ~1300 Nodes with std::stack → more memory)
mkdir -p "$demos/pathfinder"
src="$root/wasm/Pathfinder/src"
em++ "$src"/*.cpp "${common[@]}" \
  -sINITIAL_MEMORY=64MB -sDEFAULT_PTHREAD_STACK_SIZE=4MB \
  -o "$demos/pathfinder/pathfinder.js"
echo "Built $demos/pathfinder/pathfinder.js"
