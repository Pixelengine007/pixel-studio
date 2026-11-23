# Decision log

Every decision: date, what, why, sources. Newest first.

## 2026-11-23 — Shell Swap: three beaches, calibrated
- **Three beaches instead of one level.** First Move (3 crabs, teaches the chain), Bully Beach (6 crabs, eviction, bottle cap), Rush Hour (8 crabs, waves bring a new naked crab and shells, gull every 11 s). **Why:** the first single level was beaten in 9–15 s by a greedy "drag each shell to its crab" player, which made it a basic matching task. Waves that deliver crabs and shells over time force juggling instead of a one-pass solve.
- **Calibration (6 seeds each):** idle, spam, hold and random all lose to the first gull at about 12 s. Perfect player wins the whole campaign in 50 s, casual in 51 s, clumsy wins 67% (losses on beach 3). Real data will overrule this.
- **Fairness fix:** on Rush Hour the wave that brings the new naked crab also brings a small shell. Without it, the casual player lost half its runs to a situation with no possible action.
- **Stars:** finish, at least 40% of the time left, and a chain of at least 3 (beach 1) or 4 (beaches 2–3). This rewards the chain, the clip moment.
- **Tools:** bot_test and record_clip accept `--query` (e.g. `level=2`) so one beach can be tested or clipped on its own.

## 2026-11-23 — Next game: Shell Swap (hermit crab vacancy chains)
- **What:** one beach screen, portrait. Drag empty shells; hermit crabs with their own behaviour inspect them, queue by size and swap in chains. Cramped crabs bully smaller crabs out of their shells; a naked crab is gull food; waves wash shells in and out; the sun sets (timer). Win when every crab wears a shell that fits.
- **Why:** research round 3. Ant trails and murmurations are crowded or too close to Red Dot. Vacancy chains are real, famous, instantly readable and produce a satisfying chain reaction, the strongest clip moment so far. The core verb is new for us: placing, not luring.
- **Applied lessons (docs/game-lessons.md):** human-like bot calibration from the start, fixed playfield (extra height = sky and sea), timer starts on tap, big readable creatures, nothing near the goal, the gull and bullies undo progress, drama on the main path (the gull's first dive and the first wave happen in every run), the clip opens on the threat.

## 2026-11-23 — Red Dot level 1: design calls after the first internal review
- **Restless cats:** cats in the carrier climb back out after a while (Smokey 9 s, Pip 12 s, Mango 16 s, Oreo naps 40 s). **Why:** the first build was a checklist (lure, drop, next). Escapes create the juggling tension and "nooo, Smokey!" moments that a living system should produce, as the flock does in Outrun the Flock.
- **Spread start positions:** no cat starts next to the carrier. **Why:** the first build let a perfect bot win in 15 s; two cats were basically free.
- **Timer 75 s; third star for finishing within 45 s.** **Why:** calibrated with three bot players: perfect 23 s, casual (shaky thumb, slow reactions) 32 s, clumsy 48 s. First-time humans should usually make it, but tightly; stars reward skill. Real data will overrule this.
- **Fixed room for every phone:** the room is always 180 × 320; taller phones get extra wall (picture and a calendar with the vet day circled), not extra floor. **Why:** extra floor made the carrier further away, so the game was harder on tall phones than in clips.
- **Bigger cats (30 × 24 frames) and long floor planks.** **Why:** the cats are the stars of the clip, and the first floor read as a brick wall.
- **Open item:** the vase crash only happens with human-style messy play (the bots never cause it). Check in real play whether it happens often enough to matter.

## 2026-11-23 — Build Red Dot (cats + laser pointer) next
- **What:** top-down apartment, drag the laser dot, lure cats with personalities into the carrier before the vet appointment. "Not basic" is enough; full uniqueness is not required (Thomas).
- **Why:** highest score in research round 2 (clip/send potential, one-thumb fit, replay, unlock potential). Design takes the jam players' lessons: clear attention signals (! ? z), rest-then-pounce rhythm, no battery limit.

## 2026-11-23 — Unique concepts, not twists
- **What:** concepts must be original in their core action and fantasy, not "proven genre + twist". Thomas: Outrun the Flock had no twist; it was simply a unique concept.
- **How research is used now:** for what players respond to (instant understanding, short runs, quick retry, clip-able moments), not to pick a genre.

## 2026-11-23 — Sky Stack rejected as a concept (visuals accepted)
- **What:** Thomas judged the visuals fine but the idea generic: "a basic stacking game, there are a million of those". Sky Stack stays only as a visual and tooling reference; it will not be posted.
- **Lesson:** the twist was cosmetic (the world changes), not a change in what the player does. New rule: the twist must change the core action, and the game needs living systems (creatures or things with behaviour the player influences, like the flock and fox in Outrun the Flock) so play produces surprising moments.

## 2026-11-23 — Proof game: Sky Stack
- **What:** before any posting or automation, build one new small game at the Outrun the Flock visual bar, as proof for Thomas. Concept: one-tap stacking (proven, instantly understood, quick retry) with a world that changes with height: city, clouds, sunset, night, space.
- **Why:** Thomas asked for evidence of quality first. Stacking has the strongest fit with research round 1 for a one-session proof: one-thumb, instant understanding, failure is dramatic, and height gives a built-in "scale reveal" clip hook (research: fails, satisfying loops and scale reveals hook strangers in the first second).

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
