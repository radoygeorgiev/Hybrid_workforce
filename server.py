"""Serve the local prototype and persist its workspace in SQLite."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs, quote
import argparse
import json
import math
import re
import sqlite3
import uuid
import webbrowser
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parent
MAX_WORKSPACE = 10_000_000
MAX_FILE = 25_000_000


def validate_workspace(value):
    if not isinstance(value, dict) or value.get("schemaVersion") != 2:
        raise ValueError("Use a version 2 workspace.")
    cases, configs = value.get("cases"), value.get("configs")
    if not isinstance(cases, list) or not 1 <= len(cases) <= 200 or not isinstance(configs, list) or not 1 <= len(configs) <= 500:
        raise ValueError("The case or configuration list is invalid.")
    for group in (cases, configs):
        if any(not isinstance(x, dict) or not isinstance(x.get("id"), str) or not x["id"] for x in group):
            raise ValueError("Each record needs an identifier.")
        if len({x["id"] for x in group}) != len(group):
            raise ValueError("Record identifiers must be unique.")
    config_ids = {x["id"] for x in configs}
    for c in cases:
        if not all(isinstance(c.get(key), dict) for key in ("baseline", "economics", "deployment")) or not all(isinstance(c.get(key), list) for key in ("actions", "scenarios", "sources", "observations")):
            raise ValueError("A case is incomplete.")
        if "inputGroups" in c:
            groups = c["inputGroups"]
            valid_ids = {"layout", "process", "demand", "inventory", "workforce", "automation", "capabilities", "status", "constraints", "rules", "traffic", "sensors"}
            statuses = {"Sample", "Assumed", "Supplier claim", "Simulated", "Measured", "Unknown", "Out of date"}
            if not isinstance(groups, dict):
                raise ValueError("Input groups must be an object.")
            for key, record in groups.items():
                if key not in valid_ids or not isinstance(record, dict) or any(not isinstance(v, str) or len(v) > 20000 for v in record.values()):
                    raise ValueError("An input group is invalid.")
                if record.get("status") and record["status"] not in statuses:
                    raise ValueError("An input data status is invalid.")
                if record.get("sourceId") and not any(s.get("id") == record["sourceId"] for s in c["sources"] if isinstance(s, dict)):
                    raise ValueError("An input source is missing.")
        if len(c["actions"]) > 500 or not c["scenarios"] or len(c["scenarios"]) > 500 or len(c["observations"]) > 10000:
            raise ValueError("A case exceeds the local record limit.")
        for group in (c["baseline"], c["economics"]):
            if any(type(n) in (int, float) and (not math.isfinite(n) or n < 0) for n in group.values()):
                raise ValueError("Planning numbers must be non-negative or unknown.")
        if "study" in c:
            study = c["study"]
            if not isinstance(study, dict) or not isinstance(study.get("settings"), dict) or not isinstance(study.get("benchmarks"), list) or not isinstance(study.get("requests"), list):
                raise ValueError("Invalid simulation study.")
            if len(study["settings"]) > 100 or any(not isinstance(v, str) or len(v) > 20000 for v in study["settings"].values()) or len(study["benchmarks"]) > 500 or len(study["requests"]) > 500:
                raise ValueError("Study record limit or setting is invalid.")
            if "revision" in study and (type(study["revision"]) is not int or study["revision"] < 1):
                raise ValueError("Invalid AWS plan revision.")
            benchmark_ids = set()
            for record in study["benchmarks"]:
                if not isinstance(record, dict) or any(not isinstance(record.get(k), str) or not record[k].strip() or len(record[k]) > 20000 for k in ("id", "configId", "policy", "policyKind", "protocol", "taskVersion", "sceneVersion", "conditions", "source", "evidence", "date")):
                    raise ValueError("Benchmark identity and evidence are required.")
                if record["id"] in benchmark_ids or record["configId"] not in config_ids or record["evidence"] not in ("Sample", "Simulated", "Measured") or record["policyKind"] not in ("Baseline", "Refined", "Scripted"):
                    raise ValueError("Invalid benchmark identity or evidence.")
                if "studyRevision" in record and (type(record["studyRevision"]) is not int or record["studyRevision"] < 1):
                    raise ValueError("Invalid benchmark AWS plan revision.")
                benchmark_ids.add(record["id"])
                if type(record.get("caseRevision")) is not int or record["caseRevision"] < 1 or type(record.get("attempts")) is not int or not 1 <= record["attempts"] <= 10000000 or type(record.get("successes")) is not int or not 0 <= record["successes"] <= record["attempts"]:
                    raise ValueError("Invalid benchmark counts or revision.")
                for key in ("cycleSec", "recoverySec", "energyKwh"):
                    n = record.get(key)
                    if n is not None and (type(n) not in (int, float) or not math.isfinite(n) or n < 0 or key == "cycleSec" and n == 0):
                        raise ValueError("Invalid benchmark timing or energy.")
                n = record.get("interventions")
                if n is not None and (type(n) is not int or n < 0):
                    raise ValueError("Invalid intervention count.")
            for record in study["requests"]:
                if not isinstance(record, dict) or not isinstance(record.get("id"), str) or record.get("stage") not in ("capture", "robots", "task", "data", "benchmark", "des", "learning", "review") or record.get("status") != "Prepared locally" or type(record.get("caseRevision")) is not int or record["caseRevision"] < 1 or not isinstance(record.get("date"), str):
                    raise ValueError("Invalid study request record.")
        ids = {a.get("id") for a in c["actions"] if isinstance(a, dict)}
        if len(ids) != len(c["actions"]) or None in ids:
            raise ValueError("Action identifiers must be unique.")
        for a in c["actions"]:
            capabilities = a.get("requiredCapabilities")
            if capabilities is not None and (not isinstance(capabilities, list) or len(capabilities) > 50 or any(not isinstance(x, str) or len(x) > 120 for x in capabilities)):
                raise ValueError("Action capabilities must be a short text list.")
            if "humanRetained" in a and not isinstance(a["humanRetained"], bool):
                raise ValueError("Retained human flag must be true or false.")
            for key in ("seconds", "frequency", "payloadKg", "reachM", "aisleM"):
                n = a.get(key)
                if n is not None and (type(n) not in (int, float) or not math.isfinite(n) or n < 0):
                    raise ValueError("Action numbers must be non-negative or unknown.")
        for s in c["scenarios"]:
            if not isinstance(s, dict) or not isinstance(s.get("assignments"), dict) or not isinstance(s.get("counts"), dict):
                raise ValueError("A scenario is incomplete.")
            if any(key not in ids or actor != "human" and actor not in config_ids for key, actor in s["assignments"].items()):
                raise ValueError("An assignment has a missing action or configuration.")
            if any(key not in config_ids or type(count) is not int or not 0 <= count <= 100 for key, count in s["counts"].items()):
                raise ValueError("A fleet count is invalid.")
    for config in configs:
        for key in ("price", "leaseMonthly", "supportAnnual", "energyAnnual", "extraCapex", "extraOpexAnnual"):
            value = config.get(key)
            if value is not None and (type(value) not in (int, float) or not math.isfinite(value) or value < 0):
                raise ValueError("Technology costs must be non-negative numbers or unknown.")
        capabilities = config.get("capabilities")
        if capabilities is not None and (not isinstance(capabilities, list) or len(capabilities) > 50 or any(not isinstance(x, str) or len(x) > 120 for x in capabilities)):
            raise ValueError("Configuration capabilities must be a short text list.")
    # JSON has no NaN or infinity. Reject them at every nesting level.
    json.dumps(value, allow_nan=False)
    return value


class Database:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, version INTEGER NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, size INTEGER NOT NULL)")

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def read(self):
        with self.connect() as db:
            row = db.execute("SELECT payload,version FROM workspace WHERE id=1").fetchone()
        return {"workspace": json.loads(row[0]) if row else None, "version": row[1] if row else 0}

    def save(self, workspace, version):
        validate_workspace(workspace)
        if type(version) is not int or version < 0:
            raise ValueError("The database version is invalid.")
        payload = json.dumps(workspace, allow_nan=False, ensure_ascii=False)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT version FROM workspace WHERE id=1").fetchone()
            current = row[0] if row else 0
            if version != current:
                return None
            next_version = current + 1
            db.execute("INSERT INTO workspace(id,payload,version) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=excluded.version", (payload, next_version))
        return next_version


def make_handler(data_dir=None, root=ROOT):
    root = Path(root).resolve()
    data_dir = Path(data_dir or root / ".data").resolve()
    db = Database(data_dir / "workspace.sqlite3")
    file_dir = data_dir / "files"
    file_dir.mkdir(parents=True, exist_ok=True)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)

        def setup(self):
            super().setup()
            self.connection.settimeout(15)

        def reject_write_origin(self):
            # Consume a bounded request before closing, so Windows can deliver the error response.
            try:
                self.read_body(MAX_WORKSPACE)
            except (ValueError, OSError):
                pass
            return self.json_response({"error": "Cross-origin writes are not accepted."}, 403)

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "same-origin")
            super().end_headers()

        def log_message(self, *args):
            pass

        def origin_allowed(self):
            host = self.headers.get("Host", "").lower()
            allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
            if host not in allowed:
                return False
            origin = self.headers.get("Origin")
            if origin:
                parsed = urlparse(origin)
                if parsed.scheme != "http" or parsed.netloc.lower() not in allowed:
                    return False
            return True

        def json_response(self, value, status=200):
            body = json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass

        def read_body(self, limit):
            try:
                size = int(self.headers.get("Content-Length", "-1"))
            except ValueError:
                raise ValueError("The content length is invalid.")
            if not 0 <= size <= limit:
                raise ValueError("The request is too large or has no content length.")
            body = self.rfile.read(size)
            if len(body) != size:
                raise ValueError("The file transfer is incomplete.")
            return body

        def do_GET(self):
            if not self.origin_allowed():
                return self.json_response({"error": "This service accepts same-origin loopback requests only."}, 403)
            path = urlparse(self.path).path
            if path == "/api/workspace":
                return self.json_response(db.read())
            if path == "/api/health":
                return self.json_response({"status": "ok", "storage": "SQLite", "schemaVersion": 2, "externalRobotics": "Not connected"})
            if path.startswith("/api/files/"):
                file_id = path.rsplit("/", 1)[-1]
                if not re.fullmatch(r"[a-f0-9]{32}", file_id):
                    return self.json_response({"error": "The file identifier is invalid."}, 400)
                with db.connect() as connection:
                    row = connection.execute("SELECT name,size FROM files WHERE id=?", (file_id,)).fetchone()
                target = file_dir / file_id
                if not row or not target.is_file():
                    return self.json_response({"error": "The file was not found."}, 404)
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", "attachment; filename*=UTF-8''" + quote(row[0]))
                self.send_header("Content-Length", str(target.stat().st_size))
                self.end_headers()
                with target.open("rb") as stream:
                    while chunk := stream.read(65536):
                        self.wfile.write(chunk)
                return
            if path.startswith("/api/"):
                return self.json_response({"error": "The local service was not found."}, 404)
            return super().do_GET()

        def translate_path(self, path):
            target = Path(super().translate_path(path)).resolve()
            try:
                relative = target.relative_to(root)
            except ValueError:
                return str(root / "__blocked__")
            if any(part.startswith(".") for part in relative.parts):
                return str(root / "__blocked__")
            return str(target)

        def list_directory(self, path):
            self.send_error(403, "Directory listing is disabled.")
            return None

        def do_PUT(self):
            if not self.origin_allowed():
                return self.reject_write_origin()
            if urlparse(self.path).path != "/api/workspace":
                return self.json_response({"error": "The local service was not found."}, 404)
            try:
                value = json.loads(self.read_body(MAX_WORKSPACE).decode("utf-8"), parse_constant=lambda s: (_ for _ in ()).throw(ValueError("Non-finite numbers are not valid JSON.")))
                version = db.save(value["workspace"], value["version"])
                if version is None:
                    return self.json_response({"error": "A newer workspace exists. Preserve your local copy before reloading."}, 409)
                return self.json_response({"version": version})
            except (ValueError, KeyError, TypeError, UnicodeError) as error:
                return self.json_response({"error": str(error)}, 400)

        def do_POST(self):
            if not self.origin_allowed():
                return self.reject_write_origin()
            if urlparse(self.path).path != "/api/files":
                return self.json_response({"error": "The local service was not found."}, 404)
            try:
                name = parse_qs(urlparse(self.path).query).get("name", ["source-file"])[0]
                name = re.split(r"[/\\]", name)[-1].replace("\x00", "")[:200] or "source-file"
                content = self.read_body(MAX_FILE)
                file_id = uuid.uuid4().hex
                (file_dir / file_id).write_bytes(content)
                with db.connect() as connection:
                    connection.execute("INSERT INTO files(id,name,size) VALUES(?,?,?)", (file_id, name, len(content)))
                return self.json_response({"id": file_id, "name": name, "size": len(content)}, 201)
            except (ValueError, OSError) as error:
                return self.json_response({"error": str(error)}, 400)

    return Handler


def start_server(port=8080, open_browser=False, data_dir=None):
    handler = make_handler(data_dir)
    for candidate in range(port, min(port + 30, 65536)):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", candidate), handler)
        except OSError:
            continue
        url = f"http://127.0.0.1:{candidate}/index.html"
        print("Hybrid Workforce - Version 2", flush=True)
        print(f"Open: {url}", flush=True)
        print("Local SQLite storage is in .data/. Press Ctrl+C to stop.", flush=True)
        if open_browser:
            webbrowser.open(url)
        server.serve_forever()
        return
    raise RuntimeError("No local port is available.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the local Hybrid Workforce prototype.")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--open", action="store_true")
    parser.add_argument("--data-dir", default=None)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("Use a port from 1 to 65535.")
    try:
        start_server(args.port, args.open, args.data_dir)
    except KeyboardInterrupt:
        print("\nServer stopped.")
