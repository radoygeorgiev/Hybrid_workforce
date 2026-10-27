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

## Potential inputs and application flow

Open **Inputs** in a case to enter the 12 input groups from the platform input map. Expand a group. Enter its details, data status, owner, capture time, validity limit, and source link. Select **Save input group** before you leave. Attach source files through the source register.

The group records are context. They do not change calculation fields automatically. Enter reviewed model values in the baseline, economics, Process, and Technology library fields. Real-time status and IoT records are snapshots. No live feed is connected.

Open **How it works** in the main navigation, or open `index.html#workflow`. The guide shows the full path, return branches, input/output map, current support, and external service boundaries. Each stage links to the current case.

## Process library and real product records

The app opens in the evaluation centre. Select a process area, warehouse/storage type, and process. Selection computes a capability preview. **Create and analyse evaluation** opens an editable case with action and work-bundle drafts. The 70 variants come from 19 flow photos and one whiteboard. They need an owner review. Numeric site inputs remain unknown.

The technology library shows ten real products first. Manufacturer pages and price listings are linked. The earlier sample configurations remain under a separate collapsed section for existing example cases. USD listing prices are not copied into EUR model costs. Record a scoped quote or a stated cost assumption. Added unit CAPEX and OPEX feed the business case.

Read [the engineering review](docs/process-and-product-review.md), [process index](docs/process-library-index.csv), and [quote template](docs/product-quote-template.csv). `scripts/build-process-library.py` rebuilds the curated library and process exports. Run it from the repository root before the normal build if you change the curated definitions.

## Navigation

- **Dashboards:** Executive cockpit, evaluation pipeline, and deployment overview. These pages show status across cases.
- **Evaluation:** Select a process or open the active evaluation. The case stages take the work from inputs to its business case.
- **Deployment:** Open the active case delivery plan or pilot and learning records.
- **Libraries:** Review process templates and technology records.
- **Active case:** Open its evidence and questions. The page shows only that case. Use the case selector to change the scope.
- **Help:** Use **How it works** in the top bar. It stays separate from work and status pages.

## AWS deployment plan and result diagrams

The platform workflow remains independent of the AWS plan. Matches and Scenarios now share one visible Evaluate workspace. **AWS programme → AWS deployment plan** is an additional, case-linked workstream based on the supplied September 2026 scope. It stores capture, robot, task, demonstration, benchmark, DES, learning, cost, and handover notes. It prepares local request manifests and records external benchmark results. GPU, Isaac, SimPy, training, and agent services are not connected.

The compact process diagram also appears in Matches, Business case, and exported recommendations. It uses the selected scenario to show human, technology, and shared work. Missing productivity remains unknown. See [the scope map](docs/aws-scope-implementation.md) for local functions and external work.

## Graphical process transformation

Start evaluation follows area → process definition → baseline → case. The graph supports Manual, Compare, Future, Changes only, Wrap flow, and step inspection. Step changes are saved as future proposals. Reassignment changes an actor; it does not remove the physical step. Added, removed, and rewritten steps are not costed by this planning model. Actor/fleet variants on an unchanged process use the existing engine. See [the annotation implementation map](docs/annotation-review-2026-10-20.md).

The deployment workspace can snapshot the selected option, list exact configuration records, and show policy/data preparation by process step. A snapshot is a planning record. It does not approve physical operation.

### Value-added service definitions

The process library has 126 definitions. This includes 56 researched VAS drafts across eight sectors, with 840 proposed atomic actions. Select Value-added services, then use the sector filter or process search. See [the research and decomposition register](docs/vas-process-research.md) and [the structured records](docs/vas-process-research.json). Service references do not validate the proposed activity sequence or robot performance.

### 3D asset harness

The project uses [AGENTS.md](AGENTS.md) and [docs/3d-asset-harness.md](docs/3d-asset-harness.md) to govern Blender, Isaac Sim, USD, and 3D preview assets. The harness defines stable record IDs, numbered role folders, source dependencies, review limits, and validation checks.

### Auto Library technology explorer

Open **Technology records** to browse the imported Auto Library catalogue. Use the category tiles, process links, supplier filter, and asset filter. Select a card to open its preview in this page. Existing humanoid records appear in the **Humanoids** category. Their images are category illustrations; no humanoid 3D model was imported.

The snapshot contains 254 source products, 59 additional system or component records, and 60 technology types. The latest snapshot has 287 local GLB previews, 72 Blender source files, and 35 USD packages. The app keeps source process relationships and category navigation hints distinct. Unknown applicability remains unassigned. Records require confirmation and do not enter calculation matching automatically.

The viewer reuses Three.js from the source library. Its licence is in `assets/auto-library/three/LICENSE`. The assets are copied into this repository. The app does not need the Auto Library server or Blender to show an existing GLB. Start the local server for previews. The standalone HTML needs the sibling `assets/auto-library` directory; it does not embed the model files.

To refresh from a local Auto Library checkout, run `python scripts/import-auto-library.py --source /path/to/Auto-Library`. Then run both build scripts. This copies existing files only. If the Auto Library cache is unavailable, the importer retains the previous assets for that record. It does not generate missing geometry or validate Isaac Sim operation. Blender packages preserve the scene filename and its local textures directory. External scene references require source review.
