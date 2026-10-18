# Version 2 architecture

## Local application

The application uses plain JavaScript and CSS. It needs no external package or network resource for its core screens.

- `src-v2/data.js`: sample cases, product envelopes, action records, and delivery review items.
- `src-v2/engine.js`: fit checks, sequential process screening, team/fleet counts, economics, option generation, stress cases, readiness, and observed-data validation.
- `src-v2/store.js`: browser persistence, case revisions, import validation, and optional database synchronization.
- `src-v2/imports.js`: CSV, JSON, and plain-text action intake.
- `src-v2/views.js`: dashboards, case stages, source records, and an escaped HTML report.
- `src-v2/app.js`: user actions, dialogs, file transfer, import preview, and report downloads.
- `src-v2/questions.js`: generated from the design review. Do not edit this generated file directly.

The build joins these modules inside one scope. This supports a normal local website and a self-contained HTML front end.

## Case path

Inputs → Process → Matches → Scenarios → Results → Deployment → Learning.

One case contains its baseline, action list, sources, scenarios, decision snapshots, delivery plan, tests, assets, observations, issues, and question answers. Configuration records are shared across cases. A material configuration change increments all case versions. A material case change invalidates previous reviews by version. A calculation change must update `MODEL_VERSION`.

## Calculation boundary

Fit uses a recorded skill, payload, reach, aisle, and task time. The configuration record also holds hardware, tool, software, source, and operating conditions. The screening checks do not prove the full physical operating envelope.

An option assigns each action to a person or configuration. Resource time includes repeat count, one retry, charging, other downtime, handoffs, and human recovery. The slowest resource limits the process. Staffing uses peak load, productive share, minimum coverage, and annual cover. It is a planning bound, not a labour schedule.

Annual cash benefit uses an explicit cash-benefit position limit and retained-benefit share. Extra human positions are costed in full. Redeployed capacity produces no cash labour benefit. The model separates incremental cash cost from allocated process cost, so extra human cost and purchase capital are each counted once in the relevant measure.

A candidate must meet capacity and first-pass quality, have positive annual net cash, recover upfront cash within the study horizon, and have positive NPV at the entered rate. Missing inputs and failed capacity/quality cannot produce a savings or payback claim. Best means best NPV in the tested set, subject to the stated assumptions.

## Local service

`server.py` uses Python's HTTP server and SQLite. It binds to loopback and rejects unknown hosts and cross-origin writes.

| Route | Function |
|---|---|
| `GET /api/health` | Service and connection state |
| `GET /api/workspace` | Saved JSON workspace and database version |
| `PUT /api/workspace` | Validated save with a version check; stale writes return 409 |
| `POST /api/files?name=...` | Store a source file under a generated ID; limit 25 MB |
| `GET /api/files/<id>` | Download the stored source file |

Private dot paths and directory listings are blocked. Source files download as attachments. The server does not parse CAD or execute uploaded content. It has no login, enterprise access model, or public hosting configuration.

## External service boundaries

CAD/environment, process/physics, training/policy, and hardware-transfer adapters are planning records. Their buttons export a versioned request. No external job, policy training, hardware transfer, or real-time robot control is performed.

The site and OEM must supply actual operating evidence and make the real pilot decision. The prototype always returns `productionAuthorized: false`.
