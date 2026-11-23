// Pixel Studio runtime helpers for Phaser 3 games.
// One shared file: grid, palette, code-drawn pixel sprites, pixel font, input,
// seeded randomness, sound effects, and the hooks the bot tester and clip recorder use.
// Keep this small. Game-specific logic belongs in the game's own folder.
(function () {
  'use strict';

  // ---------- Grid ----------
  // 180 x 320 portrait logical pixels; clips are scaled 6x to 1080 x 1920.
  const W = 180;
  const H = 320;
  const DT = 1000 / 60; // fixed step used by the bot tester and the clip recorder

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'play'; // play | bot | clip
  const fixed = mode !== 'play';

  // ---------- Palette (original, 16 colours, high contrast) ----------
  const PAL = {
    '0': '#0f0b1e', // ink
    '1': '#2a2140', // deep purple
    '2': '#4b3b6b', // dusk purple
    '3': '#8a7fa8', // lilac grey
    '4': '#f4f1e8', // paper white
    '5': '#ff4f5e', // red
    '6': '#ff9a3d', // orange
    '7': '#ffd84d', // yellow
    '8': '#7be35b', // leaf green
    '9': '#2fae6a', // deep green
    'a': '#36d7e8', // cyan
    'b': '#3a7bd5', // blue
    'c': '#1f3f8c', // navy
    'd': '#ff7fc1', // pink
    'e': '#a8643a', // brown
    'f': '#5c3424', // dark brown
  };
  const hex = (c) => parseInt(PAL[c].slice(1), 16);

  // ---------- Seeded randomness ----------
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Code-drawn pixel sprites ----------
  // rows: array of equal-length strings; each char is a palette key, '.' is transparent.
  function paint(ctx, rows, ox, oy, colorOverride) {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        ctx.fillStyle = colorOverride || PAL[ch];
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  function sprite(scene, key, rows) {
    if (scene.textures.exists(key)) return key;
    const tex = scene.textures.createCanvas(key, rows[0].length, rows.length);
    paint(tex.getContext(), rows, 0, 0);
    tex.refresh();
    return key;
  }

  // frames: array of row-arrays with identical size; creates a texture with numbered frames 0..n-1.
  function frames(scene, key, list) {
    if (scene.textures.exists(key)) return key;
    const fw = list[0][0].length;
    const fh = list[0].length;
    const tex = scene.textures.createCanvas(key, fw * list.length, fh);
    list.forEach((rows, i) => {
      paint(tex.getContext(), rows, i * fw, 0);
      tex.add(i, 0, i * fw, 0, fw, fh);
    });
    tex.refresh();
    return key;
  }

  // ---------- Pixel font (3 x 5) ----------
  // 3 x 5 glyphs, one string per row. '#' = pixel.
  const GLYPH_ROWS = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'],
    B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'],
    F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'],
    H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'],
    J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'],
    L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'],
    N: ['##.', '#.#', '#.#', '#.#', '#.#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
    P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'],
    T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'],
    V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'],
    X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
    Z: ['###', '..#', '.#.', '#..', '###'],
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'],
    '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#', '##.'],
    ' ': ['...', '...', '...', '...', '...'],
    '.': ['...', '...', '...', '...', '.#.'],
    '!': ['.#.', '.#.', '.#.', '...', '.#.'],
    ':': ['...', '.#.', '...', '.#.', '...'],
    '-': ['...', '...', '###', '...', '...'],
    '?': ['##.', '..#', '.#.', '...', '.#.'],
    '/': ['..#', '..#', '.#.', '#..', '#..'],
    '+': ['...', '.#.', '###', '.#.', '...'],
    "'": ['.#.', '.#.', '...', '...', '...'],
    ',': ['...', '...', '...', '.#.', '#..'],
  };
  const GLYPHS = {};
  Object.keys(GLYPH_ROWS).forEach((k) => { GLYPHS[k] = GLYPH_ROWS[k].join(''); });

  // size: each font pixel becomes size x size real pixels (drawn natively, so outlines stay 1 pixel thin).
  function textTexture(scene, str, color, shadow, outline, size) {
    str = String(str).toUpperCase();
    const k = size || 1;
    const key = `txt|${str}|${color}|${shadow || ''}|${outline || ''}|${k}`;
    if (scene.textures.exists(key)) return key;
    const pad = outline ? 1 : 0;
    const w = Math.max(1, (str.length * 4 - 1) * k + (shadow ? 1 : 0) + pad * 2);
    const h = 5 * k + (shadow ? 1 : 0) + pad * 2 + (outline && shadow ? 1 : 0);
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    const draw = (ox, oy, c) => {
      ox += pad; oy += pad;
      for (let i = 0; i < str.length; i++) {
        const g = GLYPHS[str[i]] || GLYPHS['?'];
        for (let p = 0; p < 15; p++) {
          if (g[p] !== '#') continue;
          ctx.fillStyle = PAL[c];
          ctx.fillRect(ox + (i * 4 + (p % 3)) * k, oy + Math.floor(p / 3) * k, k, k);
        }
      }
    };
    if (outline) {
      // outline: draw the text in the outline colour at every neighbouring offset, then the text on top
      if (shadow) { for (const [dx, dy] of [[-1, 1], [0, 1], [1, 1], [0, 2], [1, 2], [-1, 2]]) draw(dx, dy, shadow); }
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) draw(dx, dy, outline);
    } else if (shadow) draw(1, 1, shadow);
    draw(0, 0, color);
    tex.refresh();
    return key;
  }

  // Returns a Phaser Image. Prefer size (native big letters) over scale. Call .setText(str) to change it.
  function text(scene, x, y, str, opts) {
    const o = Object.assign({ color: '4', shadow: '0', outline: null, size: 1, scale: 1, originX: 0.5, originY: 0.5 }, opts || {});
    const img = scene.add.image(x, y, textTexture(scene, str, o.color, o.shadow, o.outline, o.size));
    img.setOrigin(o.originX, o.originY).setScale(o.scale).setDepth(1000);
    img.setText = (s) => { img.setTexture(textTexture(scene, s, o.color, o.shadow, o.outline, o.size)); return img; };
    return img;
  }

  // ---------- Input (touch, mouse, keyboard, and bot share one state) ----------
  const input = {
    down: false, pressed: false, released: false, left: false, right: false,
    x: W / 2, y: H / 2, _prev: false, _virtual: null, _tap: false,
    update() {
      if (this._virtual) Object.assign(this, this._virtual);
      // _tap latches a press that started and ended between two frames (a quick tap or click)
      this.pressed = (this.down && !this._prev) || this._tap;
      this._tap = false;
      this.released = !this.down && this._prev;
      this._prev = this.down;
    },
  };
  function bindInput(scene) {
    if (fixed) return; // bot and clip modes are driven by the tools only
    scene.input.on('pointerdown', (p) => { input.down = true; input._tap = true; input.touch = !!p.wasTouch; input.x = p.x; input.y = p.y; unlockAudio(); });
    scene.input.on('pointermove', (p) => { input.x = p.x; input.y = p.y; });
    scene.input.on('pointerup', () => { input.down = false; });
    const k = scene.input.keyboard;
    if (!k) return;
    const set = (code, field, val) => k.on(`key${val ? 'down' : 'up'}-${code}`, (ev) => {
      if (val && field === 'down' && !(ev && ev.repeat)) input._tap = true;
      input[field] = val;
      if (val) unlockAudio();
    });
    ['SPACE', 'UP', 'W', 'Z'].forEach((c) => { set(c, 'down', true); set(c, 'down', false); });
    ['LEFT', 'A'].forEach((c) => { set(c, 'left', true); set(c, 'left', false); });
    ['RIGHT', 'D'].forEach((c) => { set(c, 'right', true); set(c, 'right', false); });
  }

  // ---------- Sound effects (original, synthesized) ----------
  // Each effect: list of tones. type: square | triangle | sawtooth | sine | noise.
  const SFX = {
    jump: [{ type: 'square', f0: 330, f1: 660, at: 0, dur: 0.11, vol: 0.18 }],
    land: [{ type: 'triangle', f0: 160, f1: 80, at: 0, dur: 0.07, vol: 0.3 }],
    coin: [{ type: 'square', f0: 988, f1: 988, at: 0, dur: 0.06, vol: 0.15 }, { type: 'square', f0: 1319, f1: 1319, at: 0.06, dur: 0.12, vol: 0.15 }],
    hit: [{ type: 'noise', at: 0, dur: 0.22, vol: 0.35 }, { type: 'square', f0: 220, f1: 55, at: 0, dur: 0.25, vol: 0.2 }],
    whoosh: [{ type: 'noise', at: 0, dur: 0.12, vol: 0.12 }],
    win: [523, 659, 784, 1047].map((f, i) => ({ type: 'square', f0: f, f1: f, at: i * 0.09, dur: 0.12, vol: 0.14 })),
    tick: [{ type: 'square', f0: 1760, f1: 1760, at: 0, dur: 0.02, vol: 0.08 }],
  };
  let liveCtx = null;
  function unlockAudio() {
    if (fixed || liveCtx) return;
    try { liveCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { liveCtx = null; }
  }
  function schedule(ctx, name, when, pitch) {
    const k = pitch || 1;
    (SFX[name] || []).forEach((n) => {
      const t0 = when + n.at;
      const g = ctx.createGain();
      g.gain.setValueAtTime(n.vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      g.connect(ctx.destination);
      let src;
      if (n.type === 'noise') {
        const len = Math.max(1, Math.floor(ctx.sampleRate * n.dur));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        const r = rng(len);
        for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
        src = ctx.createBufferSource();
        src.buffer = buf;
      } else {
        src = ctx.createOscillator();
        src.type = n.type;
        src.frequency.setValueAtTime(n.f0 * k, t0);
        src.frequency.exponentialRampToValueAtTime(Math.max(1, n.f1 * k), t0 + n.dur);
      }
      src.connect(g);
      src.start(t0);
      src.stop(t0 + n.dur + 0.02);
    });
  }
  const soundLog = [];
  // pitch: optional multiplier (1 = normal). Games can add their own effects with defineSfx.
  function sfx(name, pitch) {
    soundLog.push({ name, t: studio.frameIndex / 60, pitch: pitch || 1 });
    if (liveCtx) { try { schedule(liveCtx, name, liveCtx.currentTime, pitch); } catch (e) { /* ignore */ } }
  }
  function defineSfx(name, notes) { SFX[name] = notes; }

  function wavBase64(buffer) {
    const data = buffer.getChannelData(0);
    const bytes = new DataView(new ArrayBuffer(44 + data.length * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) bytes.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); bytes.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true);
    bytes.setUint32(24, buffer.sampleRate, true); bytes.setUint32(28, buffer.sampleRate * 2, true);
    bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true); str(36, 'data'); bytes.setUint32(40, data.length * 2, true);
    for (let i = 0; i < data.length; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      bytes.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let bin = '';
    const u8 = new Uint8Array(bytes.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  async function renderAudio(seconds, fromSecond) {
    const start = fromSecond || 0;
    const rate = 44100;
    const ctx = new OfflineAudioContext(1, Math.ceil(rate * seconds), rate);
    soundLog.filter((e) => e.t >= start && e.t < start + seconds).forEach((e) => schedule(ctx, e.name, e.t - start, e.pitch));
    const buf = await ctx.startRendering();
    return wavBase64(buf);
  }

  // ---------- Game creation and tool hooks ----------
  const studio = {
    W, H, DT, PAL, hex, mode, fixed, seed: parseInt(params.get('seed') || '1', 10),
    rng, sprite, frames, text, input, bindInput, sfx, defineSfx, soundLog, renderAudio,
    game: null, ready: false, frameIndex: 0, api: null,
  };

  // Games call this in create(): observe(), status(), reset(seed), and optional policies.
  studio.registerApi = function (api) { studio.api = api; };

  studio.createGame = function (opts) {
    let height = H;
    let zoom = 1;
    if (!fixed) {
      zoom = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H)));
      height = Math.max(H, Math.min(Math.floor(window.innerHeight / zoom), Math.floor(H * 1.25)));
    }
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: 'game',
      width: W,
      height,
      zoom,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: opts.backgroundColor || PAL['1'],
      audio: { noAudio: true },
      physics: opts.physics || { default: 'arcade', arcade: { gravity: { y: 0 } } },
      scene: opts.scenes,
      banner: false,
    });
    studio.game = game;
    game.events.once('ready', () => {
      if (fixed) game.loop.sleep();
      studio.ready = true;
    });
    return game;
  };

  // Advance n fixed frames (bot and clip modes only).
  studio.step = function (n) {
    const g = studio.game;
    for (let i = 0; i < (n || 1); i++) {
      studio.frameIndex += 1;
      g.step(studio.frameIndex * DT, DT);
    }
  };
  studio.setInput = function (v) { studio.input._virtual = Object.assign({ down: false, left: false, right: false }, v); };
  studio.capture = function () { return studio.game.canvas.toDataURL('image/png'); };

  window.Studio = studio;
  window.__studio = studio;
})();
