import { processSteps, capabilityOptions } from './transformation.js';
import { newStudy, validateBenchmark, studyRequest } from './study.js';
import { PROCESS_LIBRARY } from './process-library.js';
import { makeProcessCase, analyseProcess } from './process-analysis.js';
import { seedConfigs, makeCase, uid, copy, SKILLS, STAGES, SOURCE_STATES } from './data.js';
import { createStore, validateWorkspace } from './store.js';
import { MODEL_VERSION, evaluateScenario, fitAction, searchFleet, generateOptions, readiness, validateObservation, observationMetrics } from './engine.js';
import { parseActions, parseCsv, parseTaskTimes } from './imports.js';
import { renderApp, renderReport, htmlEscape, icon, inputField, selectField, gridFields, table, row, button, chip, euro, number } from './views.js';
import { QUESTION_REGISTER } from './questions.js';

const appRoot = document.getElementById('app');
const ui = { view: 'evaluations', tab: 'Overview', mobileMenu: false, search: '', stageFilter: '', siteFilter: '', questionGroup: '', questionSearch: '', role: 'Engineer view', saveStatus: 'Opening local records…' };
ui.processArea='';ui.warehouseType='';ui.processVertical='';ui.processSearch='';ui.libraryId='klt-empty-tote-sorting-whiteboard';
let suppressRender = false, modalSubmit = null, fleetResults = [], pendingImport = null, toastTimer, processSearchTimer;
let browserStorage = null; try { browserStorage = window.localStorage; } catch {}
const store = createStore({ storage: browserStorage, fetcher: location.protocol === 'file:' ? null : window.fetch.bind(window), onStatus: (message,status) => { ui.saveStatus=message; const label=document.getElementById('save-status'); if(label){label.textContent=message;label.dataset.status=status;} } });
const hx = htmlEscape;
const ctx = () => ({...ui,isMobile:window.matchMedia('(max-width:700px)').matches,w:store.get(),c:store.current(),questions:QUESTION_REGISTER});
const activeScenario = () => { const c=store.current();return c.scenarios.find(s=>s.id===c.selectedScenarioId)||c.scenarios[0]; };
function notify(message,kind='') { const toast=document.getElementById('toast'); if(!toast)return;toast.textContent=message;toast.className=`toast visible ${kind}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.className='toast',5000); }
function render() { if(suppressRender)return;appRoot.innerHTML=renderApp(ctx());document.title=`${ui.view==='case'?store.current().name:'Hybrid Workforce'} · Version 2`; }
store.subscribe(render);
function updateCase(fn,material=true,quiet=false) { suppressRender=quiet;try{store.updateCase(store.current().id,fn,material);}finally{suppressRender=false;} }
function setPath(record,path,value) { if(path.startsWith('study.'))record.study ||= newStudy();const parts=path.split('.');if(parts.some(p=>['__proto__','constructor','prototype'].includes(p)))throw new Error('Unsupported field.');let node=record;for(const part of parts.slice(0,-1)){if(node[part]==null)node[part]={};node=node[part];}node[parts.at(-1)]=value; }
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

function designOption(c) {
 let s=c.scenarios.find(s=>s.id===c.selectedScenarioId)||c.scenarios[0];
 if(s.kind==='manual'){s={...copy(s),id:uid('redesign'),name:'Proposed process redesign',kind:'hybrid',processChanges:[]};c.scenarios.push(s);c.selectedScenarioId=s.id;}
 return s;
}
function processChangeDialog(id=null) {
 const c=store.current(),s=activeScenario(),step=processSteps(c).find(x=>x.id===id),existing=(s.processChanges||[]).find(x=>x.stepId===id||x.id===id),added=existing?.type==='add'||!id;
 openDialog(added?'Add future process step':'Propose process step change',`<p>This changes only the future design. The baseline stays in place. Added, removed, or rewritten steps require engineering validation before productivity or cash is calculated.</p>`+gridFields([
 ...(added?[]:[formSelect('type','Proposed change',existing?.type||'change',[['change','Change activity'],['remove','Remove from future process']])]),
 formInput('name','Future activity name',existing?.name||step?.name||'',{type:'text',required:true}),
 ...(added?[formSelect('afterId','Insert after',existing?.afterId||'',[['','Before first step'],...processSteps(c).map(x=>[x.id,x.name])])]:[])
 ])+formNote('reason','Engineering reason, required actions, actor, handoffs, and evidence',existing?.reason||''),v=>{
 if(v.reason.length<5)throw new Error('Record the engineering reason and conditions.');
 updateCase(c=>{const option=designOption(c);option.processChanges ||= [];const change={id:existing?.id||uid('change'),type:added?'add':v.type,stepId:added?'':id,afterId:added?v.afterId:'',name:v.name,reason:v.reason};option.processChanges=option.processChanges.filter(x=>x.id!==change.id&&(!id||x.stepId!==id));option.processChanges.push(change);});
 ui.flowMode='compare';render();notify('Future design saved. Revised-process financial outputs are withheld.');
 },{submit:'Save future proposal'});
}
function applyProcessDefinitionDialog() {
 const choice=document.getElementById('case-template-choice')?.value||ui.libraryId;
 const t=PROCESS_LIBRARY.find(t=>t.id===choice)||PROCESS_LIBRARY[0],c=store.current();
 openDialog('Use process definition',`<p>Use <strong>${hx(t.name)}</strong> as the baseline draft for ${hx(c.name)}. Review its actions, repeat counts, exceptions, and retained human work. The existing site and business inputs stay in place. Existing actions and options are kept in case history.</p>`,()=>{
 const next=makeProcessCase(t.id,store.get().configs);
 updateCase(c=>{c.history.push({event:'Previous baseline before definition change',date:new Date().toISOString(),actions:copy(c.actions),scenarios:copy(c.scenarios)});for(const key of ['actions','scenarios','selectedScenarioId','processTemplateId','processArea','warehouseTypes','verticals','templateReviewed'])c[key]=copy(next[key]);c.sources.push(...next.sources.filter(s=>!c.sources.some(x=>x.id===s.id)));});ui.tab='Process';ui.flowMode='manual';ui.flowStep=null;render();
 },{submit:'Use definition'});
}

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
  openDialog(id?'Edit action':'Add action',gridFields([formInput('name','Action name',a.name,{type:'text',required:true}),formInput('taskGroup','Task group',a.taskGroup||'',{type:'text'}),formInput('workElement','Work element',a.workElement||a.name,{type:'text'}),formInput('object','Object / load',a.object||'',{type:'text'}),formInput('from','Source location',a.from||'',{type:'text'}),formInput('to','Target location',a.to||'',{type:'text'}),formSelect('timingMethod','Timing method',a.timingMethod||'Not known',['Not known','Assumed example','Observed time study','Standard time study','MTM · user-supplied']),formInput('mtmCode','MTM / study code',a.mtmCode||'',{type:'text',help:'Optional. The app does not certify an MTM study.'}),formInput('sampleCount','Timing sample count',a.sampleCount,{step:1}),formInput('skill','Required skill',a.skill,{type:'text',help:'Use a known skill such as grip, or add a specific skill. Add its measured or assumed time to the configuration record.'}),formInput('seconds','Human active time',a.seconds,{unit:'s/action'}),formInput('frequency','Repeat count per unit',a.frequency,{unit:'×'}),formInput('payloadKg','Load requirement',a.payloadKg,{unit:'kg'}),formInput('reachM','Reach requirement',a.reachM,{unit:'m'}),formInput('aisleM','Available aisle',a.aisleM,{unit:'m'}),formSelect('source','Data status',a.source,SOURCE_STATES),formSelect('sourceId','Source record',a.sourceId,[['','Not linked'],...c.sources.map(s=>[s.id,s.name])]),formSelect('dependency','Preceding dependency',a.dependency,[['','Start / no predecessor'],...c.actions.filter(x=>x.id!==a.id).map(x=>[x.id,x.name])]),formSelect('parallel','Can this work overlap?',a.parallel?'yes':'no',[['no','No · sequential planning model'],['yes','Yes · needs a shared-resource model']])])+formNote('requiredCapabilities','Required capabilities · comma-separated',(a.requiredCapabilities||[]).join(', '))+formSelect('humanRetained','Retain human decision for this draft?',a.humanRetained?'yes':'no',[['no','No'],['yes','Yes']])+formNote('note','Method and conditions',a.note)+formNote('recovery','Failure, recovery, and responsible role',a.recovery),v=>{
    v.skill=v.skill.toLowerCase().replace(/\s+/g,'-');const next={...a,...v,requiredCapabilities:v.requiredCapabilities.split(',').map(x=>x.trim()).filter(Boolean),humanRetained:v.humanRetained==='yes',parallel:v.parallel==='yes'};
    const draft=copy(c);if(id)draft.actions[draft.actions.findIndex(x=>x.id===id)]=next;else draft.actions.push(next);
    const deps=new Map(draft.actions.map(x=>[x.id,x.dependency]));let curr=next.dependency,seen=new Set([next.id]);while(curr){if(seen.has(curr))throw new Error('This dependency creates a cycle.');seen.add(curr);curr=deps.get(curr);}
    updateCase(c=>{materialHistory(c,'Action edited');c.actions=draft.actions;if(c.processTemplateId)c.templateReviewed=false;});notify('Action saved. Review affected matches and results.');
  },{footer:id?button('Remove action','remove-action',{id,kind:'danger',extra:'type="button"'}):'',wide:true});
}
function configDialog(id=null) {
  const v=store.get().configs.find(v=>v.id===id)||{id:uid('config'),name:'New configuration',family:'Humanoid',revision:1,realProduct:true,source:'Unknown',sourceDate:'',sourceNote:'',skills:[],capabilities:[],times:{},price:null,leaseMonthly:null,payloadKg:null,reachM:null,minAisleM:null,successPct:null,interventionPct:null,recoverySec:null,chargePct:null,downtimePct:null,supportAnnual:null,energyAnnual:null,extraCapex:null,extraOpexAnnual:null,commercialStatus:'Unknown',commercialSource:'',description:'',serviceIncluded:false};
  openDialog(id?'Configuration and capability record':'Add configuration',`<div class="callout subtle"><p>Values are valid only for their stated configuration and conditions. A measured label needs a real source and applicable test evidence.</p></div>`+gridFields([
    formInput('name','Configuration name',v.name,{type:'text',required:true}),formInput('sourceUrl','Manufacturer source URL',v.sourceUrl||'',{type:'url'}),formInput('hardwareModel','Hardware model / version',v.hardwareModel||'Not confirmed',{type:'text'}),formInput('tool','Tool / gripper',v.tool||'Not confirmed',{type:'text'}),formInput('sensors','Sensors',v.sensors||'Not confirmed',{type:'text'}),formInput('software','Software / policy / model',v.software||'Not confirmed',{type:'text'}),formInput('interface','Supported interface',v.interface||'Not verified',{type:'text'}),formInput('quoteValidUntil','Quote valid until',v.quoteValidUntil||'',{type:'date'}),formSelect('family','Technology family',v.family,['Humanoid','AMR','Robot arm','Vision','Assist tool','Fixed automation','Other']),formSelect('source','Evidence status',v.source,SOURCE_STATES),formInput('sourceDate','Source date',v.sourceDate,{type:'date'}),formInput('payloadKg','Maximum payload',v.payloadKg,{unit:'kg'}),formInput('reachM','Maximum reach',v.reachM,{unit:'m'}),formInput('minAisleM','Minimum aisle',v.minAisleM,{unit:'m'}),formInput('successPct','First-pass bundle success',v.successPct,{unit:'%',max:100}),formInput('interventionPct','Extra human intervention events',v.interventionPct,{unit:'% of units',max:100}),formInput('recoverySec','Human time per intervention',v.recoverySec,{unit:'s'}),formInput('chargePct','Charging share of operating window',v.chargePct,{unit:'%',max:99,help:'Exclude this time from downtime.'}),formInput('downtimePct','Other downtime',v.downtimePct,{unit:'%',max:99,help:'Excludes charging. Use the same operating window.'}),formInput('price','Purchase price per unit',v.price,{unit:'EUR once'}),formInput('extraCapex','Other CAPEX per unit',v.extraCapex,{unit:'EUR once',help:'Tool, charger, installation, freight, duties, or training not already in the hardware price or case integration.'}),formInput('extraOpexAnnual','Other OPEX per unit',v.extraOpexAnnual,{unit:'EUR/year',help:'Software, consumables, and battery replacement reserve not already in case costs or service.'}),formSelect('commercialStatus','EUR cost data status',v.commercialStatus||'Unknown',SOURCE_STATES),formInput('commercialSource','EUR cost source / FX basis',v.commercialSource||'',{type:'text',help:'Name the quote or assumption. For conversion, record rate, date, currency, and exclusions.'}),formInput('commercialDate','Cost source date',v.commercialDate||'',{type:'date'}),formInput('leaseMonthly','Lease / RaaS fee per unit',v.leaseMonthly,{unit:'EUR/month'}),formInput('supportAnnual','Service cost when not included',v.supportAnnual,{unit:'EUR/unit/year'}),formInput('energyAnnual','Energy cost',v.energyAnnual,{unit:'EUR/unit/year'}),formSelect('serviceIncluded','Lease / RaaS includes service?',v.serviceIncluded?'yes':'no',[['yes','Yes'],['no','No']]),formSelect('requiresOperator','Needs a person for active tool time?',v.requiresOperator?'yes':'no',[['no','No'],['yes','Yes · assist tool']])
  ])+formNote('description','Configuration, tool, software, and operating conditions',v.description)+formNote('sourceNote','Source, test method, samples, and validity limits',v.sourceNote)+formNote('capabilities','Capability candidates · comma-separated',(v.capabilities||[]).join(', '))+formNote('costNote','Cost scope, inclusions, exclusions, and missing quotes',v.costNote||'')+`<h3>Task times and supported skills</h3><p class="muted">Enter a positive time to include a skill. Leave it blank when performance is not known. Task times do not include retries.</p>`+gridFields(SKILLS.map(skill=>formInput(`time_${skill}`,`${skill} time`,v.times[skill],{unit:'s/action',min:0.001})))+formNote('customTimes','Additional skills and task times',Object.entries(v.times).filter(([key])=>!SKILLS.includes(key)).map(([key,value])=>key+': '+value).join('\n'),'One skill: seconds pair per line. Example: push-button: 2.5.'),values=>{
    if(values.chargePct!=null&&values.downtimePct!=null&&values.chargePct+values.downtimePct>=100)throw new Error('Charge and downtime must total less than 100%.');
    const times=parseTaskTimes(values.customTimes||'');delete values.customTimes;for(const skill of SKILLS){if(values[`time_${skill}`]!=null)times[skill]=values[`time_${skill}`];delete values[`time_${skill}`];}
    const skills=Object.keys(times);const next={...v,...values,capabilities:values.capabilities.split(',').map(x=>x.trim()).filter(Boolean),times,skills,serviceIncluded:values.serviceIncluded==='yes',requiresOperator:values.requiresOperator==='yes'};
    // Retain the declared skill for an unknown record even when the time is not yet available.
    if(!skills.length&&v.skills.length)next.skills=v.skills;
    if(id)store.updateConfig(id,x=>Object.assign(x,next));else{store.get().configs.push(next);store.save();}
    notify('Configuration saved. Material changes require a new review.');
  },{wide:true});
}
function saveStudyStage(node) {
 const values={};for(const field of node.closest('.study-stage').querySelectorAll('[data-field]'))values[field.dataset.field.split('.').at(-1)]=field.value;
 updateCase(c=>{c.study ||= newStudy();if(Object.entries(values).some(([key,value])=>c.study.settings[key]!==value)){Object.assign(c.study.settings,values);c.study.revision=(c.study.revision||1)+1;}},false);
}
function benchmarkDialog() {
 const c=store.current(),settings=c.study?.settings||{};
 const real=store.get().configs.filter(v=>v.realProduct);
 openDialog('Record external benchmark',`<div class="callout subtle"><p>This records a supplied result. It does not run a robot or validate an external claim. Use Sample for demonstration values.</p></div>`+gridFields([
 formSelect('configId','Exact robot configuration',real[0]?.id||store.get().configs[0].id,(real.length?real:store.get().configs).map(v=>[v.id,v.name])),
 formSelect('evidence','Result evidence','Sample',['Sample','Simulated','Measured']),formSelect('policyKind','Policy stage','Baseline',['Baseline','Refined','Scripted']),formInput('policy','Policy or controller version','',{type:'text',required:true}),
 ...[['protocol','Benchmark protocol'],['taskVersion','Task version'],['sceneVersion','Scene version'],['conditions','Start states, seeds, objects, and test limits']].map(([key,label])=>formInput(key,label,settings[key]||'',{type:'text',required:true})),
 formInput('attempts','Attempted episodes',null,{min:1,max:10000000,step:1,required:true}),formInput('successes','First-pass successful episodes',null,{min:0,step:1,required:true}),formInput('cycleSec','Mean task cycle',null,{unit:'s',min:0.001}),formInput('interventions','Human intervention events',null,{min:0,step:1}),formInput('recoverySec','Mean recovery per intervention',null,{unit:'s'}),formInput('energyKwh','Run energy',null,{unit:'kWh'}),formInput('source','Result artifact or test report','',{type:'text',required:true})
 ]),values=>{
 const b={...values,id:uid('benchmark'),date:new Date().toISOString(),caseRevision:c.revision,studyRevision:c.study?.revision||1};
 const errors=validateBenchmark(b,new Set(store.get().configs.map(v=>v.id)));if(errors.length)throw new Error(errors.join(' '));
 updateCase(c=>{c.study ||= newStudy();if(c.study.benchmarks.length>=500)throw new Error('Benchmark record limit reached.');c.study.benchmarks.push(b);},false);
 notify('Benchmark recorded. No product timing or business-case input was changed.');
 },{wide:true,submit:'Record result'});
}

function sourceDialog(id=null) {
  const s=store.current().sources.find(s=>s.id===id)||{id:uid('source'),name:'',type:'Process / SOP',status:'Unknown',date:'',note:'',fileId:null};
  openDialog(id?'Review source':'Add source',gridFields([formInput('name','Source name',s.name,{type:'text',required:true}),formSelect('type','Source type',s.type,['Process / SOP','Engineering model','Layout / CAD','MTM / time study','Demand / orders','Benchmark / trial','Commercial quote','Inventory / SKU','Human workforce','Automation resources','Resource capabilities','Resource status','Operational constraints','Business rules / SLA','Traffic / congestion','Equipment / IoT','Other']),formSelect('status','Data status',s.status,SOURCE_STATES),formInput('date','Source / capture date',s.date,{type:'date'})])+formNote('note','Source, conditions, method, samples, and missing data',s.note),values=>{updateCase(c=>{if(id)Object.assign(c.sources.find(x=>x.id===id),values);else c.sources.push({...s,...values});});notify('Source saved.');});
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
    if(action==='library-group'){ui.catalogGroup=id;ui.catalogCategory='';ui.catalogPage=0;ui.catalogSelected='';render();}
    else if(action==='reset-library-filters'){for(const key of ['catalogGroup','catalogSearch','catalogProcess','catalogCategory','catalogVendor','catalogKind','catalogAsset','catalogSelected'])ui[key]='';ui.catalogPage=0;render();}
    else if(action==='library-page'){ui.catalogPage=Number(id)||0;ui.catalogSelected='';render();document.querySelector('.library-results-bar')?.scrollIntoView({block:'start'});}
    else if(action==='library-process-technologies'){ui.catalogProcess=id;ui.catalogGroup='';ui.catalogCategory='';ui.catalogPage=0;ui.catalogSelected='';ui.view='catalog';history.replaceState(null,'','#catalog');render();window.scrollTo(0,0);}
    else if(action==='open-library-model'){ui.catalogSelected=id;render();document.querySelector('.auto-selected')?.scrollIntoView({block:'start'});}
    else if(action==='close-library-model'){ui.catalogSelected='';render();}
    else if(action==='navigate'){if(id==='evaluations'){ui.selectorStage='area';ui.flowMode='manual';}history.replaceState(null,'',`#${id}`);ui.view=id;ui.mobileMenu=false;updateCase(c=>c.lastTab=ui.tab,false);render();window.scrollTo(0,0);}
    else if(action==='save-input-group'){
      const record={};for(const field of node.closest('details').querySelectorAll('[data-input-key]'))record[field.dataset.inputKey.split('.').at(-1)]=field.value;
      updateCase(c=>{c.inputGroups ||= {};c.inputGroups[id]=record;});notify('Input group saved. Context values do not change calculation fields.');
    }
    else if(action==='choose-process-area'){ui.processArea=id;ui.warehouseType='';ui.processVertical='';ui.processSearch='';ui.selectorStage='process';ui.flowStep=null;render();}
    else if(action==='choose-library-process'){ui.libraryId=id;ui.selectorStage='flow';ui.flowStep=null;render();}
    else if(action==='selector-stage'){ui.selectorStage=id;render();}
    else if(action==='flow-mode'){ui.flowMode=id;render();}
    else if(action==='flow-wrap'){ui.flowWrap=!ui.flowWrap;render();}
    else if(action==='flow-changes'){ui.flowChangesOnly=!ui.flowChangesOnly;render();}
    else if(action==='flow-step'){ui.flowStep=ui.flowStep===id?null:id;render();document.querySelector('.flow-inspector')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
    else if(action==='flow-add')processChangeDialog();
    else if(action==='flow-propose')processChangeDialog(id);
    else if(action==='flow-reset'){updateCase(c=>{const s=activeScenario();s.processChanges=(s.processChanges||[]).filter(x=>x.id!==id&&x.stepId!==id);});notify('Step redesign reset. Actor assignments remain.');}
    else if(action==='build-process-options'){const fingerprint=s=>JSON.stringify([Object.entries(s.assignments||{}).sort(),Object.entries(s.counts||{}).sort()]);const drafts=capabilityOptions(c,store.get().configs).filter(d=>!c.scenarios.some(s=>fingerprint(s)===fingerprint(d)));if(c.scenarios.length+drafts.length>500)throw new Error('The case has reached its option limit. Review the existing options.');if(!drafts.length){notify('No new capability combination was found. Existing drafts and the manual option remain available.');}else{updateCase(c=>{for(const draft of drafts){draft.id=uid('capability');c.scenarios.push(draft);}c.selectedScenarioId=drafts[0].id;});ui.flowMode='compare';render();notify(drafts.length+' capability drafts added. Complete the performance and cost inputs.');}}
    else if(action==='apply-process-template')applyProcessDefinitionDialog();
    else if(action==='build-delivery-plan'){updateCase(c=>{const s=activeScenario(),used=store.get().configs.filter(v=>c.actions.some(a=>s.assignments[a.id]===v.id&&!(s.processChanges||[]).some(x=>x.type==='remove'&&x.stepId===(a.activityId||a.taskGroup||a.id))));c.deployment.optionSnapshot={name:s.name,scenarioId:s.id,caseRevision:c.revision+1,modelVersion:MODEL_VERSION,date:new Date().toISOString(),assignments:copy(s.assignments),counts:copy(s.counts),hardware:used.map(v=>({id:v.id,name:v.name,revision:v.revision,hardwareModel:v.hardwareModel||'',tool:v.tool||'',software:v.software||''}))};c.deployment.target=used.map(v=>`${s.counts[v.id]??'?'} × ${v.name} / ${v.tool||'tool pending'}`).join('; ')||'Manual work-method change';});notify('Delivery plan snapshot created. Review policy, data, integration, and release gaps.');}
    else if(action==='focus-process-activity'){const target=document.getElementById('visual-'+id);if(target){target.open=true;target.scrollIntoView({behavior:'smooth',block:'center'});target.querySelector('summary').focus();}}
    else if(action==='expand-process-activities'){const items=[...document.querySelectorAll('.activity-breakdown')],expand=items.some(x=>!x.open);items.forEach(x=>x.open=expand);node.textContent=expand?'Collapse all steps':'Expand all steps';}
    else if(action==='process-visual-tab'){const root=node.closest('.process-canvas');root.querySelectorAll('.process-view-tabs button').forEach(x=>{x.classList.toggle('selected',x===node);x.setAttribute('aria-pressed',String(x===node));});const expand=id==='decomposition';root.querySelectorAll('.activity-breakdown').forEach(x=>x.open=expand);root.querySelector('[data-action="expand-process-activities"]').textContent=expand?'Collapse all steps':'Expand all steps';root.querySelector('[data-process-pane="flow"]').scrollIntoView({behavior:'smooth',block:'start'});}

    else if(action==='study-save'){saveStudyStage(node);const stage=document.querySelector('[data-study-stage="'+id+'"]');if(stage)stage.open=true;notify('Study configuration saved. Earlier AWS benchmark records require a plan revision review.');}
    else if(action==='study-benchmark')benchmarkDialog();
    else if(action==='study-request'){saveStudyStage(node);const date=new Date().toISOString(),request=studyRequest(c,store.get().configs,id,uid('request'),date);updateCase(c=>{c.study ||= newStudy();if(c.study.requests.length>=500)throw new Error('Request record limit reached.');c.study.requests.push({id:request.id,date,stage:id,caseRevision:c.revision,studyRevision:c.study?.revision||1,status:'Prepared locally'});},false);jsonDownload(`study-${id}-${c.id}.json`,request);notify('Request prepared locally. No external workload was started.');}
    else if(action==='study-export')jsonDownload(`simulation-study-${c.id}.json`,{type:'Local simulation study',externalExecution:false,caseId:c.id,caseRevision:c.revision,study:c.study||newStudy(),process:c.actions,scenarios:c.scenarios,boundary:'Simulation-only scope. Physical deployment and production WMS/LMS integration are excluded.'});
    else if(action==='start-process'){const next=makeProcessCase(id,store.get().configs);store.addCase(next);history.replaceState(null,'','#case');ui.view='case';ui.tab='Process';ui.flowMode='manual';ui.flowStep=null;render();window.scrollTo(0,0);notify('Engineering draft created. Review the path, actions, requirements, and work splits.');}
    else if(action==='review-process'){openDialog('Confirm the process draft',`<p>Confirm that you have reviewed the source path, activity order, exceptions, repeat rules, atomic actions, handoffs, and human roles. This does not confirm task times or machine performance.</p>`+formNote('basis','Review basis and remaining conditions',''),v=>{if(v.basis.length<12)throw new Error('Record the review basis and remaining conditions.');updateCase(c=>{c.templateReviewed=true;c.processReviewNote=v.basis;});notify('Process draft review recorded. Complete the remaining numeric inputs.');},{submit:'Record review'});}
    else if(action==='analyse-process'){openDialog('Rebuild candidate work splits','<p>Create new whole-activity work-split drafts from the current actions and real product records. Existing options remain. One machine is a placeholder, not a fleet recommendation.</p>',()=>{const analysis=analyseProcess(c,store.get().configs);updateCase(c=>{for(const v of store.get().configs.filter(v=>v.realProduct&&!v.excludedFromMatching)){const bundles=analysis.bundles.filter(b=>b.candidates.some(x=>x.id===v.id));if(bundles.length)c.scenarios.push({id:uid('draft'),name:'Reviewed draft · '+v.name,kind:'hybrid',counts:{[v.id]:1},assignments:Object.fromEntries(bundles.flatMap(b=>b.rows.map(r=>[r.action.id,v.id]))),manualFactor:1,engineeringDraft:true});}c.templateReviewed=false;});},{submit:'Create drafts'});}
    else if(action==='toggle-menu'){ui.mobileMenu=!ui.mobileMenu;render();}
    else if(action==='open-case'){history.replaceState(null,'','#case');store.setActive(id);ui.view='case';ui.tab=node.dataset.tab||store.current().lastTab||'Overview';ui.mobileMenu=false;updateCase(c=>c.lastTab=ui.tab,false);render();window.scrollTo(0,0);}
    else if(action==='case-tab'){ui.tab=id==='Scenarios'?'Matches':id;ui.flowMode=['Results','Matches','Scenarios'].includes(id)?'compare':'manual';ui.flowStep=null;updateCase(c=>c.lastTab=id,false);window.scrollTo(0,0);}
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
    else if(action==='adapter-request'){const s=activeScenario();jsonDownload(`${id.replace(/[^a-z0-9]/gi,'-')}-request.json`,{type:id,status:'Not connected',caseId:c.id,caseRevision:c.revision,process:c.actions,inputGroups:copy(c.inputGroups||{}),sources:copy(c.sources),scenario:s,configurations:store.get().configs.filter(v=>Object.keys(s.counts).includes(v.id)),requiredOutputs:['Versioned inputs','Test conditions and sample count','Task times and variation','First-pass success, retries, and human intervention','Failure and recovery records','Operating envelope and limits'],deployment:copy(c.deployment)});notify('Service request downloaded. No external job was started.');}
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

document.addEventListener('input',event=>{
  if(event.target.dataset.action==='catalogSearch'){const value=event.target.value,position=event.target.selectionStart;clearTimeout(processSearchTimer);processSearchTimer=setTimeout(()=>{ui.catalogSearch=value;ui.catalogPage=0;render();const input=document.querySelector('[data-action="catalogSearch"]');input?.focus();if(position!=null)input?.setSelectionRange(position,position);},180);return;}
  if(event.target.dataset.action!=='process-search')return;
  const value=event.target.value,position=event.target.selectionStart;
  clearTimeout(processSearchTimer);
  processSearchTimer=setTimeout(()=>{ui.processSearch=value;ui.flowStep=null;render();const input=document.querySelector('[data-action="process-search"]');input?.focus();if(position!=null)input?.setSelectionRange(position,position);},180);
});

document.addEventListener('change',async event=>{
  const node=event.target,c=store.current();
  try{
    if(['catalogProcess','catalogCategory','catalogKind','catalogAsset','catalogSearch','catalogVendor','catalogSort'].includes(node.dataset.action)){ui[node.dataset.action]=node.value;ui.catalogPage=0;if(node.dataset.action==='catalogProcess')ui.catalogCategory='';ui.catalogSelected='';render();return;}
    if(node.dataset.field?.startsWith('study.'))return;
    if(node.dataset.field){const value=node.type==='number'?(node.value===''?null:Number(node.value)):node.value;if(node.type==='number'&&value!=null&&(!Number.isFinite(value)||(node.min!==''&&value<Number(node.min))||(node.max!==''&&value>Number(node.max))||(node.step==='1'&&!Number.isInteger(value)))){render();throw new Error('Use a value within the field limits. The previous value was kept.');}updateCase(c=>setPath(c,node.dataset.field,value),true,true);return;}
    if(node.dataset.assignment){const actor=node.value;updateCase(c=>{let s=activeScenario();if(s.kind==='manual'&&actor!=='human'){s={...copy(s),id:uid('option'),name:'Custom hybrid from current method',kind:'hybrid'};c.scenarios.push(s);c.selectedScenarioId=s.id;}if(actor==='human')delete s.assignments[node.dataset.assignment];else s.assignments[node.dataset.assignment]=actor;cleanScenarioCounts(c);});return;}
    if(node.dataset.count){updateCase(c=>activeScenario().counts[node.dataset.count]=node.value===''?null:Number(node.value));return;}
    if(node.dataset.check){updateCase(c=>c.deployment.checklist[node.dataset.check]=node.checked);return;}
    if(node.dataset.question){updateCase(c=>c.answers[node.dataset.question]=node.value,false,true);return;}
    const action=node.dataset.action;
    if(action==='process-area'){ui.processArea=node.value;render();}
    else if(action==='warehouse-type'){ui.warehouseType=node.value;ui.flowStep=null;render();}
    else if(action==='process-vertical'){ui.processVertical=node.value;ui.warehouseType='';ui.flowStep=null;render();}
    else if(action==='process-search'){clearTimeout(processSearchTimer);ui.processSearch=node.value;ui.flowStep=null;render();}
    else if(action==='library-process'){ui.libraryId=node.value;ui.selectorStage='flow';ui.flowStep=null;render();}
    else if(action==='select-scenario'){updateCase(c=>c.selectedScenarioId=node.value);}
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
window.addEventListener('hashchange',()=>{const view=location.hash.slice(1);if(['executive','evaluations','deployments','catalog','evidence','workflow','case','processes','pipeline','aws-plan'].includes(view)){ui.view=view;render();}});
window.addEventListener('beforeunload',()=>{store.flush();});
if(['executive','evaluations','deployments','catalog','evidence','workflow','case','processes','pipeline','aws-plan'].includes(location.hash.slice(1)))ui.view=location.hash.slice(1);
if(ui.view==='case')ui.tab=store.current().lastTab||'Overview';
render();store.connect();
