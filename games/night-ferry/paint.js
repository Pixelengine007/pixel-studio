// Night Ferry — painted art, drawn in code. Heavy layers (blurred hills, mist, the deep one) are painted once
// into offscreen canvases; each frame only composites them and draws the moving parts.
(function () {
  'use strict';
  const RES = 2; // canvas pixels per logical unit
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function hash(x, s) { const v = Math.sin(x * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }
  function noise1(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, s) * (1 - u) + hash(i + 1, s) * u; }
  function fbm(x, s) { return noise1(x, s) * 0.6 + noise1(x * 2.3, s + 7) * 0.28 + noise1(x * 5.1, s + 13) * 0.12; }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES); const x = c.getContext('2d'); x.scale(RES, RES); return [c, x]; }

  // painterly grain used inside shapes
  const GRAIN = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const r = rng(77);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + r() * 0.05})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 2 + r() * 10, 1 + r() * 4, r() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.06)`; x.fillRect(r() * 256, r() * 256, 1, 1); } return c; })();
  function grainFill(ctx, path, style) {
    ctx.fillStyle = style; ctx.fill(path);
    ctx.save(); ctx.clip(path); ctx.globalAlpha = 0.5; ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(-400, -400, 1600, 1600); ctx.restore();
  }
  const vgrad = (ctx, y0, y1, a, b) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

  // a soft round glow sprite, tinted per colour (drawn additively)
  const glowCache = {};
  function glowSprite(col) {
    if (glowCache[col]) return glowCache[col];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, col.replace('A', 1)); g.addColorStop(0.25, col.replace('A', 0.45)); g.addColorStop(0.6, col.replace('A', 0.12)); g.addColorStop(1, col.replace('A', 0));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); glowCache[col] = c; return c;
  }
  function glow(ctx, x, y, r, col, a = 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); ctx.restore(); }

  // ---------- static layers ----------
  function sky(h) {
    const [c, x] = canvas(360, h);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#060a1c'); g.addColorStop(0.55, '#16264a'); g.addColorStop(0.85, '#2e3e66'); g.addColorStop(1, '#41507a');
    x.fillStyle = g; x.fillRect(0, 0, 360, h);
    const r = rng(3);
    for (let i = 0; i < 160; i++) { const y = r() * h * 0.8; x.fillStyle = `rgba(230,236,255,${0.2 + r() * 0.7 * (1 - y / h)})`; const s = r() < 0.08 ? 1.4 : 0.7; x.fillRect(r() * 360, y, s, s); }
    return c;
  }
  // a wide tile that repeats horizontally for parallax
  function ridgeLayer(width, h, base, amp, f, seed, col, blur, trees) {
    const [c, x] = canvas(width, h);
    const pa = new Path2D(); pa.moveTo(0, h);
    for (let X = 0; X <= width; X += 3) { const t = X / width; const v = fbm(X * f, seed) * (1 - t) + fbm((X - width) * f, seed) * t; pa.lineTo(X, base - v * amp); }
    pa.lineTo(width, h); pa.closePath();
    if (blur) x.filter = `blur(${blur}px)`;
    x.fillStyle = col; x.fill(pa);
    if (trees) { const r = rng(seed + 50); for (let X = 4; X < width - 4; X += 5 + r() * 6) { const t = X / width; const yb = base - (fbm(X * f, seed) * (1 - t) + fbm((X - width) * f, seed) * t) * amp + 2, th = 8 + r() * trees; x.beginPath(); x.moveTo(X, yb - th); x.lineTo(X + th * 0.28, yb); x.lineTo(X - th * 0.28, yb); x.closePath(); x.fill(); } }
    return c;
  }
  function mistLayer(width, y, hgt, a, seed) {
    const [c, x] = canvas(width, 640);
    x.filter = 'blur(10px)';
    const r = rng(seed);
    for (let i = 0; i < 18; i++) { const X = (i / 18) * width + r() * 30, w = 60 + r() * 90; x.fillStyle = `rgba(170,190,220,${a * (0.5 + r() * 0.5)})`; x.beginPath(); x.ellipse(X, y + (r() - 0.5) * hgt, w, hgt * (0.4 + r() * 0.4), 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(X - width, y + (r() - 0.5) * hgt, w, hgt * 0.5, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(X + width, y + (r() - 0.5) * hgt, w, hgt * 0.5, 0, 0, 7); x.fill(); }
    return c;
  }
  function weedLayer(width) { // underwater weeds, a tile
    const [c, x] = canvas(width, 640);
    x.filter = 'blur(1.5px)';
    const r = rng(9);
    for (let i = 0; i < 40; i++) { const X = r() * width, h = 60 + r() * 140, sw = (r() - 0.5) * 30; x.strokeStyle = r() < 0.5 ? '#0e2a2a' : '#12302c'; x.lineWidth = 2 + r() * 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(X, 650); x.quadraticCurveTo(X + sw, 650 - h * 0.6, X + sw * 0.4, 650 - h); x.stroke(); }
    return c;
  }
  // The Deep One: a huge dark shape with a pale eye (eye drawn live)
  function deepOne() {
    const [c, x] = canvas(320, 320);
    x.filter = 'blur(6px)';
    const g = x.createRadialGradient(160, 170, 20, 160, 170, 150); g.addColorStop(0, 'rgba(6,14,18,0.95)'); g.addColorStop(0.7, 'rgba(6,14,18,0.8)'); g.addColorStop(1, 'rgba(6,14,18,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(160, 170, 150, 120, 0, 0, 7); x.fill();
    x.filter = 'blur(3px)'; x.strokeStyle = 'rgba(4,10,12,0.9)'; x.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.4; x.lineWidth = 8 - i * 0.6; x.beginPath(); x.moveTo(160 + Math.cos(a) * 90, 170 + Math.sin(a) * 70); x.quadraticCurveTo(160 + Math.cos(a) * 150, 170 + Math.sin(a) * 120 - 30, 160 + Math.cos(a + 0.3) * 170, 170 + Math.sin(a + 0.3) * 150); x.stroke(); }
    return c;
  }
  // the far shore that arrives at the end: a stone landing with a lantern gate
  function shore() {
    const [c, x] = canvas(260, 640);
    const land = new Path2D('M40 352 C60 330 90 318 140 316 L260 312 L260 360 L40 360 Z'); grainFill(x, land, vgrad(x, 310, 360, '#1a2a2a', '#0a1414'));
    for (let i = 0; i < 9; i++) { const X = 120 + i * 16, h = 30 + hash(i, 3) * 40; x.fillStyle = '#0c1818'; x.beginPath(); x.moveTo(X, 316 - h); x.lineTo(X + h * 0.3, 318); x.lineTo(X - h * 0.3, 318); x.fill(); }
    const pier = new Path2D('M30 344 L120 344 L120 350 L30 350 Z'); grainFill(x, pier, '#3a2a22');
    [40, 70, 100].forEach((X) => { x.fillStyle = '#24180f'; x.fillRect(X, 344, 4, 20); });
    const gate = new Path2D('M132 316 L136 252 L142 252 L140 316 Z M178 316 L176 252 L182 252 L186 316 Z M124 252 C150 244 168 244 194 252 L194 260 C168 254 150 254 124 260 Z');
    grainFill(x, gate, vgrad(x, 244, 316, '#6a3a2a', '#2a1610'));
    return c;
  }

  // ---------- characters ----------
  // Wren (house hero), (x, y) = feet; faces right.
  function wren(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
    const cloak = new Path2D('M-9 0 C-12 -8 -11 -18 -6 -24 C-3 -28 4 -28 7 -24 C11 -18 12 -8 10 0 C6 2 2 -1 0 1 C-3 -1 -6 2 -9 0 Z');
    grainFill(ctx, cloak, vgrad(ctx, -28, 0, '#3c6e74', '#173038'));
    const hood = new Path2D('M-7 -22 C-8 -30 -6 -36 -4 -39 L-2 -34 C0 -35 2 -35 4 -34 L6 -39 C9 -35 10 -29 8 -22 C4 -19 -3 -19 -7 -22 Z');
    grainFill(ctx, hood, vgrad(ctx, -39, -20, '#d9773e', '#8a3a20'));
    ctx.fillStyle = '#0d0b12'; ctx.fill(new Path2D('M-4 -24 C-5 -29 -2 -32 1 -32 C4 -32 6 -29 5 -24 C3 -22 -2 -22 -4 -24 Z'));
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(190,210,255,0.55)'; ctx.lineWidth = 0.8;
    ctx.stroke(new Path2D('M-9 0 C-12 -8 -11 -18 -6 -24 M-7 -22 C-8 -30 -6 -36 -4 -39'));
    ctx.restore();
    const ex = (dx) => x + dx * s * (o.flip ? -1 : 1), ey = y - 27.5 * s;
    [-1.5, 2.6].forEach((dx) => { glow(ctx, ex(dx), ey, 4.5 * s, 'rgba(255,236,170,A)', 0.8); ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.ellipse(ex(dx), ey, 0.9 * s, (o.blink ? 0.25 : 1.3) * s, 0, 0, 7); ctx.fill(); });
  }
  // a lumen spirit: soft glowing body, two eyes, a wispy tail. mood: 'calm' | 'happy' | 'scared' | 'curious'
  function spirit(ctx, x, y, r, col, mood, t, lean = 0) {
    glow(ctx, x, y, r * 3.4, col.glow, 0.55);
    ctx.save(); ctx.translate(x, y); ctx.rotate(lean);
    const tail = new Path2D(); tail.moveTo(-r * 0.7, r * 0.3); tail.quadraticCurveTo(-r * 1.6, r * (0.6 + Math.sin(t * 6) * 0.3), -r * 2.1, r * (0.1 + Math.sin(t * 6 + 1) * 0.4)); tail.quadraticCurveTo(-r * 1.3, r * 0.1, -r * 0.6, -r * 0.2); tail.closePath();
    ctx.fillStyle = col.body; ctx.globalAlpha = 0.8; ctx.fill(tail); ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col.body); g.addColorStop(1, col.edge);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
    const ey = -r * 0.1, ex = r * 0.3;
    if (mood === 'happy') { [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.arc(sg * ex + r * 0.15, ey + r * 0.05, r * 0.14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }); }
    else if (mood === 'scared') { [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.arc(sg * ex + r * 0.15, ey, r * 0.17, 0, 7); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.beginPath(); ctx.arc(sg * ex + r * 0.15, ey, r * 0.07, 0, 7); ctx.fillStyle = '#1a1a2e'; ctx.fill(); }); ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.4, r * 0.1, r * 0.13, 0, 0, 7); ctx.fill(); }
    else { const h = mood === 'curious' ? 0.17 : 0.13; [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.ellipse(sg * ex + r * 0.15, ey, r * 0.09, r * h, 0, 0, 7); ctx.fill(); }); }
    ctx.restore();
  }
  // the rowboat, drawn in boat space (origin = pivot at the waterline, deck from -110 to 110)
  function boat(ctx, lanternOn) {
    const hull = new Path2D('M-122 -10 C-100 -6 100 -6 124 -14 C118 4 96 22 60 26 L-60 26 C-96 22 -116 6 -122 -10 Z');
    grainFill(ctx, hull, vgrad(ctx, -14, 26, '#7a4a30', '#24120a'));
    ctx.strokeStyle = 'rgba(20,10,6,0.6)'; ctx.lineWidth = 0.8;
    [4, 12, 19].forEach((yy) => { ctx.beginPath(); ctx.moveTo(-114 + yy * 0.8, yy - 6); ctx.quadraticCurveTo(0, yy + 2, 116 - yy * 1.2, yy - 10); ctx.stroke(); });
    ctx.fillStyle = '#3a2216'; ctx.fillRect(-118, -12, 240, 4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(180,200,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-118, -12); ctx.quadraticCurveTo(0, -9, 122, -16); ctx.stroke(); ctx.restore();
    // stern pole with a hanging lantern
    ctx.strokeStyle = '#2a1810'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-112, -10); ctx.lineTo(-118, -72); ctx.quadraticCurveTo(-112, -78, -100, -74); ctx.stroke();
    ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-100, -74); ctx.lineTo(-100, -66); ctx.stroke();
    ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.roundRect(-104, -66, 8, 10, 2); ctx.fill();
    glow(ctx, -100, -61, lanternOn ? 46 : 34, 'rgba(255,190,110,A)', 0.55);
    glow(ctx, -100, -61, 8, 'rgba(255,245,210,A)', 0.9);
  }

  window.NFPaint = { RES, rng, hash, fbm, canvas, grainFill, vgrad, glow, glowSprite, sky, ridgeLayer, mistLayer, weedLayer, deepOne, shore, wren, spirit, boat };
})();
