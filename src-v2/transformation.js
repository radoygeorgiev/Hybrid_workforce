import { analyseProcess } from './process-analysis.js';
export function processSteps(c) {
 const keys=[...new Set(c.actions.map(a=>a.activityId||a.taskGroup||a.id))];
 return keys.map((id,i)=>({id,index:i+1,name:c.actions.find(a=>(a.activityId||a.taskGroup||a.id)===id).taskGroup||c.actions.find(a=>a.id===id)?.name||'Process step',actions:c.actions.filter(a=>(a.activityId||a.taskGroup||a.id)===id)}));
}
export function validateProcessChanges(changes,c) {
 if(changes===undefined)return [];
 if(!Array.isArray(changes)||changes.length>500)return ['Invalid process redesign.'];
 const ids=new Set(processSteps(c).map(s=>s.id)),errors=[];
 for(const x of changes){if(!x||typeof x!=='object'||!['add','remove','change'].includes(x.type)||typeof x.id!=='string'||!x.id||typeof x.name!=='string'||!x.name.trim()||x.name.length>1000||typeof x.reason!=='string'||x.reason.trim().length<5||x.reason.length>10000)errors.push('A process change needs its type, name, and engineering reason.');else if(x.type!=='add'&&!ids.has(x.stepId))errors.push('A process change references a missing baseline step.');else if(x.type==='add'&&x.afterId&&!ids.has(x.afterId))errors.push('An added step references a missing predecessor.');}
 if(new Set(changes.map(x=>x?.id)).size!==changes.length)errors.push('Process change identifiers must be unique.');
 if(new Set(changes.filter(x=>x?.type!=='add').map(x=>x?.stepId)).size!==changes.filter(x=>x?.type!=='add').length)errors.push('Use one redesign record per baseline step.');
 return errors;
}
export function transformation(c,s,configs) {
 const steps=processSteps(c),changes=s.processChanges||[],slots=[];
 const added=after=>changes.filter(x=>x.type==='add'&&(x.afterId||'')===after).forEach(x=>slots.push({id:x.id,name:x.name,baseline:null,future:{name:x.name,actions:[],actors:[],change:'added',reason:x.reason},change:'added'}));
 added('');
 for(const step of steps){
 const edit=changes.find(x=>x.stepId===step.id&&x.type!=='add');
 const actors=[...new Set(step.actions.map(a=>s.kind==='manual'?'human':s.assignments?.[a.id]||'human'))];
 const human=actors.includes('human')||actors.some(id=>configs.find(v=>v.id===id)?.requiresOperator);
 const changed=edit||actors.some(id=>id!=='human')||(s.manualFactor??1)!==1;
 const change=edit?.type==='remove'?'removed':changed?'changed':'retained';
 slots.push({id:step.id,index:step.index,name:step.name,baseline:step,future:change==='removed'?null:{...step,name:edit?.name||step.name,actors,human,change,reason:edit?.reason||((s.manualFactor??1)!==1?'Manual method factor is an entered assumption.':actors.some(id=>id!=='human')?'Work is reassigned; the physical activity remains.':'Same activity and actor.')},change});added(step.id);
 }
 return {slots,counts:Object.fromEntries(['retained','changed','added','removed'].map(k=>[k,slots.filter(x=>x.change===k).length]))};
}

export function capabilityOptions(c,configs) {
 const a=analyseProcess(c,configs),real=configs.filter(v=>v.realProduct&&!v.excludedFromMatching),drafts=[];
 const add=(name,choices)=>{const assignments={},counts={};for(const b of a.bundles){const v=choices.find(v=>b.candidates.some(x=>x.id===v.id));if(v)for(const r of b.rows){assignments[r.action.id]=v.id;counts[v.id]=1;}}if(!Object.keys(assignments).length)return;const fingerprint=JSON.stringify(assignments);if(drafts.some(s=>JSON.stringify(s.assignments)===fingerprint))return;drafts.push({name,kind:'hybrid',counts,assignments,manualFactor:1,engineeringDraft:true,note:'Capability-screened draft. Each count of one is a placeholder, not a fleet recommendation. Timing, geometry, reliability, cost, and handoffs require review.'});};
 for(const v of real)add(v.name+' capability draft',[v]);
 add('Mixed technology capability draft',real.slice(0,3));
 const transport=real.filter(v=>v.family==='AMR'||v.family==='Fixed automation'),manipulation=real.filter(v=>v.family==='Robot arm'||v.family==='Humanoid');
 for(const v of manipulation.slice(0,2))add(v.name+' + transport draft',[v,...transport].slice(0,3));
 return drafts.slice(0,12);
}
