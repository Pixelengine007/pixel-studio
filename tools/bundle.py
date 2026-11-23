"""Bundle a game into one self-contained HTML file (Phaser + studio.js + game inlined).

Usage:  python tools/bundle.py <game-folder> [--out dist/<game>.html]
The file works offline: double-click it on a computer, or send it to a phone and open it in the browser.
With --cdn, Phaser loads from jsDelivr instead of being inlined (for hosted web pages; needs internet).
With --site, a folder dist/<game>-site/ is written with index.html and phaser.min.js side by side:
publish both files together and the page needs nothing from another server.
"""
import argparse
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("game")
    ap.add_argument("--out")
    ap.add_argument("--cdn", action="store_true", help="load Phaser from jsDelivr instead of inlining it")
    ap.add_argument("--site", action="store_true", help="write index.html + phaser.min.js into dist/<game>-site/")
    a = ap.parse_args()
    game_dir = REPO / "games" / a.game
    html = (game_dir / "index.html").read_text()

    def inline(match):
        if a.site and "vendor/phaser-" in match.group(1):
            site.mkdir(parents=True, exist_ok=True)
            (site / "phaser.min.js").write_bytes((game_dir / match.group(1)).resolve().read_bytes())
            return '<script src="phaser.min.js"></script>'
        if a.cdn and "vendor/phaser-" in match.group(1):
            version = re.search(r"phaser-([0-9.]+)\.min\.js", match.group(1)).group(1)
            return f'<script src="https://cdn.jsdelivr.net/npm/phaser@{version}/dist/phaser.min.js"></script>'
        src = (game_dir / match.group(1)).resolve()
        code = src.read_text().replace("</script>", "<\\/script>")
        return f"<script>\n{code}\n</script>"

    site = REPO / "dist" / f"{a.game}-site"
    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    out = site / "index.html" if a.site else Path(a.out) if a.out else REPO / "dist" / (f"{a.game}-web.html" if a.cdn else f"{a.game}.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    print(f"Bundle: {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
