// Red Dot — drag the laser dot to lure every cat into the carrier before the vet appointment.
// Cats have their own minds: they notice (!), chase, pounce when the dot rests, get bored (?), nap (z).
(function () {
  'use strict';
  const S = window.Studio;
  const A = window.RedDotArt;
  const W = S.W;

  const LEVEL_TIME = 75;
  const PERSONALITY = {
    mango: { walk: 16, run: 54, acc: 170, notice: 72, pounceR: 20, focus: 4.5, still: 0.22, pitch: 1.0, stay: 16 },
    smokey: { walk: 20, run: 80, acc: 110, notice: 92, pounceR: 24, focus: 3.2, still: 0.15, pitch: 0.9, overshoot: 8, stay: 9 },
    oreo: { walk: 10, run: 40, acc: 130, notice: 44, pounceR: 18, focus: 6.0, still: 0.35, pitch: 0.75, sleeper: true, stay: 40 },
    pip: { walk: 18, run: 60, acc: 210, notice: 62, pounceR: 18, focus: 2.4, still: 0.18, pitch: 1.35, boxLover: true, stay: 12 },
  };
  const NAMES = ['mango', 'smokey', 'oreo', 'pip'];
  const ENGAGED = ['alert', 'chase', 'stalk', 'pounce', 'bat'];

  // ---------- sounds (synthesized, original) ----------
  S.defineSfx('meow', [{ type: 'square', f0: 520, f1: 760, at: 0, dur: 0.1, vol: 0.1 }, { type: 'square', f0: 760, f1: 400, at: 0.09, dur: 0.22, vol: 0.1 }]);
  S.defineSfx('mrrp', [{ type: 'square', f0: 600, f1: 950, at: 0, dur: 0.08, vol: 0.08 }]);
  S.defineSfx('pounce', [{ type: 'noise', at: 0, dur: 0.1, vol: 0.12 }, { type: 'triangle', f0: 240, f1: 120, at: 0, dur: 0.12, vol: 0.2 }]);
  S.defineSfx('thump', [{ type: 'triangle', f0: 140, f1: 60, at: 0, dur: 0.07, vol: 0.3 }]);
  S.defineSfx('purr', [{ type: 'square', f0: 48, f1: 44, at: 0, dur: 0.45, vol: 0.05 }, { type: 'noise', at: 0, dur: 0.45, vol: 0.03 }]);
  S.defineSfx('hiss', [{ type: 'noise', at: 0, dur: 0.3, vol: 0.18 }]);
  S.defineSfx('crash', [{ type: 'noise', at: 0, dur: 0.45, vol: 0.3 }, { type: 'triangle', f0: 320, f1: 60, at: 0, dur: 0.35, vol: 0.25 }, { type: 'square', f0: 1800, f1: 1400, at: 0.02, dur: 0.06, vol: 0.06 }]);
  S.defineSfx('chime', [{ type: 'square', f0: 880, f1: 880, at: 0, dur: 0.07, vol: 0.1 }, { type: 'square', f0: 1320, f1: 1320, at: 0.07, dur: 0.14, vol: 0.1 }]);
  S.defineSfx('door', [{ type: 'square', f0: 220, f1: 150, at: 0, dur: 0.08, vol: 0.15 }, { type: 'noise', at: 0.05, dur: 0.05, vol: 0.1 }]);
  S.defineSfx('lose', [523, 466, 392, 330].map((f, i) => ({ type: 'triangle', f0: f, f1: f, at: i * 0.14, dur: 0.16, vol: 0.18 })));
  S.defineSfx('clock', [{ type: 'square', f0: 2200, f1: 2200, at: 0, dur: 0.015, vol: 0.06 }]);

  const len = (x, y) => Math.sqrt(x * x + y * y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  class Room extends Phaser.Scene {
    constructor() { super('room'); }

    create() {
      // The room is always 180 x 320 so play is identical everywhere (and in clips).
      // Taller phones see more wall above the window; the camera scrolls up to show it.
      const fullH = this.scale.height;
      const extra = fullH - 320;
      this.H = 320;
      this.extra = extra;
      this.B = 0;
      const B = 0;
      const H = 320;
      this.cameras.main.setScroll(0, -extra);
      this.rand = S.rng(S.seed);
      A.buildRoom(this, H, fullH);
      A.buildIcons(this);
      NAMES.forEach((n) => A.buildCatSheet(this, `cat_${n}`, A.COATS[n]));
      if (!this.textures.exists('shadow')) {
        S.sprite(this, 'shadow', ['..000000..', '.00000000.', '0000000000', '.00000000.', '..000000..']);
      }

      this.add.image(0, 0, 'room').setOrigin(0).setDepth(-1000);
      if (extra > 0) this.add.image(0, -extra, 'wallTop').setOrigin(0).setDepth(-1000);
      // furniture: each placed by its own footprint, depth-sorted by its base
      this.carrier = { x: 65, y: 274 + B, w: 50, h: 40 };
      const c = this.carrier;
      this.obstacles = [
        { x: 4, y: 84, w: 44, h: 62 }, // sofa
        { x: 130, y: 34, w: 46, h: 20 }, // shelf
        { x: 142, y: 152, w: 34, h: 18 }, // side table top
        { x: 9, y: 261, w: 12, h: 12 }, // plant pot
        { x: c.x, y: c.y + 2, w: 7, h: c.h - 2 }, // carrier left wall
        { x: c.x + c.w - 7, y: c.y + 2, w: 7, h: c.h - 2 }, // carrier right wall
        { x: c.x, y: c.y + c.h - 8, w: c.w, h: 8 }, // carrier front lip
      ];
      this.add.image(4, 84, 'sofa').setOrigin(0).setDepth(146);
      this.add.image(130, 34, 'shelf').setOrigin(0).setDepth(54);
      this.add.image(142, 146, 'table').setOrigin(0).setDepth(170);
      this.vase = this.add.image(154, 136, 'vase').setOrigin(0).setDepth(171);
      this.vaseState = 'ok';
      this.add.image(0, 244, 'plant').setOrigin(0).setDepth(273);
      this.box = { x: 118, y: 212, w: 26, h: 22 };
      this.add.image(this.box.x, this.box.y, 'box').setOrigin(0).setDepth(this.box.y + this.box.h);
      this.add.image(c.x + 7, c.y - 15, 'mat').setOrigin(0).setDepth(-900);
      this.doorOpen = this.add.image(c.x + c.w + 1, c.y + 2, 'doorOpen').setOrigin(0).setDepth(c.y + c.h);
      this.add.image(c.x, c.y, 'carrierBack').setOrigin(0).setDepth(c.y);
      this.add.image(c.x, c.y + c.h - 10, 'carrierFront').setOrigin(0).setDepth(c.y + c.h + 5);
      this.door = this.add.image(c.x + 7, c.y - 3, 'door').setOrigin(0).setDepth(c.y + 1).setVisible(false);
      this.add.image(0, -extra, 'vignette').setOrigin(0).setDepth(5000).setAlpha(0.3);

      // dust motes floating in the sunbeam
      this.motes = [];
      for (let i = 0; i < 14; i++) this.motes.push({ x: 70 + this.rand() * 60, y: 45 + this.rand() * 80, v: 2 + this.rand() * 3, ph: this.rand() * 6 });

      // cats
      const starts = { mango: [154, 72, 'rest'], smokey: [30, 176, 'wander'], oreo: [100, 92, 'sleep'], pip: [131, 222, 'box'] };
      this.cats = NAMES.map((n, i) => {
        const [x, y, st] = starts[n];
        const cat = {
          name: n, p: PERSONALITY[n], x, y, vx: 0, vy: 0, face: n === 'smokey' ? -1 : 1, z: 0,
          state: st, t: st === 'box' ? 6 : 1 + i, anim: this.rand() * 4, chaseT: 0, wakeT: 0, stillOn: 0,
          restPose: 'idle', captured: false, slot: -1, icon: null, iconT: 0,
        };
        cat.shadow = this.add.image(x, y, 'shadow').setAlpha(0.28);
        cat.spr = this.add.sprite(x, y, `cat_${n}`, 0).setOrigin(0.5, 0.9);
        cat.ico = this.add.image(x, y - 16, 'icoAlert').setVisible(false).setDepth(4000);
        return cat;
      });
      this.slots = [[80, 290], [100, 290], [85, 303], [98, 303]].map(([x, y]) => [x, y + B]);
      this.slotUsed = [false, false, false, false];
      this.arrow = this.add.image(90, 254 + B, 'arrow').setDepth(4300);

      // laser dot
      this.dot = { on: false, x: 90, y: 180, px: 90, py: 180, speed: 0, stillT: 0, trail: [] };
      this.g = this.add.graphics().setDepth(4500);
      this.fxg = this.add.graphics().setDepth(4400);
      this.parts = [];

      this.t = 0;
      this.playT = 0;
      this.timeLeft = LEVEL_TIME;
      this.captured = 0;
      this.state = S.fixed ? 'playing' : 'title';
      this.endT = 0;
      this.everDragged = false;
      this.lastTick = 99;

      // HUD on the wall
      this.timeText = S.text(this, 38, 16, '1:15', { size: 2, color: '4', shadow: null, outline: '0', originX: 0 }).setDepth(6000);
      this.catText = S.text(this, 174, 16, '0/4', { size: 2, color: '4', shadow: null, outline: '0', originX: 1 }).setDepth(6000);
      this.add.image(138, 16, 'catIcon').setDepth(6000).setScale(1);
      this.hint = null;
      this.title = [];
      if (this.state === 'title') this.showTitle();
      else this.startPlay();

      S.bindInput(this);
      this.registerTools();
    }

    showTitle() {
      this.titleBg = this.add.rectangle(0, -this.extra, W, this.H + this.extra, 0x1e1626, 0.45).setOrigin(0).setDepth(6900);
      this.title.push(S.text(this, W / 2, 96, 'RED', { size: 6, color: '5', shadow: '0', outline: '0' }).setDepth(7000));
      this.title.push(S.text(this, W / 2, 132, 'DOT', { size: 6, color: '4', shadow: '0', outline: '0' }).setDepth(7000));
      this.title.push(S.text(this, W / 2, 166, 'GET THE CATS TO THE VET', { color: '7', shadow: null, outline: '0' }).setDepth(7000));
      this.title.push(S.text(this, W / 2, 182, 'TAP TO START', { color: '4', shadow: null, outline: '0' }).setDepth(7000));
    }

    startPlay() {
      this.state = 'playing';
      this.title.forEach((t) => t.destroy());
      this.title = [];
      if (this.titleBg) { this.titleBg.destroy(); this.titleBg = null; }
      this.hint = S.text(this, W / 2, 60, 'DRAG TO MOVE THE LASER', { color: '4', shadow: null, outline: '0' }).setDepth(6000);
    }

    registerTools() {
      const self = this;
      // A competent player: wake a cat with the dot, lead it toward the carrier, pause so it can pounce.
      // opts: drag speed multiplier, thumb wobble (px), reaction lag (s), chance per second of lifting the finger
      const makeLeader = (missAt, opts) => {
        const q = Object.assign({ speed: 1, wobble: 0, lag: 0, lift: 0 }, opts || {});
        const r = S.rng(77);
        let dx = 90, dy = 200, pause = 0, lead = 0, lagT = 0, liftT = 0, held = null;
        return (o) => {
          if (q.lift) {
            if (liftT > 0) { liftT -= 1 / 60; return { down: false }; }
            if (r() < q.lift / 60) { liftT = 0.3 + r() * 0.6; return { down: false }; }
          }
          if (q.lag) {
            lagT -= 1 / 60;
            if (lagT > 0 && held) return held;
            lagT = q.lag;
          }
          const free = o.cats.filter((c) => !c.captured);
          if (!free.length || (missAt && o.time > missAt)) return { down: false };
          const goal = { x: 90, y: 296 + self.B };
          const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          // keep working on whichever free cat is already engaged, else the one nearest the carrier
          let c = free.find((k) => ENGAGED.includes(k.state));
          if (!c) c = free.reduce((a, b) => (d2(a, goal) < d2(b, goal) ? a : b));
          let tx, ty;
          if (!ENGAGED.includes(c.state)) {
            const vx = goal.x - c.x, vy = goal.y - c.y, l = Math.max(1, len(vx, vy));
            tx = c.x + (vx / l) * 12; ty = c.y + (vy / l) * 12;
            lead = 0;
          } else {
            lead += 1 / 60;
            if (pause > 0) { pause -= 1 / 60; tx = dx; ty = dy; }
            else {
              const vx = goal.x - dx, vy = goal.y - dy, l = Math.max(1, len(vx, vy));
              tx = dx + (vx / l) * 2; ty = dy + (vy / l) * 2;
              if (lead > 1.6) { pause = 0.9; lead = 0; }
            }
          }
          const step = (ENGAGED.includes(c.state) ? 0.75 : 2.5) * q.speed * (q.lag ? q.lag * 60 : 1);
          dx += clamp(tx - dx, -step, step);
          dy += clamp(ty - dy, -step, step);
          held = { down: true, x: dx + (r() - 0.5) * q.wobble, y: dy + (r() - 0.5) * q.wobble };
          return held;
        };
      };
      S.registerApi({
        observe: () => ({
          time: this.t,
          escapes: this.escapes || 0,
          vase: this.vaseState,
          dot: { on: this.dot.on, x: this.dot.x, y: this.dot.y },
          cats: this.cats.map((k) => ({ x: k.x, y: k.y, state: k.state, captured: k.captured })),
        }),
        status: () => ({ state: this.state === 'title' ? 'playing' : this.state, score: this.captured, time: this.playT }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: {
          intended: makeLeader(0),
          showcase: makeLeader(0),
          casual: makeLeader(0, { speed: 1.6, wobble: 6, lag: 0.12, lift: 0.35 }),
          clumsy: makeLeader(0, { speed: 2.2, wobble: 10, lag: 0.2, lift: 0.6 }),
        },
      });
    }

    // ---------- movement helpers ----------
    collide(cat) {
      const r = 6;
      const top = 44, bottom = this.H - 8;
      cat.x = clamp(cat.x, 6, W - 6);
      cat.y = clamp(cat.y, top, bottom);
      for (const o of this.obstacles) {
        if (cat.x + r > o.x && cat.x - r < o.x + o.w && cat.y + 2 > o.y && cat.y - 2 < o.y + o.h) {
          const pl = cat.x + r - o.x, pr = o.x + o.w - (cat.x - r), pt = cat.y + 2 - o.y, pb = o.y + o.h - (cat.y - 2);
          const m = Math.min(pl, pr, pt, pb);
          if (m === pl) { cat.x -= pl; cat.vx = Math.min(0, cat.vx); }
          else if (m === pr) { cat.x += pr; cat.vx = Math.max(0, cat.vx); }
          else if (m === pt) { cat.y -= pt; cat.vy = Math.min(0, cat.vy); }
          else { cat.y += pb; cat.vy = Math.max(0, cat.vy); }
          if (o === this.obstacles[2]) this.bumpTable(cat);
        }
      }
    }

    steer(cat, tx, ty, speed, dt) {
      const dx = tx - cat.x, dy = ty - cat.y, d = len(dx, dy);
      const want = d < 2 ? 0 : speed * Math.min(1, d / 12);
      const wx = d ? (dx / d) * want : 0, wy = d ? (dy / d) * want : 0;
      const a = cat.p.acc * dt;
      cat.vx += clamp(wx - cat.vx, -a, a);
      cat.vy += clamp(wy - cat.vy, -a, a);
      return d;
    }

    say(cat, key, t) { cat.icon = key; cat.iconT = t; }

    randomSpot() {
      for (let i = 0; i < 20; i++) {
        const x = 12 + this.rand() * (W - 24), y = 50 + this.rand() * (this.H - 70);
        const blocked = this.obstacles.some((o) => x > o.x - 6 && x < o.x + o.w + 6 && y > o.y - 6 && y < o.y + o.h + 6);
        const inCarrier = x > this.carrier.x - 4 && x < this.carrier.x + this.carrier.w + 4 && y > this.carrier.y - 10;
        if (!blocked && !inCarrier) return [x, y];
      }
      return [90, 190];
    }

    bumpTable(cat) {
      if (this.vaseState !== 'ok') return;
      if (len(cat.vx, cat.vy) < 30 && cat.state !== 'pounce') return;
      this.vaseState = 'falling';
      this.vaseT = 0;
      S.sfx('meow', cat.p.pitch * 1.2);
    }

    // ---------- per frame ----------
    update(time, delta) {
      const dt = Math.min(delta / 1000, 1 / 20);
      S.input.update();
      this.t += dt;
      this.updateDot(dt);

      if (this.state === 'title') {
        if (S.input.pressed) this.startPlay();
        if (this.title[3]) this.title[3].setVisible(Math.floor(this.t * 2) % 2 === 0);
      } else if (this.state === 'playing') {
        this.playT += dt;
        this.timeLeft = Math.max(0, LEVEL_TIME - this.playT);
        const secs = Math.ceil(this.timeLeft);
        this.timeText.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
        if (secs <= 10 && secs !== this.lastTick) { this.lastTick = secs; S.sfx('clock'); }
        if (this.timeLeft <= 0) this.finish(false);
      } else {
        this.endT += dt;
        if (this.endT > 1.0 && S.input.pressed) { this.scene.restart(); return; }
      }

      this.arrow.setVisible(this.state === 'playing' && this.captured === 0 && Math.floor(this.t * 3) % 3 !== 0);
      this.arrow.y = 252 + this.B + (Math.floor(this.t * 4) % 2);
      this.cats.forEach((cat) => this.updateCat(cat, dt));
      this.separate();
      this.updateVase(dt);
      this.drawFx(dt);
    }

    updateDot(dt) {
      const d = this.dot;
      const cam = this.cameras.main;
      const playing = this.state === 'playing';
      d.on = playing && S.input.down;
      if (d.on) {
        // on touch screens the dot sits above the thumb so the finger never hides it
        const nx = clamp(S.input.x, 2, W - 2);
        const ny = clamp(S.input.y + cam.scrollY - (S.input.touch ? 22 : 0), 40, this.H - 4);
        d.px = d.x; d.py = d.y;
        if (!this.wasOn) { d.px = nx; d.py = ny; }
        d.x = nx; d.y = ny;
        const sp = len(d.x - d.px, d.y - d.py) / Math.max(dt, 1e-3);
        d.speed = d.speed * 0.8 + sp * 0.2;
        d.stillT = d.speed < 25 ? d.stillT + dt : 0;
        d.trail.push([d.x, d.y]);
        if (d.trail.length > 6) d.trail.shift();
        if (!this.everDragged && this.hint && this.t > 0.5) { this.everDragged = true; }
      } else {
        d.trail.length = 0;
        d.stillT = 0;
      }
      if (this.everDragged && this.hint && this.t > 3) { this.hint.destroy(); this.hint = null; }
      this.wasOn = d.on;
    }

    updateCat(cat, dt) {
      const d = this.dot;
      const p = cat.p;
      cat.t -= dt;
      cat.anim += dt;
      cat.iconT -= dt;
      const dist = d.on ? len(d.x - cat.x, d.y - cat.y) : 999;

      if (cat.captured) {
        if (this.state === 'playing') {
          cat.patience -= dt;
          if (cat.patience < 1.6 && cat.patience + dt >= 1.6) { this.say(cat, 'icoHuh', 1.6); S.sfx('mrrp', p.pitch); }
          if (cat.patience <= 0) { this.escape(cat); this.drawCat(cat); return; }
        }
        const [sx, sy] = this.slots[cat.slot];
        cat.x += (sx - cat.x) * Math.min(1, dt * 6);
        cat.y += (sy - cat.y) * Math.min(1, dt * 6);
        cat.vx = cat.vy = 0;
        cat.state = 'carried';
      } else {
        // noticing the dot (asleep cats need it close for a moment, boxed cats need it on the box)
        if (d.on && ['wander', 'rest', 'search'].includes(cat.state) && dist < p.notice) this.alert(cat);
        if (cat.state === 'sleep') {
          cat.wakeT = d.on && dist < 24 ? cat.wakeT + dt : Math.max(0, cat.wakeT - dt);
          if (cat.wakeT > 0.7) { cat.state = 'wake'; cat.t = 0.5; S.sfx('mrrp', p.pitch); }
        }
        if (cat.state === 'box' && d.on && dist < 26) this.alert(cat);

        switch (cat.state) {
          case 'wander': {
            const dd = this.steer(cat, cat.tx, cat.ty, p.walk, dt);
            if (dd < 3 || cat.t <= 0) this.rest(cat);
            if (p.boxLover && len(this.box.x + 13 - cat.x, this.box.y + 12 - cat.y) < 40 && this.rand() < dt * 0.5) {
              cat.state = 'box'; cat.t = 5 + this.rand() * 3;
            }
            break;
          }
          case 'rest':
            this.steer(cat, cat.x, cat.y, 0, dt);
            if (cat.t <= 0) this.wander(cat);
            break;
          case 'sleep':
            this.steer(cat, cat.x, cat.y, 0, dt);
            if (this.rand() < dt * 0.6) this.say(cat, 'icoZ', 0.8);
            break;
          case 'wake':
            this.steer(cat, cat.x, cat.y, 0, dt);
            if (cat.t <= 0) (d.on && dist < p.notice ? this.alert(cat) : this.rest(cat));
            break;
          case 'box': {
            const bx = this.box.x + 13, by = this.box.y + 14;
            cat.x += (bx - cat.x) * Math.min(1, dt * 8);
            cat.y += (by - cat.y) * Math.min(1, dt * 8);
            cat.vx = cat.vy = 0;
            if (cat.t <= 0) { cat.y = this.box.y + this.box.h + 4; this.wander(cat); }
            break;
          }
          case 'alert':
            this.steer(cat, cat.x, cat.y, 0, dt);
            if (d.on) cat.face = d.x < cat.x ? -1 : 1;
            if (cat.t <= 0) { cat.state = d.on ? 'chase' : 'rest'; cat.t = 2; }
            break;
          case 'chase': {
            if (!d.on) { cat.state = 'search'; cat.t = 1.2; cat.tx = d.x; cat.ty = d.y; break; }
            this.steer(cat, d.x, d.y, p.run, dt);
            cat.chaseT += dt;
            if (dist < p.pounceR && d.stillT > p.still) { cat.state = 'stalk'; cat.t = 0.35; }
            else if (dist < 7 && d.speed > 25) { cat.state = 'pounce'; this.startPounce(cat); }
            if (cat.chaseT > p.focus || dist > p.notice * 2.4) this.bored(cat);
            break;
          }
          case 'stalk':
            this.steer(cat, cat.x, cat.y, 0, dt);
            if (!d.on) { this.rest(cat); break; }
            cat.face = d.x < cat.x ? -1 : 1;
            if (dist > p.pounceR * 1.6) { cat.state = 'chase'; break; }
            if (cat.t <= 0) { cat.state = 'pounce'; this.startPounce(cat); }
            break;
          case 'pounce': {
            const k = Math.min(1, 1 - cat.t / cat.pt);
            cat.x = cat.fx + (cat.tox - cat.fx) * k;
            cat.y = cat.fy + (cat.toy - cat.fy) * k;
            cat.z = Math.sin(k * Math.PI) * 9;
            cat.vx = (cat.tox - cat.fx) / cat.pt;
            cat.vy = (cat.toy - cat.fy) / cat.pt;
            if (cat.t <= 0) {
              cat.z = 0; cat.vx = cat.vy = 0;
              cat.state = 'bat'; cat.t = 0.4; cat.chaseT = 0;
              this.puff(cat.x, cat.y, 6);
              S.sfx('thump');
            }
            break;
          }
          case 'bat':
            this.steer(cat, cat.x, cat.y, 0, dt);
            if (cat.t <= 0) (d.on && dist < p.notice ? (cat.state = 'chase') : this.rest(cat));
            break;
          case 'bored':
            this.steer(cat, cat.x, cat.y, 0, dt);
            if (cat.t <= 0) { cat.chaseT = 0; this.rest(cat); }
            break;
          case 'search': {
            const dd = this.steer(cat, cat.tx, cat.ty, p.walk * 1.6, dt);
            if (dd < 4 || cat.t <= 0) this.rest(cat);
            break;
          }
          case 'flee':
            this.steer(cat, cat.tx, cat.ty, p.run, dt);
            if (cat.t <= 0) this.rest(cat);
            break;
          default:
            break;
        }

        if (cat.state !== 'pounce' && cat.state !== 'box') {
          cat.x += cat.vx * dt;
          cat.y += cat.vy * dt;
          this.collide(cat);
        }
        if (Math.abs(cat.vx) > 3) cat.face = cat.vx < 0 ? -1 : 1;

        // into the carrier?
        const c = this.carrier;
        if (this.state === 'playing' && cat.state !== 'pounce' && cat.x > c.x + 7 && cat.x < c.x + c.w - 7 && cat.y > c.y + 3 && cat.y < c.y + c.h - 6) {
          this.capture(cat);
        }
      }
      this.drawCat(cat);
    }

    alert(cat) {
      if (ENGAGED.includes(cat.state)) return;
      cat.state = 'alert';
      cat.t = 0.3;
      cat.chaseT = 0;
      this.say(cat, 'icoAlert', 0.7);
      if (this.rand() < 0.5) S.sfx('mrrp', cat.p.pitch);
    }
    rest(cat) {
      cat.state = 'rest';
      cat.t = 1.2 + this.rand() * 2.2;
      cat.restPose = ['idle', 'sit', 'groom'][Math.floor(this.rand() * 3)];
      cat.z = 0;
    }
    wander(cat) {
      const [x, y] = this.randomSpot();
      cat.state = 'wander'; cat.tx = x; cat.ty = y; cat.t = 6;
    }
    bored(cat) {
      cat.state = 'bored';
      cat.t = 1.4;
      this.say(cat, 'icoHuh', 1.2);
    }
    startPounce(cat) {
      const d = this.dot;
      cat.fx = cat.x; cat.fy = cat.y;
      let tx = d.x, ty = d.y;
      if (cat.p.overshoot) {
        const vx = tx - cat.x, vy = ty - cat.y, l = Math.max(1, len(vx, vy));
        tx += (vx / l) * cat.p.overshoot; ty += (vy / l) * cat.p.overshoot;
      }
      cat.tox = clamp(tx, 6, W - 6); cat.toy = clamp(ty, 44, this.H - 8);
      cat.pt = 0.3; cat.t = cat.pt;
      cat.face = cat.tox < cat.x ? -1 : 1;
      S.sfx('pounce', cat.p.pitch);
    }
    escape(cat) {
      const c = this.carrier;
      cat.captured = false;
      this.slotUsed[cat.slot] = false;
      cat.slot = -1;
      this.captured -= 1;
      this.catText.setText(`${this.captured}/4`);
      cat.x = clamp(cat.x, c.x + 12, c.x + c.w - 12);
      cat.y = c.y - 4;
      cat.vy = -40;
      this.wander(cat);
      cat.ty = Math.min(cat.ty, c.y - 40);
      this.say(cat, 'icoHuh', 1.0);
      this.puff(cat.x, cat.y, 5);
      S.sfx('meow', cat.p.pitch);
      this.escapes = (this.escapes || 0) + 1;
    }
    capture(cat) {
      cat.captured = true;
      cat.patience = cat.p.stay;
      cat.slot = this.slotUsed.indexOf(false);
      this.slotUsed[cat.slot] = true;
      this.captured += 1;
      this.catText.setText(`${this.captured}/4`);
      this.say(cat, 'icoHeart', 1.2);
      S.sfx('chime', 1 + this.captured * 0.08);
      S.sfx('purr');
      this.sparkle(cat.x, cat.y - 6);
      if (this.captured === this.cats.length) this.finish(true);
    }

    separate() {
      for (let i = 0; i < this.cats.length; i++) for (let j = i + 1; j < this.cats.length; j++) {
        const a = this.cats[i], b = this.cats[j];
        if (a.captured || b.captured || a.state === 'pounce' || b.state === 'pounce' || a.state === 'box' || b.state === 'box') continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = len(dx, dy);
        if (d < 13 && d > 0.01) {
          const push = (13 - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
          if (a.state === 'bat' && b.state === 'bat' && this.rand() < 0.05) S.sfx('hiss');
        }
      }
    }

    updateVase(dt) {
      if (this.vaseState !== 'falling') return;
      this.vaseT += dt;
      const k = Math.min(1, this.vaseT / 0.35);
      this.vase.x = 154 + k * 10;
      this.vase.y = 136 + k * k * 40;
      if (k >= 1) {
        this.vaseState = 'broken';
        this.vase.setVisible(false);
        S.sfx('crash');
        this.shatter(168, 186);
        this.cats.forEach((cat) => {
          if (!cat.captured && len(cat.x - 168, cat.y - 186) < 50) {
            cat.state = 'flee'; cat.t = 0.7;
            cat.tx = clamp(cat.x + (cat.x - 168) * 2, 10, W - 10);
            cat.ty = clamp(cat.y + (cat.y - 186) * 2, 50, this.H - 10);
            this.say(cat, 'icoAlert', 0.6);
          }
        });
      }
    }

    finish(won) {
      this.state = won ? 'won' : 'lost';
      this.endT = 0;
      if (this.hint) { this.hint.destroy(); this.hint = null; }
      if (won) {
        this.door.setVisible(true);
        this.doorOpen.setVisible(false);
        S.sfx('door');
        S.sfx('meow', 0.8);
        const stars = 1 + (this.vaseState === 'ok' ? 1 : 0) + (this.timeLeft >= 30 ? 1 : 0);
        this.showPanel('ALL ABOARD!', `ALL CATS IN: ${Math.floor(LEVEL_TIME - this.timeLeft)}S`, stars, '8');
      } else {
        S.sfx('lose');
        this.showPanel('MISSED THE VET!', `${this.captured}/4 CATS`, 0, '5');
      }
    }

    showPanel(title, line, stars, color) {
      const y0 = 112;
      const g = this.add.graphics().setDepth(7000);
      g.fillStyle(0x1e1626, 0.35).fillRect(16, y0 + 3, 152, 78);
      g.fillStyle(0x1e1626, 1).fillRect(13, y0, 154, 78);
      g.fillStyle(0xb88a52, 1).fillRect(14, y0 + 1, 152, 76);
      g.fillStyle(0xf3e7cc, 1).fillRect(16, y0 + 3, 148, 72);
      S.text(this, W / 2, y0 + 14, title, { size: 2, color, shadow: null, outline: '0' }).setDepth(7001);
      for (let i = 0; i < 3; i++) this.add.image(W / 2 - 14 + i * 14, y0 + 34, i < stars ? 'star' : 'starOff').setDepth(7001);
      S.text(this, W / 2, y0 + 50, line, { color: '1', shadow: null }).setDepth(7001);
      S.text(this, W / 2, y0 + 64, 'TAP TO PLAY AGAIN', { color: '2', shadow: null }).setDepth(7001);
    }

    // ---------- drawing ----------
    drawCat(cat) {
      let pose = 'idle', f = 0;
      const moving = len(cat.vx, cat.vy) > 4;
      switch (cat.state) {
        case 'wander': case 'search': case 'flee':
          pose = moving ? (len(cat.vx, cat.vy) > cat.p.walk * 1.4 ? 'run' : 'walk') : 'idle';
          f = Math.floor(cat.anim * (pose === 'run' ? 12 : 7)) % 4; break;
        case 'chase': pose = moving ? 'run' : 'crouch'; f = Math.floor(cat.anim * 12) % (moving ? 4 : 2); break;
        case 'alert': pose = 'crouch'; f = 0; break;
        case 'stalk': pose = 'crouch'; f = Math.floor(cat.anim * 10) % 2; break; // butt wiggle
        case 'pounce': pose = 'pounce'; f = cat.t > cat.pt / 2 ? 0 : 1; break;
        case 'bat': pose = 'crouch'; f = 1; break;
        case 'bored': pose = 'groom'; f = Math.floor(cat.anim * 3) % 2; break;
        case 'rest': pose = cat.restPose; f = Math.floor(cat.anim * (cat.restPose === 'groom' ? 3 : 1.5)) % 2; break;
        case 'sleep': pose = 'sleep'; f = Math.floor(cat.anim * 0.8) % 2; break;
        case 'wake': pose = 'sit'; f = 0; break;
        case 'box': case 'carried': pose = cat.captured && cat.p.sleeper ? 'sleep' : 'sit'; f = Math.floor(cat.anim * 0.7) % 2; break;
        default: break;
      }
      const idx = A.POSE_INDEX[`${pose}${f}`] + (cat.face < 0 ? A.POSES.length : 0);
      cat.spr.setFrame(idx);
      const x = Math.round(cat.x), y = Math.round(cat.y - cat.z);
      cat.spr.setPosition(x, y);
      let depth = cat.y;
      if (cat.state === 'box') { depth = this.box.y + this.box.h - 1; cat.spr.y = Math.round(this.box.y + 10); }
      if (cat.captured) depth = this.carrier.y + 2 + cat.slot;
      cat.spr.setDepth(depth);
      cat.shadow.setPosition(Math.round(cat.x), Math.round(cat.y)).setDepth(depth - 0.5);
      cat.shadow.setVisible(cat.state !== 'box' && !cat.captured);
      cat.shadow.setScale(cat.z > 2 ? 0.7 : 1);
      if (cat.iconT > 0 && cat.icon) {
        cat.ico.setTexture(cat.icon).setVisible(true).setPosition(x, y - 23);
      } else cat.ico.setVisible(false);
    }

    puff(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = this.rand() * Math.PI * 2;
        this.parts.push({ x, y, vx: Math.cos(a) * 18, vy: Math.sin(a) * 8 - 6, g: 10, life: 0.35 + this.rand() * 0.2, c: i % 2 ? 0xe8dcc4 : 0xbfae90, s: 1 });
      }
    }
    sparkle(x, y) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.parts.push({ x, y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 20, g: 60, life: 0.6, c: i % 2 ? 0xffd84d : 0xffffff, s: 1 });
      }
    }
    shatter(x, y) {
      for (let i = 0; i < 18; i++) {
        const a = this.rand() * Math.PI * 2, v = 20 + this.rand() * 50;
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, g: 0, drag: 3, life: 6, c: [0x4a7ad0, 0x9fc4f2, 0xff7fc1, 0x5aa04a][i % 4], s: i % 3 ? 1 : 2 });
      }
    }

    drawFx(dt) {
      // particles
      const fg = this.fxg;
      fg.clear();
      this.parts = this.parts.filter((p) => {
        p.life -= dt;
        p.vy += p.g * dt;
        if (p.drag) { p.vx *= Math.max(0, 1 - p.drag * dt); p.vy *= Math.max(0, 1 - p.drag * dt); }
        p.x += p.vx * dt; p.y += p.vy * dt;
        fg.fillStyle(p.c, 1).fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        return p.life > 0;
      });
      // sunbeam dust motes
      this.motes.forEach((m) => {
        m.ph += dt;
        m.y -= m.v * dt * 0.3;
        m.x += Math.sin(m.ph) * dt * 2;
        if (m.y < 42) m.y = 124;
        if (A.inSun(Math.round(m.x), Math.round(m.y)) && Math.floor(m.ph * 2) % 3 !== 0) fg.fillStyle(0xfff2c0, 1).fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
      });
      // laser dot: soft glow, bright core, short trail
      const g = this.g;
      g.clear();
      const d = this.dot;
      if (!d.on) return;
      d.trail.forEach(([tx, ty], i) => { g.fillStyle(0xff4f5e, 0.08 + i * 0.04).fillRect(Math.round(tx), Math.round(ty), 1, 1); });
      const x = Math.round(d.x), y = Math.round(d.y);
      const pulse = Math.floor(this.t * 8) % 2;
      g.fillStyle(0xff4f5e, 0.18).fillRect(x - 3, y - 1, 7, 3).fillRect(x - 1, y - 3, 3, 7);
      g.fillStyle(0xff4f5e, 0.35).fillRect(x - 2, y - 1, 5, 3).fillRect(x - 1, y - 2, 3, 5);
      g.fillStyle(0xff2a3a, 1).fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle(0xffffff, 1).fillRect(x, y - pulse, 1, 1);
    }
  }

  S.createGame({ scenes: [Room], backgroundColor: '#8a5a3a' });
})();
