import { researchedProducts } from './products.js';
export const APP_SCHEMA = 2;
export const STAGES = ['Define', 'Evaluate', 'Decide', 'Prepare', 'Pilot', 'Operate', 'Paused'];
export const CASE_TABS = ['Overview', 'Inputs', 'Process', 'Matches', 'Scenarios', 'Results', 'Deployment', 'Learning'];
export const SKILLS = ['inspect', 'classify', 'scan', 'reach', 'grip', 'lift', 'transport', 'orient', 'place', 'confirm', 'exchange', 'clear'];
export const SOURCE_STATES = ['Sample', 'Assumed', 'Supplier claim', 'Simulated', 'Measured', 'Unknown', 'Out of date'];
export const uid = (prefix = 'record') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const copy = value => JSON.parse(JSON.stringify(value));

export function seedConfigs() {
  const base = { revision: 1, source: 'Sample', sourceDate: '2026-10-18', sourceNote: 'Fictional engineering envelope. No supplier or site test.', payloadKg: 12, reachM: 1.6, minAisleM: 1.1, successPct: 97, interventionPct: 0.5, recoverySec: 90, chargePct: 12, downtimePct: 8, supportAnnual: 9000, energyAnnual: 1500, price: 100000, leaseMonthly: 4800, serviceIncluded: true, interface: 'Not verified', leadWeeks: null };
  return [
    { ...base, id: 'humanoid-h1', name: 'Humanoid H1', family: 'Humanoid', description: 'Mobile manipulation for a continuous lift, move, and place bundle.', skills: ['inspect', 'classify', 'reach', 'grip', 'lift', 'transport', 'orient', 'place'], times: { inspect: 3, classify: 3, reach: 3.5, grip: 1.5, lift: 2.5, transport: 7, orient: 2.5, place: 3.5 } },
    { ...base, id: 'arm-a1', name: 'Arm cell A1', family: 'Robot arm', description: 'Fixed manipulation cell. Transport needs a separate actor and a carrier handoff.', payloadKg: 18, reachM: 1.8, price: 55000, leaseMonthly: 2700, chargePct: 0, downtimePct: 6, supportAnnual: 6000, energyAnnual: 800, skills: ['reach', 'grip', 'lift', 'orient', 'place'], times: { reach: 1.8, grip: 0.8, lift: 1.2, orient: 1.5, place: 2 } },
    { ...base, id: 'amr-m1', name: 'AMR M1', family: 'AMR', description: 'Carrier transport. The robot does not pick up a loose tote by itself.', payloadKg: 250, reachM: 0, price: 42000, leaseMonthly: 2100, chargePct: 10, downtimePct: 5, supportAnnual: 4200, energyAnnual: 900, skills: ['transport'], times: { transport: 6.5 } },
    { ...base, id: 'vision-v1', name: 'Vision station V1', family: 'Vision', description: 'Classification and code reading at a prepared station.', payloadKg: 0, reachM: 0, price: 12000, leaseMonthly: 600, chargePct: 0, downtimePct: 3, supportAnnual: 1400, energyAnnual: 200, skills: ['inspect', 'classify', 'scan', 'confirm'], times: { inspect: 0.7, classify: 0.6, scan: 0.4, confirm: 0.3 } },
    { ...base, id: 'assist-l1', name: 'Lift assist L1', family: 'Assist tool', description: 'An operator remains at the tool. This option reduces handling effort, not staffing by itself.', price: 9000, leaseMonthly: 450, chargePct: 0, downtimePct: 2, supportAnnual: 900, energyAnnual: 100, skills: ['lift'], times: { lift: 1.2 }, requiresOperator: true },
    { ...base, id: 'agibot-target', name: 'AGIBOT target · model pending', family: 'Humanoid', description: 'The PoC target. Model, tools, software, price, and performance need OEM/AWS confirmation.', source: 'Unknown', sourceNote: 'Vendor name only. No supported configuration or performance record is available.', payloadKg: null, reachM: null, minAisleM: null, successPct: null, interventionPct: null, price: null, leaseMonthly: null, skills: ['reach', 'grip', 'lift', 'transport', 'orient', 'place'], times: {} }
  ];
}

