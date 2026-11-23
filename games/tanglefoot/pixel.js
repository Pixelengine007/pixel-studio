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
    dawnA: ['#10143a', '#181a44', '#24204e', '#342858', '#48305e', '#603a62'],
    dawnB: ['#7c4664', '#9a5466', '#b86866', '#d48262', '#eaa262', '#f8c878'],
    meadow: ['#0a1526', '#0e2030', '#142e3a', '#1c4040', '#2a5a40', '#447844'],
    leaf: ['#040c12', '#08181c', '#0e2826', '#163a30', '#22503a', '#34704a'],
    rock: ['#12121e', '#232434', '#383a4e', '#53566c', '#767a90', '#a4a8ba'],
    dirt: ['#0e0c12', '#1a1618', '#282022', '#382c2a', '#4c3c34', '#645040'],
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
      x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H || (b.clip && y >= b.clip)) return;
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
  const F5 = { '+': '00000001000010011111001000010000000', A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110', D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000', G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110', J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111', M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110', V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001', Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111', '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111', '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110', '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110', '9': '01110100011000101111000010001001100', '!': '00100001000010000100001000000000100', '.': '00000000000000000000000000110001100', ',': '00000000000000000000011000010001000', "'": '00100001000100000000000000000000000', '-': '00000000000000011111000000000000000', '/': '00001000010001000100010001000010000', ':': '00000011000110000000011000110000000', '?': '01110100010000100010001000000000100', ' ': '00000000000000000000000000000000000' };
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

  // ---------- Tanglefoot: a moonlit meadow under the ridge, the village at its foot ----------
  // The ground is seen at a tilt: ground (x, y) is drawn at (x, HZ + y * K), so a circle on the ground is an ellipse on screen.
  let cache = null;
  const TAU = 6.2832, GEM = ['sp1', 'sp3', 'sp2', 'sp5'];
  const ball = (px, py, nx, ny) => { const l = nx * 0.5 - ny * 0.75; return l > 0.5 ? 4 : l > 0 ? 3 : l > -0.5 ? 2 : 1; };
  function noise2(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), h = (a, c) => hash(a * 57.3 + c * 131.7, s); return (h(ix, iy) * (1 - ux) + h(ix + 1, iy) * ux) * (1 - uy) + (h(ix, iy + 1) * (1 - ux) + h(ix + 1, iy + 1) * ux) * uy; }
  // an ellipse whose shader picks the ramp too: fn returns ramp * 8 + shade, or -1 to leave the pixel alone
  function ellF(b, cx, cy, rx, ry, fn, id, em) { for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) { const nx = (px + 0.5 - cx) / rx, ny = (py + 0.5 - cy) / ry; if (nx * nx + ny * ny > 1) continue; const c = fn(px, py, nx, ny); if (c >= 0) b.put(px, py, c >> 3, c & 7, id, em); } }
  function ringG(b, x, y, r, K, ramp, sh, gap) { const n = Math.max(16, Math.round(r * 5.4)); for (let i = 0; i < n; i++) { if (gap && (i % gap) >= gap / 2) continue; const a = i / n * TAU; b.put(x + Math.cos(a) * r, y + Math.sin(a) * r * K, ramp, sh, 0, 1); } }
  function arcG(b, x, y, r, K, a0, da, ramp, sh) { const n = Math.max(2, Math.round(Math.abs(da) * r)); for (let i = 0; i <= n; i++) { const a = a0 + da * i / n; for (let w = 0; w < 2; w++) b.put(x + Math.cos(a) * (r + w), y + Math.sin(a) * (r + w) * K, ramp, sh, 0, 1); } }
  function glow(b, x, y, r, s, K) { const W = b.W, H = b.H, x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r * K)), y1 = Math.min(H - 1, Math.ceil(y + r * K)); for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { const d = Math.hypot(px - x, (py - y) / K); if (d < r) b.L[py * W + px] += s * Math.pow(1 - d / r, 1.3); } }
  function shadow(C, cx, cy, rx, ry, n = 1) { const W = 360, H = C.H, sm = C.sm; for (let py = Math.max(0, Math.floor(cy - ry)); py <= Math.min(H - 1, Math.ceil(cy + ry)); py++) for (let px = Math.max(0, Math.floor(cx - rx)); px <= Math.min(W - 1, Math.ceil(cx + rx)); px++) { const nx = (px + 0.5 - cx) / rx, ny = (py + 0.5 - cy) / ry; if (nx * nx + ny * ny <= 1 && sm[py * W + px] < n) sm[py * W + px] = n; } }
  function rope(b, x0, y0, x1, y1, tight) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); const tw = ((x + y * 2) % 6 + 6) % 6 < 2; b.put(x, y + 1, 'ink', 1); b.put(x, y, tight ? 'cream' : 'rope', tight ? 3 : tw ? 2 : 3, 0, 1); b.put(x, y - 1, tight ? 'cream' : 'rope', tight ? 5 : tw ? 4 : 5, 0, 1); } }
  function mistTile(width, h, baseY, amp, seed, sh) {
    const t = Buf(width, h);
    for (let x = 0; x < width; x++) { const k = x / width, v = fbm(x * 0.016, seed) * (1 - k) + fbm((x - width) * 0.016, seed) * k; if (v < 0.44) continue; const top = Math.floor(baseY - (v - 0.44) * amp), bot = Math.ceil(baseY + 1 + (v - 0.44) * amp * 0.6); for (let y = Math.max(0, top); y < Math.min(h, bot); y++) t.put(x, y, 'fog', y <= top ? sh + 1 : sh); }
    return t;
  }

  function buildBase(W, H, HZ, K, CREST, trees) {
    const g = Buf(W, H), gm = new Uint8Array(W * H);
    // the sky in clean bands, stars, the moon with its halo, two long clouds
    for (let y = 0; y < CREST; y++) { const k = Math.min(11, Math.floor(Math.pow(y / CREST, 1.15) * 12)); for (let x = 0; x < W; x++) g.put(x, y, k < 6 ? 'skyA' : 'skyB', k < 6 ? k : k - 6); }
    for (let i = 0; i < 90; i++) g.put(hash(i, 1) * W, hash(i, 2) * (CREST - 24), 'white', hash(i, 3) < 0.3 ? 4 : 2, 0, 1);
    const mx = 288, my = Math.round(CREST * 0.6);
    [46, 34, 25].forEach((rr) => { for (let y = my - rr; y <= my + rr; y++) for (let x = mx - rr; x <= mx + rr; x++) { if (Math.hypot(x - mx, y - my) > rr || x < 0 || x >= W || y < 0 || y >= CREST) continue; const i = y * W + x; if (g.R[i] === RI.skyA || g.R[i] === RI.skyB) { const k = Math.min(11, (g.R[i] === RI.skyA ? g.S[i] : g.S[i] + 6) + 1); g.R[i] = k < 6 ? RI.skyA : RI.skyB; g.S[i] = k < 6 ? k : k - 6; } } });
    g.ell(mx, my, 19, 19, 'cream', (px, py, nx, ny) => { const crater = [[-7, -5, 4.5], [5, 7, 3.5], [4, -9, 2.5], [-3, 8, 2], [9, -1, 2]].some(([cx, cy, r]) => Math.hypot(px - (mx + cx), py - (my + cy)) < r); if (nx * nx + ny * ny > 0.8 && nx < -0.2) return 3; return crater ? 3 : nx < -0.5 ? 4 : 5; }, 0, 1);
    const cloud = (cx, cy, w, seed) => {
      const hAt = (x) => 3 + (1 - Math.pow(Math.abs(x) / w, 2)) * (6 + fbm((x + cx) * 0.06, seed) * 9), pts = [];
      for (let x = -w; x <= w; x++) pts.push([cx + x, cy - hAt(x)]);
      for (let x = w; x >= -w; x--) pts.push([cx + x, cy + 2 + (1 - Math.pow(Math.abs(x) / w, 2)) * 3]);
      g.poly(pts, 'cloud', (px, py) => (py < cy - 3 ? (Math.hypot(px - mx, py - my) < 130 ? 3 : 2) : 1));
      for (let x = -w + 2; x < w - 2; x++) g.put(cx + x, Math.round(cy - hAt(x)), 'cloud', Math.hypot(cx + x - mx, cy - hAt(x) - my) < 150 ? 5 : 4);
    };
    cloud(78, Math.round(CREST * 0.58), 56, 1); cloud(196, Math.round(CREST * 0.36), 38, 2);
    // far mountains, then a dark ridge of pines
    for (let x = 0; x < W; x++) { const top = Math.floor(CREST - 14 - fbm(x * 0.011, 3) * 44); for (let y = top; y < CREST; y++) g.put(x, y, 'hill', y < top + 2 ? 4 : y < top + 9 + fbm(x * 0.05, 4) * 8 ? 3 : 2); }
    const y2 = (x) => CREST - 3 - fbm(x * 0.03, 5) * 13;
    for (let x = 0; x < W; x++) for (let y = Math.floor(y2(x)); y < CREST; y++) g.put(x, y, 'pine', 1);
    for (let x = 2; x < W - 2; x += 4 + Math.floor(hash(x, 21) * 4)) { const top = y2(x), ph = 8 + hash(x, 22) * 13; for (let k = 0; k < ph; k++) { const w = Math.floor(k * 0.32); for (let dx = -w; dx <= w; dx++) g.put(x + dx, top - ph + k + 1, 'pine', dx > 0 && k < ph - 2 ? 2 : 1); } }
    // the meadow: pale and hazy under the ridge, darker towards the village, with long moonlit swells; a worn cart track with ruts
    const pathX = (gy) => 180 + 30 * Math.sin(gy * 0.011 + 1) + 14 * Math.sin(gy * 0.031);
    for (let y = CREST; y < H; y++) {
      const gy = (y - HZ) / K, cx = pathX(gy);
      for (let x = 0; x < W; x++) {
        gm[y * W + x] = 1;
        const d = Math.abs(x - cx), wav = noise2(x / 64, 3.3, 15) * 18 + noise2(x / 21, 7.1, 16) * 5;
        const haze = y + wav < CREST + 58 ? 1 : 0, swell = noise2(x / 110, gy / 13, 11) > 0.61 ? 1 : 0, edge = 9 + noise2(x / 9, gy / 9, 17) * 4;
        if (gy > H - 62) g.put(x, y, 'dirt', noise2(x / 34, gy / 7, 18) > 0.55 ? 3 : 2);
        else if (d < edge) g.put(x, y, 'dirt', Math.abs(d - 4) < 1.1 ? 2 : d < edge - 2 ? 3 : 2);
        else g.put(x, y, 'meadow', y < CREST + 2 ? 4 : y < CREST + 7 ? 3 : 1 + haze + swell);
      }
    }
    const onGrass = (x, y) => x >= 0 && x < W && y >= CREST + 10 && y < H && g.R[y * W + x] === RI.meadow;
    // short strokes of shadow between the blades, clumps of longer grass, a few patches of flowers, stones, pebbles along the track
    for (let i = 0; i < 560; i++) { const x = Math.round(hash(i, 51) * W), y = Math.round(CREST + 12 + hash(i, 52) * (H - CREST - 70)), len = 3 + Math.floor(hash(i, 53) * 5); if (!onGrass(x, y) || !onGrass(x + len, y)) continue; const s0 = Math.max(0, g.S[y * W + x] - 1); for (let q = 0; q < len; q++) g.put(x + q, y, 'meadow', s0); }
    for (let c = 0; c < 46; c++) { const cx = hash(c, 31) * W, cy = CREST + 16 + hash(c, 32) * (H - CREST - 84); for (let j = 0; j < 7; j++) { const x = Math.round(cx + (hash(c * 9 + j, 33) - 0.5) * 28), y = Math.round(cy + (hash(c * 9 + j, 34) - 0.5) * 11); if (!onGrass(x, y) || !onGrass(x, y - 3)) continue; const s0 = g.S[y * W + x] + 1; g.put(x, y, 'meadow', s0); g.put(x - 1, y - 1, 'meadow', s0); g.put(x + 1, y - 1, 'meadow', s0); g.put(x - 2, y - 2, 'meadow', s0 + 1); g.put(x + 1, y - 2, 'meadow', s0); g.put(x + 2, y - 3, 'meadow', s0 + 1); } }
    for (let c = 0; c < 9; c++) { const cx = hash(c, 35) * W, cy = CREST + 30 + hash(c, 36) * (H - CREST - 110), col = ['cream', 'sp2', 'sp1', 'sp4'][c % 4]; for (let j = 0; j < 5; j++) { const x = Math.round(cx + (hash(c * 7 + j, 37) - 0.5) * 24), y = Math.round(cy + (hash(c * 7 + j, 38) - 0.5) * 10); if (!onGrass(x, y) || !onGrass(x, y - 3)) continue; g.put(x, y, 'meadow', 3); g.put(x, y - 1, 'meadow', 3); g.put(x, y - 2, col, 3); g.put(x - 1, y - 2, col, 2); g.put(x + 1, y - 2, col, 2); g.put(x, y - 3, col, 2); } }
    for (let i = 0; i < 16; i++) { const x = hash(i, 38) * W, y = CREST + 24 + hash(i, 39) * (H - CREST - 96), r = 3 + hash(i, 40) * 5; if (!onGrass(Math.round(x), Math.round(y))) continue; g.ell(x - 2, y + 2, r + 1, r * 0.5, 'meadow', 0); g.ell(x, y, r, r * 0.62, 'rock', (px, py, nx, ny) => (ny > 0.5 ? 1 : nx * 0.5 - ny * 0.8 > 0.3 ? 4 : nx * 0.5 - ny * 0.8 > -0.2 ? 3 : 2)); }
    for (let i = 0; i < 70; i++) { const gy = 10 + hash(i, 47) * (H - 80), x = Math.round(pathX(gy) + (i % 2 ? 1 : -1) * (10 + hash(i, 48) * 4)), y = Math.round(HZ + gy * K); if (y > CREST + 8) { g.put(x, y, 'rock', 3); g.put(x + 1, y, 'rock', 2); } }
    // the trees stand still, so their moon shadows are part of the ground
    trees.forEach((c) => { const sy = HZ + c.y * K; for (let py = Math.floor(sy - 4); py <= sy + 10; py++) for (let px = Math.floor(c.x - 40); px <= c.x + 8; px++) { const nx = (px - (c.x - 16)) / 24, ny = (py - (sy + 3)) / 7; if (nx * nx + ny * ny <= 1 && px >= 0 && px < W && py < H && gm[py * W + px]) g.S[py * W + px] = Math.max(0, g.S[py * W + px] - 1); } });
    // a fence with a gate where the path comes in, cobbles between the houses
    const fy = Math.round(HZ + (H - 63) * K), gate = pathX(H - 63);
    for (let x = 0; x < W; x++) { if (Math.abs(x - gate) < 15) continue; g.put(x, fy - 5, 'wood', 3); g.put(x, fy - 2, 'wood', 2); if (x % 9 === 4) g.rect(x, fy - 8, 2, 10, 'wood', (px) => (px === x ? 2 : 3)); }
    [-15, 15].forEach((dx) => { g.rect(gate + dx - 1, fy - 12, 3, 14, 'wood', (px, py) => (py === fy - 12 ? 4 : 3)); });
    for (let i = 0; i < 150; i++) { const x = Math.round(hash(i, 44) * W), y = Math.round(fy + 3 + hash(i, 45) * (H - fy - 4)); g.put(x, y, 'dirt', 4); g.put(x + 1, y, 'dirt', 4); g.put(x, y + 1, 'dirt', 1); g.put(x + 1, y + 1, 'dirt', 1); }
    return { g, gm };
  }

  function pine(b, x, y, id, v) {
    x = Math.round(x); y = Math.round(y);
    const n = v > 0.5 ? 4 : 3, wf = 0.92 + v * 0.3, gap = n === 4 ? 13 : 15;
    b.rect(x - 3, y - 16, 7, 17, 'wood', (px) => (px < x - 1 ? 1 : px > x + 1 ? 3 : 2), id);
    b.rect(x - 5, y - 1, 2, 2, 'wood', 1, id); b.rect(x + 4, y - 1, 2, 2, 'wood', 2, id);
    for (let k = 0; k < n; k++) { const by = y - 13 - k * gap, w = (21 - k * (n === 4 ? 4.5 : 5.5)) * wf, top = by - gap - 9; b.poly([[x - w, by], [x - 1, top], [x + 2, top], [x + w, by]], 'leaf', (px, py) => (py >= by - 1 ? 1 : px > x + 2 + (by - py) * 0.28 ? 4 : px > x + 1 ? 3 : 2), id); }
    b.outline(id);
  }

  function giant(b, g, id, t, C, n) {
    const K = C.K, s = g.big ? 1.25 : 1, st = g.state, up = st === 'walk' || st === 'lean';
    const sink = Math.max(0, -4 - g.y) * 3.6, GY = (y) => C.HZ + y * K + sink, cx = g.x, cy = GY(g.y);
    const RK = RI.rock * 8, LF = RI.leaf * 8;
    b.clip = sink > 0 ? C.CREST : 0;
    if (st === 'down' && g.ft > 2.5) {   // the stone breaks up
      for (let i = 0; i < 8; i++) { const al = (10 + i * 13) * s, sd = (hash(i, n) - 0.5) * 34, r = 5 + hash(i, n + 3) * 5 - (g.ft - 2.5) * 5; if (r > 1.5) b.ell(cx + g.dir.x * al - g.dir.y * sd, cy + (g.dir.y * al + g.dir.x * sd) * K, r, r * 0.7, 'rock', ball, id); }
      b.outline(id); return;
    }
    const k = st === 'lean' ? 0.15 * Math.min(1, g.ft / 0.16) : st === 'fall' ? 0.15 + 0.85 * Math.pow(Math.min(1, g.ft / 0.38), 2) : st === 'down' ? 1 : 0;
    const step = st === 'walk' ? Math.sin(Math.min(1, g.st) * Math.PI) : 0;
    const bob = up ? (g.land > 0 ? g.land / 0.2 * 4 : 0) - step * 2 : 0, sway = st === 'walk' ? (g.feet[1 - g.foot].x - cx) * 0.25 : 0;
    const T = (h, al) => [cx + (h ? sway * (1 - k) : 0) + g.dir.x * al * k * s, cy - h * s * (1 - k) + (h ? bob : 0) + g.dir.y * al * k * s * K];   // standing: above the feet; lying: along the fall
    const F = g.feet.map((q, i) => [q.x, GY(q.y) - (i === g.foot ? step * 9 : 0)]);
    const [hpx, hpy] = T(24, 34);
    F.forEach(([fx, fy], i) => { const ex = hpx + (i ? -9 : 9) * s * (1 - k); b.line(fx, fy - 5, ex, hpy, 'rock', (q) => (q > 0.5 ? 2 : 3), Math.round(11 * s), id); b.ell((fx + ex) / 2 + (i ? -1 : 1) * s, (fy - 5 + hpy) / 2, 7 * s, 6 * s, 'rock', (px, py, nx, ny) => (ny < -0.3 ? 4 : 3), id); });
    F.forEach(([fx, fy]) => { b.ell(fx, fy - 2, 11 * s, 6.5 * s, 'rock', (px, py, nx, ny) => (ny < -0.25 ? 4 : nx > 0.3 ? 3 : 2), id); b.ell(fx - 2, fy - 6 * s, 5 * s, 2.2 * s, 'leaf', 3, id); });
    const [tx, ty] = T(46, 66);
    const swing = st === 'walk' ? Math.sin(g.st * Math.PI) * (g.foot ? 1 : -1) * 5 : 0;
    const O = (sd, a, d) => [tx + (1 - k) * sd * a + k * (-g.dir.y) * sd * (a + d * 0.5), ty + (1 - k) * d + k * g.dir.x * sd * (a + d * 0.5) * K];
    [-1, 1].forEach((sd) => { const [ax, ay] = O(sd, 22 * s, -8 * s), [bx, by] = O(sd, 31 * s, 24 * s + sd * swing); b.line(ax, ay, bx, by, 'rock', sd > 0 ? 3 : 2, Math.round(9 * s), id); b.ell(bx, by, 9.5 * s, 9 * s, 'rock', ball, id); });
    ellF(b, tx, ty, 26 * s, 23 * s, (px, py, nx, ny) => {
      const l = nx * 0.5 - ny * 0.75, edge = -0.4 + 0.13 * Math.sin(px * 0.8 + n * 2), m = ny * (1 - k) - (nx * g.dir.x + ny * g.dir.y) * k;
      if (m < edge) return LF + (l > 0.75 ? 5 : l > 0.5 ? 4 : 3);                                         // moss over the shoulders
      if (up && ny < edge + 0.34 * hash(px, n + 5) && hash(px, n) < 0.34) return LF + 2;                   // and hanging from them
      if (Math.abs(nx * 0.8 + ny * 0.45 - 0.14) < 0.04 && ny > -0.2) return RK + 1;                        // cracks
      if (Math.abs(nx * 0.5 - ny * 0.9 + 0.52) < 0.035 && nx < -0.15 && ny > -0.1) return RK + 1;
      return RK + (l > 0.5 ? 4 : l > 0 ? 3 : l > -0.5 ? 2 : 1);
    }, id);
    if (up) { b.poly([[tx - 20 * s, ty - 16 * s], [tx - 16 * s, ty - 31 * s], [tx - 11 * s, ty - 16 * s]], 'leaf', (px) => (px > tx - 16 * s ? 4 : 2), id); if (g.big) b.poly([[tx + 13 * s, ty - 16 * s], [tx + 17 * s, ty - 28 * s], [tx + 21 * s, ty - 15 * s]], 'leaf', (px) => (px > tx + 17 * s ? 4 : 2), id); }
    // the heart stone: each giant glows in its own colour, and the glow lies round its feet
    const gx = Math.round(tx + (up ? g.hx * 5 * s : 0)), gyy = Math.round(ty + 3 * s), gem = GEM[n % 4], alive = st !== 'down';
    for (let dy = -5; dy <= 5; dy++) { const w = Math.round(3.4 * (1 - Math.abs(dy) / 5.6)); for (let dx = -w; dx <= w; dx++) b.put(gx + dx, gyy + dy, alive ? gem : 'ink', alive ? (dx === 0 && Math.abs(dy) < 3 ? 5 : dx < 0 ? 3 : 4) : 2, id, alive ? 1 : 0); }
    // the head, sunk between the shoulders
    const [hx0, hy0] = T(78, 104), hx = Math.round(hx0 + (up ? g.hx * 6 * s : 0)), hy = Math.round(hy0 + (up ? g.hy * 3 * s : 0)), facing = up ? g.hy > -0.35 : true;
    if (g.big) [-1, 1].forEach((sd) => b.poly([[hx + sd * 6 * s, hy - 5 * s], [hx + sd * 17 * s, hy - 16 * s], [hx + sd * 12 * s, hy - 1 * s]], 'cream', (px, py) => (py < hy - 10 * s ? 4 : 3), id));
    ellF(b, hx, hy, 13 * s, 11 * s, (px, py, nx, ny) => {
      const l = nx * 0.5 - ny * 0.75;
      if (ny * (1 - k) - (nx * g.dir.x + ny * g.dir.y) * k < -0.5 + 0.1 * Math.sin(px * 1.1 + n)) return LF + (l > 0.6 ? 5 : 4);
      if (facing && ny > -0.34 && ny < -0.08) return RK + 1;                                              // a heavy brow
      return RK + (l > 0.5 ? 4 : l > 0 ? 3 : l > -0.5 ? 2 : 1);
    }, id);
    if (facing) {
      const ex = hx + Math.round((up ? g.hx : 0) * 4 * s), ey = hy + Math.round(1 * s), ew = Math.round(5 * s);
      if (alive) { [-1, 1].forEach((sd) => b.rect(ex + sd * ew - 1, ey, 3, 2, g.chase ? 'red' : 'gold', 5, id, 1)); b.light(ex, ey, 20, 1.3); }
      else [-1, 1].forEach((sd) => b.rect(ex + sd * ew - 1, ey + 1, 3, 1, 'ink', 0, id));
      b.rect(ex - ew, hy + Math.round(6 * s), ew * 2 + 1, 1, 'ink', 1, id); b.put(ex - ew + 1, hy + Math.round(6 * s) - 1, 'cream', 4, id); b.put(ex + ew - 1, hy + Math.round(6 * s) - 1, 'cream', 4, id);
    }
    b.outline(id);
    if (alive) { b.light(gx, gyy, 30 * s, 1.5); if (!sink) glow(b, cx, cy, 50 * s, 1.5, K); }
    b.clip = 0;
  }

  function hero(b, sc, t, C) {
    const P = sc.p, K = C.K, x = Math.round(P.x), y = Math.round(C.HZ + P.y * K), face = C.face;
    if (P.stun > 0) {
      b.ell(x, y - 3, 10, 4, 'gold', (px, py, nx, ny) => (ny < -0.2 ? 3 : 2), 2); b.ell(x + 10, y - 4, 4.5, 4.5, 'cream', 4, 2); b.outline(2);
      for (let i = 0; i < 3; i++) { const a = t * 9 + i * 2.1; b.put(x + Math.cos(a) * 11, y - 13 + Math.sin(a) * 3, 'gold', 5, 0, 1); b.put(x + Math.cos(a) * 11 + 1, y - 13 + Math.sin(a) * 3, 'gold', 4, 0, 1); }
      glow(b, x, y, 50, 1.6, K); return;
    }
    const run = sc.moving, f = run ? Math.floor(t * 13) % 4 : 0, by = y - (run && (f & 1) ? 1 : 0), breathe = !run && Math.sin(t * 2.4) > 0.5 ? 1 : 0;
    const last = sc.chain[sc.chain.length - 1], ln = sc.tight && last ? (P.x < last.x ? -3 : 3) : 0;                 // leaning back against a tight rope
    const lx0 = run ? [-2, 0, 2, 0][f] : 0, ll = run && f === 1 ? 2 : 0, rl = run && f === 3 ? 2 : 0;
    b.rect(x - 3 + lx0, y - 4 - ll, 2, 4, 'ink', 4, 2); b.rect(x + 1 - lx0, y - 4 - rl, 2, 4, 'ink', 4, 2);
    b.ell(x - face * 6 + ln * 0.5, by - 9, 3.6, 4.2, 'rope', (px, py, nx, ny) => (nx * nx + ny * ny < 0.16 ? 1 : ny < 0 ? 5 : 4), 2);    // the coil of rope on the back
    b.poly([[x - 7 - (run && f < 2 ? face : 0), by - 3], [x - 4 + ln, by - 14 + breathe], [x + 5 + ln, by - 14 + breathe], [x + 8 - (run && f < 2 ? face : 0), by - 3]], 'gold', (px, py) => (py >= by - 4 ? 1 : px > x + 1 + ln * 0.5 ? 3 : 2), 2);
    const hx = x + ln, lx = hx + face * 11, ly = by - 14 + breathe;
    b.line(hx + face * 3, by - 9, lx, ly - 3, 'wood', 4, 1, 2);
    b.rect(lx - 2, ly - 2, 5, 1, 'ink', 3, 2); b.rect(lx - 2, ly - 1, 5, 5, 'fire', (px) => (px === lx ? 5 : 4), 2, 1); b.rect(lx - 2, ly + 4, 5, 1, 'ink', 3, 2);
    b.poly([[hx - face * 1, by - 25 + breathe], [hx - face * (run ? 11 : 9), by - (run && (f & 1) ? 28 : 26) + breathe], [hx - face * 5, by - 19 + breathe]], 'gold', 2, 2);     // the tip of the hood, streaming behind
    b.ell(hx, by - 19 + breathe, 6.6, 6.6, 'gold', (px, py, nx, ny) => { const l = nx * 0.5 - ny * 0.7; return l > 0.3 ? 4 : l > -0.3 ? 3 : 2; }, 2);
    b.ell(hx + face * 1.5, by - 17.5 + breathe, 4.2, 3.6, 'cream', (px, py, nx, ny) => (ny > 0.4 ? 3 : 4), 2);
    if (Math.sin(t * 0.9) < 0.985) { b.put(hx + face * 2 - 1, by - 18 + breathe, 'ink', 0, 2); b.put(hx + face * 2 + 2, by - 18 + breathe, 'ink', 0, 2); }       // a blink now and then
    b.outline(2);
    glow(b, lx, y - 1, 98, 3, K);
  }

  function village(b, sc, t, C) {
    const H = C.H, lamps = sc.LAMPS - sc.hits;
    [10, 100, 216, 306].forEach((x, i) => {
      const id = 80 + i, y = H - 30, lit = [0, 1, 1, 2][i] < lamps || (i === 1 && lamps > 0);
      b.rect(x + 30, y - 30, 7, 14, 'rock', (px) => (px > x + 33 ? 3 : 2), id);
      b.rect(x + 3, y, 38, 30, 'cream', (px, py) => (py < y + 3 ? 0 : px > x + 30 ? 2 : 1), id);
      b.rect(x + 3, y, 2, 30, 'wood', 2, id); b.rect(x + 39, y, 2, 30, 'wood', 3, id); b.rect(x + 3, y + 14, 38, 2, 'wood', 2, id); b.rect(x + 21, y, 2, 30, 'wood', 2, id);
      b.rect(x + 26, y + 16, 9, 14, 'wood', (px, py) => (px === x + 26 || py === y + 16 ? 1 : 3), id); b.put(x + 33, y + 23, 'gold', lit ? 4 : 2, id);
      b.rect(x + 7, y + 4, 11, 9, 'ink', 1, id); b.rect(x + 8, y + 5, 9, 7, lit ? 'fire' : 'ink', (px, py) => (lit ? (px === x + 12 || py === y + 8 ? 3 : 5) : 2), id, lit ? 1 : 0);
      b.poly([[x - 4, y + 3], [x + 8, y - 20], [x + 36, y - 20], [x + 48, y + 3]], 'straw', (px, py) => (py >= y + 1 ? 0 : (y - py) % 5 === 0 ? 1 : px > x + 26 + (y - py) * 0.3 ? 3 : 2), id);
      b.rect(x + 7, y - 22, 30, 2, 'straw', (px) => (px > x + 24 ? 4 : 3), id);
      b.outline(id);
      if (lit) { b.light(x + 12, y + 8, 40, 2); for (let n = 0; n < 3; n++) { const q = (t * 0.3 + n / 3 + i * 0.37) % 1; if (q < 0.92) b.ell(x + 34 + Math.sin(q * 5 + i) * 3 + q * 9, y - 33 - q * 26, 2 + q * 3.5, 1.6 + q * 2.4, 'cloud', q < 0.5 ? 3 : 2); } }
    });
    [78, 181, 284].forEach((x, k) => {     // the three lamps of the village
      const id = 90 + k, on = k < lamps;
      b.rect(x - 1, H - 32, 3, 32, 'wood', (px) => (px > x ? 3 : 2), id); b.rect(x - 3, H - 2, 7, 2, 'wood', 1, id);
      if (on) lantern(b, x, H - 50, id, 0.9 + Math.sin(t * 7 + k) * 0.04);
      else { b.line(x, H - 55, x, H - 50, 'ink', 1, 1, id); b.rect(x - 6, H - 50, 13, 3, 'ink', 2, id); b.rect(x - 5, H - 47, 11, 12, 'ink', 1, id); b.rect(x - 6, H - 35, 13, 3, 'ink', 2, id); }
      b.outline(id, false);
    });
  }

  function frame(sc, ctx) {
    const W = 360, H = sc.H, t = sc.t, P = sc.p, ch = sc.chain, last = ch[ch.length - 1];
    if (!cache || cache.H !== H) {
      const HZ = Math.round(130 + (H - 640) * 0.4), K = (H - HZ) / H, CREST = HZ - 14, base = buildBase(W, H, HZ, K, CREST, sc.trees);
      cache = { H, HZ, K, CREST, base: base.g, gm: base.gm, sm: new Uint8Array(W * H), b: Buf(W, H), img: ctx.createImageData(W, H), mistA: mistTile(720, 30, 20, 30, 3, 2), mistB: mistTile(720, 26, 16, 24, 6, 1), face: 1 };
      cache.out32 = new Uint32Array(cache.img.data.buffer);
    }
    const C = cache, b = C.b, base = C.base, K = C.K, HZ = C.HZ, GY = (y) => HZ + y * K;
    if (Math.abs(P.wx) > 0.3 && sc.moving) C.face = P.wx < 0 ? -1 : 1;
    b.R.set(base.R); b.S.set(base.S); b.EM.set(base.EM); b.L.fill(0); b.ID.fill(0); C.sm.fill(0); b.box = {}; b.clip = 0;
    for (let i = 0; i < 10; i++) { const j = (Math.floor(t * 1.5) * 7 + i * 13) % 90, x = Math.round(hash(j, 1) * W), y = Math.round(hash(j, 2) * (C.CREST - 24)); if (x < W && base.R[y * W + x] === RI.white) b.put(x, y, 'white', 5, 0, 1); }
    blit(b, C.mistA, Math.floor(t * 5), C.CREST - 14);
    blit(b, C.mistB, Math.floor(-t * 3.5) + 200, Math.round(GY(H * 0.47)) - 12);
    const hid = sc.giants.filter((g) => g.y < -4), out = sc.giants.filter((g) => g.y >= -4), walking = out.filter((g) => g.state === 'walk');
    const gid = (g) => 10 + (sc.giants.indexOf(g) % 40), gn = (g) => parseInt(String(g.id).slice(1), 10) || 0;
    hid.forEach((g) => giant(b, g, gid(g), t, C, gn(g)));
    // moon shadows, and the shadow of a foot coming down with its red rim
    out.forEach((g) => { if (g.state === 'walk' || g.state === 'lean') { const s = g.big ? 1.25 : 1; shadow(C, g.x - 20 * s, GY(g.y) + 4, 34 * s, 11 * s); } });
    shadow(C, P.x - 6, GY(P.y) + 1, 9, 3);
    sc.prints.forEach((q) => { const r = (q.big ? 13 : 11) * (q.a > 6 ? 7 - q.a : 1); if (r > 2) shadow(C, q.x, GY(q.y), r, r * 0.55); });
    walking.forEach((g) => { const sr = g.big ? 31 : 26, ly = GY(g.landY), q = Math.min(1, g.st); shadow(C, g.landX, ly, sr * (0.35 + 0.65 * q), sr * K * (0.35 + 0.65 * q), 2); ringG(b, g.landX, ly, sr, K, 'red', q > 0.55 ? 5 : 3, q > 0.55 ? 0 : 4); });
    // on the ground: tripwires, where the roped giant will fall, the rope
    sc.wires.forEach((w) => { rope(b, w.a.x, GY(w.a.y) - 6, w.b.x, GY(w.b.y) - 6, true); });
    const ready = last && last.kind === 'giant' && last.rings >= last.need;
    if (ready) { const dx = P.x - last.x, dy = P.y - last.y, d = Math.hypot(dx, dy) || 1; for (let q = 34; q <= 132; q += 7) b.put(last.x - dx / d * q, GY(last.y - dy / d * q), 'gold', 4, 0, 1); ringG(b, last.x - dx / d * 140, GY(last.y - dy / d * 140), 9, K, 'gold', 4, 4); if (!sc.tight) ringG(b, last.x, GY(last.y), sc.LEASH + (last.big ? 10 : 0), K, 'cream', 2, 6); }
    const hand = [P.x - C.face * 6, GY(P.y) - 8], peg = (c) => [c.x, GY(c.y) - (c.kind === 'tree' ? 6 : 4)];
    if (ch.length) {
      for (let i = 1; i < ch.length; i++) rope(b, ...peg(ch[i - 1]), ...peg(ch[i]), false);
      const [ax, ay] = peg(last), dx = hand[0] - ax, dy = hand[1] - ay, d = Math.hypot(P.x - last.x, P.y - last.y) || 1, leash = last.kind === 'tree' ? sc.TREE_LEASH : sc.LEASH + (last.big ? 10 : 0), slack = clamp(1 - d / leash, 0, 1), dd = Math.hypot(dx, dy) || 1;
      const mx = (ax + hand[0]) / 2 - dy / dd * slack * 30, my = (ay + hand[1]) / 2 + dx / dd * slack * 30 + slack * 6; let px = ax, py = ay;
      for (let i = 1; i <= 16; i++) { const u = i / 16, x = (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * mx + u * u * hand[0], y = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * my + u * u * hand[1]; rope(b, px, py, x, y, sc.tight); px = x; py = y; }
    } else for (let i = 1; i < sc.trail.length; i++) rope(b, sc.trail[i - 1].x, GY(sc.trail[i - 1].y), sc.trail[i].x, GY(sc.trail[i].y), false);
    // everything that stands up, back to front
    const items = [];
    sc.trees.forEach((c, i) => items.push({ y: c.y, f: () => pine(b, c.x, GY(c.y), 60 + i, hash(i, 91)) }));
    out.forEach((g) => items.push({ y: g.state === 'walk' ? Math.max(g.feet[0].y, g.feet[1].y) : g.y + 2, f: () => giant(b, g, gid(g), t, C, gn(g)) }));
    items.push({ y: P.y, f: () => hero(b, sc, t, C) });
    items.sort((a, c) => a.y - c.y).forEach((q) => q.f());
    // the rope where it is caught: wound on a trunk, looped round a giant's ankles; the lap you are running
    sc.trees.forEach((c) => { const y = Math.round(GY(c.y)); for (let k = 0; k < Math.max(c.rings, sc.wires.some((w) => w.a === c || w.b === c) ? 1 : 0); k++) { b.rect(c.x - 4, y - 7 - k * 3, 9, 2, 'rope', (px, py) => ((px + py) % 3 ? 5 : 3), 0, 1); } });
    walking.forEach((g) => { for (let k = 0; k < g.rings; k++) { ringG(b, g.x, GY(g.y) - 5 - k * 3, g.sp + 13, 0.42, 'rope', 5); ringG(b, g.x, GY(g.y) - 4 - k * 3, g.sp + 13, 0.42, 'rope', 3); } });
    sc.trees.concat(walking).forEach((c) => { if (c.rings < c.need && Math.abs(c.lap) > 0.15 && c.lastAng !== null) arcG(b, c.x, GY(c.y), c.kind === 'tree' ? 26 : 52 * (c.big ? 1.25 : 1), K, c.lastAng - c.lap, c.lap, 'gold', 5); });
    if (last && last.kind === 'tree') sc.trees.forEach((c) => { if (c !== last) ringG(b, c.x, GY(c.y), 28 + Math.round(Math.sin(t * 6) * 2), K, 'gold', 4, 4); });
    if (sc.state === 'playing' && !sc.firstRing && !ch.length) { const tg = walking.filter((g) => g.y > 20).sort((a, c) => c.y - a.y)[0]; if (tg) { const n = 96; for (let i = 0; i < n; i++) if ((i + Math.floor(t * 16)) % 12 < 6) b.put(tg.x + Math.cos(i / n * TAU) * 60, GY(tg.y) + Math.sin(i / n * TAU) * 60 * K, 'gold', 4, 0, 1); } }   // the first lesson, drawn on the ground: run round here
    sc.parts.forEach((p) => {
      const q = p.life / p.max, sx = p.x, sy = GY(p.y) - p.z;
      if (p.kind === 'dust') { const r = p.r * (0.6 + q * 0.9) * (q > 0.6 ? (1 - q) / 0.4 : 1); if (r > 0.8) b.ell(sx, sy, r, r * 0.8, 'cloud', (px, py, nx, ny) => (ny < -0.2 ? 4 : 3)); }
      else if (p.kind === 'chip') { b.rect(sx, sy - 1, 2, 2, 'rock', q < 0.5 ? 5 : 3); b.put(sx, sy + 1, 'ink', 1); }
      else { b.put(sx, sy, p.col, q < 0.5 ? 5 : 4, 0, 1); if (q < 0.6) { b.put(sx + 1, sy, p.col, 4, 0, 1); b.put(sx, sy + 1, p.col, 4, 0, 1); } }
    });
    village(b, sc, t, C);
    // fireflies over the meadow
    for (let i = 0; i < 12; i++) { const x = hash(i, 71) * W + Math.sin(t * 0.7 + i * 2) * 14, y = GY(60 + hash(i, 72) * (H - 180)) - 10 + Math.cos(t * 0.9 + i) * 6; if (Math.sin(t * 2.2 + i * 1.7) > -0.1) { b.put(x, y, 'gold', 5, 0, 1); glow(b, x, y + 8, 13, 1.1, K); } }
    // light in clean steps: the ground and everything on it catch the lantern, the lamps and the heart stones
    const R8 = b.R, S8 = b.S, EM = b.EM, L = b.L, ID = b.ID, gm = C.gm, sm = C.sm, o32 = C.out32;
    // the end of the night: dawn climbs the sky band by band, or the meadow goes dark
    const won = sc.state === 'won', dawnY = won ? C.CREST - sc.endT * 70 : 1e9, lift = won && sc.endT > 0.6 ? 1 : sc.state === 'lost' && sc.endT > 0.3 ? -1 : 0, SA = RI.skyA, SB = RI.skyB, DA = RI.dawnA, DB = RI.dawnB;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      let r = R8[i]; if (r < 0) { o32[i] = 0xff000000; continue; }
      let sh;
      if (EM[i] === 2) sh = 0; else if (EM[i]) sh = S8[i];
      else if (ID[i]) sh = S8[i] + (ID[i] === 2 ? Math.min(1, Math.floor(L[i])) : Math.floor(L[i]));
      else if (gm[i]) sh = S8[i] - sm[i] + Math.floor(L[i]) + lift;
      else { sh = S8[i]; if (y >= dawnY) { if (r === SA) r = DA; else if (r === SB) r = DB; } }
      sh = sh < 0 ? 0 : sh > 5 ? 5 : sh; o32[i] = COL32[r * 6 + sh];
    }
    if (sc.shake > 0.5) {
      const dx = Math.round(Math.sin(t * 61) * sc.shake * 0.7), dy = Math.round(Math.cos(t * 47) * sc.shake * 0.7);
      if (dx || dy) { const tmp = C.tmp || (C.tmp = new Uint32Array(o32.length)); tmp.set(o32); for (let y = 0; y < H; y++) { const sy = clamp(y - dy, 0, H - 1) * W; for (let x = 0; x < W; x++) o32[y * W + x] = tmp[sy + clamp(x - dx, 0, W - 1)]; } }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(C.img, 0, 0);
    ui(sc, ctx, ready, last, C);
  }

  function blocks(ctx, pts, col, sz) { ctx.fillStyle = col; pts.forEach(([x, y]) => ctx.fillRect(Math.round(x), Math.round(y), sz, sz)); }
  function lampIcon(ctx, x, y, on, k) { ctx.fillStyle = '#04030a'; ctx.fillRect(x - k, y, 12 * k, 18 * k); ctx.fillStyle = on ? '#ffd84a' : '#2a3050'; ctx.fillRect(x + k, y + 4 * k, 8 * k, 10 * k); ctx.fillStyle = on ? '#fff8c8' : '#3a4266'; ctx.fillRect(x + 4 * k, y + 6 * k, 2 * k, 6 * k); ctx.fillStyle = '#564c6e'; ctx.fillRect(x, y + 2 * k, 10 * k, 2 * k); ctx.fillRect(x, y + 14 * k, 10 * k, 2 * k); }
  function ui(sc, ctx, ready, last, C) {
    const H = sc.H, t = sc.t, P = sc.p, GY = (y) => C.HZ + y * C.K;
    const fade = () => { const a = sc.leaving >= 0 ? 1 - sc.leaving / 0.25 : sc.fadeIn / 0.5; if (a > 0) { ctx.fillStyle = `rgba(4,3,10,${Math.min(1, a)})`; ctx.fillRect(0, 0, 360, H); } };
    if (sc.state === 'title') {
      const ly = Math.round(H * 0.22);
      text(ctx, 'TANGLE', 180, ly, 6, '#f4ecd8'); text(ctx, 'FOOT', 180, ly + 52, 6, '#ffd23a');
      // a rope under the name, with a loop in it
      const pts = []; for (let u = 0; u <= 1; u += 0.004) { const a = u * TAU; pts.push(u < 0.42 || u > 0.58 ? [62 + u * 236, ly + 110 + Math.sin(u * 9) * 3] : [180 + Math.sin((u - 0.42) / 0.16 * TAU) * 13, ly + 110 - 13 + Math.cos((u - 0.42) / 0.16 * TAU) * 13 + Math.sin(0.42 * 9) * 3 * 0 + a * 0]); }
      blocks(ctx, pts.map(([x, y]) => [x - 1, y - 1]), '#04030a', 5); blocks(ctx, pts, '#94784a', 3); blocks(ctx, pts.filter((q, i) => i % 6 < 3), '#dcc088', 2);
      if (Math.sin(t * 3) > -0.3) text(ctx, 'TAP TO START', 180, Math.round(H * 0.58), 2, '#ffffff');
      fade(); return;
    }
    // numbers and shouts that pop up where things happen
    sc.pops.forEach((q) => { if (q.t > 1.02 && Math.floor(q.t * 30) % 2) return; text(ctx, q.str, clamp(q.x, 14 + q.str.length * 3 * q.k, 346 - q.str.length * 3 * q.k), Math.round(GY(q.y) - 46 - Math.min(1, q.t / 0.45) * 20), q.t < 0.09 ? q.k + 1 : q.k, q.col); });
    // top bar: one small head for every giant of the night, the three lamps, the score
    panel(ctx, 8, 8, 344, 26);
    const onField = sc.giants.filter((g) => g.state !== 'down').length;
    for (let i = 0; i < sc.TOTAL; i++) { const x = 15 + i * 10, col = i < sc.down ? '#ffd23a' : i < sc.down + sc.through ? '#c42636' : i < sc.down + sc.through + onField ? '#a4a8ba' : '#2a3050'; ctx.fillStyle = '#04030a'; ctx.fillRect(x, 14, 8, 14); ctx.fillStyle = col; ctx.fillRect(x + 1, 16, 6, 11); ctx.fillRect(x + 2, 15, 4, 1); ctx.fillStyle = '#04030a'; ctx.fillRect(x + 2, 19, 1, 2); ctx.fillRect(x + 5, 19, 1, 2); ctx.fillRect(x + 2, 23, 4, 1); }
    for (let i = 0; i < sc.LAMPS; i++) lampIcon(ctx, 170 + i * 17, 12, i < sc.LAMPS - sc.hits, 1);
    text(ctx, `${sc.score}`, 342, 14, 2, '#ffd23a', null, 'right');
    sc.giants.forEach((g) => { if (g.state === 'walk' && g.need > 1 && g.y > 0) text(ctx, `${g.rings}/2`, g.x, Math.max(42, GY(g.y) - 136), 2, '#ffd23a'); });
    if (sc.showStick && sc.stick && sc.state === 'playing') {     // where your thumb is steering from
      const r = [], kn = sc.stickNow || sc.stick; for (let i = 0; i < 28; i++) r.push([sc.stick.x + Math.cos(i / 28 * TAU) * 32 - 1, sc.stick.y + Math.sin(i / 28 * TAU) * 32 - 1]);
      ctx.globalAlpha = 0.3; blocks(ctx, r, '#f4ecd8', 2); ctx.fillStyle = '#f4ecd8'; ctx.fillRect(Math.round(kn.x) - 5, Math.round(kn.y) - 3, 10, 6); ctx.fillRect(Math.round(kn.x) - 3, Math.round(kn.y) - 5, 6, 10); ctx.globalAlpha = 1;
    }
    if (sc.state === 'playing') {
      const blink = Math.sin(t * 4) > -0.6;
      if (!sc.moved) { if (blink) text(ctx, 'DRAG TO RUN', P.x, GY(P.y) + 14, 2, '#f4ecd8'); }
      else if (ready) text(ctx, sc.tight ? 'PULL!' : 'NOW RUN AWAY!', clamp(P.x, 90, 270), GY(P.y) - 50, 2, '#fff1b0');
      else if (!sc.firstRing && sc.giants.some((g) => g.state === 'walk' && g.y > 20)) { if (blink) text(ctx, 'RUN A RING ROUND ITS LEGS', 180, H - 104, 2, '#fff1b0'); }
      else if (sc.tipT > 0 && sc.tipT < 7 && !sc.wires.length && !(last && last.kind === 'tree')) text(ctx, 'TIP: A ROPE BETWEEN TWO TREES', 180, H - 104, 2, '#8a92b4');
      if (sc.msg) text(ctx, sc.msg.str, 180, 44, 2, sc.msg.col);
      else if (last && last.kind === 'tree') text(ctx, 'NOW RING ANOTHER TREE', 180, 44, 2, '#fff1b0');
      fade(); return;
    }
    // the end of the night
    const won = sc.state === 'won', y = Math.round(H * 0.3), e = sc.endT;
    ctx.fillStyle = `rgba(4,6,18,${Math.min(won ? 0.25 : 0.55, e * 0.5)})`; ctx.fillRect(0, 0, 360, H);
    if (e > 0.7) {
      panel(ctx, 34, y, 292, 178);
      text(ctx, won ? 'DAWN!' : 'DARKNESS', 180, y + 14, 4, won ? '#ffd23a' : '#ec5550', null);
      text(ctx, won ? 'THE VILLAGE IS SAFE' : 'THE VILLAGE WENT DARK', 180, y + 50, 2, '#cbbfa8', null);
      for (let i = 0; i < sc.LAMPS; i++) if (e > 1 + i * 0.22) lampIcon(ctx, 124 + i * 44, y + 72, i < sc.LAMPS - sc.hits, 2);
      text(ctx, `SCORE ${Math.round(sc.score * clamp((e - 1.1) / 0.7, 0, 1))}`, 180, y + 118, 3, '#f4ecd8', null);
      text(ctx, `${sc.down}/${sc.TOTAL} GIANTS    BEST PULL ${sc.bestCombo}`, 180, y + 148, 2, '#8a92b4', null);
      if (e > 1.8 && Math.sin(t * 4) > -0.3) text(ctx, 'TAP TO PLAY AGAIN', 180, y + 196, 2, '#ffffff');
    }
    fade();
  }

  window.TFPixel = { frame };
})();
