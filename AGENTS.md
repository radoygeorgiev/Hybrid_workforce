# Working rules

- Use short, direct sentences in the ASD-STE100 style. Use the same style in the application.
- Build the product defined in `docs/v2-design/design-review.html` and the latest owner statements.
- Match actions and valid work bundles. Do not turn action-count coverage into labour savings.
- Keep time removed, staffing change, cash benefit, and benefit ownership separate.
- Keep unknown, zero, sample, supplier claim, simulated, and measured data distinct.
- Do not claim real simulation, model training, certification, or hardware deployment from a local demonstration.
- Change `MODEL_VERSION` when calculation rules change. Imported review records require confirmation.
- Preserve existing design documents. Keep the old implementation in Git history.
- The app uses plain JavaScript, CSS, Python, and SQLite. Do not add a package without a clear need.
- Build: `python build-bundle.py` then `python build-standalone.py`.
- Domain tests: `node --test tests/*.test.js`. Server tests: `python -m unittest discover -s tests -p "test_*.py"`.
- Run: `python server.py --port 8080`. The server binds to loopback only.
