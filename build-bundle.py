"""Build the local application without a package download."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parent
source = root / "src-v2"
questions = json.loads((root / "docs/v2-design/design-data.json").read_text(encoding="utf-8"))["questions"]
(source / "questions.js").write_text("export const QUESTION_REGISTER = " + json.dumps(questions, ensure_ascii=False) + ";\n", encoding="utf-8")
modules = ["data.js", "engine.js", "store.js", "imports.js", "views.js", "questions.js", "app.js"]
parts = ['/* Hybrid Workforce version 2. Local planning prototype. */\n(function(){\n"use strict";\n']
for name in modules:
    content = (source / name).read_text(encoding="utf-8")
    content = re.sub(r"^import .*?;\s*$", "", content, flags=re.MULTILINE)
    content = re.sub(r"\bexport (?=(?:const|let|function|class)\b)", "", content)
    parts.extend(["\n/* " + name + " */\n", content, "\n"])
parts.append("})();\n")
(root / "js/app.bundle.js").write_text("".join(parts), encoding="utf-8")
print("Built js/app.bundle.js from src-v2.")
