from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import socket
import webbrowser

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, format, *args):
        # Keep terminal readable for business users while still showing important startup information.
        return


def is_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def start_server(port: int, open_browser: bool = False):
    for candidate in range(port, port + 30):
        if not is_port_available(candidate):
            continue
        server = ThreadingHTTPServer(("127.0.0.1", candidate), Handler)
        url = f"http://127.0.0.1:{candidate}/index.html"
        print("DP World Hybrid Workforce Platform", flush=True)
        print(f"Running locally at: {url}", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        if open_browser:
            webbrowser.open(url)
        server.serve_forever()
        return
    raise RuntimeError(f"No available local port between {port} and {port + 29}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the local DP World Hybrid Workforce Platform.")
    parser.add_argument("--port", type=int, default=8080, help="Preferred local port. Default: 8080")
    parser.add_argument("--open", action="store_true", help="Open the app in the default browser after starting.")
    args = parser.parse_args()
    try:
        start_server(args.port, args.open)
    except KeyboardInterrupt:
        print("\nServer stopped.", flush=True)
