"""Importer for the second research wave (places, holy sites, events, rulers, conflicts,
migrations, languages, landscape, perspectives, modern layers) into existing project data.
Usage: python3 -I import_more.py <research_dir> <project_data_dir> <collection> [...]
Merges sources into data/sources.json (dedupe by id, DOI, URL); writes one collection file per run.
"""
import json, os, re, sys

RES, DATA, *WANT = sys.argv[1:]
TODAY = '2026-10-19'
THIRD_PARTY = re.compile(r'yplus\.ps|teyit\.org|vdoc\.pub|kupdf|homepages\.uc\.edu|libgen|z-lib|annas-archive|scribd|pdfcoffee|dokumen\.pub|ebin\.pub')
KINDS = {'academic', 'government', 'un', 'ngo', 'press', 'reference', 'religious-institution'}
TYPES = {'book', 'article', 'chapter', 'web', 'dataset', 'document', 'map', 'census', 'report', 'thesis'}
RANGE_KEYS = {'low', 'high'}

def load(p):
    return json.load(open(p)) if os.path.exists(p) else None

def write(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2); f.write('\n')

def clean(o, keep_none=False):
    if isinstance(o, dict):
        is_range = RANGE_KEYS <= set(o)
        return {k: clean(v) for k, v in o.items() if v not in ('', [], {}) and (v is not None or (is_range and k in RANGE_KEYS))}
    if isinstance(o, list): return [clean(v) for v in o]
    return o

def loc(v):
    if v is None or v == '': return None
    if not isinstance(v, dict): return {'en': str(v)}
    v = dict(v)
    if not v.get('en'):
        return None
    st = dict(v.get('translation_status') or {})
    for lang in ('ar', 'he'):
        if v.get(lang) and lang not in st: st[lang] = 'machine-draft'
        if not v.get(lang): v.pop(lang, None); st.pop(lang, None)
    if st: v['translation_status'] = st
    else: v.pop('translation_status', None)
    return v

# ---------------------------------------------------------------- sources
src_path = os.path.join(DATA, 'sources.json')
src_file = load(src_path)
sources = {s['id']: s for s in src_file['sources']}
by_doi = {s['doi'].lower(): s['id'] for s in sources.values() if s.get('doi')}
by_url = {s['url'].rstrip('/'): s['id'] for s in sources.values() if s.get('url')}
alias = {}

def conv_source(s):
    s = dict(s)
    v = s.get('verification') or {}
    note = v.get('note') or ''
    if THIRD_PARTY.search(s.get('url') or ''):
        note += ' Read in a third-party copy of uncertain licensing status, which this project does not link.'
        s['url'] = ''
    s['verification'] = clean({'level': v.get('level', 'catalogue-only'), 'checked_on': v.get('checked_on') or s.get('accessed') or TODAY, 'note': note.strip()})
    if s.get('kind') not in KINDS: s['kind'] = 'reference'
    if s.get('type') not in TYPES: s['type'] = 'document'
    c = s.get('institution_country')
    if c and not re.fullmatch(r'[A-Z]{2}', str(c)): s.pop('institution_country')
    for k in ('volume', 'issue', 'year'):
        if isinstance(s.get(k), str) and s[k].isdigit(): s[k] = int(s[k])
    if isinstance(s.get('pages'), int): s['pages'] = str(s['pages'])
    if s.get('url') and not re.match(r'https?://', s['url']): s['url'] = ''
    if isinstance(s.get('authors'), str): s['authors'] = [s['authors']]
    for k in list(s):
        if k not in {'id','type','authors','editors','title','container','publisher','place','year','volume','issue','pages','edition','isbn','doi','url','accessed','license','verification','kind','institution_country','notes'}:
            s.pop(k)
    if isinstance(s.get('notes'), dict): s['notes'] = s['notes'].get('en')
    return clean(s)

RANK = {'full-text': 3, 'excerpt': 2, 'cited-via': 1, 'catalogue-only': 0}
def add_sources(lst):
    for raw in lst or []:
        s = conv_source(raw)
        sid = s['id']
        same = None
        if s.get('doi') and s['doi'].lower() in by_doi: same = by_doi[s['doi'].lower()]
        elif s.get('url') and s['url'].rstrip('/') in by_url: same = by_url[s['url'].rstrip('/')]
        norm = lambda t: re.sub(r'[^a-z0-9]', '', (t or '').lower())[:60]
        if same and norm(sources[same].get('title')) != norm(s.get('title')):
            same = None  # same URL but a different work (e.g. two chapters of one digitised volume)
        if same and same != sid:
            alias[sid] = same
            if RANK[s['verification']['level']] > RANK[sources[same]['verification']['level']]:
                sources[same]['verification'] = s['verification']
            continue
        if sid in sources:
            if RANK[s['verification']['level']] > RANK[sources[sid]['verification']['level']]:
                sources[sid] = s
            continue
        sources[sid] = s
        if s.get('doi'): by_doi[s['doi'].lower()] = sid
        if s.get('url'): by_url[s['url'].rstrip('/')] = sid

def refs(lst):
    out = []
    for r in lst or []:
        r = clean(dict(r))
        for k in ('ref', 'via'):
            if k in r: r[k] = alias.get(r[k], r[k])
        if r.get('quote') and len(r['quote']) > 400: r['quote'] = r['quote'][:400] + '…'
        out.append({k: v for k, v in r.items() if k in ('ref', 'locator', 'quote', 'via', 'note')})
    return out

def save_sources():
    write(src_path, {'$schema': '../schema/sources.schema.json', 'sources': sorted(sources.values(), key=lambda s: s['id'])})

