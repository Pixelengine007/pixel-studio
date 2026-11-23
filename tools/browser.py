"""Shared helpers for the tools: serve the repository locally and open a game in headless Chrome."""
import contextlib
import functools
import http.server
import os
import shutil
import socketserver
import threading
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextlib.contextmanager
def serve_repo():
    """Serve the repository root on a free localhost port, like GitHub Pages would."""
    handler = functools.partial(_QuietHandler, directory=str(REPO))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        port = httpd.server_address[1]
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{port}"
        finally:
            httpd.shutdown()


def launch(playwright):
    """Use a system Chrome if present, otherwise Playwright's bundled Chromium."""
    path = os.environ.get("CHROME_PATH") or shutil.which("google-chrome") or shutil.which("chromium")
    args = ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]
    if path:
        return playwright.chromium.launch(executable_path=path, args=args)
    return playwright.chromium.launch(args=args)


def open_game(browser, base_url, game, mode, seed, errors, query=""):
    """Open games/<game>/ in bot or clip mode and wait until its API is registered.
    `query` adds extra URL parameters, e.g. "level=2"."""
    page = browser.new_page(viewport={"width": 360, "height": 640})
    page.on("pageerror", lambda e: errors.append(f"page error: {e}"))
    page.on("console", lambda m: errors.append(f"console {m.type}: {m.text}") if m.type == "error" else None)
    page.goto(f"{base_url}/games/{game}/index.html?mode={mode}&seed={seed}" + (f"&{query}" if query else ""))
    page.wait_for_function("window.__studio && window.__studio.ready", timeout=20000)
    # Step until the first scene has run create() and registered its API.
    page.evaluate("""() => { let i = 0; while (!window.__studio.api && i < 120) { window.__studio.step(1); i++; } }""")
    if not page.evaluate("!!window.__studio.api"):
        errors.append("game never registered its API (Studio.registerApi)")
    return page


# JavaScript strategies shared by the bot tester and the clip recorder.
# Each returns the input for this frame. `o` is the game's observation, `f` the frame number.
STRATEGIES_JS = """
(() => {
  const S = window.__studio;
  const r = S.rng(S.seed * 7919 + 13);
  return {
    idle: () => ({ down: false }),
    spam: (o, f) => ({ down: f % 2 === 0 }),
    hold: () => ({ down: true }),
    random: () => ({ down: r() < 0.08, left: r() < 0.3, right: r() < 0.3 }),
    intended: (o, f) => (S.api.policies && S.api.policies.intended ? S.api.policies.intended(o, f) : { down: false }),
  };
})()
"""
