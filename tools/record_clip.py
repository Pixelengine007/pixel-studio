"""Clip recorder: records a game frame by frame and makes a smooth 1080 x 1920 MP4 with its own sound.

Usage:  python tools/record_clip.py <game-folder> [--seconds 15] [--seed 3] [--policy intended]
                                    [--skip 0] [--out clips/<game>-<seed>.mp4]

- Every frame is a fixed 1/60 s step, so the clip is perfectly smooth and repeatable.
- The game's logical 180 x 320 pixels are scaled 6x with nearest-neighbour: crisp pixels, no blur.
- Sound comes from the game's own sound events, rendered offline (original audio only).
- --skip fast-forwards N seconds without recording, so the clip can open on the hook.
- If the run ends (win or loss), the recorder taps after 0.5 s to restart, so clips never freeze.
"""
import argparse
import base64
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

from browser import REPO, STRATEGIES_JS, launch, open_game, serve_repo

BATCH_JS = """
([policyName, n, capture]) => {
  const S = window.__studio;
  if (!S._clip) S._clip = { policies: %s, f: 0, endF: -1 };
  const c = S._clip;
  const shots = [];
  for (let i = 0; i < n; i++) {
    const st = S.api.status();
    let inp;
    if (st.state !== 'playing') {
      if (c.endF < 0) c.endF = c.f;
      inp = { down: (c.f - c.endF) === 30 };
    } else {
      c.endF = -1;
      const pol = c.policies[policyName] || ((o, f) => S.api.policies[policyName](o, f));
      inp = pol(S.api.observe(), c.f);
    }
    S.setInput(inp);
    S.step(1);
    c.f++;
    if (capture) shots.push(S.capture().split(',')[1]);
  }
  return shots;
}
""" % STRATEGIES_JS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("game")
    ap.add_argument("--query", default="", help='extra URL parameters for the game, e.g. "level=2"')
    ap.add_argument("--seconds", type=float, default=15)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--policy", default="intended")
    ap.add_argument("--skip", type=float, default=0, help="seconds to fast-forward before recording")
    ap.add_argument("--scale", type=int, default=6)
    ap.add_argument("--smooth", action="store_true", help="painted games: scale to 1080 wide with a smooth filter")
    ap.add_argument("--out")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is required")
    out = Path(args.out) if args.out else REPO / "clips" / f"{args.game}-seed{args.seed}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    frames = int(round(args.seconds * 60))
    errors = []

    with tempfile.TemporaryDirectory() as tmp, serve_repo() as base, sync_playwright() as p:
        tmp = Path(tmp)
        browser = launch(p)
        page = open_game(browser, base, args.game, "clip", args.seed, errors, args.query)
        if errors:
            sys.exit("\n".join(errors))
        skip = int(round(args.skip * 60))
        if skip:
            page.evaluate(BATCH_JS, [args.policy, skip, False])
        start_second = page.evaluate("window.__studio.frameIndex / 60")
        idx = 0
        while idx < frames:
            n = min(60, frames - idx)
            for shot in page.evaluate(BATCH_JS, [args.policy, n, True]):
                (tmp / f"f{idx:05d}.png").write_bytes(base64.b64decode(shot))
                idx += 1
        wav = page.evaluate("([s, a]) => window.__studio.renderAudio(s, a)", [args.seconds, start_second])
        (tmp / "audio.wav").write_bytes(base64.b64decode(wav))
        browser.close()
        if errors:
            print("\n".join(sorted(set(errors))), file=sys.stderr)

        cmd = [
            "ffmpeg", "-y", "-v", "error", "-framerate", "60", "-i", str(tmp / "f%05d.png"),
            "-i", str(tmp / "audio.wav"),
            "-vf", ("scale=1080:-2:flags=lanczos" if args.smooth else f"scale=iw*{args.scale}:ih*{args.scale}:flags=neighbor"),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(out),
        ]
        subprocess.run(cmd, check=True)
    print(f"Clip: {out} ({args.seconds:.0f}s, seed {args.seed}, policy {args.policy})")


if __name__ == "__main__":
    main()
