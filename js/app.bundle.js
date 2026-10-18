/* Hybrid Workforce version 2. Local planning prototype. */
(function(){
"use strict";

/* data.js */
const APP_SCHEMA = 2;
const STAGES = ['Define', 'Evaluate', 'Decide', 'Prepare', 'Pilot', 'Operate', 'Paused'];
const CASE_TABS = ['Overview', 'Inputs', 'Process', 'Matches', 'Scenarios', 'Results', 'Deployment', 'Learning'];
const SKILLS = ['inspect', 'classify', 'scan', 'reach', 'grip', 'lift', 'transport', 'orient', 'place', 'confirm', 'exchange', 'clear'];
const SOURCE_STATES = ['Sample', 'Assumed', 'Supplier claim', 'Simulated', 'Measured', 'Unknown', 'Out of date'];
const uid = (prefix = 'record') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const copy = value => JSON.parse(JSON.stringify(value));

function seedConfigs() {
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

function makeCase(name = 'Empty tote sorting', id = uid('case')) {
  const actions = toteActions();
  return {
    id, name, site: 'Automotive site · name pending', country: 'Germany', owner: 'Process engineering', stage: 'Evaluate', revision: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sample: true,
    purpose: 'Find a useful split of work between people and technology. Compare the whole process and its cost.',
    baseline: { demandDaily: 5000, peakFactor: 1.2, shifts: 2, shiftHours: 7.5, daysYear: 250, peoplePerShift: 4, humanUtilPct: 85, salaryAnnual: 75000, minPeoplePerShift: 1, staffingCover: 1, qualityTargetPct: 95, routeM: 5 },
    economics: { commercialModel: 'purchase', integration: 65000, siteChanges: 20000, softwareAnnual: 12000, supportAnnual: 6000, rampMonths: 3, horizonYears: 5, discountPct: 10, retainedPct: 75, cashableFte: 4, benefitMode: 'Avoided hires', residualValue: 0, otherBenefitAnnual: 0, handoffSec: 0.5 },
    actions,
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

function seedWorkspace() {
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
  return { schemaVersion: APP_SCHEMA, activeCaseId: tote.id, cases: [tote, kitting, transport], configs: seedConfigs(), savedAt: new Date().toISOString() };
}

const DEPLOY_CHECKS = [
  ['scope', 'Confirm process and configuration', 'Name the exact work bundle, hardware, tool, software, and operating limits.'],
  ['site', 'Prepare the work area', 'Check routes, clearances, buffers, power, charging, and shared work zones.'],
  ['interfaces', 'Test the interfaces', 'Check dispatch, acknowledgement, duplicate events, timeout, retry, and recovery.'],
  ['performance', 'Check task performance evidence', 'Use the agreed test basis. Record conditions, samples, failures, and transfer limits.'],
  ['release', 'Check the release', 'Link the supported hardware, software/model, tests, and fallback version.'],
  ['operators', 'Prepare operators and support', 'Assign supervision, training, recovery, maintenance, and support duties.'],
  ['safety', 'Record the site safety review', 'The accountable site team must review the actual installation. A demo tick is not certification.'],
  ['pilot', 'Agree the pilot measures and stop rules', 'Define output, quality, intervention, cost, duration, and stop conditions.']
];


/* engine.js */
const MODEL_VERSION = 'planning-2.0.1';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const round = (value, digits = 2) => finite(value) ? Number(value.toFixed(digits)) : null;
const total = values => values.reduce((a, b) => a + b, 0);

function fitAction(action, config) {
  const checks = [];
  if (!config) return { status: 'unknown', checks: [{ name: 'Configuration', status: 'unknown', detail: 'Configuration is missing.' }] };
  checks.push({ name: 'Skill', status: config.skills?.includes(action.skill) ? 'fit' : 'blocked', detail: `${action.skill}: ${config.skills?.includes(action.skill) ? 'included in this record' : 'not included'}` });
  for (const [label, need, available, direction, unit] of [
    ['Payload', action.payloadKg, config.payloadKg, 'minimum', 'kg'],
    ['Reach', action.reachM, config.reachM, 'minimum', 'm'],
    ['Aisle', action.aisleM, config.minAisleM, 'space', 'm']
  ]) {
    if (need === 0 && label !== 'Aisle') continue;
    let status = 'unknown';
    if (finite(need) && finite(available) && need >= 0 && available >= 0) status = (direction === 'space' ? need >= available : available >= need) ? 'fit' : 'blocked';
    checks.push({ name: label, status, detail: `Need ${need ?? 'unknown'} ${unit}; record ${available ?? 'unknown'} ${unit}.` });
  }
  const time = config.times?.[action.skill];
  checks.push({ name: 'Task time', status: finite(time) && time > 0 ? 'fit' : 'unknown', detail: finite(time) && time > 0 ? `${time} seconds per action, before retries.` : 'No task time is available.' });
  return { status: checks.some(c => c.status === 'blocked') ? 'blocked' : checks.some(c => c.status === 'unknown') ? 'unknown' : 'fit', checks, source: config.source, note: 'Fit to the recorded inputs only. This is not site validation.' };
}

function validateCase(c) {
  const errors = [];
  const bounds = {
    'baseline.demandDaily': [0, 1e8], 'baseline.peakFactor': [1, 20], 'baseline.shifts': [1, 6], 'baseline.shiftHours': [0.1, 24], 'baseline.daysYear': [1, 366], 'baseline.peoplePerShift': [0, 10000], 'baseline.humanUtilPct': [1, 100], 'baseline.salaryAnnual': [0, 1e7], 'baseline.minPeoplePerShift': [0, 10000], 'baseline.staffingCover': [1, 5], 'baseline.qualityTargetPct': [0, 100],
    'economics.integration': [0, 1e10], 'economics.siteChanges': [0, 1e10], 'economics.softwareAnnual': [0, 1e10], 'economics.supportAnnual': [0, 1e10], 'economics.rampMonths': [0, 12], 'economics.horizonYears': [1, 20], 'economics.discountPct': [0, 100], 'economics.retainedPct': [0, 100], 'economics.cashableFte': [0, 10000], 'economics.residualValue': [0, 1e10], 'economics.otherBenefitAnnual': [0, 1e10], 'economics.handoffSec': [0, 10000]
  };
  for (const [path, [min, max]] of Object.entries(bounds)) {
    const [group, key] = path.split('.'); const value = c[group]?.[key];
    if (!finite(value) || value < min || value > max) errors.push(`${path}: use a number from ${min} to ${max}.`);
  }
  if (c.baseline?.shifts * c.baseline?.shiftHours > 24) errors.push('Shift hours exceed 24 hours per day.');
  if (!Number.isInteger(c.baseline?.shifts) || !Number.isInteger(c.economics?.horizonYears)) errors.push('Shifts and study years must be whole numbers.');
  if (!['purchase', 'lease', 'raas'].includes(c.economics?.commercialModel)) errors.push('Choose purchase, lease, or RaaS.');
  if (!Array.isArray(c.actions) || !c.actions.length) errors.push('Add at least one action.');
  const ids = new Set((c.actions || []).map(a => a.id));
  if (ids.size !== c.actions?.length) errors.push('Action identifiers must be unique.');
  for (const a of c.actions || []) {
    for (const key of ['seconds', 'frequency', 'payloadKg', 'reachM', 'aisleM']) if (!finite(a[key]) || a[key] < 0) errors.push(`${a.name || a.id}: ${key} is missing or invalid.`);
    if (!a.skill || !a.name?.trim()) errors.push('Name each action and choose its skill.');
    if (a.dependency && (!ids.has(a.dependency) || a.dependency === a.id)) errors.push(`${a.name}: dependency is not valid.`);
  }
  const visiting = new Set(), visited = new Set(), actionMap = new Map((c.actions || []).map(a => [a.id, a]));
  function visit(id) { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); const parent = actionMap.get(id)?.dependency; if (parent && actionMap.has(parent) && visit(parent)) return true; visiting.delete(id); visited.add(id); return false; }
  if ([...ids].some(visit)) errors.push('The action dependencies contain a cycle.');
  return [...new Set(errors)];
}

function evaluateScenario(c, scenario, configs, overrides = {}) {
  const b = { ...c.baseline, ...(overrides.baseline || {}) }, e = { ...c.economics, ...(overrides.economics || {}) };
  const errors = validateCase({ ...c, baseline: b, economics: e });
  const warnings = ['Planning model: no traffic, queue, charger schedule, spatial collision, or site safety validation.'];
  const start = { id: scenario.id, name: scenario.name, modelVersion: MODEL_VERSION, revision: c.revision, errors, warnings, valid: false, status: 'needs-data', cashflows: [], fleet: [], capacity: null, annualNet: null, payback: null, quality: null };
  if (errors.length) return start;
  if (b.demandDaily === 0) return { ...start, status: 'no-demand', errors: ['Demand is zero. No automation benefit can be calculated.'] };
  if (c.actions.some(a => a.parallel)) return { ...start, errors: ['Parallel work is recorded. A shared-resource or event model is required before this local calculation can run.'] };
  const isManual = scenario.kind === 'manual';
  const factor = scenario.manualFactor ?? 1;
  if (!finite(factor) || factor <= 0 || factor > 2) return { ...start, errors: ['The manual method factor is invalid.'] };
  const configMap = new Map(configs.map(v => [v.id, v]));
  const assignments = scenario.assignments || {};
  if (Object.keys(assignments).some(id => !c.actions.some(a => a.id === id))) errors.push('An assignment links to a missing action.');
  const robotSeconds = {}, assignedActions = {}, actionRows = [];
  let humanSeconds = 0, removedSeconds = 0, handoffs = 0, lastActor = 'human';
  const baselineSeconds = total(c.actions.map(a => a.seconds * a.frequency));
  if (baselineSeconds <= 0) errors.push('The human work time must be greater than zero.');
  for (const a of c.actions) {
    const actor = isManual ? 'human' : assignments[a.id] || 'human';
    const humanTime = a.seconds * a.frequency * factor;
    let seconds = humanTime, fit = null;
    if (actor !== 'human') {
      const config = configMap.get(actor); fit = fitAction(a, config);
      if (fit.status !== 'fit') errors.push(`${a.name}: ${fit.status === 'blocked' ? 'a hard requirement fails' : 'performance or capability data is missing'} for ${config?.name || actor}.`);
      seconds = config?.times?.[a.skill] * a.frequency;
      if (!finite(seconds) || seconds <= 0) seconds = 0;
      robotSeconds[actor] = (robotSeconds[actor] || 0) + seconds;
      (assignedActions[actor] ||= []).push(a);
      if (config?.requiresOperator) humanSeconds += seconds;
      removedSeconds += humanTime;
    } else humanSeconds += humanTime;
    if (actor !== lastActor) handoffs++;
    lastActor = actor;
    actionRows.push({ id: a.id, name: a.name, actor, humanBaselineSeconds: a.seconds * a.frequency, seconds, fit: fit?.status || 'human' });
  }
  if (lastActor !== 'human') handoffs++;
  // The local model needs an explicit carrier transfer between different machine types.
  for (let i = 1; i < actionRows.length; i++) if (actionRows[i].actor !== 'human' && actionRows[i - 1].actor !== 'human' && actionRows[i].actor !== actionRows[i - 1].actor) warnings.push('Mixed equipment needs a tested carrier transfer. The handoff time is an assumption.');
  const operatingHours = b.shifts * b.shiftHours;
  const avgHour = b.demandDaily / operatingHours, peakHour = avgHour * b.peakFactor;
  const annualVolume = b.demandDaily * b.daysYear;
  let recoverySeconds = 0, quality = 1, annualMachine = 0, hardwareUpfront = 0;
  for (const [id, rawSeconds] of Object.entries(robotSeconds)) {
    const v = configMap.get(id); if (!v) continue;
    const count = scenario.counts?.[id];
    if (!Number.isInteger(count) || count < 1 || count > 100) errors.push(`${v.name}: use a whole fleet count from 1 to 100.`);
    for (const key of ['successPct', 'interventionPct', 'recoverySec', 'chargePct', 'downtimePct', 'supportAnnual', 'energyAnnual']) if (!finite(v[key]) || v[key] < 0) errors.push(`${v.name}: ${key} is missing or invalid.`);
    if (!(v.successPct > 0 && v.successPct <= 100) || v.interventionPct > 100 || v.chargePct + v.downtimePct >= 100) errors.push(`${v.name}: check success, charge, and downtime percentages.`);
    const usable = 1 - (v.chargePct + v.downtimePct) / 100;
    const success = v.successPct / 100;
    // One retry at most, with the same assumed success rate. Human recovery handles remaining failures and recorded interventions.
    const retrySeconds = rawSeconds * (2 - success);
    const firstPass = success;
    const finalSuccess = 1 - (1 - success) ** 2;
    const interventions = Math.min(1, v.interventionPct / 100 + (1 - finalSuccess));
    recoverySeconds += interventions * v.recoverySec;
    quality *= firstPass;
    const singleRate = retrySeconds > 0 ? 3600 / retrySeconds * usable : 0;
    const required = singleRate > 0 ? Math.ceil(peakHour / singleRate) : null;
    start.fleet.push({ id, name: v.name, count: count || 0, required, busySeconds: rawSeconds, retrySeconds, usablePct: usable * 100, rate: singleRate * (count || 0), source: v.source, interventionPct: interventions * 100 });
    const price = e.commercialModel === 'purchase' ? v.price : v.leaseMonthly;
    if (!finite(price) || price < 0) errors.push(`${v.name}: commercial price is missing or invalid.`);
    if (e.commercialModel === 'purchase') { hardwareUpfront += (count || 0) * (v.price || 0); annualMachine += (count || 0) * (v.supportAnnual + v.energyAnnual); }
    else annualMachine += (count || 0) * ((v.leaseMonthly || 0) * 12 + v.energyAnnual + (v.serviceIncluded ? 0 : v.supportAnnual));
  }
  if (Object.keys(scenario.counts || {}).some(id => !robotSeconds[id] && scenario.counts[id] > 0)) errors.push('The fleet contains an unused configuration. Remove it or assign work to it.');
  if (errors.length) return { ...start, errors: [...new Set(errors)], actionRows };
  humanSeconds += handoffs * e.handoffSec + recoverySeconds;
  const neededPeople = humanSeconds > 0 ? Math.max(b.minPeoplePerShift, Math.ceil(peakHour * humanSeconds / 3600 / (b.humanUtilPct / 100) - 1e-10)) : b.minPeoplePerShift;
  const peoplePerShift = isManual ? b.peoplePerShift : neededPeople;
  const humanRate = humanSeconds > 0 ? peoplePerShift * 3600 * (b.humanUtilPct / 100) / humanSeconds : peakHour;
  const rates = [humanRate, ...start.fleet.map(f => f.rate)];
  const capacity = Math.min(...rates), meetsDemand = capacity + 1e-8 >= peakHour;
  const baselineFte = b.peoplePerShift * b.shifts * b.staffingCover;
  const scenarioFte = peoplePerShift * b.shifts * b.staffingCover;
  const additionalFte = Math.max(0, scenarioFte - baselineFte);
  const extraLaborAnnual = additionalFte * b.salaryAnnual;
  const potentialFte = Math.max(0, baselineFte - scenarioFte);
  const cashFte = e.benefitMode === 'Redeployed capacity' ? 0 : Math.min(potentialFte, e.cashableFte);
  if (potentialFte < e.cashableFte && !isManual) warnings.push('The staffing plan limits the entered cash-benefit positions. Only the achievable reduction is costed.');
  const grossLaborBenefit = cashFte * b.salaryAnnual;
  const capturedLaborBenefit = grossLaborBenefit * e.retainedPct / 100;
  const upfront = isManual ? 0 : (start.fleet.length ? hardwareUpfront + e.integration + e.siteChanges : 0) + (scenario.extraUpfront || 0);
  const annualAddedCost = isManual ? 0 : annualMachine + (start.fleet.length ? e.softwareAnnual + e.supportAnnual : 0) + (scenario.extraAnnual || 0) + extraLaborAnnual;
  if (additionalFte > 0) warnings.push(`The option needs ${additionalFte} additional annual staffing positions. Their full cost is included.`);
  const annualBenefit = isManual ? 0 : capturedLaborBenefit + e.otherBenefitAnnual;
  const annualNet = annualBenefit - annualAddedCost;
  let cumulative = -upfront, npv = -upfront, payback = upfront === 0 && annualNet > 0 ? 0 : null;
  for (let year = 1; year <= e.horizonYears; year++) {
    const benefit = annualBenefit * (year === 1 ? 1 - e.rampMonths / 12 : 1);
    const cash = benefit - annualAddedCost + (year === e.horizonYears && !isManual ? e.residualValue : 0);
    const before = cumulative; cumulative += cash;
    if (payback === null && cumulative >= 0 && cash > 0) payback = (year - 1) + Math.max(0, -before) / cash;
    npv += cash / ((1 + e.discountPct / 100) ** year);
    start.cashflows.push({ year, benefit, cost: annualAddedCost, net: cash, cumulative });
  }
  // Payback follows the actual ramp months. Annual interpolation can claim payback before benefit starts.
  let monthlyBalance = -upfront;
  let hadInvestment = upfront > 0;
  payback = null;
  for (let month = 1; month <= e.horizonYears * 12; month++) {
    const benefitShare = Math.max(0, Math.min(1, month - e.rampMonths));
    const monthlyCash = annualBenefit / 12 * benefitShare - annualAddedCost / 12;
    const before = monthlyBalance;
    monthlyBalance += monthlyCash;
    if (monthlyBalance < 0) hadInvestment = true;
    if (payback === null && monthlyBalance >= 0 && monthlyCash > 0) payback = hadInvestment ? (month - 1 + Math.max(0,-before) / monthlyCash) / 12 : annualNet > 0 ? 0 : null;
    if (month === e.horizonYears * 12 && !isManual) {
      const beforeResidual = monthlyBalance;
      monthlyBalance += e.residualValue;
      if (payback === null && beforeResidual < 0 && monthlyBalance >= 0) payback = e.horizonYears;
    }
  }
  if (e.retainedPct === 0 && cashFte > 0) warnings.push('No labour benefit is retained in this financial viewpoint. Recovery work remains in the staffing requirement.');
  const meetsQuality = quality * 100 >= b.qualityTargetPct;
  if (!meetsDemand) warnings.push('The option does not meet peak demand in the planning model.');
  if (!meetsQuality) warnings.push('The assumed first-pass quality is below the target. Retry success is not used to conceal first-pass failures.');
  const unknownSources = [...new Set(Object.keys(robotSeconds).map(id => configMap.get(id)?.source))];
  const evidence = isManual ? 'Human baseline' : unknownSources.some(s => ['Sample', 'Assumed', 'Unknown', 'Supplier claim', 'Out of date'].includes(s)) ? 'Evidence needed' : 'Evidence supplied · check conditions';
  const financial = meetsDemand && meetsQuality;
  return { ...start, valid: errors.length === 0, financial, cashflows: financial ? start.cashflows : [], status: errors.length ? 'needs-data' : !financial ? 'not-feasible' : isManual ? 'baseline' : annualNet <= 0 || payback === null || npv <= 0 ? 'no-business-case' : 'candidate', errors: [...new Set(errors)], warnings: [...new Set(warnings)], capacity, avgHour, peakHour, meetsDemand, meetsQuality, quality: quality * 100, annualVolume, baselineSeconds, humanSeconds, removedSeconds, handoffs, recoverySeconds, coveragePct: baselineSeconds ? removedSeconds / baselineSeconds * 100 : 0, automatedActions: actionRows.filter(a => a.actor !== 'human').length, actionRows, peoplePerShift, neededPeople, baselineFte, scenarioFte, additionalFte, extraLaborAnnual, potentialFte, cashFte: financial ? cashFte : null, grossLaborBenefit: financial ? grossLaborBenefit : null, capturedLaborBenefit: financial ? capturedLaborBenefit : null, annualBenefit: financial ? annualBenefit : null, upfront, annualAddedCost, annualNet: financial ? annualNet : null, firstYear: financial ? start.cashflows[0]?.net ?? 0 : null, lifetimeNet: financial ? cumulative : null, npv: financial ? npv : null, payback: financial ? payback : null, costPerUnit: financial && annualVolume ? (scenarioFte * b.salaryAnnual + annualAddedCost - extraLaborAnnual + upfront / e.horizonYears) / annualVolume : null, evidence, breakEvenCapturePct: financial && grossLaborBenefit > 0 ? Math.max(0, (annualAddedCost - e.otherBenefitAnnual) / grossLaborBenefit * 100) : null, bottleneck: start.fleet.length && capacity < humanRate ? start.fleet.reduce((a, f) => f.rate < a.rate ? f : a).name : 'Human work / coverage' };
}

function evaluateCase(c, configs) { return c.scenarios.map(s => evaluateScenario(c, s, configs)); }
function recommendCase(c, configs) {
  const results = evaluateCase(c, configs);
  const candidates = results.filter(r => r.status === 'candidate').sort((a, b) => b.npv - a.npv);
  return { results, best: candidates[0] || null, text: candidates.length ? 'Advance this option to an evidence study. Confirm site performance and cash benefit before a pilot.' : results.some(r => r.status === 'needs-data') ? 'Complete the missing inputs or collect task evidence. No supported recommendation is available.' : 'Keep the current method or revise the process. No tested option meets both service and cash-benefit needs.' };
}

function stressScenario(c, scenario, configs) {
  const ordinary = [
    { name: 'Base assumptions', baseline: {}, economics: {} },
    { name: 'Demand +20%', baseline: { demandDaily: c.baseline.demandDaily * 1.2 }, economics: {} },
    { name: 'Benefit capture −25%', baseline: {}, economics: { retainedPct: c.economics.retainedPct * 0.75 } },
    { name: 'Support cost +25%', baseline: {}, economics: { supportAnnual: c.economics.supportAnnual * 1.25 } }
  ].map(s => ({ ...evaluateScenario(c, scenario, configs, s), stressName: s.name }));
  const slower = configs.map(v => ({ ...v, times: Object.fromEntries(Object.entries(v.times || {}).map(([k,t])=>[k,t*1.2])) }));
  const downtime = configs.map(v => ({ ...v, downtimePct: v.downtimePct == null ? null : v.downtimePct + 10 }));
  const intervention = configs.map(v => ({ ...v, interventionPct: v.interventionPct == null ? null : Math.min(100,v.interventionPct * 2) }));
  return [...ordinary, { ...evaluateScenario(c,scenario,slower), stressName:'Robot task time +20%' }, { ...evaluateScenario(c,scenario,downtime), stressName:'Other downtime +10 points' }, { ...evaluateScenario(c,scenario,intervention), stressName:'Human intervention rate ×2' }];
}

function generateOptions(c, configs, maxCount = 6) {
  const candidates = [];
  const assemble = (name, assignments) => {
    const ids=[...new Set(Object.values(assignments))];
    if (!ids.length || ids.length>3) return;
    const scenario={id:`generated-${candidates.length+1}`,name,kind:'hybrid',assignments,counts:Object.fromEntries(ids.map(id=>[id,1])),manualFactor:1,generated:true};
    const initial=evaluateScenario(c,scenario,configs);
    for(const f of initial.fleet) scenario.counts[f.id]=Math.min(maxCount,Math.max(1,f.required||1));
    candidates.push(scenario);
  };
  for(const v of configs){
    const assignments=Object.fromEntries(c.actions.filter(a=>fitAction(a,v).status==='fit').map(a=>[a.id,v.id]));
    assemble(`${v.name} + people · draft`,assignments);
  }
  const mixed={};
  for(const a of c.actions){
    const eligible=configs.filter(v=>!v.requiresOperator&&fitAction(a,v).status==='fit').sort((aConfig,bConfig)=>aConfig.times[a.skill]-bConfig.times[a.skill]);
    if(eligible[0])mixed[a.id]=eligible[0].id;
  }
  assemble('Mixed technology + people · fastest eligible action times',mixed);
  return candidates;
}

function searchFleet(c, scenario, configs, maxCount = 6) {
  const ids = [...new Set(Object.values(scenario.assignments || {}).filter(id => id !== 'human'))];
  if (!ids.length) return [];
  if (ids.length > 3 || maxCount > 8 || maxCount < 1) throw new Error('Use up to three configurations and a fleet bound from one to eight.');
  let combinations = [{}];
  for (const id of ids) combinations = combinations.flatMap(base => Array.from({ length: maxCount }, (_, index) => ({ ...base, [id]: index + 1 })));
  return combinations.map((counts, index) => ({ scenario: { ...scenario, id: `search-${index + 1}`, name: ids.map(id => `${counts[id]} × ${configs.find(v => v.id === id)?.name || id}`).join(' + '), counts }, result: evaluateScenario(c, { ...scenario, counts }, configs) })).sort((a, b) => (a.result.status === 'candidate' ? 0 : 1) - (b.result.status === 'candidate' ? 0 : 1) || (b.result.npv ?? -Infinity) - (a.result.npv ?? -Infinity));
}

function readiness(c, configs) {
  const gaps = [];
  const scenario = c.scenarios.find(s => s.id === c.selectedScenarioId);
  const result = scenario ? evaluateScenario(c, scenario, configs) : null;
  if (!result?.valid || !result.meetsDemand || !result.meetsQuality) gaps.push('Resolve process, capacity, and quality gaps.');
  if (!c.decision || c.decision.revision !== c.revision || c.decision.outcome !== 'Proceed to evidence study' || c.decision.result?.modelVersion !== MODEL_VERSION) gaps.push('Record a current process and business-case decision.');
  for (const key of ['scope','site','interfaces','performance','release','operators','safety','pilot']) if (!c.deployment.checklist[key]) gaps.push(`Complete the ${key} review item.`);
  for (const key of ['siteNotes','interfaceNotes','pilotNotes','rollback','supportOwner']) if (!c.deployment[key]?.trim()) gaps.push(`Add ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
  if (!c.deployment.testResults.length || c.deployment.testResults.some(t => t.status !== 'Pass' || t.revision !== c.revision)) gaps.push('Record passing tests for the current case version.');
  if (result?.evidence === 'Evidence needed') gaps.push('Replace sample or assumed robot performance with applicable test evidence.');
  if (c.sample || c.actions.some(a=>['Sample','Assumed','Unknown','Out of date'].includes(a.source))) gaps.push('Confirm the human baseline, action requirements, and timing with applicable evidence.');
  return { gaps, readyForReview: gaps.length === 0, productionAuthorized: false };
}

function validateObservation(o) {
  const errors = [];
  for (const key of ['units','rejects','interventions']) if (!Number.isInteger(o[key]) || o[key] < 0) errors.push(`${key}: use a non-negative whole number.`);
  for (const key of ['hours','humanHours','downtimeHours','chargeHours','cost']) if (!finite(o[key]) || o[key] < 0) errors.push(`${key}: use a non-negative number.`);
  if (!(o.hours > 0)) errors.push('Observation hours must be greater than zero.');
  if (o.rejects > o.units) errors.push('Rejected units cannot exceed completed units.');
  if (o.downtimeHours + o.chargeHours > o.hours) errors.push('Charge and downtime hours exceed the observation window.');
  if (!o.date || !o.source?.trim()) errors.push('Add a date and source.');
  if (o.baselineCost != null && (!finite(o.baselineCost) || o.baselineCost < 0)) errors.push('Comparable baseline cost must be non-negative or unknown.');
  return errors;
}

function observationMetrics(o) {
  const errors = validateObservation(o); if (errors.length) return { errors };
  return { errors, goodUnits: o.units - o.rejects, goodUph: (o.units - o.rejects) / o.hours, qualityPct: o.units > 0 ? (o.units - o.rejects) / o.units * 100 : null, interventionsPer1000: o.units > 0 ? o.interventions / o.units * 1000 : null, costPerUnit: o.units > o.rejects ? o.cost / (o.units - o.rejects) : null, costDelta: finite(o.baselineCost) ? o.baselineCost - o.cost : null, humanHoursPer1000: o.units > o.rejects ? o.humanHours / (o.units - o.rejects) * 1000 : null };
}


/* store.js */


const STORAGE_KEY = 'hybrid-workforce-v2';
function validateWorkspace(value) {
  const errors = [];
  if (!value || value.schemaVersion !== APP_SCHEMA || !Array.isArray(value.cases) || !Array.isArray(value.configs)) return ['This file is not a version 2 workspace.'];
  if ([...value.cases,...value.configs].some(x=>!x||typeof x!=='object'||typeof x.id!=='string'||['__proto__','prototype','constructor'].includes(x.id))) return ['Every case and configuration needs a valid record identifier.'];
  if (!value.cases.length || value.cases.length > 200 || !value.configs.length || value.configs.length > 500) errors.push('Use 1–200 cases and 1–500 configurations.');
  if (new Set(value.cases.map(c => c.id)).size !== value.cases.length || new Set(value.configs.map(c => c.id)).size !== value.configs.length) errors.push('Case and configuration identifiers must be unique.');
  const configIds = new Set(value.configs.map(v => v.id));
  for (const c of value.cases) {
    if (!c || !c.id || !c.name || !c.site || !c.baseline || !c.economics || !Array.isArray(c.actions) || !Array.isArray(c.scenarios) || !c.deployment || !Array.isArray(c.sources) || !Array.isArray(c.observations) || !Array.isArray(c.deployment.assets) || !Array.isArray(c.deployment.testResults) || !c.deployment.checklist || !c.answers || !Array.isArray(c.issues) || !Array.isArray(c.history)) { errors.push('A case is incomplete.'); continue; }
    if (c.lastTab && !CASE_TABS.includes(c.lastTab)) errors.push(`${c.name}: the saved case stage is invalid.`);
    if ([...c.actions,...c.scenarios,...c.sources,...c.observations,...c.deployment.assets,...c.deployment.testResults,...c.issues].some(x=>!x||typeof x!=='object')) { errors.push(`${c.name}: a child record is invalid.`); continue; }
    if (c.actions?.length > 500 || !c.scenarios.length || c.scenarios.length > 500 || c.observations.length > 10000) { errors.push('A case needs at least one option and must stay within the local record limits.'); continue; }
    // Drafts may have no actions or unknown requirements. Structural errors still fail import.
    for (const msg of validateCase(c)) if (/cycle|unique|dependency/.test(msg)) errors.push(`${c.name}: ${msg}`);
    for (const a of c.actions) for (const key of ['seconds','frequency','payloadKg','reachM','aisleM']) if (a[key] != null && (typeof a[key] !== 'number' || !Number.isFinite(a[key]) || a[key] < 0)) errors.push(`${c.name}: invalid action ${key}.`);
    const allowedKeys = ['demandDaily','peakFactor','shifts','shiftHours','daysYear','peoplePerShift','humanUtilPct','salaryAnnual','minPeoplePerShift','staffingCover','qualityTargetPct'];
    for (const key of allowedKeys) if (c.baseline[key] != null && (typeof c.baseline[key] !== 'number' || !Number.isFinite(c.baseline[key]) || c.baseline[key] < 0)) errors.push(`${c.name}: invalid ${key}.`);
    for (const [key, val] of Object.entries(c.economics || {})) if (typeof val === 'number' && (!Number.isFinite(val) || val < 0)) errors.push(`${c.name}: invalid ${key}.`);
    const actionIds = new Set(c.actions?.map(a => a.id));
    for (const s of c.scenarios) {
      if (!s || !s.id || !s.name || !s.assignments || !s.counts) { errors.push('A scenario is incomplete.'); continue; }
      if (Object.entries(s.assignments).some(([id, actor]) => !actionIds.has(id) || actor !== 'human' && !configIds.has(actor))) errors.push(`${c.name}: an assignment has a missing action or configuration.`);
      if (Object.entries(s.counts).some(([id, count]) => !configIds.has(id) || !Number.isInteger(count) || count < 0 || count > 100)) errors.push(`${c.name}: invalid fleet counts.`);
    }
    for (const o of c.observations) errors.push(...validateObservation(o).map(msg => `${c.name}: ${msg}`));
  }
  for (const v of value.configs) {
    if (!v.id || !v.name || !Array.isArray(v.skills) || !v.times || typeof v.times !== 'object') errors.push('A configuration is incomplete.');
    for (const key of ['payloadKg','reachM','minAisleM','successPct','interventionPct','recoverySec','chargePct','downtimePct','price','leaseMonthly','supportAnnual','energyAnnual']) if (v[key] != null && (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0)) errors.push(`${v.name}: invalid ${key}.`);
    if (Object.values(v.times || {}).some(n => typeof n !== 'number' || !Number.isFinite(n) || n <= 0)) errors.push(`${v.name}: task times must be positive numbers.`);
  }
  return [...new Set(errors)];
}

function createStore({ storage = null, fetcher = null, onStatus = () => {} } = {}) {
  let workspace = seedWorkspace(), serverVersion = null, timer = null, saving = false, queued = false, hadLocal = false, dirty = false;
  try { const stored = storage?.getItem(STORAGE_KEY); if (stored) { const parsed = JSON.parse(stored); if (!validateWorkspace(parsed).length) { workspace = parsed; hadLocal = true; } } } catch { onStatus('Local data could not be read. The sample workspace is open.', 'warning'); }
  const listeners = [];
  function publish() { for (const fn of listeners) fn(workspace); }
  function localSave() {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(workspace)); } catch { onStatus('Browser storage is full. Export your work or use the local server.', 'error'); }
  }
  async function serverSave() {
    if (!fetcher || serverVersion === null) return;
    if (saving) { queued = true; return; }
    saving = true;
    const snapshot = copy(workspace);
    try {
      const response = await fetcher('/api/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace: snapshot, version: serverVersion }) });
      if (response.status === 409) { serverVersion = null; onStatus('The server has a newer version. Local work is preserved. Export it before you reload.', 'error'); }
      else if (!response.ok) throw new Error('Save failed');
      else { const result = await response.json(); serverVersion = result.version; onStatus('Saved to browser and local database', 'saved'); }
    } catch { onStatus('The server is not available. Work is saved in this browser. Export a copy.', 'warning'); }
    finally { saving = false; if (queued) { queued = false; await serverSave(); } }
  }
  function save() { dirty = true; workspace.savedAt = new Date().toISOString(); localSave(); clearTimeout(timer); timer = setTimeout(serverSave, 450); publish(); }
  return {
    get: () => workspace,
    subscribe: fn => listeners.push(fn),
    current: () => workspace.cases.find(c => c.id === workspace.activeCaseId) || workspace.cases[0],
    setActive(id) { if (workspace.cases.some(c => c.id === id)) { workspace.activeCaseId = id; save(); } },
    updateCase(id, update, material = true) {
      const c = workspace.cases.find(c => c.id === id); if (!c) return;
      update(c); c.updatedAt = new Date().toISOString();
      if (material) { c.revision++; if (c.deployment.review) c.deployment.review = null; }
      save();
    },
    updateConfig(id, update) {
      const v = workspace.configs.find(v => v.id === id); if (!v) return;
      update(v); v.revision++;
      for (const c of workspace.cases) { c.revision++; c.updatedAt = new Date().toISOString(); c.deployment.review = null; }
      save();
    },
    addCase(c) { workspace.cases.push(c); workspace.activeCaseId = c.id; save(); },
    replace(next) { const errors = validateWorkspace(next); if (errors.length) throw new Error(errors[0]); workspace = copy(next); if (!workspace.cases.some(c => c.id === workspace.activeCaseId)) workspace.activeCaseId = workspace.cases[0].id; save(); },
    save,
    flush: serverSave,
    async connect() {
      if (!fetcher) { onStatus('Browser storage · offline mode', 'local'); return; }
      try {
        const response = await fetcher('/api/workspace'); if (!response.ok) throw new Error('No service');
        const remote = await response.json(); serverVersion = remote.version;
        if (remote.workspace) {
          if (validateWorkspace(remote.workspace).length) throw new Error('Invalid server data');
          if ((!hadLocal && !dirty) || remote.workspace.savedAt >= workspace.savedAt) { workspace = remote.workspace; localSave(); publish(); }
          else await serverSave();
        } else { localSave(); await serverSave(); }
        onStatus('Saved to browser and local database', 'saved');
      } catch { serverVersion = null; onStatus('Browser storage · offline mode', 'local'); }
    }
  };
}


/* imports.js */

function parseTaskTimes(text) {
  const times = {};
  for (const line of text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)) {
    const index = line.lastIndexOf(':');
    const skill = line.slice(0,index).trim().toLowerCase().replace(/\s+/g,'-');
    const seconds = Number(line.slice(index+1).trim());
    if (index < 1 || !skill || ['__proto__','constructor','prototype'].includes(skill) || skill.length > 80 || !Number.isFinite(seconds) || seconds <= 0 || Object.hasOwn(times,skill)) throw new Error('Use one unique skill: seconds pair per line, with a positive time.');
    times[skill] = seconds;
  }
  return times;
}

function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i+1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i+1] === '\n') i++; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.');
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseActions(text, format = 'txt') {
  if (text.length > 2_000_000) throw new Error('Use an action list smaller than 2 MB.');
  let source;
  if (format === 'json') { const parsed = JSON.parse(text); source = Array.isArray(parsed) ? parsed : parsed.actions; }
  else if (format === 'csv') {
    const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ''));
    if (!headers?.includes('name')) throw new Error('The CSV needs a name column. Optional columns: skill, seconds, frequency, payloadKg, reachM, aisleM, note.');
    source = rows.map(row => Object.fromEntries(headers.map((header,index)=>[header,row[index]??''])));
  } else source = text.split(/\r?\n/).map(line=>line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean).map(name=>({name}));
  if (!Array.isArray(source) || !source.length || source.length > 500) throw new Error('Use a list with 1–500 actions.');
  const numeric = (value, fallback = null) => { if (value === '' || value == null) return fallback; const n=Number(value); if (!Number.isFinite(n)||n<0) throw new Error('Action numbers must be non-negative.'); return n; };
  return source.map((a,index)=>{
    if (!a || typeof a.name !== 'string' || !a.name.trim()) throw new Error(`Action ${index+1} needs a name.`);
    return { id: uid('action'), name: a.name.trim(), skill: a.skill || '', seconds: numeric(a.seconds), frequency: numeric(a.frequency,1), payloadKg: numeric(a.payloadKg), reachM: numeric(a.reachM), aisleM: numeric(a.aisleM), source: 'Assumed', sourceId: '', note: a.note || 'Imported draft. Review skill, timing, requirements, and sequence.', recovery: a.recovery || 'Not defined', dependency: '', parallel: false };
  }).map((a,index,arr)=>({...a,dependency:index?arr[index-1].id:''}));
}


/* views.js */


const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const euro = value => value == null || !Number.isFinite(value) ? 'Not known' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const unitEuro = value => value == null || !Number.isFinite(value) ? 'Not known' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const number = (value, digits = 1) => value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits }).format(value);
const h = htmlEscape;
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 12 9 6 9-6M3 12l9 6 9-6"/>',
  robot: '<rect x="5" y="6" width="14" height="13" rx="3"/><path d="M12 3v3M2 11v4m20-4v4M8 19v3m8-3v3M8 11h1m6 0h1m-7 4h6"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1v15"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6v6h6M8 12h8m-8 4h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  down: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  activity: '<path d="M2 12h4l3-8 6 16 3-8h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  brief: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18m-9-2v4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  link: '<path d="m10 13 4-4m-7 7-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>'
};
const icon = name => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const chip = (text, type = '') => `<span class="chip ${type}">${h(text)}</span>`;
const button = (text, action, { id = '', kind = 'secondary', extra = '', iconName = '' } = {}) => `<button class="button ${kind}" data-action="${h(action)}" ${id ? `data-id="${h(id)}"` : ''} ${extra}>${iconName ? icon(iconName) : ''}${h(text)}</button>`;
const empty = (title, detail, action = '') => `<div class="empty"><div class="empty-icon">${icon('layers')}</div><h3>${h(title)}</h3><p>${h(detail)}</p>${action}</div>`;
const titleRow = (title, detail = '', action = '') => `<div class="section-title"><div><h2>${h(title)}</h2>${detail ? `<p>${h(detail)}</p>` : ''}</div>${action}</div>`;
const panel = (title, detail, body, action = '', className = '') => `<section class="panel ${className}">${titleRow(title, detail, action)}${body}</section>`;
const metric = (label, value, detail = '', tone = '', glyph = 'activity') => `<div class="metric ${tone}"><div class="metric-label">${h(label)}${icon(glyph)}</div><div class="metric-value">${h(value)}</div><div class="metric-detail">${h(detail)}</div></div>`;
const safeOptions = (values, current) => values.map(value => { const [id,label] = Array.isArray(value) ? value : [value,value]; return `<option value="${h(id)}" ${String(id) === String(current) ? 'selected' : ''}>${h(label)}</option>`; }).join('');
function inputField(path, label, value, { unit = '', help = '', type = 'number', step = 'any', min = 0, max = '', prefix = 'field', required = false } = {}) {
  const id = `${prefix}-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
  return `<div class="field"><label for="${id}">${h(label)}${unit ? `<span>${h(unit)}</span>` : ''}</label><input id="${id}" ${prefix === 'field' ? `data-field="${h(path)}"` : `name="${h(path)}"`} type="${type}" value="${h(value)}" ${type === 'number' ? `step="${step}" min="${min}" ${max !== '' ? `max="${max}"` : ''}` : ''} ${required ? 'required' : ''} placeholder="${type === 'number' ? 'Not known' : ''}" ${help ? `aria-describedby="${id}-help"` : ''}>${help ? `<small id="${id}-help">${h(help)}</small>` : ''}</div>`;
}
function selectField(path, label, value, options, { help = '', prefix = 'field' } = {}) {
  const id = `${prefix}-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
  return `<div class="field"><label for="${id}">${h(label)}</label><select id="${id}" ${prefix === 'field' ? `data-field="${h(path)}"` : `name="${h(path)}"`}>${safeOptions(options, value)}</select>${help ? `<small>${h(help)}</small>` : ''}</div>`;
}
const noteField = (path, label, value, help = '') => `<div class="field wide"><label for="note-${h(path)}">${h(label)}</label><textarea id="note-${h(path)}" data-field="${h(path)}" rows="3">${h(value)}</textarea>${help ? `<small>${h(help)}</small>` : ''}</div>`;
const gridFields = items => `<div class="fields">${items.join('')}</div>`;
const table = (headers, rows, className = '') => `<div class="table-scroll"><table class="${className}"><thead><tr>${headers.map(x => `<th>${h(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const row = cells => `<tr>${cells.map(x => `<td>${x}</td>`).join('')}</tr>`;
const progress = (value, tone = '') => `<span class="bar ${tone}"><i style="width:${Math.max(0, Math.min(100, value || 0))}%"></i></span>`;
const resultStatus = r => chip(({ candidate: 'Candidate for study', 'not-feasible': 'Constraint not met', 'needs-data': 'Needs data', 'no-business-case': 'No business case', baseline: 'Current method', 'no-demand': 'No demand' })[r.status] || r.status, r.status === 'candidate' ? 'green' : r.status === 'baseline' ? '' : 'amber');
const viewLink = (c, tab = '', label = 'Open case') => button(label, 'open-case', { id: c.id, kind: 'text', extra: tab ? `data-tab="${tab}"` : '', iconName: 'arrow' });
const selected = ctx => ctx.c.scenarios.find(s => s.id === ctx.c.selectedScenarioId) || ctx.c.scenarios[0];
const selectedResult = ctx => evaluateScenario(ctx.c, selected(ctx), ctx.w.configs);
const scenarioPicker = ctx => `<label class="inline-label">Option<select data-action="select-scenario" aria-label="Selected option">${safeOptions(ctx.c.scenarios.map(s => [s.id, s.name]), ctx.c.selectedScenarioId)}</select></label>`;

function appSidebar(ctx) {
  const links = [['executive','grid','Executive'],['evaluations','layers','Evaluations'],['deployments','robot','Deployments'],['catalog','book','Technology library'],['evidence','file','Evidence & questions']];
  return `<aside class="sidebar ${ctx.mobileMenu ? 'is-open' : ''}" aria-label="Main navigation" ${ctx.isMobile&&!ctx.mobileMenu?'inert':''}><a class="brand" href="#executive"><span class="brand-mark">h<span>+</span></span><span>Hybrid<br><strong>Workforce</strong></span></a><div class="nav-label">WORKSPACE</div><nav>${links.map(([id,glyph,label]) => `<button data-action="navigate" data-id="${id}" class="nav-item ${ctx.view === id || ctx.view === 'case' && id === 'evaluations' ? 'active' : ''}">${icon(glyph)}<span>${label}</span>${id === 'evaluations' ? `<b>${ctx.w.cases.length}</b>` : ''}</button>`).join('')}</nav><div class="sidebar-case"><span class="nav-label">CURRENT CASE</span><strong>${h(ctx.c.name)}</strong><span>${h(ctx.c.site)}</span>${button('Continue case', 'open-case', { id: ctx.c.id, kind: 'sidebar-link', iconName: 'arrow' })}</div><div class="sidebar-footer"><span class="online-dot"></span> Local prototype <span class="version">v2</span><p>People and technology.<br>One complete process.</p><a href="docs/v2-design/design-review.html" target="_blank" rel="noopener">Design basis ${icon('link')}</a></div></aside>`;
}

function renderApp(ctx) {
  const title = { executive:'Executive', evaluations:'Evaluations', deployments:'Deployments', catalog:'Technology library', evidence:'Evidence & questions', case:'Evaluation workspace' }[ctx.view] || 'Executive';
  return `${appSidebar(ctx)}${ctx.mobileMenu?'<button class="nav-scrim" data-action="toggle-menu" aria-label="Close navigation"></button>':''}<div class="app-main"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-toggle" data-action="toggle-menu" aria-label="Toggle navigation">${icon('menu')}</button><span class="crumb">Hybrid Workforce <span>/</span> <strong>${title}</strong></span></div><div class="topbar-right"><span class="save-status" id="save-status">${h(ctx.saveStatus)}</span><label class="sr-only" for="role-view">View role</label><select id="role-view" data-action="role-view" class="role-select">${safeOptions(['Engineer view','Executive view','Site view','Delivery view'],ctx.role)}</select>${button('Export', 'export-workspace', { iconName: 'down', kind:'quiet' })}</div></header><main id="main-content"><div class="prototype-line"><span class="dot amber-dot"></span><strong>Planning prototype</strong><span>Example cases use sample data. External robotics services are not connected.</span></div>${ctx.view === 'case' ? caseView(ctx) : globalView(ctx)}</main><footer class="app-footer"><span>Hybrid Workforce · ${h(ctx.c.site)}</span><span>Local records · Planning model 2.0 · No live robot control</span></footer></div><div id="toast" class="toast" role="status" aria-live="polite"></div><dialog id="app-dialog" aria-labelledby="dialog-title"></dialog>`;
}

function globalView(ctx) {
  if (ctx.view === 'evaluations') return evaluationsView(ctx);
  if (ctx.view === 'deployments') return deploymentsView(ctx);
  if (ctx.view === 'catalog') return catalogView(ctx);
  if (ctx.view === 'evidence') return evidenceView(ctx);
  return executiveView(ctx);
}

function executiveView(ctx) {
  const records = ctx.w.cases.map(c => ({ c, rec: recommendCase(c, ctx.w.configs) }));
  const filtered = ctx.siteFilter ? records.filter(x => x.c.site === ctx.siteFilter) : records;
  const forecast = filtered.reduce((sum,x) => sum + Math.max(0,x.rec.best?.annualNet || 0),0);
  const approved = filtered.filter(x => x.c.decision?.revision === x.c.revision && x.c.decision?.outcome === 'Proceed to evidence study' && x.c.decision.result?.modelVersion === MODEL_VERSION);
  const assets = filtered.flatMap(x => x.c.deployment.assets);
  const observed = filtered.flatMap(x => x.c.observations).filter(o => o.status === 'Measured');
  const approvedCash = approved.reduce((sum,x)=>sum+(x.c.decision.result?.annualNet||0),0);
  const comparable = observed.filter(o=>o.baselineCost!=null&&!observationMetrics(o).errors.length);
  const observedDelta = comparable.length ? comparable.reduce((sum,o)=>sum+observationMetrics(o).costDelta,0) : null;
  return `<div class="page-heading"><div><div class="eyebrow">PORTFOLIO / PEOPLE + TECHNOLOGY</div><h1>Plan the work. Check the value.</h1><p>See the opportunity, the evidence, and the path to site delivery.</p></div>${button('New evaluation','new-case',{kind:'primary',iconName:'plus'})}</div><div class="toolbar"><div class="segmented"><button class="selected" data-action="navigate" data-id="executive">Portfolio view</button><button data-action="navigate" data-id="deployments">Site delivery</button></div><label class="inline-label">Site<select data-action="site-filter" aria-label="Filter site"><option value="">All sites</option>${safeOptions([...new Set(ctx.w.cases.map(c=>c.site))],ctx.siteFilter)}</select></label></div><div class="metrics">${metric('Forecast annual cash saving',euro(forecast),'Best tested candidate per case · sample inputs','green','brief')}${metric('Initiatives in review',number(filtered.length,0),`${filtered.filter(x=>x.rec.best).length} with a modelled candidate`,'','layers')}${metric('Study decisions',number(approved.length,0),'Current recorded decisions · not pilot approval','','check')}${metric('Measured field results',number(observed.length,0),'Sample observations are excluded','','activity')}</div><div class="two-columns portfolio-grid">${panel('From idea to operation','One case links the whole journey.',`<div class="journey-strip">${[['Define','Describe the work'],['Evaluate','Compare options'],['Decide','Review the case'],['Prepare','Prepare delivery'],['Pilot','Measure a trial'],['Operate','Improve the result']].map(([stage,label],i)=>`<div><span class="journey-index">${String(i+1).padStart(2,'0')}</span><strong>${stage}</strong><small>${label}</small><b>${filtered.filter(x=>x.c.stage===stage).length}</b></div>`).join('')}</div><div class="callout subtle">${icon('file')}<div><strong>Forecast is separate from observed value.</strong><p>A positive planning result is a reason to collect evidence. It is not a proven site saving.</p></div></div>`,button('View pipeline','navigate',{id:'evaluations',kind:'text',iconName:'arrow'}))}${panel('Delivery snapshot','Planned, in pilot, and in service.',`<div class="delivery-number">${assets.length}<span>asset records</span></div><div class="mini-stats"><div><b>${assets.filter(a=>a.status==='In pilot').length}</b><span>In pilot</span></div><div><b>${assets.filter(a=>a.status==='In service').length}</b><span>In service</span></div><div><b>${assets.filter(a=>a.status==='Planned').length}</b><span>Planned</span></div></div><p class="muted">These records are local. The sample pilot does not represent a live installation.</p>`,button('Open deployments','navigate',{id:'deployments',kind:'text'}))}</div>${panel('Value basis','Forecast, approved study scope, and measured windows have different meanings.',table(['Measure','Value','Basis'],[row(['Forecast annual cash saving',euro(forecast),'Best tested candidate per case. Conditional on the entered assumptions.']),row(['Approved study forecast',euro(approvedCash),'Current decisions to study the selected option. This does not authorize a pilot or establish savings.']),row(['Measured window cost delta',euro(observedDelta),'Only measured records with an entered comparable baseline cost. This is not annualised.'])]))}${panel('Evaluation portfolio','Forecast values use the best feasible option in the tested set.',table(['Initiative / site','Stage','Best tested option','Annual net cash','Payback','Evidence',''],filtered.map(({c,rec})=>row([`<strong>${h(c.name)}</strong><small>${h(c.site)}</small>`,chip(c.stage),rec.best?h(rec.best.name):'No supported candidate',euro(rec.best?.annualNet),rec.best?.payback!=null?`${number(rec.best.payback)} years`:'—',chip(rec.best?.evidence||'Inputs needed','amber'),viewLink(c)]))))}`;
}

function evaluationsView(ctx) {
  const cases = ctx.w.cases.filter(c => (!ctx.search || `${c.name} ${c.site} ${c.owner}`.toLowerCase().includes(ctx.search.toLowerCase())) && (!ctx.stageFilter || c.stage === ctx.stageFilter));
  return `<div class="page-heading"><div><div class="eyebrow">EVALUATION PIPELINE</div><h1>Start with the work.</h1><p>Build the evidence before you commit to a technology.</p></div>${button('New evaluation','new-case',{kind:'primary',iconName:'plus'})}</div><div class="toolbar"><div class="search-box">${icon('search')}<input type="search" data-action="case-search" aria-label="Search evaluations" value="${h(ctx.search)}" placeholder="Find a process, site, or owner"></div><label class="inline-label">Stage<select data-action="stage-filter" aria-label="Filter stage"><option value="">All stages</option>${safeOptions(STAGES,ctx.stageFilter)}</select></label><div class="toolbar-actions">${button('Import workspace','import-workspace',{iconName:'file'})}<input type="file" id="workspace-import" accept=".json" hidden></div></div><div class="case-cards">${cases.map(c=>{const rec=recommendCase(c,ctx.w.configs), gaps=c.sources.filter(s=>['Unknown','Out of date'].includes(s.status)).length;return `<article class="case-card"><div class="card-top">${chip(c.stage,c.stage==='Pilot'?'purple':'')}${chip(c.sample?'Sample case':'User case')}</div><div class="case-symbol">${icon(c.id==='case-amr'?'robot':'layers')}</div><h2>${h(c.name)}</h2><p>${h(c.site)} · ${h(c.country)}</p><div class="case-stats"><div><span>Daily demand</span><b>${number(c.baseline.demandDaily,0)}</b></div><div><span>Forecast annual net</span><b>${euro(rec.best?.annualNet)}</b></div></div><div class="case-next"><span class="dot amber-dot"></span>${gaps?`${gaps} source gaps to resolve`:'Review the current evidence'}</div><div class="card-footer"><span class="avatar">${h(c.owner.slice(0,1))}</span><span>${h(c.owner)}</span>${viewLink(c)}</div></article>`;}).join('')||empty('No evaluations match','Change the search or add a case.')}</div>`;
}

function deploymentsView(ctx) {
  const assets=ctx.w.cases.flatMap(c=>c.deployment.assets.map(a=>({...a,c}))), pilot=assets.filter(a=>a.status==='In pilot').length;
  return `<div class="page-heading"><div><div class="eyebrow">SITE DELIVERY</div><h1>Know what runs where.</h1><p>Keep process, configuration, release, and site results connected.</p></div>${button('Plan an asset','add-asset',{kind:'primary',iconName:'plus'})}</div><div class="metrics">${metric('Asset records',number(assets.length,0),'Local register','','robot')}${metric('In pilot',number(pilot,0),'Supervised trial stage','purple','activity')}${metric('In service',number(assets.filter(a=>a.status==='In service').length,0),'Recorded status · no live feed','','check')}${metric('Sites with delivery plans',number(ctx.w.cases.filter(c=>c.deployment.siteNotes||c.deployment.assets.length).length,0),'Draft plans and sample sites','','globe')}</div>${panel('Site and asset register','The status is entered by a user. Live telemetry is not connected.',assets.length?table(['Asset / source','Site / process','Configuration','Release','Status',''],assets.map(a=>row([`<strong>${h(a.name)}</strong><small>${h(a.serial)}</small>`,`<strong>${h(a.c.site)}</strong><small>${h(a.c.name)}</small>`,h(ctx.w.configs.find(v=>v.id===a.configId)?.name||a.configId),h(a.release),chip(a.status,a.status==='In pilot'?'purple':''),button('Edit asset','edit-asset',{id:a.id,extra:`data-case="${h(a.c.id)}"`})]))):empty('No asset records','Prepare a plan in a case, then add the intended hardware.'))}${panel('Delivery plans','Open the selected case to complete its plan.',`<div class="delivery-cards">${ctx.w.cases.map(c=>{const ready=readiness(c,ctx.w.configs);return `<div><div class="card-top"><strong>${h(c.name)}</strong>${chip(`${8-DEPLOY_CHECKS.filter(([key])=>!c.deployment.checklist[key]).length}/8 review items`)}</div><p>${h(c.site)}</p>${progress((8-DEPLOY_CHECKS.filter(([key])=>!c.deployment.checklist[key]).length)/8*100)}<small>${ready.gaps.length} open readiness items</small>${viewLink(c,'Deployment','Open plan')}</div>`;}).join('')}</div>`)}`;
}

function catalogView(ctx) {
  return `<div class="page-heading"><div><div class="eyebrow">SUPPLY / TECHNOLOGY LIBRARY</div><h1>Compare a complete configuration.</h1><p>Hardware, tools, software, conditions, evidence, and commercial terms.</p></div>${button('Add configuration','new-config',{kind:'primary',iconName:'plus'})}</div><div class="callout"><span>${icon('file')}</span><div><strong>All supplied envelopes are fictional planning records.</strong><p>The AGIBOT target remains unknown until the model, tools, stack, and performance are confirmed.</p></div></div><div class="technology-cards">${ctx.w.configs.map(v=>`<article class="technology-card"><div class="card-top">${chip(v.family,'purple')}${chip(v.source,v.source==='Unknown'?'amber':'')}</div><div class="technology-symbol">${icon(v.family==='Vision'?'activity':v.family==='Assist tool'?'person':'robot')}</div><h2>${h(v.name)}</h2><p>${h(v.description)}</p><div class="spec-grid"><div><span>Payload</span><b>${v.payloadKg==null?'Unknown':`${number(v.payloadKg)} kg`}</b></div><div><span>Reach</span><b>${v.reachM==null?'Unknown':`${number(v.reachM)} m`}</b></div><div><span>Purchase / unit</span><b>${euro(v.price)}</b></div><div><span>Usable window</span><b>${v.source==='Unknown'?'Unknown':`${number(100-v.chargePct-v.downtimePct)}%`}</b></div></div><div class="skill-tags">${v.skills.map(s=>`<span>${h(s)}</span>`).join('')}</div><div class="card-footer"><small>Record v${v.revision} · ${h(v.sourceDate)}</small>${button('View / edit','edit-config',{id:v.id,kind:'text',iconName:'arrow'})}</div></article>`).join('')}</div>`;
}

function evidenceView(ctx) {
  const sourceRows=ctx.w.cases.flatMap(c=>c.sources.map(s=>row([`<strong>${h(s.name)}</strong><small>${h(s.type)}</small>`,h(c.name),chip(s.status,['Unknown','Out of date'].includes(s.status)?'amber':''),h(s.note),viewLink(c,'Inputs','Review source')])));
  const qs=ctx.questions.filter(q=>(!ctx.questionGroup||q.group===ctx.questionGroup)&&(!ctx.questionSearch||`${q.question} ${q.proposed_default}`.toLowerCase().includes(ctx.questionSearch.toLowerCase())));
  return `<div class="page-heading"><div><div class="eyebrow">EVIDENCE / OPEN DECISIONS</div><h1>Make the unknowns visible.</h1><p>Keep source quality separate from technical fit and financial return.</p></div></div>${panel('Source register','Sources are linked to their case and can be reviewed there.',table(['Source','Case','Status','Notes',''],sourceRows))}${panel('Questions from the design review','Record answers for the current case. Proposed defaults remain visible.',`<div class="toolbar"><label class="inline-label">Area<select data-action="question-group" aria-label="Question area"><option value="">All areas</option>${safeOptions([...new Set(ctx.questions.map(q=>q.group))],ctx.questionGroup)}</select></label><div class="search-box">${icon('search')}<input type="search" aria-label="Search questions" data-action="question-search" value="${h(ctx.questionSearch)}" placeholder="Search the open questions"></div><small>Answers apply to ${h(ctx.c.name)}</small></div><div class="question-list">${qs.map(q=>`<details><summary><span class="question-id">${q.id}</span><span>${h(q.question)}</span>${chip(ctx.c.answers[q.id]?'Answer recorded':q.decision_time,ctx.c.answers[q.id]?'green':'')}</summary><div class="question-body"><div><small>PROPOSED DEFAULT</small><p>${h(q.proposed_default)}</p><small>PROPOSED OWNER</small><p>${h(q.proposed_owner)}</p></div><div class="field"><label for="answer-${q.id}">Case answer</label><textarea id="answer-${q.id}" data-question="${q.id}" rows="3" placeholder="Record the answer, source, and remaining limits.">${h(ctx.c.answers[q.id]||'')}</textarea></div></div></details>`).join('')}</div>`)}`;
}

function caseView(ctx) {
  const c=ctx.c;
  return `<div class="case-heading"><div><div class="eyebrow">EVALUATION / ${h(c.site)}</div><h1>${h(c.name)}</h1><p>${h(c.purpose)}</p></div><div class="case-heading-actions"><select aria-label="Current case" data-action="select-case">${safeOptions(ctx.w.cases.map(x=>[x.id,x.name]),c.id)}</select>${button('Edit case','edit-case',{kind:'quiet'})}</div></div><div class="case-meta">${chip(c.stage,'green')}${chip(c.sample?'Sample inputs':'User inputs')}${chip(`Version ${c.revision}`)}<span>${icon('person')}${h(c.owner)}</span><span>${icon('globe')}${h(c.country)}</span><span class="meta-right">${button('Export case','export-case',{kind:'text',iconName:'down'})}${button('Report','report',{kind:'text',iconName:'file'})}</span></div><nav class="case-tabs" aria-label="Case stages">${CASE_TABS.map((tab,i)=>`<button data-action="case-tab" data-id="${tab}" class="${ctx.tab===tab?'active':''}"><span>${String(i+1).padStart(2,'0')}</span>${tab}</button>`).join('')}</nav><div class="case-content">${({Overview:caseOverview,Inputs:inputsView,Process:processView,Matches:matchesView,Scenarios:scenariosView,Results:resultsView,Deployment:deploymentView,Learning:learningView}[ctx.tab]||caseOverview)(ctx)}</div>`;
}

function caseOverview(ctx) {
  const {c}=ctx, rec=recommendCase(c,ctx.w.configs), result=selectedResult(ctx), sourceGaps=c.sources.filter(s=>s.status==='Unknown').length;
  return `<div class="overview-hero"><div><span class="eyebrow">THE NEXT USEFUL DECISION</span><h2>${rec.best?'Test a complete hybrid process.':'Complete the process evidence.'}</h2><p>${h(rec.text)}</p>${button('Review the process','case-tab',{id:'Process',kind:'primary',iconName:'arrow'})}</div><div class="overview-illustration" aria-hidden="true"><span class="illustration-human">${icon('person')}</span><i>+</i><span class="illustration-robot">${icon('robot')}</span><div class="illustration-line"></div><span class="illustration-label">One process. Shared work.</span></div></div><div class="metrics">${metric('Daily demand',number(c.baseline.demandDaily,0),'Across all shifts · sample baseline','','layers')}${metric('Actions in the process',String(c.actions.length),'Each action has timing and capability needs','','file')}${metric('Forecast annual cash',euro(rec.best?.annualNet),'Best tested feasible option','green','brief')}${metric('Source gaps',String(sourceGaps),'Unknown sources need a clear next action','amber','file')}</div><div class="two-columns">${panel('Case brief','Keep the demand side and supply side connected.',`<dl class="definition-list"><div><dt>Demand</dt><dd>${h(c.name)} · ${number(c.baseline.demandDaily,0)} units/day</dd></div><div><dt>Human baseline</dt><dd>${number(c.baseline.peoplePerShift)} people/shift · ${c.baseline.shifts} shifts</dd></div><div><dt>Selected option</dt><dd>${h(result.name)}</dd></div><div><dt>Financial view</dt><dd>${h(c.economics.benefitMode)} · ${c.economics.retainedPct}% retained labour benefit</dd></div><div><dt>Technology route</dt><dd>${h(c.deployment.route)}</dd></div></dl>`)}${panel('Next actions','Work through the case or open any draft stage.',`<div class="next-list">${[['Inputs','Check the baseline','Reconcile demand, people, and task time.'],['Matches','Check action-level fit','Review blocked and unknown configurations.'],['Results','Review the business case','Separate time removed, staffing, and cash.'],['Deployment','Prepare the delivery path','Name the hardware, stack, tests, and owner.']].map(([tab,title,desc])=>`<button data-action="case-tab" data-id="${tab}"><span class="next-icon">${icon(tab==='Deployment'?'robot':'arrow')}</span><span><strong>${title}</strong><small>${desc}</small></span>${icon('arrow')}</button>`).join('')}</div>`)}</div>`;
}

function inputsView(ctx) {
  const {c}=ctx,b=c.baseline,e=c.economics;
  const baseResult=evaluateScenario(c,c.scenarios.find(x=>x.kind==='manual')||c.scenarios[0],ctx.w.configs);
  const baselineCheck=panel('Baseline reconciliation','Check the staffing and timing model before interpreting the opportunity.',table(['Measure','Entered or calculated value','Basis'],[row(['Human work per unit',`${number(baseResult.baselineSeconds)} s`,'Sum of action time × frequency. Parallel work is excluded from this screening calculation.']),row(['Average / peak demand',`${number(baseResult.avgHour)} / ${number(baseResult.peakHour)} units/h`,'Daily demand across all operating shifts. Peak factor is used for capacity, not annual demand.']),row(['Human capacity',`${number(baseResult.capacity)} units/h`,baseResult.meetsDemand?'The entered staffing meets the peak screening requirement.':'The entered staffing or time model does not establish enough peak capacity. Reconcile it with site evidence.']),row(['Annual staffing positions',number(baseResult.baselineFte),'People per shift × shifts × annual cover factor. Confirm the engineering model and observed allocation.']),row(['Observed output',b.observedUph==null?'Not recorded':`${number(b.observedUph)} units/h`,'A site observation is separate from the engineering and action-time estimates.'])]));
  return `${panel('Source files and evidence','Add a file or record a source. CAD, video, and model files remain references until an adapter is connected.',table(['Source / type','Status','Date','Basis / missing data',''],c.sources.map(s=>row([`<strong>${h(s.name)}</strong><small>${h(s.type)}</small>`,chip(s.status,['Unknown','Out of date'].includes(s.status)?'amber':''),h(s.date||'Not known'),`<span>${h(s.note)}</span>${s.fileId?`<a class="file-link" href="/api/files/${encodeURIComponent(s.fileId)}" target="_blank" rel="noopener">Open stored file</a>`:''}`,button('Edit','edit-source',{id:s.id})]))),`<div class="action-group">${button('Add source','new-source',{iconName:'plus'})}${button('Attach file','attach-file',{iconName:'file'})}<input type="file" id="source-file" hidden></div>`)}<div class="two-columns">${panel('Demand and operating calendar','Use the same demand and calendar for every option.',gridFields([
    inputField('baseline.demandDaily','Daily demand',b.demandDaily,{unit:'units/day'}),inputField('baseline.peakFactor','Peak factor',b.peakFactor,{unit:'× average hour',min:1}),inputField('baseline.shifts','Shifts per day',b.shifts,{step:1,min:1}),inputField('baseline.shiftHours','Hours per shift',b.shiftHours,{unit:'h'}),inputField('baseline.daysYear','Operating days',b.daysYear,{unit:'days/year',step:1,min:1,max:366}),inputField('baseline.qualityTargetPct','First-pass quality target',b.qualityTargetPct,{unit:'%',max:100,help:'Planning assumption. Check actual task and process quality evidence.'})
  ]))}${panel('Human baseline','Positions are counted per shift. Annual FTE positions include every shift.',gridFields([
    inputField('baseline.peoplePerShift','Current people per shift',b.peoplePerShift,{unit:'people',step:1}),inputField('baseline.minPeoplePerShift','Minimum retained coverage',b.minPeoplePerShift,{unit:'people/shift',step:1}),inputField('baseline.salaryAnnual','Fully loaded annual cost',b.salaryAnnual,{unit:'EUR/person/year'}),inputField('baseline.humanUtilPct','Productive share of shift',b.humanUtilPct,{unit:'%',min:1,max:100}),inputField('baseline.staffingCover','Staffing cover factor',b.staffingCover,{unit:'×',min:1,help:'Cover for the annual staffing plan. Do not add absence twice.'}),inputField('baseline.observedUph','Observed average output',b.observedUph,{unit:'units/h',help:'Optional. Record the observation period and source in the input register.'}),inputField('baseline.routeM','Reference route length',b.routeM,{unit:'m',help:'Context only. The current model uses recorded task times, not a generated travel path.'})
  ]))}</div>${panel('Engineering and layout context','This annotated plan is a sample. Enter dimensions and attach the real site plan.',`<div class="layout-preview"><div class="layout-grid"><div class="layout-zone infeed">Infeed<small>Presented totes</small></div><div class="layout-zone human-zone">Human work<small>Inspect · scan · exchange</small></div><div class="layout-route">${icon('arrow')}<span>${number(b.routeM)} m · assumed</span>${icon('arrow')}</div><div class="layout-zone robot-zone">Robot work<small>Lift · move · place</small></div><div class="layout-zone destination">Sort points<small>Destination carriers</small></div><div class="layout-charge">${icon('robot')} Charge / recovery area</div></div><div class="layout-note">Sample 2D context<br>No CAD interpretation<br>No collision or safety check</div></div>`)}${panel('Commercial and business-case inputs','All amounts are EUR scenario inputs. Price and service inclusions are stored in the technology library.',gridFields([
    selectField('economics.commercialModel','Commercial model',e.commercialModel,[['purchase','Purchase'],['lease','Lease'],['raas','RaaS']]),selectField('economics.benefitMode','Benefit basis',e.benefitMode,['Avoided hires','Cash labour reduction','Redeployed capacity'],{help:'Redeployed capacity is shown as capacity value, not cash labour savings.'}),inputField('economics.cashableFte','Positions that can create cash benefit',e.cashableFte,{unit:'annual FTE',help:'Explicit assumption. The model caps this at the achievable staffing change.'}),inputField('economics.retainedPct','Labour benefit retained',e.retainedPct,{unit:'%',max:100}),inputField('economics.integration','Integration and commissioning',e.integration,{unit:'EUR once'}),inputField('economics.siteChanges','Tools and site changes',e.siteChanges,{unit:'EUR once'}),inputField('economics.softwareAnnual','Platform / software cost',e.softwareAnnual,{unit:'EUR/year'}),inputField('economics.supportAnnual','Additional site support',e.supportAnnual,{unit:'EUR/year',help:'Exclude support already included in the robot price or contract.'}),inputField('economics.rampMonths','Months before full benefit',e.rampMonths,{unit:'months',max:12}),inputField('economics.horizonYears','Study / contract horizon',e.horizonYears,{unit:'years',min:1,max:20,step:1}),inputField('economics.discountPct','Discount rate',e.discountPct,{unit:'%',max:100,help:'Scenario assumption, not an approved finance rate.'}),inputField('economics.residualValue','Residual value at study end',e.residualValue,{unit:'EUR'}),inputField('economics.otherBenefitAnnual','Other captured cash benefit',e.otherBenefitAnnual,{unit:'EUR/year',help:'Only enter a supported benefit that is not already counted.'}),inputField('economics.handoffSec','Human work per handoff',e.handoffSec,{unit:'s/transition'})
  ]))}${baselineCheck}${panel('Data completeness','An empty number stays unknown. Correct invalid entries before you use a result.',`<div class="callout subtle"><div><strong>Source status does not follow financial performance.</strong><p>A positive business case cannot turn sample task times into measured performance. The engineering-model and MTM reconciliation remains a visible source review.</p></div></div>`)}`;
}

function processView(ctx) {
  const c=ctx.c,s=selected(ctx),r=selectedResult(ctx);
  return `${panel('Process actions','Enter the actual method. Sequence, timing, dependencies, and recovery remain editable.',`<div class="process-summary"><div><b>${c.actions.length}</b><span>actions</span></div><div><b>${number(c.actions.reduce((sum,a)=>sum+(a.seconds||0)*(a.frequency||0),0))} s</b><span>human work per unit</span></div><div><b>${r.automatedActions??0}</b><span>machine-assigned actions</span></div><div><b>${r.coveragePct==null?'—':number(r.coveragePct)+'%'}</b><span>baseline time assigned to technology</span></div></div><div class="process-map">${c.actions.map((a,i)=>{const actor=s.assignments[a.id],v=ctx.w.configs.find(v=>v.id===actor);return `<button class="action-node ${actor?'machine':''}" data-action="edit-action" data-id="${h(a.id)}"><div><span>${String(i+1).padStart(2,'0')}</span>${icon(actor?'robot':'person')}</div><strong>${h(a.name)}</strong><small>${number(a.seconds)} s × ${number(a.frequency)} · ${h(a.skill)}</small><span class="actor-label">${h(v?.name||'Human')}</span></button>`;}).join('')}</div>`,`${button('Paste actions','paste-actions',{iconName:'file'})}${button('Import actions','import-actions',{iconName:'file'})}${button('Add action','new-action',{kind:'primary',iconName:'plus'})}<input id="actions-import" type="file" accept=".csv,.json,.txt" hidden>`)}${panel('Action detail','The human time is active work. It is not always the total elapsed process time.',table(['# / action','Skill','Human time','Needs','Source','Dependency / recovery',''],c.actions.map((a,i)=>row([`<strong>${i+1}. ${h(a.name)}</strong><small>${h(a.taskGroup||'Task group not set')} · ${h(a.timingMethod||'Timing method not set')}</small><small>${h(a.note)}</small>`,h(a.skill),`${number(a.seconds)} s × ${number(a.frequency)}`,`${number(a.payloadKg)} kg · ${number(a.reachM)} m reach<br>${number(a.aisleM)} m aisle`,chip(a.source),`<small>${h(c.actions.find(x=>x.id===a.dependency)?.name||'Start')}${a.parallel?' · Parallel':''}</small>${h(a.recovery)}`,button('Edit','edit-action',{id:a.id})]))))}<div class="callout"><span>${icon('person')}</span><div><strong>Partial augmentation changes the method.</strong><p>Keep scanning, carrier exchange, support, and recovery work with a named actor. Splitting a load-handling bundle needs a valid handoff method. Recorded parallel work requires a more detailed resource model.</p></div></div>`;
}

function matchesView(ctx) {
  const c = ctx.c, s = selected(ctx);
  const matchRows = c.actions.map(a => row([
    `<strong>${h(a.name)}</strong><small>${number(a.seconds)} s · ${h(a.skill)}</small>`,
    ...ctx.w.configs.map(v => {
      const f = fitAction(a, v);
      return `<button class="fit-cell ${f.status}" data-action="fit-detail" data-id="${h(a.id)}" data-config="${h(v.id)}" aria-label="${h(a.name)}: ${h(v.name)}: ${f.status}">${icon(f.status === 'fit' ? 'check' : f.status === 'blocked' ? 'close' : 'file')}<span>${f.status === 'fit' ? 'Fits inputs' : f.status === 'blocked' ? 'Blocked' : 'Unknown'}</span></button>`;
    })
  ]));
  const assignedRows = c.actions.map(a => {
    const actor = s.assignments[a.id] || 'human';
    const f = actor === 'human' ? null : fitAction(a, ctx.w.configs.find(v => v.id === actor));
    return row([
      `<strong>${h(a.name)}</strong>`,
      `<select data-assignment="${h(a.id)}" aria-label="Actor for ${h(a.name)}">${safeOptions([['human', 'Human'], ...ctx.w.configs.map(v => [v.id, v.name])], actor)}</select>`,
      f ? chip(f.status === 'fit' ? 'Fits recorded inputs' : f.status, f.status === 'fit' ? 'green' : 'amber') : chip('Human')
    ]);
  });
  const toolbar = `<div class="toolbar">${scenarioPicker(ctx)}${button('Generate matched options','generate-options',{kind:'primary',iconName:'layers'})}<div class="legend"><span class="fit-dot green-dot"></span>Fit to recorded inputs<span class="fit-dot red-dot"></span>Blocked<span class="fit-dot amber-dot"></span>Unknown</div></div>`;
  const matrix = panel('Action-to-technology match', 'Check each hard requirement. A commercial score cannot cancel a failed physical constraint.', table(['Action / human time', ...ctx.w.configs.map(v => v.name)], matchRows, 'match-matrix'));
  const assignment = panel('Assign the work', 'Edit the selected option. Blocked or unknown assignments remain drafts and cannot support an evaluation.', table(['Action', 'Assigned actor', 'Model status'], assignedRows), button('View team and fleet', 'case-tab', { id: 'Scenarios', kind: 'primary', iconName: 'arrow' }));
  return toolbar + matrix + assignment + `<div class="callout subtle"><div><strong>Skills belong to a complete configuration.</strong><p>The skill alone does not establish capability. Payload, reach, route, tool, software, task time, conditions, and evidence must also fit.</p></div></div>`;
}

function scenariosView(ctx) {
  const c=ctx.c,s=selected(ctx),r=selectedResult(ctx),results=evaluateCase(c,ctx.w.configs);
  const used=[...new Set(Object.values(s.assignments||{}).filter(id=>id!=='human'))];
  return `<div class="toolbar">${scenarioPicker(ctx)}<div class="action-group">${button('Duplicate option','duplicate-scenario',{iconName:'plus'})}${button('New option','new-scenario',{iconName:'plus'})}${button('Generate matched options','generate-options',{kind:'primary',iconName:'layers'})}</div></div><div class="two-columns">${panel('Team and fleet','Size the machines for the work they perform.',used.length?`<div class="fleet-inputs">${used.map(id=>{const v=ctx.w.configs.find(v=>v.id===id);return `<div class="fleet-input"><div class="fleet-icon">${icon('robot')}</div><div><strong>${h(v?.name||id)}</strong><small>${h(v?.source)} · complete configuration</small></div><label>Units<input type="number" min="1" max="100" step="1" data-count="${h(id)}" value="${s.counts[id]??1}" aria-label="Fleet count for ${h(v?.name||id)}"></label></div>`;}).join('')}</div>`:empty('No machines assigned','Keep the manual comparison or assign work in Matches.'),button('Compare fleet counts','fleet-search',{kind:'primary',iconName:'search',extra:used.length?'':'disabled'}))}${panel('Modelled process performance','Peak demand and the bottleneck limit the whole process.',`<div class="result-status">${resultStatus(r)}</div><dl class="definition-list"><div><dt>Average / peak demand</dt><dd>${number(r.avgHour)} / ${number(r.peakHour)} units/h</dd></div><div><dt>Process capacity</dt><dd>${number(r.capacity)} units/h</dd></div><div><dt>Required people</dt><dd>${number(r.peoplePerShift)} per shift</dd></div><div><dt>Remaining human work</dt><dd>${number(r.humanSeconds)} s/unit</dd></div><div><dt>Handoffs / recovery</dt><dd>${r.handoffs??'—'} transitions · ${number(r.recoverySeconds)} s/unit recovery</dd></div><div><dt>Bottleneck</dt><dd>${h(r.bottleneck||'Complete the inputs')}</dd></div></dl>`)}</div>${r.errors.length?panel('Inputs or constraints to resolve','The app has not calculated a valid result.',`<ul class="error-list">${r.errors.map(e=>`<li>${h(e)}</li>`).join('')}</ul>`):''}${r.fleet.length?panel('Resource capacity','Charge and downtime are disjoint shares of the same operating window. A single retry is allowed in this screening model.',table(['Configuration','Count / required bound','Work + retry time','Usable window','Capacity','Source'],r.fleet.map(f=>row([h(f.name),`${f.count} / ${f.required??'—'}`,`${number(f.busySeconds)} + ${number(f.retrySeconds-f.busySeconds)} s`,`${number(f.usablePct)}%`,`${number(f.rate)} units/h`,chip(f.source)])))):''}${panel('Options in this case','Current and improved manual methods remain in the comparison.',table(['Option','Status','People / shift','Machines','Capacity','Annual net',''],results.map(x=>row([`<strong>${h(x.name)}</strong>`,resultStatus(x),number(x.peoplePerShift),String(x.fleet.reduce((sum,f)=>sum+f.count,0)),`${number(x.capacity)} /h`,euro(x.annualNet),button('Select','choose-scenario',{id:x.id,kind:c.selectedScenarioId===x.id?'primary':'secondary'})]))))}${panel('Search scope and limits','The fleet search tests one to six units per assigned configuration, with up to three configurations.',`<p>Changing fleet count can remove a machine bottleneck. It does not remove remaining human actions or prove traffic, charge scheduling, safe handoffs, or performance at the site. The app reports every tested count and its status.</p>`)}`;
}

function cashChart(result) {
  if (!result.valid) return empty('Cash flow is not available','Complete the inputs and constraints.');
  const points=[{year:0,cumulative:-result.upfront},...result.cashflows], max=Math.max(1,...points.map(p=>Math.abs(p.cumulative))), w=640,hgt=215, x=i=>36+i*(w-72)/(points.length-1), y=v=>105-v/max*75;
  return `<svg viewBox="0 0 ${w} ${hgt}" class="cash-chart" role="img" aria-label="Cumulative incremental cash flow in EUR"><line x1="30" x2="615" y1="105" y2="105" stroke="#c5d6d0" stroke-dasharray="4 5"/><text x="8" y="100" fill="#61756e" font-size="11">0</text><path d="${points.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.cumulative)}`).join(' ')}" fill="none" stroke="#177860" stroke-width="3"/>${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.cumulative)}" r="4" fill="#177860"/><text x="${x(i)}" y="${y(p.cumulative)+(p.cumulative<0?20:-12)}" text-anchor="middle" fill="#264d40" font-size="11">${Math.round(p.cumulative/1000)}k</text><text x="${x(i)}" y="200" text-anchor="middle" fill="#61756e" font-size="11">Year ${p.year}</text>`).join('')}</svg>`;
}

function resultsView(ctx) {
  const c=ctx.c,s=selected(ctx),r=selectedResult(ctx),rec=recommendCase(c,ctx.w.configs),currentDecision=c.decision?.revision===c.revision&&c.decision.result?.modelVersion===MODEL_VERSION;
  return `<div class="toolbar">${scenarioPicker(ctx)}${button('Export recommendation','report',{iconName:'file'})}</div><div class="recommendation"><div class="recommendation-icon">${icon('brief')}</div><div><small>RECOMMENDATION / TESTED SET</small><h2>${rec.best?h(rec.best.name):'No supported candidate'}</h2><p>${h(rec.text)}</p></div><div>${rec.best&&rec.best.id!==s.id?button('Use best candidate','choose-scenario',{id:rec.best.id,kind:'primary'}):''}${chip(rec.best?'Next: evidence study':'Next: revise or collect data',rec.best?'green':'amber')}</div></div><div class="metrics">${metric('Annual net cash saving',euro(r.valid?r.annualNet:null),'Steady year · check the horizon and NPV',r.annualNet>0?'green':'','brief')}${metric('Upfront cash',euro(r.valid?r.upfront:null),'Hardware + integration + site changes','','layers')}${metric('Payback',r.valid&&r.payback!=null?`${number(r.payback)} years`:'No payback','Within the entered study horizon','','clock')}${metric('Process cost per good unit',r.costPerUnit==null?'Not known':unitEuro(r.costPerUnit),'Annual staffing + added cost + spread upfront','','activity')}</div>${r.errors.length?panel('Result unavailable','Resolve these items before you use financial outputs.',`<ul class="error-list">${r.errors.map(x=>`<li>${h(x)}</li>`).join('')}</ul>`):''}<div class="two-columns">${panel('From work time to cash','Each step has a separate meaning.',`<div class="benefit-bridge">${[['Baseline time assigned to machines',r.coveragePct==null?'—':`${number(r.coveragePct)}%`,'A time share, not an employee count.'],['Remaining human work',`${number(r.humanSeconds)} s/unit`,'Includes handoffs, support at assist tools, and recovery.'],['Potential positions released',`${number(r.potentialFte)} annual FTE`,'From a whole-shift staffing calculation.'],['Positions with cash benefit',`${number(r.cashFte)} annual FTE`,c.economics.benefitMode],['Retained labour benefit',euro(r.capturedLaborBenefit),`${c.economics.retainedPct}% retained in this viewpoint.`],['Added annual cost',euro(r.annualAddedCost),'Robot service, energy, software, site support, and any extra staffing.']].map(([label,value,help],i)=>`<div><span class="bridge-index">${i+1}</span><div><strong>${label}</strong><small>${h(help)}</small></div><b>${h(value)}</b></div>`).join('')}</div>`)}${panel('Cumulative cash flow','Upfront cash is paid at year zero. The first year includes the entered ramp-up.',cashChart(r)+`<div class="mini-stats"><div><b>${euro(r.valid?r.npv:null)}</b><span>NPV · ${c.economics.discountPct}% scenario rate</span></div><div><b>${euro(r.valid?r.lifetimeNet:null)}</b><span>Net cash over ${c.economics.horizonYears} years</span></div></div>`)}</div><div class="evidence-grid">${panel('Technical fit',r.meetsDemand&&r.meetsQuality?'Requirements met in this model':'Review the capacity or quality gap',`<strong class="status-value">${r.valid&&r.meetsDemand&&r.meetsQuality?'Conditional fit':'Not established'}</strong><p>Fit applies to the recorded configuration, task bundle, and operating assumptions.</p>`)}${panel('Performance evidence',r.evidence||'Not established',`<strong class="status-value amber-text">${h(r.evidence||'Data needed')}</strong><p>No calibrated probability is available. Supplier data, simulation, and field tests need a stated validity range.</p>`)}${panel('Economic robustness','Check the adverse scenarios below.',`<strong class="status-value">${r.breakEvenCapturePct==null?'Not known':`${number(r.breakEvenCapturePct)}% capture`}</strong><p>Simple steady-year break-even labour-benefit capture. It does not prove payback within the contract.</p>`)}</div>${panel('Scenario stress test','These are named assumptions, not probabilities.',table(['Scenario','Process status','Required people / shift','Capacity','Annual net','Payback'],stressScenario(c,s,ctx.w.configs).map(x=>row([h(x.stressName),resultStatus(x),number(x.peoplePerShift),`${number(x.capacity)} /h`,euro(x.valid?x.annualNet:null),x.valid&&x.payback!=null?`${number(x.payback)} years`:'No payback']))))}${panel('Cash-flow detail','Cash costs are separate from accounting depreciation.',table(['Year','Captured benefit','Added cost','Net cash','Cumulative'],[{year:0,benefit:r.valid?0:null,cost:r.upfront,net:r.upfront==null?null:-r.upfront,cumulative:r.upfront==null?null:-r.upfront},...r.cashflows].map(x=>row([String(x.year),euro(x.benefit),euro(x.cost),euro(x.net),euro(x.cumulative)]))))}${panel('Record the next decision','This records a local planning decision. It does not authorize a robot or a site pilot.',`<div class="decision-summary">${c.decision?`<div>${chip(currentDecision?'Current decision':'Out of date',currentDecision?'green':'amber')}<strong>${h(c.decision.outcome)}</strong><p>${h(c.decision.reason)}</p><small>${h(c.decision.owner)} · Case v${c.decision.revision}</small></div>`:'<p>No decision has been recorded for this version.</p>'}${button('Record decision','record-decision',{kind:'primary',iconName:'check'})}</div>`)}${panel('Model limits and warnings','Keep these with the recommendation.',`<ul class="warning-list">${r.warnings.map(x=>`<li>${h(x)}</li>`).join('')}<li>The staffing plan is a planning bound. Minimum coverage, time fragments, and shared work must be checked at the site.</li><li>All sample evidence remains sample evidence, even when the cash result is positive.</li></ul>`)}`;
}

function deploymentView(ctx) {
  const c=ctx.c,d=c.deployment,ready=readiness(c,ctx.w.configs),checked=DEPLOY_CHECKS.filter(([key])=>d.checklist[key]).length;
  return `<div class="deployment-heading"><div><h2>From a selected option to a site pilot.</h2><p>Keep the hardware, software, tests, and accountable roles together.</p></div>${chip(`${ready.gaps.length} open readiness items`,'amber')}</div><div class="deployment-path">${['Plan','Configure / train','Test release','Prepare site','Supervised pilot','Operate / improve'].map((t,i)=>`<div><span>${i+1}</span><strong>${t}</strong></div>`).join('')}</div><div class="two-columns">${panel('Execution and release plan','Use OEM commissioning, policy/model adaptation, or both. AWS and the OEM must define the supported route.',gridFields([
    selectField('deployment.route','Execution route',d.route,['OEM configuration','Policy / model adaptation','OEM configuration + policy adaptation','To be defined']),inputField('deployment.target','Target hardware and tool',d.target,{type:'text'}),inputField('deployment.release','Release / model / policy version',d.release,{type:'text'}),inputField('deployment.supportOwner','Accountable delivery / support owner',d.supportOwner,{type:'text'}),noteField('deployment.siteNotes','Site preparation and operating limits',d.siteNotes),noteField('deployment.interfaceNotes','Interfaces and recovery method',d.interfaceNotes),noteField('deployment.trainingNotes','Data and training plan, if required',d.trainingNotes,'Name datasets, labels, simulation assets, supported stack, test cases, and expected outputs.'),noteField('deployment.rollback','Fallback and rollback version',d.rollback),noteField('deployment.pilotNotes','Pilot measures and stop rules',d.pilotNotes)
  ]))}${panel('Readiness review','Review items are local records. They do not certify the installation.',`<div class="readiness-progress"><b>${checked}<span>/ 8</span></b><div><strong>Review items recorded</strong>${progress(checked/8*100)}</div></div><div class="check-list">${DEPLOY_CHECKS.map(([key,title,detail])=>`<label><input type="checkbox" data-check="${key}" ${d.checklist[key]?'checked':''}><span><strong>${title}</strong><small>${detail}</small></span></label>`).join('')}</div>`,button('Review readiness','review-readiness',{kind:'primary',iconName:'check'}))}</div>${panel('External service plan','These adapters are not connected. Use them to define the work and output contract.',`<div class="adapter-grid">${[['CAD / environment','Layout, objects, dimensions, and material properties','Mapped model + assumptions + validation issues'],['Process / physics','Versioned process, configuration, task conditions, and test cases','Times, successes, failures, recovery, samples, and limits'],['Training / policy','Supported stack, data, task definitions, tests, and compute','Versioned policy/model + metrics + failure tests'],['Hardware transfer','Approved release, supported hardware, site tests, and fallback','Transfer record + checks + supervised pilot observations']].map(([name,input,output])=>`<div class="adapter-card"><div class="card-top"><strong>${name}</strong>${chip('Not connected')}</div><small>INPUT</small><p>${input}</p><small>REQUIRED OUTPUT</small><p>${output}</p>${button('Prepare request','adapter-request',{id:name,kind:'text',iconName:'file'})}</div>`).join('')}</div>`)}${panel('Test and pilot records','Every test links to a case version. A material change requires a new test.',d.testResults.length?table(['Test','Result','Source / notes','Case version',''],d.testResults.map(t=>row([h(t.name),chip(t.status,t.status==='Pass'?'green':'amber'),`<strong>${h(t.source)}</strong><small>${h(t.note)}</small>`,chip(`v${t.revision}${t.revision===c.revision?'':' · out of date'}`,t.revision===c.revision?'':'amber'),h(t.date)]))):empty('No tests recorded','Define the task, conditions, source, result, and remaining limits.'),button('Add test record','new-test',{iconName:'plus'}))}${panel('Assets planned for this process','Keep intended, pilot, and operating assets separate.',d.assets.length?table(['Asset','Configuration','Release','Status',''],d.assets.map(a=>row([h(a.name),h(ctx.w.configs.find(v=>v.id===a.configId)?.name||a.configId),h(a.release),chip(a.status),button('Edit','edit-asset',{id:a.id,extra:`data-case="${h(c.id)}"`})]))):empty('No planned assets','Create an asset record from the selected option or add one by hand.'),`${button('Add asset','add-asset',{iconName:'plus'})}${button('Create planned fleet','plan-fleet',{kind:'primary',iconName:'robot'})}`)}`;
}

function learningView(ctx) {
  const c=ctx.c,r=selectedResult(ctx), observations=c.observations.map(o=>({...o,metrics:observationMetrics(o)}));
  return `<div class="page-heading compact"><div><h2>Learn from the actual work.</h2><p>Use a defined observation window. Compare demand, output, quality, human work, and cost.</p></div><div class="action-group">${button('Import observations','import-observations',{iconName:'file'})}${button('Add observation','new-observation',{kind:'primary',iconName:'plus'})}<input type="file" id="observations-import" accept=".csv" hidden></div></div><div class="metrics">${metric('Observation records',String(observations.length),'Sample and measured records stay distinct','','file')}${metric('Expected process rate',`${number(r.capacity)} /h`,'Planning capacity · peak screening model','','activity')}${metric('Expected human work',`${number(r.humanSeconds)} s/unit`,'Retained actions + handoff + recovery','','person')}${metric('Open issues',String(c.issues.filter(i=>i.status!=='Closed').length),'Assign a next action and owner','amber','layers')}</div>${panel('Expected versus observed','Observed output depends on supplied demand. A lower rate alone does not prove lower robot capacity.',observations.length?table(['Window / source','Good output','Good-unit share','Interventions','Human work','Cost / good unit','Follow-up'],observations.map(o=>row([`<strong>${h(o.date)} · ${number(o.hours)} h</strong><small>${h(o.source)}</small>${chip(o.status,o.status==='Measured'?'green':'')}`,`${number(o.metrics.goodUnits,0)} units<small>${number(o.metrics.goodUph)} /h</small>`,o.metrics.qualityPct==null?'—':`${number(o.metrics.qualityPct)}%`,`${number(o.metrics.interventionsPer1000)} /1k`,`${number(o.metrics.humanHoursPer1000)} h/1k`,o.metrics.costPerUnit==null?'—':`${unitEuro(o.metrics.costPerUnit)}`,button('Open issue','observation-issue',{id:o.id})]))):empty('No observations yet','Enter measured or sample trial data. No live telemetry is connected.'))}${panel('Issues and improvement work','Revise the process or configuration, then test the new version.',c.issues.length?table(['Issue','Owner','Status','Action / evidence',''],c.issues.map(i=>row([`<strong>${h(i.title)}</strong><small>${h(i.date)}</small>`,h(i.owner),chip(i.status,i.status==='Closed'?'green':'amber'),h(i.note),button('Edit','edit-issue',{id:i.id})]))):empty('No issues recorded','Record performance gaps, failures, interface problems, and the next test.'),button('Add issue','new-issue',{iconName:'plus'}))}<div class="callout subtle"><span>${icon('activity')}</span><div><strong>Review the evidence before you change the model.</strong><p>A new observation can support a revised task time or failure rate. Record its conditions and source in the technology library. Then evaluate a new case version. This app does not automatically retrain or load hardware.</p></div></div>`;
}

function renderReport(c, configs) {
  const scenario=c.scenarios.find(s=>s.id===c.selectedScenarioId)||c.scenarios[0], r=evaluateScenario(c,scenario,configs),rec=recommendCase(c,configs),ready=readiness(c,configs);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(c.name)} — recommendation</title><style>body{font:15px/1.6 'Segoe UI',Arial;color:#183d33;max-width:1000px;margin:40px auto;padding:0 25px}h1{font-size:32px}h2{margin-top:35px}small{display:block;color:#60766e}.banner{background:#f2f5ec;padding:15px;border-left:4px solid #ae9c3d}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px;border-bottom:1px solid #d6e0da;vertical-align:top}th{background:#edf4ef}.chip{font-size:12px}footer{margin-top:35px;border-top:1px solid #ccc;padding-top:15px}@media print{body{margin:0}tr{break-inside:avoid}}</style></head><body><small>HYBRID WORKFORCE · PLANNING REPORT · ${new Date().toISOString().slice(0,10)}</small><h1>${h(c.name)}</h1><p>${h(c.site)} · ${h(c.country)} · Case v${c.revision} · ${h(r.modelVersion)}</p><div class="banner">${c.sample?'Sample inputs. ':''}Planning result. No live simulation, robot training, certification, or hardware deployment is performed by this prototype.</div><h2>Recommendation</h2><p>${h(rec.text)}</p><p>Best candidate in the tested set: <strong>${h(rec.best?.name||'None')}</strong>. Selected option: <strong>${h(scenario.name)}</strong>. Status: ${h(r.status)}.</p><h2>Business case</h2>${table(['Measure','Result'],[['Demand',`${number(c.baseline.demandDaily)} units/day · ${number(r.peakHour)} peak units/h`],['Capacity',`${number(r.capacity)} units/h`],['Human staffing',`${number(r.peoplePerShift)} people/shift · ${number(r.scenarioFte)} annual positions`],['Potential / cash-benefit positions',`${number(r.potentialFte)} / ${number(r.cashFte)}`],['Benefit mode',h(c.economics.benefitMode)],['Annual net cash saving',euro(r.valid?r.annualNet:null)],['Upfront cash',euro(r.valid?r.upfront:null)],['Payback',r.valid&&r.payback!=null?`${number(r.payback)} years`:'No supported payback'],['NPV',`${euro(r.valid?r.npv:null)} · ${c.economics.discountPct}% assumed discount rate`],['First-pass quality',r.quality==null?'Not known':`${number(r.quality)}% · model input basis`],['Performance evidence',h(r.evidence||'Missing')]].map(row))}<h2>Work assignment</h2>${table(['Action','Actor','Baseline seconds','Option seconds'],(r.actionRows||[]).map(a=>row([h(a.name),h(configs.find(v=>v.id===a.actor)?.name||'Human'),number(a.humanBaselineSeconds),number(a.seconds)])))}<h2>Fleet</h2>${table(['Configuration','Count','Required planning bound','Evidence'],r.fleet.map(f=>row([h(f.name),String(f.count),String(f.required??'Unknown'),h(f.source)])))}<h2>Cash flow</h2>${table(['Year','Benefit','Added cost','Net','Cumulative'],r.cashflows.map(y=>row([String(y.year),euro(y.benefit),euro(y.cost),euro(y.net),euro(y.cumulative)])))}<h2>Conditions and limits</h2><ul>${[...r.errors,...r.warnings,'The search is bounded. It does not prove a global optimum.','Task-count coverage is not labour or cash savings.','The confidence probability is not calibrated. Review the sources and adverse scenarios.'].map(x=>`<li>${h(x)}</li>`).join('')}</ul><h2>Deployment path</h2><p>${h(c.deployment.route)}. Target: ${h(c.deployment.target)}. Release: ${h(c.deployment.release)}.</p><ul>${ready.gaps.map(x=>`<li>${h(x)}</li>`).join('')}</ul><h2>Source register</h2>${table(['Source','Status','Date','Notes'],c.sources.map(s=>row([h(s.name),h(s.status),h(s.date),h(s.note)])))}<h2>Recorded decision</h2><p>${c.decision?`${h(c.decision.outcome)} · ${h(c.decision.owner)} · Case v${c.decision.revision}. ${h(c.decision.reason)}`:'No planning decision recorded.'}</p><footer>Prepared locally. All figures depend on the entered assumptions and evidence. Retained business benefit is separate from total automation value.</footer></body></html>`;
}


/* questions.js */
const QUESTION_REGISTER = [{"id": "Q01", "group": "Design", "question": "Does the proposed flow define the correct product scope?", "proposed_default": "Adopt the flow. Keep deployment and measured improvement in the same case.", "proposed_owner": "Radoy and Rohit", "decision_time": "Validate flow", "status": "Open"}, {"id": "Q02", "group": "Design", "question": "Does one shared workflow cover all technologies?", "proposed_default": "Yes. Change the configuration, evidence, and deployment route by technology.", "proposed_owner": "Radoy and Rohit", "decision_time": "Validate flow", "status": "Open"}, {"id": "Q03", "group": "Design", "question": "Are Executive, Evaluations, and Deployments the correct three main views?", "proposed_default": "Use these views. Put libraries under shared navigation.", "proposed_owner": "Radoy", "decision_time": "Validate flow", "status": "Open"}, {"id": "Q04", "group": "Design", "question": "Must the mockup show only the tote PoC or also other use cases?", "proposed_default": "Use the tote case as the main path. Add small, marked sample AMR, arm, and mixed-technology cases.", "proposed_owner": "Radoy and Rohit", "decision_time": "Validate flow", "status": "Open"}, {"id": "Q05", "group": "Design", "question": "Which outcome has priority when cost, capacity, quality, and readiness conflict?", "proposed_default": "Meet hard requirements first. Show the feasible trade-offs. Do not set hidden weights.", "proposed_owner": "Rohit and operations", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q06", "group": "Design", "question": "Which terms and languages must the product use?", "proposed_default": "Use controlled English. Define task, work element, action, skill, capability, payback, and data status in a short glossary.", "proposed_owner": "Radoy", "decision_time": "Validate flow", "status": "Open"}, {"id": "Q07", "group": "Process", "question": "What is the exact site and process for the first case?", "proposed_default": "Confirm the automotive site name, empty tote types, sorting rule, source/destination, and approved SOP. Do not merge parts kitting into this PoC.", "proposed_owner": "Site owner and Diego", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q08", "group": "Process", "question": "What are the start/end points and upstream/downstream duties?", "proposed_default": "Include tote presentation, placement, container exchange, blocked routes, and confirmation when they belong to the process.", "proposed_owner": "Site engineer", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q09", "group": "Process", "question": "Which atomic process breakdown is authoritative?", "proposed_default": "Use a site-reviewed breakdown. The mentioned process image was not available in this conversation; any drafted actions must stay illustrative.", "proposed_owner": "Radoy and site engineer", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q10", "group": "Process", "question": "How much detail must an operator enter?", "proposed_default": "Start with task and action. Offer work-element and motion detail when it changes fit or timing. Do not require every hierarchy level on every form.", "proposed_owner": "Radoy and process engineer", "decision_time": "Validate flow", "status": "Open"}, {"id": "Q11", "group": "Process", "question": "Which MTM or time-study methods are valid?", "proposed_default": "Record the method and source. Support observed and standard times. Do not claim certified MTM without the required method and expertise.", "proposed_owner": "Industrial engineering", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q12", "group": "Process", "question": "Which actions overlap or require the same person/tool?", "proposed_default": "Record dependencies, shared resources, repeat counts, and parallel work. Do not sum overlapping action durations as elapsed cycle time.", "proposed_owner": "Site engineer", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q13", "group": "Process", "question": "Which handoffs, supervision, retries, and recovery duties remain with people?", "proposed_default": "Create explicit work records for each duty. Confirm their frequency and active time.", "proposed_owner": "Site owner and supplier", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q14", "group": "Process", "question": "Is the 5,000-tote example per person, team, shift, or day?", "proposed_default": "Treat all numbers in the latest request as examples until their units and time windows are confirmed.", "proposed_owner": "Radoy and site owner", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q15", "group": "Inputs", "question": "Which engineering model is available and how does it derive staff?", "proposed_default": "Map the required cells/fields manually first. Reconcile its assumptions with observed work.", "proposed_owner": "Engineering", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q16", "group": "Inputs", "question": "Which layout, scan, photo, and video files exist for the actual site?", "proposed_default": "Store the files and manually map distances and clearances. Keep automatic CAD conversion as a future adapter.", "proposed_owner": "Site engineering", "decision_time": "Before external integration", "status": "Open"}, {"id": "Q17", "group": "Inputs", "question": "Which order, SKU, inventory, and event history can the site provide?", "proposed_default": "Use a defined representative period and peak periods. Record missing coverage.", "proposed_owner": "Operations and IT", "decision_time": "Before external integration", "status": "Open"}, {"id": "Q18", "group": "Inputs", "question": "Which workforce calendar and fully loaded cost basis apply?", "proposed_default": "Use anonymous roles, shift coverage, productive hours, and current site rates. Separate annual headcount from people per shift.", "proposed_owner": "Operations and finance", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q19", "group": "Inputs", "question": "What restrictions apply to video, employee data, and cloud storage?", "proposed_default": "Record permitted sources, processing location, access, and retention. Use synthetic media in the mockup.", "proposed_owner": "Site data owner and AWS", "decision_time": "Before real data use", "status": "Open"}, {"id": "Q20", "group": "Supply", "question": "Who owns the technology library and approves each source?", "proposed_default": "DP World owns the record structure. A named owner reviews supplier claims and trial evidence.", "proposed_owner": "Rohit and procurement", "decision_time": "Before external integration", "status": "Open"}, {"id": "Q21", "group": "Supply", "question": "Which AGIBOT model, gripper, sensors, SDK, and control access are available?", "proposed_default": "Keep model and configuration unconfirmed. Do not infer a deployable stack from the vendor name.", "proposed_owner": "AWS and OEM", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q22", "group": "Supply", "question": "Which configuration combinations are supported?", "proposed_default": "Compare only compatible hardware, tools, sensors, software, and interfaces. Mark unverified combinations unknown.", "proposed_owner": "OEM and integrator", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q23", "group": "Supply", "question": "Which specification limits include operating conditions and test methods?", "proposed_default": "Capture the conditions for payload, reach, grip, speed, battery, sensing, and safety-related limits.", "proposed_owner": "OEM and engineering", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q24", "group": "Supply", "question": "Which prices and service terms can be used?", "proposed_default": "Use dated quotes with inclusions. Keep the EUR100,000 robot price as an example until confirmed.", "proposed_owner": "Procurement and finance", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q25", "group": "Supply", "question": "Which solutions require configuration, custom control work, or model training?", "proposed_default": "Ask the OEM/AWS to specify the route for each configuration. Do not assume training from scratch.", "proposed_owner": "AWS, OEM, and integrator", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q26", "group": "Performance", "question": "When can supplier data support an initial process estimate?", "proposed_default": "Permit labelled screening assumptions. Agree the evidence needed before a pilot recommendation.", "proposed_owner": "AWS and engineering", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q27", "group": "Performance", "question": "Is the first physics simulation required, and what question must it resolve?", "proposed_default": "Keep this open. Compare a supplier benchmark, a bench trial, and a physics study against the missing task evidence.", "proposed_owner": "AWS, including Emilio", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q28", "group": "Performance", "question": "When can a task result be reused at another process or site?", "proposed_default": "Define an operating envelope for object, pose, layout, tool, software, and conditions. Check differences before reuse.", "proposed_owner": "AWS and OEM", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q29", "group": "Performance", "question": "Which outputs must a simulation or benchmark provide?", "proposed_default": "Return task times and ranges, first-pass success, retries, failures, recovery, conditions, sample count, and versioned inputs.", "proposed_owner": "AWS and engineering", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q30", "group": "Performance", "question": "What trial sample and error measure are sufficient?", "proposed_default": "Define the success event and variability first. Agree the test design before setting a confidence claim.", "proposed_owner": "AWS and site engineering", "decision_time": "Before site pilot", "status": "Open"}, {"id": "Q31", "group": "Scenarios", "question": "What bounds should the search use for fleet sizes and mixed technologies?", "proposed_default": "Expose minimum/maximum counts, compatible task bundles, and shift options. Report the options actually evaluated.", "proposed_owner": "Engineering and AWS", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q32", "group": "Scenarios", "question": "Which peak, downtime, and demand-growth cases must pass?", "proposed_default": "Include agreed normal, peak, failure, and growth cases. Keep them as scenarios unless probabilities are supported.", "proposed_owner": "Operations", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q33", "group": "Scenarios", "question": "How do robots share chargers, buffers, routes, and human support?", "proposed_default": "Use an explicit schedule/resource model. A simple average availability factor is a screening limit.", "proposed_owner": "Site engineering and AWS", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q34", "group": "Scenarios", "question": "Can the tool propose layout or process changes?", "proposed_default": "Yes, as a separate option with its own time, cost, constraints, and evidence. Keep the current method visible.", "proposed_owner": "Radoy and engineering", "decision_time": "Validate flow", "status": "Open"}, {"id": "Q35", "group": "Economics", "question": "What part of freed time can create cash savings or avoided hires?", "proposed_default": "Require a shift/staffing plan. Show redeployed capacity separately. Do not multiply task-count coverage by salary.", "proposed_owner": "Operations and finance", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q36", "group": "Economics", "question": "Does EUR75,000 mean annual fully loaded cost per person?", "proposed_default": "Keep it as a user example. Confirm currency, benefits, overtime, agency cost, paid hours, and effective date.", "proposed_owner": "Finance", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q37", "group": "Economics", "question": "Which purchase, lease, or RaaS offers should be compared?", "proposed_default": "Model upfront and recurring costs by line item. Prevent duplicate service and maintenance costs.", "proposed_owner": "Procurement and finance", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q38", "group": "Economics", "question": "Who pays the costs and who retains the benefit under the site contract?", "proposed_default": "Show DP World and customer views where needed. Allocate recovery cost separately from the share of labour benefit retained.", "proposed_owner": "Finance and commercial owner", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q39", "group": "Economics", "question": "What contract term, ramp-up, horizon, and exit costs apply?", "proposed_default": "Use an agreed finite cash-flow period. Test contract end, redeployment, and residual value explicitly.", "proposed_owner": "Commercial owner and finance", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q40", "group": "Economics", "question": "Which payback limit, discount rate, FX date, and financial definitions apply?", "proposed_default": "Call a two-year recovery of investment payback. Define ROI separately. Leave rates unknown until agreed.", "proposed_owner": "Finance and Rohit", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q41", "group": "Economics", "question": "Which quality, capacity, safety, or service gains can be monetised?", "proposed_default": "Show the metric first. Add money only with an agreed method and no double counting. Separate robot value from added platform value.", "proposed_owner": "Operations and finance", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q42", "group": "Confidence", "question": "What event would a confidence percentage describe?", "proposed_default": "Define task success, process SLA success, and positive business case as separate questions with stated conditions and time windows.", "proposed_owner": "Radoy, Rohit, and AWS", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q43", "group": "Confidence", "question": "Can the evidence support a probability, or only a quality rating?", "proposed_default": "Show evidence status and scenario ranges first. Leave probability unavailable until the method is supported and checked.", "proposed_owner": "AWS and analytics", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q44", "group": "Confidence", "question": "How should evidence age, missing conditions, and site differences affect the result?", "proposed_default": "Show specific gaps and transfer limits. Do not hide them inside a weighted score.", "proposed_owner": "Engineering and AWS", "decision_time": "Before local calculations", "status": "Open"}, {"id": "Q45", "group": "Confidence", "question": "What evidence permits advance to a benchmark, pilot, or scale-up?", "proposed_default": "Agree a separate evidence requirement for each decision. A strong financial case alone does not prove readiness.", "proposed_owner": "Rohit, site owner, and AWS", "decision_time": "Before site pilot", "status": "Open"}, {"id": "Q46", "group": "Deployment", "question": "Who is the accountable integrator from recommendation to site operation?", "proposed_default": "Name one owner for the full delivery path. Split supplier/AWS/DP World duties in the plan.", "proposed_owner": "Rohit and AWS", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q47", "group": "Deployment", "question": "What model/policy or OEM software will run on the humanoid?", "proposed_default": "Ask AWS/OEM to name the supported stack, access, rights, hardware limits, and fallback route.", "proposed_owner": "AWS and OEM", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q48", "group": "Deployment", "question": "Which datasets, labels, simulation assets, and training runs are required?", "proposed_default": "Define them only after choosing the execution route. Link each item to a task, failure case, and test.", "proposed_owner": "AWS and OEM", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q49", "group": "Deployment", "question": "What must pass before loading hardware and starting a site pilot?", "proposed_default": "Specify bench tests, interface tests, operating limits, site readiness, safe stop/recovery, and the accountable site decision.", "proposed_owner": "Site owner, OEM, and integrator", "decision_time": "Before site pilot", "status": "Open"}, {"id": "Q50", "group": "Deployment", "question": "Who packages, loads, checks, monitors, and rolls back a release?", "proposed_default": "Assign these duties explicitly. Preserve the previous release and its compatible configuration.", "proposed_owner": "AWS, OEM, and integrator", "decision_time": "Before site pilot", "status": "Open"}, {"id": "Q51", "group": "Deployment", "question": "What pilot duration, stop rules, and acceptance measures apply?", "proposed_default": "Agree output, quality, intervention, downtime, human work, cost, and safety-related stop conditions before the trial.", "proposed_owner": "Site owner and Rohit", "decision_time": "Before site pilot", "status": "Open"}, {"id": "Q52", "group": "Deployment", "question": "Which WMS/WES/PLC/fleet interfaces are required?", "proposed_default": "Define dispatch, acknowledgement, exception, ownership, retry, and event contracts. Keep the platform separate from real-time machine control.", "proposed_owner": "IT, integrator, and OEM", "decision_time": "Before external integration", "status": "Open"}, {"id": "Q53", "group": "Operations", "question": "What counts as a deployed asset and where is its status authoritative?", "proposed_default": "Separate planned, in pilot, in service, paused, and retired. Record site, process, serial/configuration, and release.", "proposed_owner": "Operations and IT", "decision_time": "Before external integration", "status": "Open"}, {"id": "Q54", "group": "Operations", "question": "Which telemetry and actual cost data will be available?", "proposed_default": "Start with manual/CSV input. Define denominators, timestamps, and downtime reasons before connecting live feeds.", "proposed_owner": "Operations and OEM", "decision_time": "Before external integration", "status": "Open"}, {"id": "Q55", "group": "Operations", "question": "How will field data change task evidence and future recommendations?", "proposed_default": "Review new evidence, record its operating envelope, update versions, and mark affected results out of date.", "proposed_owner": "Engineering and AWS", "decision_time": "AWS technical definition", "status": "Open"}, {"id": "Q56", "group": "Operations", "question": "When can a pilot scale to more robots or another site?", "proposed_default": "Use observed performance and a fresh local gap check. Do not copy a site approval automatically.", "proposed_owner": "Site owner and Rohit", "decision_time": "Before scale-up", "status": "Open"}, {"id": "Q57", "group": "Mockup and data", "question": "Where must version 2 store cases?", "proposed_default": "Use local persistence plus complete validated export/import first. Add a shared backend only if collaboration needs it.", "proposed_owner": "Radoy", "decision_time": "Before rebuild", "status": "Open"}, {"id": "Q58", "group": "Mockup and data", "question": "Which roles need different views or edit rights?", "proposed_default": "Show Executive, Engineer, Site, and Delivery views as demo roles. Treat real login and shared access as a separate implementation choice.", "proposed_owner": "Radoy and Rohit", "decision_time": "Before rebuild", "status": "Open"}, {"id": "Q59", "group": "Mockup and data", "question": "Which integrations must be working in the mockup?", "proposed_default": "Implement local records, rules, scenario maths, reports, and observed-data entry. Show CAD, physics, training, and hardware transfer as explicit placeholders.", "proposed_owner": "Radoy", "decision_time": "Validate flow", "status": "Open"}];


/* app.js */






const appRoot = document.getElementById('app');
const ui = { view: 'executive', tab: 'Overview', mobileMenu: false, search: '', stageFilter: '', siteFilter: '', questionGroup: '', questionSearch: '', role: 'Engineer view', saveStatus: 'Opening local records…' };
let suppressRender = false, modalSubmit = null, fleetResults = [], pendingImport = null, toastTimer;
let browserStorage = null; try { browserStorage = window.localStorage; } catch {}
const store = createStore({ storage: browserStorage, fetcher: location.protocol === 'file:' ? null : window.fetch.bind(window), onStatus: (message,status) => { ui.saveStatus=message; const label=document.getElementById('save-status'); if(label){label.textContent=message;label.dataset.status=status;} } });
const hx = htmlEscape;
const ctx = () => ({...ui,isMobile:window.matchMedia('(max-width:700px)').matches,w:store.get(),c:store.current(),questions:QUESTION_REGISTER});
const activeScenario = () => { const c=store.current();return c.scenarios.find(s=>s.id===c.selectedScenarioId)||c.scenarios[0]; };
function notify(message,kind='') { const toast=document.getElementById('toast'); if(!toast)return;toast.textContent=message;toast.className=`toast visible ${kind}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.className='toast',5000); }
function render() { if(suppressRender)return;appRoot.innerHTML=renderApp(ctx());document.title=`${ui.view==='case'?store.current().name:'Hybrid Workforce'} · Version 2`; }
store.subscribe(render);
function updateCase(fn,material=true,quiet=false) { suppressRender=quiet;try{store.updateCase(store.current().id,fn,material);}finally{suppressRender=false;} }
function setPath(record,path,value) { const parts=path.split('.');if(parts.some(p=>['__proto__','constructor','prototype'].includes(p)))throw new Error('Unsupported field.');let node=record;for(const part of parts.slice(0,-1))node=node[part];node[parts.at(-1)]=value; }
function readForm(form) { const result={};for(const [key,value] of new FormData(form)){const input=form.elements.namedItem(key);result[key]=input?.type==='number'?(value===''?null:Number(value)):String(value).trim();}return result; }
function closeDialog(){document.getElementById('app-dialog')?.close();modalSubmit=null;}
function openDialog(title,body,onSubmit=null,{submit='Save',wide=false,footer=''}={}) {
  const dialog=document.getElementById('app-dialog');
  dialog.className=wide?'wide-dialog':'';
  dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">HYBRID WORKFORCE / LOCAL RECORD</span><h2 id="dialog-title">${hx(title)}</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><form id="modal-form"><div class="dialog-body">${body}<p id="modal-error" class="form-error" role="alert"></p></div><div class="dialog-footer">${footer}<button type="button" class="button secondary" data-action="close-dialog">${onSubmit?'Cancel':'Close'}</button>${onSubmit?`<button class="button primary" type="submit">${hx(submit)}</button>`:''}</div></form>`;
  modalSubmit=onSubmit;dialog.showModal();dialog.querySelector('input,select,textarea')?.focus();
}
const formInput = (name,label,value,options={})=>inputField(name,label,value,{...options,prefix:'modal'});
const formSelect = (name,label,value,options,help='')=>selectField(name,label,value,options,{prefix:'modal',help});
const formNote = (name,label,value='',help='')=>`<div class="field wide"><label for="modal-${name}">${hx(label)}</label><textarea id="modal-${name}" name="${hx(name)}" rows="3">${hx(value)}</textarea>${help?`<small>${hx(help)}</small>`:''}</div>`;
function downloadFile(name,content,type='application/json') { const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000); }
const jsonDownload=(name,value)=>downloadFile(name,JSON.stringify(value,null,2));
function materialHistory(c,event) { c.history.push({event,date:new Date().toISOString(),revision:c.revision,decision:copy(c.decision||null)}); }
function cleanScenarioCounts(c) { for(const s of c.scenarios){ const used=new Set(Object.values(s.assignments));for(const id of Object.keys(s.counts))if(!used.has(id))delete s.counts[id];for(const id of used)if(id!=='human'&&s.counts[id]==null)s.counts[id]=1; } }

function newCaseDialog() {
  openDialog('New evaluation',gridFields([formInput('name','Process name','',{type:'text',required:true}),formInput('site','Site','',{type:'text',required:true}),formInput('country','Country','Germany',{type:'text',required:true}),formInput('owner','Case owner','Process engineering',{type:'text',required:true}),formSelect('template','Starting point','tote',[['tote','Tote example · sample actions'],['blank','Blank action list']])])+formNote('purpose','Decision to support','Find the best useful split of work between people and technology.'),v=>{
    const c=makeCase(v.name);c.site=v.site;c.country=v.country;c.owner=v.owner;c.purpose=v.purpose;c.stage='Define';
    if(v.template==='blank'){c.actions=[];c.sample=false;c.scenarios=c.scenarios.slice(0,1);c.selectedScenarioId='current';c.sources.forEach(s=>{s.status=s.status==='Unknown'?'Unknown':'Assumed';s.note='Add the source for this new case. Default numeric fields are planning assumptions.';});}
    store.addCase(c);ui.view='case';ui.tab=v.template==='blank'?'Process':'Overview';render();notify('Evaluation created. Review the default assumptions.');
  },{submit:'Create evaluation'});
}
function editCaseDialog() {
  const c=store.current();openDialog('Case details',gridFields([formInput('name','Process name',c.name,{type:'text',required:true}),formInput('site','Site',c.site,{type:'text',required:true}),formInput('country','Country',c.country,{type:'text',required:true}),formInput('owner','Owner',c.owner,{type:'text',required:true}),formSelect('stage','Pipeline stage',c.stage,STAGES),formSelect('sample','Case data label',c.sample?'sample':'user',[['sample','Sample inputs'],['user','User inputs · check the source status']])])+formNote('purpose','Decision to support',c.purpose),v=>{v.sample=v.sample==='sample';updateCase(c=>Object.assign(c,v));notify('Case details saved.');});
}
function actionDialog(id=null) {
  const c=store.current(),a=c.actions.find(a=>a.id===id)||{id:uid('action'),name:'',skill:'inspect',seconds:null,frequency:1,payloadKg:null,reachM:null,aisleM:null,source:'Assumed',sourceId:'',dependency:c.actions.at(-1)?.id||'',note:'',recovery:'',parallel:false};
  openDialog(id?'Edit action':'Add action',gridFields([formInput('name','Action name',a.name,{type:'text',required:true}),formInput('taskGroup','Task group',a.taskGroup||'',{type:'text'}),formInput('workElement','Work element',a.workElement||a.name,{type:'text'}),formInput('object','Object / load',a.object||'',{type:'text'}),formInput('from','Source location',a.from||'',{type:'text'}),formInput('to','Target location',a.to||'',{type:'text'}),formSelect('timingMethod','Timing method',a.timingMethod||'Not known',['Not known','Assumed example','Observed time study','Standard time study','MTM · user-supplied']),formInput('mtmCode','MTM / study code',a.mtmCode||'',{type:'text',help:'Optional. The app does not certify an MTM study.'}),formInput('sampleCount','Timing sample count',a.sampleCount,{step:1}),formInput('skill','Required skill',a.skill,{type:'text',help:'Use a known skill such as grip, or add a specific skill. Add its measured or assumed time to the configuration record.'}),formInput('seconds','Human active time',a.seconds,{unit:'s/action'}),formInput('frequency','Repeat count per unit',a.frequency,{unit:'×'}),formInput('payloadKg','Load requirement',a.payloadKg,{unit:'kg'}),formInput('reachM','Reach requirement',a.reachM,{unit:'m'}),formInput('aisleM','Available aisle',a.aisleM,{unit:'m'}),formSelect('source','Data status',a.source,SOURCE_STATES),formSelect('sourceId','Source record',a.sourceId,[['','Not linked'],...c.sources.map(s=>[s.id,s.name])]),formSelect('dependency','Preceding dependency',a.dependency,[['','Start / no predecessor'],...c.actions.filter(x=>x.id!==a.id).map(x=>[x.id,x.name])]),formSelect('parallel','Can this work overlap?',a.parallel?'yes':'no',[['no','No · sequential planning model'],['yes','Yes · needs a shared-resource model']])])+formNote('note','Method and conditions',a.note)+formNote('recovery','Failure, recovery, and responsible role',a.recovery),v=>{
    v.skill=v.skill.toLowerCase().replace(/\s+/g,'-');const next={...a,...v,parallel:v.parallel==='yes'};
    const draft=copy(c);if(id)draft.actions[draft.actions.findIndex(x=>x.id===id)]=next;else draft.actions.push(next);
    const deps=new Map(draft.actions.map(x=>[x.id,x.dependency]));let curr=next.dependency,seen=new Set([next.id]);while(curr){if(seen.has(curr))throw new Error('This dependency creates a cycle.');seen.add(curr);curr=deps.get(curr);}
    updateCase(c=>{materialHistory(c,'Action edited');c.actions=draft.actions;});notify('Action saved. Review affected matches and results.');
  },{footer:id?button('Remove action','remove-action',{id,kind:'danger',extra:'type="button"'}):'',wide:true});
}
function configDialog(id=null) {
  const v=store.get().configs.find(v=>v.id===id)||{...copy(seedConfigs()[0]),id:uid('config'),name:'New configuration',family:'Humanoid',source:'Unknown',skills:[],times:{},price:null,payloadKg:null,reachM:null};
  openDialog(id?'Configuration and capability record':'Add configuration',`<div class="callout subtle"><p>Values are valid only for their stated configuration and conditions. A measured label needs a real source and applicable test evidence.</p></div>`+gridFields([
    formInput('name','Configuration name',v.name,{type:'text',required:true}),formInput('hardwareModel','Hardware model / version',v.hardwareModel||'Not confirmed',{type:'text'}),formInput('tool','Tool / gripper',v.tool||'Not confirmed',{type:'text'}),formInput('sensors','Sensors',v.sensors||'Not confirmed',{type:'text'}),formInput('software','Software / policy / model',v.software||'Not confirmed',{type:'text'}),formInput('interface','Supported interface',v.interface||'Not verified',{type:'text'}),formInput('quoteValidUntil','Quote valid until',v.quoteValidUntil||'',{type:'date'}),formSelect('family','Technology family',v.family,['Humanoid','AMR','Robot arm','Vision','Assist tool','Fixed automation','Other']),formSelect('source','Evidence status',v.source,SOURCE_STATES),formInput('sourceDate','Source date',v.sourceDate,{type:'date'}),formInput('payloadKg','Maximum payload',v.payloadKg,{unit:'kg'}),formInput('reachM','Maximum reach',v.reachM,{unit:'m'}),formInput('minAisleM','Minimum aisle',v.minAisleM,{unit:'m'}),formInput('successPct','First-pass bundle success',v.successPct,{unit:'%',max:100}),formInput('interventionPct','Extra human intervention events',v.interventionPct,{unit:'% of units',max:100}),formInput('recoverySec','Human time per intervention',v.recoverySec,{unit:'s'}),formInput('chargePct','Charging share of operating window',v.chargePct,{unit:'%',max:99,help:'Exclude this time from downtime.'}),formInput('downtimePct','Other downtime',v.downtimePct,{unit:'%',max:99,help:'Excludes charging. Use the same operating window.'}),formInput('price','Purchase price per unit',v.price,{unit:'EUR once'}),formInput('leaseMonthly','Lease / RaaS fee per unit',v.leaseMonthly,{unit:'EUR/month'}),formInput('supportAnnual','Service cost when not included',v.supportAnnual,{unit:'EUR/unit/year'}),formInput('energyAnnual','Energy cost',v.energyAnnual,{unit:'EUR/unit/year'}),formSelect('serviceIncluded','Lease / RaaS includes service?',v.serviceIncluded?'yes':'no',[['yes','Yes'],['no','No']]),formSelect('requiresOperator','Needs a person for active tool time?',v.requiresOperator?'yes':'no',[['no','No'],['yes','Yes · assist tool']])
  ])+formNote('description','Configuration, tool, software, and operating conditions',v.description)+formNote('sourceNote','Source, test method, samples, and validity limits',v.sourceNote)+`<h3>Task times and supported skills</h3><p class="muted">Enter a positive time to include a skill. Leave it blank when performance is not known. Task times do not include retries.</p>`+gridFields(SKILLS.map(skill=>formInput(`time_${skill}`,`${skill} time`,v.times[skill],{unit:'s/action',min:0.001})))+formNote('customTimes','Additional skills and task times',Object.entries(v.times).filter(([key])=>!SKILLS.includes(key)).map(([key,value])=>key+': '+value).join('\n'),'One skill: seconds pair per line. Example: push-button: 2.5.'),values=>{
    if(values.chargePct!=null&&values.downtimePct!=null&&values.chargePct+values.downtimePct>=100)throw new Error('Charge and downtime must total less than 100%.');
    const times=parseTaskTimes(values.customTimes||'');delete values.customTimes;for(const skill of SKILLS){if(values[`time_${skill}`]!=null)times[skill]=values[`time_${skill}`];delete values[`time_${skill}`];}
    const skills=Object.keys(times);const next={...v,...values,times,skills,serviceIncluded:values.serviceIncluded==='yes',requiresOperator:values.requiresOperator==='yes'};
    // Retain the declared skill for an unknown record even when the time is not yet available.
    if(!skills.length&&v.skills.length)next.skills=v.skills;
    if(id)store.updateConfig(id,x=>Object.assign(x,next));else{store.get().configs.push(next);store.save();}
    notify('Configuration saved. Material changes require a new review.');
  },{wide:true});
}
function sourceDialog(id=null) {
  const s=store.current().sources.find(s=>s.id===id)||{id:uid('source'),name:'',type:'Process / SOP',status:'Unknown',date:'',note:'',fileId:null};
  openDialog(id?'Review source':'Add source',gridFields([formInput('name','Source name',s.name,{type:'text',required:true}),formSelect('type','Source type',s.type,['Process / SOP','Engineering model','Layout / CAD','MTM / time study','Demand / orders','Benchmark / trial','Commercial quote','Other']),formSelect('status','Data status',s.status,SOURCE_STATES),formInput('date','Source / capture date',s.date,{type:'date'})])+formNote('note','Source, conditions, method, samples, and missing data',s.note),values=>{updateCase(c=>{if(id)Object.assign(c.sources.find(x=>x.id===id),values);else c.sources.push({...s,...values});});notify('Source saved.');});
}
function decisionDialog() {
  const c=store.current(),s=activeScenario(),r=evaluateScenario(c,s,store.get().configs);
  openDialog('Record the next decision',`<p>Selected option: <strong>${hx(s.name)}</strong>. ${r.status==='candidate'?'This planning result can advance to an evidence study.':'The selected option has no supported positive planning case.'}</p>`+gridFields([formSelect('outcome','Decision','Proceed to evidence study',['Proceed to evidence study','Collect more data','Change the process','Defer','Stop']),formInput('owner','Accountable owner',c.owner,{type:'text',required:true})])+formNote('reason','Reason, conditions, and next evidence step',''),v=>{
    if(v.reason.length<12)throw new Error('Add a clear reason and the next step.');
    if(v.outcome==='Proceed to evidence study'&&r.status!=='candidate')throw new Error('Select a feasible positive case, or record a different decision.');
    updateCase(c=>{materialHistory(c,'Planning decision recorded');c.decision={...v,revision:c.revision,scenarioId:s.id,recordedAt:new Date().toISOString(),result:copy(r)};c.stage='Decide';},false);notify('Planning decision recorded. This does not authorize a site pilot.');
  },{submit:'Record decision'});
}
function testDialog() {
  openDialog('Add test record',gridFields([formInput('name','Test and conditions','',{type:'text',required:true}),formSelect('status','Result','Planned',['Planned','Pass','Fail','Blocked']),formInput('source','Evidence source','',{type:'text',required:true}),formInput('date','Test date',new Date().toISOString().slice(0,10),{type:'date',required:true})])+formNote('note','Method, samples, failures, and remaining limits',''),v=>{if(v.note.length<8)throw new Error('Describe the test evidence and its limits.');updateCase(c=>c.deployment.testResults.push({...v,id:uid('test'),revision:c.revision}),false);notify('Test record saved for the current case version.');});
}
function assetDialog(id=null,caseId=null) {
  const c=store.get().cases.find(c=>c.id===caseId)||store.current(),a=c.deployment.assets.find(a=>a.id===id)||{id:uid('asset'),name:'',configId:store.get().configs[0].id,status:'Planned',serial:'Not assigned',release:c.deployment.release,note:''};
  openDialog(id?'Asset record':'Plan an asset',gridFields([formSelect('caseId','Case',c.id,store.get().cases.map(c=>[c.id,`${c.name} · ${c.site}`])),formInput('name','Asset name',a.name,{type:'text',required:true}),formSelect('configId','Configuration',a.configId,store.get().configs.map(v=>[v.id,v.name])),formSelect('status','Recorded status',a.status,['Planned','In pilot','In service','Paused','Retired']),formInput('serial','Serial / physical identity',a.serial,{type:'text'}),formInput('release','Supported release',a.release,{type:'text'})])+formNote('note','Source, operating limits, and support notes',a.note),v=>{
    const target=store.get().cases.find(c=>c.id===v.caseId);if(!target)throw new Error('Choose a case.');delete v.caseId;
    if(id&&c.id!==target.id)store.updateCase(c.id,x=>x.deployment.assets=x.deployment.assets.filter(x=>x.id!==id),false);
    store.updateCase(target.id,x=>{const old=x.deployment.assets.find(x=>x.id===id);if(old)Object.assign(old,v);else x.deployment.assets.push({...a,...v});},false);notify('Asset record saved. No hardware connection was made.');
  });
}
function observationDialog() {
  openDialog('Record a process observation',gridFields([
    formInput('date','Observation date',new Date().toISOString().slice(0,10),{type:'date',required:true}),formSelect('status','Data status','Sample',['Sample','Measured']),formInput('source','Source / trial record','',{type:'text',required:true}),formInput('hours','Elapsed observation window',1,{unit:'h',min:0.001,required:true}),formInput('units','Completed units',0,{step:1,required:true}),formInput('rejects','Rejected units',0,{step:1,required:true}),formInput('interventions','Human intervention events',0,{step:1,required:true}),formInput('humanHours','Total human active work',0,{unit:'person-hours',required:true}),formInput('downtimeHours','Other downtime',0,{unit:'h',required:true}),formInput('chargeHours','Charging time',0,{unit:'h',required:true}),formInput('cost','Cost for this observation window',0,{unit:'EUR',required:true}),formInput('baselineCost','Comparable baseline cost',null,{unit:'EUR',help:'Optional. Use the same output, time window, and cost scope. No annual savings are inferred.'})
  ])+formNote('note','Demand, configuration, conditions, and limits',''),v=>{const errors=validateObservation(v);if(errors.length)throw new Error(errors[0]);updateCase(c=>c.observations.push({...v,id:uid('observation'),revision:c.revision,scenarioId:c.selectedScenarioId}),false);notify('Observation recorded. Review conditions before updating model inputs.');},{wide:true});
}
function issueDialog(id=null,fromObservation=null) {
  const i=store.current().issues.find(i=>i.id===id)||{id:uid('issue'),title:fromObservation?'Review the observation gap':'',owner:store.current().owner,status:'Open',note:fromObservation?`Observation ${fromObservation}: compare demand, good output, human work, interventions, and cost.`:'',date:new Date().toISOString().slice(0,10)};
  openDialog(id?'Review issue':'Add improvement issue',gridFields([formInput('title','Issue / change',i.title,{type:'text',required:true}),formInput('owner','Responsible owner',i.owner,{type:'text',required:true}),formSelect('status','Status',i.status,['Open','In progress','Ready for test','Closed'])])+formNote('note','Evidence and next action',i.note),v=>{updateCase(c=>{if(id)Object.assign(c.issues.find(x=>x.id===id),v);else c.issues.push({...i,...v});},false);notify('Improvement record saved.');});
}

function fleetSearchDialog() {
  const c=store.current();fleetResults=searchFleet(c,activeScenario(),store.get().configs,6);
  openDialog('Compare fleet counts',`<div class="callout subtle"><p>${fleetResults.length} combinations evaluated. Bounds: 1–6 units per assigned configuration, up to 3 configurations. This is a bounded planning search, not a global optimum.</p></div>`+table(['Combination','Status','Peak capacity','People / shift','Annual net','Payback',''],fleetResults.map((x,i)=>row([hx(x.scenario.name),chip(x.result.status,x.result.status==='candidate'?'green':'amber'),`${number(x.result.capacity)} /h`,number(x.result.peoplePerShift),euro(x.result.valid?x.result.annualNet:null),x.result.payback==null?'—':`${number(x.result.payback)} years`,button('Use option','use-search',{id:String(i),extra:'type="button"'})]))),null,{wide:true});
}

function previewActions(actions) {
  pendingImport={kind:'actions',actions};
  openDialog('Review the imported actions',`<p>This replaces the current action list. Old scenario assignments and decisions will be cleared. A process snapshot is kept in the case history.</p>`+table(['Action','Skill','Human seconds','Source'],actions.map(a=>row([hx(a.name),hx(a.skill),number(a.seconds),chip(a.source)])))+`<p class="muted">Missing time and requirements stay unknown. Review all imported fields before evaluation.</p>`,()=>{const next=copy(pendingImport.actions);updateCase(c=>{c.history.push({event:'Before process import',date:new Date().toISOString(),revision:c.revision,actions:copy(c.actions),scenarios:copy(c.scenarios)});c.actions=next;c.scenarios.forEach(s=>{s.assignments={};s.counts={};});c.decision=null;});pendingImport=null;ui.view='case';ui.tab='Process';render();notify('Action list imported. Complete unknown fields in the process editor.');},{submit:'Replace action list',wide:true});
}
function pasteActionsDialog(){openDialog('Paste an action list',formSelect('format','Format','txt',[['txt','One action per line'],['csv','CSV with named columns'],['json','JSON action array']])+formNote('text','Process actions','','CSV columns: name, skill, seconds, frequency, payloadKg, reachM, aisleM, note. Plain text creates a draft with unknown times.'),v=>{const actions=parseActions(v.text,v.format);queueMicrotask(()=>previewActions(actions));},{submit:'Review actions',wide:true});}
function workspaceImportPreview(value) {
  const errors=validateWorkspace(value);if(errors.length)throw new Error(errors[0]);pendingImport={kind:'workspace',workspace:value};
  openDialog('Review workspace import',`<p>This replaces the workspace in this browser and local database. Download a backup first if you need the current cases.</p><div class="metrics small-metrics"><div><strong>${value.cases.length}</strong><span>cases</span></div><div><strong>${value.configs.length}</strong><span>configurations</span></div></div><ul>${value.cases.map(c=>`<li>${hx(c.name)} · ${hx(c.site)} · v${c.revision}</li>`).join('')}</ul>`,()=>{const previous=JSON.stringify(store.get());const next=pendingImport.workspace;try{localStorage.setItem('hybrid-workforce-v2-before-import',previous);}catch{}const imported=copy(next);for(const c of imported.cases){c.history.push({event:'Workspace imported; reviews require confirmation',date:new Date().toISOString(),revision:c.revision});c.revision++;c.deployment.review=null;}store.replace(imported);pendingImport=null;ui.view='evaluations';render();notify('Workspace imported. Previous reviews need confirmation. A browser backup was kept.');},{submit:'Import workspace',footer:button('Download current backup','export-workspace',{extra:'type="button"'})});
}

document.addEventListener('submit',event=>{
  if(event.target.id!=='modal-form')return;event.preventDefault();
  if(!modalSubmit)return;const callback=modalSubmit;
  try{const result=callback(readForm(event.target));if(result instanceof Promise){result.then(closeDialog).catch(error=>{const el=document.getElementById('modal-error');if(el)el.textContent=error.message;});}else closeDialog();}catch(error){const el=document.getElementById('modal-error');if(el)el.textContent=error.message;}
});

document.addEventListener('click',async event=>{
  const node=event.target.closest('[data-action]');if(!node||node.tagName==='SELECT'||node.tagName==='INPUT')return;
  const action=node.dataset.action,id=node.dataset.id,c=store.current();
  try{
    if(action==='navigate'){ui.view=id;ui.mobileMenu=false;updateCase(c=>c.lastTab=ui.tab,false);render();window.scrollTo(0,0);}
    else if(action==='toggle-menu'){ui.mobileMenu=!ui.mobileMenu;render();}
    else if(action==='open-case'){store.setActive(id);ui.view='case';ui.tab=node.dataset.tab||store.current().lastTab||'Overview';ui.mobileMenu=false;updateCase(c=>c.lastTab=ui.tab,false);render();window.scrollTo(0,0);}
    else if(action==='case-tab'){ui.tab=id;updateCase(c=>c.lastTab=id,false);window.scrollTo(0,0);}
    else if(action==='new-case')newCaseDialog();
    else if(action==='edit-case')editCaseDialog();
    else if(action==='new-action')actionDialog();
    else if(action==='edit-action')actionDialog(id);
    else if(action==='remove-action'){updateCase(c=>{const removed=c.actions.find(a=>a.id===id);c.history.push({event:'Action removed',revision:c.revision,date:new Date().toISOString(),action:copy(removed)});c.actions=c.actions.filter(a=>a.id!==id);c.actions.forEach(a=>{if(a.dependency===id)a.dependency=removed.dependency;});c.scenarios.forEach(s=>delete s.assignments[id]);cleanScenarioCounts(c);});closeDialog();notify('Action removed. A record is kept in case history.');}
    else if(action==='new-config')configDialog();
    else if(action==='edit-config')configDialog(id);
    else if(action==='new-source')sourceDialog();
    else if(action==='edit-source')sourceDialog(id);
    else if(action==='attach-file')document.getElementById('source-file').click();
    else if(action==='import-actions')document.getElementById('actions-import').click();
    else if(action==='paste-actions')pasteActionsDialog();
    else if(action==='import-workspace')document.getElementById('workspace-import').click();
    else if(action==='fit-detail'){const a=c.actions.find(a=>a.id===id),v=store.get().configs.find(v=>v.id===node.dataset.config),fit=fitAction(a,v);openDialog(`${a.name} / ${v.name}`,table(['Requirement','Status','Detail'],fit.checks.map(x=>row([hx(x.name),chip(x.status,x.status==='fit'?'green':'amber'),hx(x.detail)])))+`<div class="callout subtle"><p>${hx(v.source)} · ${hx(v.sourceNote)}<br>${hx(fit.note)}</p></div>`);}
    else if(action==='choose-scenario'){updateCase(c=>c.selectedScenarioId=id);notify('Selected option updated.');}
    else if(action==='duplicate-scenario'){updateCase(c=>{const next=copy(activeScenario());next.id=uid('option');next.name=`${next.name} · copy`;next.kind=next.kind==='manual'?'hybrid':next.kind;c.scenarios.push(next);c.selectedScenarioId=next.id;});notify('Option copied. Edit its assignments or fleet count.');}
    else if(action==='new-scenario'){updateCase(c=>{const s={id:uid('option'),name:`Custom hybrid ${c.scenarios.length}`,kind:'hybrid',counts:{},assignments:{},manualFactor:1};c.scenarios.push(s);c.selectedScenarioId=s.id;});ui.tab='Matches';render();}
    else if(action==='fleet-search')fleetSearchDialog();
    else if(action==='generate-options'){const generated=generateOptions(c,store.get().configs,6);if(!generated.length)throw new Error('Complete the action requirements and technology task times before generating options.');updateCase(c=>{c.history.push({event:'Options generated',date:new Date().toISOString(),revision:c.revision,scenarios:copy(c.scenarios.filter(s=>s.generated))});c.lastTab='Scenarios';c.scenarios=c.scenarios.filter(s=>!s.generated);for(const s of generated){s.id=uid('option');c.scenarios.push(s);}c.selectedScenarioId=generated[0].id;});ui.tab='Scenarios';render();notify(`${generated.length} draft options generated. Review assignments, handoffs, quality, and evidence.`);}
    else if(action==='use-search'){const next=copy(fleetResults[Number(id)].scenario);next.id=uid('option');updateCase(c=>{c.scenarios.push(next);c.selectedScenarioId=next.id;});closeDialog();notify('Fleet option added to the case.');}
    else if(action==='record-decision')decisionDialog();
    else if(action==='new-test')testDialog();
    else if(action==='add-asset')assetDialog();
    else if(action==='edit-asset')assetDialog(id,node.dataset.case);
    else if(action==='plan-fleet'){const s=activeScenario();if(!Object.keys(s.counts).length)throw new Error('Select an option with an assigned fleet.');let created=0;updateCase(c=>{for(const[configId,count]of Object.entries(s.counts)){const existing=c.deployment.assets.filter(a=>a.configId===configId&&['Planned','In pilot','In service'].includes(a.status)).length;for(let i=existing;i<count;i++){c.deployment.assets.push({id:uid('asset'),name:`${store.get().configs.find(v=>v.id===configId)?.name||configId} ${i+1}`,configId,status:'Planned',serial:'Not assigned',release:c.deployment.release,planScenarioId:s.id,note:`Plan from option ${s.name}, case v${c.revision}.`});created++;}}},false);notify(created?'Planned assets added. No hardware was deployed.':'The asset register already contains the requested fleet counts.');}
    else if(action==='review-readiness'){const ready=readiness(c,store.get().configs);openDialog('Pilot readiness review',`<div class="callout"><p>${ready.readyForReview?'The local record is complete for review. The accountable site team must still make the real decision.':'Readiness is not established. Resolve these items before a real pilot review.'}</p></div><ul class="warning-list">${ready.gaps.map(x=>`<li>${hx(x)}</li>`).join('')}</ul><p>No production authorization is issued by this prototype.</p>`);}
    else if(action==='adapter-request'){const s=activeScenario();jsonDownload(`${id.replace(/[^a-z0-9]/gi,'-')}-request.json`,{type:id,status:'Not connected',caseId:c.id,caseRevision:c.revision,process:c.actions,scenario:s,configurations:store.get().configs.filter(v=>Object.keys(s.counts).includes(v.id)),requiredOutputs:['Versioned inputs','Test conditions and sample count','Task times and variation','First-pass success, retries, and human intervention','Failure and recovery records','Operating envelope and limits'],deployment:copy(c.deployment)});notify('Service request downloaded. No external job was started.');}
    else if(action==='new-observation')observationDialog();
    else if(action==='import-observations')document.getElementById('observations-import').click();
    else if(action==='new-issue')issueDialog();
    else if(action==='edit-issue')issueDialog(id);
    else if(action==='observation-issue')issueDialog(null,id);
    else if(action==='export-workspace'){jsonDownload('hybrid-workforce-workspace.json',store.get());notify('Workspace exported.');}
    else if(action==='export-case'){jsonDownload(`${c.id}.json`,{...copy(store.get()),activeCaseId:c.id,cases:[copy(c)]});notify('Editable case exported with its configurations.');}
    else if(action==='report'){downloadFile(`${c.id}-recommendation.html`,renderReport(c,store.get().configs),'text/html');notify('Recommendation report downloaded.');}
    else if(action==='close-dialog')closeDialog();
  }catch(error){notify(error.message,'error');}
});

document.addEventListener('change',async event=>{
  const node=event.target,c=store.current();
  try{
    if(node.dataset.field){const value=node.type==='number'?(node.value===''?null:Number(node.value)):node.value;if(node.type==='number'&&value!=null&&(!Number.isFinite(value)||(node.min!==''&&value<Number(node.min))||(node.max!==''&&value>Number(node.max))||(node.step==='1'&&!Number.isInteger(value)))){render();throw new Error('Use a value within the field limits. The previous value was kept.');}updateCase(c=>setPath(c,node.dataset.field,value),true,true);return;}
    if(node.dataset.assignment){const actor=node.value;updateCase(c=>{let s=activeScenario();if(s.kind==='manual'&&actor!=='human'){s={...copy(s),id:uid('option'),name:'Custom hybrid from current method',kind:'hybrid'};c.scenarios.push(s);c.selectedScenarioId=s.id;}if(actor==='human')delete s.assignments[node.dataset.assignment];else s.assignments[node.dataset.assignment]=actor;cleanScenarioCounts(c);});return;}
    if(node.dataset.count){updateCase(c=>activeScenario().counts[node.dataset.count]=node.value===''?null:Number(node.value));return;}
    if(node.dataset.check){updateCase(c=>c.deployment.checklist[node.dataset.check]=node.checked);return;}
    if(node.dataset.question){updateCase(c=>c.answers[node.dataset.question]=node.value,false,true);return;}
    const action=node.dataset.action;
    if(action==='select-scenario'){updateCase(c=>c.selectedScenarioId=node.value);}
    else if(action==='select-case'){store.setActive(node.value);}
    else if(action==='stage-filter'){ui.stageFilter=node.value;render();}
    else if(action==='site-filter'){ui.siteFilter=node.value;render();}
    else if(action==='role-view'){ui.role=node.value;ui.view=node.value==='Executive view'?'executive':node.value==='Delivery view'?'deployments':'evaluations';render();}
    else if(action==='question-group'){ui.questionGroup=node.value;render();}
    else if(action==='case-search'){ui.search=node.value;render();}
    else if(action==='question-search'){ui.questionSearch=node.value;render();}
    else if(node.id==='workspace-import'&&node.files[0]){const file=node.files[0];if(file.size>10_000_000)throw new Error('Use a workspace file smaller than 10 MB.');workspaceImportPreview(JSON.parse(await file.text()));}
    else if(node.id==='actions-import'&&node.files[0]){const file=node.files[0];previewActions(parseActions(await file.text(),file.name.split('.').at(-1).toLowerCase()));}
    else if(node.id==='observations-import'&&node.files[0]){
      const file=node.files[0];if(file.size>2_000_000)throw new Error('Use a CSV smaller than 2 MB.');
      const [headers,...rows]=parseCsv(await file.text());if(!headers||rows.length>1000)throw new Error('Use a CSV with up to 1,000 observation rows.');
      const records=rows.map(values=>{const raw=Object.fromEntries(headers.map((key,i)=>[key,values[i]]));const o={...raw,id:uid('observation'),status:raw.status==='Measured'?'Measured':'Sample',revision:c.revision,scenarioId:c.selectedScenarioId};for(const key of ['hours','units','rejects','interventions','humanHours','downtimeHours','chargeHours','cost','baselineCost'])o[key]=raw[key]==null||raw[key]===''?(key==='baselineCost'?null:NaN):Number(raw[key]);const errors=validateObservation(o);if(errors.length)throw new Error(errors[0]);return o;});
      if(!records.length)throw new Error('The CSV contains no observations.');
      openDialog('Review observation import',table(['Date','Source','Data status','Units','Hours'],records.map(o=>row([hx(o.date),hx(o.source),chip(o.status),number(o.units),number(o.hours)]))),()=>{updateCase(c=>c.observations.push(...records),false);notify('Observation records imported.');},{submit:'Import observations',wide:true});
    }
    else if(node.id==='source-file'&&node.files[0]){
      const file=node.files[0];if(file.size>25_000_000)throw new Error('Use a file smaller than 25 MB.');
      let fileId=null;try{if(location.protocol==='file:')throw new Error();const response=await fetch(`/api/files?name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});if(!response.ok)throw new Error();fileId=(await response.json()).id;}catch{}
      updateCase(c=>c.sources.push({id:uid('source'),name:file.name,type:'Other',status:'Unknown',date:new Date().toISOString().slice(0,10),note:fileId?`Stored source file (${number(file.size/1024)} KB). Review and map the relevant fields. No CAD, video, or engineering-model parsing has run.`:'File reference only. File content was not stored because the local file service is unavailable.',fileId}));notify(fileId?'Source file stored. Review and map its inputs.':'Reference added. File content was not stored.');
    }
  }catch(error){notify(error.message,'error');}
});

window.matchMedia('(max-width:700px)').addEventListener('change',render);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&ui.mobileMenu){ui.mobileMenu=false;render();document.querySelector('.mobile-toggle')?.focus();}});
window.addEventListener('hashchange',()=>{const view=location.hash.slice(1);if(['executive','evaluations','deployments','catalog','evidence'].includes(view)){ui.view=view;render();}});
window.addEventListener('beforeunload',()=>{store.flush();});
render();store.connect();

})();
