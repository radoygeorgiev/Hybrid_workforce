"""Stable paths for catalogue assets. Keep source IDs, not list positions."""
from pathlib import Path
import hashlib
import re
import unicodedata

ASSET_ROOT = Path('assets/auto-library')
ROLE_FOLDERS = {
    'blender': '01-blender',
    'blenderPackage': '01-blender',
    'usd': '02-isaac-sim',
    'model': '03-preview',
    'thumbnail': '03-preview',
}
ROLE_NAMES = {
    'blender': 'scene', 'blenderPackage': 'scene-package', 'usd': 'usd-package',
    'model': 'model', 'thumbnail': 'thumbnail',
}

def slug(value):
    text = unicodedata.normalize('NFKD', str(value)).encode('ascii', 'ignore').decode().lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text[:80].rstrip('-') or 'unclassified'

def asset_path(category, record_id, role, content, suffix):
    """Use a source ID for identity and a content hash to distinguish variants."""
    digest = hashlib.sha256(content).hexdigest()[:16]
    name = f'{slug(record_id)}--{ROLE_NAMES[role]}--{digest}{suffix.lower()}'
    return ASSET_ROOT / 'catalogue-assets' / slug(category) / slug(record_id) / ROLE_FOLDERS[role] / name
