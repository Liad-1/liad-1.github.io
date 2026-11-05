/*
 * Minesweeper — a JavaScript port of https://github.com/Liad-1/Minesweeper
 * (Python + pygame, commit 865f999a38f21f1b5115ddbcd4dfb092d6914d7a).
 *
 * The rules, layout maths and sprite indices follow game.py, grid.py, cell.py,
 * globals.py, sprites.py, button.py, textbox.py and checkbox.py; names in
 * comments refer to them. Browser-only differences:
 *  - Settings are kept in localStorage and applied in place (the original wrote
 *    settings.json and closed the window). Only the settings that do something
 *    in a browser are shown; the network/sound ones are left out.
 *  - Typed settings are range-checked (out of range shows ERR) so a saved value
 *    can't leave the page unusable.
 *  - AUTO SOLVER is still a work in progress in the original (it makes the first
 *    move only); a caption says so while its board is shown.
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
    constructor(settings) {
      const S = (this.S = settings);
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
      this.solverBoard = false;
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

    // AUTO SOLVER: still a work in progress in the original — it makes a random
    // first move (the rest of solve() only printed to the console).
    solve() {
      const x = Math.floor(Math.random() * this.S.width);
      const y = Math.floor(Math.random() * this.S.height);
      this.reveal(x, y);
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
            this.solverBoard = true;
            this.solve();
          }
          break;

        case Screen.GAME: {
          const { LRB, TOP, CE, W, H } = this;
          if (this.grid.enabled && TOP < py && py < H - LRB && LRB < px && px < W - LRB) {
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
      this.solverBoard = false;
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
      let note = 'Auto solver: work in progress';
      ctx.font = this.font(this.FONT_SIZE);
      if (ctx.measureText(note).width > this.W - 2 * this.LRB) note = 'Solver: WIP';
      const y = (this.resetBtn.top + this.CE + this.TOP) / 2;
      this.text(note, this.W / 2, y, this.FONT_SIZE, BLACK, 'center', 'middle');
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
          if (this.solverBoard) this.drawSolverNote();
          break;
        case Screen.SETTINGS:
          this.drawPanel();
          this.text('SETTINGS', this.W / 2, this.TOP + this.S.scale * 10, this.PAUSE_FONT_SIZE, BLACK, 'center', 'middle');
          for (const box of this.textboxes) box.draw();
          for (const box of this.checkboxes) box.draw();
          break;
        case Screen.PAUSE:
          this.drawPanel();
          this.text('PAUSED', this.W / 2, this.H / 2, this.PAUSE_FONT_SIZE, BLACK, 'center', 'middle');
          break;
      }
    }

    frame(now) {
      this.draw();
      this.pauseHandler();
      this.tickTimer(now);
    }
  }

  // ---- main.py: event wiring and loop ----------------------------------------
  let game = null;

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
      game = new Game(loadSettings());
    }
    requestAnimationFrame(loop);
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
    game = new Game(loadSettings());
    requestAnimationFrame(loop);
  }).catch((err) => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BLACK;
    ctx.fillText('Could not load the game.', canvas.width / 2, canvas.height / 2);
    console.error(err);
  });
})();
