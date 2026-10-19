"""Merge machine-drafted translations back into /data.
Usage: python3 -I i18n_merge.py <project> <dir with chunk-NN.out.json files>
Each out file is a JSON list of {"k": "<file>#<json-pointer>", "ar": "...", "he": "..."}.
Only fills languages that are missing; never overwrites existing text. Marks each as machine-draft.
Checks that [n] citation markers are carried over unchanged.
"""
import glob, json, os, re, sys

PROJ, IN = sys.argv[1], sys.argv[2]
# --refresh: also replace existing text that is still a machine draft (never reviewed or original text).
REFRESH = '--refresh' in sys.argv[3:]
DATA = os.path.join(PROJ, 'data')
markers = lambda s: sorted(re.findall(r'\[\d+\]', s or ''))

by_file = {}
for f in sorted(glob.glob(os.path.join(IN, 'chunk-*.out.json'))):
    for it in json.load(open(f)):
        rel, ptr = it['k'].split('#', 1)
        by_file.setdefault(rel, []).append((ptr, it))

done = skipped = bad = 0
for rel, entries in by_file.items():
    path = os.path.join(DATA, rel)
    doc = json.load(open(path))
    for ptr, it in entries:
        node = doc
        try:
            for part in ptr.split('/')[1:]:
                node = node[int(part)] if isinstance(node, list) else node[part]
        except (KeyError, IndexError, ValueError):
            skipped += 1; continue
        if not isinstance(node, dict) or 'en' not in node:
            skipped += 1; continue
        st = dict(node.get('translation_status') or {})
        for lang in ('ar', 'he'):
            tx = (it.get(lang) or '').strip()
            if not tx: continue
            if node.get(lang) and not (REFRESH and st.get(lang) == 'machine-draft' and node[lang] != tx): continue
            if markers(tx) != markers(node['en']):
                bad += 1; print(f'  marker mismatch, not merged: {rel}#{ptr} [{lang}]'); continue
            node[lang] = tx; st[lang] = 'machine-draft'; done += 1
        if st: node['translation_status'] = st
        # keep key order en, ar, he, translation_status
        ordered = {k: node[k] for k in ('en', 'ar', 'he', 'translation_status') if k in node}
        node.clear(); node.update(ordered)
    with open(path, 'w') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2); fh.write('\n')
print(f'merged {done} translations; {skipped} keys not found; {bad} rejected for citation-marker mismatch')
