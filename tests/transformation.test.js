import { makeProcessCase } from '../src-v2/process-analysis.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace,copy } from '../src-v2/data.js';
import { processSteps,transformation,validateProcessChanges,capabilityOptions } from '../src-v2/transformation.js';
import { evaluateScenario,MODEL_VERSION } from '../src-v2/engine.js';
import { validateWorkspace } from '../src-v2/store.js';
import { renderApp } from '../src-v2/views.js';

test('actor reassignment changes work but never removes baseline process steps',()=>{
 const w=seedWorkspace(),c=w.cases[0],s=c.scenarios.find(s=>s.id==='humanoid-3'),before=copy(c.actions),t=transformation(c,s,w.configs);
 assert.equal(t.counts.removed,0);assert.equal(t.counts.added,0);assert.ok(t.counts.changed>0);assert.deepEqual(c.actions,before);
 assert.equal(t.slots.length,processSteps(c).length);
});
test('explicit add and remove proposals align ghost positions and suppress unsupported economic results',()=>{
 const w=seedWorkspace(),c=w.cases[0],s=c.scenarios.find(s=>s.id==='humanoid-3'),steps=processSteps(c);
 s.processChanges=[{id:'rm',type:'remove',stepId:steps[0].id,name:steps[0].name,reason:'Proposed automatic identification; needs review.'},{id:'add',type:'add',afterId:steps[0].id,name:'Prepare a fixture',reason:'New setup activity; no timing established.'}];
 assert.deepEqual(validateProcessChanges(s.processChanges,c),[]);
 const t=transformation(c,s,w.configs);assert.equal(t.counts.removed,1);assert.equal(t.counts.added,1);assert.equal(t.slots[0].future,null);assert.equal(t.slots[1].baseline,null);
 const r=evaluateScenario(c,s,w.configs);assert.equal(r.annualNet,null);assert.equal(r.capacity,null);assert.ok(r.errors.some(x=>x.includes('redesign')));assert.equal(MODEL_VERSION,'planning-2.2.0');
 assert.deepEqual(validateWorkspace(w),[]);
 s.processChanges[0].stepId='missing';assert.ok(validateWorkspace(w).length);
});
test('merged evaluation workspace retains matching, fleet, and comparison functions',()=>{
 const w=seedWorkspace(),ctx={w,c:w.cases[0],view:'case',tab:'Matches',questions:[],role:'Engineer view',saveStatus:'Local'};
 const html=renderApp(ctx);assert.ok(html.includes('Evaluate process options'));assert.ok(html.includes('Build capability combinations'));assert.ok(html.includes('Capability checks and action assignments'));assert.ok(html.includes('Team, fleet, and performance'));assert.ok(html.includes('Action-to-technology match'));assert.ok(html.includes('Compare fleet counts'));
 const nav=html.slice(html.indexOf('<nav class="case-tabs"'),html.indexOf('<div class="case-content"'));assert.ok(nav.includes('Evaluate'));assert.ok(!nav.includes('>Scenarios</button>'));
 const deployment=renderApp({...ctx,tab:'Deployment'});assert.ok(deployment.includes('Build plan from selected option'));assert.ok(deployment.includes('Step preparation and policy gaps'));assert.ok(deployment.includes('Data and training plan'));
});


test('capability combinations preserve entire work bundles and stay bounded',()=>{
 const w=seedWorkspace(),c=makeProcessCase('klt-empty-tote-sorting-whiteboard',w.configs),drafts=capabilityOptions(c,w.configs);
 assert.ok(drafts.length>0);
 assert.ok(drafts.length<=12);
 for(const s of drafts){assert.ok(Object.keys(s.counts).length<=3);for(const key of new Set(c.actions.map(a=>a.workBundleId||a.activityId||a.taskGroup||a.id))){const members=c.actions.filter(a=>(a.workBundleId||a.activityId||a.taskGroup||a.id)===key);assert.equal(new Set(members.map(a=>s.assignments[a.id]||'human')).size,1);}for(const id of Object.keys(s.counts)){assert.ok(w.configs.find(v=>v.id===id).realProduct);assert.equal(s.counts[id],1);}}
});


test('dashboard pages route edits to workspaces instead of exposing record mutations',()=>{
 const w=seedWorkspace();for(const view of ['executive','pipeline','deployments']){const html=renderApp({w,c:w.cases[0],view,questions:[],role:'Engineer view',saveStatus:'Local'});assert.ok(html.includes('dashboard-nav'));assert.ok(!html.includes('data-action="add-asset"'));assert.ok(!html.includes('data-action="edit-asset"'));assert.ok(!html.includes('data-action="new-case"'));}
});
