# Decision log

Every decision: date, what, why, sources. Newest first.

## 2026-11-23 — Night Ferry built (HD pixel art), first playable link
- **Look:** after "B but more pixel-like": HD pixel art at 360 x 640 with pixel lighting, no dithering (Thomas: the dither read as a grey filter), no lower resolution (looked cheap). Canvas is 360 px wide and scaled up with crisp pixels; clips are 3x = 1080 x 1920.
- **Character and mood (Thomas skipped the question, my call):** a sleepy toad boatman in a straw hat, the boat's heavy counterweight; cosy-funny night with light suspense from the Deep One.
- **Design calls from testing:** the lantern first pulled spirits toward the toad, which made the boat balance itself (every bot won 5/5); now it only calms nearby spirits. Spirits that fall can only climb back when the boat is level, and a spirit in the water draws the Deep One. Toad weight 1.6 (spirits 4.4 total), so a bad cluster cannot be fixed by position alone. Tilt capped (0.42 target, 0.48 hard; shown at 75%) after a phone test showed the boat almost capsizing; spirits cling for 0.7 s at the edge before falling, to give beginners reaction time.
- **Bot calibration (5 seeds):** idle/spam/hold/random lose in 7–19 s; intended 4.8/5 spirits, casual 4.4, clumsy 3.4 with 20% losses.

## 2026-11-23 — Samples define technique, not characters or vibe
- **What:** Thomas: the style samples were only for the art style, not for the characters or mood. Night Ferry gets its own protagonist; Wren is no longer a house hero.
- **Also:** lowering the resolution (painterly pixel art at 240 px wide) looked cheaper to Thomas. "More pixel-like control" must not mean lower resolution.

## 2026-11-23 — Art direction: hand-painted 2D (Thomas's choice)
- **What:** after five rounds of samples (pixel, flat, ink, 3D looks, genre tests), Thomas chose hand-painted 2D (direction B in `out/2d-directions.png`). The pixel-grid rules are retired; CLAUDE.md updated.
- **Lessons from the sample rounds:** samples that share a scene, palette and lighting read as "the same" even when the rendering changes; real art directions differ in shape language, character design, palette and light. Test every direction across genres (fighting, horror, racing, chill) before asking for a choice.

## 2026-11-23 — Thomas approves game concepts from now on
- **What:** Thomas did not like the Shell Swap idea. New rule: before building a game, pitch several different concepts; build only the approved one. Shell Swap stays in the repo but is parked (not posted).

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

## 2026-11-23 — Night Ferry quality pass 1: composition and art
- What: boat and characters about 35% bigger (deck 100 → 132 px half-width, spirits r 13–19), so they fill the screen width. New renderer (pixel.js v2): 12-band sky with moonlit clouds, a far village with lit windows, moon path and stern-lantern reflections, moonlight shafts under water, lily pads, foreground reeds, a detailed toad (warts, belly folds, big mouth, domed eyes with sleepy/worried lids, woven straw hat), squashy spirits with tails, cheeks and blinks, a planked hull with gunwale, nails, bow post, a rope coil and bucket, and a Deep One with a slit-pupil eye and tentacles. The sunken part of a tilted hull reads as a dark shape under the water. A 5×7 pixel font with an outline, and a HUD panel with a boat-and-gate progress line and spirit faces. The toad is drawn in front of the spirits so the player character always reads.
- Why: Thomas: "the game is very cheap, every aspect can be better". The old frame left the boat small in the middle with empty sky and water, and the characters were simple blobs.
- Balance: the bigger boat put spirits that fell overboard at the screen edge, which made the game harder (intended 3.8/5). Overboard offset 28 → 20 and lost line −60 → −50. Bot test: idle/spam/hold/random lose; intended 100% (3.9), casual 100% (4.2), clumsy 100% (3.6).
- Next: pass 2 (animation, feedback, sound), then the clip and republish.

## 2026-11-23 — Night Ferry quality pass 2: animation, feedback, sound
- What: the toad turns to face where he walks and blinks while awake. Screen shake when the Deep One rises, when a spirit falls in and when one is taken. Sparkles in the spirit's colour when one climbs back or lands home. A blinking red "!" and a heartbeat sound while a spirit clings to the edge. An original lullaby in D major pentatonic (waltz time) that turns slow and low while the Deep One is up. Water laps and crickets as ambience. Clips are now loudness-normalised (loudnorm I=-16) in tools/record_clip.py.
- Not done: slow motion at the edge, because it would change the balance (it gives the player more time).
- Fix: splash, bubble and sparkle randomness now uses its own generator (this.fx), so visual effects never shift gameplay events.
- Bot test (20 seeds): idle/spam/hold/random lose; intended 100% (4.5/5), casual 100% (4.2), clumsy 90% (3.5). Phone check: 60 fps, no errors.
- Published: artifact version 1795457732-47bd. Clip: out/night-ferry-clip.mp4 (seed 3, casual, 17 s, 1080x1920).