function toteActions() {
  const rows = [
    ['Inspect the tote', 'inspect', 2, 'Check damage and contamination.'],
    ['Identify the tote type', 'classify', 2, 'Read shape or type information.'],
    ['Read the tote code', 'scan', 1.5, 'Confirm the work item.'],
    ['Reach the tote', 'reach', 3, 'Reach from a known presentation point.'],
    ['Grip the tote', 'grip', 1, 'Secure the agreed grip points.'],
    ['Lift the tote clear', 'lift', 2, 'Keep the load stable.'],
    ['Move to the sort point', 'transport', 6, 'Travel on the defined route.'],
    ['Orient the tote', 'orient', 2, 'Align the tote with its destination.'],
    ['Place the tote', 'place', 3, 'Release it in a stable position.'],
    ['Confirm completion', 'confirm', 1, 'Record the correct destination.'],
    ['Exchange the full carrier', 'exchange', 3, 'Keep an empty carrier available.'],
    ['Clear the work area', 'clear', 3.5, 'Keep the route and work area usable.']
  ];
  return rows.map(([name, skill, seconds, note], index) => ({ id: `action-${index + 1}`, name, skill, seconds, frequency: 1, taskGroup: index < 3 ? 'Identify the tote' : index < 9 ? 'Handle and sort' : 'Confirm and support', workElement: name, object: 'Empty tote', from: index < 6 ? 'Presentation point' : 'Transfer point', to: index < 6 ? 'Transfer point' : 'Sort carrier', timingMethod: 'Assumed example', mtmCode: '', sampleCount: null, payloadKg: ['reach', 'grip', 'lift', 'transport', 'orient', 'place'].includes(skill) ? 7 : 0, reachM: ['reach', 'grip', 'lift', 'orient', 'place'].includes(skill) ? 1.2 : 0, aisleM: 1.5, source: 'Sample', sourceId: 'source-process', note, recovery: 'Stop and ask the assigned operator.', dependency: index ? `action-${index}` : '', parallel: false }));
}

export function makeCase(name = 'Empty tote sorting', id = uid('case')) {
  const actions = toteActions();
  return {
    id, name, site: 'Automotive site · name pending', country: 'Germany', owner: 'Process engineering', stage: 'Evaluate', revision: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sample: true,
    purpose: 'Find a useful split of work between people and technology. Compare the whole process and its cost.',
    baseline: { demandDaily: 5000, peakFactor: 1.2, shifts: 2, shiftHours: 7.5, daysYear: 250, peoplePerShift: 4, humanUtilPct: 85, salaryAnnual: 75000, minPeoplePerShift: 1, staffingCover: 1, qualityTargetPct: 95, routeM: 5 },
    economics: { commercialModel: 'purchase', integration: 65000, siteChanges: 20000, softwareAnnual: 12000, supportAnnual: 6000, rampMonths: 3, horizonYears: 5, discountPct: 10, retainedPct: 75, cashableFte: 4, benefitMode: 'Avoided hires', residualValue: 0, otherBenefitAnnual: 0, handoffSec: 0.5 },
    actions, inputGroups: {},
    sources: [
      { id: 'source-process', name: 'Tote process breakdown', type: 'Process / SOP', status: 'Sample', date: '2026-10-18', note: 'Twelve illustrative actions. Replace them with the site-reviewed process breakdown.', fileId: null },
      { id: 'source-engineering', name: 'Staffing and engineering model', type: 'Engineering model', status: 'Sample', date: '2026-10-18', note: 'Four positions per shift, two shifts. EUR75,000 per annual position. These are scenario assumptions.', fileId: null },
      { id: 'source-layout', name: 'Site layout', type: 'Layout / CAD', status: 'Unknown', date: '', note: 'Add the site plan, clearances, route, carrier handoffs, and charger locations.', fileId: null },
      { id: 'source-demand', name: 'Demand and SKU profile', type: 'Demand / orders', status: 'Sample', date: '2026-10-18', note: '5,000 totes per day across both shifts. Peak demand is 1.2 times average hourly demand.', fileId: null },
      { id: 'source-trial', name: 'Robot task performance', type: 'Benchmark / trial', status: 'Unknown', date: '', note: 'Ask AWS/OEM to define the test basis and the need for an initial physics study.', fileId: null }
    ],
    scenarios: [
      { id: 'current', name: 'Current method', kind: 'manual', counts: {}, assignments: {}, manualFactor: 1 },
      { id: 'improved', name: 'Improved manual method', kind: 'improved', counts: {}, assignments: {}, manualFactor: 0.85, extraUpfront: 5000 },
      ...[2, 3, 4].map(count => ({ id: `humanoid-${count}`, name: `${count} humanoids + people`, kind: 'hybrid', counts: { 'humanoid-h1': count }, assignments: Object.fromEntries(actions.filter(a => ['reach', 'grip', 'lift', 'transport', 'orient', 'place'].includes(a.skill)).map(a => [a.id, 'humanoid-h1'])), manualFactor: 1 })),
      { id: 'mixed', name: 'Arm cells + AMR + people', kind: 'hybrid', counts: { 'arm-a1': 2, 'amr-m1': 1 }, assignments: Object.fromEntries(actions.filter(a => ['reach', 'grip', 'lift', 'transport', 'orient', 'place'].includes(a.skill)).map(a => [a.id, a.skill === 'transport' ? 'amr-m1' : 'arm-a1'])), manualFactor: 1 }
    ],
    selectedScenarioId: 'humanoid-3',
    decision: null,
    deployment: { route: 'To be defined', target: 'AGIBOT model and tool pending', siteNotes: '', interfaceNotes: '', trainingNotes: '', pilotNotes: '', release: 'draft-0.1', rollback: '', supportOwner: '', checklist: {}, testResults: [], review: null, assets: [] },
    observations: [], issues: [], answers: {}, history: []
  };
}

