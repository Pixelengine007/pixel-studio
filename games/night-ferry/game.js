// Night Ferry — row five little lights across a foggy lake at night.
// Drag Wren along the boat to keep it level; while you touch, Wren's lantern glows and calm spirits drift toward it.
// The spirits have their own minds: they chase fireflies and jumping fish, panic when the Deep One surfaces,
// and slide off a tilted boat. Spirits in the water swim back, unless the Deep One gets there first.
(function () {
  'use strict';
  const S = window.Studio;
  const RES = 1; // one canvas pixel per game pixel; the page scales it up with crisp pixels
  const WATER = 392, BX = 180, DECK = 132, SPEED = 26, TRIP = 1950, WREN_W = 1.6;

  const SPIRITS = [
    { name: 'Mote', w: 0.6, r: 13, curious: 0.95, fear: 0.6, col: { body: '#bff6ff', edge: '#5ac8e8', glow: 'rgba(120,230,255,A)' } },
    { name: 'Bloom', w: 0.9, r: 15, curious: 0.55, fear: 0.8, col: { body: '#ffd6e6', edge: '#e87aa8', glow: 'rgba(255,150,200,A)' } },
    { name: 'Old Moss', w: 1.4, r: 19, curious: 0.15, fear: 0.25, col: { body: '#d8f5c8', edge: '#6aae6a', glow: 'rgba(160,240,150,A)' } },
    { name: 'Dusk', w: 0.8, r: 14, curious: 0.6, fear: 1.0, col: { body: '#e4dcff', edge: '#8a7ad8', glow: 'rgba(180,160,255,A)' } },
    { name: 'Glim', w: 0.7, r: 13, curious: 0.85, fear: 0.45, col: { body: '#fff2c0', edge: '#e8b040', glow: 'rgba(255,220,120,A)' } },
  ];

  // sounds (synthesized, original)
  S.defineSfx('plip', [{ type: 'sine', f0: 880, f1: 1320, at: 0, dur: 0.08, vol: 0.12 }]);
  S.defineSfx('splash', [{ type: 'noise', at: 0, dur: 0.4, vol: 0.15 }, { type: 'triangle', f0: 180, f1: 70, at: 0, dur: 0.25, vol: 0.2 }]);
  S.defineSfx('climb', [{ type: 'sine', f0: 520, f1: 980, at: 0, dur: 0.12, vol: 0.12 }, { type: 'sine', f0: 980, f1: 1240, at: 0.1, dur: 0.08, vol: 0.1 }]);
  S.defineSfx('rumble', [{ type: 'sawtooth', f0: 58, f1: 42, at: 0, dur: 1.6, vol: 0.12 }, { type: 'noise', at: 0, dur: 1.2, vol: 0.05 }]);
  S.defineSfx('gulp', [{ type: 'triangle', f0: 220, f1: 50, at: 0, dur: 0.5, vol: 0.22 }, { type: 'noise', at: 0.05, dur: 0.3, vol: 0.12 }]);
  S.defineSfx('creak', [{ type: 'square', f0: 170, f1: 130, at: 0, dur: 0.09, vol: 0.04 }]);
  S.defineSfx('fish', [{ type: 'noise', at: 0, dur: 0.12, vol: 0.08 }, { type: 'sine', f0: 600, f1: 300, at: 0, dur: 0.1, vol: 0.06 }]);
  S.defineSfx('chime', [523, 659, 784, 1047].map((f, i) => ({ type: 'sine', f0: f, f1: f, at: i * 0.12, dur: 0.4, vol: 0.12 })));
  S.defineSfx('note', [{ type: 'sine', f0: 440, f1: 440, at: 0, dur: 0.9, vol: 0.075 }, { type: 'triangle', f0: 880, f1: 880, at: 0, dur: 0.35, vol: 0.012 }]);
  S.defineSfx('bass', [{ type: 'triangle', f0: 110, f1: 110, at: 0, dur: 1.6, vol: 0.085 }]);
  S.defineSfx('lap', [{ type: 'noise', at: 0, dur: 0.35, vol: 0.018 }, { type: 'sine', f0: 140, f1: 90, at: 0, dur: 0.3, vol: 0.02 }]);
  S.defineSfx('cricket', [0, 0.05, 0.1].map((at) => ({ type: 'square', f0: 4200, f1: 4000, at, dur: 0.025, vol: 0.006 })));
  S.defineSfx('thump', [{ type: 'sine', f0: 90, f1: 50, at: 0, dur: 0.14, vol: 0.18 }, { type: 'sine', f0: 80, f1: 45, at: 0.18, dur: 0.12, vol: 0.12 }]);
  S.defineSfx('sparkle', [1568, 2093].map((f, i) => ({ type: 'sine', f0: f, f1: f, at: i * 0.06, dur: 0.18, vol: 0.04 })));
  S.defineSfx('lose', [440, 392, 330, 262].map((f, i) => ({ type: 'triangle', f0: f, f1: f, at: i * 0.18, dur: 0.24, vol: 0.16 })));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let current = null;

  class Ferry extends Phaser.Scene {
    constructor() { super('ferry'); }

    create() {
      current = this;
      const V = S.view;
      this.extra = V.extra;
      this.WATER = WATER; this.TRIP = TRIP;
      if (!window.__nfHooked) { window.__nfHooked = true; this.game.events.on('postrender', () => current && current.draw()); }

      this.rand = S.rng(S.seed);
      this.t = 0; this.playT = 0; this.dist = 0;
      this.theta = 0; this.thetaV = 0;
      this.uw = 0; this.lantern = false; this.wrenStep = 0; this.face = 1; this.shake = 0; this.fx = S.rng(S.seed * 7 + 3); this.musicT = 0.5; this.musicStep = 0; this.lapT = 1; this.heartT = 0;
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
      while (t < 70) { ev.push({ t, kind: r() < 0.55 ? 'fireflies' : 'fish', side: r() < 0.5 ? -1 : 1 }); t += 3.2 + r() * 2.6; }
      [19, 40, 58].forEach((dt) => ev.push({ t: dt + r() * 3, kind: 'deep', side: r() < 0.5 ? -1 : 1 }));
      [9, 17, 29, 37, 49, 64].forEach((dt) => ev.push({ t: dt + r() * 2, kind: 'wave', side: r() < 0.5 ? -1 : 1 }));
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
    get viewTheta() { return this.theta * 0.75; } // the picture leans a little less than the physics
    deckPoint(u, dy = -16) { const [ox, oy] = this.boatOrigin(), c = Math.cos(this.viewTheta), s = Math.sin(this.viewTheta), x = u * DECK; return [ox + c * x - s * dy, oy + s * x + c * dy]; }

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
      this.lantern = S.input.down; this.toadV = 0;
      if (S.input.down) {
        const lx = S.input.x / RES;
        const target = clamp((lx - BX) / DECK, -0.95, 0.95);
        const step = clamp(target - this.uw, -1.25 * dt, 1.25 * dt);
        this.uw += step; this.wrenStep += Math.abs(step) * 9; this.toadV = step / Math.max(dt, 1e-4); if (Math.abs(this.toadV) > 0.05) this.face = Math.sign(this.toadV);
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
          if (e.kind === 'fireflies') for (let i = 0; i < 9; i++) this.fireflies.push({ x: BX + e.side * (120 + this.rand() * 50), y: 270 + this.rand() * 70, ph: this.rand() * 6, life: 5 });
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
        const calm = this.lantern && Math.abs(s.u - this.uw) < 0.38; // spirits close to the lit lantern stay put
        if (calm) s.interest = 0;
        if (s.panicT > 0) { target = -this.deep.side * 0.92; speed = 1.0; s.mood = 'scared'; }
        else if (s.interest > 0 && this.interest) { target = this.interest.side * 0.94; speed = 0.55; s.mood = 'curious'; s.lean = this.interest.side * 0.3; }
        else if (calm) { target = s.u; speed = 0; s.mood = 'happy'; }
        else { if (s.timer <= 0) { s.timer = 2 + this.rand() * 3; s.target = s.curious < 0.2 ? s.u : clamp(s.u + (this.rand() - 0.5) * 0.8, -0.75, 0.75); } target = s.target; }
        s.u += clamp(target - s.u, -speed * dt, speed * dt);
        // a tilted boat makes everyone slide downhill
        if (Math.abs(this.theta) > 0.16) s.u += Math.sign(this.theta) * (Math.abs(this.theta) - 0.16) * 2.6 * dt / Math.sqrt(s.w);
        s.u = clamp(s.u, -1.02, 1.02);
        // at the edge of a tilted boat a spirit clings on (trembling) for a moment before it falls
        if (Math.abs(s.u) > 0.94 && this.theta * Math.sign(s.u) > 0.26) { s.edgeT = (s.edgeT || 0) + dt; s.mood = 'scared'; if (s.edgeT > 0.7) { s.edgeT = 0; this.overboard(s); } }
        else s.edgeT = Math.max(0, (s.edgeT || 0) - dt * 2);
      } else if (s.state === 'water') {
        s.waterT += dt;
        const side = s.wx < BX ? -1 : 1, [ex] = this.deckPoint(side * 1.05);
        const reach = Math.abs(this.theta) < 0.16 ? 0 : 16;
        s.wx += (-SPEED + (Math.abs(ex - s.wx) > reach ? Math.sign(ex - s.wx) * 46 : SPEED * 0.9)) * dt;
        // a spirit in the water draws the Deep One
        if (s.waterT > 2.0 && this.deep.phase === 'off') { Object.assign(this.deep, { phase: 'warn', t: 0, side: s.wx < BX ? -1 : 1, y: 700, eye: 0 }); S.sfx('rumble'); }
        s.wy = this.surf(s.wx) + 1 + Math.sin(s.bob * 2) * 1.2;
        s.mood = 'scared';
        const d = this.deep;
        if ((d.phase === 'rise' || d.phase === 'hold') && Math.abs(s.wx - (BX + d.side * 120)) < 150 && s.waterT > 1.1) { s.state = 'grab'; s.waterT = 0; S.sfx('gulp'); this.shake = Math.max(this.shake, 3); this.popup(s.wx, s.wy - 26, 'GONE!'); }
        else if (Math.abs(s.wx - ex) < 12 && Math.abs(this.theta) < 0.16) { s.state = 'deck'; s.u = side * 0.92; s.panicT = 0; s.interest = 0; S.sfx('climb', 1.1); this.splash(s.wx, this.surf(s.wx), 4); this.sparks(s.wx, s.wy - 10, this.spirits.indexOf(s), 10); S.sfx('sparkle'); }
        else if (s.wx < -50 || s.waterT > 9) { s.state = 'grab'; s.waterT = 0; }
      } else if (s.state === 'grab') {
        s.waterT += dt; s.wy += dt * 60; s.wx -= SPEED * dt;
        if (s.waterT > 1) { s.state = 'lost'; this.lost += 1; }
      }
    }

    overboard(s) {
      const [x, y] = this.deckPoint(Math.sign(s.u) * 1.05);
      s.state = 'water'; s.wx = x + Math.sign(s.u) * 20; s.wy = y; s.waterT = 0;
      this.splash(s.wx, this.surf(s.wx), 16); S.sfx('splash'); this.shake = Math.max(this.shake, 3); S.sfx('plip', 1.4);
      this.popup(s.wx, y - 30, `${s.name.toUpperCase()}!`);
    }

    separate() {
      const on = this.spirits.filter((s) => s.state === 'deck').sort((a, b) => a.u - b.u);
      for (let k = 0; k < 2; k++) for (let i = 1; i < on.length; i++) { const a = on[i - 1], b = on[i], min = (a.r + b.r) / DECK * 1.05; if (b.u - a.u < min) { const p = (min - (b.u - a.u)) / 2; a.u -= p; b.u += p; } }
    }

    physics(dt) {
      let T = WREN_W * this.uw;
      this.spirits.forEach((s) => { if (s.state === 'deck') T += s.w * s.u; });
      const target = clamp(T * 0.24, -0.42, 0.42) + Math.sin(this.t * 1.3) * 0.03;
      this.thetaV += ((target - this.theta) * 10 - this.thetaV * 3.2) * dt;
      this.theta += this.thetaV * dt;
      if (Math.abs(this.theta) > 0.48) { this.theta = Math.sign(this.theta) * 0.48; this.thetaV *= -0.3; }
      this.creakT -= dt;
      if (Math.abs(this.thetaV) > 0.35 && this.creakT <= 0) { S.sfx('creak', 0.8 + Math.abs(this.theta)); this.creakT = 0.6; }
    }

    updateDeep(dt) {
      const d = this.deep; d.t += dt;
      if (d.phase === 'warn') { if (this.fx() < dt * 18) this.parts.push({ x: BX + d.side * (100 + this.fx() * 60), y: 600, vx: 0, vy: -60 - this.rand() * 40, life: 2.5, kind: 'bubble' }); if (d.t > 1.6) { d.phase = 'rise'; d.t = 0; this.thetaV += d.side * 0.5; this.shake = Math.max(this.shake, 4); } }
      else if (d.phase === 'rise') { d.y += (470 - d.y) * Math.min(1, dt * 3); d.eye = Math.min(1, d.eye + dt * 1.5); if (d.t > 0.5 && !d.scared) { d.scared = true; this.spirits.forEach((s) => { if (s.state === 'deck' && this.rand() < s.fear) s.panicT = 1.6 + s.fear * 1.4; }); } if (d.t > 1.2) { d.phase = 'hold'; d.t = 0; } }
      else if (d.phase === 'hold') { if (d.t > 2.8) { d.phase = 'sink'; d.t = 0; } }
      else if (d.phase === 'sink') { d.y += 120 * dt; d.eye = Math.max(0, d.eye - dt * 1.5); if (d.t > 1.6) { d.phase = 'off'; d.scared = false; } }
    }

    ambient(dt) {
      this.shake = Math.max(0, this.shake - dt * 10);
      this.music(dt);
      this.lapT -= dt; if (this.lapT <= 0) { this.lapT = 1.4 + this.fx() * 1.6; S.sfx(this.fx() < 0.25 ? 'cricket' : 'lap', 0.9 + this.fx() * 0.3); }
      if (this.state === 'playing' && this.spirits.some((s) => s.state === 'deck' && (s.edgeT || 0) > 0)) { this.heartT -= dt; if (this.heartT <= 0) { S.sfx('thump'); this.heartT = 0.42; } } else this.heartT = 0;
      this.parts.forEach((p) => { if (p.kind === 'spark') { p.vx *= 1 - dt * 2; p.vy += 30 * dt; } });
      this.parts = this.parts.filter((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'drop') p.vy += 220 * dt; if (p.kind === 'bubble' && p.y < WATER + 4) { this.ripples.push({ x: p.x, y: WATER, r: 2, life: 1 }); return false; } return p.life > 0; });
      this.ripples = this.ripples.filter((r) => { r.life -= dt; r.r += dt * 14; r.x -= SPEED * dt * (this.state === 'playing' ? 1 : 0); return r.life > 0; });
      this.fireflies = this.fireflies.filter((f) => { f.life -= dt; f.ph += dt; return f.life > 0; });
      if (this.fish) { this.fish.t += dt; if (this.fish.t > 1.3) { this.splash(this.fish.x + this.fish.side * 30, WATER, 5); this.fish = null; } }
      this.popups = this.popups.filter((p) => (p.life -= dt) > 0);
    }

    sparks(x, y, col, n) {
      for (let i = 0; i < n; i++) { const a = this.fx() * Math.PI * 2, v = 30 + this.fx() * 50; this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.6 + this.fx() * 0.4, kind: 'spark', col }); }
    }

    // an original lullaby in D major pentatonic (waltz time); it turns low and slow while the Deep One is up
    music(dt) {
      this.musicT -= dt; if (this.musicT > 0) return;
      const tense = this.deep.phase !== 'off' && this.deep.phase !== 'sink';
      const beat = tense ? 0.6 : 0.46; this.musicT += beat;
      const n = this.musicStep++;
      const D = 293.66, scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];
      if (tense) { if (n % 3 === 0) S.sfx('bass', [1, 16 / 15, 1, 6 / 5][(n / 3) % 4 | 0] * 0.66); if (n % 6 === 3) S.sfx('note', (D * [6 / 5, 16 / 15][(n / 6) % 2 | 0]) / 440 * 0.5); return; }
      const melody = [5, 4, 3, -1, 4, 2, 3, -1, 1, 2, 3, 4, 2, -1, -1, -1, 5, 6, 5, -1, 4, 3, 2, -1, 3, 2, 1, 2, 0, -1, -1, -1];
      const bass = [0, 3, 4, 0, 3, 1, 4, 0];
      const m = melody[n % 32]; if (m >= 0) S.sfx('note', (D * scale[m]) / 440);
      if (n % 3 === 0) S.sfx('bass', (D / 4 * scale[bass[(n / 12 | 0) % 8]] * 2) / 110 / 1);
    }

    splash(x, y, n) {
      for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (this.fx() - 0.5) * 70, vy: -50 - this.fx() * 70, life: 0.9, kind: 'drop' });
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
        if (!this.hopT || this.arriveT - this.hopT > 0.45) { this.hopT = this.arriveT; next.state = 'home'; next.homeT = 0; this.delivered += 1; S.sfx('plip', 1 + this.delivered * 0.12); S.sfx('sparkle', 1 + this.delivered * 0.1); }
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

    // ---------- drawing: the HD pixel renderer paints straight onto the game canvas ----------
    draw() {
      if (S.mode === 'bot' || !this.game.context) return;
      window.NFPixel.frame(this, this.game.context);
    }
  }

  S.createGame({ smooth: true, width: 360, height: 640, res: 1, scenes: [Ferry], backgroundColor: '#060818' });
})();
