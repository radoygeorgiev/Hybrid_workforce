# Current status · 18 October 2026

Branch: `ämbition-vision`.

Version 2 is a working local planning prototype. The build replaces the earlier page and calculation model. The original modules and the earlier design review remain as references.

## Working path

- Executive, evaluation, and deployment views.
- Three example cases and six editable technology configurations.
- Source register and local source-file storage.
- Action editing, task groups, timing method/MTM fields, dependencies, CSV/JSON intake, and pasted drafts.
- Action-to-configuration fit with blocked and unknown states.
- Human/machine assignments, generated draft options, and a bounded fleet search.
- Peak-capacity screening, retained human work, recovery, charging, downtime, and staffing.
- Purchase/lease/RaaS cash flow, benefit capture, extra staffing cost, payback, NPV, and seven stress cases.
- Recommendation report download and versioned planning decisions.
- Execution route, release/site plan, review checklist, tests, intended assets, and external service request exports.
- Manual/CSV observations, measured-window comparison, and improvement issues.
- All 59 design questions with case-specific answers.
- Browser persistence, SQLite storage, validated workspace import/export, and stale-save protection.

## Clear limits

The local calculation is a screening model. It is not a physical or discrete-event simulation. It does not parse CAD, train a robot policy, stream live telemetry, or load hardware. It does not issue a calibrated confidence probability, site safety acceptance, or production authority. These limits are visible in the related screens.

The first simulation/evidence method, exact automotive site/process, AGIBOT configuration, supported stack, OEM access, real rates/quotes, integrator, and site pilot criteria remain open. The prototype records these gaps and permits work on the visual journey without inventing answers.

## Verification

- 31 JavaScript tests pass. They cover partial work, fleet constraints, unknown values, cash/position separation, extra staffing, purchase/lease costs, ramp-aware payback, horizon limits, adverse scenarios, import, persistence, and report escaping.
- 10 Python tests pass. They cover SQLite round trips, stale-save protection, invalid data, source-file download, same-origin checks, and private-path rejection.
- Browser walkthrough passed: edit an action, verify recalculation, reload, compare fleet counts, generate matched options, record a planning decision, create intended assets, inspect readiness gaps, add a sample observation, open an improvement issue, attach a source, and download a recommendation report.
- The default desktop view and a 390 × 844 narrow-screen view were checked. The menu closes after navigation. The page had no horizontal overflow at that narrow width.
- The bundle syntax check and both build scripts pass. Browser error logs were empty during the checked path.

Local review URL: `http://127.0.0.1:8093/index.html`. The server must remain running. Use the root `start-local.bat` or the command in README to start it again.

The sample walkthrough records are saved in local `.data` storage. They are not source evidence or part of the Git commit. A fresh checkout starts from the supplied sample cases.

Function coverage and the remaining boundary for each of the 52 functions: [docs/v2-implementation.csv](docs/v2-implementation.csv).
