# Minesweeper (browser build)

Copy of https://github.com/Liad-1/Minesweeper at commit
`865f999a38f21f1b5115ddbcd4dfb092d6914d7a`, packaged with
[pygbag](https://pygame-web.github.io) (CPython + pygame-ce compiled to
WebAssembly) for the website's "Launch" button. Only the files the game loads
are copied (no sounds, `message.py`, `run_clients.sh` or `__pycache__`).

Changes from the original (a browser page has one thread, no sockets and no
terminal, and its loop must yield to the browser every frame):

1. `main.py` / `game.py`: `Game.run()` is `async` and does
   `await asyncio.sleep(0)` once per frame. When the loop ends, the page reloads
   if settings were saved (the original closed the window so you'd relaunch),
   otherwise QUIT goes back to the projects page.
2. `game.py`: the timer thread is replaced by `tick_timer()`, called every frame,
   and `timerEvent` by a plain `TimerFlag` with the same `set/clear/is_set`.
   The AUTO SOLVER (which only prints) runs directly instead of in a thread,
   with its errors caught as a dying thread would have.
3. `client.py`: the server connection and `input()` command threads are gone;
   `set_settings()` stores the settings in `localStorage`, and `globals.py`
   reads them back on startup.
4. `grid.py`: numpy (only used as a 2D container) is replaced by a list of rows
   with a `.shape`, and `game.py`'s unused `import numpy` is dropped, so the
   page doesn't have to download numpy.

The game logic and drawing are otherwise unchanged.

Rebuild with `npm run build:python` (needs Python 3.10+; pygbag is installed
into `.cache/pyvenv/` on first run). Output goes to
`public/demos/minesweeper/game/`, which `public/demos/minesweeper/index.html`
embeds. The Python runtime itself loads from pygbag's CDN at play time, so
`public/demos/coi-serviceworker.js` and the dev server skip cross-origin
isolation for `/demos/minesweeper/`.
