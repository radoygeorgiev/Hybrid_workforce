import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace, copy, CASE_TABS } from '../src-v2/data.js';
import { newStudy, validateBenchmark, validateStudy, benchmarkKey, studyRequest, STUDY_STAGES } from '../src-v2/study.js';
import { validateWorkspace, createStore, STORAGE_KEY } from '../src-v2/store.js';
import { assignmentFlowView, renderApp, renderReport } from '../src-v2/views.js';
import { evaluateScenario } from '../src-v2/engine.js';

const benchmark=w=>({id:'bench-1',configId:w.configs[0].id,policy:'policy-v1',policyKind:'Baseline',protocol:'protocol-1',taskVersion:'KLT-1',sceneVersion:'scene-1',conditions:'seed 1 / tote A / start A',source:'External test artifact',evidence:'Sample',date:'2026-10-19',caseRevision:w.cases[0].revision,attempts:100,successes:90,cycleSec:12,recoverySec:null,energyKwh:null,interventions:2});

test('study requests cover scope stages and never imply execution',()=>{
 const w=seedWorkspace(),c=w.cases[0];c.study=newStudy();c.study.settings.observations='camera-v1';
 for(const [stage] of STUDY_STAGES){const r=studyRequest(c,w.configs,stage,'req','2026-10-19');assert.equal(r.externalExecution,false);assert.equal(r.status,'Prepared locally');assert.equal(r.caseRevision,c.revision);assert.equal(r.taskSchema.observations,'camera-v1');assert.ok(r.boundary.includes('No GPU'));}
 assert.throws(()=>studyRequest(c,w.configs,'bad','req','date'));
});

test('benchmark counts, evidence classes, and numeric fields are validated',()=>{
 const w=seedWorkspace(),ids=new Set(w.configs.map(v=>v.id)),b=benchmark(w);
 assert.deepEqual(validateBenchmark(b,ids),[]);
 for(const change of [{successes:101},{attempts:0},{cycleSec:0},{cycleSec:-1},{recoverySec:NaN},{interventions:1.5},{evidence:'Unknown'},{configId:'missing'},{source:''},{studyRevision:0}])assert.ok(validateBenchmark({...b,...change},ids).length,JSON.stringify(change));
 assert.notEqual(benchmarkKey(b),benchmarkKey({...b,conditions:'Different object'}));
 assert.notEqual(benchmarkKey(b),benchmarkKey({...b,evidence:'Measured'}));
 assert.equal(benchmarkKey(b),benchmarkKey({...b,policy:'refined-v1',policyKind:'Refined'}));
});

test('study settings and records survive local storage without changing economic inputs',()=>{
 const w=seedWorkspace(),c=w.cases[0],before=evaluateScenario(c,c.scenarios[1],w.configs);
 c.study=newStudy();c.study.settings.sceneVersion='scene-v1';c.study.benchmarks.push(benchmark(w));
 assert.deepEqual(validateWorkspace(w),[]);
 const memory=new Map([[STORAGE_KEY,JSON.stringify(w)]]),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const st=createStore({storage});assert.equal(st.get().cases[0].study.settings.sceneVersion,'scene-v1');assert.equal(st.get().cases[0].study.benchmarks.length,1);
 assert.deepEqual(evaluateScenario(c,c.scenarios[1],w.configs),before);
 const bad=copy(w);bad.cases[0].study.benchmarks[0].successes=101;assert.ok(validateWorkspace(bad).length);
 assert.ok(validateStudy({settings:{},benchmarks:[],requests:[{id:'r',stage:'capture',status:'Completed',caseRevision:1,date:'x'}]},new Set()).length);
});

test('assignment flow follows the selected scenario and does not invent productivity for invalid inputs',()=>{
 const w=seedWorkspace(),c=w.cases[0],s=c.scenarios.find(s=>Object.keys(s.assignments).length);
 let html=assignmentFlowView({c,w},s);
 assert.ok(html.includes('Process work split'));assert.ok(html.includes('Technology steps'));assert.ok(html.includes('Human steps'));
 for(const id of new Set(Object.values(s.assignments)))assert.ok(html.includes(w.configs.find(v=>v.id===id).name));
 c.baseline.demandDaily=null;html=assignmentFlowView({c,w},s);assert.ok(html.includes('draft assignment; productivity is not established'));assert.ok(html.includes('Not established'));
 const ctx={c,w,view:'aws-plan',tab:'Overview',questions:[],role:'Engineer view',saveStatus:'Local'};
 assert.ok(renderApp(ctx).includes('AWS deployment plan'));assert.ok(renderApp({...ctx,view:'case',tab:'Results'}).includes('Process work split'));assert.deepEqual(CASE_TABS,['Overview','Inputs','Process','Matches','Scenarios','Results','Deployment','Learning']);
 assert.ok(renderReport(c,w.configs).includes('Process work split'));
});


test('assist tools retain the human role and multiple machines are not labelled as a human split',()=>{
 const w=seedWorkspace(),c=w.cases[0],s=c.scenarios.find(s=>s.id==='humanoid-3');
 const v=w.configs.find(v=>v.id==='humanoid-h1');v.requiresOperator=true;
 let html=assignmentFlowView({c,w},s);assert.ok(html.includes('Shared steps'));assert.ok(html.includes('human operator required'));
 const arm=c.scenarios.find(s=>s.name.includes('Arm cells'));html=assignmentFlowView({c,w},arm);assert.ok(html.includes('Multiple technologies'));assert.ok(!html.includes('Human / technology split'));
});
