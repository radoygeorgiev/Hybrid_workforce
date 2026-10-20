# AWS scope implementation · 19 October 2026

Basis: the owner-supplied September 2026 DP World Prototype Scope, pages 2–4. This maps the requested scope to this local application. It does not report AWS delivery progress.

## Decision workflow

The AWS scope augments the existing platform. The existing platform functions stay in place. The owner later requested one visible Evaluate workspace for matching and scenarios; this change is independent of the AWS scope. **AWS deployment plan** is a separate page under **AWS programme**. It stores a plan for the selected evaluation case. It is not a required stage or a replacement for the platform deployment module.

The compact process chart is shared by the process library, Matches, Business case, and the recommendation report. In evaluation views, the chart uses the selected scenario assignments. It does not infer a deployed robot from a capability candidate.

Each step states the assigned actor. A step with both human and technology actions is marked as shared. Expand it to see the individual actions and assigned configuration. Modelled step times are shown only for a valid planning evaluation. They are work content per output unit, not a task count converted into staffing savings. Whole-process capacity, remaining human work, staffing, and cash benefit remain separate.

Select another option to compare a different work split. The recommendation still uses the tested feasible set. Missing inputs, failed capacity, and failed quality remain valid reasons not to advance an option.

## Scope map

| Scope feature | Local implementation | External work still required |
|---|---|---|
| Warehouse capture and digital twin | Capture reference, OpenUSD version, geometry checks, and texture fields | Zed 2i capture, reconstruction, collision and scale validation, scene import |
| Hardware-agnostic robot representation | Exact product/configuration records; robot asset, embodiment, interface, sensor, and tool notes | Import supported robot assets and implement common observation/action/reset adapters |
| Common task | Task, scene, protocol, conditions, observations, actions, rewards, terminations, and episode settings | Build and register a real manager-based Isaac Lab / Gymnasium environment |
| Baseline policy | Foundation-model and encoder version, baseline release, and scripted fallback fields | Adapt and run a supported controller for each embodiment |
| Seed demonstrations | VR or agent-scripted method, primitive list, separate base transit, dataset and Mimic references | Quest 3S teleoperation, script execution, demonstration recording, Mimic generation and adaptation |
| Multi-robot benchmarks | Validated result entry; exact configuration, versions, episodes, first-pass success, cycle, intervention, recovery, and energy; common comparison groups | Run the same test protocol in Isaac Sim and provide versioned result artifacts |
| Whole-process DES | Arrival, service distribution, layout, route, buffer, fleet, availability, replication, and output-reference fields | Build and run SimPy DES; provide throughput, queue, wait, utilisation, and interval outputs |
| RL refinement · stretch | Training and held-out data, RL configuration, baseline/refined policy records and comparable metrics | Train in Isaac Lab / LeRobot and evaluate held-out results |
| Photorealism · stretch | Texture/capture references | Produce and validate photorealistic scene assets |
| Interactive review · stretch | Shared work-split chart, benchmark table, case options, economics, and scope configuration | Connect external artifact and result services |
| Design assistant · stretch | Task/constraint brief, shortlist rationale and proposed simulation configuration fields | Connect an agent service; validate its robot shortlist and generated configuration |
| Running cost and handover | Compute/rate/runtime/budget notes, tooling outcome measures, artifacts and runbook fields | Collect actual AWS usage, enforce budget limits and produce the external handover artifacts |

## Local data functions

- Save each stage configuration in the case and SQLite workspace.
- Prepare a versioned JSON request package. The package is a planning contract, not an executable Isaac Lab configuration.
- Export the complete study record.
- Record supplied benchmark values. Sample is the default evidence class.
- Validate episode counts, configuration links, timing fields, and evidence class in JavaScript and Python.
- Compare only matching protocol, task, scene, conditions, evidence class, and current case revision. Group membership is based on the entered labels; it does not independently verify the test setup.
- Keep AWS plan revisions separate from evaluation revisions. Editing AWS settings does not change the economic case revision. Mark earlier benchmark results as out of date after a case or AWS plan change. Imported records also require a new revision review.
- Keep benchmarks separate from product task times and economic inputs. A reviewer must approve the mapping before using them in a business case.

## Boundaries

The app does not run a GPU job, capture a warehouse, load or render OpenUSD, execute physics or DES, train a policy, validate safety, or command a physical robot. Stage fields for these functions are mock interfaces and external-service contracts. The assistant fields do not call an LLM. Benchmark entry records evidence; it does not certify it.

Physical deployment, production WMS/LMS integration, production hardening, and multi-site rollout are outside the supplied prototype scope. The existing deployment module is a later-platform planning view. AWS sandbox, PDRT/PEP setup, access control, and cost enforcement remain external infrastructure work.

## Verification

53 domain tests and 13 server tests pass. Tests cover invalid benchmark records, comparison keys, storage round trips, unchanged economics, scope request boundaries, scenario-specific diagrams, and unknown productivity. Browser checks use a separate review database on port 8096. A sample benchmark was entered to test the form; it is labelled Sample and is not an external run.
