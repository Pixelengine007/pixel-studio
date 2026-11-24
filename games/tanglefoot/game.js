// Tanglefoot (working title) — you are small, the giants are not, and you have a rope.
// Rules, approved by Thomas as grey toy 3/4 on 23 Nov 2026:
//   1. Run a full ring round a giant's legs: the rope catches. Big giants need two rings.
//   2. Run away. When the rope goes tight it falls AWAY from you and knocks down every giant it lands on.
//   - Giants come after you when you are close, so you can lead them together or away from the village.
//   - Ring two trees to string a tripwire; ring a tree and a giant to tie the giant to the tree.
//   - One night is fourteen giants. The village has three lamps; a giant that gets through, or falls on the houses, puts one out.
(function () {
  'use strict';
  const S = window.Studio, RES = 1, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SPEED = 178, LEASH = 112, TREE_LEASH = 330, TREE_LINK = 150, NOTICE = 150, LAMPS = 3;
  const NIGHT = [
    { t: 0.6, x: 180 },
    { t: 8, x: 105 }, { t: 8.5, x: 255 },
    { t: 17, x: 120, big: 1 }, { t: 19, x: 260 },
    { t: 28, x: 205 }, { t: 31, x: 205 }, { t: 34, x: 205 },
    { t: 43, x: 70 }, { t: 43.5, x: 180 }, { t: 44, x: 290 },
    { t: 53, x: 180, big: 1 }, { t: 55, x: 90 }, { t: 55.5, x: 270 },
  ];

  S.defineSfx('step', [{ type: 'sine', f0: 74, f1: 38, at: 0, dur: 0.2, vol: 0.24 }, { type: 'noise', at: 0, dur: 0.07, vol: 0.05 }]);
  S.defineSfx('catch', [{ type: 'triangle', f0: 520, f1: 780, at: 0, dur: 0.08, vol: 0.14 }, { type: 'triangle', f0: 780, f1: 1040, at: 0.08, dur: 0.1, vol: 0.12 }]);
  S.defineSfx('tight', [{ type: 'square', f0: 140, f1: 260, at: 0, dur: 0.14, vol: 0.07 }]);
  S.defineSfx('slip', [{ type: 'sine', f0: 500, f1: 200, at: 0, dur: 0.18, vol: 0.08 }]);
  S.defineSfx('crash', [{ type: 'noise', at: 0, dur: 0.6, vol: 0.3 }, { type: 'sine', f0: 90, f1: 28, at: 0, dur: 0.7, vol: 0.42 }, { type: 'triangle', f0: 60, f1: 30, at: 0.09, dur: 0.5, vol: 0.2 }, { type: 'noise', at: 0.12, dur: 0.5, vol: 0.1 }]);
  S.defineSfx('squash', [{ type: 'square', f0: 300, f1: 80, at: 0, dur: 0.2, vol: 0.14 }]);
  S.defineSfx('combo', [660, 880, 1100].map((f, i) => ({ type: 'triangle', f0: f, f1: f, at: i * 0.07, dur: 0.14, vol: 0.12 })));
  S.defineSfx('lamp', [{ type: 'sawtooth', f0: 300, f1: 90, at: 0, dur: 0.5, vol: 0.12 }]);
  S.defineSfx('dawn', [523, 659, 784, 1047].map((f, i) => ({ type: 'sine', f0: f, f1: f, at: i * 0.14, dur: 0.5, vol: 0.12 })));

  S.defineSfx('pop', [{ type: 'sine', f0: 660, f1: 990, at: 0, dur: 0.07, vol: 0.08 }]);
  S.defineSfx('glass', [{ type: 'noise', at: 0, dur: 0.25, vol: 0.14 }, { type: 'square', f0: 1800, f1: 600, at: 0, dur: 0.2, vol: 0.05 }]);
  // the music: an original prowling tune in A minor pentatonic, plucked, with a drum that joins in as the field fills up
  S.defineSfx('pluck', [{ type: 'triangle', f0: 440, f1: 438, at: 0, dur: 0.3, vol: 0.05 }, { type: 'sine', f0: 880, f1: 880, at: 0, dur: 0.1, vol: 0.012 }]);
  S.defineSfx('bassn', [{ type: 'triangle', f0: 110, f1: 110, at: 0, dur: 0.55, vol: 0.085 }]);
  S.defineSfx('drum', [{ type: 'sine', f0: 96, f1: 48, at: 0, dur: 0.14, vol: 0.09 }]);
  S.defineSfx('cricket', [0, 0.05, 0.1].map((at) => ({ type: 'square', f0: 4200, f1: 4000, at, dur: 0.025, vol: 0.006 })));

  let current = null, seenTitle = false;      // the title shows once; 'play again' goes straight back into the night

  class Toy extends Phaser.Scene {
    constructor() { super('toy'); }

    create() {
      current = this;
      this.H = S.view.height;
      // the ground is drawn at a tilt: ground (x, y) is on screen at (x, HZ + y * K). The picture and the controls both use these.
      this.HZ = Math.round(130 + (this.H - 640) * 0.4); this.K = (this.H - this.HZ) / this.H;
      this.touch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
      if (!window.__tgHooked) { window.__tgHooked = true; this.game.events.on('postrender', () => current && current.draw()); }
      this.rand = S.rng(S.seed);
      this.t = 0; this.pt = 0; this.state = S.fixed || seenTitle ? 'playing' : 'title'; this.endT = 0; this.LAMPS = LAMPS; this.TOTAL = NIGHT.length; this.LEASH = LEASH; this.TREE_LEASH = TREE_LEASH; this.moving = false;
      this.p = { x: 180, y: this.H - 190, stun: 0, wx: 0, wy: 0 };
      this.trail = [];            // the loose rope dragging behind you
      this.chain = [];            // what the rope is caught on, in order; the last one is on your end of the rope
      this.slipT = 0; this.tight = false;
      this.wires = [];            // tripwires strung between two trees
      this.trees = [[56, 0.33], [304, 0.39], [92, 0.6], [272, 0.65]].map(([x, k], i) => ({ kind: 'tree', id: 't' + i, x, y: Math.round(this.H * k), r: 11, need: 1, rings: 0, lap: 0, lastAng: null }));
      this.giants = []; this.next = 0; this.gid = 0;
      this.down = 0; this.hits = 0; this.score = 0; this.combo = 0; this.lastDownT = -9; this.bestCombo = 1;
      this.shake = 0; this.stick = null; this.msg = null;
      // feel: hit-stop, particles, footprints, score pop-ups, fades, music. Their randomness has its own generator so it can never change a run.
      this.fx = S.rng(S.seed * 7 + 3); this.parts = []; this.prints = []; this.pops = []; this.freeze = 0; this.fadeIn = 0.5; this.leaving = -1; this.dustT = 0;
      this.musicT = 0.3; this.musicStep = 0; this.firstRing = false; this.firstDown = false; this.tipT = 0; this.moved = false; this.through = 0; this.pull = false; this.showStick = !S.fixed; this.stickNow = null;
      this.registerTools();
      S.bindInput(this);
      // keyboard: arrow keys or WASD to run (the page needs one click first so it listens to the keys)
      this.keys = !S.fixed && this.input.keyboard ? this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ENTER') : null;
    }

    spawn(e) {
      const y = -30, big = !!e.big, sp = big ? 19 : 15, x = e.x;
      const g = { kind: 'giant', id: 'g' + (this.gid++), x, y, hx: 0, hy: 1, big, need: big ? 2 : 1, sp, r: big ? 27 : 22, rings: 0, lap: 0, lastAng: null, state: 'walk', chase: false, foot: this.gid % 2, st: 0, feet: [{ x: x + sp, y }, { x: x - sp, y: y - 14 }], ft: 0, dir: { x: 0, y: 1 } };
      this.aim(g); this.giants.push(g);
    }

    // a giant lifts a foot and decides where it comes down: on towards the village, or towards you if you are close
    aim(g) {
      const P = this.p, cx = (g.feet[0].x + g.feet[1].x) / 2, cy = (g.feet[0].y + g.feet[1].y) / 2;
      const dx = P.x - cx, dy = P.y - cy, d = Math.hypot(dx, dy) || 1;
      g.chase = g.state === 'walk' && P.stun <= 0 && d < NOTICE + (g.chase ? 40 : 0) && this.state === 'playing';
      const wantA = g.chase ? Math.atan2(dy, dx) : Math.PI / 2, a = Math.atan2(g.hy, g.hx);
      let da = wantA - a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const na = a + clamp(da, -0.7, 0.7); g.hx = Math.cos(na); g.hy = Math.sin(na);
      const f = g.feet[g.foot], side = g.foot ? 1 : -1, stride = g.chase ? 30 : 24;
      let lx = cx + g.hx * stride + -g.hy * side * g.sp, ly = cy + g.hy * stride + g.hx * side * g.sp;
      if (g.state === 'walk' && P.stun <= 0 && Math.hypot(P.x - lx, P.y - ly) < 78) { lx += clamp(P.x - lx, -24, 24); ly += clamp(P.y - ly, -20, 20); }
      g.fromX = f.x; g.fromY = f.y; g.landX = clamp(lx, 24, 336); g.landY = ly;
    }

    // ---------- per frame ----------
    update(time, delta) {
      const dt = Math.min(delta / 1000, 1 / 30), P = this.p;
      S.input.update();
      if (this.freeze > 0) { this.freeze -= dt; return; }          // hit-stop: the world holds still for a beat on a big hit
      this.t += dt; this.shake = Math.max(0, this.shake - dt * 14); this.fadeIn = Math.max(0, this.fadeIn - dt);
      this.updateFx(dt); this.music(dt);
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      if (this.state === 'title') { if (this.fadeIn <= 0 && (S.input.pressed || (this.keys && this.keys.ENTER.isDown))) { this.state = 'playing'; seenTitle = true; S.sfx('catch'); } return; }
      this.pt += this.state === 'playing' ? dt : 0;
      if (this.state !== 'playing') {
        this.endT += dt; this.giants.forEach((g) => this.updateGiant(g, dt));
        if (this.leaving >= 0) { this.leaving -= dt; if (this.leaving < 0) this.scene.restart(); }
        else if (this.endT > 1.8 && (S.input.pressed || (this.keys && this.keys.ENTER.isDown))) this.leaving = 0.25;
        return;
      }
      if (this.tipT > 0) this.tipT -= dt;
      // floating stick: where the thumb lands is the centre
      let wx = 0, wy = 0;
      const K = this.keys, touching = S.fixed ? S.input.down : this.input.activePointer.isDown;
      if (touching && !this.stick) this.stick = { x: S.input.x / RES, y: S.input.y / RES };
      if (!touching) this.stick = null;
      this.stickNow = null;
      if (this.stick) { const dx = S.input.x / RES - this.stick.x, dy = S.input.y / RES - this.stick.y, d = Math.hypot(dx, dy); if (d > 4) { const k = Math.min(1, d / 34) / d; wx = dx * k; wy = dy * k; } this.stickNow = { x: this.stick.x + wx * 30, y: this.stick.y + wy * 30 }; }
      if (K) { const kx = (K.RIGHT.isDown || K.D.isDown ? 1 : 0) - (K.LEFT.isDown || K.A.isDown ? 1 : 0), ky = (K.DOWN.isDown || K.S.isDown ? 1 : 0) - (K.UP.isDown || K.W.isDown ? 1 : 0); if (kx || ky) { const n = Math.hypot(kx, ky); wx = kx / n; wy = ky / n; } }
      { const gy = wy / this.K, n = Math.hypot(wx, gy), m = Math.hypot(wx, wy); if (n > 0) { wx = wx / n * m; wy = gy / n * m; } }      // screen direction -> ground direction, same strength
      P.wx = wx; P.wy = wy;
      if (P.stun > 0) P.stun -= dt;
      else { const ox = P.x, oy = P.y; P.x = clamp(P.x + wx * SPEED * dt, 8, 352); P.y = clamp(P.y + wy * SPEED * dt, 60, this.H - 70); this.moving = Math.hypot(P.x - ox, P.y - oy) > 0.2; if (this.moving) { this.dragTrail(); this.moved = true; this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.14; this.parts.push({ kind: 'dust', x: P.x, y: P.y, z: 0, vx: -wx * 14, vy: -wy * 14, vz: 5, r: 2.4, life: 0, max: 0.32 }); } } }
      while (this.next < NIGHT.length && NIGHT[this.next].t <= this.pt) this.spawn(NIGHT[this.next++]);
      this.giants.forEach((g) => this.updateGiant(g, dt));
      this.giants = this.giants.filter((g) => !g.gone);
      // you cannot stand inside a tree or between a giant's legs
      this.pegs().forEach((c) => { const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1, m = c.r + 7; if (d < m) { P.x = c.x + dx / d * m; P.y = c.y + dy / d * m; } });
      this.updateRings();
      this.updateRope(dt);
      if (this.hits >= LAMPS) this.finish(false);
      else if (this.next >= NIGHT.length && !this.giants.some((g) => g.state !== 'down')) this.finish(true);
    }

    finish(won) { if (this.state !== 'playing') return; this.state = won ? 'won' : 'lost'; this.endT = 0; this.stick = null; this.letGo(); S.sfx(won ? 'dawn' : 'lamp', won ? 1 : 0.6); }
    pegs() { return this.trees.concat(this.giants.filter((g) => g.state === 'walk')); }

    dragTrail() {
      const P = this.p, T = this.trail; T.push({ x: P.x, y: P.y });
      let len = 0; for (let i = T.length - 1; i > 0; i--) { len += Math.hypot(T[i].x - T[i - 1].x, T[i].y - T[i - 1].y); if (len > 430) { T.splice(0, i); break; } }
    }

    updateGiant(g, dt) {
      const P = this.p;
      if (g.land > 0) g.land -= dt;
      if (g.state === 'walk' || g.state === 'through') {
        const thr = g.state === 'through';
        g.st += dt / (thr ? 0.5 : g.chase ? 0.6 : g.big ? 0.9 : 0.74);
        const f = g.feet[g.foot], k = Math.min(1, g.st), e = k * k * (3 - 2 * k);
        f.x = g.fromX + (g.landX - g.fromX) * e; f.y = g.fromY + (g.landY - g.fromY) * e;
        if (g.st >= 1) {
          g.st = 0; g.foot = 1 - g.foot;
          g.land = 0.2;
          if (f.y > 0) { S.sfx('step', (g.big ? 0.72 : 0.92) + this.fx() * 0.2); this.shake = Math.max(this.shake, g.big ? 2.4 : 1.4); this.prints.push({ x: f.x, y: f.y, big: g.big, a: 0 }); this.dust(f.x, f.y, g.big ? 15 : 12, 5, 0.6); }
          if (!thr && this.state === 'playing' && P.stun <= 0 && Math.hypot(P.x - f.x, P.y - f.y) < (g.big ? 31 : 26)) this.squash(f);
          this.aim(g);
        }
        g.x = (g.feet[0].x + g.feet[1].x) / 2; g.y = (g.feet[0].y + g.feet[1].y) / 2;
        if (thr) { if (g.y > this.H + 70) g.gone = true; }
        else if (g.y > this.H - 96) { g.state = 'through'; g.chase = false; this.unhook(g); if (this.state === 'playing') { this.through += 1; this.lampOut('A GIANT GOT THROUGH'); } }
      } else if (g.state === 'lean') {          // the rope is tight: a short beat before it goes over
        g.ft += dt; if (g.ft > 0.16) { g.state = 'fall'; g.ft = 0; }
      } else if (g.state === 'fall') {
        g.ft += dt;
        if (g.ft >= 0.38) {
          g.state = 'down'; g.ft = 0; this.shake = 7; S.sfx('crash'); this.down += 1;
          this.combo = this.t - this.lastDownT < 1.3 ? this.combo + 1 : 1; this.lastDownT = this.t;
          const pts = 10 * this.combo * this.combo, bx = g.x + g.dir.x * 62, by = g.y + g.dir.y * 62;
          this.score += pts; this.bestCombo = Math.max(this.bestCombo, this.combo);
          this.dust(bx, by, 36, 16, 1.2); this.dust(g.x + g.dir.x * 110, g.y + g.dir.y * 110, 16, 6, 1); this.chips(bx, by, 12);
          this.pop(bx, by, `+${pts}`, '#ffd23a', this.combo > 1 ? 3 : 2);
          if (this.combo > 1) { this.pop(bx, by - 34, `${this.combo} IN ONE PULL!`, '#fff1b0', 2); S.sfx('combo', 1 + (this.combo - 2) * 0.2); }
          this.freeze = Math.min(0.2, 0.07 + 0.04 * this.combo);
          if (!this.firstDown) { this.firstDown = true; this.tipT = 9; }
          const hit = (q) => { const rx = q.x - g.x, ry = q.y - g.y, along = rx * g.dir.x + ry * g.dir.y, side = Math.abs(rx * g.dir.y - ry * g.dir.x); return along > 10 && along < 150 && side < 36; };
          this.giants.forEach((o) => { if (o !== g && o.state === 'walk' && hit(o)) this.topple(o, g.dir); });
          if (this.state === 'playing' && g.y + g.dir.y * 140 > this.H - 58) this.lampOut('IT FELL ON THE HOUSES');
        }
      } else if (g.state === 'down') { g.ft += dt; if (g.ft > 3.2) g.gone = true; }
    }

    lampOut(str) {
      const lx = [78, 181, 284][clamp(LAMPS - 1 - this.hits, 0, 2)];
      this.hits += 1; this.shake = 6; S.sfx('lamp'); S.sfx('glass'); this.say(str, '#ff7a6a');
      for (let i = 0; i < 14; i++) { const a = this.fx() * TAU; this.parts.push({ kind: 'spark', col: 'fire', x: lx, y: this.H - 8, z: 34, vx: Math.cos(a) * (30 + this.fx() * 50), vy: Math.sin(a) * 12, vz: 40 + this.fx() * 80, g: 300, life: 0, max: 0.6 + this.fx() * 0.3 }); }
    }
    topple(g, dir) { g.state = 'lean'; g.ft = 0; g.dir = { x: dir.x, y: dir.y }; this.unhook(g); this.freeze = Math.max(this.freeze, 0.05); }
    unhook(c) { c.rings = 0; c.lap = 0; this.chain = this.chain.filter((q) => q !== c); }
    letGo() { this.chain.forEach((c) => { c.rings = 0; c.lap = 0; }); this.chain = []; this.trail = []; this.slipT = 0; this.tight = false; }
    squash(from) {
      const P = this.p, dx = P.x - from.x, dy = P.y - from.y, d = Math.hypot(dx, dy) || 1;
      P.stun = 0.9; P.x = clamp(P.x + dx / d * 26, 8, 352); P.y = clamp(P.y + dy / d * 26, 60, this.H - 70);
      this.pegs().forEach((c) => { c.lap = 0; c.lastAng = null; }); this.trail = [];
      this.shake = Math.max(this.shake, 4); S.sfx('squash'); this.pop(P.x, P.y + 20, 'OUCH!', '#ff7a6a', 2); this.dust(from.x, from.y, 14, 6, 0.8); this.freeze = 0.06;
    }
    say(str, col) { this.msg = { str, col, t: 1.8 }; }
    pop(x, y, str, col, k) { this.pops.push({ x, y, str, col, k, t: 0 }); }
    dust(x, y, spread, n, power) { for (let i = 0; i < n; i++) { const a = this.fx() * TAU, v = (16 + this.fx() * 26) * power; this.parts.push({ kind: 'dust', x: x + Math.cos(a) * spread * 0.7, y: y + Math.sin(a) * spread * 0.7, z: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 5 + this.fx() * 9, r: (2.5 + this.fx() * 3) * (0.8 + power * 0.4), life: 0, max: 0.4 + this.fx() * 0.35 }); } }
    chips(x, y, n) { for (let i = 0; i < n; i++) { const a = this.fx() * TAU, v = 30 + this.fx() * 70; this.parts.push({ kind: 'chip', x, y, z: 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 70 + this.fx() * 110, g: 420, life: 0, max: 0.7 + this.fx() * 0.4 }); } }
    sparks(x, y, n, col) { for (let i = 0; i < n; i++) { const a = i / n * TAU; this.parts.push({ kind: 'spark', col, x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 14, z: 6, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, vz: 20, g: 0, life: 0, max: 0.32 }); } }
    updateFx(dt) {
      this.parts.forEach((p) => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.g) { p.vz -= p.g * dt; if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.35; p.vx *= 0.5; p.vy *= 0.5; } } else { const k = Math.max(0, 1 - 4 * dt); p.vx *= k; p.vy *= k; } });
      this.parts = this.parts.filter((p) => p.life < p.max);
      this.prints.forEach((q) => { q.a += dt; }); this.prints = this.prints.filter((q) => q.a < 7);
      this.pops.forEach((q) => { q.t += dt; }); this.pops = this.pops.filter((q) => q.t < 1.2);
    }
    music(dt) {
      if (this.state === 'won' || this.state === 'lost') return;
      this.musicT -= dt; if (this.musicT > 0) return;
      this.musicT += 0.27;
      const n = this.musicStep++, A = 220, sc = [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5, 2, 12 / 5, 8 / 3], title = this.state === 'title';
      const busy = this.giants.filter((g) => g.state === 'walk' && g.y > 0).length, root = sc[[0, 0, 2, 3, 0, 0, 4, 3][(n >> 3) % 8]];
      if (n % 16 === 5 || n % 16 === 13) S.sfx('cricket');
      if (n % 8 === 0) S.sfx('bassn', root);
      if (title) { const m = [0, -1, -1, 3, -1, -1, 2, -1, 0, -1, -1, 4, -1, 3, -1, -1][n % 16]; if (m >= 0) S.sfx('pluck', A * sc[m] / 440); return; }
      if (n % 8 === 4) S.sfx('bassn', root * 1.5);
      const m = [0, -1, 3, -1, 4, 3, 2, -1, 0, -1, 2, 3, 2, -1, -1, -1, 5, -1, 4, 3, 4, -1, 2, -1, 3, 2, 0, 2, 0, -1, -1, -1][n % 32];
      if (m >= 0) S.sfx('pluck', A * sc[m] / 440);
      if (busy >= 2 && n % 4 === 2) S.sfx('drum'); if (busy >= 4 && n % 4 === 0) S.sfx('drum', 0.8);
    }

    // ---------- rings: every full lap round a giant's legs (or a tree) catches the rope on it ----------
    updateRings() {
      const P = this.p;
      this.pegs().forEach((c) => {
        const d = Math.hypot(P.x - c.x, P.y - c.y), range = c.kind === 'tree' ? 62 : c.big ? 140 : 125;
        if (P.stun > 0 || d > range || c.rings >= c.need) { c.lastAng = null; if (d > range) c.lap = 0; return; }
        const a = Math.atan2(P.y - c.y, P.x - c.x);
        if (c.lastAng !== null) { let da = a - c.lastAng; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; c.lap += da; }
        c.lastAng = a;
        if (Math.abs(c.lap) >= TAU) {
          c.lap = 0; c.rings += 1; this.trail = [];
          const held = this.chain[this.chain.length - 1];
          if (c.kind === 'tree' && held && held.kind === 'tree' && held !== c) {       // tree to tree: a tripwire
            this.wires.push({ a: held, b: c }); this.sparks(held.x, held.y, 8, 'gold'); this.sparks(c.x, c.y, 8, 'gold'); this.letGo(); c.rings = 0; S.sfx('catch', 1.6); this.say('TRIPWIRE SET', '#ffd23a'); return;
          }
          if (!this.chain.includes(c)) this.chain.push(c);
          this.sparks(c.x, c.y, 10, 'gold'); if (c.kind === 'giant') this.firstRing = true;
          S.sfx('catch', 1 + (c.rings - 1) * 0.25 + (this.chain.length - 1) * 0.12);
          if (c.kind === 'giant' && c.rings < c.need) this.say('ONE MORE RING', '#ffd23a');
        }
      });
    }

    // ---------- the rope: tight between you and the last thing it is caught on ----------
    updateRope(dt) {
      const P = this.p, ch = this.chain;
      this.tight = false; this.pull = false;
      // a giant tied to a tree trips by itself when it walks too far from the tree
      for (let i = 0; i + 1 < ch.length; i++) {
        const a = ch[i], b = ch[i + 1];
        const tree = a.kind === 'tree' ? a : b.kind === 'tree' ? b : null, g = a.kind === 'giant' ? a : b.kind === 'giant' ? b : null;
        if (tree && g && g.rings >= g.need) { const dx = g.x - tree.x, dy = g.y - tree.y, d = Math.hypot(dx, dy) || 1; if (d > TREE_LINK) { S.sfx('tight'); this.say('TIED TO THE TREE!', '#ffd23a'); this.topple(g, { x: dx / d, y: dy / d }); this.letGo(); return; } }
      }
      // a giant that walks into a tripwire goes down the way it was walking, and the wire is used up
      for (const w of this.wires) {
        const sx = w.b.x - w.a.x, sy = w.b.y - w.a.y, sl = sx * sx + sy * sy;
        const g = this.giants.find((q) => { if (q.state !== 'walk') return false; const t = clamp(((q.x - w.a.x) * sx + (q.y - w.a.y) * sy) / sl, 0, 1); return Math.hypot(w.a.x + sx * t - q.x, w.a.y + sy * t - q.y) < q.r; });
        if (g) { w.used = true; S.sfx('tight'); this.say('TRIPPED ON THE WIRE!', '#ffd23a'); this.topple(g, { x: g.hx, y: g.hy }); }
      }
      this.wires = this.wires.filter((w) => !w.used);
      const last = ch[ch.length - 1]; if (!last) { this.slipT = 0; return; }
      const dx = P.x - last.x, dy = P.y - last.y, d = Math.hypot(dx, dy) || 1, leash = last.kind === 'tree' ? TREE_LEASH : LEASH + (last.big ? 10 : 0);
      if (d < leash) { this.slipT = 0; return; }
      this.tight = true;
      const pulling = P.stun <= 0 && (P.wx * dx + P.wy * dy) / d > 0.2; this.pull = pulling;
      if (last.kind === 'giant' && last.rings >= last.need && pulling) {
        // the pull: this giant's legs go from under it and it falls away from you; every giant tied behind it goes too
        S.sfx('tight');
        const away = { x: -dx / d, y: -dy / d }, list = ch.slice();
        for (let i = list.length - 1; i >= 0; i--) {
          const g = list[i]; if (g.kind !== 'giant' || g.rings < g.need) continue;
          if (g === last) this.topple(g, away);
          else { const n = list[i + 1], ex = g.x - n.x, ey = g.y - n.y, el = Math.hypot(ex, ey) || 1; this.topple(g, { x: ex / el, y: ey / el }); }
        }
        this.letGo(); return;
      }
      // otherwise the rope holds you; pull against it for a moment and it slips off
      P.x = last.x + dx / d * leash; P.y = last.y + dy / d * leash;
      if (pulling) { this.slipT += dt; if (this.slipT > 0.45) { this.say(last.kind === 'tree' ? 'THE ROPE CAME OFF THE TREE' : last.need > 1 ? 'IT SLIPPED - TWO RINGS' : 'IT SLIPPED', '#ff7a6a'); S.sfx('slip'); this.unhook(last); this.slipT = 0; } } else this.slipT = 0;
    }

    // ---------- test bot: ring the nearest giant, then pull from the village side ----------
    registerTools() {
      const self = this;
      const ring = () => {
        let first = true;
        return () => {
          if (first) { first = false; return { down: true, x: 180 * RES, y: 400 * RES }; }
          const P = self.p, last = self.chain[self.chain.length - 1];
          let vx = 0, vy = 0;
          if (last && last.kind === 'giant' && last.rings >= last.need) { vx = P.x - last.x; vy = P.y - last.y + 40; }
          else {
            const gs = self.giants.filter((g) => g.state === 'walk' && g.y > 40);
            if (gs.length) {
              const g = gs.reduce((a, b) => (a.y > b.y ? a : b));
              const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1, want = 62;
              vx = -dy / d + (want - d) / 30 * dx / d; vy = dx / d + (want - d) / 30 * dy / d;
            } else { vx = 180 - P.x; vy = self.H * 0.55 - P.y; }
          }
          vy *= self.K; const n = Math.hypot(vx, vy) || 1;
          return { down: true, x: (180 + vx / n * 40) * RES, y: (400 + vy / n * 40) * RES };
        };
      };
      S.registerApi({
        observe: () => ({ t: this.t, down: this.down, hits: this.hits, score: this.score, best: this.bestCombo, chain: this.chain.map((c) => [c.id, c.rings]), giants: this.giants.map((g) => [g.id, g.state, Math.round(g.x), Math.round(g.y), g.chase]) }),
        status: () => ({ state: this.state === 'title' ? 'playing' : this.state, score: this.score, time: this.pt }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: { intended: ring(), showcase: ring(), wire: (() => { let first = true; return () => {   // test: string a tripwire between the two upper trees, then wait below it
          if (first) { first = false; return { down: true, x: 180 * RES, y: 400 * RES }; }
          const P = self.p, held = self.chain[self.chain.length - 1];
          let vx, vy;
          if (self.wires.length) { vx = 180 - P.x; vy = self.H * 0.52 - P.y; if (Math.hypot(vx, vy) < 6) return { down: true, x: 180 * RES, y: 400 * RES }; }
          else { const c = held && held.kind === 'tree' ? self.trees[1] : self.trees[0], dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1; vx = -dy / d + (40 - d) / 20 * dx / d; vy = dx / d + (40 - d) / 20 * dy / d; }
          vy *= self.K; const n = Math.hypot(vx, vy) || 1; return { down: true, x: (180 + vx / n * 40) * RES, y: (400 + vy / n * 40) * RES };
        }; })() },
      });
    }

    draw() {
      if (S.mode === 'bot' || !this.game.context) return;
      window.TFPixel.frame(this, this.game.context);
    }
  }

  S.createGame({ smooth: true, width: 360, height: 640, res: RES, scenes: [Toy], backgroundColor: '#070b14' });
})();
