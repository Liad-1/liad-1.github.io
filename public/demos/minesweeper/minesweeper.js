/*
 * Minesweeper — a JavaScript port of https://github.com/Liad-1/Minesweeper
 * (Python + pygame, auto-solver branch, commit 80ffca9 "release 1").
 *
 * The rules, layout maths and sprite indices follow game.py, grid.py, cell.py,
 * solver.py, globals.py, sprites.py, button.py, textbox.py and checkbox.py;
 * names in comments refer to them. Browser-only differences:
 *  - Settings are kept in localStorage and applied in place (the original wrote
 *    settings.json and closed the window). Only the settings that do something
 *    in a browser are shown; the network/sound ones are left out.
 *  - Typed settings are range-checked (out of range shows ERR) so a saved value
 *    can't leave the page unusable.
 *  - AUTO SOLVER (solver.py) runs from the frame loop instead of a thread, with
 *    the same delays and pause behaviour. The moves it prints to the console
 *    are listed on the page through the `log` callback.
 */
(() => {
  'use strict';

  // ---- globals.py ----------------------------------------------------------
  const STORAGE_KEY = 'minesweeper-settings';
  const DEFAULTS = { width: 20, height: 15, 'mines%': 15, scale: 1.2, easy_start: true };
  const LIMITS = { width: [5, 40], height: [5, 30], 'mines%': [1, 90], scale: [0.5, 2] };

  const BLACK = '#000000', BLUE = 'rgb(173,216,230)', BG_COLOR = 'rgb(192,192,192)', WHITE = '#ffffff';

  // Indices into the SPRITES list of sprites.py: 20 sheet tiles with the WIN
  // and LOSE art inserted at 15 and 16 (22 entries; negatives count from the end).
  const CELL = -5, FLAG = -4, CLICKED_MINE = -3, NOMINE = -2, MINE = -1;
  const SMILE = 9, SHOCKED = 10, COOL = 11, DEAD = 12, GEAR = 13, HOURGLASS = 14;
  const WIN = 15, LOSE = 16;

  const Screen = { MAIN: 0, GAME: 1, SETTINGS: 2, PAUSE: 3 };

  function loadSettings() {
    const s = { ...DEFAULTS };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      for (const key of Object.keys(DEFAULTS)) {
        if (typeof saved[key] !== typeof DEFAULTS[key]) continue;
        if (LIMITS[key]) {
          const [lo, hi] = LIMITS[key];
          s[key] = Math.min(hi, Math.max(lo, saved[key]));
        } else {
          s[key] = saved[key];
        }
      }
    } catch { /* storage blocked or bad JSON: use defaults */ }
    return s;
  }

  function storeSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* not persisted */ }
  }

  // ---- assets ----------------------------------------------------------------
  const canvas = document.getElementById('canvas');
  const stage = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const FONT = 'MinesweeperFont';

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load ' + src));
      img.src = src;
    });
  }

  const assets = {};

  // ---- cell.py ---------------------------------------------------------------
  class Cell {
    constructor(g, x, y, value = 0, hidden = true) {
      this.g = g;
      this.xIndex = x;
      this.yIndex = y;
      this.adjFlags = 0;
      this._hidden = hidden;
      this._flagged = false;
      this.value = value;
    }
    get left() { return this.g.LRB + this.xIndex * this.g.CE; }
    get top() { return this.g.TOP + this.yIndex * this.g.CE; }
    get hidden() { return this._hidden; }
    set hidden(v) { if (!this._flagged) this._hidden = v; }
    get flagged() { return this._flagged; }
    set flagged(v) { if (this._hidden) this._flagged = v; }
    saturated() { return this.adjFlags === this.value; }
    collide(px, py) {
      const { CE } = this.g;
      return px >= this.left && px < this.left + CE && py >= this.top && py < this.top + CE;
    }
    draw() {
      if (this.hidden) this.g.sprite(this.flagged ? FLAG : CELL, this.left, this.top);
      else this.g.sprite(this.value, this.left, this.top);
    }
  }

  // ---- grid.py ---------------------------------------------------------------
  class Grid {
    constructor(g) {
      this.g = g;
      const { width, height } = g.S;
      this.clickedCell = null;
      this.enabled = false;
      this.trollMode = false;
      this.tiles = width * height;
      this.mines = Math.floor(this.tiles * g.S['mines%'] / 100);

      const temp = Array.from({ length: this.tiles }, (_, i) => (i < this.mines ? -1 : 0));
      for (let i = temp.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [temp[i], temp[j]] = [temp[j], temp[i]];
      }
      // Column-major like np.reshape(..., 'F').
      this.contents = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => new Cell(g, x, y, temp[x * height + y])));

      if (!g.S.easy_start) this.initCells();
    }

    get w() { return this.g.S.width; }
    get h() { return this.g.S.height; }
    inBounds(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }
    forEach(fn) { for (const row of this.contents) for (const cell of row) fn(cell); }

    troll() {
      this.forEach((cell) => { cell.value = Math.floor(Math.random() * 21); });
    }

    initCells() {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.assignValue(x, y);
    }

    easyStart(cx, cy) {
      if (!this.contents[cy][cx].flagged) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (this.inBounds(cx + dx, cy + dy) && this.contents[cy + dy][cx + dx].value === MINE) {
              const [nx, ny] = this.findClearSpot();
              if (nx === -1 && ny === -1) {
                this.trollMode = true;
                this.troll();
                return;
              }
              this.contents[ny][nx].value = MINE;
              this.contents[cy + dy][cx + dx].value = 0;
            }
          }
        }
      }
      this.initCells();
    }

    findClearSpot() {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (this.contents[y][x].value === 0) return [x, y];
      }
      return [-1, -1];
    }

    assignValue(x, y) {
      const cell = this.contents[y][x];
      if (cell.value === MINE) return;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (this.inBounds(x + dx, y + dy) && this.contents[y + dy][x + dx].value === MINE) cell.value += 1;
      }
    }

    // The reveal algorithm, as written in grid.py (a saturated cell also opens
    // its neighbours, which makes clicking a satisfied number act as a chord).
    revealNext(x, y, first = true) {
      const cell = this.contents[y][x];
      if (cell.flagged) return undefined;
      if (first) cell.hidden = false;
      if (cell.value === MINE) return this.revealAll(cell);
      if (cell.saturated() && (first || (cell.hidden && !cell.flagged))) {
        cell.hidden = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (this.inBounds(x + dx, y + dy)) {
            this.revealNext(x + dx, y + dy, false);
            this.contents[y + dy][x + dx].hidden = false;
          }
        }
      }
      return undefined;
    }

    revealAll(clicked) {
      clicked.value = CLICKED_MINE;
      this.forEach((cell) => {
        if (!cell.flagged) {
          cell.hidden = false;
        } else if (cell.value !== MINE) {
          cell.value = NOMINE;
          cell.flagged = false;
          cell.hidden = false;
        }
      });
      return [clicked.xIndex, clicked.yIndex];
    }

    addFlags(x, y) { this.adjustFlags(x, y, 1); }
    removeFlags(x, y) { this.adjustFlags(x, y, -1); }
    adjustFlags(x, y, d) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (this.inBounds(x + dx, y + dy)) this.contents[y + dy][x + dx].adjFlags += d;
      }
    }

    draw() { this.forEach((cell) => cell.draw()); }
  }

  // ---- AUTO SOLVER -------------------------------------------------------------
  // Pacing of the animated solver (ms), as Game.SOLVER_* in game.py: one certain
  // move, showing the probabilities before acting on them, and highlighting a
  // guess before clicking it.
  const SOLVER_STEP_MS = 150;
  const SOLVER_PROB_MS = 600;
  const SOLVER_GUESS_MS = 400;
  const SOLVER_NODE_LIMIT = 200000; // backtracking budget per frontier component
  const EPS = 1e-9;

  const LOG_FACT = [0];
  function logFact(n) {
    while (LOG_FACT.length <= n) LOG_FACT.push(LOG_FACT[LOG_FACT.length - 1] + Math.log(LOG_FACT.length));
    return LOG_FACT[n];
  }
  function logChoose(n, k) {
    return k < 0 || k > n ? -Infinity : logFact(n) - logFact(k) - logFact(n - k);
  }
  function convolve(a, b) {
    const r = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) if (a[i]) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
    return r;
  }
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const pct = (p) => (p > 0 && p < 0.005 ? '<1' : p < 1 && p > 0.995 ? '>99' : String(Math.round(p * 100)));

  /**
   * Decides the next moves using only what a player can see: which cells are
   * hidden or flagged, and the numbers on revealed cells. nextMoves() returns
   * { moves, probs, stage }, where each move is { type: 'reveal'|'flag', id, x, y,
   * reason, guess?, p? } and probs (when computed) maps cell id → mine probability.
   */
  class Solver {
    constructor(grid, easyStart) {
      this.grid = grid;
      this.easyStart = easyStart;
    }

    cellAt(id) { return this.grid.contents[Math.floor(id / this.grid.w)][id % this.grid.w]; }
    label(id) { return `(${(id % this.grid.w) + 1}, ${Math.floor(id / this.grid.w) + 1})`; }

    neighbours(id) {
      const { w, h } = this.grid;
      const x = id % w, y = Math.floor(id / w);
      const out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) out.push((y + dy) * w + x + dx);
      }
      return out;
    }

    move(type, id, reason, extra = {}) {
      return { type, id, x: id % this.grid.w, y: Math.floor(id / this.grid.w), reason, ...extra };
    }

    nextMoves() {
      const g = this.grid;
      const { w, h } = g;
      if (g.trollMode) return { moves: [], probs: null, stage: 'troll' };

      // 1. Opening move.
      if (!g.clickedCell) {
        const id = Math.floor(h / 2) * w + Math.floor(w / 2);
        if (this.easyStart) {
          return { moves: [this.move('reveal', id, 'opening move; easy start keeps the first click safe')], probs: null, stage: 'rule' };
        }
        const p = g.mines / g.tiles;
        return { moves: [this.move('reveal', id, `opening guess, ${pct(p)}% risk`, { guess: true, p })], probs: null, stage: 'guess' };
      }

      let flags = 0;
      const unknown = [];
      const isUnknown = new Uint8Array(w * h);
      for (let id = 0; id < w * h; id++) {
        const c = this.cellAt(id);
        if (c.flagged) flags++;
        else if (c.hidden) { unknown.push(id); isUnknown[id] = 1; }
      }
      const minesLeft = g.mines - flags;
      if (!unknown.length) return { moves: [], probs: null, stage: 'done' };

      // 2. Count rule.
      if (minesLeft <= 0) {
        return { moves: unknown.map((id) => this.move('reveal', id, 'every mine is already flagged')), probs: null, stage: 'rule' };
      }
      if (unknown.length === minesLeft) {
        const reason = unknown.length === 1
          ? 'the last hidden cell must be the last mine'
          : `the ${unknown.length} hidden cells left must all be mines`;
        return { moves: unknown.map((id) => this.move('flag', id, reason)), probs: null, stage: 'rule' };
      }

      // Constraints: each revealed number with hidden neighbours.
      const cons = [];
      for (let id = 0; id < w * h; id++) {
        const c = this.cellAt(id);
        if (c.hidden || c.value < 1 || c.value > 8) continue;
        const cells = [];
        let f = 0;
        for (const n of this.neighbours(id)) {
          if (this.cellAt(n).flagged) f++;
          else if (isUnknown[n]) cells.push(n);
        }
        if (cells.length) cons.push({ id, v: c.value, cells, set: new Set(cells), r: c.value - f, f });
      }

      const out = new Map();
      const add = (type, id, reason) => { if (!out.has(id)) out.set(id, this.move(type, id, reason)); };
      const done = (stage, probs = null) => ({ moves: [...out.values()], probs, stage });

      // 3. Single-number rule.
      for (const c of cons) {
        const at = this.label(c.id);
        if (c.r === 0) {
          for (const id of c.cells) add('reveal', id, `the ${c.v} at ${at} already has its ${c.v === 1 ? 'mine' : 'mines'}`);
        } else if (c.r === c.cells.length) {
          const reason = c.f === 0
            ? `the ${c.v} at ${at} has exactly ${plural(c.v, 'hidden neighbour')}`
            : `the ${c.v} at ${at} needs ${c.r} more and has ${plural(c.r, 'hidden neighbour')}`;
          for (const id of c.cells) add('flag', id, reason);
        }
      }
      if (out.size) return done('rule');

      // 4. Subset rule: a's hidden cells are all next to b too.
      for (const a of cons) {
        for (const b of cons) {
          if (a === b || a.cells.length >= b.cells.length) continue;
          if (Math.abs((a.id % w) - (b.id % w)) > 2 || Math.abs(Math.floor(a.id / w) - Math.floor(b.id / w)) > 2) continue;
          if (!a.cells.every((id) => b.set.has(id))) continue;
          const diff = b.cells.filter((id) => !a.set.has(id));
          const rd = b.r - a.r;
          const pair = `the ${b.v} at ${this.label(b.id)}`, other = `the ${a.v} at ${this.label(a.id)}`;
          if (rd === 0) {
            for (const id of diff) add('reveal', id, `${pair} gets all its remaining mines from the cells next to ${other}`);
          } else if (rd === diff.length) {
            for (const id of diff) add('flag', id, `${pair} needs ${plural(rd, 'more mine')} than ${other} can supply`);
          }
        }
      }
      if (out.size) return done('rule');

      // 5. Exact probabilities.
      const probs = this.probabilities(cons, unknown, minesLeft);
      for (const [id, p] of probs) {
        if (p <= EPS) add('reveal', id, '0% mine in every possible arrangement');
        else if (p >= 1 - EPS) add('flag', id, 'a mine in every possible arrangement');
      }
      if (out.size) return done('probability', probs);

      // 6. Guess the safest cell (ties: corners, then edges).
      const edgeScore = (id) => {
        const x = id % w, y = Math.floor(id / w);
        return (x === 0 || x === w - 1 ? 1 : 0) + (y === 0 || y === h - 1 ? 1 : 0);
      };
      let best = -1, bestP = Infinity;
      for (const [id, p] of probs) {
        if (p < bestP - EPS || (Math.abs(p - bestP) <= EPS && edgeScore(id) > edgeScore(best))) {
          best = id;
          bestP = p;
        }
      }
      return {
        moves: [this.move('reveal', best, `lowest risk, ${pct(bestP)}%`, { guess: true, p: bestP })],
        probs,
        stage: 'guess',
      };
    }

    probabilities(cons, unknown, minesLeft) {
      // Group frontier cells into components linked by shared numbers.
      const index = new Map();
      for (const c of cons) for (const id of c.cells) if (!index.has(id)) index.set(id, index.size);
      const parent = Array.from({ length: index.size }, (_, i) => i);
      const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      for (const c of cons) {
        const first = find(index.get(c.cells[0]));
        for (const id of c.cells) parent[find(index.get(id))] = first;
      }
      const comps = new Map();
      for (const [id, i] of index) {
        const root = find(i);
        if (!comps.has(root)) comps.set(root, { cells: [], cons: [] });
        comps.get(root).cells.push(id);
      }
      for (const c of cons) comps.get(find(index.get(c.cells[0]))).cons.push(c);

      const interior = unknown.filter((id) => !index.has(id));
      const N = interior.length;
      const probs = new Map();
      const fallback = () => {
        for (const c of cons) for (const id of c.cells) probs.set(id, Math.max(probs.get(id) || 0, c.r / c.cells.length));
        for (const id of interior) probs.set(id, Math.min(1, minesLeft / unknown.length));
        return probs;
      };

      const dists = [];
      for (const comp of comps.values()) {
        const d = this.enumerate(comp, minesLeft);
        if (!d) return fallback();
        dists.push(d);
      }

      const total = dists.reduce((acc, d) => convolve(acc, d.counts), [1]);
      const logW = (K) => logChoose(N, minesLeft - K);
      let maxLW = -Infinity;
      total.forEach((t, K) => { if (t > 0) maxLW = Math.max(maxLW, logW(K)); });
      if (maxLW === -Infinity) return fallback();
      const weight = (K) => { const lw = logW(K); return lw === -Infinity ? 0 : Math.exp(lw - maxLW); };

      let Z = 0, interiorMines = 0;
      total.forEach((t, K) => {
        const wK = t * weight(K);
        Z += wK;
        interiorMines += wK * (minesLeft - K);
      });
      if (!(Z > 0)) return fallback();

      dists.forEach((d, i) => {
        const rest = dists.reduce((acc, other, j) => (j === i ? acc : convolve(acc, other.counts)), [1]);
        const sums = new Float64Array(d.cells.length);
        d.cellMines.forEach((cm, k) => {
          if (!cm) return;
          let wk = 0;
          rest.forEach((r, K2) => { if (r) wk += r * weight(k + K2); });
          if (wk) for (let c = 0; c < cm.length; c++) sums[c] += cm[c] * wk;
        });
        d.cells.forEach((id, c) => probs.set(id, sums[c] / Z));
      });
      const pInterior = N ? interiorMines / Z / N : 0;
      for (const id of interior) probs.set(id, pInterior);
      return probs;
    }

    // Count the mine arrangements of one component that satisfy its numbers,
    // by number of mines k, and how often each cell is a mine. null = too big.
    enumerate(comp, minesLeft) {
      const { cells } = comp;
      const n = cells.length;
      const local = new Map(cells.map((id, i) => [id, i]));
      const cons = comp.cons.map((c) => ({ r: c.r, mines: 0, left: c.cells.length, vars: c.cells.map((id) => local.get(id)) }));
      const varCons = Array.from({ length: n }, () => []);
      for (const c of cons) for (const v of c.vars) varCons[v].push(c);

      const counts = new Array(n + 1).fill(0);
      const cellMines = new Array(n + 1).fill(null);
      const assign = new Uint8Array(n);
      let nodes = 0, mines = 0, aborted = false;

      const rec = (i) => {
        if (aborted || ++nodes > SOLVER_NODE_LIMIT) { aborted = true; return; }
        if (i === n) {
          counts[mines]++;
          const cm = cellMines[mines] || (cellMines[mines] = new Float64Array(n));
          for (let v = 0; v < n; v++) if (assign[v]) cm[v]++;
          return;
        }
        for (let val = 0; val <= 1; val++) {
          if (val && mines >= minesLeft) continue;
          let ok = true;
          for (const c of varCons[i]) {
            c.left--;
            c.mines += val;
            if (c.mines > c.r || c.mines + c.left < c.r) ok = false;
          }
          if (ok) {
            assign[i] = val;
            mines += val;
            rec(i + 1);
            mines -= val;
            assign[i] = 0;
          }
          for (const c of varCons[i]) {
            c.left++;
            c.mines -= val;
          }
        }
      };
      rec(0);
      return aborted ? null : { cells, counts, cellMines };
    }
  }

  // ---- button.py -------------------------------------------------------------
  class Button {
    constructor(g, x, y, text) {
      this.g = g;
      this.text = text;
      ctx.font = g.font(g.PAUSE_FONT_SIZE);
      this.w = Math.ceil(ctx.measureText(text).width);
      this.h = g.PAUSE_FONT_SIZE;
      this.cx = x;
      this.cy = y;
      this.left = Math.round(x - this.w / 2);
      this.top = Math.round(y - this.h / 2);
    }
    collide(px, py) {
      return px >= this.left && px < this.left + this.w && py >= this.top && py < this.top + this.h;
    }
    draw() {
      const { btn_back: back, btn_left: left, btn_right: right } = assets;
      const height = back.height;
      const half = Math.floor(this.w / 2);
      const top = this.cy - Math.floor(height / 2);
      for (let i = 0; i < this.w + 16; i += 8) ctx.drawImage(back, this.cx - half + i - 16, top);
      ctx.drawImage(left, this.cx - half - 24, top);
      ctx.drawImage(right, this.cx - half + this.w, top);
      this.g.text(this.text, this.cx, this.cy, this.g.PAUSE_FONT_SIZE, WHITE, 'center', 'middle');
    }
  }

  // ---- textbox.py / checkbox.py ---------------------------------------------
  const label = (name) => name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');

  class Textbox {
    constructor(g, name, top) {
      this.g = g;
      this.setting = name;
      this.name = label(name);
      this.active = false;
      this.text = String(g.S[name]);
      this.maxChars = this.text.length;
      this.left = g.LRB * 9;
      this.top = top;
      this.h = g.CE / 2;
      this.w = this.text.length * 25 * g.S.scale;
    }
    collide(px, py) {
      return px >= this.left && px < this.left + this.w && py >= this.top && py < this.top + this.h;
    }
    key(e) {
      if (!this.active) return;
      if (e.key === 'Backspace') {
        if (this.text.length > 0) this.text = '';
      } else if (e.key.length === 1 && this.maxChars >= this.text.length) {
        this.text += e.key;
      }
    }
    draw() {
      const size = Math.floor(this.g.CE / 2);
      ctx.fillStyle = this.active ? BLUE : BG_COLOR;
      ctx.fillRect(this.left, this.top, this.w, this.h);
      this.g.text(this.name, this.g.LRB, this.top, size, BLACK);
      this.g.text(this.text, this.left, this.top, size, WHITE);
    }
  }

  class Checkbox {
    constructor(g, name, top) {
      this.g = g;
      this.setting = name;
      this.name = label(name);
      this.active = g.S[name];
      this.left = g.LRB;
      this.top = top;
      this.size = 12 * g.S.scale;
    }
    collide(px, py) {
      return px >= this.left && px < this.left + this.size && py >= this.top && py < this.top + this.size;
    }
    draw() {
      const { LRB, S } = this.g;
      this.g.text(this.name, LRB + this.left * 1.5, this.top, Math.floor(this.g.CE / 2), BLACK);
      ctx.fillStyle = WHITE;
      ctx.fillRect(this.left, this.top, this.size, this.size);
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 1;
      ctx.strokeRect(this.left + 0.5, this.top + 0.5, this.size - 1, this.size - 1);
      if (this.active) {
        ctx.fillStyle = BLACK;
        ctx.beginPath();
        ctx.arc(this.left + this.size / 2, this.top + this.size / 2, 4 * S.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---- game.py -----------------------------------------------------------------
  class Game {
    constructor(settings, log = { clear() {}, add() {} }) {
      const S = (this.S = settings);
      this.log = log;
      this.CE = 34 * S.scale;
      this.TOP = 100 * S.scale;
      this.LRB = 16 * S.scale;
      this.FONT_SIZE = Math.floor(16 * S.scale);
      this.PAUSE_FONT_SIZE = Math.floor(40 * S.scale);
      this.W = Math.floor(this.CE * S.width + this.LRB * 2);
      this.H = Math.floor(this.CE * S.height + this.LRB + this.TOP);
      this.resize();

      this.running = true;
      this.elapsedTime = 0;
      this.lastTick = performance.now();
      this.flaggedCells = 0;
      this.displayedScreen = Screen.MAIN;
      this.timerSet = true; // timerEvent
      this.face = SMILE; // the module-level RESET in game.py
      this.solverBoard = false; // the board belongs to an AUTO SOLVER run
      this.solver = null; // set while the solver is playing
      this.solverQueue = [];
      this.solverWaitUntil = 0;
      this.solverStatus = '';
      this.solverMoves = 0;
      this.solverGuesses = 0;
      this.lastGuess = null;
      this.probs = null; // cell id -> mine probability, drawn on hidden cells
      this.highlight = -1; // cell id of the guess about to be clicked
      this.lastFrame = 0;
      this.pauseIsPressed = false;
      this.pauseWasPressed = false;
      this.settingButtonPressed = false;
      this.escHeld = false;

      const midX = Math.floor(this.W / 2);
      this.startButton = new Button(this, midX, this.TOP * 2, 'START');
      this.botButton = new Button(this, midX, this.TOP * 2 + 127, 'AUTO SOLVER');
      this.quitButton = new Button(this, midX, this.TOP * 2 + 255, 'QUIT');
      this.settingsBtn = new Cell(this, S.width - 0.75, -2.75, GEAR, false);
      this.resetBtn = new Cell(this, S.width / 2 - 0.5, -2, SMILE, false);

      this.textboxes = [];
      this.checkboxes = [];
      Object.keys(DEFAULTS).forEach((name, i) => {
        const top = this.TOP * 1.3 + (this.CE / 2 + 20) * i;
        if (typeof S[name] === 'boolean') this.checkboxes.push(new Checkbox(this, name, top));
        else this.textboxes.push(new Textbox(this, name, top));
      });

      this.grid = new Grid(this);
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(this.W * dpr);
      canvas.height = Math.round(this.H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      stage.style.setProperty('--ar', `${this.W} / ${this.H}`);
      stage.style.setProperty('--ratio', String(this.W / this.H));
      stage.style.setProperty('--w', `${this.W}px`);
    }

    // drawing helpers
    font(size) { return `${size}px ${FONT}`; }
    sprite(i, x, y) {
      const idx = i < 0 ? 22 + i : i;
      if (idx === WIN || idx === LOSE) {
        // Only reachable in troll mode; like pygame, blit the unscaled 300×222 art.
        ctx.drawImage(assets.sheet, idx === WIN ? 1 : 301, 35, 300, 222, x, y, 300, 222);
        return;
      }
      const tile = idx > LOSE ? idx - 2 : idx;
      ctx.drawImage(assets.sheet, tile * 34 + 1, 1, 34, 34, x, y, this.CE, this.CE);
    }
    text(str, x, y, size, color, align = 'left', baseline = 'top') {
      ctx.font = this.font(size);
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(str, x, y);
    }

    tickTimer(now) {
      if (this.grid.enabled && this.grid.clickedCell && this.timerSet) {
        if (now - this.lastTick >= 1000) {
          this.elapsedTime += 1;
          this.lastTick = now;
        }
      } else {
        this.lastTick = now;
      }
    }

    saveSettings() {
      let error = false;
      let changed = false;
      for (const box of this.textboxes) {
        const current = this.S[box.setting];
        if (box.text !== '') {
          const isInt = Number.isInteger(DEFAULTS[box.setting]);
          const ok = isInt ? /^\s*[-+]?\d+\s*$/.test(box.text) : /^\s*[-+]?(\d+\.?\d*|\.\d+)\s*$/.test(box.text);
          const value = Number(box.text);
          const [lo, hi] = LIMITS[box.setting];
          if (!ok || value < lo || value > hi) {
            box.text = 'ERR';
            error = true;
          } else if (value !== current) {
            this.S[box.setting] = value;
            changed = true;
          }
        } else {
          box.text = String(current);
        }
      }
      for (const box of this.checkboxes) {
        if (box.active !== this.S[box.setting]) {
          this.S[box.setting] = box.active;
          changed = true;
        }
      }
      if (error) return;
      if (changed) {
        storeSettings(this.S);
        this.running = false; // restart with the new settings
      }
    }

    reveal(x, y) {
      if (!this.grid.clickedCell && this.S.easy_start) this.grid.easyStart(x, y);
      this.grid.clickedCell = this.grid.contents[y][x];
      const mineLoc = this.grid.revealNext(x, y);
      if (mineLoc) {
        this.face = DEAD;
        this.resetBtn.value = DEAD;
        this.grid.enabled = false;
      }
      return mineLoc;
    }

    flag(x, y) {
      const cell = this.grid.contents[y][x];
      if (cell.hidden) {
        if (cell.flagged) {
          cell.flagged = false;
          this.flaggedCells -= 1;
          this.grid.removeFlags(x, y);
        } else {
          cell.flagged = true;
          this.flaggedCells += 1;
          this.grid.addFlags(x, y);
        }
      }
      if (this.flaggedCells === this.grid.mines) this.endgameHandler();
    }

    // AUTO SOLVER (solve() in game.py). Moves are played from frame() so each
    // one can be watched; see SOLVER_*_MS for the pacing.
    solve() {
      this.solver = new Solver(this.grid, this.S.easy_start);
      this.solverQueue = [];
      this.solverWaitUntil = 0;
      this.solverMoves = 0;
      this.solverGuesses = 0;
      this.lastGuess = null;
      this.probs = null;
      this.highlight = -1;
      this.solverStatus = 'Solver: starting';
      this.log.clear();
    }

    stopSolver(summary, status) {
      this.solver = null;
      this.solverQueue = [];
      this.probs = null;
      this.highlight = -1;
      this.solverStatus = status;
      if (summary) this.log.add(summary, 'summary');
    }

    solverEnded() {
      if (this.resetBtn.value === COOL) {
        const guesses = `${this.solverGuesses} ${this.solverGuesses === 1 ? 'guess' : 'guesses'}`;
        this.stopSolver(`Won in ${plural(this.solverMoves, 'move')} (${guesses})`, 'Solver: won');
        return true;
      }
      if (this.resetBtn.value === DEAD) {
        const g = this.lastGuess;
        this.stopSolver(g ? `Lost on guess #${this.solverGuesses} (${pct(g.p)}% risk)` : 'Lost', 'Solver: lost on a guess');
        return true;
      }
      if (this.grid.trollMode) {
        this.stopSolver('Gave up: troll mode (too many mines for a safe start)', 'Solver gives up: troll mode');
        return true;
      }
      return false;
    }

    // The solve() loop of game.py as a state machine; called every frame while
    // the solver may play. Each wait(...) there sets solverWaitUntil here.
    solverTick(now) {
      while (this.solver && now >= this.solverWaitUntil) {
        if (!this.solverQueue.length) {
          // End of a batch: the probabilities stayed up through its last step.
          this.probs = null;
          if (this.solverEnded()) return;
          const result = this.solver.nextMoves();
          if (!result.moves.length) {
            this.stopSolver('Stopped: no moves left', 'Solver: stopped');
            return;
          }
          this.solverQueue = result.moves;
          this.probs = result.probs;
          if (result.probs) {
            // Show the probabilities before acting on them.
            this.solverStatus = 'Solver: reading the odds';
            this.solverWaitUntil = now + SOLVER_PROB_MS;
            continue;
          }
        }

        const move = this.solverQueue[0];
        if (move.guess && this.highlight !== move.id) {
          this.highlight = move.id;
          this.solverStatus = `Solver: guessing (${pct(move.p)}% risk)`;
          this.solverWaitUntil = now + SOLVER_GUESS_MS;
          continue;
        }
        this.solverQueue.shift();
        this.highlight = -1;

        const cell = this.grid.contents[move.y][move.x];
        if (!cell.hidden || cell.flagged) continue; // already opened by an earlier move
        this.solverMoves += 1;
        const where = `(${move.x + 1}, ${move.y + 1})`;
        if (move.guess) {
          this.solverGuesses += 1;
          this.lastGuess = move;
          this.log.add(`#${this.solverMoves} Guess ${where} — ${move.reason}`, 'guess');
        } else {
          this.solverStatus = 'Solver: certain move';
          this.log.add(`#${this.solverMoves} ${move.type === 'flag' ? 'Flag' : 'Reveal'} ${where} — ${move.reason}`, move.type);
        }
        if (move.type === 'flag') this.flag(move.x, move.y);
        else this.reveal(move.x, move.y);
        if (this.solverEnded()) return;
        this.solverWaitUntil = now + SOLVER_STEP_MS;
      }
    }

    endgameHandler() {
      let mineLeft = false;
      this.grid.forEach((cell) => { if (cell.value === MINE && !cell.flagged) mineLeft = true; });
      if (mineLeft) return;
      this.face = COOL;
      this.resetBtn.value = COOL;
      this.grid.enabled = false;
      this.grid.forEach((cell) => { if (cell.value !== MINE) cell.hidden = false; });
    }

    // find_affected_cell
    mouseDown(px, py, button) {
      switch (this.displayedScreen) {
        case Screen.MAIN:
          if (this.startButton.collide(px, py)) {
            this.displayedScreen = Screen.GAME;
            this.grid.enabled = true;
          } else if (this.quitButton.collide(px, py)) {
            this.running = false;
            this.quit = true;
          } else if (this.botButton.collide(px, py)) {
            this.displayedScreen = Screen.GAME;
            this.grid.enabled = true; // so the timer runs and Esc pauses the solver
            this.solverBoard = true;
            this.solve();
          }
          break;

        case Screen.GAME: {
          const { LRB, TOP, CE, W, H } = this;
          if (this.grid.enabled && TOP < py && py < H - LRB && LRB < px && px < W - LRB) {
            if (this.solver) break; // the board is the solver's while it plays
            const x = Math.floor((px - LRB) / CE);
            const y = Math.floor((py - TOP) / CE);
            if (!this.grid.inBounds(x, y)) break;
            if (button === 1) this.reveal(x, y);
            else if (button === 3) this.flag(x, y);
          } else if (this.settingsBtn.collide(px, py)) {
            this.gearClicked();
          } else if (this.resetBtn.collide(px, py)) {
            if (this.grid.trollMode) {
              this.S['mines%'] = 15;
              storeSettings(this.S);
              this.running = false;
            } else {
              this.reset();
            }
          }
          break;
        }

        case Screen.SETTINGS:
          for (const box of this.textboxes) {
            if (box.collide(px, py)) {
              box.active = true;
              box.text = '';
            } else {
              box.active = false;
            }
          }
          for (const box of this.checkboxes) {
            if (box.collide(px, py)) box.active = !box.active;
          }
          if (this.settingsBtn.collide(px, py)) this.gearClicked();
          break;
      }
    }

    gearClicked() {
      if (this.grid.trollMode) {
        this.grid.troll();
        this.grid.forEach((cell) => { cell.hidden = false; });
      } else {
        this.settingButtonPressed = true;
      }
    }

    // highlight_cell
    mouseMove(px, py) {
      if (!this.timerSet) return;
      this.face = this.resetBtn.collide(px, py) ? SHOCKED : this.resetBtn.value;
    }

    keyDown(e) {
      if (e.key === 'Escape') this.escHeld = true;
      if (this.displayedScreen === Screen.SETTINGS) for (const box of this.textboxes) box.key(e);
    }

    keyUp(e) {
      if (e.key === 'Escape') this.escHeld = false;
    }

    // pause_handler (runs once per frame, like the pygame loop)
    pauseHandler() {
      if (this.face === SMILE && this.displayedScreen !== Screen.MAIN) {
        if (this.escHeld || this.settingButtonPressed) {
          if (this.pauseIsPressed) this.pauseWasPressed = true;
          this.pauseIsPressed = true;
        } else {
          this.pauseWasPressed = false;
          this.pauseIsPressed = false;
        }

        if (this.pauseIsPressed && !this.pauseWasPressed) {
          this.grid.enabled = !this.grid.enabled;
          if (this.displayedScreen === Screen.GAME) {
            this.displayedScreen = this.settingButtonPressed ? Screen.SETTINGS : Screen.PAUSE;
          }
          if (this.timerSet) {
            this.timerSet = false;
          } else if (this.escHeld && this.displayedScreen === Screen.PAUSE) {
            this.timerSet = true;
            this.displayedScreen = Screen.GAME;
          } else if (this.settingButtonPressed && this.displayedScreen === Screen.SETTINGS) {
            this.timerSet = true;
            this.displayedScreen = Screen.GAME;
            this.saveSettings();
          }
        }
      }
      this.settingButtonPressed = false;
    }

    reset() {
      this.resetBtn.value = SMILE;
      this.elapsedTime = 0;
      this.flaggedCells = 0;
      if (this.solverBoard) this.log.clear();
      this.solverBoard = false;
      this.stopSolver(null, '');
      this.grid = new Grid(this);
      this.grid.enabled = true;
    }

    // draw_* -----------------------------------------------------------------
    drawPanel() {
      const { LRB, CE } = this;
      this.sprite(MINE, LRB, LRB);
      this.text(String(this.grid.mines - this.flaggedCells), LRB + CE * 1.6, LRB + CE / 1.75,
        this.FONT_SIZE, BLACK, 'center', 'middle');
      this.sprite(HOURGLASS, LRB, LRB + CE);
      this.text(String(this.elapsedTime), LRB + CE * 1.6, LRB + CE * 1.6, this.FONT_SIZE, BLACK, 'center', 'middle');
      this.sprite(this.face, this.resetBtn.left, this.resetBtn.top);
      this.settingsBtn.draw();
    }

    drawSolverNote() {
      let note = this.solverStatus;
      if (!note) return;
      ctx.font = this.font(this.FONT_SIZE);
      if (ctx.measureText(note).width > this.W - 2 * this.LRB) {
        note = note.replace('Solver gives up: ', '').replace('Solver: ', '').replace(/ \((.*) risk\)/, ' $1');
      }
      this.text(note, this.W / 2, this.statusY(), this.FONT_SIZE, BLACK, 'center', 'middle');
    }

    // Vertical centre of the strip between the smiley and the grid (status_y).
    statusY() {
      return (this.resetBtn.top + this.CE + this.TOP) / 2;
    }

    // Mine probabilities on the hidden cells, and a frame around the next guess
    // (draw_solver_overlay without the status line).
    drawProbabilities() {
      const { CE } = this;
      if (this.probs) {
        const o = Math.max(1, Math.floor(this.S.scale * 1.5));
        const offsets = [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, o], [-o, o], [o, -o]];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const [id, p] of this.probs) {
          const cell = this.grid.contents[Math.floor(id / this.S.width)][id % this.S.width];
          if (!cell.hidden || cell.flagged) continue;
          const cx = cell.left + CE / 2, cy = cell.top + CE / 2;
          const label = pct(p);
          // Colour from the shown label, like prob_label().
          const lp = label === '<1' ? 0 : label === '>99' ? 1 : Number(label) / 100;
          ctx.font = this.font(Math.floor(CE * (label.length <= 2 ? 0.42 : 0.34)));
          ctx.fillStyle = BLACK;
          for (const [dx, dy] of offsets) ctx.fillText(label, cx + dx, cy + dy);
          ctx.fillStyle = `hsl(${120 * (1 - lp)}, 95%, 55%)`;
          ctx.fillText(label, cx, cy);
        }
      }
      if (this.highlight >= 0) {
        const cell = this.grid.contents[Math.floor(this.highlight / this.S.width)][this.highlight % this.S.width];
        const lw = Math.max(2, Math.floor(CE / 12));
        // pygame.draw.rect borders lie inside the rect.
        const b = lw + 2;
        ctx.lineWidth = b;
        ctx.strokeStyle = BLACK;
        ctx.strokeRect(cell.left + b / 2, cell.top + b / 2, CE - b, CE - b);
        ctx.lineWidth = lw;
        ctx.strokeStyle = 'rgb(255,212,0)';
        ctx.strokeRect(cell.left + 1 + lw / 2, cell.top + 1 + lw / 2, CE - 2 - lw, CE - 2 - lw);
      }
    }

    draw() {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, this.W, this.H);
      switch (this.displayedScreen) {
        case Screen.MAIN:
          this.startButton.draw();
          this.botButton.draw();
          this.quitButton.draw();
          break;
        case Screen.GAME:
          this.drawPanel();
          this.grid.draw();
          if (this.solverBoard) {
            this.drawProbabilities();
            this.drawSolverNote();
          }
          break;
        case Screen.SETTINGS:
          this.drawPanel();
          this.text('SETTINGS', this.W / 2, this.TOP + this.S.scale * 10, this.PAUSE_FONT_SIZE, BLACK, 'center', 'middle');
          for (const box of this.textboxes) box.draw();
          for (const box of this.checkboxes) box.draw();
          break;
        case Screen.PAUSE:
          // The board stays on screen, frozen; PAUSED goes in the strip between
          // the smiley and the grid (where the solver's status goes).
          this.drawPanel();
          this.grid.draw();
          if (this.solverBoard) this.drawProbabilities();
          this.text('PAUSED', this.W / 2, this.statusY(), Math.floor(this.CE * 0.75), BLACK, 'center', 'middle');
          break;
      }
    }

    frame(now) {
      this.draw();
      this.pauseHandler();
      this.tickTimer(now);
      if (this.solver) {
        if (this.displayedScreen === Screen.GAME && this.grid.enabled) this.solverTick(now);
        else if (this.lastFrame) this.solverWaitUntil += now - this.lastFrame; // paused: hold the schedule
      }
      this.lastFrame = now;
    }
  }

  // ---- main.py: event wiring and loop ----------------------------------------
  let game = null;

  // The page's "Solver moves" panel (optional: the game runs without it).
  const solverLog = (() => {
    const panel = document.getElementById('solver-panel');
    const list = document.getElementById('solver-log');
    if (!panel || !list) return { clear() {}, add() {} };
    return {
      clear() {
        list.replaceChildren();
        panel.hidden = true;
      },
      add(text, kind) {
        const li = document.createElement('li');
        li.textContent = text;
        li.className = kind;
        list.prepend(li);
        panel.hidden = false;
      },
    };
  })();

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * game.W / r.width, (e.clientY - r.top) * game.H / r.height];
  }

  canvas.addEventListener('mousedown', (e) => {
    if (!game) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    const [x, y] = toGame(e);
    if (e.button === 0) game.mouseDown(x, y, 1);
    else if (e.button === 2) game.mouseDown(x, y, 3);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (game) game.mouseMove(...toGame(e));
  });
  window.addEventListener('keydown', (e) => {
    if (!game) return;
    if (game.displayedScreen === Screen.SETTINGS && game.textboxes.some((b) => b.active)) e.preventDefault();
    game.keyDown(e);
  });
  window.addEventListener('keyup', (e) => { if (game) game.keyUp(e); });
  window.addEventListener('blur', () => { if (game) game.escHeld = false; });

  function loop(now) {
    game.frame(now);
    if (!game.running) {
      if (game.quit) {
        location.href = '../../projects/';
        return;
      }
      solverLog.clear();
      game = new Game(loadSettings(), solverLog);
    }
    requestAnimationFrame(loop);
  }

  // For the automated solver benchmark only (…/index.html?test).
  if (new URLSearchParams(location.search).has('test')) {
    window.minesweeperTest = { Game, Grid, Solver, loadSettings, MINE, COOL, DEAD, getGame: () => game };
  }

  // Loading screen, then start.
  canvas.width = 854;
  canvas.height = 751;
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = BLACK;
  ctx.font = '24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loading…', canvas.width / 2, canvas.height / 2);

  const font = new FontFace(FONT, 'url(assets/Font.ttf)');
  Promise.all([
    font.load().then((f) => document.fonts.add(f)),
    loadImage('assets/spritesheet.png').then((i) => { assets.sheet = i; }),
    loadImage('assets/btn_left.png').then((i) => { assets.btn_left = i; }),
    loadImage('assets/btn_right.png').then((i) => { assets.btn_right = i; }),
    loadImage('assets/btn_back.png').then((i) => { assets.btn_back = i; }),
  ]).then(() => {
    game = new Game(loadSettings(), solverLog);
    requestAnimationFrame(loop);
  }).catch((err) => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BLACK;
    ctx.fillText('Could not load the game.', canvas.width / 2, canvas.height / 2);
    console.error(err);
  });
})();
