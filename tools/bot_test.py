"""Bot tester: plays a game many times with simple strategies and reports what happens.

Usage:  python tools/bot_test.py <game-folder> [--runs 10] [--max-seconds 120]

What it tells you (mechanics only, never fun):
- errors in the page (always a blocker)
- whether a trivial strategy (idle, spam, hold, random) can win -> too easy or exploitable
- whether the intended strategy can win -> too hard or broken
- how long runs last and what scores look like
"""
import argparse
import json
import statistics
import sys
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

from browser import REPO, STRATEGIES_JS, launch, open_game, serve_repo

EPISODE_JS = """
([strategy, maxFrames]) => {
  const S = window.__studio;
  const strategies = %s;
  const policy = strategies[strategy];
  let f = 0;
  let status = S.api.status();
  while (status.state === 'playing' && f < maxFrames) {
    const o = S.api.observe();
    S.setInput(policy(o, f));
    S.step(1);
    f++;
    status = S.api.status();
  }
  return { frames: f, state: f >= maxFrames && status.state === 'playing' ? 'timeout' : status.state,
           score: status.score, time: status.time };
}
""" % STRATEGIES_JS

TRIVIAL = ["idle", "spam", "hold", "random"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("game")
    ap.add_argument("--runs", type=int, default=10, help="runs per strategy (different seeds)")
    ap.add_argument("--max-seconds", type=float, default=120)
    ap.add_argument("--strategies", default="idle,spam,hold,random,intended")
    args = ap.parse_args()

    strategies = args.strategies.split(",")
    max_frames = int(args.max_seconds * 60)
    errors, results = [], {s: [] for s in strategies}

    with serve_repo() as base, sync_playwright() as p:
        browser = launch(p)
        for strategy in strategies:
            for seed in range(1, args.runs + 1):
                page = open_game(browser, base, args.game, "bot", seed, errors)
                if page.evaluate("!!window.__studio.api"):
                    results[strategy].append(page.evaluate(EPISODE_JS, [strategy, max_frames]))
                page.close()
        browser.close()

    summary, warnings = {}, []
    for s, runs in results.items():
        if not runs:
            continue
        wins = sum(r["state"] == "won" for r in runs)
        summary[s] = {
            "runs": len(runs),
            "win_rate": round(wins / len(runs), 2),
            "timeouts": sum(r["state"] == "timeout" for r in runs),
            "avg_score": round(statistics.mean(r["score"] for r in runs), 1),
            "avg_seconds": round(statistics.mean(r["time"] for r in runs), 1),
            "min_seconds": round(min(r["time"] for r in runs), 1),
        }
        if s in TRIVIAL and wins:
            warnings.append(f"'{s}' can win ({wins}/{len(runs)}): the game is too easy or has an exploit")
        if s in TRIVIAL and summary[s]["timeouts"]:
            warnings.append(f"'{s}' never ends in {args.max_seconds:.0f}s: possible stall or missing fail state")
    if "intended" in summary and summary["intended"]["win_rate"] == 0:
        warnings.append("the intended strategy never wins: too hard, or the policy/game is broken")

    report = {
        "game": args.game,
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "errors": sorted(set(errors)),
        "warnings": warnings,
        "summary": summary,
        "note": "Mechanical evidence only. It does not show that the game is fun.",
    }
    out_dir = REPO / "out" / "bot" / args.game
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "report.json").write_text(json.dumps(report, indent=2))

    print(f"Bot test: {args.game}")
    print(f"{'strategy':<10} {'win%':>5} {'avg score':>9} {'avg s':>6} {'min s':>6} {'timeouts':>8}")
    for s, v in summary.items():
        print(f"{s:<10} {v['win_rate'] * 100:>5.0f} {v['avg_score']:>9} {v['avg_seconds']:>6} {v['min_seconds']:>6} {v['timeouts']:>8}")
    for w in warnings:
        print(f"WARNING: {w}")
    for e in report["errors"]:
        print(f"ERROR: {e}")
    print(f"Report: {out_dir / 'report.json'}")
    sys.exit(1 if report["errors"] else 0)


if __name__ == "__main__":
    main()
