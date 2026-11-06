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
5. Faster maze generation: `rdfSearch()` sleeps `MAZE_DELAY` (2 ms, `draw.h`)
   per step instead of `DELAY` (10 ms). The solvers still use `DELAY`.
6. Solution line: when A* / Dijkstra reach the goal, every node on the path
   gets `on_path = true`, and `Node::draw` draws a green line from it to its
   `path_prev` (`drawThickLine` in `main.cpp`, a quad because WebGL ignores
   `glLineWidth`). `hardReset` / `softReset` clear the flag.
7. Exploration lines: while A* / Dijkstra search, `Node::draw` draws a white
   line between two explored nodes that are linked (no wall between them).

Rebuild with `npm run build:wasm` (needs Emscripten: `brew install emscripten`).
Output goes to `public/demos/pathfinder/`.