# ---------------------------------------------------------------- collections
def import_languages_landscape():
    d = load(os.path.join(RES, 'languages-landscape.json'))
    add_sources(d['sources'])
    langs = []
    for l in d['languages']:
        q = clean({**l, 'name': loc(l['name']), 'notes': loc(l.get('notes')), 'sources': refs(l.get('sources')),
                   'periods': [clean({**p, 'speakers': loc(p.get('speakers')), 'sources': refs(p.get('sources'))}) for p in l['periods']]})
        langs.append(q)
    write(os.path.join(DATA, 'languages.json'), {'$schema': '../schema/languages.schema.json', 'languages': langs})
    L = d['landscape']
    def lvl(p):
        q = {**p, 'sources': refs(p.get('sources'))}
        lm = dict(q['level_m'])
        if lm.get('best') is None: lm.pop('best', None)
        q['level_m'] = {'low': lm.get('low'), 'high': lm.get('high'), **({'best': lm['best']} if 'best' in lm else {})}
        if isinstance(q.get('notes'), dict): q['notes'] = q['notes'].get('en')
        return clean(q) | {'level_m': q['level_m']}
    routes = []
    for r in L['trade_routes']:
        q = {**r, 'name': loc(r['name']), 'description': loc(r.get('description')), 'notes': loc(r.get('notes')), 'sources': refs(r.get('sources')),
             'alt_names': [clean({'text': loc(a['text']), 'used_by': a['used_by'], 'sources': refs(a.get('sources'))}) for a in r.get('alt_names', [])],
             'waypoints': [clean({k: w[k] for k in ('label', 'coords', 'coords_source', 'place') if k in w}) for w in r['waypoints']],
             'branches': [clean({'label': b['label'], 'waypoints': [clean({k: w[k] for k in ('label', 'coords', 'coords_source', 'place') if k in w}) for w in b['waypoints']]}) for b in r.get('branches', [])]}
        q.pop('wikidata', None)
        q.setdefault('confidence', 'estimated')
        routes.append(clean(q))
    write(os.path.join(DATA, 'landscape.json'), {'$schema': '../schema/landscape.schema.json',
        'sea_level': [lvl(p) for p in L['sea_level']], 'dead_sea_levels': [lvl(p) for p in L['dead_sea_levels']], 'trade_routes': routes})
    print('languages', len(langs), '| sea', len(L['sea_level']), '| dead sea', len(L['dead_sea_levels']), '| routes', len(routes))


NAME_KEYS = ('text', 'translit', 'display', 'lang', 'script', 'start', 'end', 'used_by', 'primary', 'confidence', 'sources', 'notes')
def native(v, own_lang=None, own_text=None):
    """A display form that is the name itself, in its own language and script, is the original; anything else
    (Wikidata labels, renderings) stays a machine draft, as decided in Milestone 2."""
    if not isinstance(v, dict) or not v.get('en'): return loc(v)
    v = dict(v); st = dict(v.get('translation_status') or {})
    for lg in ('ar', 'he'):
        if v.get(lg) and lg not in st: st[lg] = 'original' if (own_lang == lg and v[lg] == own_text) else 'machine-draft'
        if not v.get(lg): v.pop(lg, None); st.pop(lg, None)
    if st: v['translation_status'] = st
    else: v.pop('translation_status', None)
    return v

def conv_name(n):
    n = dict(n)
    if 'note' in n: n['notes'] = n.pop('note')
    n['sources'] = refs(n.get('sources'))
    n['display'] = native(n.get('display'), n.get('lang'), n.get('text'))
    if n.get('script') in (None, ''): n.pop('script', None)
    return clean({k: n[k] for k in NAME_KEYS if k in n})

def conv_place(p):
    notes = p.get('notes')
    if isinstance(notes, dict): notes = notes.get('en')
    extra = []
    if p.get('name_labels_from'): extra.append(f"Name labels taken from Wikidata item {p['name_labels_from']}.")
    if extra: notes = ' '.join([x for x in [notes] + extra if x])
    q = {
        'id': p['id'], 'name': loc(p['name']), 'wikidata': p.get('wikidata'), 'pleiades': str(p['pleiades']) if p.get('pleiades') else None,
        'kind': p['kind'], 'coords': [round(p['coords'][0], 5), round(p['coords'][1], 5)], 'coords_source': p.get('coords_source'),
        'coords_precision': p.get('coords_precision'), 'founded': p.get('founded'), 'founded_note': p.get('founded_note'),
        'founded_sources': refs(p.get('founded_sources')), 'wikidata_related': p.get('wikidata_related'),
        'destroyed': [clean({**d, 'sources': refs(d.get('sources'))}) for d in p.get('destroyed') or []],
        'names': [conv_name(n) for n in p.get('names') or []],
        'holy_site': None, 'custody': None, 'unesco': None,
        'description': loc(p.get('description')), 'confidence': p.get('confidence', 'documented'),
        'sources': refs(p.get('sources')), 'notes': loc(notes) if notes else None,
    }
    hs = p.get('holy_site')
    if hs:
        q['holy_site'] = {'traditions': {k: clean({'significance': loc(e['significance']), 'denominations': e.get('denominations'),
                                                    'sources': refs(e['sources']), 'notes': e.get('notes')}) for k, e in hs['traditions'].items()}}
    c = p.get('custody')
    if c: q['custody'] = {'summary': loc(c['summary']), 'confidence': c['confidence'], 'sources': refs(c['sources'])}
    u = p.get('unesco')
    if u:
        uu = {k: u[k] for k in ('property', 'name', 'state_party_label', 'inscribed', 'criteria', 'in_danger_since') if u.get(k) is not None}
        notes_u = []
        if u.get('in_danger') and 'in_danger_since' not in uu: notes_u.append('On the List of World Heritage in Danger.')
        if u.get('wording_for_site'): notes_u.append(f"UNESCO wording: {u['wording_for_site']}")
        if notes_u: uu['note'] = ' '.join(notes_u)
        q['unesco'] = uu
    out = clean(q)
    if p.get('founded') is None: out.pop('founded', None)
    return out

def merge_place(a, b):
    """Merge holy-site record b into place record a (same Wikidata item)."""
    seen = {(n['text'], n['lang']) for n in a.get('names', [])}
    for n in b.get('names', []):
        if (n['text'], n['lang']) not in seen: a.setdefault('names', []).append(n); seen.add((n['text'], n['lang']))
    a['kind'] = list(dict.fromkeys(a['kind'] + b['kind']))
    for k in ('holy_site', 'custody', 'unesco', 'founded', 'founded_note', 'founded_sources', 'wikidata_related', 'description'):
        if k in b and k not in a: a[k] = b[k]
    have = {(r['ref'], r.get('locator')) for r in a['sources']}
    a['sources'] += [r for r in b['sources'] if (r['ref'], r.get('locator')) not in have]
    if b.get('destroyed'): a['destroyed'] = a.get('destroyed', []) + b['destroyed']
    if b.get('notes'):
        a['notes'] = {'en': ' '.join(x for x in [a.get('notes', {}).get('en'), b['notes']['en']] if x)}
    return a

