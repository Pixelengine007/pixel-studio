# Visual standard

The quality bar for every game is **Outrun the Flock (JS edition, Nov 2026)**: code-drawn, original, and good-looking. Nothing below this bar is posted. The template game in `games/_template/` is a pipeline test, not a visual reference.

## What makes Outrun the Flock look good (all done in code)

1. **Textured ground, never flat fills.** Smooth value noise, ordered (Bayer 4×4) dithering into 3 tones, plus sparse light/dark specks and little tufts (`src/07_bg.js`).
2. **Edges blend.** Paths, water and sand soften into the grass on their borders instead of hard cuts.
3. **One-pixel dark outline on every character and prop,** generated automatically, so they read on any ground (`outlined()` in `src/03_sprites.js`).
4. **Real animation sets:** run cycles with body bob, idle details (tail wag, blink, chew), action poses, separate facings.
5. **Light and mood per level:** a colour tint per field (dawn, noon, autumn, dusk), drifting cloud shadows, a soft vignette.
6. **Living world:** swaying grass, butterflies, petals, dragonflies, fireflies, shimmering water.
7. **Game feel:** dust when running or skidding, light screen shake, sparkles and a hop on success, splash droplets, a "clear!" ribbon.
8. **Interface with character:** an animated title, a proportional pixel font with lowercase, parchment panels, keycap prompts, iris transitions, star ratings.
9. **Art and collision from one source:** everything solid is painted from the same mask the game collides with, so the picture never lies about where you can go.

## Checklist before any clip is posted

- [ ] No flat single-colour areas larger than a few tiles (texture or dither them).
- [ ] Every character and prop is outlined and has at least run/idle/action frames.
- [ ] Ground, light and colour fit one mood; there is a vignette or lighting pass.
- [ ] At least two kinds of ambient motion and three kinds of feedback effects.
- [ ] Side by side with an Outrun the Flock screenshot, it does not look cheaper.
