#!/usr/bin/env python3
"""Local dev server for the Parsecs starmap.

Sends no-cache headers so your browser always loads the latest files.
Usage:  python3 serve.py [port]     (default 8000)
"""

import http.server
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    with Server(("", PORT), Handler) as httpd:
        print(f"Parsecs starmap: http://localhost:{PORT}/   (Ctrl+C to stop)")
        print(f"Seeing an old version? Open a new URL instead: http://localhost:{PORT}/?v=6")
        print("(this server already sends no-cache headers, so normal reloads will update after that.)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