def import_places():
    P = load(os.path.join(RES, 'places.json')); H = load(os.path.join(RES, 'holy-sites.json'))
    add_sources(P['sources']); add_sources(H['sources'])
    places = [conv_place(p) for p in P['places']]
    by_q = {p.get('wikidata'): p for p in places if p.get('wikidata')}
    by_id = {p['id']: p for p in places}
    merged = 0
    for h in H['places']:
        q = conv_place(h)
        tgt = by_q.get(q.get('wikidata')) or by_id.get(q['id'])
        if tgt: merge_place(tgt, q); merged += 1
        else: places.append(q); by_id[q['id']] = q
    # Destructions after which the cited source says the place was not lived in again (hollow marker on the map).
    ENDED = {'ashkelon-ancient': 1191, 'quneitra': 1974, 'imwas': 1967, 'yalu': 1967, 'bayt-nuba': 1967, 'lifta': 1948, 'deir-yassin': 1948}
    for pl in places:
        for x in pl.get('destroyed', []):
            if ENDED.get(pl['id']) == x['date']['year']: x['ended_settlement'] = True
            if pl['id'] == 'deir-yassin' and x['date']['year'] == 1948:
                x['note'] = (x.get('note', '') + ' The villagers who were taken prisoner were removed from the village by truck.').strip()
                x['sources'].append({'ref': 'palquest-deir-yasin', 'quote': 'they loaded 150 of the villagers they took as prisoners (they referred to them as “enemy combatants”) onto trucks and paraded them in a victory procession in Jewish neighborhoods before dumping them on the outskirts of the Arab neighborhoods'})
    # 1948-1950 captures and depopulations from the villages pass. They replace a same-year entry from the places pass.
    V = load(os.path.join(RES, 'villages-1948.json'))
    if V:
        add_sources(V['sources'])
        by_id = {pl['id']: pl for pl in places}
        # These records also stand for the Israeli town on or beside the site today, so the event is listed
        # without turning the place into a "former" place.
        CONTINUES = {'yavne-yibna', 'ashkelon'}
        years = {(e['place'], e['date']['year']) for e in V['events']}
        for pl in places:
            if pl.get('destroyed'): pl['destroyed'] = [x for x in pl['destroyed'] if (pl['id'], x['date']['year']) not in years]
        for e in V['events']:
            pl = by_id[e['place']]
            date = {k: v for k, v in e['date'].items() if not (k == 'circa' and v is False)}
            ended = bool(e.get('ended_settlement')) and e['place'] not in CONTINUES
            note = e['note'] + (' The place record also covers the town that exists on or beside the site today, so it is not marked as a former place.' if e['place'] in CONTINUES and e.get('ended_settlement') else '')
            pl.setdefault('destroyed', []).append(clean({'date': date, 'what': e['what'], 'by': e.get('by'), 'note': note, 'ended_settlement': ended or None,
                                                        'confidence': e['confidence'], 'sources': [tidy_quote(r) for r in refs(e['sources'])]}))
            pl['destroyed'].sort(key=lambda x: (x['date']['year'], x['date'].get('month', 0)))
    write(os.path.join(DATA, 'places.json'), {'$schema': '../schema/places.schema.json', 'places': places})
    print(f'places {len(places)} (merged {merged} holy-site records into existing places)')

def single(r):
    """A figure published as one number (best only) is stored as low = high = best."""
    if not r: return r
    r = dict(r)
    if r.get('low') is None and r.get('high') is None and r.get('best') is not None:
        r['low'] = r['high'] = r['best']
    if r.get('best') is None: r.pop('best', None)
    return {'low': r.get('low'), 'high': r.get('high'), **({'best': r['best']} if 'best' in r else {})}

def conv_endpoint(e):
    if 'place' in e: return {'place': e['place']}
    return clean({'label': loc(e['label']), 'coords': [round(e['coords'][0], 5), round(e['coords'][1], 5)], 'coords_source': e.get('coords_source')})

def import_migrations():
    d = load(os.path.join(RES, 'migrations.json'))
    add_sources(d['sources'])
    places = {p['id']: p for p in load(os.path.join(DATA, 'places.json'))['places']}
    out = []
    for m in d['migrations']:
        notes = m.get('notes') or ''
        types = list(dict.fromkeys('settlement' if t == 'colonization' else t for t in m['types']))
        if 'colonization' in m['types']:
            notes = (notes + " The research pass classed this movement as 'colonization'; it is recorded here as 'settlement', the project's neutral category.").strip()
        q = {'id': m['id'], 'name': loc(m['name']), 'group': loc(m['group']),
             'types': types, 'alt_names': [loc(a) for a in m.get('alt_names') or []],
             'origin': conv_endpoint(m['origin']), 'destination': conv_endpoint(m['destination']),
             'origins': [conv_endpoint(e) for e in m.get('origins') or []],
             'destinations': [conv_endpoint(e) for e in m.get('destinations') or []],
             'start': m['start'], 'end': m.get('end'), 'direction': m['direction'], 'basis': m.get('basis'),
             'confidence': m['confidence'], 'sources': refs(m['sources']),
             'notes': loc(notes) if notes else None, 'contested_note': loc(m.get('contested_note'))}
        for e in ('origin', 'destination'):
            if 'place' in q[e] and q[e]['place'] not in places: raise SystemExit(f"unknown place {q[e]['place']} in {m['id']}")
            # Wikidata's single point for Israel lies in the Negev; arrows for "Israel" as a whole are drawn to or
            # from Tel Aviv-Jaffa instead (display convention, documented in data/README.md).
            if q[e].get('label', {}).get('en') in ('Israel', 'Jewish-held areas (Israel)') and q[e].get('coords') == [35, 31]:
                q[e]['coords'] = places['tel-aviv']['coords']
                q[e]['coords_source'] = 'display convention: Tel Aviv-Jaffa stands for Israel as a whole'
        if m['id'] == 'palestinian-refugees-1947-1949':
            # The research used Wikidata's single point for Israel (in the Negev). The origin label names Jaffa,
            # Haifa, Lydda and Ramla first, so the arrows start from the centroid of those four places.
            pts = [places[i]['coords'] for i in ('jaffa', 'haifa', 'lod', 'ramla')]
            q['origin']['coords'] = [round(sum(p[0] for p in pts) / 4, 3), round(sum(p[1] for p in pts) / 4, 3)]
            q['origin']['coords_source'] = 'centroid of Jaffa, Haifa, Lydda and Ramla (places.json)'
        if m['id'] == 'second-aliyah':
            # CBS gives 35,000-40,000 and Bachi's sub-periods sum to 34,300: keep both ends, no single best figure.
            m = {**m, 'numbers': {'low': 34300, 'high': 40000}}
            q['notes'] = loc((notes + ' The range runs from Bachi\'s total (34,300) to the top of the CBS range (40,000).').strip())
        out.append(clean(q) | {'numbers': single(m['numbers'])} if m.get('numbers') else clean(q))
    dia = []
    for x in d['diaspora']:
        locn = x['location']
        coords = locn.get('coords')
        dia.append(clean({'id': x['id'], 'group': x['group'], 'definition': loc(x['definition']), 'date': x['date'],
                          'location': {'label': loc(locn['label']), 'coords': [round(coords[0], 5), round(coords[1], 5)] if coords else None,
                                       **({'coords_source': locn['coords_source']} if locn.get('coords_source') else {})},
                          'number': single(x['number']), 'confidence': x['confidence'], 'sources': refs(x['sources']),
                          'notes': loc(x.get('notes'))}))
        if coords is None: dia[-1]['location']['coords'] = None
    write(os.path.join(DATA, 'migrations.json'), {'$schema': '../schema/migrations.schema.json', 'migrations': out, 'diaspora': dia})
    print('migrations', len(out), '| diaspora', len(dia))

