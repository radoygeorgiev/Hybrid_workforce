import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace, copy } from '../src-v2/data.js';
import { researchedProducts } from '../src-v2/products.js';
import { PROCESS_LIBRARY, PROCESS_SOURCES } from '../src-v2/process-library.js';
import { makeProcessCase, analyseProcess } from '../src-v2/process-analysis.js';
import { fitAction, evaluateScenario, generateOptions } from '../src-v2/engine.js';
import { validateWorkspace, createStore, STORAGE_KEY } from '../src-v2/store.js';
import { renderApp } from '../src-v2/views.js';

test('every photo has process coverage and every draft has a valid ordered action graph',()=>{
  assert.equal(PROCESS_SOURCES.length,20);assert.equal(PROCESS_LIBRARY.length,70);
  assert.equal(new Set(PROCESS_LIBRARY.map(x=>x.id)).size,70);
  for(const source of PROCESS_SOURCES)assert.ok(PROCESS_LIBRARY.some(x=>x.sourceId===source.id),source.file);
  const w=seedWorkspace();
  for(const t of PROCESS_LIBRARY){
    assert.ok(t.warehouseTypes.length);assert.ok(t.branches);assert.ok(t.actions.every(a=>a.seconds===null));
    const c=makeProcessCase(t.id,w.configs);assert.equal(c.templateReviewed,false);assert.equal(c.baseline.salaryAnnual,null);assert.ok(c.actions.every(a=>a.frequency===null));
    const ids=new Set();for(const a of c.actions){assert.ok(!a.dependency||ids.has(a.dependency));ids.add(a.id);assert.ok(a.requiredCapabilities.length);}
    const exported={...copy(w),activeCaseId:c.id,cases:[c]};assert.deepEqual(validateWorkspace(exported),[]);
    assert.equal(evaluateScenario(c,c.scenarios[0],w.configs).annualNet,null);
  }
});

test('whiteboard preserves thirteen source activities and all capability candidates stay conditional',()=>{
  const w=seedWorkspace(),t=PROCESS_LIBRARY.find(x=>x.sourceId==='photo-0698'),c=makeProcessCase(t.id,w.configs),analysis=analyseProcess(c,w.configs);
  assert.equal(t.activities.length,13);assert.ok(analysis.conditional>0);assert.ok(analysis.gaps>0);
  assert.ok(analysis.rows.flatMap(r=>r.candidates).every(v=>v.id.startsWith('real-')));
  assert.ok(analysis.rows.filter(r=>r.action.requiredCapabilities.includes('peel')).every(r=>!r.candidates.length));
  for(const s of c.scenarios.slice(1))for(const bundle of analysis.bundles){const actors=bundle.rows.map(r=>s.assignments[r.action.id]||'human');assert.equal(new Set(actors).size,1,'Do not assign only the convenient part of a bundle');}
});

test('matching needs every capability and respects retained human decisions',()=>{
  const v={...researchedProducts().find(v=>v.id==='real-agibot-a2w'),skills:['peel'],times:{peel:4},payloadKg:10,reachM:2,minAisleM:1};
  const a={name:'Peel label',skill:'peel',requiredCapabilities:['vision','grasp','peel'],payloadKg:1,reachM:1,aisleM:2};
  assert.equal(fitAction(a,v).status,'unknown');
  assert.equal(fitAction({...a,humanRetained:true},v).status,'blocked');
  assert.equal(fitAction({...a,payloadKg:20},v).status,'blocked');
});

test('prices preserve model variant and currency and never invent operating cost',()=>{
  const products=researchedProducts();assert.equal(products.length,10);
  const base=products.find(x=>x.id==='real-unitree-g1-base'),edu=products.find(x=>x.id==='real-unitree-g1-edu');
  assert.equal(base.publishedPrice.amount,13500);assert.equal(base.publishedPrice.currency,'USD');assert.equal(base.price,null);assert.ok(base.excludedFromMatching);assert.equal(edu.publishedPrice,null);
  for(const v of products){assert.ok(v.sourceUrl.startsWith('https://'));assert.equal(v.supportAnnual,null);assert.equal(v.energyAnnual,null);assert.equal(v.price,null);assert.deepEqual(v.times,{});}
});

test('per-unit CAPEX and OPEX enter purchase and lease costs once',()=>{
  const w=seedWorkspace(),c=w.cases[0],s=c.scenarios.find(s=>s.id==='humanoid-3');const base=evaluateScenario(c,s,w.configs);
  const v=w.configs.find(v=>v.id==='humanoid-h1');Object.assign(v,{realProduct:true,extraCapex:2000,extraOpexAnnual:1000,commercialSource:'Test assumption, EUR, no FX',commercialStatus:'Assumed'});
  const purchase=evaluateScenario(c,s,w.configs);assert.equal(purchase.upfront,base.upfront+6000);assert.equal(purchase.annualAddedCost,base.annualAddedCost+3000);
  c.economics.commercialModel='lease';const leased=evaluateScenario(c,s,w.configs);assert.equal(leased.upfront,c.economics.integration+c.economics.siteChanges+6000);
  v.extraOpexAnnual=null;assert.equal(evaluateScenario(c,s,w.configs).annualNet,null);
});

