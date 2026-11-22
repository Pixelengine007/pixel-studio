# Pixel Studio

Small pixel-art browser games for phones, tested with short Instagram clips. Designed and built with AI assistance.

## Make a new game
1. Copy `games/_template/` to `games/<name>/`.
2. Edit `game.js`. Keep the `Studio.registerApi(...)` call: `observe()`, `status()`, `reset(seed)` and an `intended` policy.
3. Add a link in the root `index.html`.

## Tools (Python 3 + Playwright + ffmpeg)
```
pip install -r tools/requirements.txt
python tools/bot_test.py <game> --runs 10              # mechanics check, never a fun check
python tools/record_clip.py <game> --seconds 15 --seed 3 --skip 2
python tools/instagram.py post --video-url <public mp4 url> --caption "..." --game <game>
python tools/instagram.py stats | comments | refresh
```

## Layout
- `games/` one folder per game · `shared/studio.js` grid, palette, sprites, font, input, sound, tool hooks
- `vendor/` Phaser 3.90 · `tools/` bot tester, clip recorder, Instagram tool
- `clips/` published clips · `logs/` research, decisions, posts, stats, comments · `docs/` lessons

Rules and decision process: see `CLAUDE.md`.
