// GREY-BOX TOY: rope and giants, version 2. Plain shapes, no art, no real goal.
// One rule for bringing a giant down:
//   1. Run a full ring round its legs: the rope catches (a band shows on the legs). Big giants need two rings.
//   2. Run away. When the rope goes tight the legs are pulled from under it and it falls AWAY from you.
// Extras that follow from the same rule: ring a second giant before you pull and both go down;
// ring a tree first and a giant tied to it trips by itself when it walks on.
(function () {
  'use strict';
  const S = window.Studio, RES = 2, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SPEED = 178, LEASH = 112, TREE_LEASH = 240, TREE_LINK = 150;

  S.defineSfx('step', [{ type: 'sine', f0: 70, f1: 40, at: 0, dur: 0.16, vol: 0.2 }]);
  S.defineSfx('catch', [{ type: 'triangle', f0: 520, f1: 780, at: 0, dur: 0.08, vol: 0.14 }, { type: 'triangle', f0: 780, f1: 1040, at: 0.08, dur: 0.1, vol: 0.12 }]);
  S.defineSfx('tight', [{ type: 'square', f0: 140, f1: 260, at: 0, dur: 0.14, vol: 0.07 }]);
  S.defineSfx('slip', [{ type: 'sine', f0: 500, f1: 200, at: 0, dur: 0.18, vol: 0.08 }]);
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
      this.trail = [];            // the loose rope dragging behind you (only for show)
      this.chain = [];            // what the rope is caught on, in order; the last one is on your end of the rope
      this.slipT = 0; this.tight = false;
      this.trees = [[62, 0.33], [300, 0.43], [118, 0.6], [252, 0.73]].map(([x, k], i) => ({ kind: 'tree', id: 't' + i, x, y: Math.round(this.H * k), r: 11, need: 1, rings: 0, lap: 0, lastAng: null }));
      this.giants = []; this.spawnT = 0.6; this.gid = 0;
      this.down = 0; this.hits = 0; this.shake = 0; this.stick = null; this.msg = null;
      this.registerTools();
      S.bindInput(this);
    }

    spawn() {
      let x = 70 + this.rand() * 220;
      if (this.giants.some((g) => Math.abs(g.x - x) < 80 && g.y < 80)) x = (x + 150) % 220 + 70;
      const y = -30, big = this.gid % 4 === 3, sp = big ? 19 : 15;
      const g = { kind: 'giant', id: 'g' + (this.gid++), x, y, big, need: big ? 2 : 1, sp, r: big ? 27 : 22, rings: 0, lap: 0, lastAng: null, state: 'walk', foot: this.rand() < 0.5 ? 0 : 1, st: 0, feet: [{ x: x - sp, y }, { x: x + sp, y: y - 16 }], ft: 0, dir: { x: 0, y: 1 } };
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
      this.t += dt; this.shake = Math.max(0, this.shake - dt * 14);
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      // floating stick: where the thumb lands is the centre
      let wx = 0, wy = 0;
      if (S.input.pressed || (S.input.down && !this.stick)) this.stick = { x: S.input.x / RES, y: S.input.y / RES };
      if (!S.input.down) this.stick = null;
      if (this.stick) { const dx = S.input.x / RES - this.stick.x, dy = S.input.y / RES - this.stick.y, d = Math.hypot(dx, dy); if (d > 4) { const k = Math.min(1, d / 34) / d; wx = dx * k; wy = dy * k; } }
      P.wx = wx; P.wy = wy;
      if (P.stun > 0) P.stun -= dt;
      else { const ox = P.x, oy = P.y; P.x = clamp(P.x + wx * SPEED * dt, 8, 352); P.y = clamp(P.y + wy * SPEED * dt, 60, this.H - 70); if (Math.hypot(P.x - ox, P.y - oy) > 0.2) this.dragTrail(); }
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.giants.filter((g) => g.state === 'walk').length < 3) { this.spawn(); this.spawnT = Math.max(4, 7 - this.t * 0.03); }
      this.giants.forEach((g) => this.updateGiant(g, dt));
      this.giants = this.giants.filter((g) => !g.gone);
      // you cannot stand inside a tree or between a giant's legs
      this.pegs().forEach((c) => { const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1, m = c.r + 7; if (d < m) { P.x = c.x + dx / d * m; P.y = c.y + dy / d * m; } });
      this.updateRings();
      this.updateRope(dt);
    }

    pegs() { return this.trees.concat(this.giants.filter((g) => g.state === 'walk')); }

    dragTrail() {
      const P = this.p, T = this.trail; T.push({ x: P.x, y: P.y });
      let len = 0; for (let i = T.length - 1; i > 0; i--) { len += Math.hypot(T[i].x - T[i - 1].x, T[i].y - T[i - 1].y); if (len > 200) { T.splice(0, i); break; } }
    }

    updateGiant(g, dt) {
      const P = this.p;
      if (g.state === 'walk') {
        g.st += dt / (g.big ? 1.0 : 0.85);
        const f = g.feet[g.foot], k = Math.min(1, g.st), e = k * k * (3 - 2 * k);
        f.x = g.fromX + (g.landX - g.fromX) * e; f.y = g.fromY + (g.landY - g.fromY) * e;
        if (g.st >= 1) {
          g.st = 0; g.foot = 1 - g.foot; this.aim(g);
          if (f.y > 0) { S.sfx('step', 0.9 + this.rand() * 0.2); this.shake = Math.max(this.shake, 1.2); }
          if (P.stun <= 0 && Math.hypot(P.x - f.x, P.y - f.y) < (g.big ? 31 : 26)) this.squash(f);
        }
        g.y = (g.feet[0].y + g.feet[1].y) / 2;
        if (g.y > this.H - 96) { g.gone = true; this.unhook(g); this.hits += 1; this.shake = 5; S.sfx('crash', 1.3); this.say('IT REACHED THE VILLAGE', '#ff7a6a'); }
      } else if (g.state === 'lean') {          // the rope is tight: a short beat before it goes over
        g.ft += dt; if (g.ft > 0.16) { g.state = 'fall'; g.ft = 0; }
      } else if (g.state === 'fall') {
        g.ft += dt;
        if (g.ft >= 0.38) {
          g.state = 'down'; g.ft = 0; this.shake = 7; S.sfx('crash'); this.down += 1;
          const hit = (q) => { const rx = q.x - g.x, ry = q.y - g.y, along = rx * g.dir.x + ry * g.dir.y, side = Math.abs(rx * g.dir.y - ry * g.dir.x); return along > 10 && along < 150 && side < 34; };
          let chain = 0;
          this.giants.forEach((o) => { if (o !== g && o.state === 'walk' && hit(o)) { this.topple(o, g.dir); chain += 1; } });
          if (chain) this.say(chain > 1 ? 'TRIPLE!' : 'TWO IN ONE!', '#ffd23a');
          if (g.y + g.dir.y * 140 > this.H - 58) { this.hits += 1; this.say('IT FELL ON THE VILLAGE', '#ff7a6a'); }
        }
      } else if (g.state === 'down') { g.ft += dt; if (g.ft > 3.2) g.gone = true; }
    }

    topple(g, dir) { g.state = 'lean'; g.ft = 0; g.dir = { x: dir.x, y: dir.y }; this.unhook(g); }
    unhook(c) { c.rings = 0; c.lap = 0; this.chain = this.chain.filter((q) => q !== c); }
    letGo() { this.chain.forEach((c) => { c.rings = 0; c.lap = 0; }); this.chain = []; this.trail = []; this.slipT = 0; this.tight = false; }
    squash(from) {
      const P = this.p, dx = P.x - from.x, dy = P.y - from.y, d = Math.hypot(dx, dy) || 1;
      P.stun = 0.9; P.x = clamp(P.x + dx / d * 26, 8, 352); P.y = clamp(P.y + dy / d * 26, 60, this.H - 70);
      this.pegs().forEach((c) => { c.lap = 0; c.lastAng = null; });
      this.shake = Math.max(this.shake, 4); S.sfx('squash'); this.say('SQUASHED', '#ff7a6a');
    }
    say(str, col) { this.msg = { str, col, t: 1.4 }; }

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
        if (a.kind === 'tree' && b.kind === 'giant' && b.rings >= b.need) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; if (d > TREE_LINK) { S.sfx('tight'); this.topple(b, { x: dx / d, y: dy / d }); this.letGo(); return; } }
      }
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
        if (list.filter((g) => g.kind === 'giant').length > 1) this.say('TIED TOGETHER!', '#ffd23a');
        this.letGo(); return;
      }
      // otherwise the rope holds you; pull against it for a moment and it slips off
      P.x = last.x + dx / d * leash; P.y = last.y + dy / d * leash;
      if (pulling) { this.slipT += dt; if (this.slipT > 0.45) { if (last.kind === 'giant') this.say(last.need > 1 ? 'IT SLIPPED - TWO RINGS' : 'IT SLIPPED', '#ff7a6a'); S.sfx('slip'); this.unhook(last); this.slipT = 0; } } else this.slipT = 0;
    }

    // ---------- test bot: one ring (two for big ones), then run away ----------
    registerTools() {
      const self = this;
      const ring = () => {
        let first = true;
        return () => {
          if (first) { first = false; return { down: true, x: 180 * RES, y: 400 * RES }; }
          const P = self.p, last = self.chain[self.chain.length - 1];
          let vx = 0, vy = 0;
          if (last && last.kind === 'giant' && last.rings >= last.need) { vx = P.x - last.x; vy = P.y - last.y; }
          else {
            const gs = self.giants.filter((g) => g.state === 'walk' && g.y > 40);
            if (gs.length) {
              const g = gs.reduce((a, b) => (Math.hypot(a.x - P.x, a.y - P.y) < Math.hypot(b.x - P.x, b.y - P.y) ? a : b));
              const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1, want = 60;
              vx = -dy / d + (want - d) / 30 * dx / d; vy = dx / d + (want - d) / 30 * dy / d;
            } else { vx = 180 - P.x; vy = self.H * 0.55 - P.y; }
          }
          const n = Math.hypot(vx, vy) || 1;
          return { down: true, x: (180 + vx / n * 40) * RES, y: (400 + vy / n * 40) * RES };
        };
      };
      S.registerApi({
        observe: () => ({ t: this.t, down: this.down, hits: this.hits, chain: this.chain.map((c) => [c.id, c.rings]), tight: this.tight, giants: this.giants.map((g) => [g.id, g.state, Math.round(g.x), Math.round(g.y)]) }),
        status: () => ({ state: 'playing', score: this.down, time: this.t }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: { intended: ring(), showcase: ring() },
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
      // the village
      ctx.fillStyle = '#1a1d23'; ctx.fillRect(-10, H - 62, 380, 80);
      for (let i = 0; i < 7; i++) { const x = 18 + i * 50; ctx.fillStyle = '#5a6070'; ctx.fillRect(x, H - 46, 26, 22); ctx.fillStyle = '#787f90'; ctx.beginPath(); ctx.moveTo(x - 4, H - 46); ctx.lineTo(x + 13, H - 58); ctx.lineTo(x + 30, H - 46); ctx.fill(); ctx.fillStyle = '#ffd23a'; ctx.fillRect(x + 10, H - 38, 6, 6); }
      // where the giant on your rope will fall if you pull now
      if (last && last.kind === 'giant' && last.rings >= last.need) {
        const dx = P.x - last.x, dy = P.y - last.y, d = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = 'rgba(255,210,58,0.16)'; ctx.lineWidth = 56; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x - dx / d * 140, last.y - dy / d * 140); ctx.stroke();
      }
      // fallen and falling giants
      this.giants.forEach((g) => { if (g.state !== 'fall' && g.state !== 'down') return; const k = g.state === 'fall' ? Math.min(1, g.ft / 0.38) : 1, len = 140 * k; ctx.globalAlpha = g.state === 'down' ? Math.max(0, Math.min(1, (3.2 - g.ft) / 0.8)) : 1; ctx.strokeStyle = '#6d7482'; ctx.lineWidth = 56; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.dir.x * len, g.y + g.dir.y * len); ctx.stroke(); ctx.strokeStyle = '#8a91a0'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(g.x + g.dir.x * len * 0.75, g.y + g.dir.y * len * 0.75); ctx.lineTo(g.x + g.dir.x * len, g.y + g.dir.y * len); ctx.stroke(); ctx.globalAlpha = 1; });
      // trees
      this.trees.forEach((c) => { ctx.fillStyle = '#35503d'; ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, TAU); ctx.fill(); ctx.fillStyle = '#6b5a45'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); });
      // standing giants: where the next foot will land, the feet, the body
      this.giants.forEach((g) => {
        if (g.state !== 'walk' && g.state !== 'lean') return;
        const lean = g.state === 'lean' ? g.ft / 0.16 : 0, ox = g.dir.x * lean * 10, oy = g.dir.y * lean * 10, sr = g.big ? 31 : 26, sc = g.big ? 1.25 : 1;
        if (g.state === 'walk') { ctx.strokeStyle = `rgba(255,110,90,${0.35 + 0.55 * g.st})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.landX, g.landY, sr + 10 * (1 - g.st), 0, TAU); ctx.stroke(); ctx.fillStyle = `rgba(255,110,90,${0.06 + 0.16 * g.st})`; ctx.beginPath(); ctx.arc(g.landX, g.landY, sr, 0, TAU); ctx.fill(); }
        g.feet.forEach((q, i) => { const up = g.state === 'walk' && i === g.foot ? Math.sin(Math.min(1, g.st) * Math.PI) : 0; ctx.fillStyle = up > 0.05 ? '#9aa1b0' : '#7d8493'; ctx.beginPath(); ctx.ellipse(q.x, q.y, (13 + up * 3) * sc, (17 + up * 4) * sc, 0, 0, TAU); ctx.fill(); });
        ctx.globalAlpha = 0.28; ctx.fillStyle = '#aab1c0'; ctx.beginPath(); ctx.arc(g.x + ox, g.y - 4 + oy, 46 * sc, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
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
      // thumb stick
      if (this.stick) { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.stick.x, this.stick.y, 34, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(this.stick.x + P.wx * 34, this.stick.y + P.wy * 34, 10, 0, TAU); ctx.fill(); }
      // words
      ctx.setTransform(RES, 0, 0, RES, 0, 0); ctx.textAlign = 'center';
      ctx.fillStyle = '#8b93a5'; ctx.font = '10px monospace'; ctx.fillText('GREY TOY 2 - NO ART YET', 180, 16);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace'; ctx.fillText(`GIANTS DOWN ${this.down}`, 110, 38);
      ctx.fillStyle = this.hits ? '#ff7a6a' : '#8b93a5'; ctx.fillText(`VILLAGE HIT ${this.hits}`, 262, 38);
      if (this.t < 16) { ctx.fillStyle = '#e2c477'; ctx.font = '11px monospace'; ctx.fillText('1. RUN A RING ROUND A GIANT', 180, H - 108); ctx.fillText('2. RUN AWAY: THE ROPE PULLS IT OVER', 180, H - 94); ctx.fillText('IT FALLS AWAY FROM YOU', 180, H - 80); }
      if (this.msg) { ctx.fillStyle = this.msg.col; ctx.font = 'bold 18px monospace'; ctx.fillText(this.msg.str, 180, 76); }
      ctx.restore();
    }
  }

  S.createGame({ smooth: true, width: 360, height: 640, res: RES, scenes: [Toy], backgroundColor: '#23272f' });
})();
