# Game lessons (from our own builds)

Read before starting a new game. Newest game first; each lesson says what to do differently.

## From Shell Swap (Nov 2026)

1. **Run a greedy bot against the first playable.** If "do the obvious thing for each creature" wins fast, the game is a matching task. Shell Swap's single level fell in 9 s; waves delivering crabs over time fixed it.
2. **Check every threat has an answer.** A gull aimed at a crab that no free shell could save made losses random, not skill-based. For each threat, make sure the player has at least one possible move.
3. **Clip the beach with the best moment, not the start of the campaign.** Use `--query level=N`, and cut the clip on the result panel.

## From Red Dot (Nov 2026)

1. **Calibrate with human-like bots from day one.** A perfect bot tells you nothing about difficulty. Build `intended` + `casual` (shaky thumb, slow reactions, lifts finger) + `clumsy` policies with the first playable, and set timers from their results.
2. **One fixed playfield for every phone.** Extra height on tall phones is decoration (wall, sky, sea), never playfield. Otherwise the game is harder on some phones than in the clips.
3. **Timers start on the first tap, not on load.** Title screen first in play mode; clip and bot modes skip it.
4. **The stars of the clip must be big.** Characters at least ~24 px wide on the 180 × 320 grid; 16 px creatures read as specks on a phone.
5. **Check the starting layout for free wins.** Nothing that matters should start next to the goal.
6. **The goal must read without text.** Give it a distinct object, a mat or arrow, and contrast with the floor.
7. **Progress must be undoable by the living system.** Restless cats climbing out made Red Dot a juggling game instead of a checklist. Plan the "undo" force from the start.
8. **Drama must happen in normal play.** Red Dot's vase only breaks with messy play; bots and clips never show it. Put the big moments on the main path (timed threats, chain reactions).
9. **The first second of the clip must already be action.** Red Dot's clip opens calmly. Next games should open on the hook (a threat arriving, a chain starting).
10. **Test real play mode on a touch viewport before calling it done.** The title-timer bug and the tall-phone layout only showed there.
11. **Dragged things sit above the thumb** (about 20 px) so the finger never hides them.
12. **Different core verb each game.** Red Dot is "drag a lure". The next game should use a different action so the studio does not repeat itself.

## From the first phone test (Nov 2026)

1. **No Phaser blend modes.** Shell Swap's MULTIPLY sunset worked in our headless Chrome but rendered as a solid white sheet on Thomas's browser. Use plain alpha tints for light and mood.
2. **Deliver games as links, not files.** Phone file previews often show HTML without running scripts. Publish a web page (`tools/bundle.py --cdn`) or use GitHub Pages.

## Night Ferry (side view), 23 Nov 2026
- Thomas: "graphics are good, gameplay is boring and does not really work". Two art passes were spent before the core action had been judged by a human.
- Rule from now on: build a playable feel test of only the core action first, send it to Thomas, and polish only after he says the feel works.
- Bots prove a game can be won, never that it is fun. Also test "doing nothing": in River Run v1 doing nothing won every run, because bumping the banks acted like guide rails.
- A strong core action needs a decision the player makes every few seconds, plus a visible cause → effect (I crashed → a spirit flew out → I can steer over it to save it).

## Black screen on toy 2, 23 Nov 2026
- Thomas saw a black screen right after I published a new version onto a link he already had open. The published file was byte-identical to one that ran in my phone-sized and desktop tests, so I could not reproduce it.
- Changes: links for Thomas are now built with `tools/bundle.py <game> --site` (index.html + phaser.min.js published together, nothing loaded from another server), every page shows "Loading..." and then any error as text on the screen, and a changed toy goes on a fresh link instead of replacing a page he may have open.
- If a page is ever blank again, the first question is what the screen says, not a guess.

## Using the engine is not the same as matching the look (Tanglefoot, 24 Nov 2026)
- The first Tanglefoot picture used the Night Ferry pixel engine and still did not look like Night Ferry; Thomas saw it at once. The look is the composition (sky, moon, layers, mist, light pools, characters with faces), not the renderer.
- Before sending any new art: put a screenshot next to Night Ferry at the same size and compare. If the new one has fewer layers, flatter ground, smaller or faceless characters, it is not ready.

## Review by staging, not by watching a bot (Tanglefoot, 24 Nov 2026)
- The bot's run never showed the worst mistakes. Staging them did: put the hero behind every tall thing, walk an enemy into every edge of the field, make something fall in each direction, then look at the screenshot.
- Measure the cost of one frame against a game that is known to run well on Thomas's phone, with the field at its busiest, before sending.
- Count the letters: at text size 2 a line holds 29 characters, less inside a panel.
- Play the retry path: from the end screen back into play must be one tap.
- With a tilted ground, steer in screen directions and convert to ground, not the other way round.
- Look at the picture itself, not only at situations: exact pixel size, cut into regions, enlarged three times, normal and tall screen. Colours borrowed from another part of the palette (cloud blue for dust), things painted "on top so they are visible" (rope loops), and anything laid flat that should stand up (mist) only show up this way.
