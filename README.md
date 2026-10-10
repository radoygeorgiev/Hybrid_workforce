# DP World Hybrid Workforce Platform

Local/offline demonstrator for DP World Contract Logistics. The application shows how a hybrid workforce of humans, AMRs, robotic forklifts, robotic arms, vision systems, warehouse-specialist robots, and humanoids can be evaluated process-by-process before deployment.

## Fastest demo path

Open:

```text
standalone.html
```

This file contains the CSS, JavaScript, and DP World logo inline and is intended for the lowest-friction executive demo.

## Recommended local hosting path

```bash
python3 server.py --port 8080 --open
```

Then open the printed local URL, usually:

```text
http://127.0.0.1:8080/index.html
```

On Mac/Linux you can also run:

```bash
./start-local.sh
```

On Windows:

```bat
start-local.bat
```

## What changed in this enhanced version

- Title changed to **Hybrid Workforce Platform**.
- Added a wider set of 3PL processes, including inbound receiving, putaway, case picking, piece picking, goods-to-person replenishment, packing QC, cross-dock, container unloading, truck loading, palletizing, pallet movement, inventory count, returns, kitting/VAS, sorter induction, and yard/dock inspection.
- Added a **custom process flow builder**.
- Added upload support for engineering models, process flows, layout files, material-flow CSVs, and simple JSON/TXT/CSV step lists.
- Expanded process parameters by process type: demand, payload, travel, complexity, variability, exceptions, layout readiness, WMS/WES integration, process standardization, dock utilization, pallet height, fragility, and safety criticality.
- Reworked Executive Cockpit charts for better spacing and a right-side legend on Operating Performance.
- Upgraded the 3D simulation to a darker, more professional **Omniverse-inspired digital twin style** with realistic warehouse assets, racks, docks, trucks, conveyors, human avatar, robot avatar, AMR/forklift/arm rendering, telemetry, and workflow timeline.
- Expanded OEM marketplace beyond humanoids to include AMRs, robotic forklifts, robotic arms, vision/scan/drone systems, and warehouse-specialist robots.
- Added a recommended hybrid automation mix rather than forcing every process into a humanoid solution.

## Important limitation

The 3D module is an offline canvas-based visualization inspired by modern digital twin tools. It is **not** NVIDIA Omniverse, Unity, Unreal, or a physics-accurate simulator. A production version should connect the process model to CAD/BIM/layout files, WMS/WES transaction data, safety rules, and a true 3D/physics simulation environment.

## File structure

```text
dpworld-hybrid-workforce-platform-app/
  index.html
  standalone.html
  server.py
  start-local.sh
  start-local.bat
  css/styles.css
  js/app.bundle.js
  src-modules/
    app.js
    assistant.js
    data.js
    engine.js
    simulation3d.js
  assets/dp-world-logo.jpg
  ARCHITECTURE.md
  DATA_NOTES.md
  LOCAL_DEPLOYMENT_FIX_NOTES.md
  CHANGELOG.md
```

## Data note

All robot costs, performance scores, and commercial models are planning assumptions for executive simulation. Replace them with OEM responses, DP World site data, safety validation, and procurement-approved values before using this for capital or contract decisions.
