import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace, copy } from '../src-v2/data.js';
import { evaluateScenario, fitAction, searchFleet, generateOptions, stressScenario, validateCase, validateObservation, observationMetrics, recommendCase } from '../src-v2/engine.js';
import { validateWorkspace, createStore, STORAGE_KEY } from '../src-v2/store.js';
import { parseActions, parseCsv, parseTaskTimes } from '../src-v2/imports.js';
import { renderApp, renderReport } from '../src-v2/views.js';

const setup = () => { const w=seedWorkspace(),c=w.cases[0]; return {w,c,v:w.configs,s:c.scenarios.find(s=>s.id==='humanoid-3')}; };
const near = (actual,expected) => assert.ok(Math.abs(actual-expected)<0.00001,`${actual} != ${expected}`);

test('baseline volume uses daily demand once and does not apply the peak factor to annual demand',()=>{
  const {c,v}=setup();const r=evaluateScenario(c,c.scenarios[0],v);
  near(r.annualVolume,1_250_000);near(r.baselineSeconds,30);near(r.capacity,408);near(r.baselineFte,8);assert.equal(r.annualNet,0);
});
test('partial action assignment derives human work, handoffs, and recovery before staffing',()=>{
  const {c,v,s}=setup(),r=evaluateScenario(c,s,v);
  assert.equal(r.automatedActions,6);near(r.coveragePct,17/30*100);assert.equal(r.peoplePerShift,2);assert.equal(r.potentialFte,4);assert.equal(r.handoffs,2);assert.ok(r.recoverySeconds>0);assert.ok(r.humanSeconds>13);
});
test('an undersized fleet cannot claim cash savings or payback',()=>{
  const {c,v}=setup(),r=evaluateScenario(c,c.scenarios.find(s=>s.id==='humanoid-2'),v);
  assert.equal(r.status,'not-feasible');assert.equal(r.annualNet,null);assert.equal(r.payback,null);assert.deepEqual(r.cashflows,[]);
});
test('purchase cash flow includes capital once and accounts for the first-year ramp',()=>{
  const {c,v,s}=setup(),r=evaluateScenario(c,s,v);
  assert.equal(r.status,'candidate');near(r.upfront,385000);near(r.annualAddedCost,49500);near(r.capturedLaborBenefit,225000);near(r.annualNet,175500);near(r.firstYear,119250);near(r.lifetimeNet,-385000+119250+4*175500);near(r.payback,2+90250/175500);
});
test('manual improvement does not inherit machine integration, platform, and service costs',()=>{
  const {c,v}=setup(),r=evaluateScenario(c,c.scenarios.find(s=>s.id==='improved'),v);
  near(r.upfront,5000);near(r.annualAddedCost,0);assert.equal(r.annualNet,0);
});
test('redeployed capacity does not become cash labour savings',()=>{
  const {c,v,s}=setup();c.economics.benefitMode='Redeployed capacity';const r=evaluateScenario(c,s,v);assert.equal(r.potentialFte,4);assert.equal(r.cashFte,0);assert.equal(r.capturedLaborBenefit,0);assert.ok(r.annualNet<0);assert.equal(r.payback,null);
});
test('zero benefit retention does not remove human recovery or equipment costs',()=>{
  const {c,v,s}=setup();const base=evaluateScenario(c,s,v);c.economics.retainedPct=0;const r=evaluateScenario(c,s,v);near(r.humanSeconds,base.humanSeconds);near(r.annualAddedCost,49500);assert.equal(r.annualNet,-49500);
});
test('lease includes the agreed service once and excludes purchased hardware',()=>{
  const {c,v,s}=setup();c.economics.commercialModel='lease';const r=evaluateScenario(c,s,v);near(r.upfront,85000);near(r.annualAddedCost,3*(4800*12+1500)+18000);
});
test('zero charge is a valid value, not a fallback to default charging',()=>{
  const {c,v,s}=setup();const base=evaluateScenario(c,s,v);v[0].chargePct=0;const r=evaluateScenario(c,s,v);assert.ok(r.capacity>base.capacity||r.fleet[0].rate>base.fleet[0].rate);near(r.fleet[0].usablePct,92);
});
test('a failed payload is blocked even if the product is cheap and fast',()=>{
  const {c,v,s}=setup();v[0].payloadKg=1;v[0].price=1;assert.equal(fitAction(c.actions[5],v[0]).status,'blocked');const r=evaluateScenario(c,s,v);assert.equal(r.valid,false);assert.equal(r.annualNet,null);
});
test('unknown capability or task time does not pass fit or produce economics',()=>{
  const {c,v,s}=setup();v[0].payloadKg=null;assert.equal(fitAction(c.actions[5],v[0]).status,'unknown');assert.equal(evaluateScenario(c,s,v).valid,false);
});
test('zero demand creates no robot recommendation or labour-saving claim',()=>{
  const {c,v,s}=setup();c.baseline.demandDaily=0;const r=evaluateScenario(c,s,v);assert.equal(r.status,'no-demand');assert.equal(r.annualNet,null);assert.deepEqual(r.fleet,[]);assert.equal(recommendCase(c,v).best,null);
});
test('invalid shift totals, circular dependencies, and unsupported parallel work stop evaluation',()=>{
  const {c,v,s}=setup();c.baseline.shiftHours=20;assert.ok(validateCase(c).some(e=>e.includes('24 hours')));c.baseline.shiftHours=7.5;c.actions[0].dependency=c.actions[1].id;assert.ok(validateCase(c).some(e=>e.includes('cycle')));c.actions[0].dependency='';c.actions[0].parallel=true;assert.equal(evaluateScenario(c,s,v).valid,false);
});
test('zero fleet, fractional fleet, unused configurations, and missing actions are rejected',()=>{
  for(const count of [0,1.5]){const {c,v,s}=setup();s.counts['humanoid-h1']=count;assert.equal(evaluateScenario(c,s,v).valid,false);}
  const {c,v,s}=setup();s.counts['vision-v1']=1;assert.equal(evaluateScenario(c,s,v).valid,false);
});
test('bounded search reports tested counts and selects a feasible count without claiming a global optimum',()=>{
  const {c,v,s}=setup();const search=searchFleet(c,s,v,6);assert.equal(search.length,6);assert.equal(search[0].result.status,'candidate');assert.equal(search[0].scenario.counts['humanoid-h1'],3);assert.equal(search.find(x=>x.scenario.counts['humanoid-h1']===2).result.annualNet,null);
});
test('first-pass quality is a separate hard constraint',()=>{
  const {c,v,s}=setup();c.baseline.qualityTargetPct=99;const r=evaluateScenario(c,s,v);assert.equal(r.status,'not-feasible');assert.equal(r.annualNet,null);assert.equal(r.meetsQuality,false);
});
test('a positive steady year is not a business case when the contract ends before payback',()=>{
  const {c,v,s}=setup();c.economics.horizonYears=1;const r=evaluateScenario(c,s,v);assert.ok(r.annualNet>0);assert.equal(r.payback,null);assert.ok(r.npv<0);assert.equal(r.status,'no-business-case');assert.equal(recommendCase(c,v).best,null);
});
test('payback cannot precede benefit during a no-capital ramp-up',()=>{
  const {c,v,s}=setup();c.economics.integration=0;c.economics.siteChanges=0;v[0].price=0;const r=evaluateScenario(c,s,v);assert.ok(r.payback>3/12);assert.ok(r.payback<1);
});
test('option generation uses the current actions and excludes unknown configurations',()=>{
  const {c,v}=setup();const options=generateOptions(c,v);assert.ok(options.some(s=>s.name.includes('Humanoid H1')));assert.ok(options.some(s=>s.name.includes('Mixed technology')));assert.ok(!options.some(s=>Object.keys(s.counts).includes('agibot-target')));for(const s of options)for(const [id,actor] of Object.entries(s.assignments))assert.equal(fitAction(c.actions.find(a=>a.id===id),v.find(v=>v.id===actor)).status,'fit');
});
test('performance and downtime stress can invalidate a once-feasible fleet',()=>{
  const {c,v,s}=setup();const results=stressScenario(c,s,v);assert.equal(results.length,7);assert.equal(results.find(r=>r.stressName==='Robot task time +20%').status,'not-feasible');assert.equal(results.find(r=>r.stressName==='Other downtime +10 points').annualNet,null);
});
test('an option that adds human positions includes their full annual cost',()=>{
  const {c,v}=setup(),s=generateOptions(c,v).find(s=>Object.keys(s.counts).includes('assist-l1'));const r=evaluateScenario(c,s,v);assert.equal(r.additionalFte,2);assert.equal(r.extraLaborAnnual,150000);assert.equal(r.annualAddedCost,169000);assert.equal(r.annualNet,-169000);near(r.costPerUnit,(10*75000+19000+94000/5)/1250000);
});
test('CSV supports quoted names, embedded commas, and CRLF lines',()=>{
  const rows=parseCsv('name,seconds\r\n"Grip, hold",2.5\r\n');assert.deepEqual(rows,[['name','seconds'],['Grip, hold','2.5']]);const a=parseActions('name,skill,seconds,frequency,payloadKg,reachM,aisleM\n"Grip, hold",grip,2.5,1,7,1.2,1.5','csv');assert.equal(a[0].name,'Grip, hold');assert.equal(a[0].seconds,2.5);
});
test('plain-text action import preserves unknown skill and timing',()=>{
  const actions=parseActions('1. Lift the tote\n2. Place the tote');assert.equal(actions.length,2);assert.equal(actions[0].seconds,null);assert.equal(actions[0].skill,'');assert.equal(actions[1].dependency,actions[0].id);assert.throws(()=>parseActions('[{"name":"Lift","seconds":-1}]','json'));
});
test('additional technology skills use explicit positive task times',()=>{
  assert.deepEqual(parseTaskTimes('Push button: 2.5\nclose-door: 6'),{'push-button':2.5,'close-door':6});assert.throws(()=>parseTaskTimes('push-button: 0'));assert.throws(()=>parseTaskTimes('push-button: 2\npush-button: 3'));
});
test('workspace import rejects negative values and missing links without changing a current workspace',()=>{
  const {w}=setup();assert.deepEqual(validateWorkspace(w),[]);const invalid=copy(w);invalid.cases[0].baseline.demandDaily=-1;assert.ok(validateWorkspace(invalid).length);invalid.cases[0].baseline.demandDaily=100;invalid.cases[0].scenarios[0].assignments.ghost='humanoid-h1';assert.ok(validateWorkspace(invalid).length);assert.equal(w.cases[0].baseline.demandDaily,5000);
});
test('incomplete imported actions and a blank draft can be saved and restored',()=>{
  const {w}=setup();w.cases[0].actions=parseActions('Lift\nPlace');w.cases[0].scenarios.forEach(s=>{s.assignments={};s.counts={};});assert.deepEqual(validateWorkspace(w),[]);w.cases[0].actions=[];assert.deepEqual(validateWorkspace(w),[]);
});
test('malformed child records and invalid saved screen names fail import cleanly',()=>{
  const {w}=setup();w.cases[0].lastTab='__proto__';assert.ok(validateWorkspace(w).length);delete w.cases[0].lastTab;w.cases[0].actions[0]=null;assert.ok(validateWorkspace(w).length);
});
test('case changes invalidate the reviewed version and persist a complete editable record',()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};const st=createStore({storage});const id=st.current().id;st.current().decision={revision:1,outcome:'Proceed to evidence study'};st.updateCase(id,c=>c.actions[0].seconds=3);assert.equal(st.current().revision,2);assert.equal(st.current().decision.revision,1);const restored=createStore({storage});assert.equal(restored.current().actions[0].seconds,3);assert.ok(memory.has(STORAGE_KEY));
});
test('an empty browser loads the database instead of overwriting it with a new sample',async()=>{
  const remote=seedWorkspace();remote.cases[0].name='Saved site work';remote.savedAt='2025-01-01T00:00:00Z';let writes=0;const st=createStore({fetcher:async(path,opts)=>{if(opts?.method==='PUT')writes++;return {ok:true,json:async()=>({workspace:remote,version:4})};}});await st.connect();assert.equal(st.current().name,'Saved site work');assert.equal(writes,0);
});
test('observation validation protects rate denominators and event counts',()=>{
  const o={date:'2026-10-18',source:'Trial 1',hours:2,units:100,rejects:2,interventions:3,humanHours:1,downtimeHours:.1,chargeHours:.2,cost:40};assert.deepEqual(validateObservation(o),[]);near(observationMetrics(o).goodUph,49);assert.ok(validateObservation({...o,hours:0}).length);assert.ok(validateObservation({...o,interventions:1.5}).length);assert.ok(validateObservation({...o,chargeHours:3}).length);
});
test('every dashboard and case stage renders from the same case and escapes user text',()=>{
  const {w,c}=setup();c.name='<script>bad()</script>';const base={w,c,questions:[],saveStatus:'Browser storage',role:'Engineer view',tab:'Overview'};
  for(const view of ['executive','evaluations','deployments','catalog','evidence'])assert.ok(renderApp({...base,view}).includes('app-main'));
  for(const tab of ['Overview','Inputs','Process','Matches','Scenarios','Results','Deployment','Learning'])assert.ok(renderApp({...base,view:'case',tab}).includes('case-content'));
  const report=renderReport(c,w.configs);assert.ok(report.includes('&lt;script&gt;bad()&lt;/script&gt;'));assert.ok(!report.includes('<script>bad()'));
});
