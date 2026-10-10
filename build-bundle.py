from pathlib import Path
root = Path(__file__).resolve().parent
modules = [
    "src-modules/data.js",
    "src-modules/engine.js",
    "src-modules/simulation3d.js",
    "src-modules/assistant.js",
    "src-modules/app.js",
]
compat = '''/*\n DP World Hybrid Workforce Platform - Browser-compatible bundle\n Local/offline execution: removes ES-module imports and avoids fetch/server dependencies.\n*/\n(function installLocalCompatibility(){\n  if (typeof window !== "undefined" && typeof window.structuredClone !== "function") {\n    window.structuredClone = function structuredClonePolyfill(value) { return JSON.parse(JSON.stringify(value)); };\n  }\n  if (typeof window !== "undefined" && typeof window.ResizeObserver !== "function") {\n    window.ResizeObserver = class ResizeObserverFallback {\n      constructor(callback) { this.callback = callback; this.items = []; this._timer = null; }\n      observe(target) {\n        this.items.push(target);\n        if (!this._timer) this._timer = window.setInterval(() => this.callback(this.items.map(target => ({ target }))), 500);\n      }\n      unobserve(target) { this.items = this.items.filter(item => item !== target); }\n      disconnect() { if (this._timer) window.clearInterval(this._timer); this._timer = null; this.items = []; }\n    };\n  }\n})();\n\n'''

def strip_import_export(text):
    lines = text.splitlines()
    out = []
    skipping = False
    for line in lines:
        stripped = line.strip()
        if not skipping and stripped.startswith("import "):
            if ";" not in stripped:
                skipping = True
            continue
        if skipping:
            if ";" in stripped:
                skipping = False
            continue
        out.append(line)
    text = "\n".join(out)
    text = text.replace("export const ", "const ")
    text = text.replace("export let ", "let ")
    text = text.replace("export var ", "var ")
    text = text.replace("export function ", "function ")
    text = text.replace("export class ", "class ")
    return text

bundle = [compat]
for module in modules:
    path = root / module
    bundle.append(f"\n/* ===== {module} ===== */\n")
    bundle.append(strip_import_export(path.read_text(encoding="utf-8")))
    bundle.append("\n")
(root / "js" / "app.bundle.js").write_text("".join(bundle), encoding="utf-8")
print("Wrote js/app.bundle.js")
