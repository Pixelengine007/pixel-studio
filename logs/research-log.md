# Research log

Every research round: date, question, findings with sources, conclusion. Newest first.

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