# Place ids used by the conflicts passes that match an existing place under another id.
PLACE_ALIAS = {'samaria': 'samaria-sebastia', 'ashdod-tel': 'isdud', 'tell-es-safi': 'gath', 'panias': 'banias',
               'emmaus': 'imwas', 'shechem': 'tell-balata'}

# The conflicts passes overlap at 1516-17; ids used by the second pass for the same conflicts.
SAME_CONFLICT = {'battle-of-marj-dabiq-1516': 'battle-of-marj-dabiq', 'battle-of-yaunis-khan-1516': 'battle-of-khan-yunis-1516'}

def import_conflicts():
    places = {p['id']: p for p in load(os.path.join(DATA, 'places.json'))['places']}
    polities = {p['id'] for p in load(os.path.join(DATA, 'polities.json'))['polities']}
    out, dropped_places = [], {}
    for f in ('conflicts-early.json', 'conflicts-modern.json'):
        d = load(os.path.join(RES, f))
        if not d: continue
        add_sources(d['sources'])
        for c in d['conflicts']:
            L = dict(c.get('location') or {})
            pl = L.get('place')
            if pl:
                pl = PLACE_ALIAS.get(pl, pl)
                if pl in places: L['place'] = pl
                else:
                    dropped_places[pl] = c['id']; L.pop('place')   # not a project place: keep its coordinates
            loc_ = clean({'place': L.get('place'), 'coords': [round(L['coords'][0], 5), round(L['coords'][1], 5)] if L.get('coords') else None,
                          'units': L.get('units'), 'coords_source': L.get('coords_source'), 'description': loc(L.get('description'))})
            bell = []
            for b in c.get('belligerents') or []:
                parties = []
                for pa in b['parties']:
                    if 'polity' in pa and pa['polity'] in polities: parties.append({'polity': pa['polity']})
                    elif 'polity' in pa: parties.append({'group': {'en': pa['polity'].replace('-', ' ')}})
                    else: parties.append({'group': loc(pa['group'])})
                bell.append({'side': str(b['side']), 'parties': parties})
            alts = []
            for a in c.get('alt_names') or []:
                o = a.get('original')
                alts.append(clean({'text': loc(a['text']), 'original': clean({k: o.get(k) for k in ('text', 'lang', 'script', 'translit')}) if o else None,
                                   'used_by': a['used_by'], 'note': a.get('note'), 'sources': refs(a.get('sources'))}))
            q = {'id': c['id'], 'name': loc(c['name']), 'alt_names': alts, 'kind': c['kind'], 'wikidata': c.get('wikidata'),
                 'importance': c.get('importance'), 'basis': c.get('basis'), 'parent': c.get('parent'),
                 'start': c['start'], 'end': c.get('end'), 'location': loc_, 'belligerents': bell,
                 'outcome': loc(c.get('outcome')), 'confidence': c['confidence'], 'sources': refs(c['sources']),
                 'notes': loc(c.get('notes'))}
            q['id'] = SAME_CONFLICT.get(q['id'], q['id'])
            if q.get('parent'): q['parent'] = SAME_CONFLICT.get(q['parent'], q['parent'])
            prev = next((x for x in out if x['id'] == q['id']), None)
            if prev:
                # The same conflict from both passes: keep the first record and add the second one's sources and names.
                have = {(r['ref'], r.get('quote')) for r in prev['sources']}
                prev['sources'] += [r for r in q['sources'] if (r['ref'], r.get('quote')) not in have]
                known = {a['text']['en'] for a in prev.get('alt_names', [])}
                extra = [a for a in q['alt_names'] if a['text']['en'] not in known]
                if extra: prev.setdefault('alt_names', []).extend(extra)
                if q.get('notes') and q['notes']['en'] not in (prev.get('notes') or {}).get('en', ''):
                    prev['notes'] = {'en': ' '.join(x for x in [(prev.get('notes') or {}).get('en'), q['notes']['en']] if x)}
                continue
            out.append(clean(q) | {'casualties': None})
    ids = {c['id'] for c in out}
    for c in out:
        if c.get('parent') and c['parent'] not in ids:
            print('  parent not found, dropped:', c['id'], '->', c['parent']); c.pop('parent')
    write(os.path.join(DATA, 'conflicts.json'), {'$schema': '../schema/conflicts.schema.json', 'conflicts': out})
    print('conflicts', len(out), '| place ids not in places.json (coords kept):', ', '.join(sorted(dropped_places)))

def tidy_quote(r):
    """HTML-to-text artefacts: drop spaces before punctuation and inside brackets."""
    if r.get('quote'):
        q = re.sub(r'\s+([,.;:)\]])', r'\1', r['quote'])
        r['quote'] = re.sub(r'([(\[])\s+', r'\1', q)
    return r

