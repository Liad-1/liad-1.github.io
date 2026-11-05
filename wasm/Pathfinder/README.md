# Pathfinder (browser build)

Copy of https://github.com/Liad-1/Pathfinder (`src/`) at commit
`21787abf1e308d0487d3c20570842a5768c9c60f`, compiled to WebAssembly for the
website's "Launch" button.

Changes from the original:

1. `src/link.h` added as an empty stub: `node.cpp` includes it, but it's not in
   the repo (`link()` is already declared in `node.h`).
2. `main.cpp`: under `#ifdef __EMSCRIPTEN__`, the blocking render loop is replaced
   by `emscripten_set_main_loop` (a browser tab can't run an endless `while`).
   The browser frame also skips the unused per-node `Node temp` copy.
   Native builds keep the original loop.
3. `main.cpp`: in `drawLine` / `drawSquare` / `drawCircle`, `glColor3f` is called
   just before `glBegin` (and the reset to white just after `glEnd`) instead of
   inside them. Same result in real OpenGL, but Emscripten's legacy-GL emulation
   garbles the geometry otherwise.
4. `click_index` and `running` (`main.cpp`, `draw.h`) are `volatile`. The `events()`
   thread busy-waits on them; without `volatile`, the optimizer may read
   `click_index` only once, so clicks are never noticed.

Rebuild with `npm run build:wasm` (needs Emscripten: `brew install emscripten`).
Output goes to `public/demos/pathfinder/`.
