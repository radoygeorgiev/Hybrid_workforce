"""Copy the current Auto Library catalogue and existing visual assets. No model generation."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sqlite3
import sys
import io
import zipfile
from datetime import datetime, timezone
from asset_layout import asset_path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT.parent / 'Auto-Library')
args = parser.parse_args()
sys.dont_write_bytecode = True
source = args.source.resolve()
browser = source / 'docs/model-browser'
sys.path.insert(0, str(browser))
spec = importlib.util.spec_from_file_location('auto_library_browser', browser / 'server.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
connection = sqlite3.connect(f'file:{source}/backend/database.db?mode=ro', uri=True)
connection.row_factory = sqlite3.Row
processes = [dict(id=r['stable_id'], name=r['name'], **{k:v for k,v in json.loads(r['payload_json']).items() if k not in ('id','name')}) for r in connection.execute('SELECT * FROM catalog_processes ORDER BY name')]
technologies = []
for r in connection.execute('SELECT * FROM catalog_technologies ORDER BY name'):
    p = json.loads(r['payload_json'])
    technologies.append(dict(id=r['stable_id'], name=r['name'], description=p.get('description',''), processId=r['process_id'], processApplicability=p.get('processApplicability', []), publicationState=r['publication_state']))
tech_by_id = {t['id']:t for t in technologies}
products = {r['stable_id']:dict(r) for r in connection.execute('SELECT * FROM catalog_products')}
destination = ROOT / 'assets/auto-library'
destination.mkdir(parents=True, exist_ok=True)
# Retain previously imported assets when the source cache has been invalidated.
manifest_path = destination / 'catalogue.json'
previous_manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
previous_records = {r['id']: r for r in previous_manifest.get('records', [])}
# Keep catalogue identity and content hashes in each asset path.
copied = {}
def write_asset(content, category, record_id, role, suffix):
    relative = asset_path(category, record_id, role, content, suffix)
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.read_bytes() != content:
        raise ValueError(f'Asset hash collision: {relative}')
    if not target.exists():
        target.write_bytes(content)
    return relative.as_posix()

def copy_asset(path, category, record_id, role):
    path = Path(path)
    if not path.is_file():
        return None
    result = write_asset(path.read_bytes(), category, record_id, role, path.suffix)
    copied[str(path)] = result
    return result

def blender_package(blend, category, record_id):
    if not blend:
        return None
    # Preserve scene filename and relative texture paths in an extractable package.
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as package:
        package.write(blend, blend.name)
        for asset in sorted((blend.parent / 'textures').rglob('*')):
            if asset.is_file():
                package.write(asset, asset.relative_to(blend.parent))
        info = zipfile.ZipInfo('IMPORT-NOTES.txt', (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        package.writestr(info, 'Extract this package before opening the Blender scene.\nThis is the source visual asset. External references and simulation readiness have not been independently validated in Hybrid Workforce.\n')
    return write_asset(buffer.getvalue(), category, record_id, 'blenderPackage', '.zip')

class ImageResolver:
    def __init__(self, path): self.path = path
    def file_response(self, base, relative): return Path(base) / relative
    def json_response(self, *args): return None

categories = {'pallet-crane':'Pallet AS/RS · stacker cranes','pallet-shuttle':'Pallet AS/RS · four-way shuttles','classic':'Pallet AS/RS · classic channel','bin-shuttle':'Bin / tote shuttle AS/RS','miniload':'Miniload crane AS/RS','cube':'Cube storage / AutoStore','acr':'Case-handling ACR','climbing':'Rack-climbing tote systems','shelf':'Mobile rack / shelf-to-person','vertical':'Vertical lift / buffer / carousel','picking':'Collaborative picking AMRs','sortation':'Sortation','sensors':'Scanning / vision / inventory / safety','support':'Warehouse / loads / auxiliary assets'}
# These are navigation hints for standalone scenes. Product links use the source registry.
scene_process = {'pallet-crane':['PROC-STORAGE'],'pallet-shuttle':['PROC-STORAGE'],'classic':['PROC-STORAGE'],'bin-shuttle':['PROC-STORAGE','PROC-PICKING'],'miniload':['PROC-STORAGE','PROC-PICKING'],'cube':['PROC-STORAGE','PROC-PICKING'],'acr':['PROC-STORAGE','PROC-PICKING'],'climbing':['PROC-STORAGE','PROC-PICKING'],'shelf':['PROC-STORAGE','PROC-PICKING'],'vertical':['PROC-STORAGE','PROC-PICKING'],'picking':['PROC-PICKING'],'sortation':['PROC-SORTING'],'sensors':['PROC-INSPECTION','PROC-INVENTORY-CONTROL']}
records = []
for entry in module.entries.values():
    ident = entry['id']
    previous = previous_records.get(ident, {})
    product_id = ident.removeprefix('catalog-').upper() if ident.startswith('catalog-') else None
    product = products.get(product_id)
    tech = tech_by_id.get(product['technology_id']) if product else None
    links = list(tech.get('processApplicability', [])) if tech else []
    if tech and not any(x['processId']==tech['processId'] for x in links):
        links.insert(0, dict(processId=tech['processId'], role='primary', provenance='source_technology_primary'))
    if not tech:
        links = [dict(processId=p, role='candidate', provenance='category_navigation_hint') for p in scene_process.get(entry['category'], [])]
    category = previous.get('category') or (tech['name'] if tech else categories.get(entry['category'], entry['category']))
    directory = module.target_for(entry)
    model = copy_asset(directory / entry['sample'].get('asset','equipment.glb'), category, ident, 'model') if module.is_ready(entry) else None
    current_model = bool(model)
    if not model: model = previous.get('model')
    thumbnail = None
    if entry.get('thumbnail'):
        image_path = module.Handler.do_GET(ImageResolver('/images/' + entry['thumbnail'] + '-overview.png'))
        if image_path: thumbnail = copy_asset(image_path, category, ident, 'thumbnail')
    if not current_model and previous.get('model'):
        thumbnail = previous.get('thumbnail')
    if not thumbnail:
        image_path = next((directory / name for name in ('overview.png','pass-04.png','pass-01.png') if (directory / name).is_file()), None)
        if image_path: thumbnail = copy_asset(image_path, category, ident, 'thumbnail')
    # Preserve Blender source and its local texture directory. USD packages retain their source packaging.
    blends = sorted(directory.glob('*.blend'))
    blend = next((p for name in ('refined.blend','equipment.blend') for p in blends if p.name==name), None)
    if blend is None: blend = next((p for p in blends if 'before' not in p.name), None)
    usd = module.usd_packages.get(ident)
    blender_path = copy_asset(blend, category, ident, 'blender') if blend else None
    if blend and blender_path:
        # Keep local texture paths relative to the Blender scene.
        texture_dir = blend.parent / 'textures'
        for texture in sorted(texture_dir.rglob('*')):
            if texture.is_file():
                dest = ROOT / blender_path
                dest = dest.parent / 'textures' / texture.relative_to(texture_dir)
                dest.parent.mkdir(parents=True, exist_ok=True)
                if dest.exists() and dest.read_bytes() != texture.read_bytes():
                    raise ValueError(f'Conflicting texture: {dest}')
                if not dest.exists(): shutil.copy2(texture, dest)
    records.append(dict(id=ident, productId=product_id, technologyId=tech['id'] if tech else None,
        name=entry['name'], vendor=entry['vendor'], kind=module.section_for(entry),
        category=category,
        designation=entry['classification'] if current_model or not previous.get('model') else previous.get('designation', entry['classification']),
        description=entry['description'] if current_model or not previous.get('model') else previous.get('description', entry['description']),
        publicationState=product['publication_state'] if product else 'visual_sample',
        processes=links, model=model, thumbnail=thumbnail, blender=blender_path or previous.get('blender'), blenderPackage=(previous.get('blenderPackage') if blender_path and blender_path == previous.get('blender') and previous.get('blenderPackage') else blender_package(blend, category, ident) or previous.get('blenderPackage')),
        usd=(copy_asset(usd[0]/usd[1], category, ident, 'usd') if usd else None) or previous.get('usd'), isaacValidated=False,
        modelState='Visual asset available' if model else 'Model file not available',
        reviewStatus='Requires confirmation', sourceCommit=product['source_commit'] if product else None))
# Preserve records no longer present in the live browser snapshot.
current_ids = {r['id'] for r in records}
records.extend(r for ident, r in previous_records.items() if ident not in current_ids)
# Include all catalogue products, even when the browser has no entry.
known = {r['productId'] for r in records}
for ident,p in products.items():
    if ident in known: continue
    t=tech_by_id.get(p['technology_id'],{})
    records.append(dict(id='catalog-'+ident.lower(), productId=ident, technologyId=p['technology_id'],name=p['name'],vendor=json.loads(p['payload_json']).get('vendor','Unknown'),kind='products',category=t.get('name','Unclassified'),designation='No browser entry',description='',publicationState=p['publication_state'],processes=t.get('processApplicability',[]),model=None,thumbnail=None,blender=None,usd=None,isaacValidated=False,modelState='Model file not available',reviewStatus='Requires confirmation',sourceCommit=p['source_commit']))
snapshot=json.loads((source/'backend/data/automation_catalog_snapshot.json').read_text())
manifest=dict(importedAt=datetime.now(timezone.utc).isoformat(),source='Auto-Library current database and model browser',sourcePath=str(source),catalogueSource=module.catalogue_source,processes=processes,technologies=technologies,processTaxonomy=snapshot['legacyProcesses'],records=records)
(destination/'catalogue.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(ROOT/'src-v2/auto-library-data.js').write_text('export const AUTO_LIBRARY = '+json.dumps(manifest,ensure_ascii=False)+';\n')
three=source/'frontend/node_modules/three'
for relative in ('build/three.module.js','build/three.core.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/controls/OrbitControls.js','examples/jsm/utils/BufferGeometryUtils.js'):
    target=destination/'three'/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(three/relative,target)
shutil.copy2(three/'LICENSE',destination/'three/LICENSE')
print(json.dumps(dict(products=len(products),technologies=len(technologies),records=len(records),models=sum(bool(r['model']) for r in records),blender=sum(bool(r['blender']) for r in records),usd=sum(bool(r['usd']) for r in records),files=len(set(copied.values())))))
