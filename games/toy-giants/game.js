// GREY-BOX TOY: rope and giants. Plain shapes, no art, no real goal.
// The only question this toy answers: is running a rope round a giant's legs fun in the hand?
// Rope model: a fixed length of rope trails behind you. Where it touches a tree or a giant's legs it wraps.
// Wraps use up rope, the loose end gets reeled in to the first thing it is wound on, and enough turns hold by friction.
(function () {
  'use strict';
  const S = window.Studio, RES = 2, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ROPE = 470, SPEED = 178, RLEG = 22, NEED = 2, HOLD = 0.75;

  S.defineSfx('step', [{ type: 'sine', f0: 70, f1: 40, at: 0, dur: 0.16, vol: 0.2 }]);
  S.defineSfx('turn', [{ type: 'triangle', f0: 520, f1: 780, at: 0, dur: 0.09, vol: 0.12 }]);
  S.defineSfx('taut', [{ type: 'square', f0: 150, f1: 120, at: 0, dur: 0.06, vol: 0.05 }]);
  S.defineSfx('wobble', [{ type: 'sawtooth', f0: 120, f1: 220, at: 0, dur: 0.45, vol: 0.08 }]);
  S.defineSfx('crash', [{ type: 'noise', at: 0, dur: 0.5, vol: 0.3 }, { type: 'sine', f0: 90, f1: 30, at: 0, dur: 0.6, vol: 0.4 }]);
  S.defineSfx('squash', [{ type: 'square', f0: 300, f1: 80, at: 0, dur: 0.2, vol: 0.14 }]);

  let current = null;

  class Toy extends Phaser.Scene {
    constructor() { super('toy'); }

    create() {
      current = this;
      this.H = S.view.height;
      if (!window.__tgHooked) { window.__tgHooked = true; this.game.events.on('postrender', () => current && current.draw()); }
      this.rand = S.rng(S.seed);
      this.t = 0;
      this.p = { x: 180, y: this.H - 190, stun: 0, wx: 0, wy: 0 };
      this.tail = { x: 180, y: this.H - 130 };
      this.wraps = [];           // { peg, sign, theta, ang } in order from the loose end to the player
      this.taut = false; this.pulling = false; this.tautSfx = 0;
      this.trees = [[62, 0.33], [300, 0.43], [118, 0.6], [252, 0.73]].map(([x, k], i) => ({ kind: 'tree', id: 't' + i, x, y: Math.round(this.H * k), r: 11, cool: 0 }));
      this.giants = []; this.spawnT = 0.6; this.gid = 0;
      this.down = 0; this.hits = 0; this.best = 0; this.shake = 0; this.stick = null; this.msg = null;
      this.registerTools();
      S.bindInput(this);
    }

    spawn() {
      let x = 70 + this.rand() * 220;
      if (this.giants.some((g) => Math.abs(g.x - x) < 80 && g.y < 80)) x = (x + 150) % 220 + 70;
      const y = -30, big = this.gid % 4 === 3, sp = big ? 19 : 15;
      const g = { kind: 'giant', id: 'g' + (this.gid++), x, y, big, need: big ? 3 : NEED, sp, r: big ? 27 : RLEG, cool: 0, state: 'walk', foot: this.rand() < 0.5 ? 0 : 1, st: 0, feet: [{ x: x - sp, y }, { x: x + sp, y: y - 16 }], stress: 0, ft: 0, dir: { x: 0, y: 1 } };
      this.aim(g); this.giants.push(g);
    }

    // a giant lifts a foot and picks where it will come down: straight ahead, or on you if you are close
    aim(g) {
      const f = g.feet[g.foot], P = this.p, hx = g.x + (g.foot ? g.sp : -g.sp), hy = f.y + 34;
      g.fromX = f.x; g.fromY = f.y; g.landX = hx; g.landY = hy;
      if (P.stun <= 0 && Math.hypot(P.x - hx, P.y - hy) < 78) { g.landX = hx + clamp(P.x - hx, -24, 24); g.landY = hy + clamp(P.y - hy, -20, 16); }
    }

    // ---------- per frame ----------
    update(time, delta) {
      const dt = Math.min(delta / 1000, 1 / 30), P = this.p;
      S.input.update();
      this.t += dt; this.shake = Math.max(0, this.shake - dt * 14); this.tautSfx -= dt;
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      // floating stick: where the thumb lands is the centre
      let wx = 0, wy = 0;
      if (S.input.pressed || (S.input.down && !this.stick)) this.stick = { x: S.input.x / RES, y: S.input.y / RES };
      if (!S.input.down) this.stick = null;
      if (this.stick) { const dx = S.input.x / RES - this.stick.x, dy = S.input.y / RES - this.stick.y, d = Math.hypot(dx, dy); if (d > 4) { const k = Math.min(1, d / 34) / d; wx = dx * k; wy = dy * k; } }
      P.wx = wx; P.wy = wy;
      if (P.stun > 0) P.stun -= dt;
      else { P.x = clamp(P.x + wx * SPEED * dt, 8, 352); P.y = clamp(P.y + wy * SPEED * dt, 60, this.H - 70); }
      // giants walk, one foot at a time
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.giants.filter((g) => g.state === 'walk' || g.state === 'wobble').length < 3) { this.spawn(); this.spawnT = Math.max(4, 7 - this.t * 0.03); }
      this.giants.forEach((g) => this.updateGiant(g, dt));
      this.giants = this.giants.filter((g) => !g.gone);
      // you cannot stand inside a tree or between a giant's legs
      this.pegs().forEach((c) => { const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1, m = c.r + 7; if (d < m) { P.x = c.x + dx / d * m; P.y = c.y + dy / d * m; } c.cool -= dt; });
      this.updateRope(dt);
      this.updateTension(dt);
    }

    pegs() { return this.trees.concat(this.giants.filter((g) => g.state === 'walk' || g.state === 'wobble')); }
    turnsOn(g) { return this.wraps.reduce((s, w) => s + (w.peg === g ? Math.max(0, w.theta) : 0), 0) / TAU; }

    updateGiant(g, dt) {
      const P = this.p;
      if (g.state === 'walk') {
        const tied = this.turnsOn(g) >= g.need;
        g.st += dt / (g.big ? 1.0 : 0.85);
        const f = g.feet[g.foot], k = Math.min(1, g.st), e = k * k * (3 - 2 * k);
        f.x = g.fromX + (g.landX - g.fromX) * e; f.y = g.fromY + (g.landY - g.fromY) * e;
        if (g.st >= 1) {
          g.st = 0; g.foot = 1 - g.foot; this.aim(g);
          if (f.y > 0) { S.sfx('step', 0.9 + this.rand() * 0.2); this.shake = Math.max(this.shake, 1.2); }
          if (P.stun <= 0 && Math.hypot(P.x - f.x, P.y - f.y) < (g.big ? 31 : 26)) this.squash(f);
          if (tied) { g.state = 'wobble'; g.ft = 0; S.sfx('wobble'); }
        }
        g.y = (g.feet[0].y + g.feet[1].y) / 2;
        if (g.y > this.H - 96) { g.gone = true; this.dropWraps(g); this.hits += 1; this.shake = 5; S.sfx('crash', 1.3); this.say('IT REACHED THE VILLAGE', '#ff7a6a'); }
      } else if (g.state === 'wobble') {
        g.ft += dt;
        const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1; g.dir = { x: dx / d, y: dy / d };
        if (g.ft > 0.55) this.topple(g, g.dir);
      } else if (g.state === 'fall') {
        g.ft += dt;
        if (g.ft >= 0.38) {
          g.state = 'down'; g.ft = 0; this.shake = 7; S.sfx('crash'); this.down += 1;
          const hit = (q) => { const rx = q.x - g.x, ry = q.y - g.y, along = rx * g.dir.x + ry * g.dir.y, side = Math.abs(rx * g.dir.y - ry * g.dir.x); return along > 10 && along < 150 && side < 34; };
          let chain = 0;
          this.giants.forEach((o) => { if (o !== g && (o.state === 'walk' || o.state === 'wobble') && hit(o)) { this.topple(o, g.dir); chain += 1; } });
          if (chain) this.say(chain > 1 ? 'TRIPLE!' : 'TWO IN ONE!', '#ffd23a');
          if (P.stun <= 0 && hit(P)) this.squash({ x: P.x - g.dir.y * 20, y: P.y + g.dir.x * 20 });
        }
      } else if (g.state === 'down') { g.ft += dt; if (g.ft > 3.2) g.gone = true; }
    }

    topple(g, dir) { g.state = 'fall'; g.ft = 0; g.dir = { x: dir.x, y: dir.y }; this.dropWraps(g); this.coil(); }
    dropWraps(g) { this.wraps = this.wraps.filter((w) => w.peg !== g); }
    coil() { this.wraps = []; this.tail = { x: this.p.x, y: this.p.y }; this.taut = false; }
    squash(from) {
      const P = this.p, dx = P.x - from.x, dy = P.y - from.y, d = Math.hypot(dx, dy) || 1;
      P.stun = 0.9; P.x = clamp(P.x + dx / d * 26, 8, 352); P.y = clamp(P.y + dy / d * 26, 60, this.H - 70);
      this.coil(); this.shake = Math.max(this.shake, 4); S.sfx('squash'); this.say('SQUASHED', '#ff7a6a');
    }
    say(str, col) { this.msg = { str, col, t: 1.4 }; }

    // ---------- the rope ----------
    pathLen() {
      let len = 0, prev = this.tail;
      for (const w of this.wraps) { len += Math.hypot(w.peg.x - prev.x, w.peg.y - prev.y) + w.peg.r * Math.max(0, w.theta); prev = w.peg; }
      return len + Math.hypot(this.p.x - prev.x, this.p.y - prev.y);
    }

    updateRope() {
      const P = this.p;
      // the last wrap winds or unwinds as you move round it
      for (let guard = 0; guard < 4 && this.wraps.length; guard++) {
        const w = this.wraps[this.wraps.length - 1], c = w.peg, a = Math.atan2(P.y - c.y, P.x - c.x);
        let d = a - w.ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const before = Math.floor(Math.max(0, w.theta) / TAU);
        w.theta += d * w.sign; w.ang = a;
        if (Math.floor(Math.max(0, w.theta) / TAU) > before) S.sfx('turn', 1 + before * 0.25);
        if (w.theta < -0.03) { this.wraps.pop(); c.cool = 0.2; const n = this.wraps[this.wraps.length - 1]; if (n) n.ang = Math.atan2(P.y - n.peg.y, P.x - n.peg.x); } else break;
      }
      // a new wrap starts where the free stretch of rope touches a tree or a giant
      const last = this.wraps[this.wraps.length - 1], O = last ? last.peg : this.tail;
      const sx = P.x - O.x, sy = P.y - O.y, sl = sx * sx + sy * sy;
      if (sl > 1) for (const c of this.pegs()) {
        if ((last && c === last.peg) || c.cool > 0) continue;
        const t = ((c.x - O.x) * sx + (c.y - O.y) * sy) / sl; if (t < 0.04 || t > 0.96) continue;
        const d = Math.hypot(O.x + sx * t - c.x, O.y + sy * t - c.y); if (d >= c.r) continue;
        if (Math.hypot(O.x - c.x, O.y - c.y) < c.r + 4) continue;
        const cross = sx * (c.y - O.y) - sy * (c.x - O.x);
        this.wraps.push({ peg: c, sign: cross < 0 ? -1 : 1, theta: 0, ang: Math.atan2(P.y - c.y, P.x - c.x) });
        break;
      }
      // too little rope: first the loose end is reeled in; then either the wraps slip, or they hold and you are stopped
      let ex = this.pathLen() - ROPE; this.taut = false;
      for (let k = 0; k < 4 && ex > 0.01; k++) {
        const first = this.wraps[0], tgt = first ? first.peg : P, dx = tgt.x - this.tail.x, dy = tgt.y - this.tail.y, d = Math.hypot(dx, dy) || 1;
        const mv = Math.min(ex, Math.max(0, d - (first ? first.peg.r + 3 : 0)));
        this.tail.x += dx / d * mv; this.tail.y += dy / d * mv; ex -= mv;
        if (ex <= 0.01 || !first) break;
        const hold = this.wraps.reduce((s, w) => s + Math.max(0, w.theta), 0) / TAU;
        if (hold >= HOLD) {
          const c = this.wraps[this.wraps.length - 1].peg, px = P.x - c.x, py = P.y - c.y, pd = Math.hypot(px, py) || 1, nd = Math.max(c.r + 7, pd - ex);
          P.x = c.x + px / pd * nd; P.y = c.y + py / pd * nd; this.taut = true; break;
        }
        const un = Math.min(Math.max(0, first.theta), ex / first.peg.r); first.theta -= un; ex -= un * first.peg.r;
        if (first.theta <= 0.001) { this.wraps.shift(); if (this.wraps.length === 0) break; }
      }
    }

    // a taut rope that you pull on brings a giant down; two full turns round the legs trip it by themselves
    updateTension(dt) {
      const P = this.p, last = this.wraps[this.wraps.length - 1];
      this.pulling = !!(this.taut && last && (P.wx * (P.x - last.peg.x) + P.wy * (P.y - last.peg.y)) > 0.15);
      if (this.pulling && this.tautSfx <= 0) { S.sfx('taut', 0.8 + this.rand() * 0.5); this.tautSfx = 0.12; }
      const total = this.wraps.reduce((s, w) => s + Math.max(0, w.theta), 0) / TAU;
      this.giants.forEach((g) => {
        if (g.state !== 'walk') return;
        const inRope = this.wraps.some((w) => w.peg === g), turns = this.turnsOn(g), other = total - turns;
        let rate = 0;
        if (this.pulling && inRope) rate = 1.5 * turns + (other >= HOLD ? 2.2 : 0);
        if (rate > 0.3) g.stress += rate * dt; else g.stress = Math.max(0, g.stress - dt * 1.5);
        if (g.stress >= 1) { const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1; S.sfx('wobble', 1.4); this.topple(g, { x: dx / d, y: dy / d }); }
      });
    }

    // ---------- test bot: runs rings round the nearest giant ----------
    registerTools() {
      const self = this;
      const ring = () => {
        let first = true;
        return () => {
          if (first) { first = false; return { down: true, x: 180 * RES, y: 400 * RES }; }
          const P = self.p, gs = self.giants.filter((g) => g.state === 'walk' && g.y > 40);
          let vx = 0, vy = 0;
          if (gs.length) {
            const g = gs.reduce((a, b) => (Math.hypot(a.x - P.x, a.y - P.y) < Math.hypot(b.x - P.x, b.y - P.y) ? a : b));
            const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1, want = 58;
            vx = -dy / d + (want - d) / 30 * dx / d; vy = dx / d + (want - d) / 30 * dy / d;
          } else { vx = 180 - P.x; vy = self.H * 0.55 - P.y; }
          const n = Math.hypot(vx, vy) || 1;
          return { down: true, x: (180 + vx / n * 40) * RES, y: (400 + vy / n * 40) * RES };
        };
      };
      S.registerApi({
        observe: () => ({ t: this.t, down: this.down, hits: this.hits, wraps: this.wraps.map((w) => [w.peg.id, +(w.theta / TAU).toFixed(2)]), taut: this.taut, giants: this.giants.map((g) => [g.id, g.state, Math.round(g.x), Math.round(g.y)]) }),
        status: () => ({ state: 'playing', score: this.down, time: this.t }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: { intended: ring(), showcase: ring() },
      });
    }

    // ---------- drawing: plain shapes only ----------
    draw() {
      const ctx = this.game.context; if (S.mode === 'bot' || !ctx) return;
      const H = this.H, P = this.p, t = this.t;
      ctx.save(); ctx.setTransform(RES, 0, 0, RES, 0, 0);
      if (this.shake > 0.3) ctx.translate(Math.sin(t * 70) * this.shake * 0.6, Math.cos(t * 53) * this.shake * 0.6);
      ctx.fillStyle = '#23272f'; ctx.fillRect(-10, -10, 380, H + 20);
      ctx.fillStyle = '#2b3039'; for (let y = 20; y < H - 70; y += 40) for (let x = 20; x < 360; x += 40) ctx.fillRect(x, y, 2, 2);
      // the village
      ctx.fillStyle = '#1a1d23'; ctx.fillRect(-10, H - 62, 380, 80);
      for (let i = 0; i < 7; i++) { const x = 18 + i * 50; ctx.fillStyle = '#5a6070'; ctx.fillRect(x, H - 46, 26, 22); ctx.fillStyle = '#787f90'; ctx.beginPath(); ctx.moveTo(x - 4, H - 46); ctx.lineTo(x + 13, H - 58); ctx.lineTo(x + 30, H - 46); ctx.fill(); ctx.fillStyle = '#ffd23a'; ctx.fillRect(x + 10, H - 38, 6, 6); }
      // fallen giants
      this.giants.forEach((g) => { if (g.state !== 'fall' && g.state !== 'down') return; const k = g.state === 'fall' ? Math.min(1, g.ft / 0.38) : 1, len = 140 * k; ctx.globalAlpha = g.state === 'down' ? Math.max(0, Math.min(1, (3.2 - g.ft) / 0.8)) : 1; ctx.strokeStyle = '#6d7482'; ctx.lineWidth = 56; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.dir.x * len, g.y + g.dir.y * len); ctx.stroke(); ctx.strokeStyle = '#8a91a0'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(g.x + g.dir.x * len * 0.75, g.y + g.dir.y * len * 0.75); ctx.lineTo(g.x + g.dir.x * len, g.y + g.dir.y * len); ctx.stroke(); ctx.globalAlpha = 1; });
      // trees
      this.trees.forEach((c) => { ctx.fillStyle = '#35503d'; ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, TAU); ctx.fill(); ctx.fillStyle = '#6b5a45'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); });
      // standing giants: where the next foot will land, the feet, the body
      this.giants.forEach((g) => {
        if (g.state !== 'walk' && g.state !== 'wobble') return;
        const wob = g.state === 'wobble' ? Math.sin(t * 40) * 4 : 0, sr = g.big ? 31 : 26, sc = g.big ? 1.25 : 1;
        if (g.state === 'walk') { ctx.strokeStyle = `rgba(255,110,90,${0.35 + 0.55 * g.st})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.landX, g.landY, sr + 10 * (1 - g.st), 0, TAU); ctx.stroke(); ctx.fillStyle = `rgba(255,110,90,${0.06 + 0.16 * g.st})`; ctx.beginPath(); ctx.arc(g.landX, g.landY, sr, 0, TAU); ctx.fill(); }
        g.feet.forEach((q, i) => { const up = g.state === 'walk' && i === g.foot ? Math.sin(Math.min(1, g.st) * Math.PI) : 0; ctx.fillStyle = up > 0.05 ? '#9aa1b0' : '#7d8493'; ctx.beginPath(); ctx.ellipse(q.x + wob, q.y, (13 + up * 3) * sc, (17 + up * 4) * sc, 0, 0, TAU); ctx.fill(); });
        ctx.globalAlpha = 0.28; ctx.fillStyle = '#aab1c0'; ctx.beginPath(); ctx.arc(g.x + wob, g.y - 4, 46 * sc, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#4a505c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(g.x + wob, g.y, g.r, 0, TAU); ctx.stroke();
        const turns = this.turnsOn(g);
        if (turns > 0.02) { ctx.strokeStyle = turns >= g.need ? '#ff7a6a' : '#ffd23a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(g.x + wob, g.y, 52 * sc, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, turns / g.need)); ctx.stroke(); }
        if (g.stress > 0.02) { ctx.strokeStyle = '#ff7a6a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(g.x + wob, g.y, 58 * sc, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, g.stress)); ctx.stroke(); }
      });
      // the rope
      ctx.strokeStyle = this.taut ? '#fff1b0' : '#e2c477'; ctx.lineWidth = this.taut ? 2.4 : 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(this.tail.x, this.tail.y);
      this.wraps.forEach((w, i) => {
        const c = w.peg, nx = this.wraps[i + 1] ? this.wraps[i + 1].peg : P, a = Math.atan2(nx.y - c.y, nx.x - c.x), d = Math.hypot(nx.x - c.x, nx.y - c.y) || 1;
        const exit = a - w.sign * Math.acos(clamp(c.r / d, -1, 1)), th = Math.max(0, w.theta), entry = exit - w.sign * th;
        ctx.lineTo(c.x + Math.cos(entry) * c.r, c.y + Math.sin(entry) * c.r);
        ctx.arc(c.x, c.y, c.r, entry, exit, w.sign < 0);
        for (let k = 1; k <= Math.floor(th / TAU); k++) { ctx.moveTo(c.x + c.r + k * 2.5, c.y); ctx.arc(c.x, c.y, c.r + k * 2.5, 0, TAU); ctx.moveTo(c.x + Math.cos(exit) * c.r, c.y + Math.sin(exit) * c.r); }
      });
      ctx.lineTo(P.x, P.y); ctx.stroke();
      ctx.fillStyle = '#e2c477'; ctx.fillRect(this.tail.x - 3, this.tail.y - 3, 6, 6);
      // you
      ctx.fillStyle = P.stun > 0 ? '#ff7a6a' : '#ffffff'; ctx.beginPath(); ctx.ellipse(P.x, P.y, P.stun > 0 ? 9 : 6.5, P.stun > 0 ? 4 : 6.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#11141a'; ctx.lineWidth = 1.5; ctx.stroke();
      if (this.pulling) { ctx.fillStyle = '#fff1b0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('PULL!', P.x, P.y - 14); }
      // thumb stick
      if (this.stick) { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.stick.x, this.stick.y, 34, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(this.stick.x + P.wx * 34, this.stick.y + P.wy * 34, 10, 0, TAU); ctx.fill(); }
      // words
      ctx.setTransform(RES, 0, 0, RES, 0, 0); ctx.textAlign = 'center';
      ctx.fillStyle = '#8b93a5'; ctx.font = '10px monospace'; ctx.fillText('GREY TOY - NO ART YET', 180, 16);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace'; ctx.fillText(`GIANTS DOWN ${this.down}`, 110, 38);
      ctx.fillStyle = this.hits ? '#ff7a6a' : '#8b93a5'; ctx.fillText(`GOT THROUGH ${this.hits}`, 262, 38);
      if (this.t < 14) { ctx.fillStyle = '#e2c477'; ctx.font = '11px monospace'; ctx.fillText('DRAG ANYWHERE TO RUN', 180, H - 108); ctx.fillText('RUN TWO RINGS ROUND A GIANT (BIG ONES: THREE)', 180, H - 94); ctx.fillText('OR ONE RING, THEN RUN AWAY AND PULL', 180, H - 80); }
      if (this.msg) { ctx.fillStyle = this.msg.col; ctx.font = 'bold 18px monospace'; ctx.fillText(this.msg.str, 180, 76); }
      ctx.restore();
    }
  }

  S.createGame({ smooth: true, width: 360, height: 640, res: RES, scenes: [Toy], backgroundColor: '#23272f' });
})();