def import_events_rulers():
    d = load(os.path.join(RES, 'events-rulers.json'))
    add_sources(d['sources'])
    places = {p['id'] for p in load(os.path.join(DATA, 'places.json'))['places']}
    polities = {p['id'] for p in load(os.path.join(DATA, 'polities.json'))['polities']}
    alias = {'samaria': 'samaria-sebastia', 'shechem': 'tell-balata', 'emmaus': 'imwas', 'panias': 'banias', 'jaffa-tel-aviv': 'jaffa', 'beit-shean': 'beth-shean', 'caesarea-maritima': 'caesarea', 'yavne': 'yavne-yibna'}
    events, dropped = [], set()
    for e in d['events']:
        pl = alias.get(e.get('place'), e.get('place'))
        if pl and pl not in places: dropped.add(pl); pl = None
        q = {'id': e['id'], 'name': loc(e['name']), 'kind': e['kind'], 'date': e['date'], 'end': e.get('end'), 'place': pl,
             'coords': [round(e['coords'][0], 5), round(e['coords'][1], 5)] if e.get('coords') else None, 'coords_source': e.get('coords_source'),
             'wikidata': e.get('wikidata'), 'description': loc(e.get('description')), 'importance': e.get('importance'),
             'related_conflict': e.get('related_conflict'), 'basis': e.get('basis'), 'confidence': e['confidence'],
             'sources': [tidy_quote(r) for r in refs(e['sources'])], 'notes': loc(e.get('notes')) if e.get('notes') else None}
        events.append(clean(q))
    rulers = []
    for r in d['rulers']:
        if r['polity'] not in polities: raise SystemExit(f"unknown polity {r['polity']} for ruler {r['id']}")
        q = {'id': r['id'], 'name': loc(r['name']), 'polity': r['polity'], 'office': loc(r.get('office')), 'start': r['start'], 'end': r.get('end'),
             'basis': r.get('basis'), 'confidence': r['confidence'], 'sources': [tidy_quote(x) for x in refs(r['sources'])],
             'notes': loc(r.get('notes')) if r.get('notes') else None}
        rulers.append(clean(q))
    write(os.path.join(DATA, 'events.json'), {'$schema': '../schema/events.schema.json', 'events': events})
    write(os.path.join(DATA, 'rulers.json'), {'$schema': '../schema/rulers.schema.json', 'rulers': rulers})
    print('events', len(events), '| rulers', len(rulers), '| event place ids not in places.json (coords kept):', ', '.join(sorted(dropped)))

def ymd(v):
    """'1949-02-24' or 1967 -> date object."""
    if v is None or v == '': return None
    if isinstance(v, int): return {'year': v, 'precision': 'year'}
    parts = [int(x) for x in str(v).split('-')]
    d = {'year': parts[0], 'precision': 'year'}
    if len(parts) > 1: d['month'] = parts[1]; d['precision'] = 'month'
    if len(parts) > 2: d['day'] = parts[2]; d['precision'] = 'day'
    return d

def flat_name(props, out):
    n = props.get('name')
    if isinstance(n, dict):
        out['name'] = n.get('en') or n.get('en_cbs_2003', '').title() or n.get('he')
        if n.get('he'): out['name_he'] = n['he']
        if n.get('ar'): out['name_ar'] = n['ar']
    elif n: out['name'] = n

