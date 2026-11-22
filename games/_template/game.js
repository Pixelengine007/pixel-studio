// Template game: "tap to jump". Copy this folder to start a new game.
// It shows the pieces every game needs: code-drawn sprites, fixed-step logic,
// instant retry, sound events, and the API the bot tester and clip recorder use.
(function () {
  'use strict';
  const S = window.Studio;

  const HERO_A = [
    '..0000..',
    '.077770.',
    '07777770',
    '07477470',
    '07077070',
    '07777770',
    '06777760',
    '.066660.',
    '.00..00.',
  ];
  const HERO_B = HERO_A.slice(0, 8).concat(['..0..0..']);
  const THORN = [
    '....00....',
    '...0550...',
    '..055550..',
    '..055550..',
    '.05555550.',
    '.05545550.',
    '0555555550',
    '0000000000',
  ];
  const GROUND = [
    '88888888',
    '98989898',
    '99999999',
    'eeeeeeee',
    'eefeeefe',
    'eeeeeeee',
    'efeeeefe',
    'eeeeeeee',
  ];
  const DIRT = [
    'eeeeeeee',
    'eefeeeee',
    'eeeeeefe',
    'eeeeeeee',
    'efeeeeee',
    'eeeefeee',
    'eeeeeeee',
    'eeeeeeef',
  ];
  const CLOUD = [
    '....4444........',
    '..44444444..44..',
    '.4444444444444..',
    '4444444444444444',
    '.44444444444444.',
  ];

  const GRAVITY = 900; // px/s^2
  const JUMP = -270; // px/s
  const WIN_TIME = 30; // seconds

  class Run extends Phaser.Scene {
    constructor() { super('run'); }

    create() {
      const W = S.W;
      const H = this.scale.height;
      this.H = H;
      this.groundY = H - 48;
      this.rand = S.rng(S.seed);

      S.frames(this, 'hero', [HERO_A, HERO_B]);
      S.sprite(this, 'thorn', THORN);
      S.sprite(this, 'ground', GROUND);
      S.sprite(this, 'dirt', DIRT);
      S.sprite(this, 'cloud', CLOUD);
      if (!this.anims.exists('run')) {
        this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
      }

      // Sky bands
      this.add.rectangle(0, 0, W, H, S.hex('c')).setOrigin(0);
      this.add.rectangle(0, this.groundY - 90, W, 90, S.hex('b')).setOrigin(0);
      this.clouds = [0, 1, 2].map((i) => this.add.image(20 + i * 70, 40 + i * 30, 'cloud').setOrigin(0));
      this.ground = this.add.tileSprite(0, this.groundY, W, 8, 'ground').setOrigin(0);
      this.dirt = this.add.tileSprite(0, this.groundY + 8, W, H - this.groundY - 8, 'dirt').setOrigin(0);

      this.hero = this.add.sprite(36, this.groundY - 9, 'hero', 0).setOrigin(0).play('run');
      this.vy = 0;
      this.onGround = true;

      this.obstacles = [];
      this.time0 = 0;
      this.t = 0;
      this.speed = 70;
      this.nextSpawn = 1.2;
      this.score = 0;
      this.state = 'playing';
      this.endT = 0;

      this.scoreText = S.text(this, W / 2, 14, '0', { scale: 2 });
      this.hint = S.text(this, W / 2, H / 2 - 40, 'TAP TO JUMP', { color: '7' });
      this.msg = null;

      S.bindInput(this);
      S.registerApi({
        observe: () => this.observe(),
        status: () => ({ state: this.state, score: this.score, time: this.t }),
        reset: (seed) => { S.seed = seed; this.scene.restart(); },
        policies: {
          // Jump when the next thorn is close enough, like an attentive player.
          intended: (o) => {
            const next = o.obstacles.find((b) => b.dx > -4);
            return { down: !!next && o.onGround && next.dx < 10 + o.speed * 0.22 && next.dx > 4 };
          },
        },
      });
    }

    observe() {
      return {
        heroY: this.hero.y, vy: this.vy, onGround: this.onGround, speed: this.speed,
        obstacles: this.obstacles.map((b) => ({ dx: b.img.x - (this.hero.x + 8), w: b.img.width, h: b.img.height })),
      };
    }

    update(time, delta) {
      const dt = delta / 1000;
      S.input.update();

      if (this.state !== 'playing') {
        this.endT += dt;
        if (this.endT > 0.35 && S.input.pressed) this.scene.restart();
        return;
      }

      this.t += dt;
      if (this.t > 2 && this.hint.visible) this.hint.setVisible(false);
      this.speed = 70 + this.t * 3;

      // Jump
      if (S.input.pressed && this.onGround) {
        this.vy = JUMP;
        this.onGround = false;
        S.sfx('jump');
      }
      this.vy += GRAVITY * dt;
      this.hero.y += this.vy * dt;
      const floor = this.groundY - 9;
      if (this.hero.y >= floor) {
        if (!this.onGround) S.sfx('land');
        this.hero.y = floor;
        this.vy = 0;
        this.onGround = true;
      }
      this.hero.anims.timeScale = this.onGround ? 1 : 0;

      // World scroll
      this.ground.tilePositionX += this.speed * dt;
      this.dirt.tilePositionX = this.ground.tilePositionX;
      this.clouds.forEach((c, i) => {
        c.x -= this.speed * dt * (0.15 + i * 0.05);
        if (c.x < -20) c.x = S.W + 4;
      });

      // Spawn and move thorns
      this.nextSpawn -= dt;
      if (this.nextSpawn <= 0) {
        const img = this.add.image(S.W + 4, this.groundY - 8, 'thorn').setOrigin(0);
        this.obstacles.push({ img, passed: false });
        this.nextSpawn = 1.0 + this.rand() * 1.0;
      }
      for (const b of this.obstacles) {
        b.img.x -= this.speed * dt;
        if (!b.passed && b.img.x + b.img.width < this.hero.x) {
          b.passed = true;
          this.score += 1;
          this.scoreText.setText(String(this.score));
          S.sfx('coin');
        }
        if (this.hits(b.img)) return this.lose();
      }
      this.obstacles = this.obstacles.filter((b) => {
        if (b.img.x < -16) { b.img.destroy(); return false; }
        return true;
      });

      if (this.t >= WIN_TIME) this.win();
    }

    hits(img) {
      const h = this.hero;
      const inset = 2;
      return h.x + inset < img.x + img.width - inset && h.x + 8 - inset > img.x + inset &&
        h.y + inset < img.y + img.height && h.y + 9 > img.y + inset;
    }

    lose() {
      this.state = 'lost';
      this.hero.anims.stop();
      this.hero.setTint(S.hex('5'));
      S.sfx('hit');
      this.msg = S.text(this, S.W / 2, this.H / 2 - 40, 'TAP TO RETRY', { color: '4' });
    }

    win() {
      this.state = 'won';
      S.sfx('win');
      this.msg = S.text(this, S.W / 2, this.H / 2 - 40, 'YOU MADE IT!', { color: '7', scale: 2 });
    }
  }

  S.createGame({ scenes: [Run], backgroundColor: S.PAL['c'] });
})();
