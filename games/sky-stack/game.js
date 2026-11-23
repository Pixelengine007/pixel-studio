// Sky Stack — tap to drop each floor onto the tower. Line it up perfectly to keep it wide.
// The world changes as you climb: city, clouds, sunset, night, space.
(function () {
  'use strict';
  const S = window.Studio;
  const W = S.W;

  // ---------- palette (game-local) ----------
  const C = {
    ink: '#1c1622', white: '#ffffff', paper: '#f6f2ea',
    litA: '#ffd86b', litB: '#fff2b0', darkA: '#2c3550', darkB: '#5a6a9a',
    pave0: '#5e5c6a', pave1: '#7c7a86', pave2: '#9896a2', curb: '#c4c0c8',
    grass0: '#3e7a3a', grass1: '#5aa04a', grass2: '#7fc85e',
    cityFar: '#30335e', cityNear: '#454a80', cityWin: '#ffd86b',
    cloud0: '#ffffff', cloud1: '#e4ecf8', cloud2: '#b9c6dc', cloudEdge: '#8e9cbc',
    gold: '#ffd84d', pink: '#ff7fc1', red: '#ff4f5e',
  };
  const STYLES = [
    { base: '#c8573f', shade: '#8e3a2e', light: '#e9805e', trim: '#f2c9a0' }, // brick
    { base: '#e9d8b4', shade: '#b8a07c', light: '#fff4d6', trim: '#8e7a5a' }, // cream
    { base: '#3f8f8a', shade: '#2a5f5f', light: '#66bcb2', trim: '#c6efe6' }, // teal
    { base: '#6a6f9a', shade: '#474b70', light: '#9197c6', trim: '#d6d9f2' }, // slate
    { base: '#d8a43c', shade: '#9c7424', light: '#f4cc6c', trim: '#fff0c0' }, // mustard
    { base: '#b65f8c', shade: '#7e3d62', light: '#de8ab2', trim: '#ffd6ea' }, // rose
  ];
  // sky colour by altitude in pixels above the street
  const SKY = [
    [0, '#c3ecf8'], [60, '#86cff2'], [120, '#6aa6e6'], [170, '#f6a77a'], [210, '#e06f86'],
    [260, '#7a3f8e'], [320, '#2e2366'], [380, '#141238'], [500, '#090817'], [700, '#040309'],
  ];
  const ZONES = [[8, 'INTO THE CLOUDS'], [25, 'SUNSET'], [45, 'NIGHT FALLS'], [70, 'SPACE!']];

  const FLOOR_H = 10;
  const LOBBY_H = 14;
  const START_W = 64;
  const MAX_W = 84;

  // ---------- helpers ----------
  const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const SKY_RGB = SKY.map(([a, h]) => [a, rgbOf(h)]);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function skyAt(alt) {
    if (alt <= SKY_RGB[0][0]) return SKY_RGB[0][1];
    for (let i = 1; i < SKY_RGB.length; i++) {
      if (alt <= SKY_RGB[i][0]) {
        const [a0, c0] = SKY_RGB[i - 1]; const [a1, c1] = SKY_RGB[i];
        const t = (alt - a0) / (a1 - a0);
        return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
      }
    }
    return SKY_RGB[SKY_RGB.length - 1][1];
  }
  function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }

  // A floor of width w, painted with its window pattern offset so cut pieces match exactly.
  function paintFloor(ctx, ox, oy, w, style, idx, offset) {
    const st = STYLES[style % STYLES.length];
    for (let x = 0; x < w; x++) {
      const lx = x + offset;
      for (let y = 0; y < FLOOR_H; y++) {
        let c = st.base;
        if (y === 0) c = st.light;
        else if (y === 1) c = st.trim;
        else if (y === FLOOR_H - 1) c = st.shade;
        else if (hash(lx, y, idx) < 0.06) c = st.shade; // wall grain
        const col = ((lx % 7) + 7) % 7;
        if (y >= 3 && y <= 6 && col >= 2 && col <= 4) {
          const lit = hash(Math.floor(lx / 7), idx, 77) < 0.55;
          c = lit ? C.litA : C.darkA;
          if (lit && y === 3 && col === 2) c = C.litB;
          if (!lit && y === 3 && col === 4) c = C.darkB;
          if (y === 6) c = st.shade; // sill
        }
        px(ctx, ox + x, oy + y, c);
      }
    }
    // outline (left/right edges + bottom seam)
    for (let y = 0; y < FLOOR_H; y++) { px(ctx, ox, oy + y, C.ink); px(ctx, ox + w - 1, oy + y, C.ink); }
    for (let x = 0; x < w; x++) px(ctx, ox + x, oy + FLOOR_H - 1, C.ink);
  }

  function makeCanvasTex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const t = scene.textures.createCanvas(key, w, h);
    draw(t.getContext());
    t.refresh();
    return key;
  }

  // ---------- static art ----------
  function buildStaticArt(scene) {
    if (scene.textures.exists('street')) return;
    // street: grass strip, curb, textured pavement
    makeCanvasTex(scene, 'street', W, 60, (ctx) => {
      for (let y = 0; y < 60; y++) for (let x = 0; x < W; x++) {
        const b = BAYER[(y & 3) * 4 + (x & 3)] / 16;
        let c;
        if (y < 5) c = hash(x, y, 3) * 0.7 + b * 0.3 < 0.55 ? C.grass1 : C.grass2;
        else if (y < 7) c = C.grass0;
        else if (y === 7) c = C.curb;
        else if (y < 17) { // sidewalk tiles
          c = hash(x >> 3, (y - 8) >> 3, 4) < 0.5 ? '#b6b2be' : '#aaa6b4';
          if (hash(x, y, 6) < 0.05) c = '#9896a2';
          if (x % 8 === 0) c = '#8a8796';
        } else if (y === 17) c = '#e2dfe6'; // curb top
        else if (y < 20) c = '#6e6b7a'; // curb face
        else if (y === 20) c = C.ink;
        else { // asphalt with a dashed centre line
          c = hash(x, y, 7) * 0.6 + b * 0.4 < 0.62 ? '#3c3a48' : '#46444f';
          if (y >= 37 && y <= 38 && (x % 16) < 9) c = '#ffd84d';
          if (y > 52) c = '#33313e';
        }
        px(ctx, x, y, c);
      }
      for (let x = 2; x < W; x += 5) if (hash(x, 1, 11) < 0.5) px(ctx, x, 0, C.grass2);
    });
    // street props: lamp posts and bushes standing on the grass strip
    makeCanvasTex(scene, 'props', W, 22, (ctx) => {
      const lamp = (x) => {
        for (let y = 4; y < 22; y++) px(ctx, x, y, C.ink);
        for (let y = 5; y < 21; y++) px(ctx, x + 1, y, '#4b4760');
        for (let i = -1; i <= 3; i++) px(ctx, x + i, 3, C.ink);
        px(ctx, x - 1, 4, C.litB); px(ctx, x + 2, 4, C.litB); px(ctx, x, 4, C.litA); px(ctx, x + 1, 4, C.litA);
        for (let i = -1; i <= 2; i++) px(ctx, x + i, 2, C.ink);
      };
      const bush = (x, w) => {
        for (let yy = 0; yy < 7; yy++) for (let i = 0; i < w; i++) {
          const dx = (i - (w - 1) / 2) / (w / 2), dy = (yy - 6) / 7;
          if (dx * dx + dy * dy > 1) continue;
          const b = BAYER[(yy & 3) * 4 + (i & 3)] / 16;
          px(ctx, x + i, 15 + yy, yy + b * 2 < 3 ? C.grass2 : yy + b * 2 < 5.5 ? C.grass1 : C.grass0);
        }
        for (let i = 0; i < w; i++) {
          for (let yy = 0; yy < 7; yy++) {
            const dx = (i - (w - 1) / 2) / (w / 2), dy = (yy - 6) / 7;
            if (dx * dx + dy * dy <= 1) { px(ctx, x + i, 15 + yy - 1, C.ink); break; }
          }
        }
      };
      bush(8, 13); bush(27, 9); bush(141, 11); bush(160, 15);
      lamp(44); lamp(133);
    });
    // far and near city silhouettes with sparse lit windows
    const city = (key, color, minH, maxH, seed, winP) => makeCanvasTex(scene, key, W + 40, maxH + 2, (ctx) => {
      let x = 0;
      while (x < W + 40) {
        const bw = 10 + Math.floor(hash(x, 0, seed) * 18);
        const bh = minH + Math.floor(hash(x, 1, seed) * (maxH - minH));
        for (let i = 0; i < bw && x + i < W + 40; i++) for (let j = 0; j < bh; j++) {
          const yy = maxH + 2 - bh + j;
          let c = color;
          if (i % 4 === 2 && j % 4 === 2 && j > 2 && hash(x + i, j, seed + 1) < winP) c = C.cityWin;
          px(ctx, x + i, yy, c);
        }
        if (hash(x, 2, seed) < 0.35) { // antenna
          for (let j = 0; j < 4; j++) px(ctx, x + (bw >> 1), maxH + 2 - bh - j - 1, color);
        }
        x += bw + 1 + Math.floor(hash(x, 3, seed) * 4);
      }
    });
    city('cityFar', C.cityFar, 30, 70, 21, 0.25);
    city('cityNear', C.cityNear, 18, 46, 31, 0.35);
    // clouds: blobs with dithered shading and a soft edge
    for (let k = 0; k < 3; k++) {
      const cw = 34 + k * 10, ch = 14 + k * 3;
      makeCanvasTex(scene, `cloud${k}`, cw, ch, (ctx) => {
        const blobs = [];
        for (let i = 0; i < 4 + k; i++) {
          blobs.push([6 + hash(i, k, 40) * (cw - 12), ch * 0.55 + hash(i, k, 41) * ch * 0.2, 4 + hash(i, k, 42) * (ch * 0.42)]);
        }
        const inside = (x, y) => blobs.some(([bx, by, r]) => (x - bx) ** 2 + ((y - by) * 1.3) ** 2 < r * r) && y < ch - 2;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
          if (!inside(x, y)) {
            if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) px(ctx, x, y, C.cloudEdge);
            continue;
          }
          const b = BAYER[(y & 3) * 4 + (x & 3)] / 16;
          const v = y / ch + (b - 0.5) * 0.25;
          px(ctx, x, y, v < 0.45 ? C.cloud0 : v < 0.7 ? C.cloud1 : C.cloud2);
        }
      });
    }
    S.frames(scene, 'bird', [
      ['00...00', '.00.00.', '...0...'],
      ['.......', '0000000', '...0...'],
    ]);
    // lobby: the fixed ground floor with a door and an awning
    makeCanvasTex(scene, 'lobby', 72, LOBBY_H, (ctx) => {
      const st = STYLES[0];
      for (let y = 0; y < LOBBY_H; y++) for (let x = 0; x < 72; x++) {
        let c = y < 2 ? st.light : y > LOBBY_H - 2 ? st.shade : st.base;
        if (y >= 2 && y <= 4) c = (x >> 2) % 2 ? '#ff4f5e' : '#f6f2ea'; // striped awning
        if (y === 5) c = st.shade;
        if (y >= 6 && y <= LOBBY_H - 2 && x >= 32 && x <= 39) c = x === 32 || x === 39 ? C.ink : y === 6 ? C.litB : C.litA; // door
        if (y >= 7 && y <= 10 && ((x >= 8 && x <= 22) || (x >= 49 && x <= 63))) c = y === 7 ? C.darkB : C.darkA; // shop windows
        px(ctx, x, y, c);
      }
      for (let y = 0; y < LOBBY_H; y++) { px(ctx, 0, y, C.ink); px(ctx, 71, y, C.ink); }
      for (let x = 0; x < 72; x++) px(ctx, x, 0, C.ink);
    });
  }

  // ---------- sounds (original) ----------
  S.defineSfx('place', [{ type: 'triangle', f0: 180, f1: 90, at: 0, dur: 0.09, vol: 0.35 }, { type: 'noise', at: 0, dur: 0.04, vol: 0.08 }]);
  S.defineSfx('chop', [{ type: 'noise', at: 0, dur: 0.12, vol: 0.22 }, { type: 'square', f0: 140, f1: 70, at: 0, dur: 0.1, vol: 0.12 }]);
  S.defineSfx('perfect', [{ type: 'square', f0: 660, f1: 660, at: 0, dur: 0.07, vol: 0.12 }, { type: 'square', f0: 990, f1: 990, at: 0.06, dur: 0.12, vol: 0.12 }]);
  S.defineSfx('fall', [{ type: 'sawtooth', f0: 600, f1: 90, at: 0, dur: 0.6, vol: 0.1 }]);
  S.defineSfx('crash', [{ type: 'noise', at: 0, dur: 0.35, vol: 0.3 }, { type: 'triangle', f0: 90, f1: 40, at: 0, dur: 0.3, vol: 0.4 }]);
  S.defineSfx('zone', [523, 659, 784, 1047, 1319].map((f, i) => ({ type: 'square', f0: f, f1: f, at: i * 0.07, dur: 0.1, vol: 0.1 })));
  S.defineSfx('grow', [{ type: 'square', f0: 440, f1: 880, at: 0, dur: 0.18, vol: 0.12 }]);

  class Stack extends Phaser.Scene {
    constructor() { super('stack'); }

    create() {
      const H = this.scale.height;
      this.H = H;
      this.groundY = H - 40; // top of the street
      this.rand = S.rng(S.seed);
      buildStaticArt(this);

      // sky (repainted every frame, fixed to the camera)
      this.skyTex = this.textures.exists('sky') ? this.textures.get('sky') : this.textures.createCanvas('sky', W, H);
      if (this.skyTex.width !== W || this.skyTex.height !== H) { this.textures.remove('sky'); this.skyTex = this.textures.createCanvas('sky', W, H); }
      this.skyImg = this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-100);
      this.skyData = this.skyTex.getContext().createImageData(W, H);

      // clouds in the 60-420 px altitude band
      this.clouds = [];
      for (let i = 0; i < 16; i++) {
        const alt = 70 + i * 22 + this.rand() * 12;
        const img = this.add.image(this.rand() * (W + 40) - 20, this.groundY - alt, `cloud${i % 3}`).setDepth(-60 + (i % 3));
        img.setScrollFactor(1, 0.85 + (i % 3) * 0.05);
        this.clouds.push({ img, v: 3 + (i % 3) * 3 });
      }
      this.add.image(-10, this.groundY - 72 + 8, 'cityFar').setOrigin(0).setScrollFactor(1, 0.55).setDepth(-50);
      this.add.image(-24, this.groundY - 48 + 6, 'cityNear').setOrigin(0).setScrollFactor(1, 0.8).setDepth(-40);
      this.add.image(0, this.groundY, 'street').setOrigin(0).setDepth(5);
      this.add.image(0, this.groundY - 21, 'props').setOrigin(0).setDepth(6);

      // tower
      this.lobbyX = Math.floor((W - 72) / 2);
      this.add.image(this.lobbyX, this.groundY - LOBBY_H, 'lobby').setOrigin(0).setDepth(10);
      this.floors = []; // placed: { x, w, img }
      this.base = { x: Math.floor((W - START_W) / 2), w: START_W };
      this.n = 0;
      this.combo = 0;
      this.moving = null;
      this.debris = [];
      this.parts = [];
      this.popups = [];
      this.birds = [];
      this.birdTimer = 1.5;
      this.fx = this.add.graphics().setDepth(40);
      this.shake = 0;
      this.t = 0;
      this.state = S.fixed ? 'playing' : 'title';
      this.endT = 0;
      this.zoneShown = 0;
      this.camY = 0;
      this.cameras.main.setScroll(0, 0);

      // soft dithered vignette in the corners
      makeCanvasTex(this, 'vignette', W, H, (ctx) => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
          const d = Math.max(0, Math.sqrt(dx * dx * 0.9 + dy * dy * 0.7) - 0.78) * 1.6;
          if (BAYER[(y & 3) * 4 + (x & 3)] / 16 < d * 0.55) px(ctx, x, y, C.ink);
        }
      });
      this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(900).setAlpha(0.35);

      // HUD (fixed to the camera)
      this.scoreText = S.text(this, W / 2, 20, '0', { size: 3, color: '4', shadow: null, outline: '0' }).setScrollFactor(0).setVisible(false);
      this.title = [];
      if (this.state === 'title') {
        this.title.push(S.text(this, W / 2, 66, 'SKY', { size: 6, color: '7', shadow: '1', outline: '0' }).setScrollFactor(0));
        this.title.push(S.text(this, W / 2, 108, 'STACK', { size: 5, color: '4', shadow: '1', outline: '0' }).setScrollFactor(0));
        this.title.push(S.text(this, W / 2, 150, 'TAP TO BUILD UP', { scale: 1, color: '4', shadow: null, outline: '0' }).setScrollFactor(0));
        this.best = 0;
        try { this.best = parseInt(localStorage.getItem('skystack-best') || '0', 10); } catch (e) { this.best = 0; }
        if (this.best) this.title.push(S.text(this, W / 2, 164, `BEST ${this.best}`, { color: '7', shadow: null, outline: '0' }).setScrollFactor(0));
      } else {
        this.startRun();
      }

      S.bindInput(this);
      S.registerApi({
        observe: () => this.observe(),
        status: () => ({ state: this.state === 'playing' || this.state === 'title' ? 'playing' : 'lost', score: this.n, time: this.t, endless: true }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: {
          // An attentive but imperfect player: taps as the floor lines up, sometimes a frame early or late.
          intended: (o, f) => {
            if (!o.moving) return { down: false };
            const slop = ((f * 2654435761) >>> 0) % 100 < 18 ? 2.5 : 0.8;
            return { down: Math.abs(o.dx) <= slop || (o.dx * o.dxNext < 0 && Math.abs(o.dxNext) < 3) };
          },
          // For clips: play well, then miss on purpose at floor 31 to show the fall and the reveal.
          showcase: (o, f) => {
            if (o.floors >= 31) return { down: !!o.moving && Math.abs(o.dx) > 70 };
            if (!o.moving) return { down: false };
            const slop = ((f * 2654435761) >>> 0) % 100 < 30 ? 4 : 0.8;
            return { down: Math.abs(o.dx) <= slop || (o.dx * o.dxNext < 0 && Math.abs(o.dxNext) < 3) };
          },
        },
      });
    }

    observe() {
      const m = this.moving;
      const top = this.top();
      return m ? { moving: true, dx: m.x - top.x, dxNext: m.x + m.v / 60 - top.x, w: m.w, floors: this.n }
        : { moving: false, floors: this.n };
    }

    top() { return this.floors.length ? this.floors[this.floors.length - 1] : this.base; }
    floorY(k) { return this.groundY - LOBBY_H - (k + 1) * FLOOR_H; }

    startRun() {
      this.state = 'playing';
      this.title.forEach((t) => t.destroy());
      this.title = [];
      this.scoreText.setVisible(true);
      this.spawn();
    }

    spawn() {
      const top = this.top();
      const k = this.n;
      const fromLeft = k % 2 === 0;
      const w = top.w;
      const key = `mv`;
      makeCanvasTex(this, key, w, FLOOR_H, (ctx) => paintFloor(ctx, 0, 0, w, Math.floor(k / 5), k, 0));
      const x = fromLeft ? -w - 4 : W + 4;
      const speed = Math.min(52 + k * 1.6, 120);
      this.moving = { x, w, k, age: 0, v: fromLeft ? speed : -speed, img: this.add.image(x, this.floorY(k), key).setOrigin(0).setDepth(20) };
    }

    place() {
      const m = this.moving;
      const top = this.top();
      const dx = m.x - top.x;
      const left = Math.max(m.x, top.x);
      const right = Math.min(m.x + m.w, top.x + top.w);
      const y = this.floorY(m.k);
      if (right - left < 1) return this.miss();

      let nx = Math.round(left);
      let nw = Math.round(right - left);
      let perfect = false;
      if (Math.abs(dx) <= 1.5) {
        perfect = true;
        nx = top.x;
        nw = m.w;
        this.combo += 1;
        if (this.combo >= 3 && nw < MAX_W) { nw = Math.min(MAX_W, nw + 4); nx = Math.max(0, nx - 2); S.sfx('grow'); }
        S.sfx('perfect', 1 + Math.min(this.combo, 10) * 0.08);
        this.burst(nx + nw / 2, y + 5, 14, [C.gold, C.white, C.litB], 70);
        this.ring = { x: nx + nw / 2, y: y + 5, r: 3, life: 0.35 };
        this.popup(nx + nw / 2, y - 8, this.combo > 1 ? `PERFECT X${this.combo}` : 'PERFECT', '7');
      } else {
        this.combo = 0;
        // cut off the overhang as a falling piece with its own matching windows
        const cutLeft = m.x < top.x;
        const cx = cutLeft ? Math.round(m.x) : nx + nw;
        const cw = cutLeft ? nx - cx : Math.round(m.x + m.w) - cx;
        const stc = STYLES[Math.floor(m.k / 5) % STYLES.length];
        if (cw < 3 && cw >= 1) this.burst(cx + cw / 2, y + 5, 6, [stc.base, stc.shade], 30);
        if (cw >= 3) {
          const key = `deb${this.n}`;
          makeCanvasTex(this, key, cw, FLOOR_H, (ctx) => paintFloor(ctx, 0, 0, cw, Math.floor(m.k / 5), m.k, cx - Math.round(m.x)));
          const img = this.add.image(cx, y, key).setOrigin(0).setDepth(15);
          this.debris.push({ img, vx: cutLeft ? -18 : 18, vy: -20, key });
          const st = STYLES[Math.floor(m.k / 5) % STYLES.length];
          this.burst(cutLeft ? nx : nx + nw, y + 5, 8, [st.base, st.shade, C.ink], 40);
        }
        S.sfx('chop');
        this.shake = 0.12;
      }
      S.sfx('place', 1 + Math.min(this.n, 40) * 0.01);
      const key = `fl${m.k}`;
      makeCanvasTex(this, key, nw, FLOOR_H, (ctx) => paintFloor(ctx, 0, 0, nw, Math.floor(m.k / 5), m.k, nx - Math.round(m.x)));
      const img = this.add.image(nx, y, key).setOrigin(0).setDepth(10);
      img.settle = 0.1;
      this.floors.push({ x: nx, w: nw, img });
      m.img.destroy();
      this.moving = null;
      this.n += 1;
      this.scoreText.setText(String(this.n));
      this.dust(nx, y + FLOOR_H);
      this.dust(nx + nw, y + FLOOR_H);
      const zone = ZONES.find(([at]) => at === this.n);
      if (zone) { this.banner(zone[1]); S.sfx('zone'); }
      this.spawn();
    }

    miss() {
      const m = this.moving;
      this.debris.push({ img: m.img, vx: m.v * 0.3, vy: 0, key: null });
      this.moving = null;
      S.sfx('fall');
      this.state = 'lost';
      this.endT = 0;
      this.combo = 0;
      if (!S.fixed) {
        try {
          const best = Math.max(this.n, parseInt(localStorage.getItem('skystack-best') || '0', 10));
          localStorage.setItem('skystack-best', String(best));
          this.bestNow = best;
        } catch (e) { this.bestNow = this.n; }
      } else this.bestNow = this.n;
    }

    // ---------- effects ----------
    burst(x, y, n, colors, speed) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.rand() * 0.4;
        const v = speed * (0.4 + this.rand() * 0.6);
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 120, life: 0.5 + this.rand() * 0.3, c: colors[i % colors.length], s: 1 });
      }
    }
    dust(x, y) {
      for (let i = 0; i < 4; i++) {
        this.parts.push({ x, y: y - 1, vx: (this.rand() - 0.5) * 30, vy: -10 - this.rand() * 15, g: 20, life: 0.35 + this.rand() * 0.2, c: i % 2 ? C.cloud1 : C.cloud2, s: 2 });
      }
    }
    popup(x, y, str, color) {
      const img = S.text(this, Math.round(x), Math.round(y), str, { color, shadow: null, outline: '0' }).setDepth(60);
      this.popups.push({ img, life: 0.8 });
    }
    banner(str) {
      if (this.bannerImg) this.bannerImg.destroy();
      this.bannerImg = S.text(this, W / 2, 64, str, { size: 2, color: '7', shadow: null, outline: '0' }).setScrollFactor(0).setDepth(1100);
      this.bannerLife = 1.8;
    }

    // ---------- per frame ----------
    update(time, delta) {
      const dt = delta / 1000;
      S.input.update();
      this.t += dt;

      if (this.state === 'title') {
        if (S.input.pressed) this.startRun();
        if (this.title[2]) this.title[2].setVisible(Math.floor(this.t * 2) % 2 === 0);
      } else if (this.state === 'playing') {
        const m = this.moving;
        if (m) {
          m.x += m.v * dt;
          const minX = -m.w - 6, maxX = W + 6;
          if (m.x < minX && m.v < 0) { m.x = minX; m.v = -m.v; }
          if (m.x > maxX && m.v > 0) { m.x = maxX; m.v = -m.v; }
          m.img.x = Math.round(m.x);
          m.age += dt;
          // ignore taps until the new floor is on screen, so a double tap never drops it off-screen
          const onScreen = m.x + m.w > 8 && m.x < W - 8;
          if (S.input.pressed && m.age > 0.2 && onScreen) this.place();
        }
      } else {
        this.endT += dt;
        if (this.endT > 2.2 && !this.panel) this.showPanel();
        if (this.endT > 0.8 && S.input.pressed) { this.scene.restart(); return; }
      }

      this.updateCamera(dt);
      this.updateWorld(dt);
      this.paintSky();
    }

    updateCamera(dt) {
      const cam = this.cameras.main;
      let target;
      if (this.state === 'lost') {
        // reveal: pan down the whole tower after a short pause
        target = this.endT < 0.6 ? this.camY : 0;
        const k = this.endT < 0.6 ? 0 : Math.min(1, dt * 1.6);
        this.camY += (target - this.camY) * k;
      } else {
        const topY = this.floorY(this.n);
        target = Math.min(0, topY - this.H * 0.45);
        this.camY += (target - this.camY) * Math.min(1, dt * 5);
      }
      let sx = 0, sy = 0;
      if (this.shake > 0) {
        this.shake -= dt;
        sx = Math.round((this.rand() - 0.5) * 3);
        sy = Math.round((this.rand() - 0.5) * 2);
      }
      cam.setScroll(sx, Math.round(this.camY) + sy);
    }

    updateWorld(dt) {
      // clouds drift
      const fadeAlt = this.groundY - (this.camY + this.H);
      const cloudA = Math.max(0, Math.min(1, 1 - (fadeAlt - 180) / 120));
      for (const c of this.clouds) {
        c.img.x += c.v * dt;
        if (c.img.x > W + 30) c.img.x = -30;
        c.img.setAlpha(cloudA);
      }
      // birds in the low sky
      this.birdTimer -= dt;
      const camAlt = this.groundY - (this.camY + this.H);
      if (this.birdTimer <= 0 && camAlt < 260) {
        const fromLeft = this.rand() < 0.5;
        const y = Math.round(this.camY + 30 + this.rand() * 80);
        const b = this.add.sprite(fromLeft ? -8 : W + 8, y, 'bird', 0).setDepth(-30).setFlipX(!fromLeft);
        this.birds.push({ b, v: (fromLeft ? 1 : -1) * (22 + this.rand() * 10), y0: y, ph: this.rand() * 6 });
        this.birdTimer = 2 + this.rand() * 3;
      }
      this.birds = this.birds.filter((o) => {
        o.b.x += o.v * dt;
        o.ph += dt * 6;
        o.b.y = Math.round(o.y0 + Math.sin(o.ph * 0.5) * 2);
        o.b.setFrame(Math.floor(o.ph) % 2);
        if (o.b.x < -12 || o.b.x > W + 12) { o.b.destroy(); return false; }
        return true;
      });
      // falling pieces
      this.debris = this.debris.filter((d) => {
        d.vy += 420 * dt;
        d.img.x += d.vx * dt;
        d.img.y += d.vy * dt;
        if (d.img.y > this.groundY - 4) {
          this.burst(d.img.x + d.img.width / 2, this.groundY, 10, [C.pave2, C.cloud1, C.ink], 50);
          if (this.state === 'lost' && !d.key) { S.sfx('crash'); this.shake = 0.25; }
          d.img.destroy();
          if (d.key && this.textures.exists(d.key)) this.textures.remove(d.key);
          return false;
        }
        return true;
      });
      // settle bounce on newly placed floors
      for (const f of this.floors) {
        if (f.img.settle > 0) {
          f.img.settle -= dt;
          f.img.y = this.floorY(this.floors.indexOf(f)) + (f.img.settle > 0.05 ? 1 : 0);
        }
      }
      // particles, perfect ring, popups, banner
      const g = this.fx;
      g.clear();
      this.parts = this.parts.filter((p) => {
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        g.fillStyle(parseInt(p.c.slice(1), 16), 1);
        g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        return p.life > 0;
      });
      if (this.ring) {
        this.ring.life -= dt;
        this.ring.r += dt * 60;
        g.fillStyle(0xfff2b0, 1);
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          g.fillRect(Math.round(this.ring.x + Math.cos(a) * this.ring.r), Math.round(this.ring.y + Math.sin(a) * this.ring.r * 0.6), 1, 1);
        }
        if (this.ring.life <= 0) this.ring = null;
      }
      this.popups = this.popups.filter((p) => {
        p.life -= dt;
        p.img.y -= 14 * dt;
        p.img.setVisible(p.life > 0.2 || Math.floor(p.life * 20) % 2 === 0);
        if (p.life <= 0) { p.img.destroy(); return false; }
        return true;
      });
      if (this.bannerImg) {
        this.bannerLife -= dt;
        this.bannerImg.setVisible(this.bannerLife > 0.4 || Math.floor(this.bannerLife * 12) % 2 === 0);
        if (this.bannerLife <= 0) { this.bannerImg.destroy(); this.bannerImg = null; }
      }
    }

    showPanel() {
      const H = this.H;
      const pw = 120, ph = 66, x0 = Math.floor((W - pw) / 2), y0 = Math.floor(H / 2 - ph / 2) - 20;
      makeCanvasTex(this, 'panel', pw, ph, (ctx) => {
        for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
          const edge = x === 0 || y === 0 || x === pw - 1 || y === ph - 1;
          const rim = x === 1 || y === 1 || x === pw - 2 || y === ph - 2;
          const b = BAYER[(y & 3) * 4 + (x & 3)] / 16;
          let c = hash(x, y, 90) * 0.5 + b * 0.5 < 0.85 ? '#f3e7cc' : '#e6d6b2';
          if (rim) c = '#b88a52';
          if (edge) c = C.ink;
          px(ctx, x, y, c);
        }
      });
      this.panel = [this.add.image(x0, y0, 'panel').setOrigin(0).setScrollFactor(0).setDepth(1050)];
      this.panel.push(S.text(this, W / 2, y0 + 14, 'TOWER FELL!', { color: '5', shadow: null }).setScrollFactor(0).setDepth(1060));
      this.panel.push(S.text(this, W / 2, y0 + 30, `${this.n} FLOORS`, { size: 2, color: '1', shadow: null }).setScrollFactor(0).setDepth(1060));
      this.panel.push(S.text(this, W / 2, y0 + 46, `BEST ${this.bestNow}`, { color: '2', shadow: null }).setScrollFactor(0).setDepth(1060));
      this.panel.push(S.text(this, W / 2, y0 + 57, 'TAP TO RETRY', { color: '0', shadow: null }).setScrollFactor(0).setDepth(1060));
    }

    // Dithered sky gradient by altitude, with stars higher up.
    paintSky() {
      const d = this.skyData.data;
      const H = this.H;
      const camAlt = this.groundY - (this.camY + H);
      const tw = Math.floor(this.t * 3);
      for (let y = 0; y < H; y++) {
        const alt = camAlt + (H - y);
        const rowAlt = Math.floor(camAlt * 0.5) + (H - y);
        const skyAlt = camAlt + (H - y) * 0.4;
        const col = skyAt(skyAlt);
        const starP = skyAlt > 290 ? Math.min(0.012, (skyAlt - 290) / 20000) : 0;
        for (let x = 0; x < W; x++) {
          const b = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
          const i = (y * W + x) * 4;
          let r = Math.floor(col[0] / 17 + b * 0.9) * 17;
          let g = Math.floor(col[1] / 17 + b * 0.9) * 17;
          let bl = Math.floor(col[2] / 17 + b * 0.9) * 17;
          if (starP) {
            const h = hash(x, rowAlt, 7);
            if (h < starP) {
              const bright = hash(x, rowAlt, 8 + tw) < 0.85;
              r = g = bl = bright ? 255 : 150;
              if (h < starP * 0.15) { r = 255; g = 230; bl = 160; }
            }
          }
          d[i] = Math.max(0, Math.min(255, r));
          d[i + 1] = Math.max(0, Math.min(255, g));
          d[i + 2] = Math.max(0, Math.min(255, bl));
          d[i + 3] = 255;
        }
      }
      this.skyTex.getContext().putImageData(this.skyData, 0, 0);
      this.skyTex.refresh();
    }
  }

  S.createGame({ scenes: [Stack], backgroundColor: '#86cff2' });
})();
