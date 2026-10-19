"""Extract every localized text in /data that lacks Arabic or Hebrew into translation chunks.
Usage: python3 -I i18n_extract.py <project> <out_dir> [max_chars_per_chunk]
Each chunk is a JSON list of {"k": "<file>#<json-pointer>", "en": "...", "need": ["ar","he"]}.
"""
import glob, json, os, sys

PROJ, OUT = sys.argv[1], sys.argv[2]
MAX = int(sys.argv[3]) if len(sys.argv) > 3 else 14000
# Optional 4th argument: comma-separated field names to skip (e.g. "notes"), or "only:notes" to take only those.
FIELDS = sys.argv[4] if len(sys.argv) > 4 else ''
SKIP = set(FIELDS.split(',')) if FIELDS and not FIELDS.startswith('only:') else set()
ONLY = set(FIELDS[5:].split(',')) if FIELDS.startswith('only:') else set()
DATA = os.path.join(PROJ, 'data')
LOCKEYS = {'en', 'ar', 'he', 'translation_status'}

# Fields that are names/labels taken from sources in their own language are not translated here.
SKIP_PATHS = ('/names/',)   # place names: display forms come from sources

def files():
    out = sorted(glob.glob(os.path.join(DATA, '*.json')))
    out += sorted(glob.glob(os.path.join(DATA, 'stories', '*.json')))
    out += sorted(glob.glob(os.path.join(DATA, 'territories', '*.geojson')))
    out += sorted(glob.glob(os.path.join(DATA, 'culture-zones', '*.geojson')))
    out += sorted(glob.glob(os.path.join(DATA, 'modern', '*.json')))
    return [f for f in out if not f.endswith(('sources.json', 'palette.json'))]

items = []
def walk(o, ptr, rel):
    if isinstance(o, dict):
        if isinstance(o.get('en'), str) and set(o) <= LOCKEYS:
            need = [l for l in ('ar', 'he') if not o.get(l)]
            field = [x for x in ptr.split('/') if x and not x.isdigit()][-1]
            if (SKIP and field in SKIP) or (ONLY and field not in ONLY): return
            if need and not any(s in ptr + '/' for s in SKIP_PATHS):
                items.append({'k': f'{rel}#{ptr}', 'en': o['en'], 'need': need})
            return
        for k, v in o.items():
            walk(v, f'{ptr}/{k}', rel)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            walk(v, f'{ptr}/{i}', rel)

for f in files():
    rel = os.path.relpath(f, DATA)
    walk(json.load(open(f)), '', rel)

os.makedirs(OUT, exist_ok=True)
for old in glob.glob(os.path.join(OUT, 'chunk-*.json')):
    if '.out.' not in old: os.remove(old)
chunks, cur, size = [], [], 0
for it in items:
    if cur and size + len(it['en']) > MAX:
        chunks.append(cur); cur, size = [], 0
    cur.append(it); size += len(it['en'])
if cur: chunks.append(cur)
for i, c in enumerate(chunks, 1):
    with open(os.path.join(OUT, f'chunk-{i:02}.json'), 'w') as fh:
        json.dump(c, fh, ensure_ascii=False, indent=1)
print(f'{len(items)} texts, {sum(len(i["en"]) for i in items)} chars, {len(chunks)} chunks')
