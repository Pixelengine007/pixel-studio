// Shell Swap — drag empty shells; hermit crabs inspect them, queue up by size and swap in chains.
// Win when every crab wears a shell that fits. Cramped crabs bully, naked crabs are gull food,
// big waves wash shells in and out, and the sun sets (the timer).
(function () {
  'use strict';
  const S = window.Studio;
  const A = window.ShellArt;
  const W = S.W;

  const NOTICE = 80; // how far a crab sees an empty shell
  const FIRST_WAVE = 1.2;
  const SEA_Y = 50, WAVE_MAX = 94;
  const OBSTACLES = [
    { key: 'rocks', x: 132, y: 224, box: { x: 134, y: 232, w: 44, h: 22 } },
    { key: 'rock2', x: 150, y: 112, box: { x: 151, y: 116, w: 24, h: 10 } },
    { key: 'bucket', x: 54, y: 288, box: { x: 55, y: 297, w: 20, h: 12 } },
  ];
  // Three beaches, rising complexity. shell: worn shell size, 0 = naked, 'cap' = bottle cap.
  // arrivals[n]: what wave n (0 = the first) washes up besides shells already at sea.
  const LEVELS = [
    {
      name: 'FIRST MOVE', time: 60, gullFirst: 8.5, gullEvery: 14, waveEvery: 16, chainStar: 3,
      hint: 'DRAG THE BIG SHELL TO THE CRABS',
      crabs: [
        { c: 3, col: 0, x: 62, y: 206, shell: 2 },
        { c: 2, col: 1, x: 88, y: 216, shell: 1 },
        { c: 1, col: 2, x: 110, y: 226, shell: 0 },
      ],
      loose: [{ s: 3, x: 92, sea: true }],
      arrivals: {},
    },
    {
      name: 'BULLY BEACH', time: 80, gullFirst: 7.5, gullEvery: 16, waveEvery: 18, chainStar: 4,
      hint: 'BIG CRABS STEAL SHELLS. BE QUICK!',
      crabs: [
        { c: 5, col: 2, x: 146, y: 198, shell: 4 },
        { c: 4, col: 0, x: 46, y: 186, shell: 3 },
        { c: 3, col: 1, x: 86, y: 256, shell: 2 },
        { c: 3, col: 0, x: 124, y: 290, shell: 3 },
        { c: 2, col: 1, x: 40, y: 140, shell: 0 },
        { c: 1, col: 2, x: 24, y: 292, shell: 'cap' },
      ],
      loose: [{ s: 5, x: 118, sea: true }, { s: 1, x: 160, y: 300 }],
      arrivals: {},
    },
    {
      name: 'RUSH HOUR', time: 90, gullFirst: 10, gullEvery: 11, waveEvery: 14, chainStar: 4,
      hint: 'THE WAVES BRING MORE CRABS!',
      crabs: [
        { c: 5, col: 2, x: 30, y: 200, shell: 3 },
        { c: 5, col: 0, x: 150, y: 290, shell: 4 },
        { c: 4, col: 1, x: 52, y: 222, shell: 4 },
        { c: 4, col: 2, x: 120, y: 170, shell: 2 },
        { c: 3, col: 0, x: 92, y: 262, shell: 1 },
        { c: 3, col: 1, x: 138, y: 146, shell: 0 },
        { c: 2, col: 2, x: 20, y: 290, shell: 'cap' },
        { c: 1, col: 1, x: 78, y: 122, shell: 0 },
      ],
      loose: [{ s: 5, x: 100, sea: true }, { s: 2, x: 164, y: 200 }, { s: 1, x: 168, y: 302 }],
      arrivals: { 1: [{ shell: 5 }, { crab: { c: 2, col: 0 } }, { shell: 2 }], 2: [{ shell: 3 }] },
    },
  ];
  const urlLevel = +(new URLSearchParams(location.search).get('level') || 1) - 1;

  // ---------- sounds (synthesized, original) ----------
  S.defineSfx('pick', [{ type: 'square', f0: 700, f1: 1000, at: 0, dur: 0.05, vol: 0.08 }]);
  S.defineSfx('plop', [{ type: 'triangle', f0: 260, f1: 120, at: 0, dur: 0.08, vol: 0.25 }, { type: 'noise', at: 0, dur: 0.05, vol: 0.05 }]);
  S.defineSfx('pop', [{ type: 'sine', f0: 520, f1: 980, at: 0, dur: 0.09, vol: 0.25 }, { type: 'square', f0: 1300, f1: 1300, at: 0.06, dur: 0.04, vol: 0.05 }]);
  S.defineSfx('tick', [{ type: 'square', f0: 2400, f1: 2000, at: 0, dur: 0.015, vol: 0.05 }]);
  S.defineSfx('wave', [{ type: 'noise', at: 0, dur: 1.4, vol: 0.06 }, { type: 'noise', at: 0.2, dur: 0.8, vol: 0.05 }]);
  S.defineSfx('squawk', [{ type: 'sawtooth', f0: 980, f1: 640, at: 0, dur: 0.13, vol: 0.09 }, { type: 'sawtooth', f0: 900, f1: 560, at: 0.16, dur: 0.16, vol: 0.09 }]);
  S.defineSfx('bonk', [{ type: 'triangle', f0: 380, f1: 120, at: 0, dur: 0.12, vol: 0.35 }, { type: 'noise', at: 0, dur: 0.06, vol: 0.1 }]);
  S.defineSfx('rattle', [0, 0.1, 0.2, 0.3].map((t) => ({ type: 'noise', at: t, dur: 0.05, vol: 0.08 })));
  S.defineSfx('home', [{ type: 'square', f0: 880, f1: 880, at: 0, dur: 0.06, vol: 0.08 }, { type: 'square', f0: 1175, f1: 1175, at: 0.07, dur: 0.12, vol: 0.08 }]);
  S.defineSfx('gulp', [{ type: 'square', f0: 300, f1: 900, at: 0, dur: 0.12, vol: 0.12 }, { type: 'sawtooth', f0: 900, f1: 500, at: 0.14, dur: 0.2, vol: 0.08 }]);
  S.defineSfx('fanfare', [523, 659, 784, 1047, 784, 1047].map((f, i) => ({ type: 'square', f0: f, f1: f, at: i * 0.11, dur: 0.12, vol: 0.09 })));
  S.defineSfx('lose', [523, 466, 392, 330].map((f, i) => ({ type: 'triangle', f0: f, f1: f, at: i * 0.14, dur: 0.16, vol: 0.18 })));

  const len = (x, y) => Math.sqrt(x * x + y * y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const val = (sh) => (!sh ? 0 : sh.kind === 'cap' ? 0.5 : sh.s);
  const fits = (crab, sh) => sh.kind === 'cap' || sh.s <= crab.c;
  const wants = (crab, sh) => fits(crab, sh) && val(sh) > val(crab.shell);
  const isHappy = (crab) => !!crab.shell && crab.shell.kind === 'shell' && crab.shell.s === crab.c;
  const POSE = {};
  A.CPOSES.forEach((p, i) => { POSE[p] = i; });

  class Beach extends Phaser.Scene {
    constructor() { super('beach'); }

    create(data) {
      data = data || {};
      this.levelIdx = data.level != null ? data.level : clamp(urlLevel, 0, LEVELS.length - 1);
      this.L = LEVELS[this.levelIdx];
      this.campaign = data.campaign || { t: 0 };
      const fullH = this.scale.height;
      const extra = fullH - 320;
      this.extra = extra;
      this.cameras.main.setScroll(0, -extra);
      this.rand = S.rng(S.seed);
      A.buildBeach(this);
      A.buildSky(this, extra);
      A.buildSprites(this);

      this.add.image(0, 0, 'beach').setOrigin(0).setDepth(-1000);
      if (extra > 0) this.add.image(0, -extra, 'skyTop').setOrigin(0).setDepth(-1001);
      this.obstacles = OBSTACLES.map((o) => { this.add.image(o.x, o.y, o.key).setOrigin(0).setDepth(o.box.y + o.box.h); return o.box; });
      this.seaG = this.add.graphics().setDepth(-900);
      this.fxG = this.add.graphics().setDepth(4400);
      // sunset light: a plain see-through warm tint (blend modes are not reliable in every browser)
      this.light = this.add.rectangle(0, -extra, W, 320 + extra, 0xff9a50, 0).setOrigin(0).setDepth(5500);
      this.vignette();

      // shells
      this.shells = [];
      const mkShell = (s, kind, x, y) => {
        const sh = { id: this.shells.length, s, kind, x, y, owner: null, held: false, z: 0, vz: 0, sea: false, queue: [], wob: 0 };
        sh.img = this.add.image(x, y, kind === 'cap' ? 'cap' : `shell${s}`);
        sh.shadow = this.add.image(x, y, 'shadowS').setAlpha(0.35);
        sh.pips = this.add.image(x, y, `pips${kind === 'cap' ? 1 : s}`).setDepth(4600).setVisible(false);
        this.shells.push(sh);
        return sh;
      };
      this.mkShell = mkShell;
      this.L.loose.forEach((l) => { const sh = mkShell(l.s, 'shell', l.x, l.y || SEA_Y); sh.sea = !!l.sea; });

      // crabs
      this.crabs = [];
      this.mkCrab = (d) => {
        const i = this.crabs.length;
        const crab = { id: i, c: d.c, col: d.col, x: d.x, y: d.y, vx: 0, vy: 0, shell: null, state: 'idle', t: 0.5 + this.rand(), anim: this.rand() * 4,
          target: null, wait: 0, icon: null, iconT: 0, cool: 3 + this.rand() * 3, bullyT: 0, hop: 0, out: 0, think: this.rand() * 0.3, sweatT: 2 + this.rand() * 3 };
        if (d.shell === 'cap') crab.shell = mkShell(1, 'cap', d.x, d.y);
        else if (d.shell) crab.shell = mkShell(d.shell, 'shell', d.x, d.y);
        if (crab.shell) crab.shell.owner = crab;
        crab.abd = this.add.image(0, 0, `abd${d.c}`);
        crab.body = this.add.sprite(0, 0, `crab${d.c}_${d.col}`, 0).setOrigin(0.5, 22 / 24);
        crab.shadow = this.add.image(0, 0, d.c >= 4 ? 'shadowL' : d.c >= 2 ? 'shadowM' : 'shadowS').setAlpha(0.3);
        crab.ico = this.add.image(0, 0, 'icoAlert').setDepth(4700).setVisible(false);
        this.crabs.push(crab);
        return crab;
      };
      this.L.crabs.forEach((d) => this.mkCrab(d));

      // gull
      this.gull = { state: 'off', t: 0, x: 0, y: 0, alt: 0, target: null, ang: 0, cx: 0, cy: 0 };
      this.gullImg = this.add.sprite(0, 0, 'gull', 0).setDepth(4800).setVisible(false);
      this.gullShadow = this.add.image(0, 0, 'gullShadow').setDepth(4300).setAlpha(0.5).setVisible(false);
      this.nextGull = this.L.gullFirst;

      // waves
      this.wave = { phase: 'calm', t: 0, front: SEA_Y, next: FIRST_WAVE, n: 0 };
      this.wetMax = new Float32Array(180).fill(SEA_Y);

      this.t = 0;
      this.playT = 0;
      this.held = null;
      this.chainN = 0; this.lastSwap = -9; this.bestChain = 0;
      this.parts = [];
      this.popups = [];
      this.state = S.fixed || data.level != null ? 'playing' : 'title';
      this.endT = 0;
      this.winT = -1;

      const hy = 10 - Math.min(this.extra, 40);
      this.sunIcon = this.add.image(10, hy, 'sunIcon').setDepth(6000);
      this.timeText = S.text(this, 18, hy, '1:30', { size: 2, color: '4', shadow: null, outline: '0', originX: 0 }).setDepth(6000);
      this.add.image(150, hy, 'crabIcon').setDepth(6000);
      this.homeText = S.text(this, 176, hy, '1/6', { size: 2, color: '4', shadow: null, outline: '0', originX: 1 }).setDepth(6000);
      this.title = [];
      if (this.state === 'title') this.showTitle();
      else this.startPlay();

      S.bindInput(this);
      this.registerTools();
      this.updateHud();
    }

    vignette() {
      const h = 320 + this.extra, key = 'vig' + h;
      if (!this.textures.exists(key)) {
        const t = this.textures.createCanvas(key, W, h), ctx = t.getContext();
        ctx.fillStyle = A.INK;
        for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
          const dx = (x - 90) / 90, dy = (y - h / 2) / (h / 2);
          const d = Math.max(0, Math.sqrt(dx * dx * 0.9 + dy * dy * 0.7) - 0.8) * 1.7;
          if (A.bay(x, y) < d * 0.55) ctx.fillRect(x, y, 1, 1);
        }
        t.refresh();
      }
      this.add.image(0, -this.extra, key).setOrigin(0).setDepth(5400).setAlpha(0.25);
    }

    showTitle() {
      this.titleBg = this.add.rectangle(0, -this.extra, W, 320 + this.extra, 0x1e1626, 0.45).setOrigin(0).setDepth(6900);
      this.title.push(S.text(this, W / 2, 104, 'SHELL', { size: 6, color: '6', shadow: '0', outline: '0' }).setDepth(7000));
      this.title.push(S.text(this, W / 2, 140, 'SWAP', { size: 6, color: '4', shadow: '0', outline: '0' }).setDepth(7000));
      this.title.push(S.text(this, W / 2, 174, 'GIVE EVERY CRAB A SHELL THAT FITS', { color: '7', shadow: null, outline: '0' }).setDepth(7000));
      this.title.push(S.text(this, W / 2, 190, 'TAP TO START', { color: '4', shadow: null, outline: '0' }).setDepth(7000));
    }

    startPlay() {
      this.state = 'playing';
      this.title.forEach((t) => t.destroy());
      this.title = [];
      if (this.titleBg) { this.titleBg.destroy(); this.titleBg = null; }
      this.hint = S.text(this, W / 2, 104, this.L.hint, { color: '7', shadow: null, outline: '0' }).setDepth(6000);
      this.banner = S.text(this, W / 2, 90, `BEACH ${this.levelIdx + 1}: ${this.L.name}`, { size: 1, color: '4', shadow: null, outline: '0' }).setDepth(6000);
      this.hintT = 3.5;
    }

    // ---------- tools: observation and scripted players ----------
    registerTools() {
      const self = this;
      const makePlayer = (opts) => {
        const q = Object.assign({ speed: 3.5, wobble: 0, think: 0.15, early: 0, showcase: false }, opts || {});
        const r = S.rng(91);
        let hold = null, crabId = -1, fx = 90, fy = 200, wait = 0.3, phase = 0, dropAt = null;
        return (o) => {
          if (wait > 0) { wait -= 1 / 60; return { down: false }; }
          const shells = o.shells, crabs = o.crabs;
          if (hold !== null) {
            const sh = shells[hold];
            if (!sh.held && !sh.first) { hold = null; wait = q.think; return { down: false }; }
            let tx, ty;
            if (dropAt) { tx = dropAt.x; ty = dropAt.y; } else {
              const c = crabs[crabId];
              tx = c.x + (c.x < 90 ? 13 : -13); ty = Math.max(c.y - 2, 100);
            }
            const dx = tx - fx, dy = ty - fy, d = len(dx, dy);
            const step = (dropAt && dropAt.slow) ? 0.8 : q.speed;
            const early = q.early && r() < q.early / 60 && d < 60;
            if (d < 2 || early) {
              hold = null; dropAt = null;
              wait = q.think + (phase === 2 ? 2.6 : 0.4);
              return { down: false };
            }
            fx += (dx / d) * Math.min(step, d); fy += (dy / d) * Math.min(step, d);
            return { down: true, x: fx + (r() - 0.5) * q.wobble, y: fy + (r() - 0.5) * q.wobble };
          }
          const free = shells.filter((s) => s.empty && !s.sea && !s.held);
          const pick = (sh, crab, at) => {
            hold = sh.id; crabId = crab ? crab.id : -1; dropAt = at || null;
            fx = sh.x; fy = sh.y;
            return { down: true, x: fx, y: fy };
          };
          if (q.showcase && self.levelIdx === 1) {
            const s5 = shells.find((s) => s.s === 5 && s.kind === 'shell');
            const s1 = shells.find((s) => s.s === 1 && s.kind === 'shell');
            const naked = crabs.find((c) => !c.shell && c.state !== 'grabbed');
            if (phase === 0) { // let the gull start circling, then rescue the naked crab at the last moment
              if (o.gull.state === 'circle' && naked && s1.empty) { phase = 1; return pick(s1, naked); }
              return { down: false };
            }
            if (phase === 1 && s5.empty && !s5.sea && s5.y > 70) { phase = 2; return pick(s5, null, { x: 70, y: 214 }); }
            if (phase === 2 && s5.empty) { phase = 3; const big = crabs[0]; return pick(s5, null, { x: big.x - 14, y: big.y, slow: true }); }
            if (phase < 3) return { down: false };
          }
          // greedy helper: naked crabs first, then perfect fits for the biggest shells, then upgrades
          const busy = (c) => c.state === 'seek' || c.state === 'swap' || c.state === 'inspect';
          let best = null;
          crabs.filter((c) => !c.shell && c.state !== 'grabbed').forEach((c) => {
            free.filter((s) => s.kind === 'cap' || s.s <= c.c).forEach((s) => { if (!best || s.s > best[0].s) best = [s, c]; });
          });
          if (!best) {
            const sorted = free.slice().sort((a, b) => b.s - a.s);
            for (const s of sorted) {
              const fit = crabs.find((c) => c.c === s.s && c.val < s.s && !busy(c) && c.state !== 'grabbed');
              if (fit) { best = [s, fit]; break; }
            }
          }
          if (!best) {
            for (const s of free) {
              const up = crabs.find((c) => c.val < s.s && s.s <= c.c && !busy(c) && c.state !== 'grabbed');
              if (up) { best = [s, up]; break; }
            }
          }
          if (best && busy(best[1]) && best[1].shell) return { down: false };
          if (best) return pick(best[0], best[1]);
          return { down: false };
        };
      };
      S.registerApi({
        observe: () => ({
          time: this.playT,
          gull: { state: this.gull.state },
          shells: this.shells.map((s) => ({ id: s.id, s: s.s, kind: s.kind, x: s.x, y: s.y, empty: !s.owner, held: s.held, sea: s.sea, first: this.held === s })),
          crabs: this.crabs.map((c) => ({ id: c.id, c: c.c, x: c.x, y: c.y, state: c.state, shell: c.shell ? c.shell.s : 0, val: val(c.shell), happy: isHappy(c) })),
          chain: this.bestChain,
        }),
        status: () => ({ state: this.state === 'title' || this.state === 'cleared' ? 'playing' : this.state, score: this.levelIdx * 10 + this.crabs.filter(isHappy).length, time: this.campaign.t + this.playT, level: this.levelIdx + 1 }),
        reset: (seed) => { S.seed = seed; this.scene.restart({}); },
        policies: {
          intended: makePlayer(),
          showcase: makePlayer({ showcase: true }),
          casual: makePlayer({ speed: 2.2, wobble: 4, think: 0.7 }),
          clumsy: makePlayer({ speed: 1.5, wobble: 7, think: 1.3, early: 1.2 }),
        },
      });
    }

    // ---------- frame ----------
    update(time, delta) {
      const dt = Math.min(delta / 1000, 1 / 20);
      S.input.update();
      this.t += dt;
      const playing = this.state === 'playing';
      if (this.state === 'title') {
        if (S.input.pressed) this.startPlay();
        if (this.title[3]) this.title[3].setVisible(Math.floor(this.t * 2) % 2 === 0);
      } else if (playing) {
        this.playT += dt;
        if (this.hint) { this.hintT -= dt; if (this.hintT <= 0) { this.hint.destroy(); this.hint = null; this.banner.destroy(); this.banner = null; } }
        this.updateDrag();
        if (this.playT >= this.L.time) this.finish(false, 'SUNSET!');
        if (this.winT < 0 && this.crabs.every(isHappy) && !this.pending()) this.winT = 0.9;
        if (this.winT >= 0) { this.winT -= dt; if (this.winT < 0) this.finish(true); }
      } else {
        this.endT += dt;
        const go = S.fixed ? this.state === 'cleared' && this.endT > 2.6 : this.endT > 1.0 && S.input.pressed;
        if (go) {
          if (this.state === 'cleared') this.scene.restart({ level: this.levelIdx + 1, campaign: { t: this.campaign.t + this.playT } });
          else if (this.state === 'lost') this.scene.restart({ level: this.levelIdx, campaign: this.campaign });
          else this.scene.restart({ level: 0, campaign: { t: 0 } });
          return;
        }
      }
      this.updateWaves(dt, playing);
      if (this.state !== 'title') {
        this.crabs.forEach((c) => this.updateCrab(c, playing ? dt : dt));
        this.separate();
        if (playing) this.updateQueues();
        if (playing || this.gull.state !== 'off') this.updateGull(dt);
      }
      this.shells.forEach((s) => this.updateShell(s, dt));
      this.crabs.forEach((c) => this.drawCrab(c));
      this.updateLight();
      this.drawFx(dt);
      this.updateHud();
    }

    updateHud() {
      const left = Math.max(0, Math.ceil(this.L.time - this.playT));
      this.timeText.setText(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
      this.homeText.setText(`${this.crabs.filter(isHappy).length}/${this.crabs.length}`);
    }

    updateLight() {
      // the afternoon turns to sunset across the three beaches: a warm tint that deepens with time
      const k = clamp((this.levelIdx + this.playT / this.L.time) / LEVELS.length, 0, 1);
      const lerp = (a, b, t) => Math.round(a + (b - a) * t);
      const r = 255, g = lerp(170, 110, k), b = lerp(80, 70, k);
      this.light.setFillStyle((r << 16) | (g << 8) | b, 0.04 + k * 0.2);
    }

    // ---------- dragging shells ----------
    updateDrag() {
      const inp = S.input;
      const wx = inp.x, wy = inp.y + this.cameras.main.scrollY;
      const off = inp.touch ? 16 : 0;
      if (inp.pressed && !this.held) {
        let best = null, bd = 20;
        this.shells.forEach((s) => {
          if (s.owner || s.sea) return;
          const d = len(s.x - wx, s.y - wy);
          if (d < bd) { bd = d; best = s; }
        });
        if (best) {
          this.held = best; best.held = true; best.z = 0;
          S.sfx('pick');
          this.crabs.forEach((c) => { if (c.target === best && c.state !== 'queue') this.forget(c); });
        }
      }
      if (this.held) {
        const s = this.held;
        if (inp.down) {
          s.x = clamp(wx, 8, W - 8);
          s.y = clamp(wy - off, 62, 314);
        } else {
          s.held = false; s.z = 4; s.vz = 0;
          this.pushOut(s, 7);
          this.held = null;
          S.sfx('plop');
          this.puff(s.x, s.y + 3, 5);
        }
      }
    }

    pushOut(o, r) {
      for (const b of this.obstacles) {
        if (o.x + r > b.x && o.x - r < b.x + b.w && o.y + 3 > b.y && o.y - 3 < b.y + b.h) {
          const pl = o.x + r - b.x, pr = b.x + b.w - (o.x - r), pt = o.y + 3 - b.y, pb = b.y + b.h - (o.y - 3);
          const m = Math.min(pl, pr, pt, pb);
          if (m === pl) o.x -= pl; else if (m === pr) o.x += pr; else if (m === pt) o.y -= pt; else o.y += pb;
        }
      }
      o.x = clamp(o.x, 6, W - 6);
      o.y = clamp(o.y, 58, 316);
    }

    // ---------- waves ----------
    updateWaves(dt, playing) {
      const w = this.wave;
      w.t += dt;
      if (playing) w.next -= dt;
      if (w.phase === 'calm' && w.next <= 0) {
        w.phase = 'in'; w.t = 0; w.next = this.L.waveEvery;
        this.arrive(w.n); w.n += 1;
        S.sfx('wave');
        // shells lost at sea come back with the wave somewhere new
        this.shells.forEach((s) => {
          if (s.sea) { s.sea = false; s.x = s.id === 0 && !this.firstWaveDone ? s.x : 24 + this.rand() * 110; s.y = SEA_Y; s.surf = true; }
        });
        this.firstWaveDone = true;
      }
      if (w.phase === 'in') {
        const k = Math.min(1, w.t / 1.0);
        w.front = SEA_Y + (WAVE_MAX - SEA_Y) * (1 - (1 - k) * (1 - k));
        if (k >= 1) { w.phase = 'hold'; w.t = 0; }
      } else if (w.phase === 'hold') {
        if (w.t > 0.3) { w.phase = 'out'; w.t = 0; }
      } else if (w.phase === 'out') {
        const k = Math.min(1, w.t / 1.4);
        w.front = WAVE_MAX - (WAVE_MAX - SEA_Y) * k * k;
        if (k >= 1) { w.phase = 'calm'; w.t = 0; this.shells.forEach((s) => { s.surf = false; }); }
      } else {
        w.front = SEA_Y + Math.sin(this.t * 1.3) * 2;
      }
      for (let x = 0; x < 180; x++) this.wetMax[x] = Math.max(this.wetMax[x] - dt * 8, this.frontAt(x));
    }
    frontAt(x) { return this.wave.front + Math.sin(x * 0.08 + this.t * 1.5) * 1.5 + Math.sin(x * 0.21 - this.t * 2.1) * 0.8; }

    updateShell(s, dt) {
      const w = this.wave;
      if (!s.owner && !s.held && !s.sea) {
        if (s.surf && w.phase === 'in') { s.y = Math.max(s.y, w.front - 6); } // carried up the beach by the wave
        else if (w.phase === 'out' && s.y < w.front - 1 && s.y < WAVE_MAX - 4) { // dragged back by the backwash
          s.y = Math.max(SEA_Y - 4, w.front - 1);
          if (s.y <= SEA_Y + 1) { s.sea = true; s.queue.forEach((c) => this.leaveQueue(c, true)); }
        }
        if (s.z > 0 || s.vz) { s.vz -= 220 * dt; s.z += s.vz * dt; if (s.z <= 0) { s.z = 0; s.vz = s.vz < -40 ? -s.vz * 0.3 : 0; } }
      }
      s.wob = Math.max(0, s.wob - dt);
      if (s.owner) { s.img.setVisible(false); s.shadow.setVisible(false); s.pips.setVisible(false); return; }
      const vis = !s.sea;
      const lift = s.held ? 3 : s.z;
      const wobble = s.wob > 0 ? (Math.floor(s.wob * 20) % 2 ? 1 : -1) : 0;
      s.img.setVisible(vis).setPosition(Math.round(s.x) + wobble, Math.round(s.y - lift)).setDepth(s.held ? 4500 : s.y + 3);
      s.shadow.setVisible(vis && !s.surf).setPosition(Math.round(s.x), Math.round(s.y + A.shellD(s.kind === 'cap' ? 1 : s.s) * 0.35)).setDepth(s.held ? 4499 : s.y);
      s.pips.setVisible(vis && s.held).setPosition(Math.round(s.x), Math.round(s.y + 12));
    }

    // ---------- crabs ----------
    forget(c) { c.target = null; c.state = 'idle'; c.t = 0.4; this.say(c, 'icoHuh', 0.8); }
    say(c, key, t) { c.icon = key; c.iconT = t; }
    walk(c, tx, ty, speed, dt) {
      const dx = tx - c.x, dy = ty - c.y, d = len(dx, dy);
      if (d < 0.5) { c.vx = c.vy = 0; return d; }
      const sp = Math.min(speed, d / dt);
      c.vx = (dx / d) * sp; c.vy = (dy / d) * sp;
      return d;
    }
    speedOf(c) { return 26 - 2 * c.c; }
    near(c, list, maxD) { return list.filter((s) => len(s.x - c.x, s.y - c.y) < maxD); }
    emptyShells() { return this.shells.filter((s) => !s.owner && !s.held && !s.sea); }

    think(c) {
      if (isHappy(c)) return;
      const empties = this.emptyShells();
      if (!c.shell) { // naked: grab anything that can be carried, fast
        const opts = this.near(c, empties, 110).filter((s) => fits(c, s));
        if (opts.length) {
          opts.sort((a, b) => val(b) - val(a) || len(a.x - c.x, a.y - c.y) - len(b.x - c.x, b.y - c.y));
          c.state = 'seek'; c.target = opts[0]; c.seekT = 0; this.say(c, 'icoAlert', 0.6);
        } else { c.state = 'panic'; c.t = 0.8; }
        return;
      }
      const seen = this.near(c, empties, NOTICE);
      const better = seen.filter((s) => wants(c, s)).sort((a, b) => val(b) - val(a));
      if (better.length) { c.state = 'seek'; c.target = better[0]; c.seekT = 0; this.say(c, 'icoAlert', 0.6); if (c.queueOf) this.leaveQueue(c); return; }
      const big = seen.filter((s) => s.kind === 'shell' && s.s > c.c && s.queue.length < 5);
      if (big.length && !c.queueOf && c.cool <= 0) { this.joinQueue(c, big[0]); return; }
      // bullying: a cramped crab next to someone wearing a better shell for it
      if (c.cool <= 0 && !c.queueOf) {
        const victim = this.crabs.find((v) => v !== c && v.shell && v.shell.kind === 'shell' && v.state !== 'swap' && v.state !== 'fight' && v.state !== 'fought'
          && v.state !== 'grabbed' && wants(c, v.shell) && len(v.x - c.x, v.y - c.y) < 24);
        if (victim) {
          c.bullyT += 0.3;
          if (c.bullyT > 0.9) {
            c.state = 'fight'; c.t = 1.8; c.foe = victim; c.bullyT = 0;
            victim.state = 'fought'; victim.t = 1.8; victim.foe = c;
            if (victim.queueOf) this.leaveQueue(victim);
            this.say(c, 'icoAngry', 1.8); this.say(victim, 'icoAlert', 1.8);
            S.sfx('rattle');
          }
        } else c.bullyT = 0;
      }
    }

    joinQueue(c, s) {
      c.queueOf = s; s.queue.push(c); c.state = 'queue'; c.wait = 14;
      s.queue.sort((a, b) => b.c - a.c);
      this.say(c, 'icoAlert', 0.5);
    }
    leaveQueue(c, confused) {
      const s = c.queueOf;
      if (s) s.queue = s.queue.filter((k) => k !== c);
      c.queueOf = null;
      if (c.state === 'queue') { c.state = 'idle'; c.t = 0.5; c.cool = 2; }
      if (confused) this.say(c, 'icoHuh', 1);
    }
    slotOf(c) {
      const s = c.queueOf, i = s.queue.indexOf(c);
      const dir = s.x < 90 ? 1 : -1;
      let off = 6 + A.shellD(s.s) / 2;
      for (let k = 0; k < i; k++) off += A.bodyW(s.queue[k].c) + 5;
      off += A.bodyW(c.c) / 2;
      let x = s.x + dir * off, y = s.y + 3;
      if (x < 10 || x > W - 10) { x = s.x - dir * (off - 40); y += 20; }
      return [clamp(x, 10, W - 10), clamp(y, 62, 314)];
    }

    // a crab takes shell s: drops its old shell where it stood, hops in
    swap(c, s) {
      const old = c.shell;
      if (c.queueOf) this.leaveQueue(c);
      const queue = s.queue.filter((k) => k !== c);
      s.queue = [];
      if (old) {
        old.owner = null; old.x = c.x; old.y = clamp(c.y - 4, 62, 314); old.z = 3; old.vz = 30;
        this.pushOut(old, 7);
        old.queue = queue; queue.forEach((k) => { k.queueOf = old; k.wait = Math.max(k.wait, 5); });
        old.queue.sort((a, b) => b.c - a.c);
      } else queue.forEach((k) => { k.queueOf = null; k.state = 'idle'; k.t = 0.3; });
      s.owner = c; c.shell = s; c.target = null;
      c.fromX = c.x; c.fromY = c.y;
      c.x = s.x; c.y = clamp(s.y + 4, 62, 316);
      c.state = 'swap'; c.t = 0.36; c.out = 0.18;
      const now = this.playT;
      this.chainN = now - this.lastSwap < 1.3 ? this.chainN + 1 : 1;
      this.lastSwap = now;
      this.bestChain = Math.max(this.bestChain, this.chainN);
      S.sfx('pop', 1 + (this.chainN - 1) * 0.15);
      this.puff(c.x, c.y, 4);
      if (this.chainN >= 2) this.popup(c.x, c.y - 26, `CHAIN X${this.chainN}!`, '7');
      if (isHappy(c)) { this.say(c, 'icoHeart', 1.4); this.sparkle(c.x, c.y - 12); S.sfx('home', 1 + this.crabs.filter(isHappy).length * 0.05); }
          }

    updateQueues() {
      this.shells.forEach((s) => {
        if (s.owner || s.held || s.sea || !s.queue.length) return;
        // the biggest waiting crab that fits and is close enough moves in: this is the vacancy chain
        const c = s.queue.find((k) => wants(k, s) && len(k.x - s.x, k.y - s.y) < 22 && k.state === 'queue');
        if (c) this.swap(c, s);
      });
    }

    updateCrab(c, dt) {
      c.anim += dt; c.iconT -= dt; c.cool -= dt; c.t -= dt; c.think -= dt;
      if (c.out > 0) c.out -= dt;
      const playing = this.state === 'playing';
      if (c.state === 'grabbed') return;
      if (this.state === 'won' || this.state === 'cleared') { c.state = 'cheer'; c.vx = c.vy = 0; return; }
      if (!playing) { c.vx = c.vy = 0; return; }
      // cramped crabs sweat now and then
      if (c.shell && !isHappy(c) && c.iconT <= 0) { c.sweatT -= dt; if (c.sweatT <= 0) { this.say(c, 'icoSweat', 0.7); c.sweatT = 3 + this.rand() * 3; } }
      if (isHappy(c) && c.iconT <= 0 && this.rand() < dt * 0.06) this.say(c, 'icoNote', 0.9);
      const sp = this.speedOf(c);
      switch (c.state) {
        case 'idle':
          c.vx = c.vy = 0;
          if (c.t <= 0) {
            if (this.rand() < 0.55) { // wander a little, sideways like a crab
              c.state = 'wander';
              c.tx = clamp(c.x + (this.rand() - 0.5) * 60, 12, W - 12);
              c.ty = clamp(c.y + (this.rand() - 0.5) * 30, 104, 312);
              c.t = 4;
            } else c.t = 1 + this.rand() * 2;
          }
          if (c.think <= 0) { c.think = 0.3; this.think(c); }
          break;
        case 'wander': {
          const d = this.walk(c, c.tx, c.ty, sp * (isHappy(c) ? 0.45 : 0.6), dt);
          if (d < 1 || c.t <= 0) { c.state = 'idle'; c.t = 0.8 + this.rand() * 2; }
          if (c.think <= 0) { c.think = 0.3; this.think(c); }
          break;
        }
        case 'seek': {
          const s = c.target;
          if (!s || s.owner || s.held || s.sea) { this.forget(c); break; }
          const spot = { x: s.x, y: s.y + 4 };
          this.pushOut(spot, Math.max(4, A.bodyW(c.c) / 2 - 1));
          const d = this.walk(c, spot.x, spot.y, c.shell ? sp : 42, dt);
          c.seekT = (c.seekT || 0) + dt;
          if (d < 3 || (c.seekT > 4 && len(s.x - c.x, s.y - c.y) < 12)) {
            c.seekT = 0;
            c.vx = c.vy = 0;
            if (!c.shell) this.swap(c, s); // no time to inspect when naked
            else { c.state = 'inspect'; c.t = 0.55; s.wob = 0.5; S.sfx('tick'); }
          }
          break;
        }
        case 'inspect': {
          const s = c.target;
          c.vx = c.vy = 0;
          if (!s || s.owner || s.held || s.sea) { this.forget(c); break; }
          if (c.t <= 0) { if (wants(c, s)) this.swap(c, s); else this.forget(c); }
          break;
        }
        case 'queue': {
          const s = c.queueOf;
          if (!s || s.owner || s.sea) { this.leaveQueue(c, true); break; }
          if (s.held) c.wait = Math.max(c.wait, 6); else c.wait -= dt;
          const [qx, qy] = this.slotOf(c);
          this.walk(c, qx, qy, sp * (s.held ? 1.3 : 1), dt);
          if (c.wait <= 0) { this.leaveQueue(c, true); c.cool = 5; }
          if (c.think <= 0) { // still check for a better, reachable shell
            c.think = 0.4;
            const better = this.near(c, this.emptyShells(), NOTICE).filter((k) => k !== s && wants(c, k));
            if (better.length) { this.leaveQueue(c); c.state = 'seek'; c.target = better[0]; c.seekT = 0; }
          }
          break;
        }
        case 'swap':
          c.vx = c.vy = 0;
          if (c.t <= 0) { c.state = 'idle'; c.t = 0.6; }
          break;
        case 'panic': { // naked: scurry about looking for any shell
          if (c.t <= 0) {
            c.t = 0.6;
            c.tx = clamp(c.x + (this.rand() - 0.5) * 40, 12, W - 12); c.ty = clamp(c.y + (this.rand() - 0.5) * 30, 104, 312);
          }
          this.walk(c, c.tx ?? c.x, c.ty ?? c.y, 30, dt);
          if (c.think <= 0) { c.think = 0.25; this.think(c); }
          break;
        }
        case 'fight': {
          c.vx = c.vy = 0;
          const v = c.foe;
          // a better empty shell nearby distracts the bully
          const lure = this.near(c, this.emptyShells(), 40).find((k) => wants(c, k) && val(k) >= val(v.shell));
          if (lure) { v.state = 'idle'; v.t = 0.5; this.say(v, 'icoHuh', 0.8); c.state = 'seek'; c.target = lure; c.cool = 3; break; }
          if (c.t <= 0) this.evict(c, v);
          break;
        }
        case 'fought':
          c.vx = c.vy = 0;
          if (c.foe && c.foe.state !== 'fight') { c.state = 'idle'; c.t = 0.4; }
          break;
        case 'flee':
          this.walk(c, c.tx, c.ty, 44, dt);
          if (c.t <= 0) { c.state = 'panic'; c.t = 0; }
          break;
        case 'hide':
          c.vx = c.vy = 0;
          if (c.t <= 0) { c.state = 'idle'; c.t = 0.4; }
          break;
        default: break;
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.shell) { c.shell.x = c.x; c.shell.y = c.y - 4; }
      // the big wave pushes crabs up the beach
      if (c.y < this.wave.front + 4 && this.wave.phase === 'in') { c.y = this.wave.front + 4; if (c.iconT <= 0) this.say(c, 'icoAlert', 0.5); }
      this.pushOut(c, Math.max(4, A.bodyW(c.c) / 2 - 1));
      if (c.y < 100 && c.state !== 'seek' && c.state !== 'swap') c.y += dt * 12; // crabs drift away from the waterline
    }

    evict(bully, victim) {
      const theirs = victim.shell;
      theirs.owner = null;
      victim.shell = null;
      victim.state = 'flee'; victim.t = 0.9;
      victim.tx = clamp(victim.x + (victim.x - bully.x) * 3, 14, W - 14); victim.ty = clamp(victim.y + 20, 104, 312);
      this.say(victim, 'icoAlert', 1.2);
      S.sfx('pop', 0.7);
      this.popup(victim.x, victim.y - 22, 'EVICTED!', '5');
      bully.cool = 6;
      this.swap(bully, theirs);
      this.chainN = 0;
    }

    separate() {
      const cs = this.crabs;
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i], b = cs[j];
        if (a.state === 'grabbed' || b.state === 'grabbed' || a.state === 'swap' || b.state === 'swap') continue;
        const min = (A.bodyW(a.c) + A.bodyW(b.c)) * 0.62;
        const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = len(dx, dy);
        if (d < min && d > 0.01) {
          const p = Math.min(1.5, (min - d) / 2); // gentle push per frame, no popping
          a.x -= (dx / d) * p; a.y -= (dy / d) * p * 0.8;
          b.x += (dx / d) * p; b.y += (dy / d) * p * 0.8;
        }
      }
    }

    // ---------- the gull ----------
    exposed() { return this.crabs.filter((c) => !c.shell && c.state !== 'grabbed'); }
    updateGull(dt) {
      const g = this.gull;
      g.t += dt;
      if (g.state === 'off') {
        if (this.state === 'playing' && this.playT >= this.nextGull) {
          const ex = this.exposed();
          g.t = 0;
          S.sfx('squawk');
          if (ex.length) {
            g.target = ex[0]; g.state = 'circle'; g.cx = g.target.x; g.cy = g.target.y; g.ang = 0;
            this.popup(g.target.x, g.target.y - 30, 'GULL!', '4');
          } else { g.state = 'pass'; g.x = -30; g.y = 150 + this.rand() * 80; }
        }
      } else if (g.state === 'pass') {
        g.x += 90 * dt; g.alt = 70;
        if (g.x > W + 40) this.gullDone();
      } else if (g.state === 'circle') {
        const T = 2.8;
        g.cx += (g.target.x - g.cx) * Math.min(1, dt * 3); g.cy += (g.target.y - g.cy) * Math.min(1, dt * 3);
        g.ang += dt * 3.2;
        const r = 30 - 20 * (g.t / T);
        g.x = g.cx + Math.cos(g.ang) * r; g.y = g.cy + Math.sin(g.ang) * r * 0.5; g.alt = 60;
        if (g.t >= T) {
          let tgt = g.target;
          if (tgt.shell) { const alt = this.exposed().find((k) => len(k.x - tgt.x, k.y - tgt.y) < 50); if (alt) tgt = alt; }
          g.target = tgt; g.state = 'dive'; g.t = 0; g.fx = g.x; g.fy = g.y;
          S.sfx('squawk', 1.2);
        }
      } else if (g.state === 'dive') {
        const k = Math.min(1, g.t / 0.4), tgt = g.target;
        g.x = g.fx + (tgt.x - g.fx) * k; g.y = g.fy + (tgt.y - 6 - g.fy) * k; g.alt = 60 * (1 - k);
        if (k >= 1) {
          if (!tgt.shell && this.state === 'playing') {
            g.state = 'carry'; g.t = 0; tgt.state = 'grabbed';
            if (tgt.queueOf) this.leaveQueue(tgt);
            S.sfx('gulp');
            this.popup(tgt.x, tgt.y - 24, 'GULP!', '5');
            this.finish(false, 'THE GULL GOT ONE!');
          } else {
            g.state = 'bonk'; g.t = 0;
            tgt.state = 'hide'; tgt.t = 1.4; tgt.vx = tgt.vy = 0;
            if (tgt.queueOf) this.leaveQueue(tgt);
            S.sfx('bonk'); S.sfx('squawk', 1.4);
            this.popup(tgt.x, tgt.y - 24, 'BONK!', '7');
            this.puff(tgt.x, tgt.y, 6);
          }
        }
      } else if (g.state === 'bonk') {
        g.alt = Math.min(80, g.t * 120); g.y -= dt * 30; g.x += dt * 40;
        if (g.t > 1.6) this.gullDone();
      } else if (g.state === 'carry') {
        g.alt = Math.min(90, g.t * 50); g.y -= dt * 25; g.x += dt * 15;
        const tgt = g.target; tgt.x = g.x; tgt.y = g.y + 2; tgt.lift = g.alt;
      }
      const vis = g.state !== 'off';
      const frame = g.state === 'dive' ? 2 : Math.floor(this.t * 6) % 2;
      const mvx = g.x - (g.px ?? g.x), mvy = g.y - (g.py ?? g.y);
      if (Math.abs(mvx) + Math.abs(mvy) > 0.05) g.face = Math.abs(mvx) > Math.abs(mvy) ? (mvx > 0 ? -90 : 90) : (mvy > 0 ? 0 : 180);
      g.px = g.x; g.py = g.y;
      this.gullImg.setVisible(vis).setFrame(frame).setAngle(g.state === 'dive' ? 0 : g.face || 0).setPosition(Math.round(g.x), Math.round(g.y - g.alt));
      this.gullShadow.setVisible(vis && g.state !== 'pass' || (vis && g.y > 60)).setPosition(Math.round(g.x), Math.round(g.y + 2));
    }
    gullDone() {
      this.gull.state = 'off'; this.gull.t = 0;
      this.nextGull = this.playT + this.L.gullEvery;
    }

    pending() { return Object.keys(this.L.arrivals).some((k) => +k >= this.wave.n); }
    arrive(n) {
      (this.L.arrivals[n] || []).forEach((a) => {
        const x = 24 + this.rand() * 130;
        if (a.shell) { const sh = this.mkShell(a.shell, 'shell', x, SEA_Y); sh.surf = true; }
        if (a.crab) {
          const c = this.mkCrab({ c: a.crab.c, col: a.crab.col, x, y: SEA_Y + 6, shell: 0 });
          c.state = 'panic'; c.t = 0.3;
          this.popup(x, SEA_Y + 30, 'NEW CRAB!', '4');
        }
      });
    }

    finish(won, why) {
      if (this.state !== 'playing') return;
      const last = this.levelIdx === LEVELS.length - 1;
      this.state = won ? (last ? 'won' : 'cleared') : 'lost';
      this.endT = 0;
      if (this.hint) { this.hint.destroy(); this.hint = null; this.banner.destroy(); this.banner = null; }
      if (this.held) { this.held.held = false; this.held = null; }
      const left = this.L.time - this.playT;
      if (won) {
        S.sfx('fanfare');
        const stars = 1 + (left >= this.L.time * 0.4 ? 1 : 0) + (this.bestChain >= this.L.chainStar ? 1 : 0);
        this.panel(last ? 'BEACH CLEARED!' : 'ALL HOME!', [`TIME ${Math.floor(this.playT)}S  BEST CHAIN X${this.bestChain}`], stars, '8',
          last ? 'TAP TO PLAY AGAIN' : 'TAP FOR THE NEXT BEACH');
      } else {
        S.sfx('lose');
        this.panel(why, [`${this.crabs.filter(isHappy).length}/${this.crabs.length} CRABS HOME`], 0, '5', 'TAP TO TRY AGAIN');
      }
    }

    panel(title, lines, stars, color, action) {
      const y0 = 112;
      const g = this.add.graphics().setDepth(7000);
      g.fillStyle(0x1e1626, 0.35).fillRect(16, y0 + 3, 152, 80);
      g.fillStyle(0x1e1626, 1).fillRect(13, y0, 154, 80);
      g.fillStyle(0xb88a52, 1).fillRect(14, y0 + 1, 152, 78);
      g.fillStyle(0xf3e7cc, 1).fillRect(16, y0 + 3, 148, 74);
      S.text(this, W / 2, y0 + 14, title, { size: title.length > 17 ? 1 : 2, color, shadow: null, outline: '0' }).setDepth(7001);
      for (let i = 0; i < 3; i++) this.add.image(W / 2 - 14 + i * 14, y0 + 33, i < stars ? 'star' : 'starOff').setDepth(7001);
      lines.forEach((l, i) => S.text(this, W / 2, y0 + 50 + i * 8, l, { color: '1', shadow: null }).setDepth(7001));
      S.text(this, W / 2, y0 + 66, action, { color: '2', shadow: null }).setDepth(7001);
    }

    // ---------- drawing ----------
    drawCrab(c) {
      const bw = A.bodyW(c.c), bh = A.bodyH(c.c);
      const moving = len(c.vx, c.vy) > 3;
      let pose = 'idle0';
      const f2 = (fps) => Math.floor(c.anim * fps) % 2;
      if (c.state === 'grabbed') pose = `shiver${f2(12)}`;
      else if (c.state === 'cheer') pose = `cheer${f2(4)}`;
      else if (c.state === 'hide') pose = 'hide0';
      else if (!c.shell || c.state === 'fought' || c.state === 'flee') pose = moving ? `walk${Math.floor(c.anim * 14) % 4}` : `shiver${f2(10)}`;
      else if (c.state === 'inspect' || c.state === 'fight') pose = `poke${f2(c.state === 'fight' ? 10 : 4)}`;
      else if (moving) pose = `walk${Math.floor(c.anim * 10) % 4}`;
      else pose = `idle${Math.floor(c.anim * 0.8) % 2}`;
      const shake = (c.state === 'fight' || c.state === 'fought' || pose.startsWith('shiver')) ? (Math.floor(c.anim * 20) % 2 ? 1 : -1) : 0;
      const hop = c.state === 'swap' ? Math.round(Math.sin((1 - c.t / 0.36) * Math.PI) * 5) : 0;
      const bob = pose.startsWith('walk') ? (Math.floor(c.anim * 10) % 2) : 0;
      const x = Math.round(c.x) + shake, y = Math.round(c.y) - hop - bob - Math.round(c.lift || 0);
      const depth = c.state === 'grabbed' ? 4790 : c.y;
      c.body.setFrame(POSE[pose]).setPosition(x, y).setDepth(depth);
      // the shell sits on the crab's back, above the body; the pink abdomen shows when the shell is too small
      const naked = !c.shell || c.out > 0;
      const sd = c.shell ? A.shellD(c.shell.kind === 'cap' ? 1 : c.shell.s) : 0;
      const backY = y - 2 - bh + 1;
      const ad = A.shellD(c.c);
      const cramped = !naked && val(c.shell) < c.c;
      const bulge = cramped ? Math.max(3, (ad - sd) * 0.6 + 2) : 0;
      c.abd.setVisible(naked || cramped).setPosition(x - Math.round(bulge), Math.round(backY - ad * 0.3 + bulge * 0.4)).setDepth(depth - 0.2);
      if (c.shell) {
        const img = c.shell.img;
        img.setVisible(!naked).setPosition(x + (c.shell.kind === 'cap' ? 0 : 0), Math.round(backY - sd * 0.3 + (c.state === 'hide' ? 3 : 0))).setDepth(depth - 0.1);
        if (c.state === 'fought' || c.state === 'fight') img.x += shake;
      }
      c.shadow.setVisible(c.state !== 'grabbed').setPosition(Math.round(c.x), Math.round(c.y) + 1).setDepth(depth - 0.5);
      if (c.iconT > 0 && c.icon) c.ico.setTexture(c.icon).setVisible(true).setPosition(x, Math.round(backY - Math.max(sd, ad) * 0.8 - 6));
      else c.ico.setVisible(false);
    }

    popup(x, y, str, color) {
      const t = S.text(this, clamp(x, 34, W - 34), y, str, { color, shadow: null, outline: '0' }).setDepth(6500);
      this.popups.push({ t, life: 1.1 });
    }
    puff(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = this.rand() * Math.PI * 2;
        this.parts.push({ x, y, vx: Math.cos(a) * 16, vy: Math.sin(a) * 6 - 6, g: 20, life: 0.35 + this.rand() * 0.2, c: i % 2 ? 0xf7e6bd : 0xd9b77c });
      }
    }
    sparkle(x, y) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.parts.push({ x, y, vx: Math.cos(a) * 36, vy: Math.sin(a) * 36 - 18, g: 60, life: 0.6, c: i % 2 ? 0xffd84d : 0xffffff });
      }
    }

    drawFx(dt) {
      // sea, foam and wet sand
      const g = this.seaG;
      g.clear();
      for (let x = 0; x < 180; x++) {
        const f = Math.round(this.frontAt(x));
        const wet = Math.round(this.wetMax[x]);
        if (wet > f + 1) g.fillStyle(0x6a4a2a, 0.22).fillRect(x, f + 1, 1, wet - f - 1);
        g.fillStyle(0x2e68a0, 1).fillRect(x, 0, 1, 16);
        g.fillStyle(0x3a84c0, 1).fillRect(x, 16, 1, Math.max(0, f - 30));
        const sh = Math.max(16, f - 14);
        g.fillStyle(0x56b0d8, 1).fillRect(x, sh, 1, Math.max(0, f - 6 - sh));
        g.fillStyle(0x86d0e8, 0.85).fillRect(x, f - 6, 1, 5);
        if ((x + Math.floor(this.t * 6)) % 7 !== 0) g.fillStyle(0xffffff, 1).fillRect(x, f - 1, 1, 2);
        if (A.hash(x, Math.floor(this.t * 3), 7) < 0.04) g.fillStyle(0xffffff, 1).fillRect(x, 4 + Math.floor(A.hash(x, 3, 1) * Math.max(1, f - 14)), 1, 1);
      }
      // particles
      const fg = this.fxG;
      fg.clear();
      this.parts = this.parts.filter((p) => {
        p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        fg.fillStyle(p.c, 1).fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        return p.life > 0;
      });
      this.popups = this.popups.filter((p) => {
        p.life -= dt; p.t.y -= dt * 14;
        if (p.life <= 0) { p.t.destroy(); return false; }
        return true;
      });
    }
  }

  S.createGame({ scenes: [Beach], backgroundColor: '#2e68a0' });
})();
