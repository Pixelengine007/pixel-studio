// Night Ferry — HD pixel art renderer, v2 (360 x 640 real pixels, no dithering).
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

  // ---------- static sky and water ----------
  const MOON = [268, 120];
  function buildStatic(W, H, ex, WL0) {
    const base = Buf(W, H), top = WL0 + ex;
    // twelve clean sky bands, deep blue at the top to a pale haze over the water
    for (let y = 0; y < top; y++) { const k = Math.min(11, Math.floor(Math.pow(y / top, 1.3) * 12)); for (let x = 0; x < W; x++) base.put(x, y, k < 6 ? 'skyA' : 'skyB', k < 6 ? k : k - 6); }
    for (let i = 0; i < 170; i++) { const x = hash(i, 1) * W, y = hash(i, 2) * (top - 90); base.put(x, y, 'white', hash(i, 3) < 0.3 ? 4 : 2, 0, 1); }
    const mx = MOON[0], my = MOON[1] + ex;
    // halo: each ring lifts the sky by one band
    [58, 44, 34].forEach((rr) => { for (let y = my - rr; y <= my + rr; y++) for (let x = mx - rr; x <= mx + rr; x++) { if (Math.hypot(x - mx, y - my) > rr || x < 0 || x >= W || y < 0) continue; const i = y * W + x; if (base.R[i] === RI.skyA || base.R[i] === RI.skyB) { const k = Math.min(11, (base.R[i] === RI.skyA ? base.S[i] : base.S[i] + 6) + 1); base.R[i] = k < 6 ? RI.skyA : RI.skyB; base.S[i] = k < 6 ? k : k - 6; } } });
    base.ell(mx, my, 26, 26, 'cream', (px, py, nx, ny) => {
      const crater = [[-9, -7, 6], [7, 9, 4.5], [5, -12, 3], [-4, 10, 2.5], [12, -2, 2.5]].some(([cx, cy, r]) => Math.hypot(px - (mx + cx), py - (my + cy)) < r);
      if (nx * nx + ny * ny > 0.82 && nx < -0.2) return 3;
      return crater ? 3 : nx < -0.5 ? 4 : 5;
    }, 0, 1);
    // long clouds, lit from above by the moon
    const cloud = (cx, cy, w, seed) => {
      const hAt = (x) => 4 + (1 - Math.pow(Math.abs(x) / w, 2)) * (8 + fbm((x + cx) * 0.06, seed) * 10);
      const pts = [];
      for (let x = -w; x <= w; x++) pts.push([cx + x, cy - hAt(x)]);
      for (let x = w; x >= -w; x--) pts.push([cx + x, cy + 2 + (1 - Math.pow(Math.abs(x) / w, 2)) * 3]);
      base.poly(pts, 'cloud', (px, py) => (py < cy - 3 ? (Math.hypot(px - mx, py - my) < 140 ? 3 : 2) : 1));
      for (let x = -w + 2; x < w - 2; x++) base.put(cx + x, Math.round(cy - hAt(x)), 'cloud', Math.hypot(cx + x - mx, cy - hAt(x) - my) < 160 ? 5 : 4);
    };
    cloud(80, 92 + ex, 70, 1); cloud(196, 176 + ex, 50, 2); cloud(320, 214 + ex, 60, 3); cloud(40, 246 + ex, 46, 4);
    // water: bright near the surface, falling to near-black at the bottom
    for (let y = top; y < H; y++) { const d = (y - top) / (H - top); const ramp = d < 0.16 ? 'water' : 'deep'; const sh = d < 0.04 ? 4 : d < 0.09 ? 3 : d < 0.16 ? 2 : Math.max(0, 5 - Math.floor((d - 0.16) * 7)); for (let x = 0; x < W; x++) base.put(x, y, ramp, sh); }
    // moonlight shafts slanting down through the water
    for (let k = 0; k < 4; k++) { const x0 = 190 + k * 38; for (let y = top + 10; y < H; y++) { const x = x0 - (y - top) * 0.45, w = 10 - k * 1.5; for (let xx = Math.floor(x); xx < x + w; xx++) { if (xx < 0 || xx >= W) continue; const i = y * W + xx; if (base.R[i] === RI.deep) base.S[i] = Math.min(5, base.S[i] + 1); } } }
    return base;
  }
  // ---------- scrolling tiles (720 wide, seamless) ----------
  function ridgeTile(width, h, baseY, amp, f, seed, ramp, sh, pines) {
    const t = Buf(width, h);
    const yAt = (x) => { const k = x / width; return baseY - (fbm(x * f, seed) * (1 - k) + fbm((x - width) * f, seed) * k) * amp; };
    for (let x = 0; x < width; x++) { const top = Math.floor(yAt(x)); for (let y = Math.max(0, top); y < h; y++) t.put(x, y, ramp, y < top + 2 ? sh + 1 : sh); }
    if (pines) for (let x = 3; x < width - 3; x += 4 + Math.floor(hash(x, seed) * 4)) { const top = yAt(x), ph = 9 + hash(x, seed + 1) * pines; for (let k = 0; k < ph; k++) { const w = Math.floor((k / ph) * ph * 0.32); for (let dx = -w; dx <= w; dx++) t.put(x + dx, top - ph + k + 1, ramp, dx > 0 && k < ph - 2 ? sh + 1 : sh); } }
    return t;
  }
  function villageTile(width, h, seed) { // a far shore with cottages whose windows glow
    const t = Buf(width, h);
    const yAt = (x) => { const k = x / width; return 34 - (fbm(x * 0.012, seed) * (1 - k) + fbm((x - width) * 0.012, seed) * k) * 22; };
    for (let x = 0; x < width; x++) { const top = Math.floor(yAt(x)); for (let y = top; y < h; y++) t.put(x, y, 'hill', y < top + 1 ? 3 : 2); }
    for (let x = 2; x < width - 2; x += 3 + Math.floor(hash(x, seed + 3) * 3)) { const g = yAt(x); if (hash(x, seed + 5) < 0.4) { const ph = 5 + hash(x, 9) * 9; for (let k = 0; k < ph; k++) { const w = Math.floor((k / ph) * ph * 0.3); for (let dx = -w; dx <= w; dx++) t.put(x + dx, g - ph + k, 'hill', 1); } } }
    [[120, 3], [148, 2], [430, 3], [452, 2], [470, 2], [610, 3]].forEach(([x, n], k) => {
      const g = Math.floor(yAt(x)), hw = 6 + (k % 2) * 2, hh = 8 + (k % 3);
      t.rect(x - hw, g - hh, hw * 2, hh + 2, 'hill', 1); t.poly([[x - hw - 2, g - hh], [x, g - hh - 7], [x + hw + 2, g - hh]], 'hill', 0);
      const win = (wx, wy) => { t.put(wx, wy, 'fire', 4, 0, 1); t.put(wx + 1, wy, 'fire', 4, 0, 1); t.put(wx, wy + 1, 'fire', 3, 0, 1); t.put(wx + 1, wy + 1, 'fire', 3, 0, 1); };
      win(x - hw + 2, g - hh + 3); if (n > 2) win(x + 2, g - hh + 3);
    });
    return t;
  }
  function mistTile(width, h, baseY, amp, seed, sh) {
    const t = Buf(width, h);
    for (let x = 0; x < width; x++) { const k = x / width, v = fbm(x * 0.018, seed) * (1 - k) + fbm((x - width) * 0.018, seed) * k, top = Math.floor(baseY - v * amp), bot = Math.floor(baseY + 4 + v * amp * 0.4); for (let y = Math.max(0, top); y < Math.min(h, bot); y++) t.put(x, y, 'fog', y <= top + 1 ? sh + 1 : sh); }
    return t;
  }
  function weedTile(width, h) {
    const t = Buf(width, h);
    for (let i = 0; i < 46; i++) {
      const x = hash(i, 4) * width, len = 50 + hash(i, 5) * 140, sw = (hash(i, 6) - 0.5) * 30, ramp = i % 3 ? 'reed' : 'lily';
      for (let k = 0; k < len; k++) { const q = k / len, px = x + sw * q * q; t.put(px, h - 1 - k, ramp, 1 + (k % 13 < 2 ? 1 : 0)); t.put(px + 1, h - 1 - k, ramp, 2); if (k % 17 === 8) { t.put(px + 2, h - 1 - k, ramp, 2); t.put(px + 3, h - 2 - k, ramp, 2); } }
    }
    for (let x = 0; x < width; x += 9 + Math.floor(hash(x, 12) * 14)) { const rw = 6 + hash(x, 13) * 12, rh = 4 + hash(x, 14) * 7; t.ell(x, h - 2, rw, rh, 'stone', (px, py, nx, ny) => (ny < -0.4 && nx > -0.2 ? 3 : 2)); }
    return t;
  }

  // ---------- characters ----------
  // the toad boatman; P maps local units (feet at 0,0, facing right) to the screen
  function toad(b, P, id, o) {
    const E = (dx, dy, rx, ry, ramp, sh) => { const [x, y] = P(dx, dy); b.ell(x, y, rx, ry, ramp, sh, id); };
    const step = o.step || 0, br = o.breath || 0;
    // webbed feet
    [[-9, step], [9, -step]].forEach(([fx, lift]) => { const up = Math.max(0, lift) * 2; E(fx, -2 - up, 7, 3, 'toad', (px, py, nx, ny) => (ny < -0.2 ? 4 : 2)); for (let k = -1; k <= 1; k++) b.put(...P(fx + 6 + k * 2, -1 - up), 'toad', 3, id); });
    // body and belly
    E(0, -20 - br, 22, 19 + br, 'toad');
    E(5, -16 - br, 14, 13 + br, 'belly', (px, py, nx, ny) => { const l = nx * 0.4 - ny * 0.7; const fold = Math.abs((ny * 13) % 4) < 0.6 && ny > -0.3; return fold ? 2 : l > 0.35 ? 5 : l > -0.2 ? 4 : 3; });
    // warts
    [[-14, -28], [-8, -34], [-16, -18], [-4, -26], [12, -36]].forEach(([wx, wy]) => { b.put(...P(wx, wy - br), 'toad', 5, id); b.put(...P(wx + 1, wy - br), 'toad', 4, id); b.put(...P(wx, wy + 1 - br), 'toad', 2, id); });
    // arm: lantern raised, or resting on the belly
    const hand = o.lantern ? [22, -40] : [18, -16];
    b.line(...P(10, -26 - br), ...P(hand[0], hand[1] - br), 'toad', (q) => (q < 0.5 ? 3 : 4), 6, id);
    E(hand[0], hand[1] - br, 4, 3.5, 'toad', 4);
    // head: wide and flat, with a big mouth line
    E(6, -40 - br, 21, 13, 'toad');
    for (let x = -10; x <= 24; x++) { const q = Math.pow((x - 7) / 17, 2), y = -35 - br + Math.round(q * -3) + (o.worried ? Math.round(q * 6) : 0); b.put(...P(x, y), 'toad', 0, id); b.put(...P(x, y + 1), 'belly', 4, id); }
    b.put(...P(19, -39 - br), 'red', 4, id); b.put(...P(20, -39 - br), 'red', 4, id); b.put(...P(-5, -39 - br), 'red', 3, id);
    // eyes: domes on top, lids droop when he's sleepy
    [[-2, -52], [14, -52]].forEach(([ex, ey]) => {
      E(ex, ey - br, 7, 6.5, 'toad');
      E(ex + 1, ey - br, 5, 4.6, 'white', (px, py, nx, ny) => (ny > 0.5 ? 3 : 5));
      const [px0, py0] = P(ex + 2, ey - br);
      b.rect(px0 - 1, py0 - 2, 3, 4, 'ink', 0, id); b.put(px0, py0 - 2, 'white', 5, id);
      if (o.sleepy || o.blink) for (let dx = -5; dx <= 6; dx++) for (let dy = -6; dy <= (o.blink ? 5 : -1); dy++) { if (Math.hypot(dx / 6, dy / 5.6) <= 1) b.put(...P(ex + dx + 1, ey + dy - br + 1), 'toad', dy === (o.blink ? 5 : -1) ? 2 : 3, id); }
      if (o.worried) { const [bx, by] = P(ex - 3, ey - 8 - br); b.line(bx, by + (ex < 0 ? 2 : 0), bx + 7, by + (ex < 0 ? 0 : 2), 'toad', 1, 1, id); }
    });
    // woven straw hat with a red band and a feather
    const hy = -60 - br;
    b.poly([P(-20, hy + 2), P(32, hy + 2), P(28, hy + 6), P(-16, hy + 6)], 'straw', (px, py) => (((px + py) & 3) === 0 ? 3 : py < P(0, hy + 4)[1] ? 4 : 2), id);
    E(6, hy - 4, 13, 8, 'straw', (px, py, nx, ny) => { if (ny > 0.55) return 1; const weave = ((px + py * 2) % 4) === 0; return weave ? 2 : ny < -0.4 ? 5 : nx > 0.3 ? 4 : 3; });
    const [rb0, rby] = P(-6, hy - 1), [rb1] = P(19, hy - 1); b.rect(Math.min(rb0, rb1), rby, Math.abs(rb1 - rb0), 3, 'red', (px, py) => (py === rby ? 4 : 3), id);
    b.line(...P(18, hy - 2), ...P(27, hy - 12), 'gold', 4, 2, id);
    b.outline(id);
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

  // ---------- one frame ----------
  let cache = null;
  const HULL = [[-166, -16], [-80, -9], [80, -9], [168, -22], [160, 0], [132, 24], [80, 34], [-80, 34], [-130, 28], [-158, 8]];
  const RIM = [[-166, -16], [-80, -9], [80, -9], [168, -22]];
  function frame(sc, ctx) {
    const V = window.Studio.view, W = 360, H = V.height, ex = V.extra, WL = sc.WATER + ex, t = sc.t;
    if (!cache || cache.H !== H) {
      cache = { H, base: buildStatic(W, H, ex, sc.WATER), far: ridgeTile(720, 170, 150, 100, 0.006, 1, 'hill', 2), village: villageTile(720, 50, 7), mid: ridgeTile(720, 70, 58, 16, 0.017, 2, 'pine', 1, 22), mistA: mistTile(720, 60, 40, 22, 3, 2), mistB: mistTile(720, 40, 24, 12, 5, 3), weeds: weedTile(720, 200), b: Buf(W, H), img: ctx.createImageData(W, H) };
      cache.out32 = new Uint32Array(cache.img.data.buffer);
    }
    const C = cache, b = C.b, base = C.base;
    b.R.set(base.R); b.S.set(base.S); b.EM.set(base.EM); b.L.fill(0); b.ID.fill(0); b.box = {};
    // twinkling stars
    for (let i = 0; i < 24; i++) { const x = hash(i, 41) * W, y = hash(i, 42) * (WL - 120); if (Math.sin(t * (1 + hash(i, 43) * 2) + i) > 0.6) { b.put(x, y, 'white', 5, 0, 1); b.put(x + 1, y, 'white', 2, 0, 1); b.put(x - 1, y, 'white', 2, 0, 1); b.put(x, y + 1, 'white', 2, 0, 1); b.put(x, y - 1, 'white', 2, 0, 1); } }
    // scenery, far to near
    blit(b, C.far, Math.floor(sc.dist * 0.05), WL - 170);
    blit(b, C.mistA, Math.floor(sc.dist * 0.09), WL - 86);
    blit(b, C.village, Math.floor(sc.dist * 0.12), WL - 66);
    blit(b, C.mid, Math.floor(sc.dist * 0.2), WL - 62);
    blit(b, C.mistB, Math.floor(sc.dist * 0.32), WL - 26);
    // the far shore: a stone landing with a lantern gate, arriving at the end
    const shoreX = 180 + (sc.TRIP - sc.dist) + 70;
    if (shoreX < 440) {
      b.poly([[shoreX - 10, WL + 2], [shoreX + 10, WL - 24], [shoreX + 50, WL - 36], [shoreX + 260, WL - 40], [shoreX + 260, WL + 2]], 'pine', (px, py) => (py < WL - 34 ? 2 : 1));
      b.rect(shoreX - 40, WL - 8, 80, 4, 'plank', (px, py) => (py === WL - 8 ? 4 : 2)); [-36, -14, 8, 30].forEach((dx) => b.rect(shoreX + dx, WL - 4, 3, 12, 'wood', 1));
      [50, 104].forEach((dx) => b.rect(shoreX + dx, WL - 92, 5, 60, 'wood', (px) => (px === shoreX + dx + 4 ? 4 : 2)));
      b.rect(shoreX + 40, WL - 100, 76, 6, 'red', (px, py) => (py === WL - 100 ? 4 : 2)); b.rect(shoreX + 46, WL - 88, 64, 3, 'red', 2);
      lantern(b, shoreX + 66, WL - 88, 60, 0.4); lantern(b, shoreX + 92, WL - 88, 61, 0.4);
    }
    // the water surface: drifting highlights and the moon's shimmering path
    for (let i = 0; i < 46; i++) { const x = ((hash(i, 8) * 720 - sc.dist * 1.0) % 720 + 720) % 720 - 180, y = WL + 3 + Math.floor(hash(i, 9) * 52), w = 4 + Math.floor(hash(i, 10) * 10); b.rect(x, y, w, 1, 'water', y < WL + 14 ? 5 : 4); }
    for (let i = 0; i < 20; i++) { const y = WL + 3 + i * 3, w = 8 + i * 1.6 + hash(i, 11) * 6, sh = Math.round(Math.sin(t * 2 + i * 1.7) * 2); b.rect(MOON[0] - w / 2 + sh, y, w, 1, 'cream', i < 7 ? 4 : i < 13 ? 3 : 2, 0, 1); }
    // underwater: weeds and stones, fish, specks of light
    blit(b, C.weeds, Math.floor(sc.dist), H - 200);
    for (let i = 0; i < 8; i++) {
      const dir = i % 2 ? 1 : -1, sp = 8 + hash(i, 20) * 14, y = WL + 80 + hash(i, 21) * 150 + Math.sin(t * 0.8 + i) * 4;
      const x = ((hash(i, 22) * 460 + dir * t * sp - sc.dist * 0.6) % 460 + 460) % 460 - 50, len = 6 + Math.floor(hash(i, 23) * 7);
      b.ell(x, y, len, len * 0.36, 'water', (px, py, nx, ny) => (ny < -0.2 ? 4 : 2)); b.put(x + dir * (len - 2), y - 1, 'white', 3);
      const tx = x - dir * (len + 1); b.put(tx, y, 'water', 3); for (let k = 1; k <= 3; k++) { b.put(tx - dir * k, y - k, 'water', 3); b.put(tx - dir * k, y + k, 'water', 3); }
    }
    for (let i = 0; i < 16; i++) { const x = ((hash(i, 30) * 380 - sc.dist * 0.8 + Math.sin(t * 0.5 + i) * 10) % 380 + 380) % 380 - 10, y = WL + 50 + hash(i, 31) * 200 - (t * 6 + i * 20) % 30; if (Math.sin(t * 2 + i * 1.3) > 0.2) b.put(x, y, 'sp1', 3, 0, 1); }
    // the Deep One: a lumpy head, slow tentacles, one great eye
    const d = sc.deep;
    if (d.phase !== 'off') {
      const dx = 180 + d.side * 120, dy = d.y + ex + 20;
      for (let k = 0; k < 6; k++) {
        const a0 = Math.PI * (0.15 + k * 0.14);
        let px = dx + Math.cos(a0) * 70, py = dy + Math.sin(a0) * 40;
        for (let s2 = 0; s2 < 60; s2++) { const q = s2 / 60, ang = a0 + Math.sin(t * 1.4 + k + q * 4) * 0.6 * q; px += Math.cos(ang) * 1.6; py += Math.sin(ang) * 1.2 + 0.4; const w = Math.max(1, Math.round(7 * (1 - q))); for (let ww = 0; ww < w; ww++) b.put(px, py + ww, 'deep', ww === 0 ? 3 : 2); if (s2 % 9 === 4 && w > 2) b.put(px, py + w - 1, 'deep', 4); }
      }
      b.ell(dx, dy, 92, 62, 'deep', (px, py, nx, ny) => { const bump = Math.sin(px * 0.2) * Math.cos(py * 0.25) > 0.75; return ny < -0.7 ? 4 : bump ? 3 : ny < -0.2 ? 3 : 2; });
      if (d.eye > 0.05) {
        const open = d.eye, ey = dy - 30, ex2 = dx - d.side * 4;
        b.ell(ex2, ey, 24, 15, 'deep', 4);
        b.ell(ex2, ey, 21, Math.max(1, 12 * open), 'cream', (px, py, nx, ny) => (ny < -0.45 ? 5 : ny > 0.45 ? 2 : 4), 0, 1);
        b.ell(ex2 - d.side * 4, ey, 7, Math.max(1, 10 * open), 'gold', (px, py, nx, ny) => (Math.abs(nx) < 0.3 ? 0 : nx * -d.side > 0.3 ? 4 : 3), 0, 1);
        b.put(ex2 + 8, ey - 6, 'white', 5, 0, 1); b.put(ex2 + 9, ey - 6, 'white', 5, 0, 1);
        b.light(ex2, ey, 54, 1.6 * open);
      }
    }
    sc.parts.forEach((p) => { if (p.kind === 'bubble') { b.put(p.x, p.y + ex, 'water', 5); b.put(p.x + 1, p.y + ex - 1, 'white', 3); } });
    // ---- the boat: props, toad and spirits first, then the hull in front of their feet ----
    const th = sc.viewTheta, [ox, oy0] = sc.boatOrigin(), oy = oy0 + ex - 12, c = Math.cos(th), s = Math.sin(th);
    const R = (x, y) => [ox + c * x - s * y, oy + s * x + c * y];
    const prop = (u, draw) => { const [x, y] = R(u * 132, -9); draw(x, y); };
    prop(0.62, (x, y) => { b.ell(x, y - 3, 9, 4, 'rope', (px, py, nx, ny) => ((Math.round(nx * 9) & 1) ? 4 : 2), 6); b.ell(x, y - 3, 4, 2, 'rope', 1, 6); b.outline(6); });
    prop(-0.55, (x, y) => { b.poly([[x - 7, y - 12], [x + 7, y - 12], [x + 5, y], [x - 5, y]], 'stone', (px) => (px > x + 2 ? 4 : 3), 7); b.rect(x - 7, y - 13, 15, 2, 'stone', 5, 7); b.outline(7); });
    sc.spirits.forEach((sp, i) => {
      if (sp.state !== 'deck') return;
      const shake = sp.mood === 'scared' || (sp.edgeT || 0) > 0 ? Math.round(Math.sin(t * 40)) : 0;
      const [x, y] = R(sp.u * 132 + shake + sp.lean * 8, -8 - sp.r * 0.85 + Math.round(Math.sin(sp.bob) * 1.5));
      spirit(b, x, y, sp.r, SPR[i], (sp.edgeT || 0) > 0 ? 'scared' : sp.mood, 10 + i, t, i * 1.7);
      if ((sp.edgeT || 0) > 0 && Math.sin(t * 18) > -0.3) { const wy = y - sp.r - 22; b.rect(x - 3, wy - 1, 7, 14, 'ink', 0, 0, 1); b.rect(x - 1, wy, 3, 8, 'red', 5, 0, 1); b.rect(x - 1, wy + 10, 3, 2, 'red', 5, 0, 1); }
    });
    const tu = sc.uw * 132, moving = Math.abs(sc.toadV || 0) > 0.05, step = moving ? Math.sin(sc.wrenStep * 2) : 0;
    const worried = Math.abs(sc.theta) > 0.2, br = Math.round(Math.sin(t * 2.2));
    const face = sc.face || 1, TP = (dx, dy) => R(tu + dx * face, -8 + dy - (moving ? Math.round(Math.abs(step) * 2) : 0));
    toad(b, TP, 2, { step, breath: br, sleepy: !sc.lantern && !worried, lantern: sc.lantern, worried, blink: (t % 3.7) < 0.12 });
    if (sc.lantern) { const [lx, ly] = TP(22, -42 - br); b.line(lx, ly, lx + 2 * face, ly - 16, 'wood', 2, 2, 3); lantern(b, lx + 2 * face, ly - 18, 3, 1); b.outline(3); }
    // hull: planks with seams, ribs, nails, a gunwale along the top, bow post and stern pole
    b.poly(HULL.map(([x, y]) => R(x, y)), 'plank', (px, py) => {
      const lx = (px - ox) * c + (py - oy) * s, ly = -(px - ox) * s + (py - oy) * c;
      if (Math.round(ly) % 8 === 0) return 1;
      if (Math.abs(((lx + 1000) % 40) - 20) < 0.6 && ly > -4) return 2;
      return ly < -4 ? 4 : Math.floor((ly + 12) / 8) % 2 ? 3 : 2;
    }, 4);
    for (let k = -3; k <= 3; k++) { b.put(...R(k * 40, -1), 'cream', 2, 4); b.put(...R(k * 40, 15), 'cream', 2, 4); }
    b.outline(4);
    for (let k = 0; k < RIM.length - 1; k++) { const [ax, ay] = RIM[k], [bx2, by2] = RIM[k + 1]; b.line(...R(ax, ay + 1), ...R(bx2, by2 + 1), 'wood', 4, 3, 4); b.line(...R(ax, ay - 1), ...R(bx2, by2 - 1), 'cream', 3, 1, 4); }
    b.line(...R(160, -22), ...R(170, -44), 'wood', 3, 3, 8); const [fx, fy] = R(170, -48); b.ell(fx, fy, 4, 5, 'wood', undefined, 8); b.put(fx + 1, fy - 1, 'gold', 4, 8, 1); b.outline(8);
    b.line(...R(-150, -14), ...R(-158, -98), 'wood', 3, 3, 9); b.line(...R(-158, -98), ...R(-132, -102), 'wood', 3, 3, 9); b.outline(9);
    const [sx, sy] = R(-134, -96); lantern(b, sx, sy, 5, 0); b.outline(5);
    // the lower hull sits in the water: solid water over it, then a bright waterline
    for (let y = WL + 6; y < Math.min(H, WL + 52); y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (b.ID[i] === 4) { b.R[i] = base.R[i]; b.S[i] = Math.max(0, base.S[i] - (y < WL + 9 ? 1 : 2)); b.EM[i] = 0; b.ID[i] = 0; } }
    for (let x = 4; x < 356; x++) if ((x >> 1) % 3) b.put(x, WL + 5 + Math.round(Math.sin(x * 0.2 + t * 2)), 'water', 5);
    // the stern lantern's reflection
    for (let i = 0; i < 10; i++) b.rect(sx - 3 + Math.round(Math.sin(t * 3 + i) * 2), WL + 14 + i * 4, 6 - (i >> 2), 1, 'fire', i < 4 ? 4 : 3, 0, 1);
    // spirits in the water, being taken, or home on the shore
    sc.spirits.forEach((sp, i) => {
      if (sp.state === 'water') { spirit(b, sp.wx, sp.wy + ex - sp.r * 0.2, sp.r, SPR[i], 'scared', 20 + i, t, i); for (let k = -sp.r - 3; k <= sp.r + 3; k++) if (Math.abs(k) > sp.r * 0.6) b.put(sp.wx + k, sp.wy + ex + 3, 'water', 5); }
      if (sp.state === 'grab' && sp.waterT < 0.8) spirit(b, sp.wx, sp.wy + ex, sp.r * (1 - sp.waterT * 0.8), SPR[i], 'scared', 20 + i, t, i);
      if (sp.state === 'home') { const k = Math.min(1, sp.homeT / 0.6), x = 300 + k * (shoreX + 20 + i * 22 - 300), y = WL - 52 - Math.sin(k * Math.PI) * 30; spirit(b, x, y, sp.r * 0.85, SPR[i], 'happy', 30 + i, t, i); }
    });
    sc.parts.forEach((p) => { if (p.kind === 'spark') { const sh = p.life > 0.5 ? 5 : p.life > 0.25 ? 4 : 3, X = p.x, Y = p.y + ex; b.put(X, Y, SPR[p.col], sh, 0, 1); if (p.life > 0.4) { b.put(X + 1, Y, SPR[p.col], sh - 1, 0, 1); b.put(X - 1, Y, SPR[p.col], sh - 1, 0, 1); b.put(X, Y + 1, SPR[p.col], sh - 1, 0, 1); b.put(X, Y - 1, SPR[p.col], sh - 1, 0, 1); } } });
    sc.parts.forEach((p) => { if (p.kind === 'drop') { b.put(p.x, p.y + ex, 'white', 5, 0, 1); b.put(p.x, p.y + ex + 1, 'water', 5, 0, 1); } });
    sc.ripples.forEach((r) => { const w = Math.round(r.r * 1.8); if (r.life > 0.2) { b.rect(r.x - w, r.y + ex + 2, Math.max(2, w * 0.7), 1, 'water', 5); b.rect(r.x + w * 0.3, r.y + ex + 2, Math.max(2, w * 0.7), 1, 'water', 5); } });
    // a jumping fish, fireflies, lily pads and foreground reeds
    if (sc.fish) { const f = sc.fish, k = f.t / 1.3, x = f.x + f.side * k * 30, y = WL - Math.sin(k * Math.PI) * 50; b.ell(x, y, 8, 3.4, 'white', (px, py, nx, ny) => (ny < 0 ? 4 : 2), 50); const tx = x - f.side * 9; for (let q = 0; q < 4; q++) { b.put(tx - f.side * q, y - q, 'white', 3, 50); b.put(tx - f.side * q, y + q, 'white', 3, 50); } b.outline(50); }
    sc.fireflies.forEach((f) => { const x = f.x + Math.sin(f.ph * 1.7) * 8, y = f.y + ex + Math.cos(f.ph * 1.3) * 6; if (Math.sin(f.ph * 5) > -0.4) { b.put(x, y, 'gold', 5, 0, 1); b.put(x + 1, y, 'gold', 3, 0, 1); b.put(x - 1, y, 'gold', 3, 0, 1); b.light(x, y, 14, 1.4); } });
    for (let i = 0; i < 12; i++) { const x = ((i * 47 - sc.dist * 0.9) % 380 + 380) % 380 - 10, y = 230 + ex + ((i * 73) % 150) + Math.sin(t + i) * 6; if (Math.sin(t * 3 + i) > 0) { b.put(x, y, 'gold', 4, 0, 1); b.light(x, y, 10, 1); } }
    for (let i = 0; i < 5; i++) { const x = ((hash(i, 60) * 900 - sc.dist * 1.35) % 900 + 900) % 900 - 100, y = WL + 30 + hash(i, 61) * 30; b.ell(x, y, 14, 4, 'lily', (px, py, nx, ny) => (ny < -0.2 ? 4 : 3)); if (i % 2) { b.ell(x + 4, y - 3, 3, 2.4, 'sp2', 4, 0, 1); b.put(x + 4, y - 4, 'sp2', 5, 0, 1); } }
    const reeds = (x0, n, seed) => { for (let k = 0; k < n; k++) { const x = x0 + k * 5 + hash(k, seed) * 4, h = 120 + hash(k, seed + 1) * 130, lean = (hash(k, seed + 2) - 0.5) * 30 + Math.sin(t * 1.2 + k) * 3; for (let q = 0; q < h; q++) { const f = q / h, px = x + lean * f * f; b.put(px, H - 1 - q, 'reed', 1); b.put(px + 1, H - 1 - q, 'reed', 2); } if (k % 2 === 0) b.ell(x + lean, H - h - 4, 2.4, 9, 'wood', 2); } };
    reeds(-6, 6, 70); reeds(330, 7, 80);
    // light: sprites and water catch it in clean steps, the sky stays clean
    const R8 = b.R, S8 = b.S, EM = b.EM, L = b.L, ID = b.ID, out = C.out32;
    for (let i = 0; i < R8.length; i++) {
      const r = R8[i]; if (r < 0) { out[i] = 0xff000000; continue; }
      let sh;
      if (EM[i] === 2) sh = 0; else if (EM[i]) sh = S8[i];
      else { const lit = ID[i] ? L[i] : r === RI.water ? L[i] * 0.6 : 0; sh = S8[i] + (ID[i] ? -1 : 0) + Math.floor(lit); }
      sh = sh < 0 ? 0 : sh > 5 ? 5 : sh; out[i] = COL32[r * 6 + sh];
    }
    if (sc.shake > 0.5) {
      const dx = Math.round(Math.sin(t * 61) * sc.shake * 0.7), dy = Math.round(Math.cos(t * 47) * sc.shake * 0.7);
      if (dx || dy) { const tmp = C.tmp || (C.tmp = new Uint32Array(out.length)); tmp.set(out); for (let y = 0; y < H; y++) { const sy = clamp(y - dy, 0, H - 1) * W; for (let x = 0; x < W; x++) out[y * W + x] = tmp[sy + clamp(x - dx, 0, W - 1)]; } }
    }
    ctx.putImageData(C.img, 0, 0);
    ui(sc, ctx, ex);
  }

  function spiritIcon(ctx, x, y, i, state, t) {
    const ramp = RAMP[SPR[i]];
    if (state === 'lost' || state === 'grab') { ctx.fillStyle = '#04030a'; ctx.fillRect(x, y - 1, 10, 12); ctx.fillRect(x - 1, y, 12, 10); ctx.fillStyle = '#1a2040'; ctx.fillRect(x + 1, y, 8, 10); ctx.fillRect(x, y + 1, 10, 8); ctx.fillStyle = '#3a4266'; ctx.fillRect(x + 2, y + 4, 2, 1); ctx.fillRect(x + 6, y + 4, 2, 1); return; }
    if (state === 'water' && Math.sin(t * 12) < 0) return;
    ctx.fillStyle = '#04030a'; ctx.fillRect(x, y - 1, 10, 12); ctx.fillRect(x - 1, y, 12, 10);
    ctx.fillStyle = ramp[3]; ctx.fillRect(x + 1, y, 8, 10); ctx.fillRect(x, y + 1, 10, 8);
    ctx.fillStyle = ramp[5]; ctx.fillRect(x + 5, y + 1, 3, 2);
    ctx.fillStyle = '#04030a'; ctx.fillRect(x + 2, y + 4, 2, 3); ctx.fillRect(x + 6, y + 4, 2, 3);
  }
  function ui(sc, ctx, ex) {
    const t = sc.t;
    if (sc.state === 'title') {
      ctx.fillStyle = 'rgba(4,6,18,0.5)'; ctx.fillRect(0, 0, 360, 640 + ex);
      text(ctx, 'NIGHT', 180, 120 + ex, 6, '#f4ecd8'); text(ctx, 'FERRY', 180, 172 + ex, 6, '#ffd23a');
      text(ctx, 'CARRY THE LITTLE LIGHTS', 180, 236 + ex, 2, '#cbbfa8'); text(ctx, 'ACROSS THE LAKE', 180, 256 + ex, 2, '#cbbfa8');
      if (Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO BEGIN', 180, 580 + ex, 2, '#f4ecd8');
      return;
    }
    const top = Math.max(6, 18 - ex);
    panel(ctx, 12, top, 336, 40);
    const k = Math.min(1, sc.dist / sc.TRIP), x0 = 26, x1 = 182;
    ctx.fillStyle = '#3a4472'; ctx.fillRect(x0, top + 22, x1 - x0, 2);
    ctx.fillStyle = '#8a92b4'; ctx.fillRect(x0, top + 22, Math.round((x1 - x0) * k), 2);
    const bx = Math.round(x0 + (x1 - x0) * k);
    ctx.fillStyle = '#04030a'; ctx.fillRect(bx - 7, top + 14, 15, 8); ctx.fillStyle = '#9a5230'; ctx.fillRect(bx - 6, top + 16, 13, 4); ctx.fillStyle = '#ffd84a'; ctx.fillRect(bx - 5, top + 11, 2, 4);
    ctx.fillStyle = '#c42636'; ctx.fillRect(x1 + 2, top + 10, 10, 2); ctx.fillStyle = '#82472e'; ctx.fillRect(x1 + 3, top + 12, 2, 12); ctx.fillRect(x1 + 9, top + 12, 2, 12);
    sc.spirits.forEach((s, i) => spiritIcon(ctx, 216 + i * 25, top + 15, i, s.state, t));
    if (sc.hintT > 0 && sc.state === 'playing') { panel(ctx, 64, 548 + ex, 232, 46); text(ctx, 'DRAG THE TOAD', 180, 557 + ex, 2, '#f4ecd8', null); text(ctx, 'KEEP THE BOAT LEVEL', 180, 575 + ex, 2, '#ffd23a', null); }
    sc.popups.forEach((p) => text(ctx, p.str, clamp(p.x, 60, 300), p.y + ex - 30 - (1.4 - p.life) * 12, 2, '#ffe2c0'));
    if (sc.state === 'won' || sc.state === 'lost') {
      ctx.fillStyle = `rgba(4,6,18,${Math.min(0.6, sc.endT)})`; ctx.fillRect(0, 0, 360, 640 + ex);
      panel(ctx, 30, 170 + ex, 300, 150);
      const won = sc.state === 'won', all = sc.delivered === 5, col = won ? '#ffd23a' : '#ec5550';
      text(ctx, won ? (all ? 'EVERY LIGHT' : 'SAFE ACROSS') : 'THE LAKE', 180, 190 + ex, 3, col, null);
      if (!won || all) text(ctx, won ? 'IS HOME!' : 'KEPT THEM', 180, 218 + ex, 3, col, null);
      sc.spirits.forEach((s, i) => spiritIcon(ctx, 118 + i * 26, 252 + ex, i, s.state === 'home' ? 'deck' : 'lost', t));
      text(ctx, `${sc.delivered} OF 5 MADE IT`, 180, 284 + ex, 2, '#cbbfa8', null);
      if (sc.endT > 1.2 && Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO ROW AGAIN', 180, 580 + ex, 2, '#f4ecd8');
    }
  }

  window.NFPixel = { frame };
})();
