# Research log

Every research round: date, question, findings with sources, conclusion. Newest first.

## Round 3 — 2026-11-23: next concept after Red Dot (uniqueness checks)

- **Pheromone (ant trails), rank 2 in round 2:** crowded. Anthill (iOS, draw pheromone trails, well reviewed), Antopia: Idle Ant Colony (Play Store, Nov 2026), a Steam ant pheromone game and several itch.io ant-trail toys. Dropped.
- **Murmuration (starlings), rank 3:** several jam and toy versions (Murmuration by Aava et al. 2026, Flocc, braceysmith's Murmuration for Android, Passerine GMTK 2021). Its control would also be "steer a group with your finger", too close to Red Dot. Dropped.
- **New candidate: hermit crab vacancy chains.** Real behaviour: when a bigger empty shell appears, hermit crabs line up by size and swap shells in a chain within seconds (Scientific American; Discover Magazine; Tufts/Lewis & Rotjan, Behavioral Ecology 2010). It is a well-known nature-video moment, so it is instantly understandable.
  - Existing games: many "play as a hermit crab" games, two sokoban-style shell puzzles on PC (What a crab, Steam; Shell Shuffle, Inbound Shovel Jam 2025, a grid conga-line push puzzle). No real-time, phone-first version where the crabs act on their own was found.
  - Jam feedback (itch.io comment on a crab shell puzzle): fit was confusing because every shell looked the same, and players wanted instant reset. So shell sizes must be visibly different, and fit must show on the crab.
- **Conclusion:** build "Shell Swap". New core verb (place objects instead of lure), a living system (crabs queue, swap, bully, panic), a built-in satisfying chain-reaction clip moment, and cute animals with comic behaviour (eviction fights, gull bonking a shell).

## Round 5 — 2026-11-23: second idea round (hero on a mission, a threat, an ending)

Round 4's five ideas were all rejected. Thomas's earlier verdicts in the project (see taste log) show what was missing, so two questions were added to the interest test (mission + threat + ending; level one of a bigger game).

| # | Idea | Existing versions found | My doubt |
|---|---|---|---|
| 1 | Bait the beast: you are small and unarmed; a huge beast charges at you; step aside so it smashes what you need smashed | A very common boss pattern inside bigger games ([TV Tropes: Bullfight Boss](https://tvtropes.org/pmwiki/pmwiki.php/Main/BullfightBoss)); no standalone phone game built on it was found | One beast must stay interesting for a whole level |
| 2 | Don't look away: things in the dark only move where your lantern does not shine | Jam games ([The Night](https://colanderstudio.itch.io/thenight); Lurking in the Dark, GMTK 2019 winner); an old phone game (Darkest Fear 2); no current polished phone game found | Fear is hard to get right; Thomas found the Night Moth attic not creepy at first |
| 3 | Thin ice: wolves chase you over a frozen lake; your skating cracks the ice; lead them over it | Nitrome's Flash game [Thin Ice](https://nitrome.wiki.gg/wiki/Thin_Ice) (2007, 20 levels, skate to cut holes); a turn-based jam game (On Thin Ice, 7DRL 2025); no phone version found | Your own cracks trap you too, which is close to Snake |
| 4 | Candle thief: guards only see what is lit; blow out candles to make your own dark path; guards relight them | Jam and itch games (Snuffed Out, Aphotic Whispers, Let the Light Guide You) | Stealth can turn into waiting |
| 5 | Outrun the Flock for phones, rebuilt in the new art | Phone herding games exist (Sheepdog World on iOS, several simulators, a student 2v2 game) but none is a known hit | Not new; Thomas has played it for weeks |

Dropped: Pied Piper (many jam games and an old iPhone game), storm rescue by helicopter (polished phone games exist), tide crossing (walking is not fun as a toy), balloon on wind layers (not understood in 2 seconds), lamplighter (pure reacting).

My pick: 1 and 2.

## Round 4 — 2026-11-23: first idea round with the interest test (creatures optional)

Method: about 20 one-sentence ideas, action first, scored on the seven questions; a web check for an existing polished phone version of each finalist.

**Pitched to Thomas (5):**
| # | Idea | Existing versions found | Weakest question |
|---|---|---|---|
| 1 | Lava hose: spray water to freeze flowing lava into rock walls, steer the flow past the village | Jam games where you dig trenches or build barriers ([Lava: Divert the flow](https://josepvalls.itch.io/lava-1), Save Grindavik, Save Pompeii LD50); no hose-freezing phone game found. Real basis: Heimaey 1973 ([scienceinsights](https://scienceinsights.org/how-to-stop-lava-flow-walls-water-and-bombs/)) | 3: needs one second to see that water makes rock |
| 2 | Harbour tug: a tiny tugboat pushes a huge drifting ship into its dock | Jam game [Tugtris](https://aufdemrand.itch.io/tugtris) (tug physics + Tetris); Tug Boat Silly (tap-to-assign puzzle, Android); Ship Mooring (serious simulator, paid). No casual phone game where you are the tug | 5: weight has to feel good or it is slow |
| 3 | Trolley snake: push an ever longer row of shopping trolleys across a car park; the row whips and jackknifes | GMTK 2021 jam game [The Trolley Problem](https://grinky.itch.io/trolley-problem) (players: chaotic and entertaining); Steam game "Shopping Cart Pusher" announced; iOS "Cart Pusher!" is a gate runner | 7: a Steam game is coming |
| 4 | Timber: where you stand decides where the tree falls; trees knock each other over like dominoes | iOS hypercasual [Tree Master](https://apps.apple.com/us/app/tree-master/id1551438834) (aim the fall); several jam games | 4: a decision per tree, not per second |
| 5 | Long ladder: carry a six-metre ladder through a busy street; every turn swings both ends | Nothing found in one search (not exhaustive) | 1: could turn into dodging in disguise |

**Dropped after the check (polished or crowded on phones):** leaf blower (Leaf Blower Revolution 4.8★/2.1K ratings, Leaf Blower 3D, Leaf Blower!), water ripples pushing a boat (Tap The Water, Water Ripples 2014, Ripple Ruler GMTK 2023), icebreaker ship (Icebreaker Rescue and others). Dropped for other reasons: wildfire firebreak (same idea as lava, weaker toy), helicopter with water bucket (many rope helicopter games), plate spinning (pure reacting, which Thomas rejected in Night Ferry), curling sweeper (curling games exist), puppet on strings (motor skill, no decision).

My pick: 1 and 2. Lava is the strongest toy and suits our pixel light best; the tug is closest to why Flock works (small you, big thing with a will of its own, your position is the decision).

## Round 2 — 2026-11-23: which concepts fit the business plan (extended research report)

Full report: "Pixel Studio Game Concepts: Which Fit the Business Plan Best" (Claude research, 23 Nov 2026). Key points:
- Instagram ranks on watch time, likes and sends per reach; sends matter most for reaching non-followers (Adam Mosseri, Jan 2025). Design for clips people watch to the end and DM to a friend: cute animals, comic behaviour, chaos.
- Solo-dev precedents: Sledding Game (cute animals + physics chaos, top Instagram clip 2.3M views, 80k wishlists in week one); The Hive (one idea per post, gameplay over mood).
- Free-to-unlock conversion measured between 0.67% and ~5.5% for small games; price around EUR 3–5; players pay for more of a loop they love (modes, creatures, endless/daily). Direct web sales are undocumented: measure from day one; Android is the likely main revenue path for a hit (GUNCHO model).
- Poki: about half of players on phones; portrait recommended; ~3 minute loops, instant retry, goal visible on the first screen; originality matters for curation.
- Lighthouse, duckling, dandelion and turtle concepts are crowded on itch.io (many AI-assisted). Ranking: Red Dot (cats + laser) 26/30, Pheromone (ant trails) 25, Murmuration (starlings vs falcon) 24, Crow Watch 23, Duck Mother 22.

Uniqueness check (23 Nov): "herding cats with a laser pointer" exists as several small jam games (Laser Kittens, Cat Herder GGJ 2024, Herding Cats LD44, Wranglecrunk GMTK 2021) and a small Steam puzzle game "Cat Herder", but no polished phone-first version was found. Jam players' feedback: cats wander off too much and attention is hard to read; real cats pounce when the dot rests, then follow; laser battery limits felt frustrating.

## Round 1 — 2026-11-23: what works now, grid, style, first five concepts

### Findings

**Web games**
- Hypercasual is the top browser genre: CrazyGames' US data (May 2025–May 2026, 1.74 billion sessions) shows hypercasual ranked #1 for 79% of the year, puzzle for 21%. Average session about 30 minutes. [PocketGamer.biz](https://www.pocketgamer.biz/report-hypercasual-and-puzzle-games-dominate-the-browser-gaming-space/)
- Poki: 100M+ monthly players; typical session 11–20 minutes across 2–3 titles. [Poki State of Web Gaming 2026](https://poki.com/blog/state-of-web-gaming-report-2026)
- Poki car games: Drive Mad has 23.2% of car-game plays, nearly 4× the next title. Physics/platform car games are 7% of titles but 30% of plays. Named reasons: players instantly understand what to do, physics makes levels feel unpredictable, failing is part of the fun, quick restarts. [Poki Game Intelligence](https://poki.com/blog/game-intelligence-car-games)
- Popular on Poki in mid-2026: Subway Surfers, Drive Mad, Level Devil. Racing, platforming and other instantly legible genres are named as strong web candidates.

**Short-form clips**
- Clips must be understood by a stranger in the first second: fails, emergent chaos, satisfying loops, scale reveals. If it needs a caption to explain, viewers scroll. [FindClout](https://findclout.com/blog/how-to-market-an-indie-game-on-tiktok)
- Completion rate is the main signal; 15–30 s clips with a hook in the first 2 s and no build-up outperform. [Eklipse](https://blog.eklipse.gg/beginner-guide-2/tiktok-algorithm-gaming-creators.html)
- Hooks that work: spectacle, satisfaction, or "wait, what?". [Bugnet](https://bugnet.io/blog/tiktok-marketing-for-indie-games)

**Mobile casual**
- Puzzle is over 44% of casual revenue (H1 2026); hybrid-casual puzzles (Color Block Jam, Hexa Sort) lead the "flow"/sorting trend. [AppMagic via Mobidictum](https://mobidictum.com/casual-games-mobile-marketing-report-h1-2026/)

**Pixel grid**
- Integer scaling and one pixel size are the standard for clean pixel art; mixed pixel sizes are the most common visible flaw. Common bases are 320 × 180 / 640 × 360 landscape.

### Conclusions

1. **Grid:** 180 × 320 logical pixels, portrait, scaled 6× to exactly 1080 × 1920 for clips. On taller phones the width stays 180 and the visible height extends, so scaling stays integer with no side bars. 90 × 160 is too coarse for readable text and UI.
2. **Style:** bright, high-contrast limited palette (16 colours, original), large readable silhouettes, strong foreground/background contrast. Reason: clips are watched small and fast on phones.
3. **Game design rules from the data:** understood instantly, one-thumb control, failure is funny or dramatic, restart in under 1 second, short runs.
4. **Five concepts** (proven base + one twist, each with a first-second clip hook):

| # | Working title | Proven base | Twist | Clip hook |
| --- | --- | --- | --- | --- |
| 1 | Wobble Hauler | Physics vehicle platformer (Drive Mad) | Portrait: the course climbs upward, and you carry a wobbly stack of cargo | Cargo almost toppling mid-jump |
| 2 | Fair Trap | Troll platformer (Level Devil) | Every trap gives a tiny tell, so experts can read it | "Wait, what?" as the floor vanishes |
| 3 | Sky Stack | One-tap stacking | Real physics sway; the tower reacts to wind | Tall tower swaying, then collapse |
| 4 | Sort Flock | Colour-sorting puzzle (Hexa Sort) | Pieces are little creatures that walk home when sorted | Satisfying cascade of creatures running home |
| 5 | Near Miss | One-thumb dodge | Slow motion and a combo on every near miss | Slow-mo near miss |

Build order: 1 → 2 → 3 → 4 → 5 (strongest evidence and clip potential first). Background note: Thomas's earlier approved concepts (herding, moth chase) were not selected by this round; concept 4 borrows the "creatures going home" payoff only because sorting has strong data.
