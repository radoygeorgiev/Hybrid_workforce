# 3D asset project harness

This is the working standard for 3D assets in Hybrid Workforce. It applies to imported and new Blender scenes, Isaac Sim assets, USD files, and browser previews. Follow `AGENTS.md` and this document when you add, update, review, or move these files.

## Record and folder layout

Keep one authoritative catalogue record for each product, component, or system. Use its stable source ID. Do not use a changing sort order or list position as the ID. Keep a record even when the asset is missing.

The current Auto Library snapshot uses this layout:

```text
assets/auto-library/
  catalogue.json                         # record IDs, process links, asset paths, and status
  catalogue-assets/
    <technology-category>/
      <source-record-id>/
        01-blender/
          <record-id>--scene--<hash>.blend
          <record-id>--scene-package--<hash>.zip
          textures/                     # source-relative texture names when available
        02-isaac-sim/
          <record-id>--usd-package--<hash>.zip
        03-preview/
          <record-id>--model--<hash>.glb
          <record-id>--thumbnail--<hash>.png
  99-unassigned/                        # retained files with unknown current ownership
```

The number identifies the file role. It is not a revision number or completion score. Use lower-case, hyphenated folder names. Keep source IDs in the catalogue and in the path. The hash is the first 16 hexadecimal characters of SHA-256; it distinguishes file contents. Never invent a model version or revision from this hash. Retain the source file name and relative paths inside a package. Preserve source-relative Blender texture paths beside the scene where available.

Put a record in one category folder. Store multiple applicable processes as links in the catalogue. Do not copy assets into process folders to imply independent assets or confirmed suitability. Keep unknown applicability unassigned. Mark category-derived links as candidates.

For new authored work, use the same category and stable record ID. Use `01-blender` for editable source scenes, their dependencies, and source packages. Use `02-isaac-sim` for USD scenes, packages, and their dependencies. Use `03-preview` for GLB files and images. Use descriptive role names and explicit version numbers only when a source version is known. Keep parts and assemblies in named subfolders when they are authored as separate files. Preserve relative dependency paths. Record their parent assembly, source, and version in the catalogue or an adjacent manifest. If the owner or category is unknown, retain the file under `99-unassigned` and record the gap. Do not guess the owner.

## Import and review

- Use `python scripts/import-auto-library.py --source /path/to/Auto-Library` to refresh the snapshot. The importer writes the folder layout and catalogue paths. Rebuild with `python build-bundle.py` and `python build-standalone.py`.
- Keep source identity, vendor, category, process relationships, source date or commit, and asset role. Do not overwrite user-reviewed case or configuration data.
- Keep the original source and any linked textures or materials together. Preserve USD package structure. Record missing or external dependencies. Never rename or edit files inside a source package merely to fit this layout.
- Label generic geometry, illustrations, samples, supplier claims, unknown values, simulations, and measured results accurately. Imported review records require confirmation. A preview or exported USD alone does not establish correct physics, controls, certification, hardware deployment, or Isaac Sim validation.
- A Blender package may still contain external references. Check those references before claiming that the scene is portable. Test a USD in the target Isaac Sim version before recording an Isaac Sim validation result. Record the test version, date, scope, and result.
- Do not delete or replace an earlier source asset without preserving it in Git history or in a clearly named version. Do not delete unassigned assets to make the structure look complete. Update every catalogue reference when a file moves.

## Checks before delivery

1. Check the branch and preserve unrelated edits.
2. Verify that each asset path matches its record ID, category, and role. Verify that referenced files exist and that hashes match their contents.
3. Check representative Blender and USD packages for their expected contents and dependencies. Record anything that is missing or unverified.
4. Check the gallery, filters, thumbnail, and interactive GLB preview for a representative record. Check that unavailable assets remain labelled as unavailable.
5. Run both build scripts, `node --test tests/*.test.js`, and `python -m unittest discover -s tests -p "test_*.py"`. Record failures and limits.
