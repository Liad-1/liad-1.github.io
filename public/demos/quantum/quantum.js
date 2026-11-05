/*
 * Quantum Demo — a JavaScript port of https://github.com/Liad-1/QuantumDemo
 * (Python + NumPy + matplotlib, commit 9c52820).
 *
 * main.py starts |0> on the Bloch sphere and animates the gates H, Z, H on it.
 * The maths follows qubits.py (state vector -> Bloch vector, measurement),
 * gates.py (2x2 unitary -> 3x3 Bloch rotation) and animation.py (slerp between
 * steps, Play / Measure / Speed). The matplotlib figure (600 x 550 px at 100 dpi)
 * is redrawn on a canvas: a 3D axes viewed from elev 30, azim -60 that can be
 * rotated by dragging, like matplotlib's. Measurement results, which the
 * original prints to the console, are listed on the page via `log`.
 */
(() => {
  'use strict';

  // ---- complex 2x2 helpers ---------------------------------------------------
  const C = (re, im = 0) => ({ re, im });
  const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
  const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const conj = (a) => C(a.re, -a.im);
  const matmul = (A, B) => [0, 1].map((i) => [0, 1].map((j) => cadd(cmul(A[i][0], B[0][j]), cmul(A[i][1], B[1][j]))));
  const dagger = (A) => [[conj(A[0][0]), conj(A[1][0])], [conj(A[0][1]), conj(A[1][1])]];

  // ---- gates.py ----------------------------------------------------------------
  const SIGMA = [
    [[C(0), C(1)], [C(1), C(0)]],
    [[C(0), C(0, -1)], [C(0, 1), C(0)]],
    [[C(1), C(0)], [C(0), C(-1)]],
  ];

  // R_jk = 1/2 Tr(sigma_j U sigma_k U^dagger)
  function unitaryToBlochRotation(U) {
    const Ud = dagger(U);
    return [0, 1, 2].map((j) => [0, 1, 2].map((k) => {
      const m = matmul(matmul(matmul(SIGMA[j], U), SIGMA[k]), Ud);
      return 0.5 * (m[0][0].re + m[1][1].re);
    }));
  }
  const s2 = 1 / Math.sqrt(2);
  const hadamardGate = () => unitaryToBlochRotation([[C(s2), C(s2)], [C(s2), C(-s2)]]);
  const phaseGate = () => unitaryToBlochRotation([[C(1), C(0)], [C(0), C(0, 1)]]);
  const pauliZGate = () => unitaryToBlochRotation([[C(1), C(0)], [C(0), C(-1)]]);

  // ---- qubits.py ---------------------------------------------------------------
  const round5 = (x) => Math.round(x * 1e5) / 1e5 + 0; // + 0 turns -0 into 0
  function getBlochVector([alpha, beta]) {
    const a = typeof alpha === 'number' ? C(alpha) : alpha;
    const b = typeof beta === 'number' ? C(beta) : beta;
    const theta = 2 * Math.atan2(Math.hypot(b.re, b.im), Math.hypot(a.re, a.im));
    const phi = Math.atan2(b.im, b.re) - Math.atan2(a.im, a.re);
    return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)].map(round5);
  }

  function measureQubit(v, log) {
    const vz = Math.max(-1, Math.min(1, v[2]));
    const p0 = (1 + vz) / 2;
    const p1 = (1 - vz) / 2;
    const outcome = Math.random() * (p0 + p1) < p0 ? [0, 0, 1] : [0, 0, -1];
    const bit = outcome[2] === 1 ? 0 : 1;
    console.log(`\n--- MEASUREMENT ---\nProbabilities: P(0) = ${p0.toFixed(4)}, P(1) = ${p1.toFixed(4)}\nCollapsed to: ${bit}`);
    log(p0, p1, bit);
    return outcome;
  }

  const bloch0 = () => getBlochVector([1, 0]);

  // ---- vector helpers ----------------------------------------------------------
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => Math.sqrt(dot(a, a));
  const scale = (a, s) => a.map((x) => x * s);
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const apply = (M, v) => M.map((row) => dot(row, v));

  // ---- animation.py: slerp_with_matrix -----------------------------------------
  function slerpWithMatrix(v0, v1, t, M) {
    const a = scale(v0, 1 / (norm(v0) + 1e-9));
    const b = scale(v1, 1 / (norm(v1) + 1e-9));
    const d = Math.max(-1, Math.min(1, dot(a, b)));
    if (d > 0.9995) {
      const v = add(scale(a, 1 - t), scale(b, t));
      return scale(v, 1 / norm(v));
    }
    if (d > -0.9995) {
      const theta = Math.acos(d) * t;
      let ortho = sub(b, scale(a, d));
      ortho = scale(ortho, 1 / norm(ortho));
      return add(scale(a, Math.cos(theta)), scale(ortho, Math.sin(theta)));
    }
    // 180-degree turn: take the rotation axis from the matrix.
    const MI = M.map((row, i) => row.map((x, j) => x + (i === j ? 1 : 0)));
    const cols = [0, 1, 2].map((j) => [MI[0][j], MI[1][j], MI[2][j]]);
    const norms = cols.map(norm);
    let best = 0;
    for (let j = 1; j < 3; j++) if (norms[j] > norms[best]) best = j;
    let axis;
    if (norms[best] > 1e-5) {
      axis = scale(cols[best], 1 / norms[best]);
    } else {
      let temp = [1, 0, 0];
      if (Math.abs(dot(a, temp)) > 0.99) temp = [0, 1, 0];
      axis = sub(temp, scale(a, dot(a, temp)));
      axis = scale(axis, 1 / norm(axis));
    }
    return add(scale(a, Math.cos(t * Math.PI)), scale(cross(axis, a), Math.sin(t * Math.PI)));
  }

  // ---- figure layout (matplotlib units: figure fractions, 100 dpi) -------------
  const W = 600, H = 550; // figsize (6, 5.5)
  const PT = 100 / 72; // px per point
  const FONT = 'DejaVu Sans, Verdana, system-ui, sans-serif';
  const LIM = 1.2;
  const COLORS = ['#0000ff', '#008000', '#bf00bf', '#00bfbf', 'orange', 'purple', 'brown'];

  // fig.add_axes rect [left, bottom, width, height] -> canvas pixel box
  const box = ([l, b, w, h]) => ({ x: l * W, y: H - (b + h) * H, w: w * W, h: h * H });
  const contains = (r, px, py) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

  function animateTransformation(canvas, vInitials, matrices, log) {
    const ctx = canvas.getContext('2d');
    const n = vInitials.length;
    const colors = vInitials.map((_, i) => COLORS[i % COLORS.length]);

    // Subplots: default margins, bottom=0.25, wspace=0.1; each 3D axes is square.
    const left = 0.125, right = 0.9, top = 0.88, bottom = 0.25, wspace = 0.1;
    const cellW = (right - left) / (n + (n - 1) * wspace);
    const axes = vInitials.map((_, i) => {
      const r = box([left + i * cellW * (1 + wspace), bottom, cellW, top - bottom]);
      const size = Math.min(r.w, r.h);
      return { r, cx: r.x + r.w / 2, cy: r.y + r.h / 2, size, elev: 30, azim: -60 };
    });

    const btnPlay = { r: box([0.35, 0.12, 0.1, 0.06]), label: 'Play', hover: false };
    const btnMeasure = { r: box([0.55, 0.12, 0.1, 0.06]), label: 'Measure', hover: false };
    const slider = { r: box([0.25, 0.04, 0.5, 0.03]), min: 0.1, max: 3.0, val: 1.0, init: 1.0 };

    const state = {
      t: 0,
      playing: false,
      idx: 0,
      starts: vInitials.map((v) => v.slice()),
      ends: vInitials.map((v) => apply(matrices[0], v)),
      rendered: vInitials.map((v) => v.slice()),
    };
    let title = '';

    // ---- 3D projection (matplotlib-style view, near-orthographic) ----
    function projector(ax) {
      const e = (ax.elev * Math.PI) / 180, a = (ax.azim * Math.PI) / 180;
      // Eye direction, as in Axes3D: (cos e cos a, cos e sin a, sin e).
      const eye = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
      const u = [-Math.sin(a), Math.cos(a), 0]; // screen right
      const vUp = cross(eye, u); // screen up
      const DIST = 10; // matplotlib's eye distance in box units
      const s = ax.size / (2 * LIM * Math.sqrt(2)) * 0.98;
      return (p) => {
        const depth = dot(p, eye) / (2 * LIM); // toward the viewer, box units
        const f = DIST / (DIST - depth);
        return { x: ax.cx + dot(p, u) * s * f, y: ax.cy - dot(p, vUp) * s * f, depth };
      };
    }

    function line(P, a, b, color, width, alpha = 1) {
      const pa = P(a), pb = P(b);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function text(str, x, y, size, color = '#000', align = 'left', baseline = 'alphabetic') {
      ctx.font = `${size}px ${FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(str, x, y);
    }

    // ax.quiver(0,0,0, *v, arrow_length_ratio=0.1): shaft plus two head lines
    // at 15 degrees, in the plane of the shaft and the z axis like matplotlib.
    function quiver(P, v, color, alpha) {
      const L = norm(v);
      if (L < 1e-12) return;
      line(P, [0, 0, 0], v, color, 1.5, alpha);
      const d = scale(v, 1 / L);
      let perp = cross(d, [0, 0, 1]);
      if (norm(perp) < 1e-6) perp = cross(d, [0, 1, 0]);
      perp = scale(perp, 1 / norm(perp));
      const hl = 0.1 * L;
      for (const sgn of [1, -1]) {
        const ang = (sgn * 15 * Math.PI) / 180;
        // rotate -d around perp by ang (Rodrigues)
        const k = perp, w = scale(d, -1);
        const r = add(add(scale(w, Math.cos(ang)), scale(cross(k, w), Math.sin(ang))), scale(k, dot(k, w) * (1 - Math.cos(ang))));
        line(P, v, add(v, scale(r, hl)), color, 1.5, alpha);
      }
    }

    // Sphere wireframe: 25 x 25 grid like plot_wireframe(x_sphere, ...)
    const N = 25;
    const us = Array.from({ length: N }, (_, i) => (2 * Math.PI * i) / (N - 1));
    const vs = Array.from({ length: N }, (_, i) => (Math.PI * i) / (N - 1));
    const sph = (u, v) => [Math.cos(u) * Math.sin(v), Math.sin(u) * Math.sin(v), Math.cos(v)];

    function drawAxes(i, v) {
      const ax = axes[i];
      const P = projector(ax);
      const axis = (a, b) => line(P, a, b, '#000', 1, 0.8);
      axis([-LIM, 0, 0], [LIM, 0, 0]);
      axis([0, -LIM, 0], [0, LIM, 0]);
      axis([0, 0, -LIM], [0, 0, LIM]);
      const lab = (str, p) => { const q = P(p); text(str, q.x, q.y, 10 * PT); };
      lab('|+>', [LIM + 0.1, 0, 0]);
      lab('|->', [-LIM - 0.1, 0, 0]);
      lab('|i>', [0, LIM + 0.1, 0]);
      lab('|-i>', [0, -LIM - 0.1, 0]);
      lab('|0>', [0, 0, LIM + 0.1]);
      lab('|1>', [0, 0, -LIM - 0.1]);

      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = 'gray';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const u of us) vs.forEach((vv, j) => { const p = P(sph(u, vv)); j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      for (const vv of vs) us.forEach((u, j) => { const p = P(sph(u, vv)); j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.stroke();
      ctx.globalAlpha = 1;

      quiver(P, v, colors[i], 1);
      quiver(P, vInitials[i], colors[i], 0.2);
      text('X Gate Example', ax.cx, ax.r.y - 6 * PT, 12 * PT, '#000', 'center');
    }

    function drawButton(b) {
      ctx.fillStyle = b.hover ? '#f2f2f2' : '#d9d9d9'; // '0.95' / '0.85'
      ctx.fillRect(b.r.x, b.r.y, b.r.w, b.r.h);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.8 * PT;
      ctx.strokeRect(b.r.x, b.r.y, b.r.w, b.r.h);
      text(b.label, b.r.x + b.r.w / 2, b.r.y + b.r.h / 2, 10 * PT, '#000', 'center', 'middle');
    }

    function drawSlider() {
      const { r } = slider;
      const xOf = (val) => r.x + ((val - slider.min) / (slider.max - slider.min)) * r.w;
      ctx.fillStyle = 'lightgrey';
      ctx.fillRect(r.x, r.y + r.h * 0.25, r.w, r.h * 0.5);
      ctx.fillStyle = '#1f77b4';
      ctx.fillRect(r.x, r.y + r.h * 0.25, xOf(slider.val) - r.x, r.h * 0.5);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1 * PT;
      ctx.beginPath();
      ctx.moveTo(xOf(slider.init), r.y + r.h * 0.15);
      ctx.lineTo(xOf(slider.init), r.y + r.h * 0.85);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#bfbfbf';
      ctx.beginPath();
      ctx.arc(xOf(slider.val), r.y + r.h / 2, 5 * PT, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      text('Speed', r.x - 0.02 * r.w, r.y + r.h / 2, 10 * PT, '#000', 'right', 'middle');
      text(`${slider.val.toFixed(1)}x`, r.x + r.w * 1.02, r.y + r.h / 2, 10 * PT, '#000', 'left', 'middle');
    }

    // Redraw the whole figure from the last rendered state (fig.canvas.draw).
    function draw() {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      text(title, W / 2, H * 0.02, 14 * PT, '#000', 'center', 'top');
      for (let i = 0; i < n; i++) drawAxes(i, state.rendered[i]);
      drawButton(btnPlay);
      drawButton(btnMeasure);
      drawSlider();
    }

    // update(frame) from animation.py
    function update() {
      const M = matrices[state.idx];
      title = `Step ${state.idx + 1}/${matrices.length} (${(state.t * 100).toFixed(0)}%)`;
      for (let i = 0; i < n; i++) state.rendered[i] = slerpWithMatrix(state.starts[i], state.ends[i], state.t, M);
      draw();

      if (state.playing) {
        if (state.t >= 1) {
          state.idx += 1;
          if (state.idx < matrices.length) {
            state.t = 0;
            state.starts = state.ends.map((v) => v.slice());
            state.ends = state.starts.map((v) => apply(matrices[state.idx], v));
          } else {
            state.playing = false;
            btnPlay.label = 'Play';
            draw();
            state.t = 0;
            state.idx = 0;
            state.starts = vInitials.map((v) => v.slice());
            state.ends = state.starts.map((v) => apply(matrices[0], v));
          }
        } else {
          state.t = Math.min(state.t + (1 / 120) * slider.val, 1);
        }
      }
    }

    function toggle() {
      btnPlay.label = state.playing ? 'Play' : 'Pause';
      state.playing = !state.playing;
      draw();
    }

    function measure() {
      const M = matrices[state.idx];
      if (state.playing) {
        state.playing = false;
        btnPlay.label = 'Play';
      }
      for (let i = 0; i < n; i++) {
        state.starts[i] = measureQubit(state.rendered[i], log);
        state.ends[i] = apply(M, state.starts[i]);
      }
      state.t = 0;
      update();
    }

    // ---- FuncAnimation(interval=16), paused after the first draw ----
    const INTERVAL = 16;
    let last = null, acc = 0;
    function loop(now) {
      if (state.playing) {
        if (last === null) last = now;
        acc = Math.min(acc + now - last, 250);
        while (acc >= INTERVAL && state.playing) {
          acc -= INTERVAL;
          update();
        }
        last = now;
      } else {
        last = null;
        acc = 0;
      }
      requestAnimationFrame(loop);
    }

    // ---- canvas sizing and input ----
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    const toFig = (e) => {
      const r = canvas.getBoundingClientRect();
      return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
    };

    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const [x, y] = toFig(e);
      if (contains(btnPlay.r, x, y)) { toggle(); return; }
      if (contains(btnMeasure.r, x, y)) { measure(); return; }
      if (contains(slider.r, x, y)) { drag = { slider: true }; }
      else {
        const ax = axes.find((a) => contains(a.r, x, y));
        if (!ax) return;
        drag = { ax, x, y };
      }
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      move(x, y);
    });

    function move(x, y) {
      if (!drag) return;
      if (drag.slider) {
        const f = (x - slider.r.x) / slider.r.w;
        slider.val = Math.max(slider.min, Math.min(slider.max, slider.min + f * (slider.max - slider.min)));
      } else {
        // Axes3D._on_move: 180 degrees per axes width / height.
        const { ax } = drag;
        ax.elev += ((y - drag.y) / ax.r.h) * 180;
        ax.azim -= ((x - drag.x) / ax.r.w) * 180;
        drag.x = x;
        drag.y = y;
      }
      draw();
    }

    canvas.addEventListener('pointermove', (e) => {
      const [x, y] = toFig(e);
      const hp = contains(btnPlay.r, x, y), hm = contains(btnMeasure.r, x, y);
      if (hp !== btnPlay.hover || hm !== btnMeasure.hover) {
        btnPlay.hover = hp;
        btnMeasure.hover = hm;
        if (!drag) draw();
      }
      canvas.style.cursor = hp || hm || contains(slider.r, x, y) ? 'pointer' : axes.some((a) => contains(a.r, x, y)) ? 'grab' : 'default';
      move(x, y);
    });
    const endDrag = () => { drag = null; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', () => {
      if (btnPlay.hover || btnMeasure.hover) {
        btnPlay.hover = btnMeasure.hover = false;
        draw();
      }
    });
    window.addEventListener('resize', resize);

    update(); // the first frame, then paused (stop_initial)
    resize();
    requestAnimationFrame(loop);
  }

  // ---- main.py -------------------------------------------------------------------
  const list = document.getElementById('measure-log');
  const panel = document.getElementById('measure-panel');
  const log = (p0, p1, bit) => {
    if (!list) return;
    const li = document.createElement('li');
    li.innerHTML = `P(0) = ${p0.toFixed(4)}, P(1) = ${p1.toFixed(4)} &rarr; collapsed to <strong>|${bit}&rang;</strong>`;
    list.prepend(li);
    if (panel) panel.hidden = false;
  };

  const gate1 = hadamardGate();
  const gate2 = pauliZGate();
  const gate3 = phaseGate(); // defined in main.py but not used in the sequence
  void gate3;
  const qubit1 = bloch0();
  animateTransformation(document.getElementById('canvas'), [qubit1], [gate1, gate2, gate1], log);
})();
