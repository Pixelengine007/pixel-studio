// Night Ferry — row five little lights across a foggy lake at night.
// Drag Wren along the boat to keep it level; while you touch, Wren's lantern glows and calm spirits drift toward it.
// The spirits have their own minds: they chase fireflies and jumping fish, panic when the Deep One surfaces,
// and slide off a tilted boat. Spirits in the water swim back, unless the Deep One gets there first.
(function () {
  'use strict';
  const S = window.Studio;
  const A = window.NFPaint;
  const RES = A.RES;
  const WATER = 352, BX = 180, DECK = 100, SPEED = 26, TRIP = 1950, WREN_W = 2.2;

  const SPIRITS = [
    { name: 'Mote', w: 0.6, r: 10, curious: 0.95, fear: 0.6, col: { body: '#bff6ff', edge: '#5ac8e8', glow: 'rgba(120,230,255,A)' } },
    { name: 'Bloom', w: 0.9, r: 11.5, curious: 0.55, fear: 0.8, col: { body: '#ffd6e6', edge: '#e87aa8', glow: 'rgba(255,150,200,A)' } },
    { name: 'Old Moss', w: 1.4, r: 14.5, curious: 0.15, fear: 0.25, col: { body: '#d8f5c8', edge: '#6aae6a', glow: 'rgba(160,240,150,A)' } },
    { name: 'Dusk', w: 0.8, r: 10.5, curious: 0.6, fear: 1.0, col: { body: '#e4dcff', edge: '#8a7ad8', glow: 'rgba(180,160,255,A)' } },
    { name: 'Glim', w: 0.7, r: 10, curious: 0.85, fear: 0.45, col: { body: '#fff2c0', edge: '#e8b040', glow: 'rgba(255,220,120,A)' } },
  ];

  // sounds (synthesized, original)
  S.defineSfx('plip', [{ type: 'sine', f0: 880, f1: 1320, at: 0, dur: 0.08, vol: 0.12 }]);
  S.defineSfx('splash', [{ type: 'noise', at: 0, dur: 0.4, vol: 0.22 }, { type: 'triangle', f0: 180, f1: 70, at: 0, dur: 0.25, vol: 0.2 }]);
  S.defineSfx('climb', [{ type: 'sine', f0: 520, f1: 980, at: 0, dur: 0.12, vol: 0.12 }, { type: 'sine', f0: 980, f1: 1240, at: 0.1, dur: 0.08, vol: 0.1 }]);
  S.defineSfx('rumble', [{ type: 'sawtooth', f0: 58, f1: 42, at: 0, dur: 1.6, vol: 0.12 }, { type: 'noise', at: 0, dur: 1.2, vol: 0.05 }]);
  S.defineSfx('gulp', [{ type: 'triangle', f0: 220, f1: 50, at: 0, dur: 0.5, vol: 0.3 }, { type: 'noise', at: 0.05, dur: 0.3, vol: 0.12 }]);
  S.defineSfx('creak', [{ type: 'square', f0: 170, f1: 130, at: 0, dur: 0.09, vol: 0.04 }]);
  S.defineSfx('fish', [{ type: 'noise', at: 0, dur: 0.12, vol: 0.08 }, { type: 'sine', f0: 600, f1: 300, at: 0, dur: 0.1, vol: 0.06 }]);
  S.defineSfx('chime', [523, 659, 784, 1047].map((f, i) => ({ type: 'sine', f0: f, f1: f, at: i * 0.12, dur: 0.4, vol: 0.12 })));
  S.defineSfx('lose', [440, 392, 330, 262].map((f, i) => ({ type: 'triangle', f0: f, f1: f, at: i * 0.18, dur: 0.24, vol: 0.16 })));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let LAYERS = null; // painted once per page
  // Painterly pixel art: the scene is painted at 240 x 427 and every pixel is snapped to a curated palette
  // (with a 4x4 ordered dither), then shown 3x larger with nearest-neighbour scaling.
  // Looks (URL ?look=): smooth = painted, no palette; crisp = full resolution snapped to the palette in clean steps;
  // grain = full resolution, palette plus a fine 1-pixel dither texture.
  const Q = new URLSearchParams(location.search);
  const LOOK = Q.get('look') || 'crisp', SHOW_HERO = Q.get('hero') !== '0';
  const PIX_W = 720, PIX_SCALE = 1, PS = PIX_W / 360;
  const DITHER = LOOK === 'grain' ? 10 : 0;
  const PALETTE = ['#03050a', '#070b18', '#0c1326', '#121c36', '#1a2848', '#23345a', '#2e4270', '#3c5488', '#4e68a0', '#6680b8', '#8aa0cc',
    '#08141c', '#0e202c', '#152e3c', '#1e3e4e', '#2a5262', '#3a6a78', '#5a8a96',
    '#0c1c18', '#14302a', '#22463a', '#3a6a50', '#6aae6a', '#a8dc98', '#d8f5c8',
    '#1c1630', '#2c2448', '#4a3a6e', '#8a7ad8', '#c4b8f0', '#e4dcff',
    '#4a2238', '#8a3a62', '#e87aa8', '#ffd6e6',
    '#1a0e0a', '#2e1a10', '#4a2a18', '#6e3e22', '#8a3a20', '#b8582c', '#d9773e', '#f0a050', '#ffc878', '#ffe2a0', '#fff4d0',
    '#2a6a8a', '#5ac8e8', '#bff6ff', '#e8b040', '#fff2c0', '#5a5a6e', '#8a8a9a', '#c8c8d0', '#f4f0dc', '#ffffff'];
  let LUT = null;
  function buildLut() {
    const pal = PALETTE.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    LUT = new Uint8Array(32 * 32 * 32 * 3);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
      const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4; let best = 0, bd = 1e9;
      pal.forEach((c, i) => { const dr = R - c[0], dg = G - c[1], db = B - c[2]; const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11 + Math.abs((R + G + B) - (c[0] + c[1] + c[2])) * 2; if (d < bd) { bd = d; best = i; } });
      const k = ((r << 10) | (g << 5) | b) * 3; LUT[k] = pal[best][0]; LUT[k + 1] = pal[best][1]; LUT[k + 2] = pal[best][2];
    }
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v / 16 - 0.47) * DITHER);
  function quantize(ctx, w, h) {
    if (!LUT) buildLut();
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = BAYER[(y & 3) * 4 + (x & 3)];
      const r = Math.max(0, Math.min(255, d[i] + o)) >> 3, g = Math.max(0, Math.min(255, d[i + 1] + o)) >> 3, b = Math.max(0, Math.min(255, d[i + 2] + o)) >> 3;
      const k = ((r << 10) | (g << 5) | b) * 3; d[i] = LUT[k]; d[i + 1] = LUT[k + 1]; d[i + 2] = LUT[k + 2];
    }
    ctx.putImageData(img, 0, 0);
  }
  let current = null;

  class Ferry extends Phaser.Scene {
    constructor() { super('ferry'); }

    create() {
      current = this;
      const V = S.view;
      this.extra = V.extra;
      if (!LAYERS || LAYERS.h !== V.height) {
        LAYERS = {
          h: V.height,
          sky: A.sky(V.height),
          far: A.ridgeLayer(720, 640, 330, 90, 0.008, 1, '#24345a', 3),
          mid: A.ridgeLayer(720, 640, 346, 46, 0.016, 2, '#16223e', 1.2, 22),
          mistFar: A.mistLayer(720, 332, 26, 0.32, 4),
          mistNear: A.mistLayer(720, 360, 30, 0.22, 5),
          weeds: A.weedLayer(720),
          deep: A.deepOne(),
          shore: A.shore(),
        };
      }
      if (!window.__nfHooked) { window.__nfHooked = true; this.game.events.on('postrender', () => current && current.draw()); }

      this.rand = S.rng(S.seed);
      this.t = 0; this.playT = 0; this.dist = 0;
      this.theta = 0; this.thetaV = 0;
      this.uw = 0; this.lantern = false; this.wrenStep = 0;
      this.spirits = SPIRITS.map((d, i) => ({ ...d, u: -0.62 + i * 0.31, state: 'deck', target: -0.62 + i * 0.31, timer: 1 + this.rand() * 2, panicT: 0, interest: 0, mood: 'calm', lean: 0, bob: this.rand() * 6, wx: 0, wy: 0, waterT: 0 }));
      this.lost = 0; this.delivered = 0;
      this.parts = []; this.ripples = []; this.popups = [];
      this.deep = { phase: 'off', t: 0, side: 1, y: 700, eye: 0 };
      this.events = this.schedule();
      this.interest = null; // { kind, side, t }
      this.fireflies = [];
      this.fish = null;
      this.state = S.fixed ? 'playing' : 'title';
      this.endT = 0;
      this.hintT = 5;
      this.creakT = 0;
      S.bindInput(this);
      this.registerTools();
    }

    // a fixed rhythm with seeded variety: something tempting every few seconds, the Deep One three times
    schedule() {
      const ev = [], r = this.rand;
      let t = 3.5;
      while (t < 70) { ev.push({ t, kind: r() < 0.55 ? 'fireflies' : 'fish', side: r() < 0.5 ? -1 : 1 }); t += 4.5 + r() * 3; }
      [19, 40, 58].forEach((dt) => ev.push({ t: dt + r() * 3, kind: 'deep', side: r() < 0.5 ? -1 : 1 }));
      [11, 33, 51].forEach((dt) => ev.push({ t: dt + r() * 2, kind: 'wave', side: r() < 0.5 ? -1 : 1 }));
      return ev.sort((a, b) => a.t - b.t);
    }

    registerTools() {
      const self = this;
      const make = (o) => {
        const q = Object.assign({ every: 0, noise: 0, lift: 0 }, o || {});
        const r = S.rng(55); let next = 0, held = 0;
        return (obs) => {
          if (q.every) { next -= 1 / 60; if (next > 0) return { down: true, x: held, y: (300 + self.extra) * RES }; next = q.every; }
          if (q.lift && r() < q.lift) return { down: false };
          let T = 0; obs.spirits.forEach((s) => { if (s.state === 'deck') T += s.w * s.u; });
          const uw = clamp(-T / WREN_W - obs.theta * 1.2 + (r() - 0.5) * 2 * q.noise, -0.95, 0.95);
          held = (BX + uw * DECK) * RES;
          return { down: true, x: held, y: (300 + self.extra) * RES };
        };
      };
      S.registerApi({
        observe: () => ({ t: this.playT, theta: this.theta, uw: this.uw, dist: this.dist, lost: this.lost, deep: { phase: this.deep.phase, side: this.deep.side }, spirits: this.spirits.map((s) => ({ name: s.name, u: s.u, w: s.w, state: s.state })) }),
        status: () => ({ state: this.state === 'title' || this.state === 'arrive' ? 'playing' : this.state, score: this.state === 'won' || this.state === 'lost' ? this.delivered : this.spirits.filter((s) => s.state === 'deck').length, time: this.playT }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: { intended: make(), showcase: make(), casual: make({ every: 0.45, noise: 0.25 }), clumsy: make({ every: 0.9, noise: 0.45, lift: 0.004 }) },
      });
    }

    surf(x) { return WATER + 2.5 * Math.sin(x * 0.035 + this.t * 1.4) + 1.5 * Math.sin(x * 0.09 - this.t * 1.1); }
    boatOrigin() { return [BX, this.surf(BX) + 2]; }
    deckPoint(u, dy = -12) { const [ox, oy] = this.boatOrigin(), c = Math.cos(this.theta), s = Math.sin(this.theta), x = u * DECK; return [ox + c * x - s * dy, oy + s * x + c * dy]; }

    // ---------- per frame ----------
    update(time, delta) {
      const dt = Math.min(delta / 1000, 1 / 20);
      S.input.update();
      this.t += dt;
      if (this.state === 'title') { if (S.input.pressed) { this.state = 'playing'; S.sfx('plip'); } this.ambient(dt); return; }
      if (this.state === 'won' || this.state === 'lost') { this.endT += dt; if (this.endT > 1.2 && S.input.pressed) this.scene.restart(); this.ambient(dt); this.physics(dt); return; }
      if (this.state === 'arrive') { this.arrive(dt); this.ambient(dt); this.physics(dt); return; }
      this.playT += dt; this.hintT -= dt;
      this.dist += SPEED * dt;
      // Wren follows the finger along the deck; touching raises the lantern
      this.lantern = S.input.down;
      if (S.input.down) {
        const lx = S.input.x / RES;
        const target = clamp((lx - BX) / DECK, -0.95, 0.95);
        const step = clamp(target - this.uw, -1.8 * dt, 1.8 * dt);
        this.uw += step; this.wrenStep += Math.abs(step) * 9;
      }
      this.runEvents(dt);
      this.spirits.forEach((s) => this.updateSpirit(s, dt));
      this.separate();
      this.physics(dt);
      this.updateDeep(dt);
      this.ambient(dt);
      if (this.lost >= 3) this.finish(false);
      else if (this.dist >= TRIP) { this.state = 'arrive'; this.arriveT = 0; }
    }

    runEvents(dt) {
      while (this.events.length && this.events[0].t <= this.playT) {
        const e = this.events.shift();
        if (e.kind === 'fireflies' || e.kind === 'fish') {
          this.interest = { kind: e.kind, side: e.side, t: e.kind === 'fish' ? 2.6 : 4.5 };
          this.spirits.forEach((s) => { s.interest = s.state === 'deck' && this.rand() < s.curious ? this.interest.t : 0; });
          if (e.kind === 'fireflies') for (let i = 0; i < 9; i++) this.fireflies.push({ x: BX + e.side * (120 + this.rand() * 50), y: 250 + this.rand() * 60, ph: this.rand() * 6, life: 5 });
          else { this.fish = { x: BX + e.side * 150, t: 0, side: e.side }; S.sfx('fish'); }
        } else if (e.kind === 'deep' && this.deep.phase === 'off') {
          Object.assign(this.deep, { phase: 'warn', t: 0, side: e.side, y: 700, eye: 0 });
          S.sfx('rumble');
        } else if (e.kind === 'wave') { this.thetaV += e.side * 0.55; S.sfx('creak'); }
      }
      if (this.interest) { this.interest.t -= dt; if (this.interest.t <= 0) this.interest = null; }
    }

    updateSpirit(s, dt) {
      s.bob += dt * 3; s.timer -= dt;
      if (s.panicT > 0) s.panicT -= dt;
      if (s.interest > 0) s.interest -= dt;
      if (s.state === 'deck') {
        let target = s.target, speed = 0.18;
        s.mood = 'calm'; s.lean = 0;
        if (s.panicT > 0) { target = -this.deep.side * 0.92; speed = 1.0; s.mood = 'scared'; }
        else if (s.interest > 0 && this.interest) { target = this.interest.side * 0.94; speed = 0.55; s.mood = 'curious'; s.lean = this.interest.side * 0.3; }
        else if (this.lantern && Math.abs(s.u - this.uw) < 0.75) { target = this.uw + (s.u < this.uw ? -0.18 : 0.18); speed = 0.32; s.mood = 'happy'; }
        else { if (s.timer <= 0) { s.timer = 2 + this.rand() * 3; s.target = s.curious < 0.2 ? s.u : clamp(s.u + (this.rand() - 0.5) * 0.8, -0.75, 0.75); } target = s.target; }
        s.u += clamp(target - s.u, -speed * dt, speed * dt);
        // a tilted boat makes everyone slide downhill
        if (Math.abs(this.theta) > 0.2) s.u += Math.sign(this.theta) * (Math.abs(this.theta) - 0.2) * 2.4 * dt / Math.sqrt(s.w);
        s.u = clamp(s.u, -1.02, 1.02);
        if (Math.abs(s.u) > 0.97 && this.theta * Math.sign(s.u) > 0.3) this.overboard(s);
      } else if (s.state === 'water') {
        s.waterT += dt;
        const side = s.wx < BX ? -1 : 1, [ex] = this.deckPoint(side * 1.05);
        s.wx += (-SPEED + Math.sign(ex - s.wx) * 46) * dt;
        s.wy = this.surf(s.wx) + 1 + Math.sin(s.bob * 2) * 1.2;
        s.mood = 'scared';
        const d = this.deep;
        if ((d.phase === 'rise' || d.phase === 'hold') && Math.abs(s.wx - (BX + d.side * 120)) < 130 && s.waterT > 1.1) { s.state = 'grab'; s.waterT = 0; S.sfx('gulp'); this.popup(s.wx, s.wy - 26, 'GONE…'); }
        else if (Math.abs(s.wx - ex) < 10) { s.state = 'deck'; s.u = side * 0.92; s.panicT = 0; s.interest = 0; S.sfx('climb', 1.1); this.splash(s.wx, this.surf(s.wx), 4); }
        else if (s.wx < -60) { s.state = 'grab'; s.waterT = 0; }
      } else if (s.state === 'grab') {
        s.waterT += dt; s.wy += dt * 60; s.wx -= SPEED * dt;
        if (s.waterT > 1) { s.state = 'lost'; this.lost += 1; }
      }
    }

    overboard(s) {
      const [x, y] = this.deckPoint(Math.sign(s.u) * 1.05);
      s.state = 'water'; s.wx = x + Math.sign(s.u) * 8; s.wy = y; s.waterT = 0;
      this.splash(s.wx, this.surf(s.wx), 10); S.sfx('splash'); S.sfx('plip', 1.4);
      this.popup(s.wx, y - 30, `${s.name.toUpperCase()}!`);
    }

    separate() {
      const on = this.spirits.filter((s) => s.state === 'deck').sort((a, b) => a.u - b.u);
      for (let k = 0; k < 2; k++) for (let i = 1; i < on.length; i++) { const a = on[i - 1], b = on[i], min = (a.r + b.r) / DECK * 1.05; if (b.u - a.u < min) { const p = (min - (b.u - a.u)) / 2; a.u -= p; b.u += p; } }
    }

    physics(dt) {
      let T = WREN_W * this.uw;
      this.spirits.forEach((s) => { if (s.state === 'deck') T += s.w * s.u; });
      const target = clamp(T * 0.2, -0.7, 0.7) + Math.sin(this.t * 1.3) * 0.02;
      this.thetaV += ((target - this.theta) * 10 - this.thetaV * 3.2) * dt;
      this.theta += this.thetaV * dt;
      this.creakT -= dt;
      if (Math.abs(this.thetaV) > 0.35 && this.creakT <= 0) { S.sfx('creak', 0.8 + Math.abs(this.theta)); this.creakT = 0.6; }
    }

    updateDeep(dt) {
      const d = this.deep; d.t += dt;
      if (d.phase === 'warn') { if (this.rand() < dt * 18) this.parts.push({ x: BX + d.side * (100 + this.rand() * 60), y: 600, vx: 0, vy: -60 - this.rand() * 40, life: 2.5, kind: 'bubble' }); if (d.t > 1.6) { d.phase = 'rise'; d.t = 0; this.thetaV += d.side * 0.5; } }
      else if (d.phase === 'rise') { d.y += (470 - d.y) * Math.min(1, dt * 3); d.eye = Math.min(1, d.eye + dt * 1.5); if (d.t > 0.5 && !d.scared) { d.scared = true; this.spirits.forEach((s) => { if (s.state === 'deck' && this.rand() < s.fear) s.panicT = 1.6 + s.fear * 1.4; }); } if (d.t > 1.2) { d.phase = 'hold'; d.t = 0; } }
      else if (d.phase === 'hold') { if (d.t > 2.8) { d.phase = 'sink'; d.t = 0; } }
      else if (d.phase === 'sink') { d.y += 120 * dt; d.eye = Math.max(0, d.eye - dt * 1.5); if (d.t > 1.6) { d.phase = 'off'; d.scared = false; } }
    }

    ambient(dt) {
      this.parts = this.parts.filter((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'drop') p.vy += 220 * dt; if (p.kind === 'bubble' && p.y < WATER + 4) { this.ripples.push({ x: p.x, y: WATER, r: 2, life: 1 }); return false; } return p.life > 0; });
      this.ripples = this.ripples.filter((r) => { r.life -= dt; r.r += dt * 14; r.x -= SPEED * dt * (this.state === 'playing' ? 1 : 0); return r.life > 0; });
      this.fireflies = this.fireflies.filter((f) => { f.life -= dt; f.ph += dt; return f.life > 0; });
      if (this.fish) { this.fish.t += dt; if (this.fish.t > 1.3) { this.splash(this.fish.x + this.fish.side * 30, WATER, 5); this.fish = null; } }
      this.popups = this.popups.filter((p) => (p.life -= dt) > 0);
    }

    splash(x, y, n) {
      for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (this.rand() - 0.5) * 70, vy: -50 - this.rand() * 70, life: 0.9, kind: 'drop' });
      this.ripples.push({ x, y, r: 3, life: 1.2 });
    }
    popup(x, y, str) { this.popups.push({ x, y, str, life: 1.4 }); }

    arrive(dt) {
      this.arriveT += dt;
      this.uw += (0 - this.uw) * Math.min(1, dt * 2);
      this.spirits.forEach((s) => { if (s.state === 'water' || s.state === 'grab') this.updateSpirit(s, dt); });
      const onboard = this.spirits.filter((s) => s.state === 'deck');
      if (this.arriveT > 0.8 && onboard.length && this.arriveT > 0.8 + (5 - onboard.length) * 0.01) {
        const next = onboard.reduce((a, b) => (a.u > b.u ? a : b));
        if (!this.hopT || this.arriveT - this.hopT > 0.45) { this.hopT = this.arriveT; next.state = 'home'; next.homeT = 0; this.delivered += 1; S.sfx('plip', 1 + this.delivered * 0.12); }
      }
      this.spirits.forEach((s) => { if (s.state === 'home') s.homeT += dt; });
      const busy = this.spirits.some((s) => s.state === 'water' || s.state === 'grab');
      if (!onboard.length && !busy && this.arriveT > 1.5) this.finish(this.delivered >= 3);
    }

    finish(won) {
      if (this.state === 'won' || this.state === 'lost') return;
      this.state = won ? 'won' : 'lost'; this.endT = 0;
      S.sfx(won ? 'chime' : 'lose');
    }

    // ---------- drawing (straight onto the game canvas, after Phaser's own render) ----------
    draw() {
      const out = this.game.context; if (!out || !LAYERS || S.mode === 'bot') return;
      if (!this.low) { this.low = document.createElement('canvas'); this.low.width = PIX_W; this.low.height = Math.round(LAYERS.h * PS); this.lowCtx = this.low.getContext('2d', { willReadFrequently: true }); }
      const ctx = this.lowCtx;
      const L = LAYERS, ex = this.extra, t = this.t;
      ctx.save(); ctx.setTransform(PS, 0, 0, PS, 0, 0);
      ctx.drawImage(L.sky, 0, 0, 360, L.h);
      ctx.translate(0, ex);
      // moon and its glow
      A.glow(ctx, 272, 118, 120, 'rgba(170,190,255,A)', 0.35);
      ctx.fillStyle = '#f4f0dc'; ctx.beginPath(); ctx.arc(272, 118, 20, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,170,0.35)'; ctx.beginPath(); ctx.arc(266, 112, 5, 0, 7); ctx.arc(279, 124, 3.5, 0, 7); ctx.fill();
      const tile = (img, speed, y = 0) => { const off = (this.dist * speed) % 720; ctx.drawImage(img, -off, y, 720, 640); ctx.drawImage(img, 720 - off, y, 720, 640); };
      tile(L.far, 0.06); tile(L.mid, 0.18);
      // the far shore arrives at the end of the trip
      const shoreX = BX + (TRIP - this.dist) + 50;
      if (shoreX < 420) ctx.drawImage(L.shore, shoreX - 40, 0, 260, 640);
      if (shoreX < 420) { A.glow(ctx, shoreX + 92, 254, 26, 'rgba(255,190,110,A)', 0.6); A.glow(ctx, shoreX + 140, 254, 26, 'rgba(255,190,110,A)', 0.6); }
      tile(L.mistFar, 0.35);
      // water: sky reflection near the surface, deep murk below
      let g = ctx.createLinearGradient(0, WATER, 0, 640); g.addColorStop(0, '#2c4062'); g.addColorStop(0.08, '#1a2c46'); g.addColorStop(0.4, '#0c1a26'); g.addColorStop(1, '#03070a');
      ctx.fillStyle = g; ctx.fillRect(0, WATER - 4, 360, 640 - WATER + 4);
      // moon path on the water
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const y = WATER + 4 + i * 6, w = 14 + i * 2.5 + Math.sin(t * 2 + i) * 4; ctx.fillStyle = `rgba(220,225,255,${0.22 - i * 0.014})`; ctx.fillRect(272 - w / 2 + Math.sin(t * 1.5 + i * 2) * 3, y, w, 1.4); }
      ctx.restore();
      // underwater: weeds, the Deep One, fish
      tile(L.weeds, 1);
      const d = this.deep;
      if (d.phase !== 'off') {
        const dx = BX + d.side * 120;
        ctx.drawImage(L.deep, dx - 160, d.y - 170, 320, 320);
        if (d.eye > 0) {
          const open = d.eye, eyY = d.y - 30;
          A.glow(ctx, dx, eyY, 44, 'rgba(220,255,200,A)', 0.35 * open);
          ctx.fillStyle = `rgba(230,245,210,${0.85 * open})`; ctx.beginPath(); ctx.ellipse(dx, eyY, 22, 13 * open, 0, 0, 7); ctx.fill();
          ctx.fillStyle = `rgba(10,14,12,${open})`; ctx.beginPath(); ctx.ellipse(dx - d.side * 6, eyY, 3.5, 11 * open, 0, 0, 7); ctx.fill();
        }
      }
      if (this.fish) { const f = this.fish, k = f.t / 1.3, x = f.x + f.side * k * 30, y = WATER - Math.sin(k * Math.PI) * 46; ctx.save(); ctx.translate(x, y); ctx.rotate(f.side * (k - 0.5) * 2); ctx.fillStyle = '#c8d8e8'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-f.side * 7, 0); ctx.lineTo(-f.side * 12, -4); ctx.lineTo(-f.side * 12, 4); ctx.fill(); ctx.restore(); }
      g = ctx.createLinearGradient(0, WATER + 6, 0, 640); g.addColorStop(0, 'rgba(4,10,16,0.05)'); g.addColorStop(1, 'rgba(2,5,8,0.7)'); ctx.fillStyle = g; ctx.fillRect(0, WATER + 6, 360, 640);
      this.parts.forEach((p) => { if (p.kind === 'bubble') { ctx.strokeStyle = 'rgba(200,230,255,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.stroke(); } });
      // surface line
      ctx.strokeStyle = 'rgba(190,210,240,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= 360; x += 4) { const y = this.surf(x); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      this.ripples.forEach((r) => { ctx.strokeStyle = `rgba(200,220,255,${r.life * 0.4})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(r.x, r.y + 1, r.r * 1.8, r.r * 0.4, 0, 0, 7); ctx.stroke(); });
      ctx.globalAlpha = 0.55; tile(L.mistNear, 0.7, -8); ctx.globalAlpha = 1;
      // the boat with Wren and the spirits on board (they tilt with it)
      const [ox, oy] = this.boatOrigin();
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(this.theta);
      const onDeck = this.spirits.filter((s) => s.state === 'deck');
      if (SHOW_HERO) A.wren(ctx, this.uw * DECK, -8 + Math.abs(Math.sin(this.wrenStep)) * -1.2, 2.0, { flip: false, blink: Math.floor(t * 0.5) % 7 === 0 && (t * 0.5) % 1 < 0.08 });
      if (SHOW_HERO && this.lantern) { const lx = this.uw * DECK + 18, ly = -74; ctx.strokeStyle = '#2a1810'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(this.uw * DECK + 8, -36); ctx.lineTo(lx, ly); ctx.stroke(); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.roundRect(lx - 3, ly, 6, 8, 2); ctx.fill(); A.glow(ctx, lx, ly + 4, 70, 'rgba(255,200,120,A)', 0.5); A.glow(ctx, lx, ly + 4, 9, 'rgba(255,250,220,A)', 0.9); }
      onDeck.forEach((s) => { const shake = s.mood === 'scared' ? Math.sin(t * 40) * 0.8 : 0; A.spirit(ctx, s.u * DECK + shake, -12 - s.r * 0.7 + Math.sin(s.bob) * 1.5, s.r, s.col, s.mood, t, s.lean); });
      A.boat(ctx, this.lantern);
      ctx.restore();
      // spirits in the water and those taken
      this.spirits.forEach((s) => {
        if (s.state === 'water') A.spirit(ctx, s.wx, s.wy - s.r * 0.3, s.r, s.col, 'scared', t, Math.sin(t * 8) * 0.3);
        if (s.state === 'grab') { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - s.waterT); A.spirit(ctx, s.wx, s.wy, s.r, s.col, 'scared', t, 0); ctx.restore(); }
      });
      // spirits that made it hop onto the far shore
      this.spirits.forEach((s, i) => { if (s.state !== 'home') return; const k = Math.min(1, s.homeT / 0.6), sx = BX + 110 + (shoreX - BX - 40) * k * 0 + 30 + i * 18, sy = 314 - Math.sin(k * Math.PI) * 30 - (1 - k) * 0; A.spirit(ctx, BX + 100 + k * (shoreX + 20 + i * 16 - BX - 100), sy - s.r * 0.6, s.r, s.col, 'happy', t, 0); });
      this.parts.forEach((p) => { if (p.kind === 'drop') { ctx.fillStyle = 'rgba(210,230,255,0.8)'; ctx.fillRect(p.x, p.y, 1.6, 1.6); } });
      // near mist, fireflies, motes
      ctx.globalAlpha = 0.18; tile(L.mistNear, 0.7, 30); ctx.globalAlpha = 1;
      this.fireflies.forEach((f) => { const x = f.x + Math.sin(f.ph * 1.7) * 8, y = f.y + Math.cos(f.ph * 1.3) * 6, a = Math.min(1, f.life) * (0.6 + 0.4 * Math.sin(f.ph * 5)); A.glow(ctx, x, y, 9, 'rgba(255,240,150,A)', a); ctx.fillStyle = `rgba(255,250,200,${a})`; ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6); });
      for (let i = 0; i < 10; i++) { const x = (i * 47 - this.dist * 0.9) % 380 + 380, y = 200 + ((i * 73) % 140) + Math.sin(t + i) * 6; A.glow(ctx, x % 380 - 10, y, 4, 'rgba(200,220,255,A)', 0.4); }
      // vignette
      g = ctx.createRadialGradient(180, 330, 160, 180, 330, 430); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, -ex, 360, 640 + ex);
      this.drawUI(ctx, shoreX);
      ctx.restore();
      if (LOOK !== 'smooth') quantize(ctx, this.low.width, this.low.height);
      out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false;
      out.drawImage(this.low, 0, 0, this.low.width * PIX_SCALE, this.low.height * PIX_SCALE);
      out.restore();
    }

    drawUI(ctx, shoreX) {
      const t = this.t, ex = this.extra;
      ctx.textAlign = 'center';
      if (this.state === 'title') {
        ctx.fillStyle = 'rgba(4,6,14,0.45)'; ctx.fillRect(0, -ex, 360, 640 + ex);
        ctx.font = 'italic 44px Georgia, serif'; ctx.fillStyle = '#f4ecd8'; ctx.fillText('Night Ferry', 180, 210);
        ctx.font = 'italic 15px Georgia, serif'; ctx.fillStyle = 'rgba(244,236,216,0.8)'; ctx.fillText('carry the little lights across the lake', 180, 240);
        ctx.font = '13px Georgia, serif'; ctx.fillStyle = `rgba(244,236,216,${0.5 + 0.4 * Math.sin(t * 3)})`; ctx.fillText('tap to begin', 180, 560);
        return;
      }
      // journey line, top
      const top = 30 - Math.min(ex, 40);
      ctx.strokeStyle = 'rgba(240,232,214,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(60, top); ctx.lineTo(300, top); ctx.stroke();
      const k = Math.min(1, this.dist / TRIP);
      ctx.fillStyle = '#f0e8d6'; ctx.beginPath(); ctx.ellipse(60 + k * 240, top, 5, 2.4, 0, 0, 7); ctx.fill();
      A.glow(ctx, 300, top, 10, 'rgba(255,190,110,A)', 0.8);
      // the five lights
      this.spirits.forEach((s, i) => { const x = 140 + i * 20, y = top + 22; if (s.state === 'lost' || s.state === 'grab') { ctx.strokeStyle = 'rgba(240,232,214,0.3)'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.stroke(); } else { A.glow(ctx, x, y, 10, s.col.glow, s.state === 'water' ? 0.4 + 0.4 * Math.sin(t * 10) : 0.6); ctx.fillStyle = s.col.body; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill(); } });
      if (this.hintT > 0 && this.state === 'playing') { ctx.font = 'italic 14px Georgia, serif'; ctx.fillStyle = `rgba(244,236,216,${Math.min(1, this.hintT) * 0.85})`; ctx.fillText('drag to move Wren · keep the boat level', 180, 590); }
      this.popups.forEach((p) => { ctx.font = 'italic 13px Georgia, serif'; ctx.fillStyle = `rgba(255,236,210,${Math.min(1, p.life)})`; ctx.fillText(p.str, clamp(p.x, 40, 320), p.y - (1.4 - p.life) * 10); });
      if (this.state === 'won' || this.state === 'lost') {
        ctx.fillStyle = `rgba(4,6,14,${Math.min(0.55, this.endT)})`; ctx.fillRect(0, -ex, 360, 640 + ex);
        ctx.font = 'italic 30px Georgia, serif'; ctx.fillStyle = '#f4ecd8';
        ctx.fillText(this.state === 'won' ? (this.delivered === 5 ? 'Every light is home' : 'Safe across') : 'The lake kept them', 180, 230);
        for (let i = 0; i < 5; i++) { const x = 140 + i * 20, on = i < this.delivered; if (on) A.glow(ctx, x, 270, 14, 'rgba(255,230,160,A)', 0.8); ctx.fillStyle = on ? '#fff4d0' : 'rgba(244,236,216,0.2)'; ctx.beginPath(); ctx.arc(x, 270, 5, 0, 7); ctx.fill(); }
        ctx.font = 'italic 15px Georgia, serif'; ctx.fillStyle = 'rgba(244,236,216,0.8)'; ctx.fillText(`${this.delivered} of 5 little lights made it`, 180, 305);
        if (this.endT > 1.2) { ctx.font = '13px Georgia, serif'; ctx.fillStyle = `rgba(244,236,216,${0.5 + 0.4 * Math.sin(t * 3)})`; ctx.fillText('tap to row again', 180, 560); }
      }
    }
  }

  S.createGame({ smooth: true, width: 360, height: 640, scenes: [Ferry], backgroundColor: '#060a1c' });
})();
