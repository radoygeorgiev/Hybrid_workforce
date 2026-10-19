# Process and product review · 19 October 2026

The app now starts with process evaluation. Select an area, storage type, and process. The preview checks the action requirements against the real product records. Create a case to keep the editable draft and work-split options.

## Source scope

The typed list has 18 HEIC files. IMG_5903 was also in the supplied folder. It is included as the nineteenth flow photo. The whiteboard is a separate twentieth source. The original files are unchanged. Readable JPEG copies are in assets/process-flows/.

The 19 flow photos include overview and detailed versions. They are not 19 unique operating procedures. The library has 70 process variants in 12 process areas. It has 1,508 proposed atomic actions across those variants. Repeated actions in different variants are not unique work elements.

Photo labels are normalised and some related labels are combined into activity groups. Atomic actions, capabilities, warehouse classifications, and recovery notes are engineering drafts. They are not an approved SOP or MTM study. The source photo and open branch rules remain linked to each draft.

## What happens after process selection

1. Show the source-based activity groups and atomic actions.
2. Check all required capabilities, not one matching skill.
3. Separate conditional product candidates, retained human decisions, and capability gaps.
4. Keep carried-load steps with one actor until set-down or a reviewed handoff.
5. Create complete work-bundle drafts. One machine is a placeholder, not a sized fleet.
6. Keep task time, frequency, payload, reach, aisle, baseline staffing, and commercial inputs unknown.
7. Require a source-path review and complete model inputs before a business case.

## Whiteboard review

The whiteboard keeps its 13 named steps and has 43 proposed actions. Infeed and set-down share a pallet bundle. Tote pickup, preparation, label removal, and transfer share a carried-load bundle. Retrieval, return, and stacking share another bundle. A split needs a reviewed fixture, buffer, or handoff. The current model cannot validate collaborative human/robot handling.

Confirm target 1, tote and pallet quantities, cover handling, pallet exchange, debris criteria, label condition, and stable-stack checks. Pallet actions occur per pallet. Tote actions occur per tote. Do not count each pallet action once per tote.

## Product and cost basis

The library has ten real product records. Two are reference variants that are excluded from automatic warehouse matching. All numeric specification entries remain supplier claims until a relevant test validates them. Capability tags are engineering screening candidates.

| Product | Published hardware price | EUR model cost | Source |
|---|---|---|---|
| AGIBOT A2-W | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://agibot.com/products/A2_W) |
| Unitree G1 EDU | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://www.unitree.com/g1/) |
| Unitree G1 base | USD 13,500 · variant-specific listing | Unknown until quote or stated assumption | [Manufacturer](https://shop.unitree.com/products/unitree-g1) |
| AGIBOT A2 Lite | USD 44,560 · variant-specific listing | Unknown until quote or stated assumption | [Manufacturer](https://store.agibot.com/products/a2-lite) |
| Universal Robots UR20 | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://www.universal-robots.com/products/ur20/) |
| MiR250 | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://www.mobile-industrial-robots.com.cn/zh/products/robots/mir250/specifications) |
| Cognex In-Sight 2800 series | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://partner.cognex.com/FileLibrary/5a534a2e0341458bb41f5df6ede81031/IS2800_Datasheet.pdf) |
| Schmalz JumboFlex 50 | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://www.schmalz.com/en-de/products/manual-handling-309305/vacuum-tube-lifters-309306/vacuum-tube-lifters-jumboflex-726042) |
| MiR1200 Pallet Jack | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://www.mobile-industrial-robots.com.cn/products/robots/mir1200-pallet-jack) |
| AGILOX ONE · single scissor | Not published in the reviewed source | Unknown until quote or stated assumption | [Manufacturer](https://www.agilox.net/en/product/agilox-one/) |

The Unitree base-model listing does not price the EDU model. The AGIBOT A2 Lite listing does not price A2-W. Do not substitute either price. Published USD prices are not silently converted to EUR. No complete public project price or annual operating-cost schedule was established.

The EUR cost model uses hardware price plus per-unit extra CAPEX. It adds service, energy, and per-unit other OPEX each year. Lease/RaaS uses the monthly fee and the stated service inclusion. Case-wide integration, site changes, software, and support remain separate. Allocate each cost once. Enter zero explicitly only when the quoted or assumed scope justifies zero. Record the quote, date, FX basis, validity, inclusions, and exclusions.

## Open engineering decisions

- Confirm which source generation is current at each site.
- Confirm the warehouse and storage classification for each selected variant.
- Select the actual branch. Remove skipped actions. Confirm repeat counts per output unit.
- Confirm handling-unit geometry, load centre, payload, rack height, aisle, floor, and grip points.
- Define target 1 and each safe handoff or set-down position.
- Confirm WMS transaction names, interfaces, and failure recovery. A WMS action is not necessarily a physical robot task.
- Confirm the meaning and handling of PAMI. The draft does not define it as a document.
- Agree the criteria for damage, debris, label removal, missing kit items, quarantine, and load release.
- Obtain task timing and reliability evidence for the exact robot/tool/software configuration. Manufacturer speed is not completed-process throughput.
- Obtain installed CAPEX, software/service terms, energy use, battery replacement, consumables, and support costs.
- Agree the simulation or physical-test method with AWS and the OEM. The app does not perform those external jobs.

## Verification

45 JavaScript tests and 12 Python tests pass. The tests cover all source mappings and process graphs, unknown inputs, complete bundle assignments, multi-capability checks, retained human roles, costs, import validation, and preservation of edited records. Browser checks use a separate local review database. The existing 8080 browser workspace is not replaced.

Model version: planning-2.1.0. Prior reviews require confirmation after calculation-rule changes.

## Completion check · 19 October 2026

The requested process-library workflow is implemented. The library contains 19 flow-photo sources and the separate whiteboard source. It groups the process variants by process area and warehouse or storage type. Selection checks the curated action requirements against the product capability records. It does not extract a new process from an unseen image.

Browser checks confirmed area and warehouse filters, case creation, the 13 whiteboard activity groups, action capability results, complete work bundles, and persistence after reload. The review used a separate local database on port 8095.

The activity sequence now reports the complete bundle result. For example, tote pickup remains with the human when label peeling or a retained inspection blocks its carried-load bundle. The bundle table states which action prevents assignment. Individual action candidates remain visible for process redesign.

The prototype work is complete for this scope. Site approval of the inferred actions, repeat counts, exception paths, safe handoffs, and actual task performance remains open. These inputs cannot be established from the source photos alone. A conditional match is not a validated robot assignment.
