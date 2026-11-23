
'use strict';
// A tiny pixel renderer with real lighting: every pixel stores a colour ramp and a base shade;
// a lighting pass adds light from lamps, fire and candles, so light falls off in clean dithered steps.
const PW = 360, PH = 640, SCALE = 3;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hash(x, y, s) { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }

const RAMP = {
  night: ['#07081a', '#0d1130', '#141c48', '#1f2c66', '#2f4488', '#4a66b0'],
  dusk: ['#2a1640', '#4a2258', '#7a3366', '#b4506a', '#e8806a', '#ffc28a'],
  stone: ['#120e18', '#221c2c', '#382e42', '#54465c', '#766478', '#a08ca0'],
  wood: ['#140a0c', '#2c1616', '#4a2620', '#6e3c2a', '#985636', '#c27a48'],
  fur: ['#2a0c10', '#5a1a16', '#962e1c', '#d4542a', '#f2843c', '#ffb86a'],
  cream: ['#2e2228', '#5a464a', '#94807a', '#c8b4a0', '#eadcc4', '#fff8ea'],
  red: ['#1e0610', '#480c1c', '#86142a', '#c42636', '#ec5550', '#ff9284'],
  raven: ['#05040a', '#0e0a18', '#1a142a', '#2a2040', '#3e3258', '#5c4e7c'],
  gold: ['#3a1806', '#6e360a', '#aa6010', '#e29a1c', '#ffd23a', '#fff4a8'],
  pine: ['#050c0a', '#0a1a14', '#12281e', '#1c3a28', '#2a5034', '#3e6a42'],
  grass: ['#0c180c', '#16301a', '#244a22', '#386a2a', '#58902e', '#88b83c'],
  water: ['#040a18', '#08142c', '#0e2244', '#163460', '#244e84', '#4476ac'],
  fire: ['#6a1400', '#ac3200', '#e86200', '#ffa018', '#ffd84a', '#fff8c8'],
  asphalt: ['#0e0e16', '#1a1a24', '#262634', '#363646', '#4a4a5c', '#666678'],
  white: ['#262632', '#545468', '#9494a8', '#c6c6d6', '#e6e6f0', '#ffffff'],
  wall: ['#060a08', '#0e1610', '#162218', '#203024', '#2e4232', '#425a44'],
  blue: ['#08102e', '#10205c', '#1a3894', '#2856c8', '#4482ec', '#80b4ff'],
  steel: ['#0c1018', '#1a2230', '#2c3848', '#465468', '#6a7c92', '#a4b6c8'],
  toad: ['#14200e', '#26381a', '#3e5626', '#5e7a34', '#86a046', '#b8c870'],
  belly: ['#3a3424', '#6a6040', '#a09464', '#cfc492', '#ece2b8', '#fffadc'],
  straw: ['#2e1e0a', '#5a3c14', '#8a6020', '#bc8a34', '#e2b456', '#f8dc8a'],
  fog: ['#141c34', '#202c4a', '#30405e', '#465a78', '#627a96', '#8aa2ba'],
  deep: ['#020406', '#060c10', '#0a141a', '#102028', '#183038', '#24444e'],
  sp1: ['#0c3a4a', '#16627a', '#2a94b0', '#5ac8e0', '#a2ecf8', '#e8fcff'],
  sp2: ['#4a1a32', '#7a2a52', '#b84a80', '#e87aa8', '#ffb4d0', '#fff0f6'],
  sp3: ['#14321a', '#245a2c', '#3e8a44', '#6ec06a', '#aee6a0', '#effff0'],
  sp4: ['#26204a', '#3e3478', '#5e50aa', '#8a7ad8', '#beb2f4', '#f2eeff'],
  sp5: ['#4a300a', '#7a5212', '#b07c1e', '#e8b040', '#ffdc7a', '#fff8d8'],
  teal: ['#04141a', '#082a30', '#0e464a', '#166a66', '#2a9488', '#5ac2ac'],
};
const RN = Object.keys(RAMP), RI = {}; RN.forEach((k, i) => { RI[k] = i; });
const RGB = RN.map((k) => RAMP[k].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]));