export function seedWorkspace() {
  const tote = makeCase('Empty tote sorting', 'case-totes');
  const kitting = makeCase('Parts kitting', 'case-kitting');
  kitting.site = 'Ehmen · sample'; kitting.owner = 'Site engineering'; kitting.stage = 'Define';
  kitting.baseline = { ...kitting.baseline, demandDaily: 1400, peoplePerShift: 3, salaryAnnual: 68000 };
  kitting.actions.forEach(a => { a.name = a.name.replaceAll('tote', 'part').replace('sort point', 'kit station'); a.seconds *= 1.8; a.payloadKg = a.payloadKg ? 3 : 0; });
  kitting.sources[0].note = 'Illustrative kit flow. This is a separate example, not the tote PoC.';
  const transport = makeCase('Pallet transport', 'case-amr');
  transport.site = 'Distribution site · sample'; transport.owner = 'Delivery team'; transport.stage = 'Pilot';
  transport.baseline = { ...transport.baseline, demandDaily: 600, peoplePerShift: 2, minPeoplePerShift: 0, salaryAnnual: 60000 };
  transport.actions = [
    { ...transport.actions[0], id: 'pallet-check', name: 'Check the carrier', skill: 'inspect', seconds: 12, payloadKg: 0, dependency: '' },
    { ...transport.actions[6], id: 'pallet-move', name: 'Transport the carrier', skill: 'transport', seconds: 80, payloadKg: 200, dependency: 'pallet-check' },
    { ...transport.actions[9], id: 'pallet-confirm', name: 'Confirm the delivery', skill: 'confirm', seconds: 8, payloadKg: 0, dependency: 'pallet-move' }
  ];
  transport.scenarios = [{ id: 'current', name: 'Current method', kind: 'manual', counts: {}, assignments: {}, manualFactor: 1 }, { id: 'amr-pilot', name: 'One AMR + people', kind: 'hybrid', counts: { 'amr-m1': 1 }, assignments: { 'pallet-move': 'amr-m1' }, manualFactor: 1 }];
  transport.selectedScenarioId = 'amr-pilot';
  transport.deployment.assets = [{ id: 'demo-amr-01', name: 'AMR-01', configId: 'amr-m1', status: 'In pilot', serial: 'Sample asset', release: 'demo-0.1', note: 'Demonstration record. No live fleet connection.' }];
  transport.deployment.pilotNotes = 'Sample plan: compare good moves, interventions, remaining human work, and cost. Define real acceptance limits before a field trial.';
  return { schemaVersion: APP_SCHEMA, activeCaseId: tote.id, cases: [tote, kitting, transport], configs: [...seedConfigs(), ...researchedProducts()], savedAt: new Date().toISOString() };
}

