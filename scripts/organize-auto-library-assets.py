"""Move the existing snapshot into the documented layout without re-importing sources."""
import json
from pathlib import Path
import shutil
import zipfile
from asset_layout import asset_path

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'assets/auto-library/catalogue.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
legacy_dir = ROOT / 'assets/auto-library/files'
used = set()
for record in manifest['records']:
    for role in ('model', 'thumbnail', 'blender', 'blenderPackage', 'usd'):
        original = record.get(role)
        if not original:
            continue
        source = ROOT / original
        if not source.is_file():
            raise FileNotFoundError(source)
        data = source.read_bytes()
        relative = asset_path(record['category'], record['id'], role, data, source.suffix)
        target = ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and target.read_bytes() != data:
            raise ValueError(f'Asset hash collision: {relative}')
        if not target.exists():
            shutil.copy2(source, target)
        record[role] = relative.as_posix()
        if source.parent == legacy_dir:
            used.add(source)
# Restore package-local textures beside each copied source scene.
for record in manifest['records']:
    if not record.get('blender') or not record.get('blenderPackage'):
        continue
    scene_dir = (ROOT / record['blender']).parent
    with zipfile.ZipFile(ROOT / record['blenderPackage']) as package:
        for name in package.namelist():
            parts = Path(name).parts
            if not parts or parts[0] != 'textures' or '..' in parts or name.endswith('/'):
                continue
            target = scene_dir.joinpath(*parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            data = package.read(name)
            if target.exists() and target.read_bytes() != data:
                raise ValueError(f'Conflicting texture: {target}')
            if not target.exists(): target.write_bytes(data)
# Preserve older files whose current catalogue ownership is not known.
if legacy_dir.is_dir():
    unassigned = ROOT / 'assets/auto-library/99-unassigned'
    for old in legacy_dir.iterdir():
        if old.is_file() and old not in used:
            unassigned.mkdir(exist_ok=True)
            shutil.copy2(old, unassigned / ('unassigned-' + old.name))
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(ROOT / 'src-v2/auto-library-data.js').write_text('export const AUTO_LIBRARY = '+json.dumps(manifest, ensure_ascii=False)+';\n', encoding='utf-8')
# Only remove the obsolete folder after every referenced file is copied.
if legacy_dir.is_dir():
    shutil.rmtree(legacy_dir)
print(f"Organized {len(manifest['records'])} catalogue records. Preserved unassigned files.")
