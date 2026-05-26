from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import random
import sys
import threading
import time

ROOT = Path(__file__).parent.resolve()

layout_pattern = re.compile(
    r'<!--\s*#\s*layout\s+file\s*=\s*"([^"]+)"\s*-->',
    re.IGNORECASE
)

block_pattern = re.compile(
    r'<!--\s*#\s*block\s+name\s*=\s*"([^"]+)"\s*-->\s*(.*?)\s*<!--\s*#\s*endblock\s*-->',
    re.DOTALL | re.IGNORECASE
)

include_pattern = re.compile(
    r'<!--\s*#\s*include\s+file\s*=\s*"([^"]+)"\s*-->',
    re.IGNORECASE
)

stats_pattern = re.compile(
    r'<!--\s*#\s*(views|updates|followers)\s*-->',
    re.IGNORECASE
)

reload_version = 0

RELOAD_SCRIPT = """
<script>
const es = new EventSource("/__events__");

es.onmessage = () => {
    location.reload();
};
</script>
"""

clients = []
_last_mtime = 0

def scan_mtime():
    latest = 0
    for p in ROOT.rglob("*"):
        if p.is_file():
            try:
                latest = max(latest, p.stat().st_mtime)
            except OSError:
                pass
    return latest

def watcher():
    global _last_mtime

    _last_mtime = scan_mtime()

    while True:
        time.sleep(0.5)

        current = scan_mtime()

        if current > _last_mtime:
            _last_mtime = current

            dead = []

            for wfile in clients:
                try:
                    wfile.write(b"data: reload\n\n")
                    wfile.flush()
                except Exception:
                    dead.append(wfile)

            for d in dead:
                clients.remove(d)

def get_site_stat(name: str) -> str:
    """
    Fake site stats for testing.
    Replace with real DB/API logic later.
    """

    fake_stats = {
        "views": random.randint(0, 1_000),
        "updates": random.randint(10, 500),
        "followers": random.randint(0, 1_000),
    }

    return str(fake_stats[name.lower()])

def resolve_path(current_file: Path, relative: str) -> Path:
    """
    Resolve SSI paths.

    ~/file.html -> project root
    ./file.html or ../file.html -> relative to current file
    """

    if relative.startswith("~/"):
        path = ROOT / relative[2:]
    else:
        path = current_file.parent / relative

    resolved = path.resolve()

    try:
        resolved.relative_to(ROOT)
    except ValueError:
        raise ValueError(f"Access outside ROOT denied: {relative}")

    return resolved

def process_file(filepath: Path, visited=None) -> str:
    filepath = filepath.resolve()

    if visited is None:
        visited = set()

    # prevent circular includes
    if filepath in visited:
        raise RuntimeError(
            f"Circular include detected:\n{filepath}"
        )

    visited.add(filepath)

    if not filepath.exists():
        raise FileNotFoundError(filepath)

    content = filepath.read_text(
        encoding="utf-8"
    )

    
    # handle layout
    layout_match = layout_pattern.search(content)

    if layout_match:
        layout_path = resolve_path(
            filepath,
            layout_match.group(1)
        )

        # remove layout directive
        content = layout_pattern.sub(
            "",
            content,
            count=1
        )

        # collect page blocks
        page_blocks = {
            name.strip(): body.strip()
            for name, body in block_pattern.findall(content)
        }

        # load layout RAW
        layout_content = process_file(
            layout_path,
            visited.copy()
        )

        # replace layout blocks
        def replace_block(match):
            name = match.group(1).strip()
            default = match.group(2).strip()

            return page_blocks.get(
                name,
                default
            )

        content = block_pattern.sub(
            replace_block,
            layout_content
        )

    def replace_include(match):
        include_path = resolve_path(
            filepath,
            match.group(1)
        )

        return process_file(
            include_path,
            visited.copy()
        )

    content = include_pattern.sub(
        replace_include,
        content
    )
    
    def replace_stats(match):
        stat_name = match.group(1)
        return get_site_stat(stat_name)

    content = stats_pattern.sub(
        replace_stats,
        content
    )

    return content

class SSIHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        """
        Serve static files from ROOT
        instead of cwd.
        """
        path = path.split("?", 1)[0]
        path = path.lstrip("/")

        return str(
            (ROOT / path).resolve()
        )

    def do_GET(self):
        if self.path == "/__events__":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            clients.append(self.wfile)

            try:
                while True:
                    time.sleep(3600)  # keep alive
            except Exception:
                if self.wfile in clients:
                    clients.remove(self.wfile)

            return

        path = self.path.split("?", 1)[0]

        if path == "/":
            path = "/index.html"

        full_path = (
            ROOT / path.lstrip("/")
        ).resolve()

        try:
            full_path.relative_to(ROOT)
        except ValueError:
            self.send_error(403)
            return

        # SSI for HTML files only
        if full_path.suffix == ".html":
            try:
                content = process_file(
                    full_path
                )

                if "</body>" in content:
                    content = content.replace(
                        "</body>",
                        RELOAD_SCRIPT + "\n</body>"
                    )
                else:
                    content += RELOAD_SCRIPT

                self.send_response(200)
                self.send_header(
                    "Content-Type",
                    "text/html; charset=utf-8"
                )
                self.end_headers()

                self.wfile.write(
                    content.encode("utf-8")
                )

            except FileNotFoundError:
                self.send_error(
                    404,
                    "File not found"
                )

            except Exception as e:
                self.send_error(
                    500,
                    str(e)
                )

            return

        # normal static file serving
        super().do_GET()

def main():
    server = ThreadingHTTPServer(
        ("localhost", 8000),
        SSIHandler
    )

    # default page to open
    open_page = "/"

    if len(sys.argv) > 1:
        open_page = sys.argv[1].lstrip("/")

    url = f"http://localhost:8000/{open_page}"

    print("Server running:")
    print(url)
    print("Press Ctrl+C to stop")

    try:
        threading.Thread(target=watcher, daemon=True).start()
        server.serve_forever()

    except KeyboardInterrupt:
        print("\nStopping server...")

    finally:
        server.server_close()
        print("Server stopped")


if __name__ == "__main__":
    main()