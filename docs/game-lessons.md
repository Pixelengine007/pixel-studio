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