function Engine() {
  const N = PW * PH, R = new Int16Array(N).fill(-1), S = new Float32Array(N), EM = new Uint8Array(N), ID = new Uint8Array(N);
  const lights = [], glows = [];
  let ambient = 0;
  const e = {
    lights, glows,
    setAmbient(a) { ambient = a; },
    put(x, y, ramp, sh, id = 0, em = 0) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= PW || y >= PH) return; const i = y * PW + x; R[i] = RI[ramp]; S[i] = sh; ID[i] = id; EM[i] = em; },
    get(x, y) { if (x < 0 || y < 0 || x >= PW || y >= PH) return null; return R[y * PW + x]; },
    // shapes. sh: a number, or a function (x, y, nx, ny) -> shade
    rect(x, y, w, h, ramp, sh, id = 0, em = 0) { for (let py = Math.round(y); py < Math.round(y + h); py++) for (let px = Math.round(x); px < Math.round(x + w); px++) e.put(px, py, ramp, typeof sh === 'function' ? sh(px, py, (px - x) / w, (py - y) / h) : sh, id, em); },
    ell(cx, cy, rx, ry, ramp, sh, id = 0, em = 0) {
      for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
        const nx = (px + 0.5 - cx) / rx, ny = (py + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1) continue;
        const s = sh === undefined ? 3 + Math.round((-nx * 0.55 - ny * 0.8) * 1.6) : typeof sh === 'function' ? sh(px, py, nx, ny) : sh;
        e.put(px, py, ramp, s, id, em);
      }
    },
    poly(pts, ramp, sh, id = 0, em = 0) {
      const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
      for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px++) {
        let c = false; const X = px + 0.5, Y = py + 0.5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) c = !c; }
        if (c) e.put(px, py, ramp, typeof sh === 'function' ? sh(px, py) : sh, id, em);
      }
    },
    line(x0, y0, x1, y1, ramp, sh, t = 1, id = 0, em = 0) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) e.put(x + a - (t >> 1), y + b - (t >> 1), ramp, sh, id, em); } },
    outline(id) { // selective outline: each sprite's edge takes the darkest tone of its own colour
      const mark = [];
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x; if (ID[i] !== id) continue; const nb = (xx, yy) => (xx < 0 || yy < 0 || xx >= PW || yy >= PH ? 0 : ID[yy * PW + xx]); if (nb(x - 1, y) !== id || nb(x + 1, y) !== id || nb(x, y - 1) !== id || nb(x, y + 1) !== id) mark.push(i); }
      mark.forEach((i) => { S[i] = -9; EM[i] = 0; });
    },
    light(x, y, r, s, glow) { lights.push({ x, y, r, s }); if (glow) glows.push({ x, y, r: r * 1.1, col: glow, a: 0.22 }); },
    glow(x, y, r, col, a) { glows.push({ x, y, r, col, a }); },
    render(canvas) {
      const off = document.createElement('canvas'); off.width = PW; off.height = PH;
      const o = off.getContext('2d'), img = o.createImageData(PW, PH);
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const i = y * PW + x, k = i * 4;
        if (R[i] < 0) { img.data[k + 3] = 255; continue; }
        let sh = S[i];
        if (!EM[i] && sh > -9) {
          let L = 0; for (const l of lights) { const d = Math.hypot(x - l.x, y - l.y); if (d < l.r) L += l.s * Math.pow(1 - d / l.r, 1.4); }
          sh = sh + ambient + L;
          sh = Math.floor(sh + bay(x, y) * 0.999); // dithered light falloff
        }
        sh = sh <= -9 ? 0 : Math.max(0, Math.min(5, Math.round(sh)));
        const c = RGB[R[i]][sh]; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
      }
      o.putImageData(img, 0, 0);
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, PW * SCALE, PH * SCALE);
      // soft bloom on top (modern pixel games keep the pixels crisp but let light bleed)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glows.forEach((g) => { const X = g.x * SCALE, Y = g.y * SCALE, Rr = g.r * SCALE; const gr = ctx.createRadialGradient(X, Y, 0, X, Y, Rr); gr.addColorStop(0, g.col.replace('A', g.a)); gr.addColorStop(1, g.col.replace('A', 0)); ctx.fillStyle = gr; ctx.fillRect(X - Rr, Y - Rr, Rr * 2, Rr * 2); });
      ctx.restore();
    },
  };
  return e;
}

// 3x5 pixel font for the interface
const GL = { A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '111100101101111', H: '101101111101101', I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '111101101101101', O: '111101101101111', P: '111101111100100', R: '111101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101111010010', '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', '/': '001001010100100', ':': '000010000010000', '!': '010010010000010', ' ': '000000000000000', '.': '000000000000010', 'x': '000101010101000' };
function text(ctx, str, x, y, k, col, shadow = '#0a0812', align = 'left') {
  const w = str.length * 4 * k - k; if (align === 'center') x -= w / 2; if (align === 'right') x -= w;
  const draw = (ox, oy, c) => { ctx.fillStyle = c; [...str].forEach((ch, n) => { const g = GL[ch] || GL[' ']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') ctx.fillRect(x + ox + (n * 4 + q) * k, y + oy + r * k, k, k); }); };
  if (shadow) { draw(k, k, shadow); }
  draw(0, 0, col);
}