def import_modern():
    M = os.path.join(RES, 'modern')
    r = load(os.path.join(M, 'README.json'))
    add_sources(r['sources'])
    meta = {f['file']: f for f in r['files']}
    srcrefs = lambda fname: refs(meta[fname].get('source_refs'))
    os.makedirs(os.path.join(DATA, 'modern'), exist_ok=True)
    def save(fname, feats):
        write(os.path.join(DATA, 'modern', fname), {'type': 'FeatureCollection', 'features': feats})
    def feat(f, props): return {'type': 'Feature', 'geometry': f['geometry'], 'properties': clean(props)}
    layers = []

    # 1947 partition plan (approximate digitisation from the resolution text)
    d = load(os.path.join(M, 'partition-1947-approx.geojson'))
    save('partition-1947.geojson', [feat(f, {'id': f['properties']['id'], 'class': f['properties']['state'], 'name': f['properties']['name']['en'],
                                                 'boundary_certainty': f['properties']['boundary_certainty'], 'area_km2': f['properties'].get('area_km2')}) for f in d['features']])
    m = meta['partition-1947-approx.geojson']
    layers.append({'id': 'partition-1947', 'name': {'en': 'UN partition plan, 1947 (approximate)'}, 'file': 'partition-1947.geojson', 'kind': 'fill', 'color': '#8c8c8c',
        'class_styles': {'jewish': {'color': '#b59a3c', 'label': {'en': 'Proposed Jewish State'}}, 'arab': {'color': '#b06aa0', 'label': {'en': 'Proposed Arab State'}},
                         'corpus-separatum': {'color': '#6f6f6f', 'label': {'en': 'City of Jerusalem under an international regime (schematic)'}}},
        'start': {'year': 1947, 'month': 11, 'day': 29, 'precision': 'day'}, 'end': {'year': 1948, 'month': 5, 'day': 15, 'precision': 'day'},
        'as_of': {'year': 1947, 'month': 11, 'day': 29, 'precision': 'day'}, 'publisher': 'This project (derived from UN General Assembly resolution 181 (II))',
        'license': 'CC BY 4.0 (this project); anchors from Wikidata and OpenHistoricalMap (CC0)', 'attribution': m['attribution'],
        'method': {'en': 'No openly licensed map of the plan exists, so the boundaries were digitised from the text of Resolution 181 (II), Part II: each village or landmark it names was placed from Wikidata and moved a short distance to the side the text names; grid lines quoted in the text were converted from the Palestine grid. ' + m['accuracy']},
        'confidence': 'estimated', 'sources': srcrefs('partition-1947-approx.geojson'),
        'notes': {'en': 'A proposal that was never implemented. Shown from the vote (29 November 1947) to the end of the Mandate (15 May 1948). Approximate: errors of roughly 1–5 km along most lines.'}})

    # 1949 demilitarised zones
    d = load(os.path.join(M, 'armistice-1949-dmz.geojson'))
    save('armistice-dmz-1949.geojson', [feat(f, {'id': f['properties']['id'], 'name': f['properties']['name']['en'], 'start': ymd(f['properties'].get('start')),
                                                     'end': ymd(f['properties'].get('end')), 'boundary_certainty': f['properties'].get('boundary_certainty')}) for f in d['features']])
    m = meta['armistice-1949-dmz.geojson']
    layers.append({'id': 'armistice-dmz-1949', 'name': {'en': 'Demilitarised zones of the 1949 armistice agreements'}, 'file': 'armistice-dmz-1949.geojson', 'kind': 'fill', 'color': '#7a7a7a',
        'start': {'year': 1949, 'month': 2, 'day': 24, 'precision': 'day'}, 'end': {'year': 1967, 'month': 6, 'day': 10, 'precision': 'day'},
        'as_of': {'year': 1949, 'month': 7, 'day': 20, 'precision': 'day'}, 'publisher': 'This project (El Auja) and OpenHistoricalMap (Israel–Syria zones)',
        'license': 'CC0 (OpenHistoricalMap); CC BY 4.0 (this project)', 'attribution': m['attribution'], 'method': {'en': m['method'] + ' ' + m['accuracy']},
        'confidence': 'estimated', 'sources': srcrefs('armistice-1949-dmz.geojson')})

    # Green Line (West Bank sector)
    d = load(os.path.join(M, 'green-line-1949-osm.geojson'))
    save('green-line-1949.geojson', [feat(f, {'class': 'line'}) for f in d['features']])
    m = meta['green-line-1949-osm.geojson']
    layers.append({'id': 'green-line-1949', 'name': {'en': '1949 armistice line ("Green Line"), West Bank sector'}, 'file': 'green-line-1949.geojson', 'kind': 'line', 'color': '#4a4a4a',
        'class_styles': {'line': {'dash': [3, 1.5], 'label': {'en': '1949 armistice line, West Bank sector'}}},
        'start': {'year': 1949, 'month': 4, 'day': 3, 'precision': 'day'}, 'as_of': {'year': 2026, 'month': 5, 'precision': 'month'},
        'publisher': 'OpenStreetMap contributors', 'license': 'ODbL 1.0', 'attribution': '© OpenStreetMap contributors (ODbL)', 'method': {'en': m['method'] + ' ' + m['accuracy']},
        'confidence': 'documented', 'sources': srcrefs('green-line-1949-osm.geojson'),
        'notes': {'en': 'Drawn from the Jordan armistice (3 April 1949) to today; after 1967 it remains the line of reference in UN resolutions and in Israeli statistics, though not a border on the ground.'}})

    # Oslo II areas
    d = load(os.path.join(M, 'oslo-ii-areas.geojson'))
    save('oslo-ii-areas.geojson', [feat(f, {'id': f['properties']['id'], 'class': f['properties']['id'], 'name': f['properties']['name']['en'],
                                                'name_ar': f['properties']['name'].get('ar'), 'name_he': f['properties']['name'].get('he'), 'area_km2': f['properties'].get('area_km2')}) for f in d['features']])
    m = meta['oslo-ii-areas.geojson']
    ids = [f['properties']['id'] for f in d['features']]
    colors = {'area-a': '#AA4499', 'area-b': '#c99bc0', 'area-c': '#999933', 'h1': '#AA4499', 'h2': '#999933'}
    labels = {'area-a': 'Area A: Palestinian civil and security control', 'area-b': 'Area B: Palestinian civil control, Israeli security control',
              'area-c': 'Area C: Israeli civil and security control', 'h1': 'Hebron H1: Palestinian control', 'h2': 'Hebron H2: Israeli security control'}
    layers.append({'id': 'oslo-ii-areas', 'name': {'en': 'Oslo II areas A, B and C'}, 'file': 'oslo-ii-areas.geojson', 'kind': 'fill', 'color': '#999933',
        'class_styles': {i: {'color': colors.get(i, '#999933'), 'label': {'en': labels.get(i, i)}} for i in ids},
        'start': {'year': 1995, 'month': 9, 'day': 28, 'precision': 'day'}, 'as_of': {'year': 2026, 'month': 9, 'precision': 'month'},
        'publisher': 'OpenStreetMap contributors', 'license': 'ODbL 1.0', 'attribution': '© OpenStreetMap contributors (ODbL)', 'method': {'en': m['method'] + ' ' + m['accuracy']},
        'confidence': 'estimated', 'sources': srcrefs('oslo-ii-areas.geojson'),
        'notes': {'en': 'Today’s extent is drawn for every date since the Interim Agreement of 28 September 1995; land was transferred between the areas in stages after that, so earlier years are shown less accurately.'}})

    # Barrier
    d = load(os.path.join(M, 'west-bank-barrier-2018.geojson'))
    cls = lambda st: {'Constructed': 'constructed', 'Under Construction': 'under-construction', 'Projected': 'projected'}.get(st, 'projected')
    save('west-bank-barrier.geojson', [feat(f, {'class': cls(f['properties'].get('status')), 'type': f['properties'].get('type')}) for f in d['features']])
    m = meta['west-bank-barrier-2018.geojson']
    layers.append({'id': 'west-bank-barrier', 'name': {'en': 'West Bank barrier (route as of January 2018)'}, 'file': 'west-bank-barrier.geojson', 'kind': 'line', 'color': '#3a3a3a',
        'class_styles': {'constructed': {'label': {'en': 'Built'}}, 'under-construction': {'dash': [3, 2], 'label': {'en': 'Under construction'}},
                         'projected': {'dash': [1, 2], 'color': '#7a7a7a', 'label': {'en': 'Planned'}}},
        'start': {'year': 2002, 'month': 6, 'day': 23, 'precision': 'day'}, 'as_of': {'year': 2018, 'month': 1, 'precision': 'month'},
        'publisher': 'OCHA occupied Palestinian territory (via the Humanitarian Data Exchange)', 'license': 'CC BY 4.0', 'attribution': m['attribution'],
        'method': {'en': m['method'] + ' ' + m['accuracy']}, 'confidence': 'documented',
        'sources': srcrefs('west-bank-barrier-2018.geojson') + [{'ref': 'icj-2004-wall-ao', 'locator': 'section on the construction of the wall', 'quote': 'on 23 June 2002, the Israeli Cabinet approved the first phase of the construction of a “continuous fence” in the West Bank (including East Jerusalem)'}],
        'notes': {'en': 'Israel calls it a security fence; Palestinians and the International Court of Justice call it a wall. The route as of January 2018 is drawn from June 2002, when the Israeli cabinet approved the first phase; it was built in stages (about 190 km by January 2004, according to the UN Secretary-General as cited by the ICJ).'}})

    # Settlements and Israeli neighbourhoods in East Jerusalem; localities evacuated in 2005
    d = load(os.path.join(M, 'settlements-cbs-2023.geojson'))
    feats, skipped = [], []
    for f in d['features']:
        pr = f['properties']; cat = pr.get('locality_category')
        if cat in ('arab-population-locality', 'unknown'): skipped.append(pr['name'].get('en')); continue
        out = {'id': f"cbs-{pr['cbs_code']}" if pr.get('cbs_code') else f"pn-{pr.get('peace_now_gis_id')}"}
        flat_name(pr, out)
        if cat.startswith('israeli-settlement'):
            out['class'] = 'settlement'; out['start'] = ymd(pr.get('founding_year'))
            out['population_2023'] = pr.get('population_2023_provisional'); out['founded'] = pr.get('founding_year')
        else:
            out['class'] = 'east-jerusalem'; out['start'] = {'year': 2011, 'precision': 'year'}
        feats.append(feat(f, out))
    c = load(os.path.join(M, 'localities-ceased-2005-cbs.geojson'))
    for f in c['features']:
        pr = f['properties']; out = {'id': f"cbs-{pr['cbs_code']}", 'class': 'evacuated-2005', 'founded': pr.get('founding_year'),
                                     'start': ymd(pr.get('founding_year')), 'end': {'year': 2005, 'month': 9, 'precision': 'month'}, 'population_2003': pr.get('population_2003')}
        flat_name(pr, out); feats.append(feat(f, out))
    save('settlements.geojson', feats)
    m = meta['settlements-cbs-2023.geojson']; m2 = meta['localities-ceased-2005-cbs.geojson']
    layers.append({'id': 'settlements', 'name': {'en': 'Israeli settlements, by year founded'}, 'file': 'settlements.geojson', 'kind': 'point', 'color': '#6b6b2a',
        'class_styles': {'settlement': {'label': {'en': 'Israeli settlement in the West Bank or Golan Heights (CBS locality list)'}},
                         'east-jerusalem': {'color': '#8a8a3e', 'label': {'en': 'Israeli neighbourhood in East Jerusalem (Peace Now built-up area, 2011 photos)'}},
                         'evacuated-2005': {'color': '#9a9a9a', 'label': {'en': 'Locality evacuated in 2005 (Gaza Strip and northern West Bank)'}}},
        'start': {'year': 1967, 'month': 6, 'precision': 'month'}, 'as_of': {'year': 2023, 'precision': 'year'},
        'publisher': 'Israel Central Bureau of Statistics; Peace Now via OCHA oPt (East Jerusalem)', 'license': 'data.gov.il "Other (Open)", attribution required; CC BY-IGO (OCHA/HDX)',
        'attribution': m['attribution'] + ' ' + m2['attribution'], 'method': {'en': m['method'] + ' ' + m['accuracy'] + ' ' + m2['method']},
        'confidence': 'documented', 'sources': srcrefs('settlements-cbs-2023.geojson') + srcrefs('localities-ceased-2005-cbs.geojson'),
        'notes': {'en': 'Each settlement appears from the founding year given by Israel’s Central Bureau of Statistics. Most states and the UN consider the settlements illegal under international law; Israel disputes this (see the Perspectives page). Arab-population localities in the Golan Heights (e.g. Majdal Shams) are not shown, and Nimrod is left out because the CBS file gives neither a founding year nor a population. East Jerusalem neighbourhoods have no founding year in the source, so they are shown from 2011, the date of the aerial photographs they were mapped from.'}})

    # Gaza since 2023: schematic lines only
    d = load(os.path.join(M, 'gaza-2023-schematic-lines.geojson'))
    gf = []
    for f in d['features']:
        pr = f['properties']
        gf.append(feat(f, {'id': pr['id'], 'class': 'yellow-line' if pr['id'].startswith('yellow') else 'corridor', 'name': pr['name']['en'],
                           'name_ar': pr['name'].get('ar'), 'name_he': pr['name'].get('he'), 'start': ymd(pr.get('start')), 'end': ymd(pr.get('end')), 'certainty': pr.get('certainty')}))
    save('gaza-lines-2023.geojson', gf)
    m = meta['gaza-2023-schematic-lines.geojson']
    layers.append({'id': 'gaza-lines-2023', 'name': {'en': 'Gaza Strip since 2023: corridors and the October 2025 withdrawal line (schematic)'}, 'file': 'gaza-lines-2023.geojson', 'kind': 'line', 'color': '#7a6a2e',
        'class_styles': {'yellow-line': {'color': '#b8860b', 'dash': [2, 1], 'label': {'en': '“Yellow Line”: Israeli withdrawal line under the October 2025 ceasefire'}},
                         'corridor': {'dash': [1, 1.5], 'label': {'en': 'Military corridor held by Israeli forces (Netzarim, Philadelphi, Morag)'}}},
        'start': {'year': 2023, 'month': 11, 'precision': 'month'}, 'as_of': {'year': 2025, 'month': 10, 'day': 14, 'precision': 'day'},
        'publisher': 'OpenStreetMap contributors (traced from an Israeli military map); dates from press reports', 'license': 'ODbL 1.0', 'attribution': '© OpenStreetMap contributors (ODbL)',
        'method': {'en': m['method'] + ' ' + m['accuracy']}, 'confidence': 'estimated', 'sources': srcrefs('gaza-2023-schematic-lines.geojson'),
        'notes': {'en': 'Schematic lines only, deliberately simplified: the zones they bound changed often and are not drawn as areas. ' + (d['features'][0]['properties'].get('caveat') or '') + ' The Morag corridor has no published geometry; it is drawn as a straight line through the former Morag settlement, oriented as press reports describe it.'}})

    write(os.path.join(DATA, 'modern', 'layers.json'), {'$schema': '../../schema/modern-layers.schema.json', 'layers': [clean(l) for l in layers]})
    print('modern layers', len(layers), '| settlements', len(feats), '| skipped Golan localities:', ', '.join(x or '?' for x in skipped))

