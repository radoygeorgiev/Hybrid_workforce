import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AUTO_LIBRARY} from '../src-v2/auto-library-data.js';
import {filterAutoLibrary,autoLibraryRecords,libraryGroup,LIBRARY_GROUPS} from '../src-v2/auto-library.js';
import {researchedProducts} from '../src-v2/products.js';
import {renderApp} from '../src-v2/views.js';
import {seedWorkspace} from '../src-v2/data.js';

test('import preserves product identities, process links and existing local assets',()=>{
 const processIds=new Set(AUTO_LIBRARY.processes.map(p=>p.id));
 assert.equal(new Set(AUTO_LIBRARY.records.map(r=>r.id)).size,AUTO_LIBRARY.records.length);
 assert.equal(AUTO_LIBRARY.records.filter(r=>r.productId).length,254);
 for(const record of AUTO_LIBRARY.records){
  assert.equal(record.reviewStatus,'Requires confirmation');
  assert.equal(record.isaacValidated,false);
  for(const process of record.processes){assert.ok(processIds.has(process.processId));assert.ok(process.provenance||process.sourceReference);}
  for(const key of ['model','thumbnail','blender','blenderPackage','usd'])if(record[key]){
   assert.ok(record[key].startsWith('assets/auto-library/files/'));
   assert.ok(fs.existsSync(new URL('../'+record[key],import.meta.url)),record[key]);
  }
  if(record.model){const file=fs.readFileSync(new URL('../'+record.model,import.meta.url));assert.equal(file.toString('ascii',0,4),'glTF');assert.equal(file.readUInt32LE(8),file.length);}
 }
});
test('combined filters respect process, category, supplier and actual asset availability',()=>{
 const process='PROC-STORAGE',rows=filterAutoLibrary({catalogProcess:process,catalogAsset:'model'});
 assert.ok(rows.length>0);
 for(const r of rows){assert.ok(r.model);assert.ok(r.processes.some(p=>p.processId===process));}
 const first=rows[0],filtered=filterAutoLibrary({catalogProcess:process,catalogCategory:first.category,catalogVendor:first.vendor,catalogAsset:'model'});
 assert.ok(filtered.length);assert.ok(filtered.every(r=>r.vendor===first.vendor&&r.category===first.category));
 assert.ok(filterAutoLibrary({catalogProcess:'unassigned'}).every(r=>!r.processes.length));
 assert.equal(filterAutoLibrary({catalogSearch:'no-such-product-348173'}).length,0);
 assert.ok(filterAutoLibrary({catalogAsset:'missing'}).every(r=>!r.model));
});
test('humanoids have a visible category and preserve their existing configuration link',()=>{
 const configs=researchedProducts(),rows=filterAutoLibrary({catalogGroup:'humanoid'},configs);
 assert.ok(rows.length>=4);
 for(const r of rows){assert.ok(configs.some(c=>c.id===r.configId));assert.equal(r.model,null);assert.equal(r.illustration,true);assert.equal(libraryGroup(r),'humanoid');}
 const groups=new Set(LIBRARY_GROUPS.map(g=>g[0]));
 assert.ok(autoLibraryRecords(configs).every(r=>groups.has(libraryGroup(r))));
});
test('catalogue renders visual cards, filters and an embedded preview',()=>{
 const w=seedWorkspace(),ctx={w,c:w.cases[0],view:'catalog',role:'Engineer view',questions:[],catalogSelected:'system-autostore_design'};
 const html=renderApp(ctx);
 assert.match(html,/library-gallery/);assert.match(html,/Humanoids/);assert.match(html,/Search Auto Library/);assert.match(html,/viewer\.html\?id=system-autostore_design/);
 assert.match(html,/catalogVendor/);assert.match(html,/catalogProcess/);
});
