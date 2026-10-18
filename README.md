# Hybrid Workforce · Version 2

This local prototype helps a warehouse define work, match actions to technology, compare people and machine teams, check economics, and prepare site delivery.

The branch is `ämbition-vision`. Git does not permit spaces in branch names.

## Run the prototype

Use Python 3.10 or later:

```text
python server.py --port 8080
```

Open the URL printed in the terminal. The server binds to `127.0.0.1` only. If the port is busy, it tries the next available local port.

On Windows, `start-local.bat` also starts the server. The file `standalone.html` provides the same front end without a server. It stores records in the browser. The SQLite and source-file services require `server.py`.

## First walkthrough

1. Open **Evaluations** and select **Empty tote sorting**.
2. In **Inputs**, inspect the calendar, staffing, sources, and cost assumptions.
3. In **Process**, edit the actions, timing method, requirements, and recovery work. Import CSV/JSON or paste an action list if needed.
4. In **Matches**, inspect a fit result. Assign work or select **Generate matched options**.
5. In **Scenarios**, compare the complete team and fleet. Use **Compare fleet counts** to test counts from one to six per configuration.
6. In **Results**, check the time/staff/cash bridge, cash flow, adverse scenarios, and evidence. Export a report or record a planning decision.
7. In **Deployment**, prepare the execution route, release, site, tests, pilot, and intended assets. External service buttons download a request; they do not run a job.
8. In **Learning**, add or import observations, compare the result, and open an improvement issue.

**Executive** shows the portfolio. **Deployments** shows site and asset records. **Technology library** contains editable configurations. **Evidence & questions** contains sources and the 59 design questions.

## Data and assumptions

The supplied cases, product envelopes, prices, and performance figures are sample inputs. The AGIBOT target has no confirmed model or supported performance record. The actual automotive site name remains pending. Parts kitting and pallet transport are separate examples.

The example annual human cost is EUR75,000. It is not a verified site rate. The model separates action-time coverage, staffing change, captured cash benefit, extra staffing cost, and costs passed through the contract.

The capacity model is a screening calculation. It checks sequential resource workload, peak demand, charge, other downtime, one retry, human recovery, and whole-shift staffing. It does not simulate traffic, queues, charger schedules, physical motion, or site safety. Recorded parallel work stops the local evaluation and requests a more detailed model.

There is no calibrated confidence probability. Fit, evidence, economic stress results, and readiness are separate.

## Save and back up

- Browser records use the key `hybrid-workforce-v2`.
- The local server stores the workspace in `.data/workspace.sqlite3` and source files in `.data/files/`.
- Export the whole workspace or one editable case as JSON.
- Imports have a preview. Importing records requires a new review of previous decisions and tests.
- JSON exports contain file references, not the source-file bytes. Back up the complete `.data` folder to preserve attached files. Stop the server before a filesystem backup.
- The service uses version checks to prevent a stale browser from overwriting a newer save. It is a local prototype, not a shared multi-user service.

## Build and check

No package download is required. Node.js 20 or later is used for tests.

```text
python build-bundle.py
python build-standalone.py
node --test tests/engine.test.js
python -m unittest discover -s tests -p "test_*.py"
```

`src-v2/` is the active application. `js/app.bundle.js` and `standalone.html` are generated files. The old `src-modules/` implementation is retained for reference and is excluded from the version 2 build.

See [STATUS.md](STATUS.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [the design basis](docs/v2-design/design-review.html).
