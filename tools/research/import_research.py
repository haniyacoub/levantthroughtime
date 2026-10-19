"""One-time importer: research JSON (scratchpad) -> project data files.
Usage: python3 -I import_research.py <research_dir> <project_data_dir>
Re-runnable: rebuilds sources/areas/groups/population/polities/cultures/territories from whatever research files exist.
"""
import json, os, re, sys, glob

RES, DATA = sys.argv[1], sys.argv[2]
# Files from agents that have finished (others may be half-written).
DONE = set(os.environ.get('DONE', '').split(',')) if os.environ.get('DONE') else None
TODAY = '2026-10-18'

def load(name):
    if DONE is not None and name not in DONE: return None
    p = os.path.join(RES, name)
    return json.load(open(p)) if os.path.exists(p) else None

RANGE_KEYS = {'low', 'high'}
def clean(o):
    if isinstance(o, dict):
        is_range = RANGE_KEYS <= set(o)
        return {k: clean(v) for k, v in o.items() if v not in ('', [], {}) and (v is not None or (is_range and k in RANGE_KEYS) or k == 'total')}
    if isinstance(o, list):
        return [clean(v) for v in o]
    return o

def loc(v):
    """Localized text. Arabic/Hebrew from research (e.g. Wikidata labels) is unreviewed, so it is marked machine-draft."""
    if v is None or v == '': return None
    if not isinstance(v, dict): return {'en': v}
    v = dict(v)
    st = dict(v.get('translation_status') or {})
    for lang in ('ar', 'he'):
        if v.get(lang) and lang not in st: st[lang] = 'machine-draft'
    if st: v['translation_status'] = st
    return v

THIRD_PARTY = re.compile(r'yplus\.ps|teyit\.org|vdoc\.pub|kupdf|homepages\.uc\.edu')
SOURCE_FIXES = {
    'mccarthy-1990': {'url': 'https://catalogue.bnf.fr/ark:/12148/cb35507823g', 'isbn': '0-231-07110-8'},
    'scholch-1993': {'url': 'https://openlibrary.org/works/OL8603545W'},
    'karpat-1978': {'doi': '10.1017/S0020743800000088', 'url': 'https://doi.org/10.1017/S0020743800000088'},
}
VERIFY_LEVEL_RANK = {'full-text': 3, 'excerpt': 2, 'cited-via': 1, 'catalogue-only': 0}
KINDS = {'academic', 'government', 'un', 'ngo', 'press', 'reference', 'religious-institution'}
TYPES = {'book', 'article', 'chapter', 'web', 'dataset', 'document', 'map', 'census', 'report', 'thesis'}

def conv_source(s):
    s = dict(s)
    v = s.get('verification') or {}
    note = v.get('note') or ''
    url = s.get('url') or ''
    if THIRD_PARTY.search(url):
        note += ' Read in a third-party copy of uncertain licensing status, which this project does not link; page references should be confirmed against a library copy.'
        s['url'] = ''
    s.update(SOURCE_FIXES.get(s['id'], {}))
    m = re.search(r'ISBN[:\s]*([0-9Xx-]{10,17})', note)
    if m and not s.get('isbn'): s['isbn'] = m.group(1)
    s['verification'] = {'level': v.get('level', 'catalogue-only'), 'checked_on': s.pop('accessed', None) or TODAY, 'note': note.strip()}
    if s.get('accessed') is None: s['accessed'] = s['verification']['checked_on']
    if s.get('kind') not in KINDS: s['kind'] = 'reference'
    if s.get('type') not in TYPES: s['type'] = 'document'
    if s.get('institution_country') and not re.fullmatch(r'[A-Z]{2}', s['institution_country']): s.pop('institution_country')
    for k in ('volume', 'issue', 'year'):
        if isinstance(s.get(k), str) and s[k].isdigit(): s[k] = int(s[k])
    if isinstance(s.get('pages'), int): s['pages'] = str(s['pages'])
    if s.get('url') and not re.match(r'https?://', s['url']): s['url'] = ''
    return clean(s)