def marker_before_stop(text):
    """'...honey'.[1] It' -> '...honey' [1]. It' (the project's citation style; lets the validator split sentences)."""
    return re.sub(r'([.!?])((?:\[\d+\])+)', lambda m: ' ' + m.group(2) + m.group(1), text)

# The records each topic is about. The research pass linked topics to whole polities (e.g. the Mandate for the 1929
# riots), which made them appear across decades; specific conflicts, events and migrations give their real span.
PERSPECTIVE_ABOUT = {
    'exodus-and-israelite-settlement': ['israelite-conquest-of-canaan-textual', 'late-bronze-age-destructions-archaeological'],
    'united-monarchy': ['united-monarchy-textual', 'united-monarchy-archaeological'],
    'roman-era-exile': ['first-jewish-roman-war', 'bar-kokhba-revolt', 'roman-era-jewish-diaspora'],
    'syria-palaestina-renaming': ['bar-kokhba-revolt'],
    'islamic-conquest-arabisation': ['muslim-conquest-of-the-levant', 'arab-tribal-settlement-early-islam'],
    'arab-immigration-ottoman-mandate': ['arab-immigration-late-ottoman-mandate'],
    'riots-1929-al-buraq': ['palestine-riots-1929'],
    'arab-revolt-1936-39': ['arab-revolt-1936-1939'],
    'partition-plan-1947': ['unga-resolution-181', 'civil-war-1947-1948'],
    'causes-of-1948-exodus': ['palestinian-refugees-1947-1949'],
    'war-1967-and-territories': ['six-day-war-1967', 'unsc-resolution-242', 'israeli-law-applied-to-east-jerusalem-1967'],
    'settlements-international-law': ['west-bank-settlement', 'east-jerusalem-settlement'],
    'first-intifada': ['first-intifada-1987-1993'],
    'oslo-and-camp-david-2000': ['oslo-i-declaration-of-principles', 'oslo-ii-interim-agreement-1995', 'camp-david-summit-2000'],
    'second-intifada-causes': ['second-intifada-2000-2005'],
    'gaza-disengagement-blockade-hamas': ['gaza-disengagement-2005', 'hamas-takeover-of-gaza-2007', 'gaza-declared-hostile-territory-2007', 'gaza-war-2008-2009', 'gaza-war-2014'],
    'october-7-and-gaza-war': ['october-7-attack-2023', 'gaza-war-2023', 'gaza-ceasefire-october-2025', 'board-of-peace-hamas-disarmament-agreement-2026'],
    'temple-mount-haram-al-sharif': ['israeli-law-applied-to-east-jerusalem-1967', 'jerusalem-law-1980', 'israel-jordan-peace-treaty-1994', 'us-recognition-of-jerusalem-2017'],
}

