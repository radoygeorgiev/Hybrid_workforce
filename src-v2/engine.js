export const MODEL_VERSION = 'planning-2.2.0';
export const finite = value => typeof value === 'number' && Number.isFinite(value);
export const round = (value, digits = 2) => finite(value) ? Number(value.toFixed(digits)) : null;
export const total = values => values.reduce((a, b) => a + b, 0);

export function fitAction(action, config) {
  const checks = [];
  if (action.humanRetained) checks.push({name:'Retained human decision',status:'blocked',detail:action.humanReason||'This draft retains the human role.'});
  if (config?.excludedFromMatching) checks.push({name:'Product variant',status:'blocked',detail:'This product variant has no supported warehouse development or task basis.'});
  if (action.requiredCapabilities?.length) for(const capability of action.requiredCapabilities) checks.push({name:`Capability: ${capability}`,status:config?.capabilities?.includes(capability)?'fit':'unknown',detail:config?.capabilities?.includes(capability)?'Engineering candidate. Confirm the tool, policy, and operating envelope.':'Capability is not established for this configuration.'});
  if (!config) return { status: 'unknown', checks: [{ name: 'Configuration', status: 'unknown', detail: 'Configuration is missing.' }] };
  const skillDeclared=config.skills?.includes(action.skill)||action.requiredCapabilities?.length>0&&action.requiredCapabilities.every(cap=>config.capabilities?.includes(cap));
  checks.push({ name:'Skill',status:skillDeclared?'fit':'blocked',detail:skillDeclared?'Skill or complete capability candidate set is recorded. Confirm the application task.':`${action.skill}: not included in this record` });
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

export function validateCase(c) {
  const errors = [];
  if(c.processTemplateId&&!c.templateReviewed)errors.push('Confirm the source path and engineering decomposition before using the business case.');
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

export function evaluateScenario(c, scenario, configs, overrides = {}) {
  const b = { ...c.baseline, ...(overrides.baseline || {}) }, e = { ...c.economics, ...(overrides.economics || {}) };
  const errors = validateCase({ ...c, baseline: b, economics: e });
  const warnings = ['Planning model: no traffic, queue, charger schedule, spatial collision, or site safety validation.'];
  const start = { id: scenario.id, name: scenario.name, modelVersion: MODEL_VERSION, revision: c.revision, errors, warnings, valid: false, status: 'needs-data', cashflows: [], fleet: [], capacity: null, annualNet: null, payback: null, quality: null };
  if(scenario.processChanges?.length)errors.push('Process redesign is a visual engineering draft. Validate revised actions, dependencies, timings, handoffs, and model mapping before calculating productivity or cash benefit.');
  if (errors.length) return start;
  if (b.demandDaily === 0) return { ...start, status: 'no-demand', errors: ['Demand is zero. No automation benefit can be calculated.'] };
  if (c.actions.some(a => a.parallel)) return { ...start, errors: ['Parallel work is recorded. A shared-resource or event model is required before this local calculation can run.'] };
  const isManual = scenario.kind === 'manual';
  const factor = scenario.manualFactor ?? 1;
  if (!finite(factor) || factor <= 0 || factor > 2) return { ...start, errors: ['The manual method factor is invalid.'] };
  const configMap = new Map(configs.map(v => [v.id, v]));
  const assignments = scenario.assignments || {};
  if (Object.keys(assignments).some(id => !c.actions.some(a => a.id === id))) errors.push('An assignment links to a missing action.');
  if(c.processTemplateId&&!isManual){
    const bundles=new Map();for(const a of c.actions){const key=a.workBundleId||a.activityId||a.id;const actors=bundles.get(key)||new Set();actors.add(assignments[a.id]||'human');bundles.set(key,actors);}
    if([...bundles.values()].some(actors=>actors.size>1))errors.push('A held-load or activity bundle has more than one actor. Review and redesign the handoff before splitting this bundle.');
  }
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
    if(v.realProduct){for(const key of ['extraCapex','extraOpexAnnual'])if(!finite(v[key])||v[key]<0)errors.push(`${v.name}: ${key} is not established. Enter zero explicitly only when justified.`);if(!v.commercialSource?.trim()||!['Assumed','Supplier claim','Measured'].includes(v.commercialStatus))errors.push(`${v.name}: record the EUR cost basis and its evidence status.`);}
    if (!finite(price) || price < 0) errors.push(`${v.name}: commercial price is missing or invalid.`);
    if (e.commercialModel === 'purchase') { hardwareUpfront += (count || 0) * ((v.price || 0) + (v.extraCapex || 0)); annualMachine += (count || 0) * (v.supportAnnual + v.energyAnnual + (v.extraOpexAnnual || 0)); }
    else annualMachine += (count || 0) * ((v.leaseMonthly || 0) * 12 + v.energyAnnual + (v.extraOpexAnnual || 0) + (v.serviceIncluded ? 0 : v.supportAnnual));
    if(e.commercialModel!=='purchase')hardwareUpfront+=(count||0)*(v.extraCapex||0);
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

export function evaluateCase(c, configs) { return c.scenarios.map(s => evaluateScenario(c, s, configs)); }
export function recommendCase(c, configs) {
  const results = evaluateCase(c, configs);
  const candidates = results.filter(r => r.status === 'candidate').sort((a, b) => b.npv - a.npv);
  return { results, best: candidates[0] || null, text: candidates.length ? 'Advance this option to an evidence study. Confirm site performance and cash benefit before a pilot.' : results.some(r => r.status === 'needs-data') ? 'Complete the missing inputs or collect task evidence. No supported recommendation is available.' : 'Keep the current method or revise the process. No tested option meets both service and cash-benefit needs.' };
}

export function stressScenario(c, scenario, configs) {
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

export function generateOptions(c, configs, maxCount = 6) {
  const candidates = [];
  if(c.processTemplateId)configs=configs.filter(v=>v.realProduct&&!v.excludedFromMatching);
  const groupOf=a=>a.workBundleId||a.activityId||a.taskGroup||a.id;
  const wholeBundleFits=(a,v)=>!c.processTemplateId||c.actions.filter(x=>groupOf(x)===groupOf(a)).every(x=>fitAction(x,v).status==='fit');
  const assemble = (name, assignments) => {
    const ids=[...new Set(Object.values(assignments))];
    if (!ids.length || ids.length>3) return;
    const scenario={id:`generated-${candidates.length+1}`,name,kind:'hybrid',assignments,counts:Object.fromEntries(ids.map(id=>[id,1])),manualFactor:1,generated:true};
    const initial=evaluateScenario(c,scenario,configs);
    for(const f of initial.fleet) scenario.counts[f.id]=Math.min(maxCount,Math.max(1,f.required||1));
    candidates.push(scenario);
  };
  for(const v of configs){
    const assignments=Object.fromEntries(c.actions.filter(a=>fitAction(a,v).status==='fit'&&wholeBundleFits(a,v)).map(a=>[a.id,v.id]));
    assemble(`${v.name} + people · draft`,assignments);
  }
  const mixed={};
  for(const a of c.actions){
    const eligible=configs.filter(v=>!v.requiresOperator&&fitAction(a,v).status==='fit'&&wholeBundleFits(a,v)).sort((aConfig,bConfig)=>aConfig.times[a.skill]-bConfig.times[a.skill]);
    const previous=c.processTemplateId&&c.actions.find(x=>groupOf(x)===groupOf(a)&&mixed[x.id]);
    if(previous)mixed[a.id]=mixed[previous.id];else if(eligible[0])mixed[a.id]=eligible[0].id;
  }
  assemble('Mixed technology + people · fastest eligible action times',mixed);
  return candidates;
}

export function searchFleet(c, scenario, configs, maxCount = 6) {
  const ids = [...new Set(Object.values(scenario.assignments || {}).filter(id => id !== 'human'))];
  if (!ids.length) return [];
  if (ids.length > 3 || maxCount > 8 || maxCount < 1) throw new Error('Use up to three configurations and a fleet bound from one to eight.');
  let combinations = [{}];
  for (const id of ids) combinations = combinations.flatMap(base => Array.from({ length: maxCount }, (_, index) => ({ ...base, [id]: index + 1 })));
  return combinations.map((counts, index) => ({ scenario: { ...scenario, id: `search-${index + 1}`, name: ids.map(id => `${counts[id]} × ${configs.find(v => v.id === id)?.name || id}`).join(' + '), counts }, result: evaluateScenario(c, { ...scenario, counts }, configs) })).sort((a, b) => (a.result.status === 'candidate' ? 0 : 1) - (b.result.status === 'candidate' ? 0 : 1) || (b.result.npv ?? -Infinity) - (a.result.npv ?? -Infinity));
}

export function readiness(c, configs) {
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

export function validateObservation(o) {
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

export function observationMetrics(o) {
  const errors = validateObservation(o); if (errors.length) return { errors };
  return { errors, goodUnits: o.units - o.rejects, goodUph: (o.units - o.rejects) / o.hours, qualityPct: o.units > 0 ? (o.units - o.rejects) / o.units * 100 : null, interventionsPer1000: o.units > 0 ? o.interventions / o.units * 1000 : null, costPerUnit: o.units > o.rejects ? o.cost / (o.units - o.rejects) : null, costDelta: finite(o.baselineCost) ? o.baselineCost - o.cost : null, humanHoursPer1000: o.units > o.rejects ? o.humanHours / (o.units - o.rejects) * 1000 : null };
}
