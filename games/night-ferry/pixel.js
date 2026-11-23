// Night Ferry — HD pixel art renderer (360 x 640 real pixels, no dithering).
// Every pixel stores a colour ramp + a shade step; light sources add clean stepped rings of light.
// Static things (sky, moon, water bands) are built once; scrolling layers are wide tiles; the rest is drawn per frame.
(function () {
  'use strict';
  const RAMP = {
    night: ['#060818', '#0b1028', '#121a3c', '#1b2752', '#26366a', '#344a86'],
    stone: ['#16121e', '#241d30', '#382c44', '#4e3e58', '#6a566e', '#8a7488'],
    pine: ['#050c0c', '#0a1816', '#112420', '#19342a', '#244636', '#325a44'],
    fog: ['#18223a', '#26324e', '#36465f', '#4a5c74', '#64788c', '#8496a8'],
    water: ['#06101c', '#0a1a2c', '#10263e', '#183654', '#244a6c', '#3a6888'],
    deep: ['#020406', '#05090c', '#0a1216', '#101c22', '#18282e', '#24383e'],
    wood: ['#140a0a', '#2c1614', '#4a2620', '#6e3c2a', '#985636', '#c27a48'],
    fire: ['#6a1400', '#ac3200', '#e86200', '#ffa018', '#ffd84a', '#fff8c8'],
    cream: ['#2e2228', '#5a464a', '#94807a', '#c8b4a0', '#eadcc4', '#fff8ea'],
    raven: ['#05040a', '#0e0a18', '#1a142a', '#2a2040', '#3e3258', '#5c4e7c'],
    white: ['#262632', '#545468', '#9494a8', '#c6c6d6', '#e6e6f0', '#ffffff'],
    red: ['#1e0610', '#480c1c', '#86142a', '#c42636', '#ec5550', '#ff9284'],
    gold: ['#3a1806', '#6e360a', '#aa6010', '#e29a1c', '#ffd23a', '#fff4a8'],
    toad: ['#14200e', '#26381a', '#3e5626', '#5e7a34', '#86a046', '#b8c870'],
    belly: ['#3a3424', '#6a6040', '#a09464', '#cfc492', '#ece2b8', '#fffadc'],
    straw: ['#2e1e0a', '#5a3c14', '#8a6020', '#bc8a34', '#e2b456', '#f8dc8a'],
    sp1: ['#0c3a4a', '#16627a', '#2a94b0', '#5ac8e0', '#a2ecf8', '#e8fcff'],
    sp2: ['#4a1a32', '#7a2a52', '#b84a80', '#e87aa8', '#ffb4d0', '#fff0f6'],
    sp3: ['#14321a', '#245a2c', '#3e8a44', '#6ec06a', '#aee6a0', '#effff0'],
    sp4: ['#26204a', '#3e3478', '#5e50aa', '#8a7ad8', '#beb2f4', '#f2eeff'],
    sp5: ['#4a300a', '#7a5212', '#b07c1e', '#e8b040', '#ffdc7a', '#fff8d8'],
    grass: ['#0c180c', '#16301a', '#244a22', '#386a2a', '#58902e', '#88b83c'],
  };
  const NAMES = Object.keys(RAMP), RI = {};
  NAMES.forEach((k, i) => { RI[k] = i; });
  const COL32 = new Uint32Array(NAMES.length * 6);
  NAMES.forEach((k, i) => RAMP[k].forEach((h, s) => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); COL32[i * 6 + s] = (255 << 24) | (b << 16) | (g << 8) | r; }));
  function hash(x, s) { const v = Math.sin(x * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }
  function noise1(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, s) * (1 - u) + hash(i + 1, s) * u; }
  function fbm(x, s) { return noise1(x, s) * 0.6 + noise1(x * 2.3, s + 7) * 0.28 + noise1(x * 5.1, s + 13) * 0.12; }

  // ---------- a pixel buffer with ramps, shades, emissive flags, sprite ids and light ----------
  function Buf(W, H) {
    const N = W * H;
    const b = { W, H, R: new Int8Array(N).fill(-1), S: new Int8Array(N), EM: new Uint8Array(N), ID: new Uint8Array(N), L: new Float32Array(N), box: {} };
    b.put = (x, y, ramp, sh, id = 0, em = 0) => {
      x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = y * W + x; b.R[i] = typeof ramp === 'number' ? ramp : RI[ramp]; b.S[i] = sh; b.EM[i] = em; b.ID[i] = id;
      if (id) { const bx = b.box[id] || (b.box[id] = [x, y, x, y]); if (x < bx[0]) bx[0] = x; if (y < bx[1]) bx[1] = y; if (x > bx[2]) bx[2] = x; if (y > bx[3]) bx[3] = y; }
    };
    b.get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : b.R[(y | 0) * W + (x | 0)]);
    b.rect = (x, y, w, h, ramp, sh, id, em) => { for (let py = Math.round(y); py < Math.round(y + h); py++) for (let px = Math.round(x); px < Math.round(x + w); px++) b.put(px, py, ramp, typeof sh === 'function' ? sh(px, py) : sh, id, em); };
    b.ell = (cx, cy, rx, ry, ramp, sh, id, em) => {
      for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
        const nx = (px + 0.5 - cx) / rx, ny = (py + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1) continue;
        const s = sh === undefined ? 3 + Math.round((-nx * 0.55 - ny * 0.8) * 1.6) : typeof sh === 'function' ? sh(px, py, nx, ny) : sh;
        b.put(px, py, ramp, Math.max(0, Math.min(5, s)), id, em);
      }
    };
    b.poly = (pts, ramp, sh, id, em) => {
      const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
      const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
      for (let py = y0; py <= y1; py++) {
        const Y = py + 0.5, hits = [];
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > Y) !== (yj > Y)) hits.push(((xj - xi) * (Y - yi)) / (yj - yi) + xi); }
        hits.sort((a, c) => a - c);
        for (let k = 0; k + 1 < hits.length; k += 2) for (let px = Math.ceil(hits[k] - 0.5); px <= Math.floor(hits[k + 1] - 0.5); px++) b.put(px, py, ramp, typeof sh === 'function' ? sh(px, py) : sh, id, em);
      }
    };
    b.line = (x0, y0, x1, y1, ramp, sh, t = 1, id, em) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = 0; a < t; a++) for (let c = 0; c < t; c++) b.put(x + a - (t >> 1), y + c - (t >> 1), ramp, sh, id, em); } };
    // selective outline: a sprite's edge takes the darkest tone of its own colour
    b.outline = (id) => {
      const bx = b.box[id]; if (!bx) return;
      const mark = [];
      for (let y = bx[1]; y <= bx[3]; y++) for (let x = bx[0]; x <= bx[2]; x++) {
        const i = y * W + x; if (b.ID[i] !== id) continue;
        const nb = (xx, yy) => (xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : b.ID[yy * W + xx]);
        if (nb(x - 1, y) !== id || nb(x + 1, y) !== id || nb(x, y - 1) !== id || nb(x, y + 1) !== id) mark.push(i);
      }
      mark.forEach((i) => { b.S[i] = 0; b.EM[i] = 2; });
    };
    b.light = (x, y, r, s) => {
      const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { const d = Math.hypot(px - x, py - y); if (d < r) b.L[py * W + px] += s * Math.pow(1 - d / r, 1.4); }
    };
    return b;
  }
  // copy a wide tile (scrolling layer) into the frame, wrapping horizontally
  function blit(dst, tile, off, y0) {
    const W = dst.W, tw = tile.W;
    for (let y = 0; y < tile.H; y++) {
      const dy = y + y0; if (dy < 0 || dy >= dst.H) continue;
      for (let x = 0; x < W; x++) {
        const sx = ((x + off) % tw + tw) % tw, si = y * tw + sx; if (tile.R[si] < 0) continue;
        const di = dy * W + x; dst.R[di] = tile.R[si]; dst.S[di] = tile.S[si]; dst.EM[di] = tile.EM[si]; dst.ID[di] = 0;
      }
    }
  }

  // ---------- static parts ----------
  function buildStatic(W, H, ex, WL) {
    const base = Buf(W, H);
    const top = WL + ex;
    // sky in clean bands
    for (let y = 0; y < top; y++) {
      const t = y / top; let ramp = 'night', sh = Math.min(5, Math.floor(t * 6.2));
      if (t > 0.78) { ramp = 'stone'; sh = t > 0.9 ? 3 : 2; }
      for (let x = 0; x < W; x++) base.put(x, y, ramp, sh);
    }
    for (let i = 0; i < 150; i++) { const x = hash(i, 1) * W, y = hash(i, 2) * (top - 70), big = hash(i, 3) < 0.07; base.put(x, y, 'white', big ? 5 : 3, 0, 1); if (big) { base.put(x + 1, y, 'white', 3, 0, 1); base.put(x - 1, y, 'white', 3, 0, 1); base.put(x, y + 1, 'white', 3, 0, 1); base.put(x, y - 1, 'white', 3, 0, 1); } }
    const mx = 272, my = 112 + ex;
    [[44, 1], [32, 2]].forEach(([rr, add]) => { for (let y = my - rr; y <= my + rr; y++) for (let x = mx - rr; x <= mx + rr; x++) { if (Math.hypot(x - mx, y - my) > rr) continue; const i = y * W + x; if (base.R[i] === RI.night) base.S[i] = Math.min(5, base.S[i] + add); } });
    base.ell(mx, my, 21, 21, 'cream', (px, py, nx) => (Math.hypot(px - (mx - 7), py - (my - 6)) < 5 || Math.hypot(px - (mx + 8), py - (my + 8)) < 3.5 || Math.hypot(px - (mx + 4), py - (my - 11)) < 2.5 ? 3 : nx > 0.55 ? 4 : 5), 0, 1);
    // water: clean depth bands
    for (let y = top; y < H; y++) { const d = (y - top) / (H - top); const ramp = d < 0.1 ? 'water' : 'deep'; const sh = d < 0.03 ? 3 : d < 0.1 ? 2 : Math.max(0, 4 - Math.floor(d * 5)); for (let x = 0; x < W; x++) base.put(x, y, ramp, sh); }
    return base;
  }
  function ridgeTile(width, h, baseY, amp, f, seed, ramp, sh, pines) {
    const t = Buf(width, h);
    for (let x = 0; x < width; x++) { const k = x / width, v = fbm(x * f, seed) * (1 - k) + fbm((x - width) * f, seed) * k, top = Math.floor(baseY - v * amp); for (let y = Math.max(0, top); y < h; y++) t.put(x, y, ramp, y < top + 2 ? sh + 1 : sh); }
    if (pines) for (let x = 3; x < width - 3; x += 5 + Math.floor(hash(x, seed) * 4)) { const k = x / width, top = baseY - (fbm(x * f, seed) * (1 - k) + fbm((x - width) * f, seed) * k) * amp, ph = 8 + hash(x, seed + 1) * pines; t.poly([[x, top - ph], [x - ph * 0.3, top + 1], [x + ph * 0.3, top + 1]], ramp, sh); t.line(x, top - ph, x + Math.floor(ph * 0.3) - 1, top, ramp, sh + 1); }
    return t;
  }
  function mistTile(width, h, baseY, amp, seed, sh) { // soft solid bands, a lighter top edge, no patterns
    const t = Buf(width, h);
    for (let x = 0; x < width; x++) {
      const k = x / width, v = fbm(x * 0.02, seed) * (1 - k) + fbm((x - width) * 0.02, seed) * k;
      const top = Math.floor(baseY - v * amp), bot = Math.floor(baseY + 6 + v * amp * 0.5);
      for (let y = Math.max(0, top); y < Math.min(h, bot); y++) t.put(x, y, 'fog', y === top ? sh + 1 : sh);
    }
    return t;
  }
  function weedTile(width, h) {
    const t = Buf(width, h);
    for (let i = 0; i < 50; i++) { const x = hash(i, 4) * width, len = 40 + hash(i, 5) * 120, sw = (hash(i, 6) - 0.5) * 24; for (let k = 0; k < len; k++) { const q = k / len, px = x + sw * q * q; t.put(px, h - 1 - k, 'pine', 1 + (k % 11 === 0 ? 1 : 0)); t.put(px + 1, h - 1 - k, 'pine', 1); } }
    return t;
  }

  // ---------- characters ----------
  // the sleepy toad boatman; P maps local (dx, dy) to screen
  function toad(b, P, id, o) {
    const E = (dx, dy, rx, ry, ramp, sh) => { const [x, y] = P(dx, dy); b.ell(x, y, rx, ry, ramp, sh, id); };
    E(-14, -4, 8, 5, 'toad'); E(-2, -16, 17, 15, 'toad'); E(5, -12, 10, 10, 'belly', (px, py, nx, ny) => 4 - Math.round(ny * 1.2));
    E(7, -33, 15, 11, 'toad'); E(9, -27, 11, 4, 'belly', 4);
    b.line(...P(-2, -28), ...P(19, -29), 'toad', 0, 1, id);
    E(1, -43, 5, 5, 'toad'); E(13, -43, 5, 5, 'toad'); E(2, -43, 3, 3, 'cream', 5); E(14, -43, 3, 3, 'cream', 5);
    b.put(...P(3, -43), 'raven', 0, id); b.put(...P(15, -43), 'raven', 0, id);
    if (o.sleepy) { b.rect(...P(-2, -46), 7, 2, 'toad', 3, id); b.rect(...P(10, -46), 7, 2, 'toad', 3, id); }
    b.poly([P(-14, -48), P(28, -48), P(24, -45), P(-10, -45)], 'straw', (px) => 3 + (px % 4 === 0 ? 1 : 0), id);
    b.ell(...P(7, -53), 10, 6, 'straw', (px, py, nx, ny) => (ny > 0.5 ? 2 : (px + py) % 3 === 0 ? 4 : 3), id);
    b.rect(...P(-2, -50), 18, 2, 'red', 3, id);
    E(14, -6, 5, 4, 'toad');
    if (o.lantern) b.line(...P(16, -18), ...P(30, -44), 'wood', 2, 2, id);
    b.outline(id);
  }
  function lantern(b, x, y, id, lit = 1) {
    b.line(x, y - 4, x, y, 'raven', 1, 1); b.rect(x - 5, y, 11, 2, 'raven', 2, id);
    b.rect(x - 4, y + 2, 9, 10, 'fire', (px, py) => (Math.abs(px - x) < 2 && py > y + 4 ? 5 : px < x - 2 ? 3 : 4), id, 1);
    b.rect(x - 4, y + 2, 1, 10, 'raven', 2, id); b.rect(x + 4, y + 2, 1, 10, 'raven', 2, id); b.rect(x - 5, y + 12, 11, 2, 'raven', 2, id);
    b.light(x, y + 7, 44 + lit * 14, 2.2 + lit * 0.5);
  }
  function spirit(b, x, y, rad, ramp, mood, id) {
    b.ell(x, y, rad, rad * 0.92, ramp, (px, py, nx, ny) => Math.min(5, 3 + Math.round((-nx * 0.5 - ny * 0.9) * 1.6)), id, 1);
    b.outline(id);
    const ex = Math.max(2, Math.round(rad * 0.32));
    if (mood === 'scared') { b.ell(x - ex, y - 2, 2.2, 2.6, 'white', 5, 0, 1); b.ell(x + ex, y - 2, 2.2, 2.6, 'white', 5, 0, 1); b.put(x - ex, y - 2, 'raven', 0, 0, 1); b.put(x + ex, y - 2, 'raven', 0, 0, 1); b.rect(x - 1, y + 3, 2, 2, 'raven', 1, 0, 1); }
    else if (mood === 'happy') { [-1, 1].forEach((s) => { b.put(x + s * ex - 1, y - 1, 'raven', 1, 0, 1); b.put(x + s * ex, y - 2, 'raven', 1, 0, 1); b.put(x + s * ex + 1, y - 1, 'raven', 1, 0, 1); }); }
    else if (mood === 'curious') { b.rect(x - ex - 1, y - 3, 2, 3, 'raven', 1, 0, 1); b.rect(x + ex - 1, y - 3, 2, 3, 'raven', 1, 0, 1); }
    else { b.rect(x - ex, y - 2, 1, 2, 'raven', 1, 0, 1); b.rect(x + ex - 1, y - 2, 1, 2, 'raven', 1, 0, 1); }
    b.light(x, y, rad * 3.2, 1.5);
  }

  // ---------- the 3x5 pixel font for the interface ----------
  const GL = { A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '111100101101111', H: '101101111101101', I: '111010010010111', J: '001001001101111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '111101101101101', O: '111101101101111', P: '111101111100100', Q: '111101101111011', R: '111101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101111010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', '/': '001001010100100', ':': '000010000010000', '!': '010010010000010', ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', "'": '010010000000000', '-': '000000111000000' };
  function text(ctx, str, x, y, k, col, shadow = '#060818', align = 'center') {
    str = String(str).toUpperCase(); const w = str.length * 4 * k - k; if (align === 'center') x -= w / 2; if (align === 'right') x -= w; x = Math.round(x); y = Math.round(y);
    const draw = (ox, oy, c) => { ctx.fillStyle = c; [...str].forEach((ch, n) => { const g = GL[ch] || GL[' ']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') ctx.fillRect(x + ox + (n * 4 + q) * k, y + oy + r * k, k, k); }); };
    if (shadow) draw(k, k, shadow);
    draw(0, 0, col);
  }

  // ---------- one frame ----------
  let cache = null;
  function frame(sc, ctx) {
    const V = window.Studio.view, W = 360, H = V.height, ex = V.extra, WL = sc.WATER + ex;
    if (!cache || cache.H !== H) {
      cache = { H, base: buildStatic(W, H, ex, sc.WATER), far: ridgeTile(720, 160, 150, 110, 0.007, 1, 'stone', 1), mid: ridgeTile(720, 70, 56, 18, 0.018, 2, 'pine', 1, 20), mistA: mistTile(720, 60, 34, 22, 3, 2), mistB: mistTile(720, 44, 26, 14, 5, 3), weeds: weedTile(720, 180), b: Buf(W, H), img: ctx.createImageData(W, H) };
      cache.out32 = new Uint32Array(cache.img.data.buffer);
    }
    const C = cache, b = C.b, base = C.base, t = sc.t;
    b.R.set(base.R); b.S.set(base.S); b.EM.set(base.EM); b.L.set(base.L); b.ID.fill(0); b.box = {};
    // scrolling layers
    blit(b, C.far, Math.floor(sc.dist * 0.06), WL - 160);
    blit(b, C.mistA, Math.floor(sc.dist * 0.12), WL - 76);
    blit(b, C.mid, Math.floor(sc.dist * 0.2), WL - 66);
    blit(b, C.mistB, Math.floor(sc.dist * 0.35), WL - 30);
    // far shore at the end of the trip
    const shoreX = 180 + (sc.TRIP - sc.dist) + 50;
    if (shoreX < 420) {
      b.poly([[shoreX, WL], [shoreX + 20, WL - 22], [shoreX + 60, WL - 32], [shoreX + 220, WL - 36], [shoreX + 220, WL]], 'pine', 1);
      b.rect(shoreX - 30, WL - 6, 70, 3, 'wood', 3); [-26, -6, 14, 34].forEach((dx) => b.rect(shoreX + dx, WL - 3, 2, 8, 'wood', 1));
      [44, 92].forEach((dx) => { b.rect(shoreX + dx, WL - 70, 4, 50, 'wood', 2); b.rect(shoreX + dx + 1, WL - 70, 1, 50, 'wood', 3); });
      b.rect(shoreX + 36, WL - 76, 68, 5, 'red', 2); b.rect(shoreX + 36, WL - 76, 68, 1, 'red', 4);
      lantern(b, shoreX + 54, WL - 70, 60); lantern(b, shoreX + 86, WL - 70, 61);
    }
    // ripples and the moon's path on the water
    for (let i = 0; i < 40; i++) { const x = ((hash(i, 8) * 720 - sc.dist * 1.0) % 720 + 720) % 720 - 180, y = WL + 3 + Math.floor(hash(i, 9) * 36), w = 3 + Math.floor(hash(i, 10) * 8); b.rect(x, y, w, 1, 'water', 4); }
    for (let i = 0; i < 16; i++) { const y = WL + 3 + i * 3, w = 6 + i * 1.5 + hash(i, 11) * 6, sh = Math.sin(t * 2 + i * 1.7) * 2; b.rect(272 - w / 2 + sh, y, w, 1, 'cream', i < 6 ? 4 : 3, 0, 1); }
    // underwater: weeds, bubbles, the Deep One
    blit(b, C.weeds, Math.floor(sc.dist), H - 180);
    const d = sc.deep;
    if (d.phase !== 'off') {
      const dx = 180 + d.side * 120, dy = d.y + ex;
      b.ell(dx, dy, 86, 64, 'deep', (px, py, nx, ny) => (ny < -0.65 ? 3 : 2), 0);
      for (let k = 0; k < 4; k++) { const a = -2.4 + k * 0.45 + (d.side > 0 ? 0 : 0); for (let s = 0; s < 64; s++) { const q = s / 64, px = dx + Math.cos(a) * (66 + s) * -d.side * -1 + Math.sin(q * 5 + t * 2) * 6, py = dy + Math.sin(a) * (52 + s * 0.8); b.put(px, py, 'deep', 3); b.put(px + 1, py, 'deep', 3); } }
      if (d.eye > 0.05) { const open = d.eye, ey = dy - 30; b.ell(dx, ey, 20, Math.max(1, 11 * open), 'cream', (px, py, nx, ny) => (ny < -0.4 ? 5 : ny > 0.5 ? 3 : 4), 0, 1); b.ell(dx - d.side * 5, ey, 3, Math.max(1, 10 * open), 'raven', 0, 0, 1); b.light(dx, ey, 46, 1.6 * open); }
    }
    // fish drifting through the dark water, and slow glowing specks
    for (let i = 0; i < 7; i++) {
      const dir = i % 2 ? 1 : -1, sp = 8 + hash(i, 20) * 14, y = WL + 70 + hash(i, 21) * 170 + Math.sin(t * 0.8 + i) * 4;
      const x = ((hash(i, 22) * 460 + dir * t * sp - sc.dist * 0.6) % 460 + 460) % 460 - 50, len = 5 + Math.floor(hash(i, 23) * 6);
      b.ell(x, y, len, len * 0.38, 'water', 3); b.put(x - dir * (len + 1), y, 'water', 3); b.put(x - dir * (len + 2), y - 1, 'water', 3); b.put(x - dir * (len + 2), y + 1, 'water', 3); b.put(x + dir * (len - 2), y - 1, 'water', 5);
    }
    for (let i = 0; i < 14; i++) { const x = ((hash(i, 30) * 380 - sc.dist * 0.8 + Math.sin(t * 0.5 + i) * 10) % 380 + 380) % 380 - 10, y = WL + 40 + hash(i, 31) * 220 - (t * 6 + i * 20) % 30; if (Math.sin(t * 2 + i * 1.3) > 0.2) b.put(x, y, 'sp1', 3, 0, 1); }
    sc.parts.forEach((p) => { if (p.kind === 'bubble') { b.put(p.x, p.y + ex, 'water', 5); b.put(p.x + 1, p.y + ex, 'water', 4); } });
    // the boat: toad and spirits first, then the hull in front of their feet
    const th = sc.viewTheta, [ox, oy0] = sc.boatOrigin(), oy = oy0 + ex - 9, c = Math.cos(th), s = Math.sin(th);
    const R = (x, y) => [ox + c * x - s * y, oy + s * x + c * y];
    const tu = sc.uw * 100, step = Math.round(Math.abs(Math.sin(sc.wrenStep)) * -1.5);
    toad(b, (dx, dy) => R(tu + dx, -8 + step + dy), 2, { sleepy: !sc.lantern, lantern: sc.lantern });
    if (sc.lantern) { const [lx, ly] = R(tu + 30, -8 + step - 46); lantern(b, lx, ly + 2, 3, 1); }
    sc.spirits.forEach((sp, i) => { if (sp.state !== 'deck') return; const [x, y] = R(sp.u * 100 + (sp.mood === 'scared' ? Math.round(Math.sin(t * 40)) : 0) + sp.lean * 6, -15 - sp.r * 0.8 + Math.round(Math.sin(sp.bob) * 1.5)); spirit(b, x, y, sp.r, `sp${i + 1}`, sp.mood, 10 + i); });
    const hull = [[-122, -10], [-60, -6], [60, -6], [124, -14], [118, 2], [96, 20], [60, 26], [-60, 26], [-96, 22], [-116, 6]].map(([x, y]) => R(x, y));
    b.poly(hull, 'wood', (px, py) => { const ly = -(px - ox) * s + (py - oy) * c; if (ly < -6) return 4; if (Math.round(ly) % 6 === 0) return 1; return ly < 4 ? 3 : 2; }, 4);
    b.outline(4);
    b.line(...R(-118, -12), ...R(122, -16), 'cream', 3, 1);
    b.line(...R(-112, -10), ...R(-118, -72), 'wood', 2, 2); b.line(...R(-118, -72), ...R(-100, -74), 'wood', 2, 2);
    const [sx, sy] = R(-100, -66); lantern(b, sx, sy, 5, 0);
    // the lower hull sits below the surface: hide it behind solid water, with a bright waterline
    for (let y = WL + 6; y < WL + 40; y++) for (let x = 40; x < 330; x++) { const i = y * W + x; if (b.R[i] === RI.wood) { b.R[i] = RI.water; b.S[i] = y < WL + 10 ? 3 : 2; b.EM[i] = 0; b.ID[i] = 0; } }
    for (let x = 50; x < 316; x++) if ((x >> 1) % 3) b.put(x, WL + 4 + Math.round(Math.sin(x * 0.2 + t * 2)), 'water', 5);
    // spirits in the water or being taken
    sc.spirits.forEach((sp, i) => {
      if (sp.state === 'water') spirit(b, sp.wx, sp.wy + ex - sp.r * 0.3, sp.r, `sp${i + 1}`, 'scared', 20 + i);
      if (sp.state === 'grab' && sp.waterT < 0.8) spirit(b, sp.wx, sp.wy + ex, sp.r * (1 - sp.waterT * 0.8), `sp${i + 1}`, 'scared', 20 + i);
    });
    // spirits who made it, waiting on the far shore
    sc.spirits.forEach((sp, i) => { if (sp.state !== 'home') return; const k = Math.min(1, sp.homeT / 0.6); const x = 280 + k * (shoreX + 20 + i * 18 - 280), y = WL - 36 - Math.sin(k * Math.PI) * 24; spirit(b, x, y, sp.r * 0.8, `sp${i + 1}`, 'happy', 30 + i); });
    sc.parts.forEach((p) => { if (p.kind === 'drop') b.put(p.x, p.y + ex, 'white', 4, 0, 1); });
    sc.ripples.forEach((r) => { const w = Math.round(r.r * 1.8); if (r.life > 0.3) { b.rect(r.x - w, r.y + ex + 1, Math.max(1, w * 0.6), 1, 'water', 5); b.rect(r.x + w * 0.4, r.y + ex + 1, Math.max(1, w * 0.6), 1, 'water', 5); } });
    // fireflies and the fish
    sc.fireflies.forEach((f) => { const x = f.x + Math.sin(f.ph * 1.7) * 8, y = f.y + ex + Math.cos(f.ph * 1.3) * 6; if (Math.sin(f.ph * 5) > -0.4) { b.put(x, y, 'gold', 5, 0, 1); b.light(x, y, 12, 1.4); } });
    for (let i = 0; i < 10; i++) { const x = ((i * 47 - sc.dist * 0.9) % 380 + 380) % 380 - 10, y = 200 + ex + ((i * 73) % 140) + Math.sin(t + i) * 6; if (Math.sin(t * 3 + i) > 0) { b.put(x, y, 'gold', 4, 0, 1); b.light(x, y, 9, 1); } }
    if (sc.fish) { const f = sc.fish, k = f.t / 1.3, x = f.x + f.side * k * 30, y = WL - Math.sin(k * Math.PI) * 46; b.ell(x, y, 7, 3, 'white', 3, 0, 0); b.put(x - f.side * 8, y, 'white', 2); b.put(x - f.side * 9, y - 1, 'white', 2); b.put(x - f.side * 9, y + 1, 'white', 2); }
    // light everything in clean steps
    const amb = -1, R8 = b.R, S8 = b.S, EM = b.EM, L = b.L, ID = b.ID, out = C.out32;
    for (let i = 0; i < R8.length; i++) {
      const r = R8[i]; if (r < 0) { out[i] = 0xff000000; continue; }
      const lit = ID[i] ? L[i] : r === RI.water ? L[i] * 0.6 : 0;
      let sh = EM[i] === 2 ? 0 : EM[i] ? S8[i] : S8[i] + (ID[i] ? amb : 0) + Math.floor(lit);
      sh = sh < 0 ? 0 : sh > 5 ? 5 : sh; out[i] = COL32[r * 6 + sh];
    }
    ctx.putImageData(C.img, 0, 0);
    ui(sc, ctx, ex, shoreX);
  }

  function ui(sc, ctx, ex, shoreX) {
    const t = sc.t, top = Math.max(12, 30 - ex);
    if (sc.state === 'title') {
      ctx.fillStyle = 'rgba(4,6,18,0.55)'; ctx.fillRect(0, 0, 360, 640 + ex);
      text(ctx, 'NIGHT FERRY', 180, 170 + ex, 5, '#f4ecd8');
      text(ctx, 'CARRY THE LITTLE LIGHTS ACROSS', 180, 210 + ex, 2, '#cbbfa8');
      if (Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO BEGIN', 180, 560 + ex, 2, '#f4ecd8');
      return;
    }
    ctx.fillStyle = '#5a6488'; ctx.fillRect(60, top, 240, 1);
    const k = Math.min(1, sc.dist / sc.TRIP); ctx.fillStyle = '#eadcc4'; ctx.fillRect(Math.round(58 + k * 240), top - 2, 5, 5);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(299, top - 2, 4, 5);
    const cols = ['#a2ecf8', '#ffb4d0', '#aee6a0', '#beb2f4', '#ffdc7a'];
    sc.spirits.forEach((s, i) => { const x = 142 + i * 16, y = top + 12; if (s.state === 'lost' || s.state === 'grab') { ctx.fillStyle = '#3a4266'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#060818'; ctx.fillRect(x + 2, y + 2, 4, 4); } else if (s.state !== 'water' || Math.sin(t * 12) > 0) { ctx.fillStyle = cols[i]; ctx.fillRect(x, y, 8, 8); } });
    if (sc.hintT > 0 && sc.state === 'playing') { text(ctx, 'DRAG THE TOAD', 180, 576 + ex, 2, '#eadcc4'); text(ctx, 'KEEP THE BOAT LEVEL', 180, 594 + ex, 2, '#eadcc4'); }
    sc.popups.forEach((p) => text(ctx, p.str, Math.max(40, Math.min(320, p.x)), p.y + ex - (1.4 - p.life) * 10, 2, '#ffe2c0'));
    if (sc.state === 'won' || sc.state === 'lost') {
      ctx.fillStyle = `rgba(4,6,18,${Math.min(0.6, sc.endT)})`; ctx.fillRect(0, 0, 360, 640 + ex);
      text(ctx, sc.state === 'won' ? (sc.delivered === 5 ? 'EVERY LIGHT IS HOME' : 'SAFE ACROSS') : 'THE LAKE KEPT THEM', 180, 210 + ex, 3, '#f4ecd8');
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i < sc.delivered ? cols[i] : '#2a3050'; ctx.fillRect(140 + i * 16, 250 + ex, 10, 10); }
      text(ctx, `${sc.delivered} OF 5 MADE IT`, 180, 280 + ex, 2, '#cbbfa8');
      if (sc.endT > 1.2 && Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO ROW AGAIN', 180, 560 + ex, 2, '#f4ecd8');
    }
  }

  window.NFPixel = { frame };
})();
