# Current status · 19 October 2026

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

- 34 JavaScript tests pass. They cover partial work, fleet constraints, unknown values, cash/position separation, extra staffing, purchase/lease costs, ramp-aware payback, horizon limits, adverse scenarios, import, persistence, and report escaping.
- 11 Python tests pass. They cover SQLite round trips, stale-save protection, invalid data, source-file download, same-origin checks, and private-path rejection.
- Browser walkthrough passed: edit an action, verify recalculation, reload, compare fleet counts, generate matched options, record a planning decision, create intended assets, inspect readiness gaps, add a sample observation, open an improvement issue, attach a source, and download a recommendation report.
- The default desktop view and a 390 × 844 narrow-screen view were checked. The menu closes after navigation. The page had no horizontal overflow at that narrow width.
- The bundle syntax check and both build scripts pass. Browser error logs were empty during the checked path.

Local review URL: `http://127.0.0.1:8093/index.html`. The server must remain running. Use the root `start-local.bat` or the command in README to start it again.

The sample walkthrough records are saved in local `.data` storage. They are not source evidence or part of the Git commit. A fresh checkout starts from the supplied sample cases.

Function coverage and the remaining boundary for each of the 52 functions: [docs/v2-implementation.csv](docs/v2-implementation.csv).

## 19 October additions

- Added 12 editable input groups with explicit group save, source links, data state, ownership, capture time, and validity limits.
- Existing cases work without a data reset. Input groups are retained in workspace exports and service request files.
- Added the separate How it works page with a ten-step flow, decision branches, case links, and an input/output support map.
- Browser check: flow links work. An input-group value survives save and reload. Temporary check text was cleared. No browser errors were reported.
- Calculation rules are unchanged. Context records do not feed the screening model automatically.

## Process and product update · 19 October

- 19 flow photos plus one whiteboard are mapped to 70 draft process variants and 1,508 action entries.
- Selection gives a rule-based capability preview. New cases retain complete work-bundle drafts, source links, unknown numeric inputs, and a required source-path review.
- Ten real product records are available. Published prices keep their native currency and exact model scope. Complete EUR project costs remain unknown until entered.
- Added unit CAPEX/OPEX, cost-basis records, multi-capability checks, and carried-load assignment checks. Model version is planning-2.1.0.
- 44 JavaScript and 12 Python tests pass. Browser checks use separate test data. The open 8080 workspace was not replaced.
- Important limits: photo-derived actions need site confirmation; branch execution is a reviewed linear case path; no automatic CAD/physics/learning/dispatch adapter is connected.

## Navigation update

Grouped the menu into Dashboards, Evaluation, Deployment, and Libraries. The evaluation pipeline is a separate dashboard view. Evidence and questions are scoped to the active case. How it works is a visible Help control in the top bar. The active case remains visible while the menu can scroll. Desktop and mobile navigation were checked. There are 44 JavaScript tests and 12 Python tests.

## Additional AWS workstream · 19 October

- The original eight case stages remain. The separate AWS deployment plan page augments them.
- Compact work-split diagrams show the selected actors and modelled productivity in Matches, Business case, and recommendation reports.
- AWS plan settings and supplied benchmark records persist locally. Plan revisions are separate from evaluation revisions.
- Local request packages do not submit or execute external workloads.
- Scope map: docs/aws-scope-implementation.md. External runtime and agent functions are mock interfaces.
- Both builds, 53 domain tests, and 13 server tests pass. Browser checks covered actor changes, sample benchmark entry, configuration persistence, independent plan revisions, and the unchanged eight-stage workflow.
