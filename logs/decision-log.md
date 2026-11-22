# Decision log

Every decision: date, what, why, sources. Newest first.

## 2026-11-23 — Phaser 3.90 (not 4.x) for now
- **What:** vendor Phaser 3.90.0 as one file, no build step.
- **Why:** stable, well-documented API; plain files work directly on GitHub Pages. Revisit Phaser 4 if load size or performance becomes a problem.

## 2026-11-23 — Grid 180 × 320, bright 16-colour palette, five concepts
- **What:** 180 × 320 portrait grid (6× = 1080 × 1920), fixed width with extending height on taller phones; original high-contrast 16-colour palette; first five concepts and build order as in research round 1.
- **Why and sources:** `logs/research-log.md`, round 1.

## 2026-11-23 — Clip audio rendered offline from game sound events
- **What:** games log sound events; the clip recorder renders the same sounds offline so clips have exact, original audio.
- **Why:** deterministic, original sound only; no music licensing.

## 2026-11-23 — Thomas's past taste is background, not a rule
- **What:** creative choices (style, feel, grid, genre) are made on research and audience data, not on PocketForge preferences.
- **Why:** owner decision.

## 2026-11-23 — Autopilot
- **What:** Claude decides everything; Thomas is only asked for accounts, money, legal, irreversible steps and the stop rules.
- **Why:** owner decision.

## 2026-11-23 — Phaser, portrait, small scope
- **What:** Phaser browser games, portrait orientation, one core action per prototype.
- **Why:** PocketForge's Godot web builds took 19–22 s to start (review 0049); Instagram traffic is phone-first; small scopes were the only PocketForge successes.