sources = {}
def add_sources(lst):
    for s in lst or []:
        if s['id'] in SOURCE_ALIAS: continue
        c = conv_source(s)
        old = sources.get(c['id'])
        if not old or VERIFY_LEVEL_RANK[c['verification']['level']] > VERIFY_LEVEL_RANK[old['verification']['level']]:
            sources[c['id']] = c

SOURCE_ALIAS = {'bachi-1977-population-of-israel': 'bachi-1977', 'hirschberg-1971-ej-land-of-israel': 'hirschberg-1971', 'landes-1976-palestine-before-zionists': 'landes-1976'}
DUPLICATE_RECORDS = {'bachi-1977-c1800', 'hirschberg-1971-early-19th-century', 'landes-1976-early-19th-century'}
AREA_SERIES = {'western-palestine': 'core', 'mandate-palestine': 'core', 'ottoman-four-sanjaqs': 'core', 'ottoman-jerusalem-nablus-acre': 'core'}

def conv_refs(refs):
    out = []
    for r in refs or []:
        r = clean(dict(r))
        for k in ('ref', 'via'):
            if k in r: r[k] = SOURCE_ALIAS.get(r[k], r[k])
        if 'quote' in r and len(r['quote']) > 400: r['quote'] = r['quote'][:400] + '…'
        out.append(r)
    return out

# ---------------------------------------------------------------- population
areas, groups, population = {}, {}, []
GROUP_NAMES = {
    ('religion', 'muslims'): 'Muslims', ('religion', 'christians'): 'Christians', ('religion', 'jews'): 'Jews',
    ('religion', 'druze'): 'Druze', ('religion', 'samaritans'): 'Samaritans', ('religion', 'bahais'): 'Bahá’ís',
    ('religion', 'others'): 'Others', ('religion', 'no-religion'): 'No religion',
    ('religion', 'not-classified-by-religion'): 'Not classified by religion', ('religion', 'others-and-unknown'): 'Others and unknown',
    ('ethnicity', 'arabs'): 'Arabs', ('ethnicity', 'jews'): 'Jews', ('ethnicity', 'others'): 'Others',
    ('ethnicity', 'arabs-and-others'): 'Arabs and others',
    ('population-group', 'jews'): 'Jews', ('population-group', 'arabs'): 'Arabs', ('population-group', 'others'): 'Others',
    ('population-group', 'jews-and-others'): 'Jews and others', ('population-group', 'foreigners'): 'Foreigners',
    ('ethnicity', 'israelites'): 'Israelites', ('ethnicity', 'franks'): 'Franks (Latin Europeans)',
}
for fname in ('population-early.json', 'population-modern.json'):
    d = load(fname)
    if not d: continue
    add_sources(d.get('sources'))
    for a in d.get('areas', []):
        areas.setdefault(a['id'], clean({'id': a['id'], 'name': loc(a['name']), 'definition': loc(a.get('definition') or a['name']), 'series': AREA_SERIES.get(a['id']), 'sources': conv_refs(a.get('sources'))}))
    for p in d['population']:
        if p['id'] in DUPLICATE_RECORDS: continue
        q = dict(p)
        if q.get('total') and all(v is None for v in q['total'].values()): q['total'] = None
        if q.get('total') and q['total'].get('best') is None: q['total'].pop('best', None)
        q['notes'] = loc(q.get('notes'))
        comps = []
        for c in q.get('composition') or []:
            c = dict(c)
            label = c.pop('axis_label', None)
            if c['axis'] == 'ethnicity' and label and 'CBS' in label: c['axis'] = 'population-group'
            if label: c['label'] = label
            for g in c['groups']:
                if 'share' in g and 'share_pct' not in g: g['share_pct'] = g.pop('share')
                lbl = g.pop('source_label', None)
                if lbl: g['notes'] = ((g.get('notes') or '') + f' Source’s label: “{lbl}”.').strip()
                for k in ('count', 'share_pct'):
                    if k not in g: continue
                    r = g[k]
                    if r.get('low') is None and r.get('high') is None and r.get('best') is not None:
                        r['low'] = r['high'] = r['best']  # a single published figure
                    if r.get('best') is None: r.pop('best', None)
                if 'count' in g and 'share_pct' in g:
                    pct = g.pop('share_pct')
                    lo, hi = pct.get('low'), pct.get('high')
                    shown = f'{lo}–{hi}' if lo is not None and hi is not None and lo != hi else str(pct.get('best', lo if lo is not None else hi))
                    g['notes'] = ((g.get('notes') or '') + f" The source also gives this as {shown}%.").strip()
                groups[(c['axis'], g['group'])] = True
            # A group with no figure (e.g. "the majority") becomes part of the record's notes.
            for g in [g for g in c['groups'] if 'count' not in g and 'share_pct' not in g]:
                c['groups'].remove(g)
                extra = f"{g['group'].capitalize()}: {g.get('notes', 'no figure given')}"
                q['notes'] = loc(q.get('notes')) or {'en': ''}
                q['notes']['en'] = (q['notes']['en'] + ' ' + extra).strip()
            if q.get('total') is None: c['partial'] = True
            comps.append(c)
        if comps: q['composition'] = comps
        else: q.pop('composition', None)
        q['sources'] = conv_refs(q.get('sources'))
        population.append(clean(q))