test('research migration adds missing records and preserves edited configurations and cases',()=>{
  const w=seedWorkspace();w.configs=w.configs.filter(v=>!v.realProduct);w.cases[0].name='Keep my site work';
  const memory=new Map([[STORAGE_KEY,JSON.stringify(w)]]),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
  const st=createStore({storage});assert.equal(st.current().name,'Keep my site work');assert.equal(st.get().configs.filter(v=>v.realProduct).length,10);
  st.get().configs.find(v=>v.id==='real-ur20').price=123;st.save();const restored=createStore({storage});assert.equal(restored.get().configs.find(v=>v.id==='real-ur20').price,123);
});

test('library cases exclude fictional configurations from generated matching options',()=>{
  const w=seedWorkspace(),c=makeProcessCase('kit-to-stock',w.configs);assert.deepEqual(generateOptions(c,w.configs),[]);
  const ctx={w,c,view:'processes',questions:[],saveStatus:'Local',role:'Engineer view',tab:'Process'};
  const library=renderApp(ctx);assert.ok(library.includes('Create and analyse evaluation'));assert.ok(library.includes('IMG_5903.HEIC'));
  const catalog=renderApp({...ctx,view:'catalog'});assert.ok(catalog.includes('MiR1200 Pallet Jack'));assert.ok(catalog.includes('Not converted to EUR'));
});

test('a carried load cannot switch actors within one bundle',()=>{
  const w=seedWorkspace(),c=w.cases[0],v=w.configs.find(v=>v.id==='humanoid-h1');
  c.processTemplateId='test';c.templateReviewed=true;v.capabilities=['grasp','lift'];
  c.actions=[{...c.actions[4],id:'grip',requiredCapabilities:['grasp'],workBundleId:'held-load',dependency:''},{...c.actions[5],id:'lift',requiredCapabilities:['grasp','lift'],workBundleId:'held-load',dependency:'grip'}];
  const split={id:'split',name:'Split',kind:'hybrid',assignments:{lift:v.id},counts:{[v.id]:1},manualFactor:1};
  const result=evaluateScenario(c,split,w.configs);assert.equal(result.annualNet,null);assert.ok(result.errors.some(x=>x.includes('more than one actor')));
});

test('import rejects malformed capability sets and negative added costs',()=>{
  const w=seedWorkspace();w.cases[0].actions[0].requiredCapabilities='vision';assert.ok(validateWorkspace(w).length);
  delete w.cases[0].actions[0].requiredCapabilities;w.configs[0].extraOpexAnnual=-5;assert.ok(validateWorkspace(w).length);
});

test('navigation separates dashboards, work, libraries, help, and case evidence',()=>{
  const w=seedWorkspace(),c=w.cases[0];c.sources[0].name='Current case evidence';w.cases[1].sources[0].name='Other case private source';
  const ctx={w,c,view:'pipeline',tab:'Overview',questions:[],saveStatus:'Local',role:'Engineer view'};
  const html=renderApp(ctx),sidebar=html.slice(html.indexOf('<aside'),html.indexOf('</aside>'));
  for(const label of ['Dashboards','Evaluation','Deployment','Libraries','Evaluation pipeline','Current evaluation','Delivery plan','Evidence and questions'])assert.ok(sidebar.includes(label));
  assert.ok(!sidebar.includes('How it works'));assert.ok(html.includes('Help: How it works'));
  assert.ok(!html.includes('Create and analyse evaluation'));
  const evidence=renderApp({...ctx,view:'evidence'});assert.ok(evidence.includes('Current case evidence'));assert.ok(!evidence.includes('Other case private source'));assert.ok(evidence.includes('Evidence case'));
});


test('activity display retains a whole bundle when one required action has no candidate',()=>{
  const w=seedWorkspace(),c=makeProcessCase('klt-empty-tote-sorting-whiteboard',w.configs);
  const ctx={w,c,view:'case',tab:'Process',questions:[],saveStatus:'Local',role:'Engineer view'};
  const html=renderApp(ctx);
  const sequence=html.slice(html.indexOf('<div class="activity-sequence">'),html.indexOf('Draft assignment uses complete'));
  const pickup=sequence.slice(sequence.indexOf('Take one tote'),sequence.indexOf('Remove debris'));
  assert.ok(pickup.includes('Bundle: retain / redesign'));
  assert.ok(!pickup.includes('Bundle: conditional'));
  assert.ok(html.includes('Assignment basis'));
  assert.ok(html.includes('Peel'));
});
