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

## 2026-11-23 — Night Ferry gameplay rejected; new core "River Run" (Thomas's choice)
- Thomas: "the gameplay is boring and does not really work, graphics are good". What broke for him: "the boat tips and I can't stop it".
- My diagnosis: the player only reacts (counterbalances spirits that move on their own); there is no real decision; there is a delay between action and effect; spirits fall and climb back by rules the player can't influence; a 75 s run with a slow start. The bots proved the game can be won, not that it is fun.
- Process lesson: before any art, send Thomas a 30-second playable feel test of the core action only.
- Options pitched: Lantern Lure (my recommendation), Load the Ferry, River Run, a new game. Thomas chose **River Run**: steer the ferry down a night river; sharp turns and bumps make the spirits slide, and too hard throws them overboard; rescue them by steering over them before they drift away.
- Decisions: top-down / high-angle view (steering and sideways sliding can't be read from the side); swerve control (the thumb stays down; the boat follows relative finger movement immediately; source: GameAnalytics on swerving vs turning); endless river with rising speed, score = distance, spirits are rescuable lives; obstacles telegraphed (rocks, logs, tentacles with a bubble warning). The old side-view Night Ferry stays in git and on its link.
- Prior art: a 1980s raft game where passengers fall out and are picked up again (MobyGames entry), plus Rafting Adventure (dodge only). No polished phone version with passengers sliding from steering was found.

## 2026-11-23 — River Run feel test 1 (games/night-ferry-river)
- Rules: steer by swerve (relative drag). Sideways acceleration makes spirits slide (each has its own grip: Mote 900 … Old Moss 1900 px/s²); hitting the side wall faster than 250 px/s throws a spirit out. Every crash (rock, log, bank, tentacle) throws the spirit nearest the impact out (a tentacle throws two). A spirit in the water swims after the boat at 68% of its speed; steer over it to save it before it leaves the bottom of the screen. A tentacle shows a red "!" and bubbles about 1 s before it rises where the boat was. About 40 s river; you lose when all 5 are gone; your score is how many get home.
- Why: a crash causing a spirit to fall out is a clear cause and effect (the first version let doing nothing win, because bumping the banks acted like guide rails); smooth steering is the skill; rescuing gives the player an active comeback.
- Generator: a shorter boat (128 px) and a 215 px slalom spacing (the 160 px boat could not weave between rocks 130 px apart); every pattern is checked for a passage at least one boat wide plus margin.
- Bot test (10 seeds): idle/spam/hold/random all lose (~20 s); intended 100% (2.9 home), casual 90% (2.0), clumsy 60% (0.6). Phone viewport: about 54 fps, drag steering works.
- Art: top-down in the same HD pixel engine (shared palette, spirits, lantern and font copied from night-ferry/pixel.js); clean grass with sparse tufts instead of a noise texture (Thomas reads noise as a grey filter).
- Link: https://claude.ai/artifact/73E1n6fZPyekzeEkVofwh1 (feel test, not final art).

## 2026-11-23 — River Run rejected; new way of finding ideas (the Flock test + toy first)
- Thomas: River Run is "still not very interesting"; Outrun the Flock is his example of an interesting game. He asked for a system that gives good ideas every time.
- My diagnosis: I started from a world and mood (night lake, toad, spirits) and attached a worn action to it (balance, then dodge). Flock started from the action: a dog influences sheep that have a will of their own.
- Decision: ideas start from action + creature rule; seven-question Flock test; funnel of 20 → 5 one-sentence pitches → Thomas picks up to 2 → grey-box toys with no art → art only after he enjoys a toy. Taste log in logs/taste-log.md. No tooling (PocketForge's Concept Foundry, project review 0053, could not predict fun).
- Sources: project reviews 0103, 0133 and 0053; "toys before games" (tinysubversions.com/2009/02/toys-before-games); Unity Learn "Why prototype?".
- River Run and the side-view Night Ferry are parked; both links stay up. The HD pixel engine and the art lessons carry over.

## 2026-11-23 — Idea system approved with one change; first idea round pitched
- Thomas: "all good, only like the game does not need a flock or other creatures. I did like the graphics of previous games so we can keep that".
- Changes: the "Flock test" is now the "interest test"; question 1 no longer asks for creatures, only for something that reacts in its own way. Art rule: keep the Night Ferry / River Run look and engine.
- Round 1 of the funnel: five one-sentence ideas pitched (lava hose, harbour tug, trolley snake, timber, long ladder); details and sources in research-log round 4. Waiting for Thomas to pick up to two for grey-box toys.

## 2026-11-23 — Idea round 1 rejected; interest test gets two more questions; round 2 pitched
- Thomas: "better, but i still dont like the concepts."
- Diagnosis from his own earlier verdicts (project reviews 0056, 0058, 0067, 0134, 0142): he accepts games where you are a character on a mission with a threat and an ending, and rejects "simple app minigames". Round 1 was five chores with no enemy.
- Decision: interest test questions 8 (mission, threat, ending) and 9 (level one of a bigger game). Scope per prototype stays one room and 1–3 minutes.
- Round 2 pitched: bait the beast, don't look away, thin ice, candle thief, Outrun the Flock for phones. Sources in research-log round 5.

## 2026-11-23 — The hours test (question 10); idea round 3 pitched
- Thomas: "more focus on the fact that the activity what you are doing is fun enough to do for a while, does baiting a dragon sounds fun for hours long?" My answer: no; it is a trick, not an activity.
- Decision: interest test question 10, the hours test (a skill with a visible gap between beginner and expert, plus named proof that people do it for hours). It weighs most.
- Asked which activities he could do for hours: he ticked all four types and "either" for session shape, so depth decides, not type.
- Round 3 pitched: heavy sword, trap house, thin ice, night flight, Outrun the Flock for phones. Sources in research-log round 6.

## 2026-11-23 — Ideas must be my own; round 4 pitched
- Thomas: "now you are using ideas from the internet, you have to think of them youreself". He is right about round 3: three of the five started from existing games, which I even gave as the "proof of hours".
- Decision: ideas start from real life and my own thinking; never from an existing game. The web is only used afterwards to check whether the idea exists. Proof for the hours test must come from real life or from Thomas's own play, not from another game.
- Round 4: eight own ideas; four dropped because they already exist; three pitched (false trail, wolf net, your feet are your sword). Sources in research-log round 7.

## 2026-11-23 — "Sounds fun to do" becomes the first gate; real life no longer required; round 5 pitched
- Thomas: "it does not have to exist in the nature, the the activity should sound fun to do."
- My read: round 4 was clever, not fun: thinking games rather than doing games.
- Decision: fantasy is allowed; the first gate is whether the activity sounds fun in one short sentence; the hours test no longer asks for real-life proof.
- Round 5 pitched: tie up giants with a rope, ride a war boar, throw and recall a hammer, dig under the enemy. Fire bending dropped (exists). Sources in research-log round 8.

## 2026-11-23 — Stop pitching lists; my own pick goes straight to a grey-box toy
- Thomas: "you need to be more self thinking and not go fully what i say ... Be more kritsch and dont take everything to extreme/literal."
- My own read of the evening: (1) I turned every remark into a rule and swung each round to it; (2) his remarks point at one thing: the doing must be fun, stay fun and feel like a real game; (3) one-sentence pitches cannot show fun, which PocketForge already showed (reviews 0054–0058) and tonight repeated.
- Decisions: idea rules cut from ten questions to four; real/fantasy and creatures are explicitly not criteria; I choose the idea and build a grey-box toy; Thomas approves a game by playing its toy (his approval of every game stays).
- First toy: "rope and giants" (tie up giants by running a rope round their legs). Why: physical doing, danger grows with reward, room for skill (trees as anchors, dropping giants on each other). Known: a similar desktop-only browser game exists (Giantfall, Nov 2026); no phone version found.

## 2026-11-23 — Grey toy 1: rope and giants (games/toy-giants)
- What it is: plain shapes, no art. Drag anywhere to run (floating thumb stick). A fixed length of rope trails behind you and wraps where it touches a giant's legs or a tree. Two full rings trip a giant at its next step (big ones need three); one ring plus running away and pulling brings it down too; a rope held by a tree works as a tripwire. A giant falls toward you and knocks down any giant it lands on. Giants stamp at you when you are close; the red ring shows where the foot comes down.
- Rope model: wraps use up rope, the loose end is reeled in first, and 0.75 turns in total hold by friction (below that the rope slips).
- Checked: a test bot that only runs rings brings giants down and also gets stamped on, so blind circling is punished; on a phone-sized screen with touch it runs at about 60 fps without errors. Not checked and not claimed: whether it is fun. That is Thomas's call after a minute of play.
- Not a game yet: no bot test for trivial strategies, no goal, nothing posted. Link is private to Thomas.

## 2026-11-23 — Grey toy 2: one clear rule for bringing a giant down
- Thomas on toy 1: "fun, game play, but not very easy or logical in making them fall".
- My diagnosis of toy 1: three different ways to fall (two rings, one ring plus pull, tripwire), a rope that could slip without showing it, rings that only started counting once the rope happened to touch, a delay between "enough rope" and the fall, and a giant that fell on top of you.
- Toy 2: one rule. Run a full ring round the legs (the lap shows as a growing arc, the caught rope as a band); then run away: when the rope goes tight the legs are pulled from under it and it falls away from you. A dashed circle shows how far to run and a faint shape shows where it will land. Big giants need two rings; too few and the rope slips off after a short pull, with a message. Ring a second giant before pulling and both fall; a giant tied to a tree trips itself.
- Kept on purpose: the stamping feet and the full ring under them. I did not make it easier by removing the danger, only by making cause and effect readable.
- Checked: test bot 5 giants down in 34 s (was 5 in 45 s) and still stamped on once; phone-sized screen with touch, about 60 fps, no errors. Same link, new version.

## 2026-11-23 — Toy 2 showed a black screen for Thomas; new self-contained link
- Could not reproduce: the published file matched the tested file byte for byte, and it runs on phone-sized and desktop screens with every outside server blocked.
- Likely causes I could not confirm: the page being swapped to the new version while open, or Phaser not arriving from the CDN.
- Fix for both: fresh link, Phaser published next to the page (checked against the official 3.90.0 package: same sha256), and errors shown on the screen. bundle.py got a --site option. Lesson in docs/game-lessons.md.

## 2026-11-23 — Grey toy 3: something to plan (giants follow you, dominoes, one night)
- Thomas on toy 2: "gameplay could be better" (no detail given).
- My own read, not a guess at his words: in toy 2 every giant was the same separate job (ring, pull, repeat). Nothing to plan, nothing at stake, no reason to stand in one place rather than another.
- Changes: (1) giants turn and come after you when you are within 150 px, so you can lead them together or away from the village; (2) a falling giant knocks the next one over like dominoes, and one pull that fells several scores 10 × n² each; (3) one night is 14 giants in waves, the village has 3 lamps, a giant that gets through or falls on the houses puts one out, and the night ends in dawn or darkness with a score and "play again".
- Kept: the ring-then-pull rule, the stamping feet, falling away from you. Not added: new buttons, power-ups, more kinds of giant.
- Checked in bot runs: doing nothing loses at 36 s; a bot that only rings one giant at a time wins the night in 67–82 s with 0–2 lamps lost and 200–270 points; several-in-one pulls are worth far more, so there is room above that. Phone-sized and desktop screens, about 60 fps, no errors. Fresh link.

## 2026-11-23 — Toy 3: keyboard control added (Thomas asked)
- Arrow keys or WASD run, Enter restarts after a night; dragging with a thumb or the mouse works as before. The keys are read in the toy itself, not in shared/studio.js.
- Checked on a desktop-sized screen: up, right (D), down-left together, W; and dragging on phone-sized and desktop screens. No errors. Fresh link.
- For later: when this becomes a game, keyboard control should move into the shared input code so every game gets it.

## 2026-11-23 — Concept approved by play: rope and giants. Trees get one clear use
- Thomas after playing toy 3: "great, contineu, only the use of the tree trunks is not clear". This is his approval of the concept under the toy rule; the next step is the real game.
- Trees (toy 4): ring one tree and the rope is tied to it; the other trees pulse and a prompt says what you can do next. Ring a second tree and a tripwire is strung between them: the next giant to walk into it goes down the way it was walking, and the wire is used up. Ring a giant instead and it is tied to the tree and trips when it walks on (works in either order). The opening hint names the tripwire.
- Checked: a test that strings a wire between the two upper trees and waits: the giant trips on it; ringing bot still wins 2 of 3 nights; doing nothing loses. Phone-sized and desktop screens, no errors. Fresh link.

## 2026-11-23 — Tanglefoot (working title): first look in pixel art
- The approved toy rules moved unchanged into games/tanglefoot; the picture is drawn by the HD pixel engine (shared palette, buffer, font copied from the River Run renderer).
- My choices, not asked: working title "Tanglefoot" (the desktop game with a similar idea is called Giantfall, so not that); high-angle view so figures stand up from the ground; stone giants with moss and glowing eyes that turn red when they come after you; a small rope-maker in a yellow cloak with a lantern; a dirt path down to a thatched village whose three lit windows are the lamps; light from the lantern and the windows falls on the ground in clean rings.
- First pass fixes after looking at it: the path was blue and read as a river (now dirt), giants were too dark on the grass (lighter rock ramp), fallen giants were stretched (more compact).
- Not done yet, known: no music, no walk animation for the hero beyond a bob, plain ground, the fallen giant is simple, one night only. Bot test: idle, spam, hold and random lose at 36 s; the ringing bot wins (the night and the bot are both fixed, so all seeds play the same: needs variation later). Phone-sized and desktop screens, about 60 fps.

## 2026-11-24 — Tanglefoot look 2: redrawn to match Night Ferry
- Thomas on the first look: "i dont have the feeling the graphics arte the same as the previous game". He was right. Side by side with Night Ferry and River Run the first look had no sky, moon, depth or mist, a near-black flat ground, lollipop trees, a 18 px hero without a face, and giants built from plain balls. It used the engine but none of what makes the look.
- Redrawn, rules untouched (same bot results): the ground is now seen at a tilt (ground y is drawn at HZ + y * K, so ground circles are ellipses and art still matches collision), which makes room for a banded night sky, moon with halo, clouds, far mountains and a pine ridge the giants rise over. Meadow in a blue-to-green ramp so lantern light turns it green in clean rings; moon shadows; drifting mist bands; tiered pines with visible trunks (the rope winds on the trunk); giants with a face, moss, cracks and a glowing heart stone in their own colour that lights the ground at their feet; a hooded rope-maker with a face and a lantern on a stick; four timbered cottages with thatch, smoke and three street lanterns as the lamps; a foot's shadow with a red rim instead of a bare red circle; dust when a giant lands; a fallen giant breaks into rubble instead of blinking out.
- Removed on review: speckled pine texture and scattered flower dots (too close to the dithering Thomas dislikes), blotchy three-tone ground (now two tones).
- Still open: no music, hero has two run frames only, every night plays the same.

## 2026-11-24 — Tanglefoot look 3: "more professional" pass
- Thomas on look 2: "The game needs to feel and look more professional". I read it as two gaps, and judged feel the bigger one: nothing had weight or answered the player, there was no music, and the interface was debug text in boxes.
- Feel (logic, rules unchanged; visual randomness on its own generator): hit-stop when a giant goes over and when it lands; every footfall drops the giant's body, shakes the ground, kicks up dust and leaves a footprint; landing throws dust and stone chips; score and "N IN ONE PULL!" pop up where it happened; sparks when the rope catches; sparks and a glass sound when a lamp goes out; dust behind the running hero; fade in, fade out on restart; an original plucked tune in A minor pentatonic whose drum joins in as the field fills.
- Look: ground repainted (haze under the ridge, long moonlit swells, shadow strokes, grass clumps, flower patches, a rutted track) instead of blotches; pines of different sizes; giants with thicker legs, knees and sway; hero with a four-step run, breathing, blinking, hood streaming, leaning back on a tight rope; thicker two-tone rope.
- Interface: a two-line logo with a rope under it instead of sentences on a dark overlay; top bar shows one small head per giant (waiting, on the field, down, got through), lamp icons and score; lessons appear when they apply ("DRAG TO RUN", a turning dashed ring round the first giant with "RUN A RING ROUND ITS LEGS", "NOW RUN AWAY!", one tripwire tip after the first fall); end panel with the lamps you kept, a counting score, and dawn climbing the sky on a win or the meadow going dark on a loss; a faint thumb-stick marker.
- Checked: bots (idle, spam, hold, random lose at 36 s; ringing bot wins all runs), phone-size and desktop at 60 fps, title/win/lose screens by screenshot. Not checkable by me: whether it now feels right in the hand. Still open: every night is the same, a fallen giant's pose is stiff, the hero has one facing (left/right).

## 2026-11-24 — Tanglefoot: review for my own mistakes, and fixes
Thomas asked for a review of mistakes. Method: read the logic, then stage awkward situations in the real page and look at the screenshots; measure the cost of one frame against Night Ferry.
Found and fixed:
- You disappeared behind a giant or a tree (tall sprites, tilted view) exactly while running a ring. Now a plain gold shape of you shows through.
- A giant that reached the village simply vanished. Now it tramples on through the houses and out of the picture; the lamp goes out as before.
- One frame cost about twice Night Ferry's with a busy field (13.9 ms against 7.2 ms on the test machine): thick limbs were drawn many times over, lights used slow maths, village and trees were redrawn every frame. Now 7.6 ms with five giants.
- The thumb direction did not match the direction on screen, because the ground is tilted and I steered in ground units. Now the screen direction is the thumb direction (bots adjusted).
- "Play again" went back to the title, so a retry cost two taps. Now straight back into the night.
- A heart stone still behind the ridge lit a patch of grass in front of it. The end panel's last line ran outside the panel. "0/2" over big giants explained nothing (now two loops that fill). The tree tip was vague (now "RING TWO TREES: A TRIPWIRE"). Desktop got touch wording and no hint that arrow keys work. A giant that fell on the houses was drawn under them. Firefly light made wandering blobs on the grass.
Found, not fixed: giants walk straight through trees; a giant falling towards the camera still reads oddly for a moment; every night is identical; sound cannot be judged by me; real phone speed is estimated from a slowed-down desktop, not measured.
Checked after the fixes: bots (idle, spam, hold, random lose at 36 s; ringing bot wins all runs), phone-size and desktop pages at 60 fps without errors.