def write(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')

if population:
    write(os.path.join(DATA, 'areas.json'), {'$schema': '../schema/areas.schema.json', 'areas': list(areas.values())})
    write(os.path.join(DATA, 'groups.json'), {'$schema': '../schema/groups.schema.json', 'groups': [
        {'id': gid, 'axis': ax, 'name': {'en': GROUP_NAMES.get((ax, gid), gid.replace('-', ' ').capitalize())}} for (ax, gid) in sorted(groups)]})
    population.sort(key=lambda p: (p['date']['year'] if p['date']['year'] > 0 else p['date']['year'] + 1, p['date'].get('month', 0), p['area']))
    write(os.path.join(DATA, 'population.json'), {'$schema': '../schema/population.schema.json', 'population': population})

# ---------------------------------------------------------------- polities, cultures, territories
polities, cultures, territories, zones = {}, {}, {}, {}
for fname in ('polities-early.json', 'polities-middle.json', 'polities-late.json', 'polities-modern.json'):
    d = load(fname)
    if not d: continue
    add_sources(d.get('sources'))
    for p in d.get('polities', []):
        q = dict(p)
        q['name'] = loc(q.get('name'))
        q['notes'] = loc(q.get('notes'))
        q['sources'] = conv_refs(q.get('sources'))
        rels = []
        for r in q.get('relations') or []:
            r = dict(r); r['notes'] = loc(r.get('notes')); r['sources'] = conv_refs(r.get('sources')); rels.append(clean(r))
        if rels: q['relations'] = rels
        q = clean(q)
        if q['id'] in polities:
            a = polities[q['id']]
            def tkey(d): return d['year'] + (d.get('month', 0) or 0) / 13
            if tkey(q['start']) < tkey(a['start']): a['start'] = q['start']
            if 'end' not in q or 'end' not in a: a.pop('end', None)
            elif tkey(q['end']) > tkey(a['end']): a['end'] = q['end']
            seen = {(r['ref'], r.get('locator')) for r in a['sources']}
            a['sources'] += [r for r in q['sources'] if (r['ref'], r.get('locator')) not in seen]
            a['relations'] = a.get('relations', []) + q.get('relations', [])
            if q.get('notes'):
                a['notes'] = a.get('notes') or {'en': ''}
                a['notes']['en'] = (a['notes']['en'] + ' ' + q['notes']['en']).strip()
            for k in ('name', 'wikidata'):
                if k not in a and k in q: a[k] = q[k]
            if q.get('confidence') == 'contested': a['confidence'] = 'contested'
            print('merged duplicate polity', q['id'], 'from', fname)
        else:
            polities[q['id']] = q
    for c in d.get('cultures', []):
        q = dict(c); q['name'] = loc(q.get('name')); q['notes'] = loc(q.get('notes')); q['sources'] = conv_refs(q.get('sources'))
        cultures[q['id']] = clean(q)
    for key, store, owner in (('territories', territories, 'polity'), ('culture_zones', zones, 'culture')):
        for i, t in enumerate(d.get(key, [])):
            props = dict(t)
            props['id'] = props.get('id') or f"{props[owner]}-{len(store.get(props[owner], [])) + 1}"
            existing = {f['properties']['id'] for f in store.get(props[owner], [])}
            n = len(existing) + 1
            while props['id'] in existing:
                props['id'] = f"{props[owner]}-{n}"; n += 1
            props['description'] = loc(props.get('description'))
            props['notes'] = loc(props.get('notes'))
            props['sources'] = conv_refs(props.get('sources'))
            props.setdefault('geometry_method', 'units')
            store.setdefault(props[owner], []).append({'type': 'Feature', 'geometry': None, 'properties': clean(props)})

if polities:
    write(os.path.join(DATA, 'polities.json'), {'$schema': '../schema/polities.schema.json', 'polities': list(polities.values())})
    for owner, feats in territories.items():
        write(os.path.join(DATA, 'territories', f'{owner}.geojson'), {'$schema': '../../schema/territory.schema.json', 'type': 'FeatureCollection', 'features': feats})
if cultures:
    write(os.path.join(DATA, 'cultures.json'), {'$schema': '../schema/cultures.schema.json', 'cultures': list(cultures.values())})
    for owner, feats in zones.items():
        write(os.path.join(DATA, 'culture-zones', f'{owner}.geojson'), {'$schema': '../../schema/culture-zone.schema.json', 'type': 'FeatureCollection', 'features': feats})

write(os.path.join(DATA, 'sources.json'), {'$schema': '../schema/sources.schema.json', 'sources': sorted(sources.values(), key=lambda s: s['id'])})
print(f'sources {len(sources)}, areas {len(areas)}, groups {len(groups)}, population {len(population)}, polities {len(polities)}, cultures {len(cultures)}, territory files {len(territories)}, zone files {len(zones)}')

# ---------------------------------------------------------------- post-import fixes (reviewed by hand)
POP_EXTRA_REFS = {
    'ottoman-palestine-1850-mccarthy': ('scholch-1993', 'Table 15, p. 40; p. 42', 'Alternative estimate for 1850–65: 350,000–360,000 (record ottoman-palestine-1850-1865-scholch).'),
    'ottoman-palestine-1850-1865-scholch': ('mccarthy-1990', 'Table 1.4D, p. 10', 'Alternative estimate for 1850: 340,000 Ottoman citizens (record ottoman-palestine-1850-mccarthy).'),
    'ottoman-palestine-1860-mccarthy': ('scholch-1993', 'Table 15, p. 40; p. 42', 'Alternative estimate for 1850–65: 350,000–360,000.'),
    'ottoman-palestine-1881-mccarthy': ('scholch-1993', 'Table 15, p. 40; p. 42', 'Alternative estimate for c. 1882: about 470,000 (record ottoman-palestine-c1882-scholch).'),
    'ottoman-palestine-c1882-scholch': ('mccarthy-1990', 'Table 1.4D, p. 10', 'Alternative estimate for 1881/82: 462,465 Ottoman citizens (record ottoman-palestine-1881-mccarthy).'),
    'palestine-c1890-bachi': ('mccarthy-1990', 'Table 1.4D, p. 10', 'Alternative estimate for 1890/91: 516,131 Ottoman citizens only (record ottoman-palestine-1890-mccarthy).'),
    'ottoman-palestine-1890-mccarthy': ('bachi-1977', 'Table 4.1, p. 32', 'Alternative estimate for c. 1890: 532,060 (record palestine-c1890-bachi).'),
    'palestine-1914-bachi': ('mccarthy-1990', 'Table 1.4D, p. 10', 'Alternative estimate for 1914: 722,143, McCarthy’s corrected Ottoman-citizen count (record ottoman-palestine-1914-mccarthy).'),
    'ottoman-palestine-1914-mccarthy': ('bachi-1977', 'Table 4.1, p. 32', 'Alternative estimate for 1914: 689,300 (record palestine-1914-bachi).'),
    'ottoman-palestine-1919-fo-scholch': ('bachi-1977', 'section 4.6, p. 36', 'Alternative: the March 1919 British estimate of 648,000 (record palestine-1919-03-british-estimate).'),
    'settlers-wb-pcbs-1972': ('cbs-sai-2025-t2-11', "Table 2.11, row 'Judea and Samaria Area', column 20.5.1972 (census date)", 'Israel’s CBS gives 1,500 for Israeli localities in the area, a figure that excludes East Jerusalem (record il-localities-wb-1972).'),
    'broshi-1979-roman-byzantine-maximum': ('avi-yonah-1947-historical-survey', 'App. 2D, p. 360', 'Alternative estimate for c. 500 CE: 3,250,000 (record avi-yonah-byzantine-c500), which Broshi argues is far too high.', 'bachi-1977'),
    'avi-yonah-byzantine-c500': ('broshi-1979-western-palestine-roman-byzantine', 'p. 7 (Conclusion)', 'Broshi (1979) argues the population never exceeded about 1,000,000 (record broshi-1979-roman-byzantine-maximum).'),
    'bachi-1977-1553-1554': ('lewis-1952-notes-documents-turkish-archives', 'p. 10 (as cited by Bachi, App. 3B, p. 365)', 'Alternative estimate: about 300,000 for the four sanjaks (record lewis-1952-1553-1557).', 'bachi-1977'),
    'settlers-wb-pcbs-2024': ('cbs-sai-2025-t2-11', "Table 2.11, row 'Judea and Samaria Area', column 31.12.2024", 'Israel’s CBS gives 511,100 for Israeli localities in the area, a figure that excludes East Jerusalem (record il-localities-wb-2024).'),
}
# The only published estimate for its period in our data: an estimate, not a dispute between sources.
POP_ESTIMATED = {'bachi-1977-1533-1539', 'bachi-1977-1690-1691', 'benvenisti-1970-crusader-kingdom'}
PARTIAL_NOTE = ' The groups listed are those the source gives separately; the remainder (e.g. “others” or “not classified by religion”) is not shown, so the composition is marked partial.'
if population:
    marked = []
    for p in population:
        extra = POP_EXTRA_REFS.get(p['id'])
        if extra and not any(r['ref'] == extra[0] for r in p['sources']):
            ref = {'ref': extra[0], 'locator': extra[1], 'note': extra[2]}
            if len(extra) > 3: ref['via'] = extra[3]
            p['sources'].append(ref)
        if p['id'] in POP_ESTIMATED and p['confidence'] == 'contested':
            p['confidence'] = 'estimated'
        t = p.get('total')
        for c in p.get('composition', []):
            counts = [g['count'] for g in c['groups'] if 'count' in g]
            if t and counts and not c.get('partial') and t.get('low') is not None and all(x.get('high') is not None for x in counts) and sum(x['high'] for x in counts) < t['low'] * 0.98:
                c['partial'] = True
                marked.append(p['id'])
                p['notes'] = p.get('notes') or {'en': ''}
                if PARTIAL_NOTE.strip() not in p['notes']['en']:
                    p['notes']['en'] = (p['notes']['en'] + PARTIAL_NOTE).strip()
    def fmt(r):
        if not r: return 'unknown'
        lo, hi = r.get('low'), r.get('high')
        if lo is not None and hi is not None: return f'{lo:,}' if lo == hi else f'{lo:,}–{hi:,}'
        return f'at least {lo:,}' if lo is not None else f'at most {hi:,}'
    def ystart(p): return p['date']['year']
    def yend(p): return p['date'].get('latest', p['date']['year'])
    def series_of(area): return AREA_SERIES.get(area, area)
    linked, downgraded = [], []
    for p in population:
        if p['confidence'] != 'contested' or len({r['ref'] for r in p['sources']}) >= 2: continue
        own = {r['ref'] for r in p['sources']}
        span = max(25, abs(ystart(p)) // 20) if ystart(p) < 1500 else 10
        cands = [o for o in population if o is not p and series_of(o['area']) == series_of(p['area'])
                 and o['sources'] and o['sources'][0]['ref'] not in own
                 and ystart(o) <= yend(p) + span and yend(o) >= ystart(p) - span]
        if cands:
            o = min(cands, key=lambda o: abs(ystart(o) - ystart(p)))
            r0 = o['sources'][0]
            ref = {'ref': r0['ref'], 'note': f"Alternative estimate for the same period: {fmt(o.get('total')) if o.get('total') else 'group figures only'} (record {o['id']})."}
            for k in ('locator', 'via'):
                if r0.get(k): ref[k] = r0[k]
            p['sources'].append(ref); linked.append(p['id'])
        else:
            p['confidence'] = 'estimated'; downgraded.append(p['id'])
        # shares that fall short of 100% are partial too
    for p in population:
        for c in p.get('composition', []):
            sh = [g['share_pct'] for g in c['groups'] if 'share_pct' in g]
            if sh and not c.get('partial') and all(x.get('high') is not None for x in sh) and sum(x['high'] for x in sh) < 98:
                c['partial'] = True; marked.append(p['id'])
    print('linked alternatives:', len(linked), '| downgraded to estimated:', downgraded)
    print('marked partial:', sorted(set(marked)))
    write(os.path.join(DATA, 'population.json'), {'$schema': '../schema/population.schema.json', 'population': population})

# Uncertainty inside one account is "estimated"; "contested" is reserved for disagreement between sourced positions.
CONF_TO_ESTIMATED = {
    ('relation', 'jund-filastin', 7), ('relation', 'atsiz-emirate', 0),
    ('territory', 'ptolemaic-kingdom-1', None), ('territory', 'syria-palaestina-3', None),
    ('territory', 'idf-controlled-zone-gaza-2023-1', None),
}
TERR_EXTRA_REFS = {
    'israeli-positions-syria-2024-1': {'ref': 'un-press-sc15951', 'note': 'UN Security Council record of the debate, with members describing the presence as a violation of the 1974 disengagement agreement.'},
}
REL_EXTRA_REFS = {
    ('palestinian-authority', 0): {'ref': 'icj-2024-opt-ao', 'locator': 'para. 285 (operative)', 'note': 'UN/ICJ position: the whole area is occupied Palestinian territory; the Oslo arrangement does not change that status.'},
    ('israeli-security-zone-south-lebanon-2024', 0): {'ref': 'lwj-2026-10-07-south-lebanon', 'note': 'Reports the IDF’s own description of the deployment as a “forward-defense” posture.'},
    ('israeli-positions-syria-2024', 0): {'ref': 'anews-2026-08-25-katz-hermon', 'note': 'Israel’s defence minister’s statement that Israel will stay on Mount Hermon and in the buffer zone.'},
    ('palaestina-salutaris', 0): {'ref': 'britannica-palestine-roman-to-fatimid', 'locator': 'Roman Palestine', 'note': 'Dates the separation 357–358 "or perhaps as late as the 390s"; Di Segni gives c. 357/8.'},
}
if polities:
    for pid, p in polities.items():
        for i, r in enumerate(p.get('relations', [])):
            if ('relation', pid, i) in CONF_TO_ESTIMATED: r['confidence'] = 'estimated'
            extra = REL_EXTRA_REFS.get((pid, i))
            if extra and not any(x['ref'] == extra['ref'] for x in r['sources']): r['sources'].append(extra)
    write(os.path.join(DATA, 'polities.json'), {'$schema': '../schema/polities.schema.json', 'polities': list(polities.values())})
    for owner, feats in territories.items():
        for f in feats:
            if ('territory', f['properties']['id'], None) in CONF_TO_ESTIMATED: f['properties']['confidence'] = 'estimated'
            extra = TERR_EXTRA_REFS.get(f['properties']['id'])
            if extra and not any(x['ref'] == extra['ref'] for x in f['properties']['sources']): f['properties']['sources'].append(dict(extra))
        write(os.path.join(DATA, 'territories', f'{owner}.geojson'), {'$schema': '../../schema/territory.schema.json', 'type': 'FeatureCollection', 'features': feats})


# ---- early-era fixes (reviewed by hand) ----
TEXTUAL_COUNTER = {'ref': 'finkelstein-2013-forgotten-kingdom', 'note': 'Counter-position: argues that the United Monarchy described in the biblical account did not exist in that form; see the record united-monarchy-archaeological.'}
TEXTUAL_ITEMS = {('relation', 'aram-damascus', 1), ('relation', 'edom', 0), ('territory', 'united-monarchy-textual-1', None)}
CHILD_ESTIMATED_NOTE = 'Whether this entity existed, or its dating, is disputed; the competing sources are on the polity or culture record itself.'
CHILD_ESTIMATED = {('relation', 'assyrian-province-duru', 0), ('relation', 'assyrian-province-galaza', 0), ('relation', 'idumea-persian', 0),
                   ('territory', 'assyrian-province-duru-1', None), ('territory', 'assyrian-province-galaza-1', None),
                   ('territory', 'egypt-eb-presence-1', None), ('territory', 'sidon-2', None),
                   ('zone', 'early-bronze-ii-iii-1', None), ('zone', 'intermediate-bronze-age-1', None)}
DROP = {('territory', 'hyksos-15th-dynasty-1'): 'No source shows Hyksos control of territory in Canaan; the polity is kept for its relations.',
        ('zone', 'late-natufian-1'): 'Lies wholly before the 10,000 BCE timeline start.'}

def add_note(rec, text):
    n = rec.get('notes') or {'en': ''}
    if text not in n['en']: n['en'] = (n['en'] + ' ' + text).strip()
    rec['notes'] = n

if polities:
    for pid, p in polities.items():
        for i, r in enumerate(p.get('relations', [])):
            if ('relation', pid, i) in TEXTUAL_ITEMS and not any(x['ref'] == TEXTUAL_COUNTER['ref'] for x in r['sources']):
                r['sources'].append(dict(TEXTUAL_COUNTER))
            if ('relation', pid, i) in CHILD_ESTIMATED:
                r['confidence'] = 'estimated'; add_note(r, CHILD_ESTIMATED_NOTE)
    write(os.path.join(DATA, 'polities.json'), {'$schema': '../schema/polities.schema.json', 'polities': list(polities.values())})
    for owner in list(territories):
        feats = []
        for f in territories[owner]:
            pr = f['properties']
            if ('territory', pr['id']) in DROP: continue
            if ('territory', pr['id'], None) in TEXTUAL_ITEMS and not any(x['ref'] == TEXTUAL_COUNTER['ref'] for x in pr['sources']):
                pr['sources'].append(dict(TEXTUAL_COUNTER))
            if ('territory', pr['id'], None) in CHILD_ESTIMATED:
                pr['confidence'] = 'estimated'; add_note(pr, CHILD_ESTIMATED_NOTE)
            feats.append(f)
        path = os.path.join(DATA, 'territories', f'{owner}.geojson')
        if feats: write(path, {'$schema': '../../schema/territory.schema.json', 'type': 'FeatureCollection', 'features': feats})
        elif os.path.exists(path): os.remove(path)
if cultures:
    for owner in list(zones):
        feats = []
        for f in zones[owner]:
            pr = f['properties']
            if ('zone', pr['id']) in DROP: continue
            if ('zone', pr['id'], None) in CHILD_ESTIMATED:
                pr['confidence'] = 'estimated'; add_note(pr, CHILD_ESTIMATED_NOTE)
            feats.append(f)
        write(os.path.join(DATA, 'culture-zones', f'{owner}.geojson'), {'$schema': '../../schema/culture-zone.schema.json', 'type': 'FeatureCollection', 'features': feats})
print('applied early-era fixes')

# remove stale files (owners no longer present), without touching current ones
for sub, keep in (('territories', set(territories)), ('culture-zones', set(zones))):
    for f in glob.glob(os.path.join(DATA, sub, '*.geojson')):
        if os.path.basename(f)[:-len('.geojson')] not in keep: os.remove(f); print('removed stale', f)

# ---- modern-era territory modelling corrections (reviewed by hand) ----
# Split "held" from "held but status disputed", and draw claims as claims.
DISPUTED_NOTE = 'Modelling note: units whose status is internationally disputed are listed in contested_units and drawn hatched; the rest of the extent is not.'
MODERN_OVERRIDES = {
    'israel-2': {'units': ['israel-1949', 'mount-scopus'], 'contested_units': ['east-jerusalem'], 'boundary_certainty': 'approximate', 'confidence': 'documented', '_note': DISPUTED_NOTE},
    'israel-3': {'units': ['israel-1949', 'mount-scopus'], 'contested_units': ['east-jerusalem', 'golan-heights', 'shebaa-farms'], 'partial_units': None, 'boundary_certainty': 'approximate', 'confidence': 'documented', '_note': DISPUTED_NOTE},
    'jordan-2': {'units': ['transjordan'], 'contested_units': ['west-bank', 'east-jerusalem'], 'boundary_certainty': 'approximate', 'confidence': 'documented', '_note': DISPUTED_NOTE + ' The 1950 annexation of the West Bank had very limited international recognition.'},
    'syria-2': {'partial_units': None, 'boundary_certainty': 'surveyed', '_note': 'Modelling note: the eastern strip of the Golan that Syria retained is the UN area of separation, which is not part of the Golan Heights unit.'},
    'syria-3': {'units': ['syria'], 'partial_units': None, 'boundary_certainty': 'approximate', '_note': 'Modelling note: drawn as the whole of Syria; the Israeli-held positions since December 2024 are a separate record (israeli-positions-syria-2024).'},
    'lebanon-2': {'units': ['lebanon'], 'partial_units': None, 'boundary_certainty': 'approximate', '_note': 'Modelling note: drawn as the whole of Lebanon; the Israeli-held south is a separate record (israeli-occupied-zone-south-lebanon-1982) drawn on top.'},
    'lebanon-3': {'boundary_certainty': 'approximate', '_note': 'Modelling note: the Israeli-held positions since 2024 are a separate record drawn on top.'},
    'state-of-palestine-1': {'extent_type': 'claim', 'boundary_certainty': 'approximate', 'confidence': 'documented', '_note': 'Modelling note: a claim, drawn as an outline only; control on the ground is shown by the Palestinian Authority, Hamas-led administration and Israeli military government records.'},
    'israeli-military-government-golan-1': {'units': ['golan-heights', 'shebaa-farms'], 'partial_units': None},
    'israeli-positions-syria-2024-1': {'partial_units': ['undof-zone'], '_note': 'Modelling note: drawn as the UN area of separation only; the positions on the Syrian side of Mount Hermon are not mapped.'},
}
if polities:
    applied = []
    for owner, feats in territories.items():
        changed = False
        for f in feats:
            pr = f['properties']
            ov = MODERN_OVERRIDES.get(pr['id'])
            if not ov: continue
            for k, v in ov.items():
                if k == '_note': continue
                if v is None: pr.pop(k, None)
                else: pr[k] = v
            if ov.get('_note'): add_note(pr, ov['_note'])
            changed = True; applied.append(pr['id'])
        if changed:
            write(os.path.join(DATA, 'territories', f'{owner}.geojson'), {'$schema': '../../schema/territory.schema.json', 'type': 'FeatureCollection', 'features': feats})
    print('modern overrides applied:', len(applied), 'of', len(MODERN_OVERRIDES))
