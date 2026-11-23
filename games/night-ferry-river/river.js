// Night Ferry: River Run — HD pixel art renderer, top-down (360 x 640 real pixels, no dithering).
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

  // ---------- the river, seen from above ----------
  let cache = null;
  const HULL = [[0, -68], [11, -58], [20, -42], [25, -20], [26, 4], [25, 28], [20, 48], [11, 60], [0, 63], [-11, 60], [-20, 48], [-25, 28], [-26, 4], [-25, -20], [-20, -42], [-11, -58]];
  const BANKS = new Set();
  function frame(sc, ctx) {
    const W = 360, H = sc.H, t = sc.t;
    if (!cache || cache.H !== H) {
      cache = { H, b: Buf(W, H), img: ctx.createImageData(W, H) };
      cache.out32 = new Uint32Array(cache.img.data.buffer);
      ['grass', 'reed', 'stone', 'pine'].forEach((k) => BANKS.add(RI[k]));
    }
    const C = cache, b = C.b, R8 = b.R, S8 = b.S;
    b.EM.fill(0); b.L.fill(0); b.ID.fill(0); b.box = {};
    // water and banks, row by row
    const rows = [];
    for (let y = 0; y < H; y++) {
      const wy = sc.worldY(y), c = sc.cx(wy), w = sc.hw(wy), L = c - w, Rr = c + w; rows.push([L, Rr, wy]);
      for (let x = 0; x < W; x++) {
        const i = y * W + x, dl = x - L, dr = Rr - x;
        if (dl < 0 || dr < 0) {
          const d = dl < 0 ? -dl : -dr;
          if (d < 2) { R8[i] = RI.stone; S8[i] = 3; }
          else if (d < 5) { R8[i] = RI.stone; S8[i] = 2; }
          else { R8[i] = RI.grass; S8[i] = d < 9 ? 2 : 1; }
        } else {
          const e = Math.min(dl, dr); R8[i] = RI.water; S8[i] = e < 3 ? 5 : e < 7 ? 4 : e < 22 ? 3 : e < 60 ? 2 : 1;
        }
      }
    }
    const SY = (wy) => sc.screenY(wy);
    // flow ripples fixed to the water, so speed reads: short curved dashes
    const w0 = Math.floor(sc.worldY(H) / 22), w1 = Math.ceil(sc.worldY(0) / 22);
    for (let k = w0; k <= w1; k++) for (let j = 0; j < 2; j++) {
      const wy = k * 22 + hash(k, j + 5) * 22, c = sc.cx(wy), w = sc.hw(wy), x = Math.round(c + (hash(k, j + 9) - 0.5) * 2 * (w - 16)), y = Math.round(SY(wy)), len = 3 + Math.floor(hash(k, j + 12) * 4);
      for (let q = -len; q <= len; q++) b.put(x + q, y + (Math.abs(q) === len ? 1 : 0), 'water', Math.abs(q) < 2 ? 4 : 3);
    }
    // reed clumps, lily pads, trees and shrine lanterns along the banks
    const c0 = Math.floor(sc.worldY(H + 60) / 34), c1 = Math.ceil(sc.worldY(-60) / 34);
    for (let k = c0; k <= c1; k++) {
      const wy = k * 34, y = SY(wy), c = sc.cx(wy), w = sc.hw(wy);
      [-1, 1].forEach((side, si) => {
        const edge = c + side * w;
        if (hash(k, 20 + si) < 0.55) { const rx = edge - side * (3 + hash(k, 22 + si) * 6); for (let n = 0; n < 6; n++) { const px = rx + (hash(k * 7 + n, 30 + si) - 0.5) * 10, ph = 4 + hash(k * 3 + n, 31) * 6; for (let q = 0; q < ph; q++) b.put(px, y - q, 'reed', 3 + (q === ph - 1 ? 1 : 0)); } }
        if (hash(k, 40 + si) < 0.3) { const lx = edge - side * (16 + hash(k, 42) * 26), ly = y + hash(k, 43) * 20; b.ell(lx, ly, 7, 5, 'lily', (px, py, nx, ny) => (nx > 0.1 && Math.abs(ny) < 0.2 ? -1 : ny < -0.3 ? 4 : 3)); if (hash(k, 44) < 0.4) { b.put(lx - 1, ly - 1, 'sp2', 5, 0, 1); b.put(lx, ly - 1, 'sp2', 4, 0, 1); b.put(lx - 1, ly, 'sp2', 4, 0, 1); } }
        if (hash(k, 50 + si) < 0.62) {
          const tx = edge + side * (20 + hash(k, 52 + si) * 34), rr = 11 + hash(k, 54 + si) * 9, ty = y + (hash(k, 56) - 0.5) * 16, id = 100 + ((k * 2 + si) & 63);
          b.ell(tx - 4, ty + 6, rr, rr * 0.8, 'grass', 0);
          b.ell(tx, ty, rr, rr, 'pine', (px, py, nx, ny) => { const ring = Math.floor(Math.hypot(nx, ny) * 3); const l = nx * 0.5 - ny * 0.7; return Math.min(5, (l > 0.35 ? 3 : l > -0.2 ? 2 : 1) + (ring === 1 && ((px + py) % 5 === 0) ? 1 : 0)); }, id);
          b.outline(id);
        }
        if (((k % 17) + 17) % 17 === (si ? 5 : 12)) { const lx = edge + side * 10, id = 200 + si; b.rect(lx - 1, y - 10, 3, 12, 'wood', 2, id); lantern(b, lx, y - 22, id, 0.6); b.outline(id); }
      });
    }
    for (let k = Math.floor(sc.worldY(H) / 12); k <= Math.ceil(sc.worldY(0) / 12); k++) for (let j = 0; j < 4; j++) {
      const wy = k * 12 + hash(k, j + 80) * 12, side = j % 2 ? 1 : -1, x = Math.round(sc.cx(wy) + side * (sc.hw(wy) + 12 + hash(k, j + 84) * 60)), y = Math.round(SY(wy));
      if (x < 0 || x >= W || hash(k, j + 88) < 0.5) continue;
      const i0 = y * W + x; if (i0 < 0 || i0 >= R8.length || R8[i0] !== RI.grass) continue;
      b.put(x, y, 'grass', 3); b.put(x - 1, y - 1, 'grass', 3); b.put(x + 1, y - 2, 'grass', 4); b.put(x, y + 1, 'grass', 2);
    }
    // fireflies over the banks
    for (let i = 0; i < 14; i++) { const wy = sc.dist - 200 + ((hash(i, 70) * 1400 + t * 20) % 1400) - 400, c = sc.cx(wy), side = i % 2 ? 1 : -1, x = c + side * (sc.hw(wy) + 8 + hash(i, 71) * 30) + Math.sin(t * 1.3 + i) * 6, y = SY(wy) + Math.cos(t * 1.7 + i) * 5; if (Math.sin(t * 3 + i * 1.7) > -0.2) { b.put(x, y, 'gold', 5, 0, 1); b.light(x, y, 12, 1.2); } }
    // the harbour pier at the end of the river
    const pierY = SY(sc.TRIP + 230);
    if (pierY > -80 && pierY < H + 40) {
      const c = sc.cx(sc.TRIP + 230), w = sc.hw(sc.TRIP + 230) + 30;
      b.rect(c - w, pierY - 8, w * 2, 16, 'plank', (px, py) => (py === Math.round(pierY - 8) ? 4 : (px % 9 === 0 ? 1 : 3)), 90);
      for (let x = c - w + 10; x < c + w; x += 34) b.rect(x, pierY + 8, 4, 6, 'wood', 1, 90);
      b.outline(90);
      [-60, 60].forEach((dx, n) => { const lx = c + dx; b.rect(lx - 2, pierY - 30, 4, 24, 'red', 3, 91 + n); lantern(b, lx, pierY - 44, 91 + n, 0.8); b.outline(91 + n); });
    }
    // obstacles
    let oid = 20;
    sc.obstacles.forEach((o) => {
      const y = SY(o.wy); if (y < -60 || y > H + 60) return;
      if (o.kind === 'rock') {
        for (let a = 0; a < 24; a++) { const ang = Math.PI * (1.05 + a / 24 * 0.9), fr = o.r + 3 + Math.sin(t * 6 + a) * 0.8; b.put(o.x + Math.cos(ang) * fr, y + Math.sin(ang) * fr * 0.85, 'white', a % 3 ? 3 : 4); }
        for (let q = 0; q < 18; q++) { b.put(o.x - o.r * 0.6 - q * 0.6, y + o.r * 0.6 + q, 'water', 4); b.put(o.x + o.r * 0.6 + q * 0.6, y + o.r * 0.6 + q, 'water', 4); }
        const id = oid++;
        b.ell(o.x, y, o.r, o.r * 0.85, 'stone', (px, py, nx, ny) => { const l = nx * 0.45 - ny * 0.8; const crack = Math.abs(nx + ny * 0.4 - 0.1) < 0.06; return crack ? 1 : l > 0.5 ? 4 : l > 0 ? 3 : l > -0.5 ? 2 : 1; }, id);
        b.ell(o.x - o.r * 0.3, y - o.r * 0.35, o.r * 0.4, o.r * 0.25, 'lily', (px, py, nx, ny) => (ny < 0 ? 3 : 2), id);
        b.outline(id);
      } else if (o.kind === 'log') {
        const id = oid++, y0 = Math.round(y - o.h / 2);
        for (let x = Math.round(o.x0); x < o.x1; x++) { b.put(x, y0 - 2, 'white', x % 4 ? 3 : 4); b.put(x, y0 + o.h + 1, 'water', 4); }
        b.rect(o.x0, y0, o.x1 - o.x0, o.h, 'wood', (px, py) => { const r = py - y0; if (r === 0 || r === 1) return 4; if (r >= o.h - 2) return 1; return (Math.floor(px / 7 + r * 0.3) % 5 === 0) ? 2 : 3; }, id);
        const open = o.x0 > sc.cx(o.wy) - sc.hw(o.wy) ? o.x0 : o.x1;
        b.ell(open, y, 3, o.h / 2, 'cream', (px, py, nx, ny) => (Math.hypot(nx, ny) > 0.66 ? 3 : Math.hypot(nx, ny) > 0.33 ? 2 : 3), id);
        b.outline(id);
      } else if (o.kind === 'tentacle' && o.x !== null) {
        if (o.phase === 'warn') {
          const k = Math.min(1, o.t / 1.2);
          b.ell(o.x, y, o.r * (0.6 + k * 0.9), o.r * (0.5 + k * 0.7), 'tent', 1);
          for (let n = 0; n < 3; n++) { const rr = ((o.t * 22 + n * 9) % 26) + 4; for (let a = 0; a < 20; a++) if ((a + n) % 3) b.put(o.x + Math.cos(a / 20 * 6.283) * rr, y + Math.sin(a / 20 * 6.283) * rr * 0.8, 'white', 3, 0, 1); }
          if (Math.sin(t * 12) > 0) { b.rect(o.x - 1, y - o.r - 24, 3, 9, 'red', 5, 0, 1); b.rect(o.x - 1, y - o.r - 12, 3, 3, 'red', 5, 0, 1); }
        } else if (o.phase === 'up') {
          const id = oid++, rise = Math.min(1, o.t / 0.3);
          for (let a = 0; a < 26; a++) { const ang = a / 26 * 6.283, fr = o.r + 4 + Math.sin(t * 8 + a) * 1.2; b.put(o.x + Math.cos(ang) * fr, y + Math.sin(ang) * fr * 0.8, 'white', a % 2 ? 3 : 4); }
          for (let s2 = 0; s2 < 14; s2++) {
            const q = s2 / 14, ang = t * 2.4 + q * 5.5, rad = (1 - q) * 10 * rise, px = o.x + Math.cos(ang) * rad, py = y - q * 26 * rise + Math.sin(ang) * rad * 0.6, rr = Math.max(2, o.r * (1 - q * 0.8) * (0.7 + rise * 0.3));
            b.ell(px, py, rr, rr * 0.9, 'tent', (qx, qy, nx, ny) => { const l = nx * 0.5 - ny * 0.7; return l > 0.4 ? 4 : l > -0.2 ? 3 : 2; }, id);
            if (s2 % 3 === 1 && rr > 4) { b.put(px - rr * 0.4, py + rr * 0.3, 'cream', 3, id); b.put(px + rr * 0.3, py + rr * 0.4, 'cream', 3, id); }
          }
          b.outline(id);
        }
      }
    });
    // the ferry
    const ang = clamp(Math.atan2(sc.vx, Math.max(60, sc.speed)) * 0.7, -0.32, 0.32), ca = Math.cos(ang), sa = Math.sin(ang), bx = sc.x, by = sc.BOAT_SY;
    const P = (lx, ly) => [bx + ca * lx - sa * ly, by + sa * lx + ca * ly];
    // wake and shadow
    for (let q = 0; q < 70; q += 2) { const spread = 22 + q * 0.5, wob = Math.sin(t * 7 + q * 0.4); [-1, 1].forEach((s) => { const [wx, wy2] = P(s * (spread + wob), 58 + q); b.put(wx, wy2, 'white', q < 24 ? 3 : 2); }); }
    b.poly(HULL.map(([x, y]) => P(x + 4, y + 6)), 'water', 0);
    for (let a = -4; a <= 4; a++) { const [fx, fy] = P(a * 2.4, -70 - Math.abs(a) * 1.5 + Math.sin(t * 9 + a)); b.put(fx, fy, 'white', 4); }
    // hull, floor planks, thwarts
    b.poly(HULL.map(([x, y]) => P(x, y)), 'wood', 4, 4);
    b.poly(HULL.map(([x, y]) => P(x * 0.8, y * 0.9 + 2)), 'plank', (px, py) => { const lx = (px - bx) * ca + (py - by) * sa; return Math.round(lx + 40) % 7 === 0 ? 1 : 2; }, 4);
    [-35, -16, 23].forEach((ly) => b.poly([P(-19, ly - 1), P(19, ly - 1), P(19, ly + 2), P(-19, ly + 2)], 'wood', 3, 4));
    b.outline(4, false);
    // spirits on board
    sc.spirits.forEach((s, i) => {
      if (s.state !== 'aboard') return;
      const scared = s.sliding && Math.abs(s.q) > 60 || Math.abs(s.p) > sc.BEAM - s.r - 1.5;
      const [x, y] = P(s.p, s.slot); spirit(b, x, y - s.z * 6, s.r, SPR[i], scared ? 'scared' : 'calm', 10 + i, t, i * 1.7);
    });
    // the toad at the stern, seen from above: hat, shoulders, eyes peeking forward, the steering oar
    const [ox0, oy0] = P(13, 48), oarSwing = clamp(sc.vx / 200, -1, 1), [ox1, oy1] = P(30 - oarSwing * 12, 86);
    b.line(ox0, oy0, ox1, oy1, 'wood', 3, 2, 5); b.ell(ox1, oy1, 3, 5, 'wood', 4, 5);
    if (Math.abs(sc.vx) > 40) for (let n = 0; n < 4; n++) b.put(ox1 + (n - 1.5) * 2, oy1 + 4 + (n & 1), 'white', 4);
    b.outline(5);
    const T = (lx, ly) => P(lx, 48 + ly);
    b.ell(...T(0, 2), 15, 9, 'toad', undefined, 2);
    [-1, 1].forEach((s) => { const [ex, ey] = T(s * 6, -10); b.ell(ex, ey, 5, 4.5, 'toad', 4, 2); b.ell(ex, ey - 1, 3, 2.6, 'white', 5, 2); b.rect(ex - 1, ey - 2, 2, 2, 'ink', 0, 2); });
    const [hx, hy] = T(0, 0);
    b.ell(hx, hy, 13, 12, 'straw', (px, py, nx, ny) => { const weave = ((px + py * 2) % 4) === 0; const l = nx * 0.5 - ny * 0.7; return weave ? 2 : l > 0.3 ? 5 : l > -0.3 ? 4 : 3; }, 2);
    for (let y = Math.floor(hy - 10); y <= hy + 10; y++) for (let x = Math.floor(hx - 11); x <= hx + 11; x++) { const d = Math.hypot((x + 0.5 - hx) / 13, (y + 0.5 - hy) / 12); if (d > 0.6 && d < 0.76) b.put(x, y, 'red', y < hy ? 4 : 3, 2); }
    b.outline(2);
    // bow lantern
    const [lx, ly] = P(0, -60); b.rect(lx - 3, ly - 3, 7, 7, 'fire', (px, py) => (px === Math.round(lx) && py === Math.round(ly) ? 5 : 4), 6, 1); b.rect(lx - 4, ly - 4, 9, 1, 'ink', 1, 6); b.rect(lx - 4, ly + 4, 9, 1, 'ink', 1, 6);
    b.light(lx, ly, 86, 2.6);
    // spirits in the water (with a ripple) or flying out
    sc.spirits.forEach((s, i) => {
      if (s.state === 'water') {
        const x = s.wx, y = SY(s.wy), hop = Math.sin(Math.min(1, 1 - s.z) * Math.PI) * 18 * (s.z > 0 ? 1 : 0);
        if (s.z <= 0) for (let a = 0; a < 22; a++) { const rr = s.r + 3 + Math.sin(t * 5 + a) * 0.8; b.put(x + Math.cos(a / 22 * 6.283) * rr, y + 3 + Math.sin(a / 22 * 6.283) * rr * 0.5, 'water', 5); }
        spirit(b, x, y - hop + Math.sin(s.bob * 2), s.r, SPR[i], 'scared', 30 + i, t, i);
        if (Math.sin(t * 10) > 0) { b.rect(x - 1, y - s.r - 14 - hop, 3, 6, 'red', 5, 0, 1); b.rect(x - 1, y - s.r - 6 - hop, 3, 2, 'red', 5, 0, 1); }
      }
      if (s.state === 'home') { const k = s.homeT, [x, y] = P(s.p, s.slot); if (k < 1.2) spirit(b, x + Math.sin(k * 6) * 4, y - k * 140 - Math.sin(Math.min(1, k * 2) * Math.PI) * 10, s.r, SPR[i], 'happy', 30 + i, t, i); }
    });
    // particles
    sc.parts.forEach((p) => {
      if (p.kind === 'drop') { b.put(p.x, p.y, 'white', 5, 0, 1); b.put(p.x, p.y + 1, 'water', 5, 0, 1); }
      if (p.kind === 'spark') { const sh = p.life > 0.5 ? 5 : p.life > 0.25 ? 4 : 3; b.put(p.x, p.y, SPR[p.col], sh, 0, 1); if (p.life > 0.4) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => b.put(p.x + dx, p.y + dy, SPR[p.col], sh - 1, 0, 1)); }
    });
    // light in clean steps: sprites, water and the banks catch it
    const EM = b.EM, L = b.L, ID = b.ID, out = C.out32;
    for (let i = 0; i < R8.length; i++) {
      const r = R8[i]; if (r < 0) { out[i] = 0xff000000; continue; }
      let sh;
      if (EM[i] === 2) sh = 0; else if (EM[i]) sh = S8[i];
      else { const lit = ID[i] ? L[i] : r === RI.water ? L[i] * 0.6 : BANKS.has(r) ? L[i] * 0.45 : 0; sh = S8[i] + (ID[i] ? -1 : 0) + Math.floor(lit); }
      sh = sh < 0 ? 0 : sh > 5 ? 5 : sh; out[i] = COL32[r * 6 + sh];
    }
    if (sc.shake > 0.5) {
      const dx = Math.round(Math.sin(t * 61) * sc.shake * 0.7), dy = Math.round(Math.cos(t * 47) * sc.shake * 0.7);
      if (dx || dy) { const tmp = C.tmp || (C.tmp = new Uint32Array(out.length)); tmp.set(out); for (let y = 0; y < H; y++) { const sy = clamp(y - dy, 0, H - 1) * W; for (let x = 0; x < W; x++) out[y * W + x] = tmp[sy + clamp(x - dx, 0, W - 1)]; } }
    }
    ctx.putImageData(C.img, 0, 0);
    ui(sc, ctx);
  }

  function spiritIcon(ctx, x, y, i, state, t) {
    const ramp = RAMP[SPR[i]];
    if (state === 'gone') { ctx.fillStyle = '#04030a'; ctx.fillRect(x, y - 1, 10, 12); ctx.fillRect(x - 1, y, 12, 10); ctx.fillStyle = '#1a2040'; ctx.fillRect(x + 1, y, 8, 10); ctx.fillRect(x, y + 1, 10, 8); ctx.fillStyle = '#3a4266'; ctx.fillRect(x + 2, y + 4, 2, 1); ctx.fillRect(x + 6, y + 4, 2, 1); return; }
    if (state === 'water' && Math.sin(t * 12) < 0) return;
    ctx.fillStyle = '#04030a'; ctx.fillRect(x, y - 1, 10, 12); ctx.fillRect(x - 1, y, 12, 10);
    ctx.fillStyle = ramp[3]; ctx.fillRect(x + 1, y, 8, 10); ctx.fillRect(x, y + 1, 10, 8);
    ctx.fillStyle = ramp[5]; ctx.fillRect(x + 5, y + 1, 3, 2);
    ctx.fillStyle = '#04030a'; ctx.fillRect(x + 2, y + 4, 2, 3); ctx.fillRect(x + 6, y + 4, 2, 3);
  }
  function ui(sc, ctx) {
    const t = sc.t, H = sc.H, ex = sc.extra;
    if (sc.state === 'title') {
      ctx.fillStyle = 'rgba(4,6,18,0.45)'; ctx.fillRect(0, 0, 360, H);
      text(ctx, 'NIGHT', 180, 110 + ex, 6, '#f4ecd8'); text(ctx, 'FERRY', 180, 162 + ex, 6, '#ffd23a');
      text(ctx, 'RIVER RUN', 180, 222 + ex, 3, '#a2ecf8');
      text(ctx, 'DRAG TO STEER', 180, 270 + ex, 2, '#cbbfa8'); text(ctx, 'SMOOTH TURNS KEEP', 180, 290 + ex, 2, '#cbbfa8'); text(ctx, 'THE LIGHTS ABOARD', 180, 308 + ex, 2, '#cbbfa8');
      if (Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO BEGIN', 180, H - 60, 2, '#f4ecd8');
      return;
    }
    const top = Math.max(6, 18 - ex);
    panel(ctx, 12, top, 336, 40);
    const k = Math.min(1, sc.dist / sc.TRIP), x0 = 26, x1 = 182;
    ctx.fillStyle = '#3a4472'; ctx.fillRect(x0, top + 22, x1 - x0, 2);
    ctx.fillStyle = '#8a92b4'; ctx.fillRect(x0, top + 22, Math.round((x1 - x0) * k), 2);
    const bx = Math.round(x0 + (x1 - x0) * k);
    ctx.fillStyle = '#04030a'; ctx.fillRect(bx - 7, top + 14, 15, 8); ctx.fillStyle = '#9a5230'; ctx.fillRect(bx - 6, top + 16, 13, 4); ctx.fillStyle = '#ffd84a'; ctx.fillRect(bx + 4, top + 11, 2, 4);
    ctx.fillStyle = '#c42636'; ctx.fillRect(x1 + 2, top + 10, 10, 2); ctx.fillStyle = '#82472e'; ctx.fillRect(x1 + 3, top + 12, 2, 12); ctx.fillRect(x1 + 9, top + 12, 2, 12);
    sc.spirits.forEach((s, i) => spiritIcon(ctx, 216 + i * 25, top + 15, i, s.state, t));
    if (sc.hintT > 0 && sc.state === 'playing') { panel(ctx, 54, H - 96, 252, 46); text(ctx, 'DRAG TO STEER', 180, H - 87, 2, '#f4ecd8', null); text(ctx, 'SHARP TURNS THROW THEM', 180, H - 69, 2, '#ffd23a', null); }
    sc.popups.forEach((p) => text(ctx, p.str, clamp(p.x, 60, 300), p.y - (1.2 - p.life) * 14, 2, '#ffe2c0'));
    if (sc.state === 'won' || sc.state === 'lost') {
      ctx.fillStyle = `rgba(4,6,18,${Math.min(0.6, sc.endT)})`; ctx.fillRect(0, 0, 360, H);
      panel(ctx, 30, 170 + ex, 300, 150);
      const won = sc.state === 'won', all = sc.delivered === 5, col = won ? '#ffd23a' : '#ec5550';
      text(ctx, won ? (all ? 'EVERY LIGHT' : 'SAFE HARBOUR') : 'THE RIVER', 180, 190 + ex, 3, col, null);
      text(ctx, won ? (all ? 'IS HOME!' : '') : 'TOOK THEM', 180, 218 + ex, 3, col, null);
      sc.spirits.forEach((s, i) => spiritIcon(ctx, 118 + i * 26, 252 + ex, i, s.state === 'home' ? 'aboard' : 'gone', t));
      text(ctx, `${sc.delivered} OF 5 HOME`, 180, 284 + ex, 2, '#cbbfa8', null);
      if (sc.endT > 1.2 && Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO ROW AGAIN', 180, H - 60, 2, '#f4ecd8');
    }
  }

  window.RRPixel = { frame };
})();
