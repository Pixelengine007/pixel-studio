// Shell Swap — all art painted in code: beach, sea, rocks, shells, hermit crabs, gull, icons.
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
  function vnoise(x, y, s) { // smooth value noise
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ---------- pixel buffers ----------
  function buf(w, h) { return { w, h, d: new Array(w * h).fill(null) }; }
  function put(b, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < b.w && y < b.h && c) b.d[y * b.w + x] = c; }
  function get(b, x, y) { return x >= 0 && y >= 0 && x < b.w && y < b.h ? b.d[y * b.w + x] : null; }
  function ellipse(b, cx, cy, rx, ry, fn) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) { const c = fn(x, y, dx, dy); if (c) b.d[y * b.w + x] = c; }
      }
    }
  }
  function outline(b, color) {
    const add = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (get(b, x, y)) continue;
      if (get(b, x - 1, y) || get(b, x + 1, y) || get(b, x, y - 1) || get(b, x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => { b.d[y * b.w + x] = color || INK; });
    return b;
  }
  function blit(ctx, b, ox, oy) {
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const c = b.d[y * b.w + x];
      if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); }
    }
  }
  function canvasTex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const t = scene.textures.createCanvas(key, w, h);
    draw(t.getContext(), w, h);
    t.refresh();
    return t;
  }
  function bufTex(scene, key, b) { canvasTex(scene, key, b.w, b.h, (ctx) => blit(ctx, b, 0, 0)); }
  function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // ---------- sizes ----------
  const shellD = (s) => 8 + 3 * s; // shell diameter in px: 11, 14, 17, 20, 23
  const bodyW = (c) => 8 + 2 * c; // crab carapace width: 10..18
  const bodyH = (c) => 5 + c; // carapace height: 6..10

  // ---------- shells ----------
  // each size is a different kind of shell so fit is readable at a glance
  const SHELLS = {
    1: { name: 'periwinkle', base: '#6a7a4a', shade: '#4a5a34', light: '#a8b878', line: '#3a4428' },
    2: { name: 'turban', base: '#7f98b8', shade: '#5a7090', light: '#c4d4e8', line: '#465a78', bands: true },
    3: { name: 'whelk', base: '#f0e2c0', shade: '#cdb48a', light: '#fffaf0', line: '#8a5a3a', stripes: true },
    4: { name: 'moon', base: '#f2b8c0', shade: '#d08a9a', light: '#fff0f2', line: '#a85a74' },
    5: { name: 'triton', base: '#f08a3a', shade: '#c0602a', light: '#ffd2a0', line: '#fff2d8', spikes: true, bands: true },
  };
  function drawShell(s) {
    const k = SHELLS[s];
    const d = shellD(s), R = d / 2;
    const pad = s === 5 ? 3 : 2;
    const b = buf(d + pad * 2, Math.round(d * 0.9) + pad * 2);
    const cx = b.w / 2, cy = b.h / 2;
    ellipse(b, cx, cy, R, R * 0.86, (x, y, dx, dy) => {
      const ang = Math.atan2(dy, dx);
      let c = k.base;
      if (k.stripes && Math.floor((ang + Math.PI) * 3) % 2 === 0) c = k.shade;
      if (k.bands && Math.floor(Math.sqrt(dx * dx + dy * dy) * 4) % 2 === 1) c = k.shade;
      if (dx + dy > 0.75 || dy > 0.62) c = k.shade;
      if (dx < -0.1 && dy < -0.2 && dx * dx + dy * dy > 0.25 && dx * dx + dy * dy < 0.6) c = k.light;
      return c;
    });
    // spiral (whorl lines) towards the apex, upper right
    const ax = cx + R * 0.2, ay = cy - R * 0.2, turns = 3.2 * Math.PI;
    for (let t = 0; t < turns; t += 0.05) {
      const r = R * 0.78 * (1 - t / turns);
      put(b, ax + Math.cos(t) * r, ay + Math.sin(t) * r * 0.86, k.line);
    }
    put(b, ax, ay, k.light);
    // spikes on the triton
    if (k.spikes) for (let a = -2.6; a < 0.2; a += 0.55) put(b, cx + Math.cos(a) * (R + 1), cy + Math.sin(a) * (R * 0.86 + 1), k.light);
    // opening (aperture), lower left
    ellipse(b, cx - R * 0.22, cy + R * 0.42, R * 0.42, R * 0.26, (x, y, dx, dy) => (dx * dx + dy * dy > 0.55 ? '#f6c6c8' : '#3a2030'));
    return outline(b, INK);
  }
  function drawCap() { // bottle cap: trash, nobody's real home
    const b = buf(14, 12);
    ellipse(b, 7, 6, 5.5, 4.6, (x, y, dx, dy) => {
      const r = dx * dx + dy * dy;
      if (r > 0.7) return Math.round(Math.atan2(dy, dx) * 4) % 2 ? '#c8283a' : '#e8505a';
      if (r < 0.2 && dx < 0) return '#ff8a8a';
      return '#e83a48';
    });
    put(b, 6, 5, '#f3e7cc'); put(b, 7, 5, '#f3e7cc'); put(b, 8, 6, '#f3e7cc');
    return outline(b, INK);
  }

  // ---------- crabs ----------
  const CRAB_COL = [
    { base: '#e8603c', shade: '#b8402c', light: '#ff9a6a', claw: '#f27a4c' }, // red
    { base: '#f09a30', shade: '#c0701e', light: '#ffd27a', claw: '#f8b048' }, // orange
    { base: '#a45ab8', shade: '#78388c', light: '#d898e8', claw: '#e86070' }, // purple pincher
  ];
  const CFW = 32, CFH = 24; // crab frame
  const CPOSES = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'poke0', 'poke1', 'shiver0', 'shiver1', 'hide0', 'hide1', 'cheer0', 'cheer1'];
  // crab body drawn front-facing; anchor = bottom centre (16, 22)
  function drawCrab(c, col, pose) {
    const b = buf(CFW, CFH);
    const w = bodyW(c), h = bodyH(c);
    const cx = 16, cy = 22 - 2 - h / 2;
    const fr = +pose.slice(-1);
    const kind = pose.slice(0, -1);
    const hide = kind === 'hide';
    // legs: 3 a side, behind the body
    if (!hide) for (let side = -1; side <= 1; side += 2) {
      for (let l = 0; l < 3; l++) {
        const lift = kind === 'walk' ? (((fr + l + (side > 0 ? 2 : 0)) % 4) < 2 ? -1 : 0) : 0;
        const bx = cx + side * (w / 2 - 1), by = cy - h * 0.15 + l * (h * 0.3);
        const len = 3 + Math.floor(c / 2);
        for (let s = 0; s <= len; s++) put(b, bx + side * s, by + (s > len / 2 ? (s - len / 2) * 0.8 : -s * 0.3) + lift, col.shade);
      }
    }
    // carapace
    ellipse(b, cx, cy, w / 2, h / 2, (x, y, dx, dy) => (dy > 0.45 ? col.shade : dy < -0.35 && dx < 0.2 ? col.light : col.base));
    // dots on the carapace
    put(b, cx - w * 0.22, cy + 0.5, col.shade); put(b, cx + w * 0.18, cy - 0.5, col.shade);
    // eye stalks
    const stalk = hide ? 0 : 2 + Math.floor(c / 2);
    const wide = kind === 'shiver';
    for (const ex of [cx - Math.max(2, w * 0.2), cx + Math.max(2, w * 0.2)]) {
      const sway = kind === 'idle' && fr === 1 ? (ex < cx ? -1 : 1) : 0;
      for (let s = 1; s <= stalk; s++) put(b, ex + (s === stalk ? sway : 0), cy - h / 2 - s + 1, col.shade);
      const top = cy - h / 2 - stalk;
      if (!hide) {
        put(b, ex + sway, top, INK);
        if (c >= 3 || wide) { put(b, ex + sway + 1, top, INK); put(b, ex + sway, top - 1, wide ? '#ffffff' : INK); put(b, ex + sway + 1, top - 1, INK); }
        else put(b, ex + sway, top - 1, '#ffffff');
      }
    }
    // claws: big right claw, small left claw; raised when poking or cheering
    const up = kind === 'poke' ? (fr ? 3 : 1) : kind === 'cheer' ? 4 + fr : 0;
    const claw = (side, r) => {
      const ox = cx + side * (w / 2 - r * 0.2), oy = cy + h / 2 - 1 - (side > 0 ? up : (kind === 'poke' ? 0 : up));
      ellipse(b, ox, oy, r, r * 0.85, (x, y, dx, dy) => (dy > 0.4 ? col.shade : dx * side > 0.3 && dy < -0.1 ? col.light : col.claw));
      // pincer notch
      put(b, ox + side * r * 0.5, oy - r * 0.2, kind === 'cheer' && fr ? col.claw : INK);
    };
    if (!hide) { claw(-1, 1.6 + c * 0.3); claw(1, 2.2 + c * 0.45); }
    // shiver: little tremble streaks
    return outline(b, INK);
  }
  function drawAbdomen(c) { // the soft pink body, visible when naked or when the shell is too small
    const d = shellD(c) - 1, R = d / 2;
    const b = buf(d + 4, Math.round(d * 0.9) + 4);
    const cx = b.w / 2, cy = b.h / 2;
    ellipse(b, cx, cy, R, R * 0.86, (x, y, dx, dy) => {
      const r = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(Math.sin(Math.atan2(dy, dx) * 2 + r * 6)) < 0.18) return '#d07890';
      return dy > 0.5 ? '#d88aa0' : dx < -0.2 && dy < -0.2 ? '#ffd0dc' : '#f2a6b6';
    });
    return outline(b, INK);
  }

  // ---------- gull (top-down) ----------
  function drawGull(frame) {
    const b = buf(36, 22);
    const cx = 18, cy = 11;
    const span = frame === 'dive' ? 6 : frame === 'up' ? 13 : 16;
    const lift = frame === 'up' ? -3 : 0;
    // wings
    for (let side = -1; side <= 1; side += 2) {
      for (let s = 2; s <= span; s++) {
        const wy = cy - 1 + lift * (s / span) + (s > span - 4 ? 1 : 0);
        const thick = Math.max(1, Math.round(4 - s * 0.18));
        for (let t = 0; t < thick; t++) put(b, cx + side * s, wy + t, s > span - 4 ? INK : t === 0 ? '#ffffff' : '#b8bcc8');
      }
    }
    // body
    ellipse(b, cx, cy + 1, 2.6, 6, (x, y, dx, dy) => (dx > 0.3 ? '#d8dce4' : '#ffffff'));
    // tail
    put(b, cx - 1, cy + 7, '#b8bcc8'); put(b, cx, cy + 7, '#b8bcc8'); put(b, cx + 1, cy + 7, '#b8bcc8');
    // head and beak (pointing down = towards the beach)
    ellipse(b, cx, cy - 5, 2, 2, () => '#ffffff');
    put(b, cx, cy - 8, '#ffc83a'); put(b, cx, cy - 9, '#ffc83a'); put(b, cx, cy - 7, '#e8a020');
    put(b, cx - 1, cy - 5, INK); put(b, cx + 1, cy - 5, INK);
    return outline(b, INK);
  }

  // ---------- beach ----------
  const SAND = ['#d9b77c', '#e6c78e', '#efd6a2', '#f7e6bd'];
  const WET = ['#a88d62', '#b89c6e', '#c4a878'];
  function buildBeach(scene) {
    canvasTex(scene, 'beach', 180, 320, (ctx) => {
      for (let y = 0; y < 320; y++) for (let x = 0; x < 180; x++) {
        // ripples: long wavy bands
        const rip = Math.sin(y * 0.55 + Math.sin(x * 0.07 + y * 0.02) * 2.4 + vnoise(x * 0.05, y * 0.05, 1) * 3);
        const n = vnoise(x * 0.12, y * 0.12, 2) * 0.6 + hash(x, y, 3) * 0.25 + (bay(x, y) - 0.5) * 0.3;
        let v = n + (rip > 0.82 ? -0.35 : rip < -0.9 ? 0.25 : 0);
        let c;
        if (y < 96) { // wet band near the water, blending into dry sand
          const wet = (96 - y) / 40;
          if (bay(x, y) < wet) { c = WET[v < 0.35 ? 0 : v < 0.6 ? 1 : 2]; px(ctx, x, y, c); continue; }
        }
        c = SAND[v < 0.25 ? 0 : v < 0.5 ? 1 : v < 0.75 ? 2 : 3];
        px(ctx, x, y, c);
      }
      // footprints wandering down the beach
      for (let i = 0; i < 9; i++) {
        const fy = 110 + i * 22, fx = 150 - i * 6 + (i % 2) * 7;
        rect(ctx, fx, fy, 3, 4, '#cfa96e'); rect(ctx, fx, fy + 4, 2, 1, '#cfa96e'); px(ctx, fx + 1, fy + 1, '#c49c62');
      }
      // tiny pebbles and specks (1 px, never mistaken for shells)
      for (let i = 0; i < 70; i++) {
        const x = Math.floor(hash(i, 1, 9) * 180), y = 100 + Math.floor(hash(i, 2, 9) * 215);
        px(ctx, x, y, ['#8a7a6a', '#b0a090', '#f8f0e0'][i % 3]);
      }
      // starfish
      const star = (sx, sy, col, dk) => {
        for (let a = 0; a < 5; a++) {
          const t = a * Math.PI * 0.4 - Math.PI / 2;
          for (let r = 0; r < 5; r++) { px(ctx, Math.round(sx + Math.cos(t) * r), Math.round(sy + Math.sin(t) * r), r < 4 ? col : dk); }
        }
        rect(ctx, sx - 1, sy - 1, 3, 3, col); px(ctx, sx, sy, dk);
      };
      star(150, 182, '#f08a3a', '#b8501e');
      star(24, 236, '#e8606e', '#a83a48');
      // seaweed strands on the wet sand
      const weed = (wx, wy) => { for (let i = 0; i < 16; i++) { px(ctx, wx + i, wy + Math.round(Math.sin(i * 0.7) * 1.5), i % 4 ? '#4a6a3a' : '#2e4a2a'); px(ctx, wx + i, wy + 1 + Math.round(Math.sin(i * 0.7) * 1.5), '#5a7a42'); } };
      weed(18, 84); weed(120, 90); weed(64, 98);
    });
    // rocks (obstacles) with barnacles and a shadow
    canvasTex(scene, 'rocks', 46, 32, (ctx) => {
      const b = buf(46, 32);
      const blob = (bx, by, rx, ry) => ellipse(b, bx, by, rx, ry, (x, y, dx, dy) => {
        const n = hash(x, y, 4);
        if (dy < -0.3 && dx < 0.3) return n < 0.15 ? '#9aa8b8' : '#b8c4d0';
        if (dy > 0.4 || dx > 0.6) return '#5a6478';
        return n < 0.1 ? '#e8e4dc' : '#7f8ca0';
      });
      blob(16, 18, 14, 11); blob(33, 21, 10, 8); blob(26, 10, 8, 7);
      outline(b, INK);
      rect(ctx, 4, 27, 40, 4, 'rgba(70,50,30,0.35)');
      blit(ctx, b, 0, 0);
      // a little tide-pool puddle on top
      rect(ctx, 12, 12, 6, 2, '#7fd0e8'); px(ctx, 13, 12, '#ffffff');
    });
    canvasTex(scene, 'rock2', 26, 18, (ctx) => {
      const b = buf(26, 18);
      ellipse(b, 13, 9, 11, 7, (x, y, dx, dy) => (dy < -0.3 && dx < 0.3 ? '#b8c4d0' : dy > 0.4 || dx > 0.6 ? '#5a6478' : '#7f8ca0'));
      outline(b, INK);
      rect(ctx, 3, 14, 22, 3, 'rgba(70,50,30,0.35)');
      blit(ctx, b, 0, 0);
    });
    // a child's bucket and spade (obstacle)
    canvasTex(scene, 'bucket', 28, 24, (ctx) => {
      const b = buf(28, 24);
      ellipse(b, 11, 16, 9, 7, (x, y, dx, dy) => (dy < -0.2 ? '#3a90c8' : dx > 0.5 ? '#1e6aa0' : '#4aa8e0'));
      ellipse(b, 11, 11, 8, 4, (x, y, dx, dy) => (dx * dx + dy * dy < 0.5 ? '#e6c78e' : '#7fc8f0'));
      for (let i = 0; i < 12; i++) { put(b, 18 + i * 0.6, 4 + i, '#ffd84d'); put(b, 19 + i * 0.6, 4 + i, '#e8b020'); }
      ellipse(b, 25, 19, 2.5, 3, () => '#ffd84d');
      outline(b, INK);
      rect(ctx, 3, 21, 22, 3, 'rgba(70,50,30,0.35)');
      blit(ctx, b, 0, 0);
    });
    // sky + horizon above the sea for tall phones
  }
  function buildSky(scene, h) {
    if (h <= 0) return;
    canvasTex(scene, 'skyTop', 180, h, (ctx) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < 180; x++) {
        const t = y / h;
        let c = t < 0.55 ? (bay(x, y) < t / 0.55 ? '#9fdcf6' : '#7cc4ee') : bay(x, y) < (t - 0.55) / 0.45 ? '#c5ecf8' : '#9fdcf6';
        if (y >= h - 4) c = y === h - 4 ? '#3a78b0' : '#2e68a0'; // horizon line of the far sea
        px(ctx, x, y, c);
      }
      // a few soft clouds and a far sailboat
      const cloud = (cx, cy, w) => { for (let i = 0; i < w; i++) for (let j = 0; j < 4; j++) if (Math.abs(i - w / 2) / (w / 2) + j / 4 < 1.1 && bay(cx + i, cy + j) < 0.85) px(ctx, cx + i, cy + j, '#ffffff'); };
      cloud(20, Math.floor(h * 0.3), 26); cloud(120, Math.floor(h * 0.5), 18);
      const by = h - 10;
      rect(ctx, 140, by + 3, 9, 2, '#5a3a2a'); for (let i = 0; i < 6; i++) rect(ctx, 144 - Math.floor(i / 2), by - 3 + i, 1 + Math.floor(i / 2), 1, '#fffaf0');
    });
  }

  function buildSprites(scene) {
    for (let s = 1; s <= 5; s++) bufTex(scene, `shell${s}`, drawShell(s));
    bufTex(scene, 'cap', drawCap());
    for (let c = 1; c <= 5; c++) bufTex(scene, `abd${c}`, drawAbdomen(c));
    for (let c = 1; c <= 5; c++) for (let ci = 0; ci < CRAB_COL.length; ci++) {
      const key = `crab${c}_${ci}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, CFW * CPOSES.length, CFH);
      const ctx = tex.getContext();
      CPOSES.forEach((p, n) => { blit(ctx, drawCrab(c, CRAB_COL[ci], p), n * CFW, 0); tex.add(n, 0, n * CFW, 0, CFW, CFH); });
      tex.refresh();
    }
    if (scene.textures.exists('gull')) scene.textures.remove('gull');
    const gt = scene.textures.createCanvas('gull', 36 * 3, 22);
    ['flap', 'up', 'dive'].forEach((f, n) => { blit(gt.getContext(), drawGull(f), n * 36, 0); gt.add(n, 0, n * 36, 0, 36, 22); });
    gt.refresh();
    // soft oval shadows (dithered, so they stay pixel-crisp)
    const shadow = (key, w, h) => canvasTex(scene, key, w, h, (ctx) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2), r = dx * dx + dy * dy;
        if (r <= 1 && (r < 0.55 || bay(x, y) < 0.5)) px(ctx, x, y, '#5a4028');
      }
    });
    shadow('shadowS', 14, 5); shadow('shadowM', 20, 6); shadow('shadowL', 26, 7); shadow('gullShadow', 28, 10);
    // icons
    S.sprite(scene, 'icoAlert', ['.00.', '0770', '0770', '0770', '.00.', '0770', '.00.']);
    S.sprite(scene, 'icoHuh', ['.000.', '04440', '00.40', '.0440', '.040.', '.000.', '.040.', '.000.']);
    S.sprite(scene, 'icoHeart', ['.0.0.', '05050', '05550', '.050.', '..0..']);
    S.sprite(scene, 'icoAngry', ['0...0', '.0.0.', '..0..', '.0.0.', '0...0'].map((r) => r.replace(/0/g, '5').replace(/\./g, '.')));
    S.sprite(scene, 'icoSweat', ['.0.', '0a0', '0a0', '.0.']);
    S.sprite(scene, 'icoNote', ['..00', '..04', '..0.', '000.', '000.']);
    S.sprite(scene, 'sunIcon', ['..7..', '7.7.7', '.777.', '77777', '.777.', '7.7.7', '..7..']);
    S.sprite(scene, 'crabIcon', ['.0...0.', '050.050', '0500050', '.05550.', '0555550', '.0.0.0.']);
    S.sprite(scene, 'star', ['....0....', '...070...', '000777000', '.0777770.', '..07770..', '.0770770.', '.00...00.']);
    S.sprite(scene, 'starOff', ['....0....', '...020...', '000222000', '.0222220.', '..02220..', '.0220220.', '.00...00.']);
    // size pips shown under an empty shell while dragging, so fit is readable
    for (let s = 1; s <= 5; s++) S.sprite(scene, `pips${s}`, [Array.from({ length: s }, () => '07').join('') + '0', Array.from({ length: s }, () => '07').join('') + '0']);
  }

  window.ShellArt = { buildBeach, buildSky, buildSprites, shellD, bodyW, bodyH, CPOSES, CRAB_COL, hash, bay, vnoise, INK };
})();
