import { validateProcessChanges } from './transformation.js';
import { validateStudy } from './study.js';
import { researchedProducts } from './products.js';
import { APP_SCHEMA, CASE_TABS, copy, seedWorkspace, INPUT_GROUPS, SOURCE_STATES } from './data.js';
import { validateCase, validateObservation } from './engine.js';

export const STORAGE_KEY = 'hybrid-workforce-v2';
export function validateWorkspace(value) {
  const errors = [];
  if (!value || value.schemaVersion !== APP_SCHEMA || !Array.isArray(value.cases) || !Array.isArray(value.configs)) return ['This file is not a version 2 workspace.'];
  if ([...value.cases,...value.configs].some(x=>!x||typeof x!=='object'||typeof x.id!=='string'||['__proto__','prototype','constructor'].includes(x.id))) return ['Every case and configuration needs a valid record identifier.'];
  if (!value.cases.length || value.cases.length > 200 || !value.configs.length || value.configs.length > 500) errors.push('Use 1–200 cases and 1–500 configurations.');
  if (new Set(value.cases.map(c => c.id)).size !== value.cases.length || new Set(value.configs.map(c => c.id)).size !== value.configs.length) errors.push('Case and configuration identifiers must be unique.');
  const configIds = new Set(value.configs.map(v => v.id));
  for (const c of value.cases) {
    if (!c || !c.id || !c.name || !c.site || !c.baseline || !c.economics || !Array.isArray(c.actions) || !Array.isArray(c.scenarios) || !c.deployment || !Array.isArray(c.sources) || !Array.isArray(c.observations) || !Array.isArray(c.deployment.assets) || !Array.isArray(c.deployment.testResults) || !c.deployment.checklist || !c.answers || !Array.isArray(c.issues) || !Array.isArray(c.history)) { errors.push('A case is incomplete.'); continue; }
    if (c.inputGroups !== undefined) {
      const groups=c.inputGroups, ids=new Set(INPUT_GROUPS.map(g=>g[0]));
      if (!groups || typeof groups!=='object' || Array.isArray(groups)) errors.push(`${c.name}: invalid input groups.`);
      else for (const [id,record] of Object.entries(groups)) {
        if (!ids.has(id) || !record || typeof record!=='object' || Array.isArray(record) || Object.values(record).some(v=>typeof v!=='string'||v.length>20000)) { errors.push(`${c.name}: invalid input group record.`); continue; }
        if (record.status && !SOURCE_STATES.includes(record.status)) errors.push(`${c.name}: invalid input data status.`);
        if (record.sourceId && !c.sources.some(s=>s?.id===record.sourceId)) errors.push(`${c.name}: input source is missing.`);
      }
    }
    errors.push(...validateStudy(c.study,configIds));
    if (c.lastTab && !CASE_TABS.includes(c.lastTab)) errors.push(`${c.name}: the saved case stage is invalid.`);
    if ([...c.actions,...c.scenarios,...c.sources,...c.observations,...c.deployment.assets,...c.deployment.testResults,...c.issues].some(x=>!x||typeof x!=='object')) { errors.push(`${c.name}: a child record is invalid.`); continue; }
    if (c.actions?.length > 500 || !c.scenarios.length || c.scenarios.length > 500 || c.observations.length > 10000) { errors.push('A case needs at least one option and must stay within the local record limits.'); continue; }
    // Drafts may have no actions or unknown requirements. Structural errors still fail import.
    for (const msg of validateCase(c)) if (msg==='The action dependencies contain a cycle.'||msg==='Action identifiers must be unique.'||msg.endsWith(': dependency is not valid.')) errors.push(`${c.name}: ${msg}`);
    for (const a of c.actions) for (const key of ['seconds','frequency','payloadKg','reachM','aisleM']) if (a[key] != null && (typeof a[key] !== 'number' || !Number.isFinite(a[key]) || a[key] < 0)) errors.push(`${c.name}: invalid action ${key}.`);
    for(const a of c.actions){
      if(a.requiredCapabilities!==undefined&&(!Array.isArray(a.requiredCapabilities)||a.requiredCapabilities.length>50||a.requiredCapabilities.some(x=>typeof x!=='string'||x.length>120)))errors.push(`${c.name}: invalid capability requirements.`);
      if(a.humanRetained!==undefined&&typeof a.humanRetained!=='boolean')errors.push(`${c.name}: invalid retained human flag.`);
    }
    const allowedKeys = ['demandDaily','peakFactor','shifts','shiftHours','daysYear','peoplePerShift','humanUtilPct','salaryAnnual','minPeoplePerShift','staffingCover','qualityTargetPct'];
    for (const key of allowedKeys) if (c.baseline[key] != null && (typeof c.baseline[key] !== 'number' || !Number.isFinite(c.baseline[key]) || c.baseline[key] < 0)) errors.push(`${c.name}: invalid ${key}.`);
    for (const [key, val] of Object.entries(c.economics || {})) if (typeof val === 'number' && (!Number.isFinite(val) || val < 0)) errors.push(`${c.name}: invalid ${key}.`);
    const actionIds = new Set(c.actions?.map(a => a.id));
    for (const s of c.scenarios) {
      errors.push(...validateProcessChanges(s?.processChanges,c));
      if (!s || !s.id || !s.name || !s.assignments || !s.counts) { errors.push('A scenario is incomplete.'); continue; }
      if (Object.entries(s.assignments).some(([id, actor]) => !actionIds.has(id) || actor !== 'human' && !configIds.has(actor))) errors.push(`${c.name}: an assignment has a missing action or configuration.`);
      if (Object.entries(s.counts).some(([id, count]) => !configIds.has(id) || !Number.isInteger(count) || count < 0 || count > 100)) errors.push(`${c.name}: invalid fleet counts.`);
    }
    for (const o of c.observations) errors.push(...validateObservation(o).map(msg => `${c.name}: ${msg}`));
  }
  for (const v of value.configs) {
    if(v.capabilities!==undefined&&(!Array.isArray(v.capabilities)||v.capabilities.length>50||v.capabilities.some(x=>typeof x!=='string'||x.length>120)))errors.push('Configuration capabilities must be a short text list.');
    if (!v.id || !v.name || !Array.isArray(v.skills) || !v.times || typeof v.times !== 'object') errors.push('A configuration is incomplete.');
    for (const key of ['payloadKg','reachM','minAisleM','successPct','interventionPct','recoverySec','chargePct','downtimePct','price','leaseMonthly','supportAnnual','energyAnnual','extraCapex','extraOpexAnnual']) if (v[key] != null && (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0)) errors.push(`${v.name}: invalid ${key}.`);
    if (Object.values(v.times || {}).some(n => typeof n !== 'number' || !Number.isFinite(n) || n <= 0)) errors.push(`${v.name}: task times must be positive numbers.`);
  }
  return [...new Set(errors)];
}

