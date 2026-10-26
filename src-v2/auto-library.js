import { AUTO_LIBRARY } from './auto-library-data.js';

export const LIBRARY_GROUPS = [
  ['storage','Storage systems','Cube, shuttle, crane and vertical storage'],
  ['transport','Mobile robots','AMRs, AGVs and autonomous trucks'],
  ['picking','Picking and robotics','Picking robots and handling cells'],
  ['sorting','Sortation','Sorters and routing systems'],
  ['packaging','Packaging','Cartons, mailers and protective packaging'],
  ['inspection','Inspection and safety','Scanning, inventory and safety systems'],
  ['humanoid','Humanoids','Humanoid and wheeled dual-arm robots'],
  ['support','Support assets','Loads, building parts and components']
];
export function libraryGroup(record) {
  const text=record.category.toLowerCase();
  if(/humanoid/.test(text))return 'humanoid';
  if(/as\/rs|storage|shuttle|acr|rack|crane|carousel|miniload/.test(text))return 'storage';
  if(/sort/.test(text))return 'sorting';
  if(/pack|carton|case erect|void fill|mailer/.test(text))return 'packaging';
  if(/scan|inspect|vision|safety|barcode|dimension|inventory|identification|label/.test(text))return 'inspection';
  if(/amr|agv|autonomous|truck|transport|tow tractor/.test(text)&&!/picking/.test(text))return 'transport';
  if(/pick|robot|conveyor|palletiz/.test(text))return 'picking';
  return 'support';
}
export function autoLibraryRecords(configs=[]) {
  return [...AUTO_LIBRARY.records,...configs.filter(c=>c.realProduct&&/humanoid/i.test(c.family)).map(c=>({
    id:c.id,configId:c.id,name:c.name,vendor:c.hardwareModel?.split(' ')[0]||c.name.split(' ')[0],kind:'products',category:'Humanoid robots',designation:c.hardwareModel||c.family,description:c.description,processes:[],
    thumbnail:'assets/auto-library/humanoid.svg',blenderPackage:null,illustration:true,model:null,blender:null,usd:null,modelState:'3D asset not imported',reviewStatus:c.source||'Unknown',publishedSpecs:c.publishedSpecs,sourceUrl:c.sourceUrl
  }))];
}
export function filterAutoLibrary({catalogSearch='',catalogProcess='',catalogCategory='',catalogKind='',catalogAsset='',catalogGroup='',catalogVendor='',catalogSort='featured'}={},configs=[]) {
  const query=catalogSearch.trim().toLowerCase();
  const records=autoLibraryRecords(configs).filter(r=>(!query||`${r.name} ${r.vendor} ${r.category} ${r.designation} ${r.productId||''}`.toLowerCase().includes(query))&&(!catalogProcess||(catalogProcess==='unassigned'?!r.processes.length:r.processes.some(p=>p.processId===catalogProcess)))&&(!catalogCategory||r.category===catalogCategory)&&(!catalogGroup||libraryGroup(r)===catalogGroup)&&(!catalogVendor||r.vendor===catalogVendor)&&(!catalogKind||r.kind===catalogKind)&&(!catalogAsset||(catalogAsset==='model'?!!r.model:catalogAsset==='usd'?!!r.usd:catalogAsset==='blender'?!!r.blender:!r.model)));
  return records.sort((a,b)=>catalogSort==='name'?a.name.localeCompare(b.name):catalogSort==='vendor'?a.vendor.localeCompare(b.vendor)||a.name.localeCompare(b.name):Number(!!b.thumbnail&&!!b.model)-Number(!!a.thumbnail&&!!a.model)||Number(!!b.usd)-Number(!!a.usd)||Number(b.kind==='systems')-Number(a.kind==='systems')||a.name.localeCompare(b.name));
}
