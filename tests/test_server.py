import copy
import json
from pathlib import Path
import tempfile
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from threading import Thread
from server import Database, validate_workspace, make_handler


def workspace():
    return {"schemaVersion": 2, "savedAt": "2026-10-18", "configs": [{"id": "robot"}], "cases": [{"id": "case", "baseline": {}, "economics": {}, "deployment": {}, "actions": [{"id": "a", "seconds": None}], "scenarios": [{"assignments": {}, "counts": {}}], "sources": [], "observations": []}]}


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        test_root = Path(__file__).resolve().parents[1] / "output" / "test-data"
        test_root.mkdir(parents=True, exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(dir=test_root)
        self.path = Path(self.tmp.name) / "data.sqlite3"
        self.db = Database(self.path)

    def tearDown(self):
        self.tmp.cleanup()

    def test_input_groups_persist_and_reject_bad_source(self):
        data = workspace()
        data["cases"][0]["inputGroups"] = {"traffic": {"status": "Unknown", "detail1": "Observe peak traffic"}}
        self.db.save(data, 0)
        self.assertEqual(Database(self.path).read()["workspace"], data)
        data["cases"][0]["inputGroups"]["traffic"]["sourceId"] = "missing"
        with self.assertRaises(ValueError):
            validate_workspace(data)

    def test_technology_cost_and_capability_validation(self):
        data = workspace()
        data["configs"][0]["extraOpexAnnual"] = -1
        with self.assertRaises(ValueError):
            validate_workspace(data)
        data["configs"][0]["extraOpexAnnual"] = None
        data["cases"][0]["actions"][0]["requiredCapabilities"] = "vision"
        with self.assertRaises(ValueError):
            validate_workspace(data)

    def test_study_records_persist_and_reject_invalid_benchmarks(self):
        data = workspace()
        b = {"id": "bench", "configId": "robot", "policy": "v1", "policyKind": "Baseline", "protocol": "p1", "taskVersion": "task1", "sceneVersion": "scene1", "conditions": "seed1", "source": "test artifact", "evidence": "Sample", "date": "2026-10-19", "caseRevision": 1, "attempts": 10, "successes": 9, "cycleSec": 2.0, "interventions": None}
        data["cases"][0]["study"] = {"settings": {"sceneVersion": "scene1"}, "benchmarks": [b], "requests": []}
        self.db.save(data, 0)
        self.assertEqual(Database(self.path).read()["workspace"], data)
        b["successes"] = 11
        with self.assertRaises(ValueError):
            validate_workspace(data)
        b["successes"] = 9
        b["cycleSec"] = -1
        with self.assertRaises(ValueError):
            validate_workspace(data)

    def test_save_and_reopen(self):
        self.assertEqual(self.db.read(), {"workspace": None, "version": 0})
        self.assertEqual(self.db.save(workspace(), 0), 1)
        self.assertEqual(Database(self.path).read()["workspace"], workspace())

    def test_concurrent_version_does_not_overwrite(self):
        original = workspace()
        self.db.save(original, 0)
        changed = copy.deepcopy(original)
        changed["cases"][0]["id"] = "new"
        self.assertIsNone(self.db.save(changed, 0))
        self.assertEqual(self.db.read()["workspace"], original)

    def test_invalid_data_does_not_replace_good_data(self):
        self.db.save(workspace(), 0)
        invalid = workspace()
        invalid["cases"][0]["actions"][0]["seconds"] = -1
        with self.assertRaises(ValueError):
            self.db.save(invalid, 1)
        self.assertEqual(self.db.read()["version"], 1)

    def test_unknown_draft_numbers_remain_unknown(self):
        self.db.save(workspace(), 0)
        self.assertIsNone(self.db.read()["workspace"]["cases"][0]["actions"][0]["seconds"])

    def test_non_finite_numbers_and_missing_assignment_links_fail(self):
        invalid = workspace()
        invalid["cases"][0]["baseline"]["volume"] = float("nan")
        with self.assertRaises(ValueError):
            validate_workspace(invalid)
        invalid = workspace()
        invalid["cases"][0]["scenarios"][0]["assignments"]["ghost"] = "robot"
        with self.assertRaises(ValueError):
            validate_workspace(invalid)

    def test_handler_creation_does_not_change_the_workspace(self):
        self.assertTrue(make_handler(Path(self.tmp.name) / "server-data"))
        self.assertEqual(self.db.read()["version"], 0)


class ApiTests(unittest.TestCase):
    def setUp(self):
        test_root = Path(__file__).resolve().parents[1] / "output" / "test-data"
        test_root.mkdir(parents=True, exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(dir=test_root)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(Path(self.tmp.name) / "data", root=self.tmp.name))
        self.thread = Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.tmp.cleanup()

    def request(self, method, path, body=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse()
        status, payload, response_headers = response.status, response.read(), dict(response.getheaders())
        connection.close()
        return status, payload, response_headers

    def test_workspace_round_trip_and_conflict(self):
        body = json.dumps({"workspace": workspace(), "version": 0})
        self.assertEqual(self.request("PUT", "/api/workspace", body, {"Content-Type": "application/json"})[0], 200)
        status, raw, _ = self.request("GET", "/api/workspace")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(raw)["workspace"], workspace())
        self.assertEqual(self.request("PUT", "/api/workspace", body, {"Content-Type": "application/json"})[0], 409)

    def test_source_file_round_trip_uses_a_generated_identity(self):
        status, raw, _ = self.request("POST", "/api/files?name=..%2Fsample.txt", b"sample source")
        self.assertEqual(status, 201)
        saved = json.loads(raw)
        self.assertEqual(saved["name"], "sample.txt")
        status, content, headers = self.request("GET", "/api/files/" + saved["id"])
        self.assertEqual(status, 200)
        self.assertEqual(content, b"sample source")
        self.assertIn("attachment", headers["Content-Disposition"])

    def test_cross_origin_write_and_bad_host_are_rejected(self):
        body = json.dumps({"workspace": workspace(), "version": 0})
        self.assertEqual(self.request("PUT", "/api/workspace", body, {"Origin": "https://example.invalid"})[0], 403)
        self.assertEqual(self.request("GET", "/api/workspace", headers={"Host": "example.invalid"})[0], 403)

    def test_private_paths_and_invalid_json_do_not_disclose_or_write_data(self):
        self.assertEqual(self.request("GET", "/.git/config")[0], 404)
        self.assertEqual(self.request("GET", "/api/files/..%2Fworkspace.sqlite3")[0], 400)
        self.assertEqual(self.request("PUT", "/api/workspace", b"{broken")[0], 400)
        self.assertEqual(json.loads(self.request("GET", "/api/workspace")[1])["version"], 0)


if __name__ == "__main__":
    unittest.main()
