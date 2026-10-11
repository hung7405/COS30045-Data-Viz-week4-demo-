"""
Simple HTTP server for the Appliance Energy website.
Run this from the project root directory:

    python serve.py

Then open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import os
import sys

PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # never cache HTML/CSV/JS — teacher always sees the latest numbers
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    handler = NoCacheHandler

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)


if __name__ == "__main__":
    main()
