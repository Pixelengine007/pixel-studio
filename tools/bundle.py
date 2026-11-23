"""Bundle a game into one self-contained HTML file (Phaser + studio.js + game inlined).

Usage:  python tools/bundle.py <game-folder> [--out dist/<game>.html]
The file works offline: double-click it on a computer, or send it to a phone and open it in the browser.
"""
import argparse
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("game")
    ap.add_argument("--out")
    a = ap.parse_args()
    game_dir = REPO / "games" / a.game
    html = (game_dir / "index.html").read_text()

    def inline(match):
        src = (game_dir / match.group(1)).resolve()
        code = src.read_text().replace("</script>", "<\\/script>")
        return f"<script>\n{code}\n</script>"

    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    out = Path(a.out) if a.out else REPO / "dist" / f"{a.game}.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    print(f"Bundle: {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
