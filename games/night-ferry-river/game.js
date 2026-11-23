// Night Ferry: River Run — steer the toad's ferry down a night river.
// Sharp turns and bumps make the spirits slide across the boat; too hard and they fly overboard.
// Steer over a spirit in the water to pull it back in. Reach the harbour with as many as you can (at least one).
(function () {
  'use strict';
  const S = window.Studio;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const TRIP = 7400;          // river length in px of travel (about 40 s)
  const HALF_LEN = 64;        // boat half-length (px)
  const BEAM = 28;            // inner half-width where spirits slide (px)
  const HULL_R = 27;          // collision radius around the boat's centre line
  const EJECT = 250;          // sliding speed (px/s) at the wall that throws a spirit overboard
  const STEER = 1.3;          // finger-to-boat ratio
  const SLOTS = [-44, -25, -6, 13, 32];   // seats along the boat, bow (-) to stern (+); the toad stands at +48
  const SPIRITS = [
    { name: 'Mote', r: 8, grip: 900, ramp: 0 },
    { name: 'Bloom', r: 9, grip: 1150, ramp: 1 },
    { name: 'Old Moss', r: 10.5, grip: 1900, ramp: 2 },
    { name: 'Dusk', r: 8.5, grip: 1050, ramp: 3 },
    { name: 'Glim', r: 8, grip: 950, ramp: 4 },
  ];

  S.defineSfx('plip', [{ type: 'sine', f0: 880, f1: 1320, at: 0, dur: 0.08, vol: 0.12 }]);
  S.defineSfx('splash', [{ type: 'noise', at: 0, dur: 0.4, vol: 0.15 }, { type: 'triangle', f0: 180, f1: 70, at: 0, dur: 0.25, vol: 0.2 }]);
  S.defineSfx('climb', [{ type: 'sine', f0: 520, f1: 980, at: 0, dur: 0.12, vol: 0.12 }, { type: 'sine', f0: 980, f1: 1240, at: 0.1, dur: 0.08, vol: 0.1 }]);
  S.defineSfx('bonk', [{ type: 'triangle', f0: 190, f1: 80, at: 0, dur: 0.18, vol: 0.3 }, { type: 'noise', at: 0, dur: 0.08, vol: 0.12 }]);
  S.defineSfx('slide', [{ type: 'sine', f0: 700, f1: 400, at: 0, dur: 0.12, vol: 0.05 }]);
  S.defineSfx('rumble', [{ type: 'sawtooth', f0: 58, f1: 42, at: 0, dur: 1.2, vol: 0.1 }, { type: 'noise', at: 0, dur: 0.9, vol: 0.04 }]);
  S.defineSfx('gulp', [{ type: 'triangle', f0: 220, f1: 50, at: 0, dur: 0.5, vol: 0.22 }, { type: 'noise', at: 0.05, dur: 0.3, vol: 0.12 }]);
  S.defineSfx('sparkle', [1568, 2093].map((f, i) => ({ type: 'sine', f0: f, f1: f, at: i * 0.06, dur: 0.18, vol: 0.04 })));
  S.defineSfx('note', [{ type: 'sine', f0: 440, f1: 440, at: 0, dur: 0.7, vol: 0.06 }, { type: 'triangle', f0: 880, f1: 880, at: 0, dur: 0.25, vol: 0.012 }]);
  S.defineSfx('bass', [{ type: 'triangle', f0: 110, f1: 110, at: 0, dur: 1.2, vol: 0.08 }]);
  S.defineSfx('chime', [523, 659, 784, 1047].map((f, i) => ({ type: 'sine', f0: f, f1: f, at: i * 0.12, dur: 0.4, vol: 0.12 })));
  S.defineSfx('lose', [440, 392, 330, 262].map((f, i) => ({ type: 'triangle', f0: f, f1: f, at: i * 0.18, dur: 0.24, vol: 0.16 })));

  let current = null;

  class River extends Phaser.Scene {
    constructor() { super('river'); }

    create() {
      current = this;
      const V = S.view;
      this.H = V.height; this.extra = V.extra;
      this.BOAT_SY = this.H - 220;    // boat centre on screen
      this.TRIP = TRIP; this.HALF_LEN = HALF_LEN; this.BEAM = BEAM; this.SLOTS = SLOTS;
      if (!window.__rrHooked) { window.__rrHooked = true; this.game.events.on('postrender', () => current && current.draw()); }
      this.rand = S.rng(S.seed);
      this.fx = S.rng(S.seed * 7 + 3);
      this.t = 0; this.playT = 0; this.dist = 0; this.speed = 150; this.slow = 0;
      this.x = this.cx(0); this.vx = 0; this.ax = 0; this.tx = this.x; this.anchorF = 180; this.anchorT = this.x;
      this.hitCD = 0; this.shake = 0; this.stats = { rock: 0, log: 0, tentacle: 0, bank: 0, ejHit: 0, ejSlide: 0, rescued: 0, drift: 0, grab: 0 }; this.musicT = 0.4; this.musicStep = 0;
      this.spirits = SPIRITS.map((d, i) => ({ ...d, i, slot: SLOTS[i], state: 'aboard', p: 0, q: 0, sliding: false, z: 0, wx: 0, wy: 0, wvx: 0, waterT: 0, bob: this.fx() * 6 }));
      this.lost = 0; this.delivered = 0;
      this.obstacles = []; this.genY = 900; this.parts = []; this.popups = [];
      this.state = S.fixed ? 'playing' : 'title';
      this.hintT = 4; this.endT = 0;
      this.registerTools();
      S.bindInput(this);
    }

    // the river: a winding centre line and a changing width, both in world y (distance travelled)
    cx(wy) { return 180 + 52 * Math.sin(wy * 0.0042 + 1.3) + 26 * Math.sin(wy * 0.0113); }
    hw(wy) { return 128 + 18 * Math.sin(wy * 0.0071 + 0.5) - 14 * Math.min(1, wy / TRIP); }
    worldY(sy) { return this.dist + (this.BOAT_SY - sy); }
    screenY(wy) { return this.BOAT_SY - (wy - this.dist); }

    // ---------- obstacles, generated in patterns ahead of the boat ----------
    generate() {
      const r = this.rand;
      while (this.genY < this.dist + this.BOAT_SY + 260 && this.genY < TRIP - 300) {
        const k = Math.min(1, this.genY / TRIP), wy = this.genY, c = this.cx(wy), w = this.hw(wy);
        const roll = r(), before = this.obstacles.length;
        if (roll < 0.34) { // a line of rocks with one gap
          const gap = 136 - k * 24, g = c - w + 40 + r() * (2 * w - 80 - gap * 0.2);
          for (let x = c - w + 6; x < c + w - 6; x += 34 + r() * 6) if (Math.abs(x - g) > gap / 2) this.obstacles.push({ kind: 'rock', x, wy: wy + (r() - 0.5) * 14, r: 14 + r() * 7 });
        } else if (roll < 0.58) { // a log from one bank
          const side = r() < 0.5 ? -1 : 1, len = (0.52 + r() * 0.12 + k * 0.06) * 2 * w;
          const x0 = side < 0 ? c - w - 10 : c + w + 10 - len;
          this.obstacles.push({ kind: 'log', x0, x1: x0 + len, wy, h: 14 });
        } else if (roll < 0.8) { // a slalom of single rocks
          for (let n = 0; n < 3; n++) { const s = n % 2 ? 1 : -1, wy2 = wy + n * (215 - k * 25); this.obstacles.push({ kind: 'rock', x: this.cx(wy2) + s * (this.hw(wy2) * (0.25 + r() * 0.3)), wy: wy2, r: 15 + r() * 6 }); }
          this.genY += 2 * (215 - k * 25);
        } else { // a tentacle that rises where the boat is when it comes into view
          this.obstacles.push({ kind: 'tentacle', x: null, wy, r: 17, phase: 'hidden', t: 0 });
        }
        const added = this.obstacles.splice(before);
        const ok = added.every((o) => o.kind === 'tentacle' || this.passable(o.wy, added));
        if (ok) this.obstacles.push(...added);
        this.genY += (k < 0.25 ? 480 : 400) - k * 110 + r() * 40;
      }
      this.obstacles = this.obstacles.filter((o) => this.screenY(o.wy) < this.H + 80);
    }

    // is there a passage at world y for a boat of this size? (used by the generator)
    passable(wy, extra) {
      const c = this.cx(wy), w = this.hw(wy), need = 2 * HULL_R + 18, blocks = [];
      for (const o of this.obstacles.concat(extra || [])) {
        if (o.kind === 'tentacle') continue;
        if (Math.abs(o.wy - wy) > HALF_LEN * 2 + 20) continue;
        if (o.kind === 'rock') blocks.push([o.x - o.r, o.x + o.r]);
        else blocks.push([o.x0, o.x1]);
      }
      blocks.sort((a, b) => a[0] - b[0]);
      let edge = c - w;
      for (const [a, b] of blocks) { if (a - edge >= need) return true; edge = Math.max(edge, b); }
      return c + w - edge >= need;
    }

    // ---------- per frame ----------
    update(time, delta) {
      const dt = Math.min(delta / 1000, 1 / 20);
      S.input.update();
      this.t += dt;
      this.ambient(dt);
      if (this.state === 'title') { if (S.input.pressed) { this.state = 'playing'; S.sfx('plip'); this.anchorF = S.input.x; this.anchorT = this.tx; } return; }
      if (this.state === 'won' || this.state === 'lost') { this.endT += dt; if (this.endT > 1.2 && S.input.pressed) this.scene.restart(); return; }
      if (this.state === 'arrive') { this.arrive(dt); return; }
      this.playT += dt; this.hintT -= dt;
      this.slow = Math.max(0, this.slow - dt);
      this.speed = (150 + 75 * Math.min(1, this.dist / TRIP)) * (1 - this.slow * 0.8);
      this.dist += this.speed * dt;
      // swerve steering: the boat follows how far the finger has moved since it touched down
      if (S.input.pressed) { this.anchorF = S.input.x; this.anchorT = this.tx; }
      if (S.input.down) this.tx = clamp(this.anchorT + (S.input.x - this.anchorF) * STEER, 16, 344);
      this.boatPhysics(dt);
      this.generate();
      this.updateObstacles(dt);
      this.spirits.forEach((s) => this.updateSpirit(s, dt));
      if (this.lost >= 5) this.finish(false);
      else if (this.dist >= TRIP) { this.state = 'arrive'; this.arriveT = 0; }
    }

    boatPhysics(dt) {
      const k = 95, c = 2 * Math.sqrt(k) * 0.9;
      let ax = clamp(k * (this.tx - this.x) - c * this.vx, -2200, 2200);
      this.vx += ax * dt; this.x += this.vx * dt; this.ax = ax;
      this.hitCD -= dt;
      // the banks
      for (const end of [-HALF_LEN + 12, HALF_LEN - 12]) {
        const wy = this.dist - end, c2 = this.cx(wy), w = this.hw(wy);
        if (this.x - HULL_R + 4 < c2 - w) { this.hit(-1, 1, 'bank'); this.x = Math.max(this.x, c2 - w + HULL_R - 4); }
        else if (this.x + HULL_R - 4 > c2 + w) { this.hit(1, 1, 'bank'); this.x = Math.min(this.x, c2 + w - HULL_R + 4); }
      }
    }

    // the boat struck something on `side` (-1 left, +1 right): it is shoved away and the spirits are thrown toward the impact
    hit(side, power, cause) {
      if (this.hitCD > 0) return;
      this.stats[cause] += 1;
      this.hitCD = 0.5; this.slow = 0.35;
      this.vx = -side * 240 * power; this.tx = this.x - side * 26; this.anchorT = this.tx; this.anchorF = S.input.x;
      const aboard = this.spirits.filter((s) => s.state === 'aboard').sort((a, b) => b.p * side - a.p * side || a.grip - b.grip);
      aboard.slice(0, power > 1.1 ? 2 : 1).forEach((s) => { s.p = side * (BEAM - s.r); this.overboard(s, 'hit'); });
      this.spirits.forEach((s) => { if (s.state === 'aboard') { s.q += side * (110 + this.fx() * 80) * power * (1000 / s.grip) ** 0.5; s.sliding = true; } });
      this.shake = Math.max(this.shake, 4 * power); S.sfx('bonk');
      this.splash(this.x + side * HULL_R, this.BOAT_SY, 10);
    }

    // distance from a point to the boat's centre line
    boatDist(px, py) { const dy = clamp(py - this.BOAT_SY, -HALF_LEN + 24, HALF_LEN - 24); return [Math.hypot(px - this.x, py - (this.BOAT_SY + dy)), Math.sign(px - this.x) || 1]; }

    updateObstacles(dt) {
      for (const o of this.obstacles) {
        const sy = this.screenY(o.wy);
        if (o.kind === 'tentacle') {
          o.t += dt;
          if (o.phase === 'hidden' && sy > this.BOAT_SY - 330) { o.phase = 'warn'; o.t = 0; o.x = clamp(this.x, this.cx(o.wy) - this.hw(o.wy) + 30, this.cx(o.wy) + this.hw(o.wy) - 30); S.sfx('rumble'); }
          else if (o.phase === 'warn' && sy > this.BOAT_SY - 170) { o.phase = 'up'; o.t = 0; this.shake = Math.max(this.shake, 2); S.sfx('splash'); }
          if (o.phase === 'up') {
            const [d, side] = this.boatDist(o.x, sy); if (d < HULL_R + o.r) this.hit(side, 1.3, 'tentacle');
            this.spirits.forEach((s) => { if (s.state === 'water' && Math.hypot(s.wx - o.x, this.screenY(s.wy) - sy) < o.r + s.r + 10) { s.state = 'gone'; s.waterT = 0; this.lost += 1; this.stats.grab += 1; S.sfx('gulp'); this.popup(s.wx, this.screenY(s.wy) - 20, 'GONE!'); } });
          }
        } else if (o.kind === 'rock') {
          const [d, side] = this.boatDist(o.x, sy); if (d < HULL_R + o.r - 3) this.hit(side, 1, 'rock');
        } else if (o.kind === 'log') {
          if (Math.abs(sy - this.BOAT_SY) < HALF_LEN - 6 + o.h / 2) {
            if (this.x + HULL_R - 6 > o.x0 && this.x - HULL_R + 6 < o.x1) { const side = this.x < (o.x0 + o.x1) / 2 ? (o.x0 < this.cx(o.wy) - this.hw(o.wy) ? -1 : 1) : (o.x1 > this.cx(o.wy) + this.hw(o.wy) ? 1 : -1); this.hit(side, 1, 'log'); }
          }
        }
      }
    }

    updateSpirit(s, dt) {
      s.bob += dt * 3;
      if (s.state === 'aboard') {
        s.z = Math.max(0, s.z - dt * 3);
        const f = -this.ax, wall = BEAM - s.r, before = s.q;
        if (Math.abs(f) > s.grip) s.sliding = true;
        if (s.sliding) {
          const dir = Math.sign(s.q) || Math.sign(f);
          s.q += (f - dir * s.grip * 0.75) * dt;
          if (Math.abs(f) < s.grip * 0.55 && Math.abs(s.q) < 25) s.sliding = false;
        } else s.q += ((0 - s.p) * 7 - s.q * 5) * dt; // waddle back to the middle
        s.p += s.q * dt;
        if (Math.abs(s.p) > wall) {
          if (Math.abs(s.q) > EJECT && Math.sign(s.q) === Math.sign(s.p)) this.overboard(s, 'slide');
          else { s.p = Math.sign(s.p) * wall; s.q = -s.q * 0.25; if (Math.abs(before) > 90) { S.sfx('slide', 1 + this.fx() * 0.3); s.z = 0.5; } }
        }
      } else if (s.state === 'water') {
        s.waterT += dt;
        s.wvx *= 1 - 2.5 * dt;
        s.wx += (s.wvx + clamp(this.x - s.wx, -1, 1) * 16) * dt;
        s.wy += this.speed * 0.68 * dt; // paddling after the boat, but slower than it
        s.z = Math.max(0, s.z - dt * 2.2);
        const sy = this.screenY(s.wy);
        if (s.waterT > 0.35 && s.z <= 0) { const [d] = this.boatDist(s.wx, sy); if (d < HULL_R + s.r) this.rescue(s); }
        if (sy > this.H + 26) { s.state = 'gone'; this.lost += 1; this.stats.drift += 1; this.popup(clamp(s.wx, 40, 320), this.H - 70, 'LOST!'); S.sfx('lose', 2); }
      }
    }

    overboard(s, why) {
      const side = Math.sign(s.p) || 1;
      this.stats[why === 'hit' ? 'ejHit' : 'ejSlide'] += 1;
      s.state = 'water'; s.waterT = 0; s.z = 1;
      s.wy = this.dist - s.slot; s.wx = clamp(this.x + side * (BEAM + 30), this.cx(s.wy) - this.hw(s.wy) + 12, this.cx(s.wy) + this.hw(s.wy) - 12); s.wvx = side * 60 + this.vx * 0.4;
      this.shake = Math.max(this.shake, 2);
      this.splash(s.wx + side * 8, this.screenY(s.wy), 14); S.sfx('splash'); S.sfx('plip', 1.4);
      this.popup(s.wx, this.screenY(s.wy) - 26, `${s.name.toUpperCase()}!`);
    }

    rescue(s) {
      this.stats.rescued += 1; s.state = 'aboard'; s.p = clamp(s.wx - this.x, -(BEAM - s.r), BEAM - s.r); s.q = 0; s.sliding = false; s.z = 1;
      this.sparks(s.wx, this.screenY(s.wy), s.i, 10); S.sfx('climb', 1.1); S.sfx('sparkle');
      this.popup(s.wx, this.screenY(s.wy) - 24, 'SAVED!');
    }

    arrive(dt) {
      this.arriveT += dt;
      this.speed = Math.max(0, this.speed - 160 * dt); this.dist += this.speed * dt;
      this.tx = this.cx(this.dist); this.boatPhysics(dt);
      this.spirits.forEach((s) => { if (s.state === 'water') { s.state = 'gone'; this.lost += 1; } });
      const aboard = this.spirits.filter((s) => s.state === 'aboard');
      if (this.arriveT > 1 && aboard.length && (!this.hopT || this.arriveT - this.hopT > 0.35)) {
        const s = aboard[0]; s.state = 'home'; s.homeT = 0; this.hopT = this.arriveT; this.delivered += 1;
        S.sfx('plip', 1 + this.delivered * 0.12); S.sfx('sparkle', 1 + this.delivered * 0.1);
        this.sparks(this.x, this.BOAT_SY + s.slot, s.i, 8);
      }
      this.spirits.forEach((s) => { if (s.state === 'home') s.homeT += dt; });
      if (!aboard.length && this.arriveT > 1.4) this.finish(this.delivered >= 1);
    }

    finish(won) {
      if (this.state === 'won' || this.state === 'lost') return;
      this.state = won ? 'won' : 'lost'; this.endT = 0;
      S.sfx(won ? 'chime' : 'lose');
    }

    ambient(dt) {
      this.shake = Math.max(0, this.shake - dt * 10);
      this.parts = this.parts.filter((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'drop') p.vy += 260 * dt; if (p.kind === 'spark') { p.vx *= 1 - dt * 2; p.vy += 30 * dt; } return p.life > 0; });
      this.popups = this.popups.filter((p) => (p.life -= dt) > 0);
      this.music(dt);
    }

    // an original lullaby in D major pentatonic, quicker than on the lake
    music(dt) {
      this.musicT -= dt; if (this.musicT > 0) return;
      this.musicT += 0.32;
      const n = this.musicStep++, D = 293.66, scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];
      const melody = [5, 4, 3, -1, 4, 2, 3, -1, 1, 2, 3, 4, 2, -1, -1, -1, 5, 6, 5, -1, 4, 3, 2, -1, 3, 2, 1, 2, 0, -1, -1, -1];
      const bass = [0, 3, 4, 0, 3, 1, 4, 0];
      const m = melody[n % 32]; if (m >= 0) S.sfx('note', (D * scale[m]) / 440);
      if (n % 4 === 0) S.sfx('bass', (D / 2 * scale[bass[(n / 16 | 0) % 8]]) / 110);
    }

    splash(x, y, n) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (this.fx() - 0.5) * 90, vy: -60 - this.fx() * 80, life: 0.7, kind: 'drop' }); }
    sparks(x, y, col, n) { for (let i = 0; i < n; i++) { const a = this.fx() * Math.PI * 2, v = 30 + this.fx() * 50; this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.6 + this.fx() * 0.4, kind: 'spark', col }); } }
    popup(x, y, str) { this.popups.forEach((p) => { if (Math.abs(p.y - y) < 16 && Math.abs(p.x - x) < 90) p.y -= 16; }); this.popups.push({ x, y, str, life: 1.2 }); }

    // ---------- bots: look ahead, pick the safest line, steer smoothly toward it ----------
    registerTools() {
      const self = this;
      const make = (o) => {
        const q = Object.assign({ every: 0, noise: 0, rate: 230, look: 330 }, o || {});
        const r = S.rng(55); let next = 0, goal = null, aim = null;
        return () => {
          if (self.state !== 'playing') return { down: false };
          next -= 1 / 60;
          if (next <= 0 || goal === null) { next = q.every; goal = self.planLine(q.look) + (r() - 0.5) * 2 * q.noise; }
          if (aim === null) aim = self.tx;
          aim += clamp(goal - aim, -q.rate / 60, q.rate / 60);
          // the steering is relative, so turn the wanted boat position into a finger position
          return { down: true, x: self.anchorF + (aim - self.anchorT) / STEER, y: self.BOAT_SY + 120 };
        };
      };
      S.registerApi({
        observe: () => ({ stats: this.stats, t: this.playT, x: this.x, tx: this.tx, dist: this.dist, lost: this.lost, aboard: this.spirits.filter((s) => s.state === 'aboard').length, spirits: this.spirits.map((s) => ({ name: s.name, state: s.state, p: s.p })) }),
        status: () => ({ state: this.state === 'title' || this.state === 'arrive' ? 'playing' : this.state, score: this.state === 'won' || this.state === 'lost' ? this.delivered : this.spirits.filter((s) => s.state === 'aboard').length, time: this.playT }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: { intended: make(), showcase: make(), casual: make({ every: 0.3, noise: 14, rate: 300, look: 280 }), clumsy: make({ every: 0.55, noise: 30, rate: 900, look: 230 }) },
      });
    }

    // the x the boat should head for: clear of rocks, logs, tentacles and banks; a spirit in the water pulls it over
    planLine(look) {
      let best = this.x, bestC = Infinity;
      for (let x = 20; x <= 340; x += 5) {
        let c = Math.abs(x - this.x) * 0.6;
        for (let a = -60; a <= look; a += 30) { const wy = this.dist + a, m = this.hw(wy) - HULL_R - 8, d = Math.abs(x - this.cx(wy)) - m; if (d > 0) c += (200 + d * 20) * 3 * Math.exp(-Math.max(0, a) / 110); }
        for (const o of this.obstacles) {
          const sy = this.screenY(o.wy), ahead = this.BOAT_SY - sy;
          if (ahead < -HALF_LEN - 40 || ahead > look) continue;
          const wgt = 4 * Math.exp(-Math.max(0, ahead) / 110);
          // anything beside the boat or close ahead must not lie across the path from here to x
          if (ahead < 150) {
            const lo = Math.min(x, this.x), hi = Math.max(x, this.x);
            if ((o.kind === 'rock' || (o.kind === 'tentacle' && o.x !== null && o.phase !== 'hidden')) && o.x > lo - o.r - HULL_R - 6 && o.x < hi + o.r + HULL_R + 6) c += 1500 * wgt;
            if (o.kind === 'log' && hi + HULL_R + 6 > o.x0 && lo - HULL_R - 6 < o.x1) c += 1500 * wgt;
          }
          if (o.kind === 'rock' && Math.abs(o.x - x) < o.r + HULL_R + 10) c += 1000 * wgt;
          if (o.kind === 'log' && x + HULL_R + 8 > o.x0 && x - HULL_R - 8 < o.x1) c += 1000 * wgt;
          if (o.kind === 'tentacle' && o.x !== null && o.phase !== 'hidden' && Math.abs(o.x - x) < o.r + HULL_R + 14) c += 1200 * wgt;
        }
        for (const s of this.spirits) if (s.state === 'water') { const sy = this.screenY(s.wy); if (sy > this.BOAT_SY - 120 && sy < this.H) c -= Math.max(0, 500 - Math.abs(s.wx - x) * 12); }
        if (c < bestC) { bestC = c; best = x; }
      }
      return best;
    }

    draw() {
      if (S.mode === 'bot' || !this.game.context) return;
      window.RRPixel.frame(this, this.game.context);
    }
  }

  S.createGame({ smooth: true, width: 360, height: 640, res: 1, scenes: [River], backgroundColor: '#060818' });
})();
