"""Prepare an explicit allowlist, never copy the workspace or its .git."""
import json
import shutil
from pathlib import Path
from build import ROOT, PUBLIC_FILES, build

build()
target = ROOT / '.deployment' / 'pages' / 'ration-gina-usya'
target.mkdir(parents=True, exist_ok=True)
expected = set(PUBLIC_FILES)
for existing in target.rglob('*'):
    if existing.is_file() and '.git' not in existing.relative_to(target).parts:
        if existing.relative_to(target).as_posix() not in expected:
            raise SystemExit('Unexpected file in publication folder: ' + str(existing))
for name in PUBLIC_FILES:
    dest = target / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, dest)
(ROOT / '.deployment' / 'pages-files.json').write_text(json.dumps(PUBLIC_FILES, ensure_ascii=False, indent=2), 'utf-8')
print('Prepared ' + str(len(PUBLIC_FILES)) + ' files at ' + str(target))
