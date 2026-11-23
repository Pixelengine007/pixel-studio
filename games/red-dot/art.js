// Red Dot — all art painted in code: cats (procedural, outlined), the apartment, furniture and icons.
(function () {
  'use strict';
  const S = window.Studio;

  const INK = '#1e1626';
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ---------- pixel buffer helpers ----------
  function buf(w, h) { return { w, h, d: new Array(w * h).fill(null) }; }
  function put(b, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < b.w && y < b.h && c) b.d[y * b.w + x] = c; }
  function get(b, x, y) { return x >= 0 && y >= 0 && x < b.w && y < b.h ? b.d[y * b.w + x] : null; }
  function ellipse(b, cx, cy, rx, ry, colorFn) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) put(b, x, y, colorFn(x, y, dx, dy));
      }
    }
  }
  // 1-pixel dark outline around everything drawn (like Outrun the Flock's sprites)
  function outline(b, color) {
    const add = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (get(b, x, y)) continue;
      if (get(b, x - 1, y) || get(b, x + 1, y) || get(b, x, y - 1) || get(b, x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => put(b, x, y, color || INK));
    return b;
  }
  function blit(ctx, b, ox, oy, flip) {
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const c = b.d[y * b.w + x];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + (flip ? b.w - 1 - x : x), oy + y, 1, 1);
    }
  }

  // ---------- cats ----------
  // coat: { base, shade, light, stripe?, patch?, eye, size }
  const COATS = {
    mango: { base: '#ee9a45', shade: '#bf6a2c', light: '#fbe0b6', stripe: '#c8722f', eye: '#3a2a1a', size: 1 },
    smokey: { base: '#8f93a8', shade: '#65697e', light: '#c9ccd8', stripe: '#6e7288', eye: '#2a3a24', size: 1 },
    oreo: { base: '#2f2a3a', shade: '#1f1b28', light: '#f2eee6', eye: '#e8c84a', size: 1.12, tux: true },
    pip: { base: '#f4efe6', shade: '#cfc6b8', light: '#ffffff', patch: ['#e8913a', '#3a3140'], eye: '#2a2a3a', size: 0.82 },
  };
  const FW = 30, FH = 24; // frame size
  // poses: walk0-3, run0-3, idle0-1, crouch0-1, pounce0-1, sleep0-1, sit0-1, groom0-1
  const POSES = [];
  ['walk', 'run'].forEach((p) => { for (let i = 0; i < 4; i++) POSES.push([p, i]); });
  ['idle', 'crouch', 'pounce', 'sleep', 'sit', 'groom'].forEach((p) => { for (let i = 0; i < 2; i++) POSES.push([p, i]); });
  const POSE_INDEX = {};
  POSES.forEach(([p, i], n) => { POSE_INDEX[`${p}${i}`] = n; });

  function coatColor(coat, x, y, cx, cy, belly, partSeed) {
    if (coat.tux) return belly ? coat.light : coat.base;
    if (coat.patch) {
      const n = hash(Math.floor(x / 3), Math.floor(y / 3), partSeed);
      if (n < 0.22) return coat.patch[0];
      if (n < 0.34) return coat.patch[1];
      return belly ? coat.light : coat.base;
    }
    if (belly) return coat.light;
    if (coat.stripe && ((x + 40) % 3 === 0)) return coat.stripe;
    return coat.base;
  }

  function drawCatFrame(coat, pose, i) {
    const b = buf(FW, FH);
    const k = coat.size * 1.35; // unit size
    let cx = 14, cy = 15; // body centre
    let rx = 5.2 * k, ry = 2.8 * k;
    let hx = cx + 5.4 * k, hy = cy - 3.1 * k, hr = 3.0 * k;
    let legPhase = 0, legLen = 4, tail = 'up', tailWave = i;
    let eyesClosed = false, mouthOpen = false, wide = false;
    if (pose === 'walk') { legPhase = i; cy += (i % 2) * 0.4; }
    if (pose === 'run') { legPhase = i + 10; rx = 6 * k; ry = 2.5 * k; hx = cx + 6.3 * k; hy = cy - 2.3 * k; tail = 'back'; cy -= (i % 2); hy -= (i % 2); }
    if (pose === 'idle') { tailWave = i * 2; }
    if (pose === 'crouch') { cy += 2; hy = cy - 1.5 * k; hx = cx + 5.8 * k; legLen = 2; tail = i ? 'flick' : 'low'; cx += i * 0.5; wide = true; }
    if (pose === 'pounce') { rx = 7 * k; ry = 2.3 * k; hx = cx + 7.2 * k; hy = cy - 2.2 * k; legLen = 0; tail = 'back'; mouthOpen = true; legPhase = 99; wide = true; }
    if (pose === 'sit') { rx = 3.4 * k; ry = 3.6 * k; cy = 15; hx = cx + 1.8 * k; hy = cy - 4.8 * k; legLen = 0; tail = 'curl'; tailWave = i; }
    if (pose === 'groom') { rx = 3.4 * k; ry = 3.6 * k; hx = cx + 2.4 * k; hy = cy - 3.8 * k + i * 0.7; legLen = 0; tail = 'curl'; eyesClosed = true; }
    if (pose === 'sleep') { rx = 5 * k; ry = 3.1 * k + i * 0.35; cy = 17; hx = cx + 3.8 * k; hy = cy - 0.8; legLen = 0; tail = 'wrap'; eyesClosed = true; hr = 2.7 * k; }

    // tail (drawn first so the body overlaps it), 2 px thick
    const tcol = coat.tux ? coat.base : coat.patch ? coat.patch[1] : coat.shade;
    const tx = cx - rx + 0.5, ty = cy - 0.5;
    const pts = [];
    const L = Math.round(6 * k);
    if (tail === 'up') for (let s = 0; s <= L; s++) pts.push([tx - 1 - Math.sin(s * 0.3) * 2 + (s > L - 3 ? (tailWave % 2 ? 1 : -1) * (s - L + 3) * 0.6 : 0), ty - s]);
    if (tail === 'back') for (let s = 0; s <= L; s++) pts.push([tx - s, ty - 1 - Math.sin(s * 0.45 + tailWave) * 1.1]);
    if (tail === 'low') for (let s = 0; s <= L; s++) pts.push([tx - s, ty + 0.5 - (s > L - 3 ? (s - L + 3) * 0.8 : 0)]);
    if (tail === 'flick') for (let s = 0; s <= L; s++) pts.push([tx - s, ty + 0.5 - (s > L / 2 ? (s - L / 2) * 0.9 : 0)]);
    if (tail === 'curl') for (let s = 0; s <= L; s++) pts.push([cx - rx + 1 + s * 0.9, cy + ry - 0.4 - (s > L - 2 ? (tailWave ? 1 : 0) : 0)]);
    if (tail === 'wrap') for (let s = 0; s <= L + 2; s++) pts.push([cx - rx + 0.5 + s, cy + ry - 0.4 - Math.sin(s * 0.35) * 0.8]);
    pts.forEach(([x, y]) => { put(b, x, y, tcol); put(b, x + 1, y, tcol); });
    if (coat.stripe) pts.forEach(([x, y], n) => { if (n % 3 === 0) put(b, x, y, coat.stripe); });

    // legs (behind = shade, front = base), 2 px wide paws
    if (legLen > 0) {
      const legsX = [cx - rx * 0.62, cx - rx * 0.25, cx + rx * 0.35, cx + rx * 0.7];
      legsX.forEach((lx, n) => {
        const front = n % 2 === 1;
        const phase = legPhase >= 10 ? (legPhase - 10 + n * 2) % 4 : (legPhase + n * 2) % 4;
        const swing = [0, 1, 0, -1][phase] * (legPhase >= 10 ? 2 : 1.2);
        for (let l = 0; l < legLen; l++) {
          const paw = l >= legLen - 1;
          const c = (coat.tux || coat.patch) && paw ? coat.light : front ? coat.base : coat.shade;
          const x = lx + swing * (l / Math.max(1, legLen - 1));
          put(b, x, cy + ry - 0.5 + l, c);
          if (paw || front) put(b, x + 1, cy + ry - 0.5 + l, c);
        }
      });
    } else if (pose === 'pounce') {
      // front paws reaching forward, back legs stretched behind
      for (let s = 0; s < 4; s++) { put(b, cx + rx - 1 + s, cy + 1 + (i ? 0 : 1), coat.tux ? coat.light : coat.base); put(b, cx + rx - 1 + s, cy + 2 + (i ? 0 : 1), coat.shade); }
      for (let s = 0; s < 4; s++) { put(b, cx - rx - s + 1, cy + 1.5, coat.shade); put(b, cx - rx - s + 1, cy + 2.5, coat.shade); }
    }

    // body: shaded underside, light back highlight
    ellipse(b, cx, cy, rx, ry, (x, y, dx, dy) => {
      if (dy > 0.55) return coat.tux ? (dy > 0.72 && dx > -0.2 ? coat.light : coat.base) : coat.shade;
      const belly = dy > 0.2 && dx > -0.3 && (coat.tux || coat.patch || pose === 'sit' || pose === 'groom');
      if (dy < -0.7 && !coat.tux && !coat.patch && dx > -0.5 && dx < 0.4) return coat.light;
      return coatColor(coat, x, y, cx, cy, belly, 1);
    });
    // head with cheek fluff
    ellipse(b, hx, hy, hr, hr * 0.9, (x, y, dx, dy) => {
      if (coat.tux) return dy > 0.05 && Math.abs(dx) < 0.7 ? coat.light : coat.base;
      if (dy > 0.3 && dx > -0.3) return coat.light;
      if (coat.stripe && dy < -0.45 && Math.round(x) % 2 === 0) return coat.stripe;
      return coatColor(coat, x, y, cx, cy, false, 2);
    });
    // ears: 2-3 px triangles with pink inside
    const ear = (ex) => {
      const ey = hy - hr * 0.75;
      put(b, ex - 1, ey, coat.base); put(b, ex, ey, coat.base); put(b, ex + 1, ey, coat.base);
      put(b, ex - 1, ey - 1, coat.base); put(b, ex, ey - 1, '#f2a6b6');
      put(b, ex - 1, ey - 2, coat.base);
    };
    ear(hx - hr * 0.35); ear(hx + hr * 0.6);
    // face: two eyes, nose, optional open mouth; wide pupils when hunting
    const fx = Math.round(hx), fy = Math.round(hy);
    if (eyesClosed) { put(b, fx - 1, fy, coat.shade); put(b, fx + 2, fy, coat.shade); }
    else {
      put(b, fx - 1, fy - 1, coat.eye); put(b, fx + 2, fy - 1, coat.eye);
      if (wide) { put(b, fx - 1, fy, coat.eye); put(b, fx + 2, fy, coat.eye); }
      else { put(b, fx - 1, fy, '#ffffff'); put(b, fx + 2, fy, '#ffffff'); }
    }
    put(b, fx + 1, fy + 1, '#ee7a92'); // nose
    if (mouthOpen) { put(b, fx + 1, fy + 2, '#8a2a3a'); put(b, fx + 2, fy + 2, '#8a2a3a'); }
    return outline(b, INK);
  }

  function buildCatSheet(scene, key, coat) {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, FW * POSES.length * 2, FH);
    const ctx = tex.getContext();
    POSES.forEach(([p, i], n) => {
      const b = drawCatFrame(coat, p, i);
      blit(ctx, b, n * FW, 0, false); // facing right
      blit(ctx, b, (POSES.length + n) * FW, 0, true); // facing left
      tex.add(n, 0, n * FW, 0, FW, FH);
      tex.add(POSES.length + n, 0, (POSES.length + n) * FW, 0, FW, FH);
    });
    tex.refresh();
  }

  // ---------- room ----------
  const COL = {
    plank0: '#8a5a3a', plank1: '#9a6642', plank2: '#ab774e', gap: '#6a422c',
    wall0: '#5f7fa8', wall1: '#6f90b8', wallTrim: '#f0e6d2', skirting: '#e8dcc4',
    sun0: '#d9a46a', sun1: '#e9b97c',
  };

  function canvasTex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const t = scene.textures.createCanvas(key, w, h);
    draw(t.getContext(), w, h);
    t.refresh();
    return key;
  }
  function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function frame(ctx, x, y, w, h, c) { rect(ctx, x, y, w, 1, c); rect(ctx, x, y + h - 1, w, 1, c); rect(ctx, x, y, 1, h, c); rect(ctx, x + w - 1, y, 1, h, c); }

  function inSun(x, y) {
    // a slanted beam from the window (x 62..118 at y 38) to (x 84..146 at y 128)
    if (y < 38 || y > 128) return false;
    const t = (y - 38) / 90;
    return x >= 62 + t * 22 && x <= 118 + t * 28;
  }

  // distance (px) inside the sunbeam, 0 when outside
  function sunDist(x, y) {
    if (y < 38 || y > 130) return 0;
    const t = (y - 38) / 92;
    const l = 62 + t * 22, r = 118 + t * 28;
    const d = Math.min(x - l, r - x, (130 - y) * 0.7);
    return d > 0 ? d : 0;
  }

  function buildRoom(scene, H, fullH) {
    fullH = fullH || H;
    canvasTex(scene, 'room', 180, H, (ctx) => {
      // floor planks: long boards of varied length, wood grain, soft seams
      for (let y = 0; y < H; y++) for (let x = 0; x < 180; x++) {
        const row = Math.floor(y / 8);
        const ry = y % 8;
        const off = Math.floor(hash(row, 7, 1) * 90);
        const plank = Math.floor((x + off) / 64);
        const ex = (x + off) % 64;
        const tone = hash(plank, row, 2);
        let c;
        if (ry === 7) c = COL.gap;
        else if (ex === 0) c = COL.gap;
        else {
          const grain = Math.sin((x + off) * 0.09 + ry * 1.7 + tone * 40) * 0.5 + 0.5;
          const v = tone * 0.55 + grain * 0.3 + (bay(x, y) - 0.5) * 0.22 + (ry === 0 ? 0.15 : 0);
          c = v < 0.36 ? COL.plank0 : v < 0.68 ? COL.plank1 : COL.plank2;
          if (hash(x, y, 3) < 0.012) c = COL.gap; // knots
          const sd = sunDist(x, y);
          if (sd > 0 && (sd > 3 || bay(x, y) < sd / 4)) c = v < 0.45 ? COL.sun0 : COL.sun1;
        }
        px(ctx, x, y, c);
      }
      // rug (oval with border and pattern)
      const rcx = 90, rcy = 186, rrx = 58, rry = 34;
      for (let y = rcy - rry; y <= rcy + rry; y++) for (let x = rcx - rrx; x <= rcx + rrx; x++) {
        const dx = (x - rcx) / rrx, dy = (y - rcy) / rry, d = dx * dx + dy * dy;
        if (d > 1) continue;
        let c = '#b84a5a';
        if (d > 0.82) c = '#7a2e44';
        else if (d > 0.7) c = '#f0d690';
        else if (d < 0.25) c = (Math.abs(x - rcx) + Math.abs(y - rcy) * 1.7) % 8 < 4 ? '#d76a6e' : '#b84a5a';
        else if (Math.abs(((Math.atan2(dy, dx) * 8 / Math.PI) % 1)) < 0.18) c = '#d76a6e';
        if (c === '#b84a5a' && hash(x, y, 9) < 0.08) c = '#a8424f';
        px(ctx, x, y, c);
      }
      // wall
      for (let y = 0; y < 38; y++) for (let x = 0; x < 180; x++) {
        let c = (x % 10 < 5) ? COL.wall0 : COL.wall1; // striped wallpaper
        if (hash(x, y, 4) < 0.05) c = COL.wall0;
        if (y >= 33) c = y === 33 ? INK : y === 37 ? '#bfae90' : COL.skirting;
        px(ctx, x, y, c);
      }
      // window with sky, sill and curtains
      rect(ctx, 64, 6, 52, 24, INK);
      for (let y = 7; y < 29; y++) for (let x = 65; x < 115; x++) {
        const v = (y - 7) / 22 + (bay(x, y) - 0.5) * 0.3;
        px(ctx, x, y, v < 0.4 ? '#9fdcf6' : v < 0.75 ? '#c5ecf8' : '#e9f8fb');
      }
      rect(ctx, 89, 7, 2, 22, '#f0e6d2'); rect(ctx, 65, 17, 50, 2, '#f0e6d2');
      rect(ctx, 62, 29, 56, 3, '#f0e6d2'); rect(ctx, 62, 32, 56, 1, '#bfae90');
      for (const cxp of [57, 116]) {
        for (let y = 3; y < 33; y++) for (let x = 0; x < 7; x++) {
          const fold = (x + (y > 20 ? 1 : 0)) % 3 === 0;
          px(ctx, cxp + x, y, x === 0 || x === 6 ? INK : fold ? '#c84a5a' : '#e8606e');
        }
      }
      rect(ctx, 55, 2, 70, 2, '#5e3a28');
      // wall clock (left) and picture frame (right)
      for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
        const d = x * x + y * y;
        if (d <= 36) px(ctx, 28 + x, 16 + y, d > 25 ? INK : d > 20 ? '#e8dcc4' : '#fffaf0');
      }
      rect(ctx, 28, 12, 1, 5, INK); rect(ctx, 28, 16, 3, 1, INK);
    });

    // furniture (each its own image so cats can walk behind or in front by y)
    canvasTex(scene, 'sofa', 44, 62, (ctx) => {
      // top-down: back rest on the left, two rounded arm rests, two seat cushions, a throw pillow
      const T0 = '#2a6b68', T1 = '#3f8f8a', T2 = '#57aaa2', T3 = '#7cc4b8';
      const round = (x0, y0, w, h, fill) => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
          if (corner) continue;
          const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
          px(ctx, x0 + x, y0 + y, edge ? INK : fill(x, y, w, h));
        }
      };
      // shadow on the floor (right and bottom)
      rect(ctx, 3, 59, 41, 3, 'rgba(30,22,38,0.35)'); rect(ctx, 41, 3, 3, 58, 'rgba(30,22,38,0.35)');
      round(0, 0, 42, 60, () => T0); // frame
      round(0, 0, 11, 60, (x, y) => (x < 3 ? T1 : x > 8 ? T0 : bay(x, y) < 0.25 ? T1 : T0)); // back rest
      round(4, 0, 38, 10, (x, y) => (y < 3 ? T2 : y > 7 ? T0 : T1)); // arm rest top
      round(4, 50, 38, 10, (x, y) => (y < 3 ? T2 : y > 7 ? T0 : T1)); // arm rest bottom
      for (const cy of [9, 29]) round(10, cy, 31, 22, (x, y, w, h) => {
        if (y < 2 || x < 2) return T3;
        if (y > h - 3 || x > w - 3) return T0;
        return bay(x, y) < 0.18 ? T2 : (x + y) % 9 === 0 ? T2 : T1;
      });
      // throw pillow and a dent where someone sat
      round(13, 13, 11, 10, (x, y) => (y < 2 ? '#f6d68a' : (x + y) % 3 === 0 ? '#e8b84a' : '#f0c860'));
      px(ctx, 30, 40, T0); px(ctx, 31, 40, T0); px(ctx, 30, 41, T0);
    });
    canvasTex(scene, 'table', 34, 30, (ctx) => {
      rect(ctx, 0, 6, 34, 18, INK);
      for (let y = 7; y < 23; y++) for (let x = 1; x < 33; x++) px(ctx, x, y, y < 9 ? '#c88a5a' : bay(x, y) < 0.25 ? '#8a5a3a' : '#a06a44');
      rect(ctx, 2, 23, 3, 6, '#5e3a28'); rect(ctx, 29, 23, 3, 6, '#5e3a28');
      frame(ctx, 1, 23, 5, 7, INK); frame(ctx, 28, 23, 5, 7, INK);
    });
    canvasTex(scene, 'vase', 10, 16, (ctx) => {
      const rows = ['..0000....', '.0bbbb0...', '..0bb0....', '.0bbbb0...', '0bbllbb0..', '0bbllbb0..', '0bbbbbb0..', '0bbbbbb0..', '.0bbbb0...', '..0000....'];
      const col = { 0: INK, b: '#4a7ad0', l: '#9fc4f2' };
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') px(ctx, x, y + 4, col[ch]); }));
      // flowers
      px(ctx, 2, 1, '#ff7fc1'); px(ctx, 5, 0, '#ffd84d'); px(ctx, 3, 2, '#5aa04a'); px(ctx, 4, 3, '#5aa04a'); px(ctx, 6, 2, '#ff4f5e');
    });
    canvasTex(scene, 'shelf', 46, 20, (ctx) => {
      rect(ctx, 0, 0, 46, 20, INK);
      rect(ctx, 1, 1, 44, 18, '#7a4a30');
      const books = ['#c84a5a', '#e8b84a', '#3f8f8a', '#4a7ad0', '#f0e6d2', '#8a5aa8', '#e8606e', '#5aa04a'];
      let x = 2;
      for (let i = 0; x < 43; i++) {
        const w = 2 + Math.floor(hash(i, 0, 5) * 3), h = 9 + Math.floor(hash(i, 1, 5) * 6);
        rect(ctx, x, 17 - h, w, h, books[i % books.length]);
        rect(ctx, x, 17 - h, 1, h, INK);
        x += w + 1;
      }
      rect(ctx, 1, 17, 44, 2, '#5e3a28');
    });
    canvasTex(scene, 'plant', 22, 30, (ctx) => {
      const leaf = (x0, y0, dx, dy, n) => { for (let s = 0; s < n; s++) { px(ctx, x0 + dx * s, y0 + dy * s, s % 3 === 0 ? '#2e7a3e' : '#5aa04a'); px(ctx, x0 + dx * s + 1, y0 + dy * s, '#7fc85e'); } };
      leaf(10, 14, -1, -1, 9); leaf(11, 14, 1, -1, 9); leaf(10, 14, 0, -1, 12); leaf(10, 15, -1, 0, 8); leaf(11, 15, 1, 0, 8);
      rect(ctx, 5, 17, 12, 12, INK);
      for (let y = 18; y < 28; y++) for (let x = 6; x < 16; x++) px(ctx, x, y, y < 20 ? '#e8846a' : bay(x, y) < 0.3 ? '#b85a40' : '#c8684a');
    });
    canvasTex(scene, 'box', 26, 22, (ctx) => {
      rect(ctx, 0, 4, 26, 18, INK);
      for (let y = 5; y < 21; y++) for (let x = 1; x < 25; x++) px(ctx, x, y, y < 9 ? '#5e4024' : bay(x, y) < 0.3 ? '#b8864e' : '#c8965a');
      // open flaps
      for (let x = 0; x < 26; x++) { px(ctx, x, 3, INK); px(ctx, x, 2, x < 13 ? '#d8a66a' : '#b8864e'); }
      rect(ctx, 9, 13, 8, 1, '#8a6038');
    });
    // carrier (top-down): white plastic shell, open side facing up into the room, fleece inside
    canvasTex(scene, 'carrierBack', 50, 40, (ctx) => {
      rect(ctx, 0, 0, 50, 40, INK);
      for (let y = 1; y < 39; y++) for (let x = 1; x < 49; x++) {
        const wall = x < 7 || x > 42 || y > 32;
        let c = wall ? (x < 3 || y > 36 ? '#bcb6c6' : '#ece8f2') : '#4a4258';
        if (!wall) { // fleece blanket with a soft check
          c = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? '#e88aa6' : '#f2a8be';
          if (y < 9) c = bay(x, y) < (9 - y) / 8 ? '#3a3248' : c; // shadow under the rim
        }
        px(ctx, x, y, c);
      }
      rect(ctx, 6, 1, 1, 32, INK); rect(ctx, 43, 1, 1, 32, INK); rect(ctx, 6, 32, 38, 1, INK);
      // handle on the front
      rect(ctx, 18, 34, 14, 3, INK); rect(ctx, 19, 35, 12, 1, '#6a6478');
      // vents
      for (const vx of [2, 45]) for (let vy = 8; vy < 28; vy += 4) { px(ctx, vx, vy, '#8a8496'); px(ctx, vx + 1, vy, '#8a8496'); }
    });
    canvasTex(scene, 'carrierFront', 50, 10, (ctx) => {
      rect(ctx, 0, 0, 50, 10, INK);
      for (let x = 1; x < 49; x++) for (let y = 1; y < 9; y++) px(ctx, x, y, y > 6 ? '#bcb6c6' : '#ece8f2');
      rect(ctx, 18, 3, 14, 3, INK); rect(ctx, 19, 4, 12, 1, '#6a6478');
    });
    // the wire door, lying open on the floor beside the entrance
    canvasTex(scene, 'doorOpen', 10, 26, (ctx) => {
      rect(ctx, 0, 0, 10, 26, INK);
      for (let y = 1; y < 25; y++) for (let x = 1; x < 9; x++) px(ctx, x, y, (y % 4 === 0 || x % 3 === 0) ? '#a8a2b4' : '#4a3a30');
      rect(ctx, 1, 1, 8, 1, '#d8d4dc');
    });
    // a paw-print welcome mat in front of the entrance
    canvasTex(scene, 'mat', 36, 14, (ctx) => {
      for (let y = 0; y < 14; y++) for (let x = 0; x < 36; x++) {
        const corner = (x < 2 || x > 33) && (y < 2 || y > 11);
        if (corner) continue;
        const edge = x === 0 || y === 0 || x === 35 || y === 13;
        px(ctx, x, y, edge ? '#3a5a3a' : (x + y) % 2 ? '#6aa860' : '#5a9a52');
      }
      const paw = (ox, oy) => { rect(ctx, ox, oy + 2, 3, 2, '#f3e7cc'); px(ctx, ox - 1, oy, '#f3e7cc'); px(ctx, ox + 1, oy - 1, '#f3e7cc'); px(ctx, ox + 3, oy, '#f3e7cc'); };
      paw(9, 5); paw(17, 8); paw(25, 5);
    });
    canvasTex(scene, 'door', 36, 6, (ctx) => {
      rect(ctx, 0, 0, 36, 6, INK);
      for (let x = 1; x < 35; x++) for (let y = 1; y < 5; y++) px(ctx, x, y, x % 3 === 0 ? INK : '#b8b4c0');
    });
    // vignette
    // extra wall for tall phones: wallpaper up to a crown moulding
    if (fullH > H) canvasTex(scene, 'wallTop', 180, fullH - H, (ctx, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < 180; x++) {
        let c = (x % 10 < 5) ? COL.wall0 : COL.wall1;
        if (hash(x, y, 4) < 0.05) c = COL.wall0;
        if (y < 6) c = y === 5 ? INK : y === 4 ? '#bfae90' : COL.skirting;
        else if (y < 10 && bay(x, y) < (10 - y) / 5) c = '#4f6f98'; // soft shadow under the moulding
        px(ctx, x, y, c);
      }
      if (h < 44) return;
      const by = Math.max(12, Math.floor(h / 2) - 14);
      // framed landscape (left)
      rect(ctx, 15, by + 2, 34, 26, 'rgba(30,22,38,0.35)');
      rect(ctx, 12, by, 34, 26, INK); rect(ctx, 13, by + 1, 32, 24, '#c88a5a'); rect(ctx, 15, by + 3, 28, 20, INK);
      for (let y = by + 4; y < by + 22; y++) for (let x = 16; x < 42; x++) {
        const hill = by + 15 - Math.round(Math.sin(x * 0.35) * 2), far = by + 12 - Math.round(Math.sin(x * 0.2 + 1) * 3);
        px(ctx, x, y, y > hill ? (bay(x, y) < 0.3 ? '#4a8a4a' : '#5aa04a') : y > far ? '#7fa8c8' : bay(x, y) < (y - by) / 14 ? '#f6c882' : '#9fdcf6');
      }
      rect(ctx, 34, by + 6, 3, 3, '#ffd84d');
      // calendar with the vet appointment circled (right)
      const cx = 132, cy = by - 2;
      rect(ctx, cx + 3, cy + 3, 30, 32, 'rgba(30,22,38,0.35)');
      rect(ctx, cx, cy, 30, 32, INK); rect(ctx, cx + 1, cy + 1, 28, 30, '#fffaf0'); rect(ctx, cx + 1, cy + 1, 28, 7, '#e8606e');
      px(ctx, cx + 14, cy - 2, INK); px(ctx, cx + 14, cy - 1, INK); px(ctx, cx + 15, cy - 1, INK);
      for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 6; c2++) rect(ctx, cx + 3 + c2 * 4, cy + 11 + r * 5, 2, 2, '#bfae90');
      // red ring around one day
      const rx0 = cx + 3 + 4 * 4, ry0 = cy + 11 + 2 * 5;
      for (let a2 = 0; a2 < 24; a2++) { const t = (a2 / 24) * Math.PI * 2; px(ctx, Math.round(rx0 + 1 + Math.cos(t) * 3.5), Math.round(ry0 + 1 + Math.sin(t) * 3), '#d8283a'); }
    });
    canvasTex(scene, 'vignette', 180, fullH, (ctx) => {
      const H = fullH;
      for (let y = 0; y < H; y++) for (let x = 0; x < 180; x++) {
        const dx = (x - 90) / 90, dy = (y - H / 2) / (H / 2);
        const d = Math.max(0, Math.sqrt(dx * dx * 0.9 + dy * dy * 0.7) - 0.8) * 1.7;
        if (bay(x, y) < d * 0.55) px(ctx, x, y, INK);
      }
    });
  }

  // small icons: ! ? z heart star shard
  function buildIcons(scene) {
    S.sprite(scene, 'icoAlert', ['.00.', '0770', '0770', '0770', '.00.', '0770', '.00.']);
    S.sprite(scene, 'icoHuh', ['.000.', '04440', '00.40', '.0440', '.040.', '.000.', '.040.', '.000.']);
    S.sprite(scene, 'icoZ', ['0000', '0440', '.040', '0440', '0000']);
    S.sprite(scene, 'icoHeart', ['.0.0.', '05050', '05550', '.050.', '..0..']);
    S.sprite(scene, 'star', ['....0....', '...070...', '0007770000', '.0777770.', '..07770..', '.0770770.', '.00...00.'].map((r) => r.padEnd(9, '.').slice(0, 9)));
    S.sprite(scene, 'starOff', ['....0....', '...020...', '0002220000', '.0222220.', '..02220..', '.0220220.', '.00...00.'].map((r) => r.padEnd(9, '.').slice(0, 9)));
    S.sprite(scene, 'arrow', ['00000000.', '07777770.', '07777770.', '00777700.', '.007700..', '..0770...', '...00....'].map((r) => r.slice(0, 8)));
    S.sprite(scene, 'catIcon', ['0...0', '04040', '04440', '40404', '04440']);
  }

  window.RedDotArt = { COATS, FW, FH, POSES, POSE_INDEX, buildCatSheet, buildRoom, buildIcons, inSun, hash, INK };
})();
