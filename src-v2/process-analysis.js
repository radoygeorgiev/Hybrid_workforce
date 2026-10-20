import { makeCase, copy, uid } from './data.js';
import { fitAction } from './engine.js';
import { PROCESS_LIBRARY, PROCESS_SOURCES } from './process-library.js';

export function analyseProcess(c, configs) {
  const real=configs.filter(v=>v.realProduct&&!v.excludedFromMatching);
  const rows=c.actions.map(a=>{
    const matches=real.map(v=>{
      const missing=(a.requiredCapabilities||[]).filter(cap=>!v.capabilities?.includes(cap));
      const fit=fitAction(a,v);
      const reasons=[];
      if(missing.length)reasons.push('Capabilities not established: '+missing.join(', '));
      if(fit.checks.some(x=>x.status==='blocked'))reasons.push(...fit.checks.filter(x=>x.status==='blocked').map(x=>x.detail));
      const candidate=!a.humanRetained&&!missing.length&&!fit.checks.some(x=>x.status==='blocked');
      return {id:v.id,name:v.name,candidate,status:candidate?'Conditional candidate':a.humanRetained?'Human retained':fit.checks.some(x=>x.status==='blocked')?'Blocked':'Not established',reasons,needs:fit.checks.filter(x=>x.status==='unknown').map(x=>x.name)};
    });
    const candidates=matches.filter(x=>x.candidate);
    return {action:a,matches,candidates,status:a.humanRetained?'Human retained':candidates.length?'Conditional automation':'Capability gap',reason:a.humanRetained?a.humanReason:candidates.length?'Candidate only. Confirm the tool, object, task time, reliability, and site conditions.':'No listed product has an established complete capability set. Retain the human or existing equipment pending a specialist solution.'};
  });
  const bundles=[...new Set(c.actions.map(a=>a.workBundleId||a.activityId||a.taskGroup||a.id))].map(id=>{
    const members=rows.filter(r=>(r.action.workBundleId||r.action.activityId||r.action.taskGroup||r.action.id)===id);
    const candidates=real.filter(v=>members.every(r=>r.candidates.some(x=>x.id===v.id)));
    return {id,name:members[0].action.workBundleName||members[0].action.taskGroup||members[0].action.name,rows:members,candidates};
  });
  return {rows,bundles,conditional:rows.filter(r=>r.candidates.length).length,retained:rows.filter(r=>r.action.humanRetained).length,gaps:rows.filter(r=>!r.action.humanRetained&&!r.candidates.length).length};
}

export function makeProcessCase(templateId,configs) {
  const t=PROCESS_LIBRARY.find(x=>x.id===templateId);if(!t)throw new Error('Select a process from the library.');
  const c=makeCase(t.name);c.sample=false;c.stage='Define';c.site='Site not set';c.country='Not set';c.processTemplateId=t.id;c.templateReviewed=false;c.warehouseTypes=copy(t.warehouseTypes);c.processArea=t.area;c.verticals=copy(t.verticals||[]);
  c.purpose='Check which work bundles can be shared with technology. Confirm the complete process and business case.';
  for(const key of Object.keys(c.baseline))c.baseline[key]=null;
  for(const key of Object.keys(c.economics))if(typeof c.economics[key]==='number')c.economics[key]=null;
  c.actions=copy(t.actions);for(const a of c.actions)a.frequency=null;
  const source=PROCESS_SOURCES.find(x=>x.id===t.sourceId);
  c.sources=[{id:t.sourceId,name:source.file,type:'Process / SOP',status:'Assumed',date:'',note:t.basis+(t.researchDraft?' Output: '+t.output+'. Required inputs: '+t.requiredInputs.join('; ')+'. Controls: '+t.controls:'')+' Branches: '+t.branches+(source.url?' Service source: '+source.url:''),image:source.image||null,url:source.url||'',fileId:null}];
  c.scenarios=[{id:'current',name:'Current method · inputs needed',kind:'manual',counts:{},assignments:{},manualFactor:1}];c.selectedScenarioId='current';
  c.history=[{event:'Process library engineering draft created',date:new Date().toISOString(),source:t.sourceId,templateId:t.id}];
  const analysis=analyseProcess(c,configs);
  for(const v of configs.filter(v=>v.realProduct&&!v.excludedFromMatching)){
    const bundles=analysis.bundles.filter(b=>b.candidates.some(x=>x.id===v.id));if(!bundles.length)continue;
    c.scenarios.push({id:uid('draft'),name:`Draft work split · ${v.name}`,kind:'hybrid',counts:{[v.id]:1},assignments:Object.fromEntries(bundles.flatMap(b=>b.rows.map(r=>[r.action.id,v.id]))),manualFactor:1,engineeringDraft:true,note:'One unit is a placeholder, not a fleet-size recommendation. Only whole candidate activity bundles are assigned. All timings, loads, geometry, reliability, and economics require confirmation.'});
  }
  c.lastTab='Process';return c;
}