export function createStore({ storage = null, fetcher = null, onStatus = () => {} } = {}) {
  let workspace = seedWorkspace(), serverVersion = null, timer = null, saving = false, queued = false, hadLocal = false, dirty = false;
  try { const stored = storage?.getItem(STORAGE_KEY); if (stored) { const parsed = JSON.parse(stored); if (!validateWorkspace(parsed).length) { workspace = parsed; hadLocal = true; } } } catch { onStatus('Local data could not be read. The sample workspace is open.', 'warning'); }
  function addResearchRecords() { let added=false;for(const product of researchedProducts())if(!workspace.configs.some(v=>v.id===product.id)){workspace.configs.push(product);added=true;}return added; }
  addResearchRecords();
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
    replace(next) { const errors = validateWorkspace(next); if (errors.length) throw new Error(errors[0]); workspace = copy(next); addResearchRecords(); if (!workspace.cases.some(c => c.id === workspace.activeCaseId)) workspace.activeCaseId = workspace.cases[0].id; save(); },
    save,
    flush: serverSave,
    async connect() {
      if (!fetcher) { onStatus('Browser storage · offline mode', 'local'); return; }
      try {
        const response = await fetcher('/api/workspace'); if (!response.ok) throw new Error('No service');
        const remote = await response.json(); serverVersion = remote.version;
        if (remote.workspace) {
          if (validateWorkspace(remote.workspace).length) throw new Error('Invalid server data');
          if ((!hadLocal && !dirty) || remote.workspace.savedAt >= workspace.savedAt) { workspace = remote.workspace; const added=addResearchRecords();localSave(); publish();if(added)await serverSave(); }
          else await serverSave();
        } else { localSave(); await serverSave(); }
        onStatus('Saved to browser and local database', 'saved');
      } catch { serverVersion = null; onStatus('Browser storage · offline mode', 'local'); }
    }
  };
}
