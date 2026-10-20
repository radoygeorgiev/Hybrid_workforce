import test from 'node:test';
import assert from 'node:assert/strict';
import { VAS_PROCESSES, VAS_SOURCES } from '../src-v2/vas-library.js';
import { seedWorkspace } from '../src-v2/data.js';
import { makeProcessCase, analyseProcess } from '../src-v2/process-analysis.js';
import { renderApp } from '../src-v2/views.js';

test('VAS drafts retain sector coverage, service references, unknown timings, and approval roles',()=>{
 assert.equal(VAS_PROCESSES.length,56);
 for(const sector of ['Technology','Healthcare','Industrials','Chemicals','Automotive','FMCG','Retail and fashion','Food and beverage']){
  assert.ok(VAS_PROCESSES.filter(p=>p.verticals.includes(sector)).length>=4,sector);
 }
 const w=seedWorkspace();
 for(const p of VAS_PROCESSES){
  assert.ok(VAS_SOURCES.some(s=>s.id===p.sourceId&&s.url.startsWith('https://')));
  assert.equal(p.activities.length,5);assert.equal(p.actions.length,15);
  assert.ok(p.requiredInputs.length>=5);assert.ok(p.controls);assert.ok(p.output);
  const c=makeProcessCase(p.id,w.configs),analysis=analyseProcess(c,w.configs);
  assert.ok(c.sources[0].url);assert.ok(c.sources[0].note.includes(p.output));
  assert.equal(c.templateReviewed,false);
  assert.ok(c.actions.every(a=>a.seconds===null&&a.frequency===null&&a.source==='Assumed'));
  for(const row of analysis.rows.filter(r=>r.action.requiredCapabilities.some(x=>x.startsWith('specialist-'))||r.action.humanRetained)){
   assert.equal(row.candidates.length,0,'General hardware cannot claim specialist operations or approvals');
  }
 }
});

test('VAS selection filters by sector and atomic-action text without mixing process definitions and cases',()=>{
 const w=seedWorkspace(),ctx={w,c:w.cases[0],view:'evaluations',processArea:'Value-added services',processVertical:'Chemicals',selectorStage:'process',questions:[],role:'Engineer view',saveStatus:'Local'};
 const html=renderApp(ctx);
 assert.ok(html.includes('Process sector'));assert.ok(html.includes('Search process definitions'));
 assert.ok(html.includes('Blend a liquid chemical batch'));assert.ok(!html.includes('Load device firmware'));
 const search=renderApp({...ctx,processSearch:'sieve integrity'});
 assert.ok(search.includes('Sieve a solid chemical product'));assert.ok(!search.includes('Blend a liquid chemical batch'));
 const empty=renderApp({...ctx,processSearch:'no matching process 123'});
 assert.ok(empty.includes('No processes match'));
 assert.ok(html.includes('Saved evaluations'));assert.ok(html.includes('These are saved cases, not process definitions.'));
});