def import_perspectives():
    d = load(os.path.join(RES, 'perspectives.json'))
    add_sources(d['sources'])
    out = []
    for p in d['perspectives']:
        accounts = []
        for a in p['accounts']:
            summ = dict(a['summary']); summ['en'] = marker_before_stop(summ['en'])
            accounts.append({'perspective': a['perspective'], 'label': loc(a['label']), 'summary': loc(summ), 'sources': refs(a['sources'])})
        about = PERSPECTIVE_ABOUT.get(p['id'], p.get('about'))
        out.append(clean({'id': p['id'], 'title': loc(p['title']), 'about': about, 'accounts': accounts,
                          'notes': loc(p['notes']) if isinstance(p.get('notes'), str) and p['notes'] else loc(p.get('notes'))}))
    write(os.path.join(DATA, 'perspectives.json'), {'$schema': '../schema/perspectives.schema.json', 'perspectives': out})
    print('perspectives', len(out), '| accounts', sum(len(p['accounts']) for p in out))

# Proposed corrections not applied until a second source confirms them.
HOLD = {('mamluk-sultanate-1', 'end'), ('ayyubid-sultanate-4', 'start')}

def apply_m8(name):
    """Apply a Milestone 8 patch file: extra sources for existing records and reviewed corrections."""
    d = load(os.path.join(RES, f'm8-{name}.json'))
    # Stubs for sources already in the project carry only a new verification note: add the note, keep the entry.
    for st in [x for x in d['sources'] if x.get('existing')]:
        if st['id'] in sources:
            v = sources[st['id']]['verification']
            v['note'] = (v.get('note', '') + ' | Re-read in Milestone 8: ' + (st.get('verification') or {}).get('note', '')).strip()
    fresh = [x for x in d['sources'] if not x.get('existing')]
    for x in fresh:
        # A user upload of a copyrighted book on a public archive is not an authorised copy: read, cited, never linked.
        note = (x.get('verification') or {}).get('note', '')
        if ('user upload' in note.lower() or 'unauthori' in note.lower()) and x.get('url'):
            x['url'] = ''
            x['verification']['note'] = note + ' Read in a third-party copy of uncertain licensing status, which this project does not link.'
    add_sources(fresh)
    cache = {}
    def open_file(f):
        if f not in cache:
            if f.endswith('.geojson'):
                for sub in ('territories', 'culture-zones'):
                    path = os.path.join(DATA, sub, f)
                    if os.path.exists(path): break
            else:
                path = os.path.join(DATA, f)
            cache[f] = (path, load(path))
        return cache[f][1]
    def find(f, rid):
        doc = open_file(f)
        if f.endswith('.geojson'):
            return next((x['properties'] for x in doc['features'] if x['properties'].get('id') == rid), None)
        coll = next(v for k, v in doc.items() if isinstance(v, list))
        return next((x for x in coll if x.get('id') == rid), None)
    added = changed = missing = 0
    log = []
    for pt in d['patches']:
        rec = find(pt['file'], pt['id'])
        if rec is None: missing += 1; log.append(f"  not found: {pt['file']} {pt['id']}"); continue
        new = refs(pt.get('add_sources'))
        changes = ([pt['proposed_change']] if pt.get('proposed_change') else []) + (pt.get('more_proposed_changes') or [])
        for ch in changes: new += refs(ch.get('sources'))
        have = {(r['ref'], r.get('locator'), r.get('quote')) for r in rec.get('sources', [])}
        for r in new:
            key = (r['ref'], r.get('locator'), r.get('quote'))
            if key not in have: rec.setdefault('sources', []).append(r); have.add(key); added += 1
        for ch in changes:
            field = ch['field'].split(' ')[0]
            if (pt['id'], field) in HOLD:
                log.append(f"  held back (single source): {pt['file']} {pt['id']} {field}"); continue
            to = ch['to']
            if field in ('notes', 'description'):
                text = to['en'] if isinstance(to, dict) else to
                rec[field] = {'en': text}          # older Arabic/Hebrew drafts no longer match; retranslated later
            elif field == 'date' and isinstance(to, dict) and 'date' in to:
                rec['date'] = to['date']
                if to.get('end'): rec['end'] = to['end']
            else:
                rec[field] = to
            changed += 1
            log.append(f"  changed {pt['file']} {pt['id']} {field}")
    for f, (path, doc) in cache.items():
        write(path, doc)
    print(f'm8-{name}: {added} source references added, {changed} corrections applied, {missing} records not found')
    print('\n'.join(log))

def import_m8a(): apply_m8('a')
def import_m8b(): apply_m8('b')
def import_m8c(): apply_m8('c')
def import_m8d(): apply_m8('d')

# ---------------------------------------------------------------- run
for w in WANT:
    globals()[f'import_{w}']()
save_sources()
print('sources now', len(sources), '| aliased', alias)
