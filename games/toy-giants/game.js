// GREY-BOX TOY: rope and giants, version 3. Plain shapes, no art.
// The rule for bringing a giant down (unchanged from version 2):
//   1. Run a full ring round its legs: the rope catches. Big giants need two rings.
//   2. Run away. When the rope goes tight it falls AWAY from you, and knocks down every giant it lands on.
// New in version 3, so that there is something to plan:
//   - Giants turn and come after you when you are close. Lead them together, or away from the village.
//   - A falling giant topples the next one like dominoes; one pull that fells several scores far more.
//   - One night is fourteen giants. The village has three lamps. A giant that gets through, or falls on the houses, puts one out.
(function () {
  'use strict';
  const S = window.Studio, RES = 2, TAU = Math.PI * 2;
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

  S.defineSfx('step', [{ type: 'sine', f0: 70, f1: 40, at: 0, dur: 0.16, vol: 0.2 }]);
  S.defineSfx('catch', [{ type: 'triangle', f0: 520, f1: 780, at: 0, dur: 0.08, vol: 0.14 }, { type: 'triangle', f0: 780, f1: 1040, at: 0.08, dur: 0.1, vol: 0.12 }]);
  S.defineSfx('tight', [{ type: 'square', f0: 140, f1: 260, at: 0, dur: 0.14, vol: 0.07 }]);
  S.defineSfx('slip', [{ type: 'sine', f0: 500, f1: 200, at: 0, dur: 0.18, vol: 0.08 }]);
  S.defineSfx('crash', [{ type: 'noise', at: 0, dur: 0.5, vol: 0.3 }, { type: 'sine', f0: 90, f1: 30, at: 0, dur: 0.6, vol: 0.4 }]);
  S.defineSfx('squash', [{ type: 'square', f0: 300, f1: 80, at: 0, dur: 0.2, vol: 0.14 }]);
  S.defineSfx('combo', [660, 880, 1100].map((f, i) => ({ type: 'triangle', f0: f, f1: f, at: i * 0.07, dur: 0.14, vol: 0.12 })));
  S.defineSfx('lamp', [{ type: 'sawtooth', f0: 300, f1: 90, at: 0, dur: 0.5, vol: 0.12 }]);
  S.defineSfx('dawn', [523, 659, 784, 1047].map((f, i) => ({ type: 'sine', f0: f, f1: f, at: i * 0.14, dur: 0.5, vol: 0.12 })));

  let current = null;

  class Toy extends Phaser.Scene {
    constructor() { super('toy'); }

    create() {
      current = this;
      this.H = S.view.height;
      if (!window.__tgHooked) { window.__tgHooked = true; this.game.events.on('postrender', () => current && current.draw()); }
      this.rand = S.rng(S.seed);
      this.t = 0; this.state = 'playing'; this.endT = 0;
      this.p = { x: 180, y: this.H - 190, stun: 0, wx: 0, wy: 0 };
      this.trail = [];            // the loose rope dragging behind you
      this.chain = [];            // what the rope is caught on, in order; the last one is on your end of the rope
      this.slipT = 0; this.tight = false;
      this.wires = [];            // tripwires strung between two trees
      this.trees = [[56, 0.33], [304, 0.39], [92, 0.6], [272, 0.65]].map(([x, k], i) => ({ kind: 'tree', id: 't' + i, x, y: Math.round(this.H * k), r: 11, need: 1, rings: 0, lap: 0, lastAng: null }));
      this.giants = []; this.next = 0; this.gid = 0;
      this.down = 0; this.hits = 0; this.score = 0; this.combo = 0; this.lastDownT = -9; this.bestCombo = 1;
      this.shake = 0; this.stick = null; this.msg = null;
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
      g.chase = P.stun <= 0 && d < NOTICE + (g.chase ? 40 : 0) && this.state === 'playing';
      const wantA = g.chase ? Math.atan2(dy, dx) : Math.PI / 2, a = Math.atan2(g.hy, g.hx);
      let da = wantA - a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const na = a + clamp(da, -0.7, 0.7); g.hx = Math.cos(na); g.hy = Math.sin(na);
      const f = g.feet[g.foot], side = g.foot ? 1 : -1, stride = g.chase ? 30 : 24;
      let lx = cx + g.hx * stride + -g.hy * side * g.sp, ly = cy + g.hy * stride + g.hx * side * g.sp;
      if (P.stun <= 0 && Math.hypot(P.x - lx, P.y - ly) < 78) { lx += clamp(P.x - lx, -24, 24); ly += clamp(P.y - ly, -20, 20); }
      g.fromX = f.x; g.fromY = f.y; g.landX = clamp(lx, 24, 336); g.landY = ly;
    }

    // ---------- per frame ----------
    update(time, delta) {
      const dt = Math.min(delta / 1000, 1 / 30), P = this.p;
      S.input.update();
      this.t += dt; this.shake = Math.max(0, this.shake - dt * 14);
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      if (this.state !== 'playing') { this.endT += dt; this.giants.forEach((g) => this.updateGiant(g, dt)); if (this.endT > 1.2 && (S.input.pressed || (this.keys && this.keys.ENTER.isDown))) this.scene.restart(); return; }
      // floating stick: where the thumb lands is the centre
      let wx = 0, wy = 0;
      const K = this.keys, touching = S.fixed ? S.input.down : this.input.activePointer.isDown;
      if (touching && !this.stick) this.stick = { x: S.input.x / RES, y: S.input.y / RES };
      if (!touching) this.stick = null;
      if (this.stick) { const dx = S.input.x / RES - this.stick.x, dy = S.input.y / RES - this.stick.y, d = Math.hypot(dx, dy); if (d > 4) { const k = Math.min(1, d / 34) / d; wx = dx * k; wy = dy * k; } }
      if (K) { const kx = (K.RIGHT.isDown || K.D.isDown ? 1 : 0) - (K.LEFT.isDown || K.A.isDown ? 1 : 0), ky = (K.DOWN.isDown || K.S.isDown ? 1 : 0) - (K.UP.isDown || K.W.isDown ? 1 : 0); if (kx || ky) { const n = Math.hypot(kx, ky); wx = kx / n; wy = ky / n; } }
      P.wx = wx; P.wy = wy;
      if (P.stun > 0) P.stun -= dt;
      else { const ox = P.x, oy = P.y; P.x = clamp(P.x + wx * SPEED * dt, 8, 352); P.y = clamp(P.y + wy * SPEED * dt, 60, this.H - 70); if (Math.hypot(P.x - ox, P.y - oy) > 0.2) this.dragTrail(); }
      while (this.next < NIGHT.length && NIGHT[this.next].t <= this.t) this.spawn(NIGHT[this.next++]);
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
      if (g.state === 'walk') {
        g.st += dt / (g.chase ? 0.6 : g.big ? 0.9 : 0.74);
        const f = g.feet[g.foot], k = Math.min(1, g.st), e = k * k * (3 - 2 * k);
        f.x = g.fromX + (g.landX - g.fromX) * e; f.y = g.fromY + (g.landY - g.fromY) * e;
        if (g.st >= 1) {
          g.st = 0; g.foot = 1 - g.foot;
          if (f.y > 0) { S.sfx('step', 0.9 + this.rand() * 0.2); this.shake = Math.max(this.shake, 1.2); }
          if (this.state === 'playing' && P.stun <= 0 && Math.hypot(P.x - f.x, P.y - f.y) < (g.big ? 31 : 26)) this.squash(f);
          this.aim(g);
        }
        g.x = (g.feet[0].x + g.feet[1].x) / 2; g.y = (g.feet[0].y + g.feet[1].y) / 2;
        if (g.y > this.H - 96 && this.state === 'playing') { g.gone = true; this.unhook(g); this.lampOut('A GIANT GOT THROUGH'); }
      } else if (g.state === 'lean') {          // the rope is tight: a short beat before it goes over
        g.ft += dt; if (g.ft > 0.16) { g.state = 'fall'; g.ft = 0; }
      } else if (g.state === 'fall') {
        g.ft += dt;
        if (g.ft >= 0.38) {
          g.state = 'down'; g.ft = 0; this.shake = 7; S.sfx('crash'); this.down += 1;
          this.combo = this.t - this.lastDownT < 1.3 ? this.combo + 1 : 1; this.lastDownT = this.t;
          this.score += 10 * this.combo * this.combo; this.bestCombo = Math.max(this.bestCombo, this.combo);
          if (this.combo > 1) { this.say(`${this.combo} WITH ONE PULL!`, '#ffd23a'); S.sfx('combo', 1 + (this.combo - 2) * 0.2); }
          const hit = (q) => { const rx = q.x - g.x, ry = q.y - g.y, along = rx * g.dir.x + ry * g.dir.y, side = Math.abs(rx * g.dir.y - ry * g.dir.x); return along > 10 && along < 150 && side < 36; };
          this.giants.forEach((o) => { if (o !== g && o.state === 'walk' && hit(o)) this.topple(o, g.dir); });
          if (this.state === 'playing' && g.y + g.dir.y * 140 > this.H - 58) this.lampOut('IT FELL ON THE HOUSES');
        }
      } else if (g.state === 'down') { g.ft += dt; if (g.ft > 3.2) g.gone = true; }
    }

    lampOut(str) { this.hits += 1; this.shake = 5; S.sfx('lamp'); this.say(str, '#ff7a6a'); }
    topple(g, dir) { g.state = 'lean'; g.ft = 0; g.dir = { x: dir.x, y: dir.y }; this.unhook(g); }
    unhook(c) { c.rings = 0; c.lap = 0; this.chain = this.chain.filter((q) => q !== c); }
    letGo() { this.chain.forEach((c) => { c.rings = 0; c.lap = 0; }); this.chain = []; this.trail = []; this.slipT = 0; this.tight = false; }
    squash(from) {
      const P = this.p, dx = P.x - from.x, dy = P.y - from.y, d = Math.hypot(dx, dy) || 1;
      P.stun = 0.9; P.x = clamp(P.x + dx / d * 26, 8, 352); P.y = clamp(P.y + dy / d * 26, 60, this.H - 70);
      this.pegs().forEach((c) => { c.lap = 0; c.lastAng = null; }); this.trail = [];
      this.shake = Math.max(this.shake, 4); S.sfx('squash'); this.say('SQUASHED', '#ff7a6a');
    }
    say(str, col) { this.msg = { str, col, t: 1.5 }; }

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
            this.wires.push({ a: held, b: c }); this.letGo(); c.rings = 0; S.sfx('catch', 1.6); this.say('TRIPWIRE SET', '#ffd23a'); return;
          }
          if (!this.chain.includes(c)) this.chain.push(c);
          S.sfx('catch', 1 + (c.rings - 1) * 0.25 + (this.chain.length - 1) * 0.12);
          if (c.kind === 'giant' && c.rings < c.need) this.say('ONE MORE RING', '#ffd23a');
        }
      });
    }

    // ---------- the rope: tight between you and the last thing it is caught on ----------
    updateRope(dt) {
      const P = this.p, ch = this.chain;
      this.tight = false;
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
      const pulling = P.stun <= 0 && (P.wx * dx + P.wy * dy) / d > 0.2;
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
          const n = Math.hypot(vx, vy) || 1;
          return { down: true, x: (180 + vx / n * 40) * RES, y: (400 + vy / n * 40) * RES };
        };
      };
      S.registerApi({
        observe: () => ({ t: this.t, down: this.down, hits: this.hits, score: this.score, best: this.bestCombo, chain: this.chain.map((c) => [c.id, c.rings]), giants: this.giants.map((g) => [g.id, g.state, Math.round(g.x), Math.round(g.y), g.chase]) }),
        status: () => ({ state: this.state, score: this.score, time: this.t }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: { intended: ring(), showcase: ring(), wire: (() => { let first = true; return () => {   // test: string a tripwire between the two upper trees, then wait below it
          if (first) { first = false; return { down: true, x: 180 * RES, y: 400 * RES }; }
          const P = self.p, held = self.chain[self.chain.length - 1];
          let vx, vy;
          if (self.wires.length) { vx = 180 - P.x; vy = self.H * 0.52 - P.y; if (Math.hypot(vx, vy) < 6) return { down: true, x: 180 * RES, y: 400 * RES }; }
          else { const c = held && held.kind === 'tree' ? self.trees[1] : self.trees[0], dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1; vx = -dy / d + (40 - d) / 20 * dx / d; vy = dx / d + (40 - d) / 20 * dy / d; }
          const n = Math.hypot(vx, vy) || 1; return { down: true, x: (180 + vx / n * 40) * RES, y: (400 + vy / n * 40) * RES };
        }; })() },
      });
    }

    // ---------- drawing: plain shapes only ----------
    draw() {
      const ctx = this.game.context; if (S.mode === 'bot' || !ctx) return;
      const H = this.H, P = this.p, t = this.t, ch = this.chain, last = ch[ch.length - 1];
      ctx.save(); ctx.setTransform(RES, 0, 0, RES, 0, 0);
      if (this.shake > 0.3) ctx.translate(Math.sin(t * 70) * this.shake * 0.6, Math.cos(t * 53) * this.shake * 0.6);
      ctx.fillStyle = '#23272f'; ctx.fillRect(-10, -10, 380, H + 20);
      ctx.fillStyle = '#2b3039'; for (let y = 20; y < H - 70; y += 40) for (let x = 20; x < 360; x += 40) ctx.fillRect(x, y, 2, 2);
      // the village: three of the houses carry the lamps
      ctx.fillStyle = '#1a1d23'; ctx.fillRect(-10, H - 62, 380, 80);
      for (let i = 0; i < 7; i++) { const x = 18 + i * 50, lamp = [1, 3, 5].indexOf(i), lit = lamp >= 0 && lamp < LAMPS - this.hits; ctx.fillStyle = '#5a6070'; ctx.fillRect(x, H - 46, 26, 22); ctx.fillStyle = '#787f90'; ctx.beginPath(); ctx.moveTo(x - 4, H - 46); ctx.lineTo(x + 13, H - 58); ctx.lineTo(x + 30, H - 46); ctx.fill(); ctx.fillStyle = lit ? '#ffd23a' : '#33373f'; ctx.fillRect(x + 9, H - 39, 8, 8); if (lit) { ctx.fillStyle = 'rgba(255,210,58,0.12)'; ctx.beginPath(); ctx.arc(x + 13, H - 35, 20, 0, TAU); ctx.fill(); } }
      // where the giant on your rope will fall if you pull now
      if (last && last.kind === 'giant' && last.rings >= last.need) {
        const dx = P.x - last.x, dy = P.y - last.y, d = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = 'rgba(255,210,58,0.16)'; ctx.lineWidth = 56; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x - dx / d * 140, last.y - dy / d * 140); ctx.stroke();
      }
      // fallen and falling giants
      this.giants.forEach((g) => { if (g.state !== 'fall' && g.state !== 'down') return; const k = g.state === 'fall' ? Math.min(1, g.ft / 0.38) : 1, len = 140 * k; ctx.globalAlpha = g.state === 'down' ? Math.max(0, Math.min(1, (3.2 - g.ft) / 0.8)) : 1; ctx.strokeStyle = '#6d7482'; ctx.lineWidth = 56; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.dir.x * len, g.y + g.dir.y * len); ctx.stroke(); ctx.strokeStyle = '#8a91a0'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(g.x + g.dir.x * len * 0.75, g.y + g.dir.y * len * 0.75); ctx.lineTo(g.x + g.dir.x * len, g.y + g.dir.y * len); ctx.stroke(); ctx.globalAlpha = 1; });
      // tripwires
      this.wires.forEach((w) => { ctx.strokeStyle = '#fff1b0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(w.a.x, w.a.y); ctx.lineTo(w.b.x, w.b.y); ctx.stroke(); ctx.strokeStyle = 'rgba(255,241,176,0.25)'; ctx.lineWidth = 8; ctx.stroke(); });
      // trees: with a rope on one tree, the others pulse to show where the other end can go
      const treeHeld = last && last.kind === 'tree';
      this.trees.forEach((c) => { if (treeHeld && c !== last) { ctx.strokeStyle = `rgba(255,210,58,${0.35 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(c.x, c.y, 30 + Math.sin(t * 6) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]); } });
      this.trees.forEach((c) => { ctx.fillStyle = '#35503d'; ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, TAU); ctx.fill(); ctx.fillStyle = '#6b5a45'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); });
      // standing giants: where the next foot will land, the feet, the body, the head (shows where it is going)
      this.giants.forEach((g) => {
        if (g.state !== 'walk' && g.state !== 'lean') return;
        const lean = g.state === 'lean' ? g.ft / 0.16 : 0, ox = g.dir.x * lean * 10, oy = g.dir.y * lean * 10, sr = g.big ? 31 : 26, sc = g.big ? 1.25 : 1, rot = Math.atan2(g.hy, g.hx) - Math.PI / 2;
        if (g.state === 'walk') { ctx.strokeStyle = `rgba(255,110,90,${0.35 + 0.55 * g.st})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.landX, g.landY, sr + 10 * (1 - g.st), 0, TAU); ctx.stroke(); ctx.fillStyle = `rgba(255,110,90,${0.06 + 0.16 * g.st})`; ctx.beginPath(); ctx.arc(g.landX, g.landY, sr, 0, TAU); ctx.fill(); }
        g.feet.forEach((q, i) => { const up = g.state === 'walk' && i === g.foot ? Math.sin(Math.min(1, g.st) * Math.PI) : 0; ctx.fillStyle = up > 0.05 ? '#9aa1b0' : '#7d8493'; ctx.beginPath(); ctx.ellipse(q.x, q.y, (12 + up * 3) * sc, (17 + up * 4) * sc, rot, 0, TAU); ctx.fill(); });
        ctx.globalAlpha = 0.28; ctx.fillStyle = '#aab1c0'; ctx.beginPath(); ctx.arc(g.x + ox, g.y + oy, 46 * sc, 0, TAU); ctx.fill();
        ctx.globalAlpha = g.chase ? 0.75 : 0.45; ctx.fillStyle = g.chase ? '#ffb0a0' : '#c8cedb'; ctx.beginPath(); ctx.arc(g.x + ox + g.hx * 30 * sc, g.y + oy + g.hy * 30 * sc, 13 * sc, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      });
      // rings: the lap you are running (thin arc) and the rope already caught on the legs (bands)
      this.pegs().forEach((c) => {
        const rr = c.kind === 'tree' ? 26 : 52 * (c.big ? 1.25 : 1);
        for (let k = 0; k < c.rings; k++) { ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 2 + k * 4, 0, TAU); ctx.stroke(); }
        if (c.rings < c.need && Math.abs(c.lap) > 0.15) { ctx.strokeStyle = 'rgba(255,210,58,0.85)'; ctx.lineWidth = 4; const a0 = c.lastAng !== null ? c.lastAng - c.lap : 0; ctx.beginPath(); ctx.arc(c.x, c.y, rr, a0, a0 + c.lap, c.lap < 0); ctx.stroke(); }
        if (c.kind === 'giant' && c.need > 1) { ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText(`${c.rings}/2`, c.x, c.y - 66); }
      });
      // the rope
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (ch.length) {
        ctx.strokeStyle = '#e2c477'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ch[0].x, ch[0].y); for (let i = 1; i < ch.length; i++) ctx.lineTo(ch[i].x, ch[i].y); ctx.stroke();
        const dx = P.x - last.x, dy = P.y - last.y, d = Math.hypot(dx, dy) || 1, leash = last.kind === 'tree' ? TREE_LEASH : LEASH + (last.big ? 10 : 0), slack = clamp(1 - d / leash, 0, 1);
        ctx.strokeStyle = this.tight ? '#fff6c8' : '#e2c477'; ctx.lineWidth = this.tight ? 3 : 2; ctx.beginPath(); ctx.moveTo(last.x + dx / d * last.r, last.y + dy / d * last.r);
        ctx.quadraticCurveTo((last.x + P.x) / 2 - dy / d * slack * 34, (last.y + P.y) / 2 + dx / d * slack * 34, P.x, P.y); ctx.stroke();
        if (last.kind === 'giant' && last.rings >= last.need && !this.tight) { ctx.strokeStyle = 'rgba(255,246,200,0.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(last.x, last.y, leash, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      } else if (this.trail.length > 1) {
        ctx.strokeStyle = '#b89a5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y); this.trail.forEach((q) => ctx.lineTo(q.x, q.y)); ctx.stroke();
      }
      // you
      ctx.fillStyle = P.stun > 0 ? '#ff7a6a' : '#ffffff'; ctx.beginPath(); ctx.ellipse(P.x, P.y, P.stun > 0 ? 9 : 6.5, P.stun > 0 ? 4 : 6.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#11141a'; ctx.lineWidth = 1.5; ctx.stroke();
      if (last && last.kind === 'giant' && last.rings >= last.need) { ctx.fillStyle = '#fff1b0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('RUN AWAY TO PULL', P.x, P.y - 14); }
      if (treeHeld) { ctx.fillStyle = '#fff1b0'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('RING ANOTHER TREE: TRIPWIRE', clamp(P.x, 96, 264), P.y - 26); ctx.fillText('OR RING A GIANT: TIED TO THE TREE', clamp(P.x, 112, 248), P.y - 14); }
      // thumb stick
      if (this.stick) { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.stick.x, this.stick.y, 34, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(this.stick.x + P.wx * 34, this.stick.y + P.wy * 34, 10, 0, TAU); ctx.fill(); }
      // words
      ctx.setTransform(RES, 0, 0, RES, 0, 0); ctx.textAlign = 'center';
      ctx.fillStyle = '#8b93a5'; ctx.font = '10px monospace'; ctx.fillText('GREY TOY 4 - NO ART YET', 180, 16);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace'; ctx.fillText(`GIANTS ${this.down}/${NIGHT.length}`, 76, 38); ctx.fillText(`SCORE ${this.score}`, 284, 38);
      for (let i = 0; i < LAMPS; i++) { ctx.fillStyle = i < LAMPS - this.hits ? '#ffd23a' : '#3a3f4a'; ctx.fillRect(160 + i * 16, 27, 10, 12); }
      if (this.t < 18 && this.state === 'playing') { ctx.fillStyle = '#e2c477'; ctx.font = '11px monospace'; ctx.fillText('DRAG TO RUN, OR USE THE ARROW KEYS / WASD', 180, H - 122); ctx.fillText('RUN A RING ROUND A GIANT, THEN RUN AWAY', 180, H - 108); ctx.fillText('IT FALLS AWAY FROM YOU - ONTO THE OTHERS', 180, H - 94); ctx.fillText('RING TWO TREES TO STRING A TRIPWIRE', 180, H - 80); }
      if (this.msg && this.state === 'playing') { ctx.fillStyle = this.msg.col; ctx.font = 'bold 18px monospace'; ctx.fillText(this.msg.str, 180, 76); }
      if (this.state !== 'playing') {
        ctx.fillStyle = `rgba(10,12,16,${Math.min(0.7, this.endT)})`; ctx.fillRect(0, 0, 360, H);
        const won = this.state === 'won';
        ctx.fillStyle = won ? '#ffd23a' : '#ff7a6a'; ctx.font = 'bold 22px monospace'; ctx.fillText(won ? 'DAWN. VILLAGE SAVED' : 'THE VILLAGE WENT DARK', 180, H * 0.36);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px monospace'; ctx.fillText(`SCORE ${this.score}`, 180, H * 0.36 + 34);
        ctx.font = '12px monospace'; ctx.fillStyle = '#c8cedb'; ctx.fillText(`GIANTS DOWN ${this.down}/${NIGHT.length}   LAMPS LEFT ${Math.max(0, LAMPS - this.hits)}`, 180, H * 0.36 + 58); ctx.fillText(`BEST PULL: ${this.bestCombo} AT ONCE`, 180, H * 0.36 + 78);
        if (this.endT > 1.2 && Math.sin(t * 4) > -0.3) { ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace'; ctx.fillText('TAP OR PRESS ENTER TO PLAY AGAIN', 180, H * 0.36 + 120); }
      }
      ctx.restore();
    }
  }

  S.createGame({ smooth: true, width: 360, height: 640, res: RES, scenes: [Toy], backgroundColor: '#23272f' });
})();
