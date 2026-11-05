# quicksort-graphics-C (browser build)

Copy of https://github.com/Liad-1/quicksort-graphics-C at commit
`2978b417ab2f138148b9c8ccdda92c2b2021a4db`, compiled to WebAssembly for the
website's "Launch" button.

Two small changes in `main.c`:

1. Under `#ifdef __EMSCRIPTEN__`, the blocking render loop is replaced by
   `emscripten_set_main_loop` (a browser tab can't run an endless `while`).
2. In `drawRectangle`, `glColor3f` is called just before `glBegin` instead of
   inside it. Same result in real OpenGL, but Emscripten's legacy-GL emulation
   garbles the geometry otherwise.

Rebuild with `npm run build:wasm` (needs Emscripten: `brew install emscripten`).
Output goes to `public/demos/quicksort/`.