export const DEPLOY_CHECKS = [
  ['scope', 'Confirm process and configuration', 'Name the exact work bundle, hardware, tool, software, and operating limits.'],
  ['site', 'Prepare the work area', 'Check routes, clearances, buffers, power, charging, and shared work zones.'],
  ['interfaces', 'Test the interfaces', 'Check dispatch, acknowledgement, duplicate events, timeout, retry, and recovery.'],
  ['performance', 'Check task performance evidence', 'Use the agreed test basis. Record conditions, samples, failures, and transfer limits.'],
  ['release', 'Check the release', 'Link the supported hardware, software/model, tests, and fallback version.'],
  ['operators', 'Prepare operators and support', 'Assign supervision, training, recovery, maintenance, and support duties.'],
  ['safety', 'Record the site safety review', 'The accountable site team must review the actual installation. A demo tick is not certification.'],
  ['pilot', 'Agree the pilot measures and stop rules', 'Define output, quality, intervention, cost, duration, and stop conditions.']
];

// Input records are context. They do not change the screening model by themselves.
export const INPUT_GROUPS = [
  ['layout', 'Warehouse layout', ['Zones, docks, racks, and workstations', 'Aisles, travel paths, and clearances', 'Charging areas and handoff points'], 'Route and resource-position plan', 'Reference only. No CAD parsing or path optimisation.'],
  ['process', 'Process flows', ['Receiving, putaway, and replenishment', 'Picking, packing, staging, and shipping', 'Action sequence, MTM study, and engineering model'], 'Work sequence and human / machine split', 'Enter reviewed actions and times in Process. Those fields drive the model.'],
  ['demand', 'Orders and demand', ['Orders and inbound volumes', 'Forecasts and peak periods', 'Priorities and cut-off times'], 'Prioritised work queue', 'Daily demand and peak factor drive screening. No live task queue.'],
  ['inventory', 'Inventory and SKU data', ['Locations and quantities', 'Dimensions and weight', 'Handling and storage requirements'], 'Movement and task-assignment plan', 'Map load and reach requirements to each process action. No stock-system connection.'],
  ['workforce', 'Human workforce', ['Availability, shifts, and location', 'Skills, certificates, and productivity', 'Labour rates, staffing, and cover'], 'Person-to-task assignment plan', 'Baseline staffing and labour cost drive the model. No individual staff dispatch.'],
  ['automation', 'Automation resources', ['AMRs, AGVs, and forklifts', 'Robot arms, humanoids, and assist tools', 'ASRS, conveyors, and installed quantities'], 'Machine-to-task assignment plan', 'Use Technology library and scenario counts. Other technology types need a supported configuration.'],
  ['capabilities', 'Resource capabilities', ['Payload, speed, and reach', 'Manipulation, skills, and task performance', 'Interfaces, tools, and operating limits'], 'Human and machine capability match', 'Library skills, limits, and task times drive matching. Verify each source.'],
  ['status', 'Real-time resource status', ['Location, availability, and workload', 'Battery level and charging state', 'Faults and maintenance status'], 'Dispatch and reassignment', 'Snapshot record only. No live telemetry or dispatch.'],
  ['constraints', 'Operational constraints', ['Safety rules and restricted zones', 'Sequence rules and dependencies', 'Shared work, handoffs, and recovery'], 'Feasible execution plan for site review', 'Some action dependencies and limits are checked. No site safety validation.'],
  ['rules', 'Business rules and service levels', ['Customer priority', 'Order deadlines and service targets', 'Cost limits and decision rules'], 'Service-based task priority', 'Reference only. No live service-level scheduler.'],
  ['traffic', 'Traffic and congestion', ['Human and robot traffic', 'Queues and blocked aisles', 'Dock congestion and peak conditions'], 'Route and congestion plan', 'Reference only. No traffic or queue simulation.'],
  ['sensors', 'Equipment and IoT signals', ['Sensor data and equipment health', 'Energy use', 'Environmental conditions'], 'Maintenance and operating insights', 'Snapshot record only. No prediction or sensor connection.']
];
