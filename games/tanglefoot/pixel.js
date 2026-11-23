// Tanglefoot — HD pixel art renderer (360 x 640 real pixels, no dithering).
// The pixel engine, palette, spirits, lantern and font are shared with games/night-ferry/pixel.js.
// Each pixel stores a colour ramp + shade step; light sources add clean rings of light to sprites and water.
// Static scenery is built once; scrolling layers are wide tiles; characters, boat and effects are drawn each frame.
(function () {
  'use strict';
  const RAMP = {
    skyA: ['#04061a', '#070a22', '#0a0e2a', '#0d1332', '#11183a', '#151e44'],
    skyB: ['#1a244d', '#202b56', '#28335e', '#323b66', '#3e436c', '#4c4b70'],
    cloud: ['#141a36', '#1e2646', '#2a3458', '#3a466a', '#56628a', '#8a92b4'],
    hill: ['#0a0c1c', '#121628', '#1a2034', '#242a42', '#303652', '#404662'],
    pine: ['#03080a', '#07100f', '#0c1a17', '#132620', '#1c352b', '#28483a'],
    fog: ['#18223a', '#232f4a', '#30405a', '#41546c', '#56697e', '#70839a'],
    water: ['#050d18', '#081526', '#0c1f36', '#122c48', '#1b3d5e', '#2c5678'],
    deep: ['#010305', '#03070b', '#060d12', '#0a141a', '#101e26', '#182a34'],
    wood: ['#120808', '#26120f', '#3e1f18', '#5c3022', '#82472e', '#a8653e'],
    plank: ['#1a0c0a', '#341a12', '#52291a', '#743a24', '#9a5230', '#c0703e'],
    fire: ['#6a1400', '#ac3200', '#e86200', '#ffa018', '#ffd84a', '#fff8c8'],
    cream: ['#2e2228', '#5a464a', '#94807a', '#c8b4a0', '#eadcc4', '#fff8ea'],
    ink: ['#04030a', '#0c0a16', '#181426', '#262038', '#3a3250', '#564c6e'],
    white: ['#262632', '#545468', '#9494a8', '#c6c6d6', '#e6e6f0', '#ffffff'],
    red: ['#1e0610', '#480c1c', '#86142a', '#c42636', '#ec5550', '#ff9284'],
    gold: ['#3a1806', '#6e360a', '#aa6010', '#e29a1c', '#ffd23a', '#fff4a8'],
    toad: ['#0f1a0c', '#1e3016', '#30481e', '#466428', '#628434', '#8aa848'],
    belly: ['#36301e', '#5e5434', '#8c8050', '#b8ac72', '#dcd29a', '#f6f0c8'],
    straw: ['#2a1a08', '#523610', '#7e561a', '#ac7c2a', '#d4a444', '#f0cc74'],
    rope: ['#2a2014', '#4a3a24', '#6e5836', '#94784a', '#b89a62', '#dcc088'],
    reed: ['#040806', '#08120c', '#0e1c12', '#16281a', '#203622', '#2c462c'],
    lily: ['#061208', '#0c2210', '#163618', '#204c22', '#2e6630', '#448044'],
    stone: ['#0c0a12', '#16141e', '#22202c', '#302c3a', '#423c4c', '#58506a'],
    sp1: ['#0c3a4a', '#16627a', '#2a94b0', '#5ac8e0', '#a2ecf8', '#e8fcff'],
    sp2: ['#4a1a32', '#7a2a52', '#b84a80', '#e87aa8', '#ffb4d0', '#fff0f6'],
    sp3: ['#14321a', '#245a2c', '#3e8a44', '#6ec06a', '#aee6a0', '#effff0'],
    sp4: ['#26204a', '#3e3478', '#5e50aa', '#8a7ad8', '#beb2f4', '#f2eeff'],
    sp5: ['#4a300a', '#7a5212', '#b07c1e', '#e8b040', '#ffdc7a', '#fff8d8'],
    tent: ['#14081e', '#261034', '#3e1a50', '#5e2a6c', '#88428a', '#b46aa8'],
    grass: ['#060c0a', '#0a1610', '#102016', '#182c1c', '#223a24', '#2e4a2c'],
    rock: ['#15131d', '#282531', '#3e3a4b', '#5a556a', '#7d7890', '#a8a2b8'],
    dirt: ['#120e0a', '#1e1810', '#2c2418', '#3c3222', '#50442e', '#68583c'],
  };
  const NAMES = Object.keys(RAMP), RI = {};
  NAMES.forEach((k, i) => { RI[k] = i; });
  const COL32 = new Uint32Array(NAMES.length * 6);
  NAMES.forEach((k, i) => RAMP[k].forEach((h, s) => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); COL32[i * 6 + s] = (255 << 24) | (b << 16) | (g << 8) | r; }));
  const SPR = ['sp1', 'sp2', 'sp3', 'sp4', 'sp5'];
  function hash(x, s) { const v = Math.sin(x * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }
  function noise1(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, s) * (1 - u) + hash(i + 1, s) * u; }
  function fbm(x, s) { return noise1(x, s) * 0.6 + noise1(x * 2.3, s + 7) * 0.28 + noise1(x * 5.1, s + 13) * 0.12; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- pixel buffer ----------
  function Buf(W, H) {
    const N = W * H;
    const b = { W, H, R: new Int8Array(N).fill(-1), S: new Int8Array(N), EM: new Uint8Array(N), ID: new Uint8Array(N), L: new Float32Array(N), box: {} };
    b.put = (x, y, ramp, sh, id = 0, em = 0) => {
      x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x; b.R[i] = typeof ramp === 'number' ? ramp : RI[ramp]; b.S[i] = clamp(sh, 0, 5); b.EM[i] = em; b.ID[i] = id;
      if (id) { const bx = b.box[id] || (b.box[id] = [x, y, x, y]); if (x < bx[0]) bx[0] = x; if (y < bx[1]) bx[1] = y; if (x > bx[2]) bx[2] = x; if (y > bx[3]) bx[3] = y; }
    };
    b.rect = (x, y, w, h, ramp, sh, id, em) => { for (let py = Math.round(y); py < Math.round(y + h); py++) for (let px = Math.round(x); px < Math.round(x + w); px++) b.put(px, py, ramp, typeof sh === 'function' ? sh(px, py) : sh, id, em); };
    // ellipse; sh(px, py, nx, ny) gets the normalised position inside the shape
    b.ell = (cx, cy, rx, ry, ramp, sh, id, em) => {
      for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
        const nx = (px + 0.5 - cx) / rx, ny = (py + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1) continue;
        b.put(px, py, ramp, sh === undefined ? lit3(nx, ny) : typeof sh === 'function' ? sh(px, py, nx, ny) : sh, id, em);
      }
    };
    b.poly = (pts, ramp, sh, id, em) => {
      const ys = pts.map((p) => p[1]);
      for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) {
        const Y = py + 0.5, hits = [];
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > Y) !== (yj > Y)) hits.push(((xj - xi) * (Y - yi)) / (yj - yi) + xi); }
        hits.sort((a, c) => a - c);
        for (let k = 0; k + 1 < hits.length; k += 2) for (let px = Math.ceil(hits[k] - 0.5); px <= Math.floor(hits[k + 1] - 0.5); px++) b.put(px, py, ramp, typeof sh === 'function' ? sh(px, py) : sh, id, em);
      }
    };
    b.line = (x0, y0, x1, y1, ramp, sh, t = 1, id, em) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = 0; a < t; a++) for (let c = 0; c < t; c++) b.put(x + a - (t >> 1), y + c - (t >> 1), ramp, typeof sh === 'function' ? sh(i / n) : sh, id, em); } };
    // edges: a dark selective outline, and a moonlit rim one pixel inside the upper-right edge
    b.outline = (id, rim = true) => {
      const bx = b.box[id]; if (!bx) return;
      const inside = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && b.ID[yy * W + xx] === id;
      const edge = [], rimPx = [];
      for (let y = bx[1]; y <= bx[3]; y++) for (let x = bx[0]; x <= bx[2]; x++) {
        if (!inside(x, y)) continue;
        if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) edge.push([x, y]);
        else if (rim && (!inside(x + 2, y - 1) || !inside(x + 1, y - 2))) rimPx.push(y * W + x);
      }
      edge.forEach(([x, y]) => { const i = y * W + x; b.S[i] = 0; b.EM[i] = 2; });
      rimPx.forEach((i) => { if (b.EM[i] === 0) b.S[i] = Math.min(5, b.S[i] + 1); });
    };
    b.light = (x, y, r, s) => {
      const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { const d = Math.hypot(px - x, py - y); if (d < r) b.L[py * W + px] += s * Math.pow(1 - d / r, 1.3); }
    };
    return b;
  }
  // 4-tone ball shading, light from the upper right (the moon)
  function lit3(nx, ny) { const l = nx * 0.5 - ny * 0.75 + 0.15 * (1 - nx * nx - ny * ny); return l > 0.55 ? 4 : l > 0.05 ? 3 : l > -0.45 ? 2 : 1; }
  function blit(dst, tile, off, y0) {
    const W = dst.W, tw = tile.W;
    for (let y = 0; y < tile.H; y++) {
      const dy = y + y0; if (dy < 0 || dy >= dst.H) continue;
      for (let x = 0; x < W; x++) { const sx = ((x + off) % tw + tw) % tw, si = y * tw + sx; if (tile.R[si] < 0) continue; const di = dy * W + x; dst.R[di] = tile.R[si]; dst.S[di] = tile.S[si]; dst.EM[di] = tile.EM[si]; dst.ID[di] = 0; }
    }
  }

  function lantern(b, x, y, id, power = 1) {
    b.line(x, y - 5, x, y, 'ink', 1, 1, id);
    b.rect(x - 6, y, 13, 3, 'ink', (px) => (px > x ? 3 : 2), id);
    b.rect(x - 5, y + 3, 11, 12, 'fire', (px, py) => (Math.abs(px - x) < 2 && py > y + 6 ? 5 : px < x - 2 ? 3 : 4), id, 1);
    b.rect(x - 5, y + 3, 1, 12, 'ink', 2, id); b.rect(x + 5, y + 3, 1, 12, 'ink', 3, id); b.rect(x - 1, y + 3, 1, 12, 'ink', 2, id);
    b.rect(x - 6, y + 15, 13, 3, 'ink', 2, id);
    b.light(x, y + 9, 56 + power * 16, 2.3 + power * 0.5);
  }
  // a little light spirit: a squashy glowing body, big eyes, rosy cheeks, a wisp of a tail
  function spirit(b, x, y, rad, ramp, mood, id, t, seed) {
    const sq = 1 + Math.sin(t * 5 + seed) * 0.05, rx = rad * sq, ry = rad * (2 - sq) * 0.9;
    for (let k = 0; k < 6; k++) { const a = Math.PI * 0.9 + Math.sin(t * 4 + seed + k) * 0.15; b.put(x + Math.cos(a) * (rx + k * 1.6), y + ry * 0.5 + Math.sin(a) * 2 + k * 0.6, ramp, 4 - Math.floor(k / 2), 0, 1); }
    b.ell(x, y, rx, ry, ramp, (px, py, nx, ny) => { const l = nx * 0.35 - ny * 0.8; return l > 0.6 ? 5 : l > 0.05 ? 4 : l > -0.5 ? 3 : 2; }, id, 1);
    b.outline(id, false);
    const ex = Math.round(rad * 0.36), ey = Math.round(y - ry * 0.05), mx = Math.round(x);
    if (mood === 'scared') {
      [-1, 1].forEach((s) => { b.rect(mx + s * ex - 2, ey - 3, 4, 5, 'white', 5, 0, 1); b.rect(mx + s * ex - 1, ey - 1, 2, 2, 'ink', 0, 0, 1); });
      b.rect(mx - 1, ey + 4, 3, 3, 'ink', 1, 0, 1);
      b.put(mx + ex + 4, ey - 5, 'sp1', 5, 0, 1); b.put(mx + ex + 4, ey - 4, 'sp1', 4, 0, 1);
    } else if (mood === 'happy') {
      [-1, 1].forEach((s) => { b.put(mx + s * ex - 2, ey, 'ink', 1, 0, 1); b.put(mx + s * ex - 1, ey - 1, 'ink', 1, 0, 1); b.put(mx + s * ex, ey - 1, 'ink', 1, 0, 1); b.put(mx + s * ex + 1, ey, 'ink', 1, 0, 1); });
      b.put(mx - 1, ey + 3, 'ink', 1, 0, 1); b.put(mx, ey + 4, 'ink', 1, 0, 1); b.put(mx + 1, ey + 3, 'ink', 1, 0, 1);
    } else {
      const big = mood === 'curious' ? 1 : 0, blink = Math.sin(t * 0.9 + seed * 3) > 0.985;
      [-1, 1].forEach((s) => { if (blink) b.rect(mx + s * ex - 2, ey, 4, 1, 'ink', 1, 0, 1); else { b.rect(mx + s * ex - 1 - big, ey - 2 - big, 3 + big, 4 + big, 'ink', 0, 0, 1); b.put(mx + s * ex, ey - 2 - big, 'white', 5, 0, 1); } });
      if (mood === 'curious') b.rect(mx - 1, ey + 4, 2, 2, 'ink', 1, 0, 1);
    }
    b.put(mx - ex - 3, ey + 3, 'red', 4, 0, 1); b.put(mx + ex + 3, ey + 3, 'red', 4, 0, 1);
    b.light(x, y, rad * 3, 1.4);
  }

  // ---------- the 5x7 font, with an outline and a drop shadow ----------
  const F5 = { A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110', D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000', G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110', J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111', M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110', V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001', Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111', '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111', '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110', '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110', '9': '01110100011000101111000010001001100', '!': '00100001000010000100001000000000100', '.': '00000000000000000000000000110001100', ',': '00000000000000000000011000010001000', "'": '00100001000100000000000000000000000', '-': '00000000000000011111000000000000000', '/': '00001000010001000100010001000010000', ':': '00000011000110000000011000110000000', '?': '01110100010000100010001000000000100', ' ': '00000000000000000000000000000000000' };
  function text(ctx, str, x, y, k, col, outline = '#04030a', align = 'center') {
    str = String(str).toUpperCase(); const w = str.length * 6 * k - k; if (align === 'center') x -= w / 2; if (align === 'right') x -= w; x = Math.round(x); y = Math.round(y);
    const cells = [];
    [...str].forEach((ch, n) => { const g = F5[ch] || F5[' ']; for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (g[r * 5 + q] === '1') cells.push([x + (n * 6 + q) * k, y + r * k]); });
    if (outline) { ctx.fillStyle = outline; cells.forEach(([cx, cy]) => ctx.fillRect(cx - 1, cy - 1, k + 2, k + 2)); cells.forEach(([cx, cy]) => ctx.fillRect(cx + 1, cy + 1, k + 1, k + 1)); }
    ctx.fillStyle = col; cells.forEach(([cx, cy]) => ctx.fillRect(cx, cy, k, k));
  }
  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = '#04030a'; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = '#141a33'; ctx.fillRect(x + 2, y + 1, w - 4, h - 2); ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
    ctx.fillStyle = '#26305a'; ctx.fillRect(x + 2, y + 2, w - 4, 1);
  }

  // ---------- Tanglefoot: a hillside at night, seen from a high angle ----------
  let cache = null, GR = null;
  function ring(b, x, y, r, ramp, sh, gap) { const n = Math.max(12, Math.round(r * 5)); for (let i = 0; i < n; i++) { if (gap && (i % gap) >= gap / 2) continue; const a = i / n * 6.2832; b.put(x + Math.cos(a) * r, y + Math.sin(a) * r, ramp, sh, 0, 1); } }
  function arc(b, x, y, r, a0, da, ramp, sh) { const n = Math.max(2, Math.round(Math.abs(da) * r)); for (let i = 0; i <= n; i++) { const a = a0 + da * i / n; for (let w = 0; w < 2; w++) b.put(x + Math.cos(a) * (r + w), y + Math.sin(a) * (r + w), ramp, sh, 0, 1); } }
  const ball = (px, py, nx, ny) => { const l = nx * 0.45 - ny * 0.75; return l > 0.5 ? 4 : l > 0 ? 3 : l > -0.5 ? 2 : 1; };

  function buildGround(W, H) {
    const g = Buf(W, H);
    for (let y = 0; y < H; y++) {
      const cx = 180 + 30 * Math.sin(y * 0.011 + 1) + 14 * Math.sin(y * 0.031);
      for (let x = 0; x < W; x++) { const d = Math.abs(x - cx); if (y > H - 64) g.put(x, y, 'dirt', y === H - 63 ? 3 : 2); else if (d < 11) g.put(x, y, 'dirt', d < 8 ? 2 : 1); else g.put(x, y, 'grass', 2); }
    }
    for (let i = 0; i < 260; i++) { const x = Math.round(hash(i, 1) * W), y = Math.round(hash(i, 2) * (H - 70)); if (g.R[y * W + x] !== RI.grass) continue; g.put(x, y, 'grass', 3); g.put(x - 1, y - 1, 'grass', 3); g.put(x + 1, y - 2, 'grass', 4); }
    for (let i = 0; i < 26; i++) { const x = Math.round(hash(i, 5) * W), y = Math.round(hash(i, 6) * (H - 80)); if (g.R[y * W + x] !== RI.grass) continue; g.put(x, y, 'cream', 3); g.put(x, y + 1, 'grass', 4); }
    for (let i = 0; i < 14; i++) { const x = hash(i, 8) * W, y = 40 + hash(i, 9) * (H - 130), r = 3 + hash(i, 10) * 4; g.ell(x, y, r, r * 0.6, 'rock', (px, py, nx, ny) => (ny < -0.2 ? 3 : 2)); }
    for (let x = 0; x < W; x += 6) { g.rect(x, H - 66, 1, 5, 'wood', 2); if ((x / 6) % 2 === 0) g.rect(x, H - 64, 6, 1, 'wood', 1); }   // a low fence above the village
    return g;
  }

  function tree(b, c, id) {
    b.ell(c.x, c.y + 1, 14, 5, 'ink', 0);
    b.rect(c.x - 4, c.y - 16, 8, 18, 'wood', (px) => (px < c.x - 1 ? 1 : px > c.x + 1 ? 3 : 2), id);
    const leaf = (px, py, nx, ny) => { const l = nx * 0.5 - ny * 0.7; return l > 0.45 ? 4 : l > -0.05 ? 3 : l > -0.5 ? 2 : 1; };
    b.ell(c.x - 10, c.y - 22, 11, 9, 'lily', leaf, id); b.ell(c.x + 10, c.y - 23, 10, 8, 'lily', leaf, id); b.ell(c.x, c.y - 30, 20, 16, 'lily', leaf, id);
    b.outline(id);
  }

  function giant(b, g, id, t) {
    const s = g.big ? 1.25 : 1, st = g.state, cx = g.x, cy = g.y, up = st === 'walk' || st === 'lean';
    if (st === 'down' && g.ft > 2.6 && Math.floor(t * 12) % 2) return;
    const k = st === 'lean' ? 0.15 * Math.min(1, g.ft / 0.16) : st === 'fall' ? 0.15 + 0.85 * Math.min(1, g.ft / 0.38) : st === 'down' ? 1 : 0;
    const T = (h, along) => [cx + g.dir.x * along * k * s, cy - h * s * (1 - k) + g.dir.y * along * k * s];   // standing: above the feet; lying: along the fall
    g.feet.forEach((q, i) => { const lift = st === 'walk' && i === g.foot ? Math.sin(Math.min(1, g.st) * Math.PI) : 0; if (lift > 0.05) b.ell(q.x, q.y + 1, 11 * s, 5 * s, 'ink', 0); b.ell(q.x, q.y - lift * 7, 11 * s, 8 * s, 'rock', (px, py, nx, ny) => (ny < -0.3 ? 3 : 2), id); });
    const [hpx, hpy] = T(20, 36);
    g.feet.forEach((q, i) => { const lift = st === 'walk' && i === g.foot ? Math.sin(Math.min(1, g.st) * Math.PI) : 0; b.line(q.x, q.y - 4 - lift * 7, hpx + (i ? -6 : 6) * s, hpy, 'rock', 2, Math.round(9 * s), id); });
    const [tx, ty] = T(34, 64);
    const swing = st === 'walk' ? Math.sin(g.st * Math.PI) * (g.foot ? 1 : -1) * 4 : 0;
    [-1, 1].forEach((sd) => b.ell(tx + sd * 27 * s + (k ? -g.dir.y * sd * 6 * k : 0), ty + 7 * s + sd * swing + (k ? g.dir.x * sd * 6 * k : 0), 8 * s, 9 * s, 'rock', ball, id));
    b.ell(tx, ty, 25 * s, 21 * s, 'rock', ball, id);
    b.ell(tx - 6 * s, ty - 10 * s, 13 * s, 7 * s, 'lily', (px, py, nx, ny) => (ny < 0 ? 3 : 2), id); b.ell(tx + 11 * s, ty - 3 * s, 7 * s, 4 * s, 'lily', 2, id);
    const [hx, hy] = T(58, 100), fx = up ? g.hx * 6 * s : 0, fy = up ? g.hy * 4 * s : 0;
    if (g.big) [-1, 1].forEach((sd) => b.poly([[hx + fx + sd * 7 * s, hy + fy - 6 * s], [hx + fx + sd * 15 * s, hy + fy - 17 * s], [hx + fx + sd * 12 * s, hy + fy - 3 * s]], 'cream', 3, id));
    b.ell(hx + fx, hy + fy, 12 * s, 11 * s, 'rock', ball, id);
    if (up && g.hy > -0.35) { const ex = hx + fx + g.hx * 5 * s, ey = hy + fy + 2 + g.hy * 3, w = 4 * s * (1 - Math.abs(g.hx) * 0.45); [-1, 1].forEach((sd) => b.rect(ex + sd * w - 1, ey - 1, 2, 2, g.chase ? 'red' : 'fire', g.chase ? 5 : 4, id, 1)); b.light(ex, ey, 24, 1.2); }
    else if (!up) { const ex = hx, ey = hy + 2; b.rect(ex - 5, ey, 3, 1, 'ink', 0, id); b.rect(ex + 3, ey, 3, 1, 'ink', 0, id); }
    b.outline(id);
  }

  function hero(b, sc, t) {
    const P = sc.p, bob = sc.moving && P.stun <= 0 ? Math.round(Math.abs(Math.sin(t * 16)) * 2) : 0;
    b.ell(P.x, P.y + 1, 6, 3, 'ink', 0);
    if (P.stun > 0) { b.ell(P.x, P.y - 1, 8, 3, 'gold', 3, 2); b.outline(2); for (let i = 0; i < 3; i++) b.put(P.x + Math.cos(t * 9 + i * 2.1) * 9, P.y - 9 + Math.sin(t * 9 + i * 2.1) * 3, 'cream', 5, 0, 1); }
    else {
      b.ell(P.x, P.y - 5 - bob, 5, 6, 'gold', (px, py, nx) => (nx > 0.2 ? 4 : 3), 2);
      b.ell(P.x, P.y - 12 - bob, 4, 4, 'cream', (px, py, nx, ny) => (ny > 0.3 ? 3 : 4), 2);
      b.rect(P.x - 4, P.y - 17 - bob, 9, 3, 'gold', (px, py) => (py === Math.round(P.y - 17 - bob) ? 5 : 4), 2);
      const face = P.wx < -0.2 ? -1 : 1;
      b.put(P.x - 1 + (face < 0 ? -1 : 0), P.y - 12 - bob, 'ink', 0, 2); b.put(P.x + 2 + (face < 0 ? -1 : 0), P.y - 12 - bob, 'ink', 0, 2);
      b.rect(P.x + face * 7 - 1, P.y - 9 - bob, 3, 4, 'fire', 5, 2, 1);
      b.outline(2);
    }
    b.light(P.x, P.y - 6, 74, 2.7);
  }

  function house(b, i, H, lit) {
    const x = 18 + i * 50, id = 80 + i, y = H - 46;
    b.rect(x, y, 26, 24, 'plank', (px, py) => (py === y ? 4 : (px - x) % 7 === 0 ? 1 : 2), id);
    b.poly([[x - 5, y + 1], [x + 13, y - 17], [x + 31, y + 1]], 'straw', (px, py) => ((px + py * 2) % 5 === 0 ? 2 : px > x + 13 ? 3 : 4), id);
    b.rect(x + 16, y + 10, 6, 14, 'wood', 1, id);
    b.rect(x + 4, y + 7, 7, 7, lit ? 'fire' : 'ink', (px, py) => (lit ? (px === x + 7 || py === y + 10 ? 3 : 5) : 1), id, lit ? 1 : 0);
    b.outline(id);
    if (lit) b.light(x + 7, y + 10, 62, 2.7);
  }

  function frame(sc, ctx) {
    const W = 360, H = sc.H, t = sc.t, P = sc.p, ch = sc.chain, last = ch[ch.length - 1];
    if (!cache || cache.H !== H) { cache = { H, base: buildGround(W, H), b: Buf(W, H), img: ctx.createImageData(W, H) }; cache.out32 = new Uint32Array(cache.img.data.buffer); GR = new Uint8Array(NAMES.length); GR[RI.grass] = 1; GR[RI.dirt] = 1; }
    const C = cache, b = C.b, base = C.base;
    b.R.set(base.R); b.S.set(base.S); b.EM.set(base.EM); b.L.fill(0); b.ID.fill(0); b.box = {};
    const walking = sc.giants.filter((g) => g.state === 'walk');
    // on the ground: the wires, the rope, where the roped giant would fall
    sc.wires.forEach((w) => { b.line(w.a.x, w.a.y - 4, w.b.x, w.b.y - 4, 'cream', 5, 1, 0, 1); b.line(w.a.x, w.a.y - 3, w.b.x, w.b.y - 3, 'rope', 3, 1, 0, 1); });
    const ready = last && last.kind === 'giant' && last.rings >= last.need;
    if (ready) { const dx = P.x - last.x, dy = P.y - last.y, d = Math.hypot(dx, dy) || 1; for (let q = 30; q <= 140; q += 7) b.put(last.x - dx / d * q, last.y - dy / d * q, 'gold', 3, 0, 1); ring(b, last.x - dx / d * 140, last.y - dy / d * 140, 9, 'gold', 3, 4); if (!sc.tight) ring(b, last.x, last.y, sc.LEASH + (last.big ? 10 : 0), 'cream', 2, 6); }
    if (ch.length) {
      for (let i = 1; i < ch.length; i++) b.line(ch[i - 1].x, ch[i - 1].y, ch[i].x, ch[i].y, 'rope', 4, 1, 0, 1);
      const dx = P.x - last.x, dy = P.y - last.y, d = Math.hypot(dx, dy) || 1, leash = last.kind === 'tree' ? sc.TREE_LEASH : sc.LEASH + (last.big ? 10 : 0), slack = clamp(1 - d / leash, 0, 1);
      const mx = (last.x + P.x) / 2 - dy / d * slack * 34, my = (last.y + P.y) / 2 + dx / d * slack * 34; let px = last.x, py = last.y;
      for (let i = 1; i <= 16; i++) { const u = i / 16, x = (1 - u) * (1 - u) * last.x + 2 * u * (1 - u) * mx + u * u * P.x, y = (1 - u) * (1 - u) * last.y + 2 * u * (1 - u) * my + u * u * (P.y - 4); b.line(px, py, x, y, sc.tight ? 'cream' : 'rope', sc.tight ? 5 : 4, sc.tight ? 2 : 1, 0, 1); px = x; py = y; }
    } else for (let i = 1; i < sc.trail.length; i++) b.line(sc.trail[i - 1].x, sc.trail[i - 1].y, sc.trail[i].x, sc.trail[i].y, 'rope', 3, 1, 0, 1);
    // everything that stands up, back to front
    const items = [];
    sc.trees.forEach((c, i) => items.push({ y: c.y, f: () => tree(b, c, 60 + i) }));
    sc.giants.forEach((g, i) => items.push({ y: g.state === 'walk' ? Math.max(g.feet[0].y, g.feet[1].y) : g.y + 2, f: () => giant(b, g, 10 + (i % 40), t) }));
    items.push({ y: P.y, f: () => hero(b, sc, t) });
    items.sort((a, c) => a.y - c.y).forEach((q) => q.f());
    for (let i = 0; i < 7; i++) { const lamp = [1, 3, 5].indexOf(i); house(b, i, H, lamp >= 0 && lamp < sc.LAMPS - sc.hits); }
    // signals drawn over everything: where a foot will land, the lap you are running, the rope caught on the legs
    walking.forEach((g) => { const sr = g.big ? 31 : 26; ring(b, g.landX, g.landY, sr + 10 * (1 - g.st), 'red', g.st > 0.55 ? 5 : 4); ring(b, g.landX, g.landY, sr, 'red', 3, 4); });
    sc.trees.concat(walking).forEach((c) => {
      for (let k = 0; k < c.rings; k++) { ring(b, c.x, c.y, c.r + 2 + k * 3, 'rope', 5); ring(b, c.x, c.y, c.r + 3 + k * 3, 'rope', 4); }
      if (c.rings < c.need && Math.abs(c.lap) > 0.15 && c.lastAng !== null) arc(b, c.x, c.y, c.kind === 'tree' ? 26 : 50 * (c.big ? 1.25 : 1), c.lastAng - c.lap, c.lap, 'gold', 5);
    });
    if (last && last.kind === 'tree') sc.trees.forEach((c) => { if (c !== last) ring(b, c.x, c.y, 29 + Math.round(Math.sin(t * 6) * 2), 'gold', 4, 4); });
    // light in clean steps: the ground and everything on it catch the lamps and your lantern
    const R8 = b.R, S8 = b.S, EM = b.EM, L = b.L, ID = b.ID, out = C.out32;
    for (let i = 0; i < R8.length; i++) {
      const r = R8[i]; if (r < 0) { out[i] = 0xff000000; continue; }
      let sh;
      if (EM[i] === 2) sh = 0; else if (EM[i]) sh = S8[i];
      else sh = S8[i] + (ID[i] || GR[r] ? Math.floor(L[i]) : 0);
      sh = sh < 0 ? 0 : sh > 5 ? 5 : sh; out[i] = COL32[r * 6 + sh];
    }
    if (sc.shake > 0.5) {
      const dx = Math.round(Math.sin(t * 61) * sc.shake * 0.7), dy = Math.round(Math.cos(t * 47) * sc.shake * 0.7);
      if (dx || dy) { const tmp = C.tmp || (C.tmp = new Uint32Array(out.length)); tmp.set(out); for (let y = 0; y < H; y++) { const sy = clamp(y - dy, 0, H - 1) * W; for (let x = 0; x < W; x++) out[y * W + x] = tmp[sy + clamp(x - dx, 0, W - 1)]; } }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(C.img, 0, 0);
    ui(sc, ctx, ready, last);
  }

  function ui(sc, ctx, ready, last) {
    const H = sc.H, t = sc.t, P = sc.p;
    if (sc.state === 'title') {
      ctx.fillStyle = 'rgba(4,6,14,0.55)'; ctx.fillRect(0, 0, 360, H);
      text(ctx, 'TANGLEFOOT', 180, H * 0.2, 5, '#ffd23a');
      text(ctx, 'YOU ARE SMALL.', 180, H * 0.2 + 62, 2, '#f4ecd8'); text(ctx, 'THE GIANTS ARE NOT.', 180, H * 0.2 + 82, 2, '#f4ecd8'); text(ctx, 'YOU HAVE A ROPE.', 180, H * 0.2 + 102, 2, '#e2c477');
      if (Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO START', 180, H * 0.62, 2, '#ffffff');
      text(ctx, 'DRAG, OR ARROW KEYS, TO RUN', 180, H * 0.62 + 30, 2, '#8a92b4');
      return;
    }
    panel(ctx, 8, 8, 344, 26);
    text(ctx, `GIANTS ${sc.down}/${sc.TOTAL}`, 18, 14, 2, '#f4ecd8', null, 'left');
    for (let i = 0; i < sc.LAMPS; i++) { const x = 196 + i * 18, on = i < sc.LAMPS - sc.hits; ctx.fillStyle = '#04030a'; ctx.fillRect(x - 1, 12, 12, 18); ctx.fillStyle = on ? '#ffd84a' : '#2a3050'; ctx.fillRect(x + 1, 16, 8, 10); ctx.fillStyle = on ? '#fff8c8' : '#3a4266'; ctx.fillRect(x + 4, 18, 2, 6); ctx.fillStyle = '#564c6e'; ctx.fillRect(x, 14, 10, 2); ctx.fillRect(x, 26, 10, 2); }
    text(ctx, `${sc.score}`, 342, 14, 2, '#ffd23a', null, 'right');
    sc.giants.forEach((g) => { if (g.state === 'walk' && g.need > 1) text(ctx, `${g.rings}/2`, g.x, g.y - 96, 2, '#ffd23a'); });
    if (sc.state === 'playing') {
      if (sc.pt < 16) { text(ctx, 'RING A GIANT, THEN RUN AWAY', 180, H - 122, 2, '#e2c477'); text(ctx, 'IT FALLS AWAY FROM YOU', 180, H - 104, 2, '#e2c477'); text(ctx, 'TWO TREES MAKE A TRIPWIRE', 180, H - 86, 2, '#8a92b4'); }
      if (ready) text(ctx, 'RUN AWAY TO PULL', clamp(P.x, 100, 260), P.y - 36, 2, '#fff1b0');
      if (sc.msg) text(ctx, sc.msg.str, 180, 44, 2, sc.msg.col);
      else if (last && last.kind === 'tree') { text(ctx, 'NEXT TREE: A TRIPWIRE', 180, 44, 2, '#fff1b0'); text(ctx, 'OR A GIANT: TIED TO THE TREE', 180, 62, 2, '#fff1b0'); }
      return;
    }
    ctx.fillStyle = `rgba(4,6,14,${Math.min(0.66, sc.endT)})`; ctx.fillRect(0, 0, 360, H);
    const won = sc.state === 'won', y = Math.round(H * 0.3);
    panel(ctx, 24, y, 312, 158);
    text(ctx, won ? 'DAWN!' : 'THE VILLAGE', 180, y + 14, 3, won ? '#ffd23a' : '#ec5550', null);
    text(ctx, won ? 'VILLAGE SAVED' : 'WENT DARK', 180, y + 42, 3, won ? '#ffd23a' : '#ec5550', null);
    text(ctx, `SCORE ${sc.score}`, 180, y + 78, 2, '#f4ecd8', null);
    text(ctx, `GIANTS DOWN ${sc.down}/${sc.TOTAL}`, 180, y + 98, 2, '#cbbfa8', null);
    text(ctx, `BEST PULL: ${sc.bestCombo} AT ONCE`, 180, y + 116, 2, '#cbbfa8', null);
    if (sc.endT > 1.2 && Math.sin(t * 4) > -0.3) text(ctx, 'TAP TO PLAY AGAIN', 180, y + 138, 2, '#ffffff', null);
  }

  window.TFPixel = { frame };
})();
