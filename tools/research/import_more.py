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
        auth = lambda x: {re.sub(r'[^a-z]', '', a.lower().split(',')[0]) for a in x.get('authors') or []}
        if same and auth(s) and auth(sources[same]) and not (auth(s) & auth(sources[same])):
            same = None  # same page, different signed entry (e.g. two encyclopedia articles on one page)
        if same and s.get('container') and sources[same].get('container') and norm(s['container'])[:30] != norm(sources[same]['container'])[:30]:
            same = None  # same page, a different reference work
        if same and s.get('year') and sources[same].get('year') and s['year'] != sources[same]['year'] and auth(s) != auth(sources[same]):
            same = None  # same page, a different work and year (e.g. EJ 2007 and Encyclopedia of World Cultures 1995)
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
RANK = {'catalogue-only': 0, 'cited-via': 1, 'excerpt': 2, 'full-text': 3}
HOLD = {('mamluk-sultanate-1', 'end'), ('ayyubid-sultanate-4', 'start'),
        # Group F: the calibrated Natufian date lies before the timeline's start (moved to the place's founding note by hand);
        # the 1777/1778 Hasidic start is recorded as a range by hand.
        ('natufian-settlement-jericho', 'date'), ('natufian-settlement-jericho', 'notes'), ('hasidic-perushim-immigration', 'start'),
        # Round H1: 'earliest' is not a date field in the schema (recorded in notes instead); a new Sidon relation is inserted by hand.
        ('tyre', 'start'), ('sidon', 'start'), ('sidon', 'relations')}

def apply_m8(name):
    """Apply a Milestone 8 patch file: extra sources for existing records and reviewed corrections."""
    d = load(os.path.join(RES, f'm8-{name}.json'))
    # Stubs for sources already in the project carry only a new verification note: add the note, keep the entry.
    for st in [x for x in d['sources'] if x.get('existing')]:
        if st['id'] in sources:
            v = sources[st['id']]['verification']
            v['note'] = (v.get('note', '') + ' | Re-read in Milestone 8: ' + (st.get('verification') or {}).get('note', '')).strip()
            lv = (st.get('verification') or {}).get('level')
            if lv and RANK.get(lv, -1) > RANK.get(v.get('level'), -1): v['level'] = lv
    fresh = [x for x in d['sources'] if not x.get('existing')]
    for x in fresh:
        # A user upload of a copyrighted book on a public archive is not an authorised copy: read, cited, never linked.
        note = (x.get('verification') or {}).get('note', '')
        if re.search(r'user upload|unauthori|not authori|uncertain licensing|lending library|third-party copy', note, re.I) and x.get('url'):
            x.pop('url', None)
            x['verification']['note'] = note + ' Read in a third-party copy of uncertain licensing status, which this project does not link.'
    add_sources(fresh)
    cache = {}
    def open_file(f):
        f = f.split('/')[-1] if f.startswith(('territories/', 'culture-zones/')) else f
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
        for k, coll in doc.items():
            if isinstance(coll, list):
                hit = next((x for x in coll if isinstance(x, dict) and x.get('id') == rid), None)
                if hit is not None: return hit
        return None
    added = changed = missing = 0
    log = []
    for pt in d.get('patches', []):
        rec = find(pt['file'], pt['id'])
        if rec is not None and pt.get('subpath'):
            # e.g. "relations[8]", "periods[2]", "destroyed[0]", "holy_site.traditions.jewish"
            for tok in re.findall(r'[^.\[\]]+|\[\d+\]', pt['subpath']):
                if rec is None: break
                if tok.startswith('['):
                    i = int(tok[1:-1]); rec = rec[i] if isinstance(rec, list) and i < len(rec) else None
                else:
                    rec = rec.get(tok) if isinstance(rec, dict) else None
        if rec is not None and pt.get('relation') is not None:
            rels = rec.get('relations') or []
            rec = rels[pt['relation']] if 0 <= pt['relation'] < len(rels) else None
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
            mode = ch.get('mode')
            if mode == 'delete-sentence':
                cur = (rec.get(field) or {}).get('en', '') if isinstance(rec.get(field), dict) else (rec.get(field) or '')
                frm = ch.get('from') or ''
                if not frm or frm not in cur:
                    log.append(f"  sentence to delete not found, skipped: {pt['id']} {field}"); continue
                text = re.sub(r'\s{2,}', ' ', cur.replace(frm, '')).strip()
                if text: rec[field] = {'en': text}
                else: rec.pop(field, None)
                changed += 1; log.append(f"  deleted sentence {pt['id']} {field}"); continue
            if mode in ('replace-ref', 'replace-quote'):
                frm = ch.get('from') or {}
                cits = rec.get('sources') or []
                i = next((k for k, c in enumerate(cits) if c.get('ref') == frm.get('ref') and (c.get('quote') or '') == (frm.get('quote') or '')), None)
                if i is None:
                    log.append(f"  citation to replace not found, skipped: {pt['id']} {frm.get('ref')}"); continue
                new_cits = [tidy_quote(r) for r in refs(to if isinstance(to, list) else [to])]
                rec['sources'] = cits[:i] + new_cits + cits[i + 1:]
                changed += 1; log.append(f"  {mode} {pt['id']} {frm.get('ref')} -> {[c['ref'] for c in new_cits]}"); continue
            if mode == 'remove-item':
                lst = rec.get(field) or []
                if ch.get('from') not in lst:
                    log.append(f"  item to remove not found, skipped: {pt['id']} {field}"); continue
                lst.remove(ch['from'])
                if lst: rec[field] = lst
                else: rec.pop(field, None)
                changed += 1; log.append(f"  removed item {pt['id']} {field}"); continue
            if mode == 'set' and ch.get('from') is not None and rec.get(field) != ch['from']:
                log.append(f"  current value differs, skipped: {pt['id']} {field}"); continue
            if field in ('notes', 'description', 'contested_note', 'summary') or mode in ('append', 'replace-sentence'):
                text = to['en'] if isinstance(to, dict) else to
                cur = (rec.get(field) or {}).get('en', '') if isinstance(rec.get(field), dict) else (rec.get(field) or '')
                mode = ch.get('mode')
                if mode == 'append':
                    text = (cur + ' ' + text).strip()
                elif mode == 'replace-sentence':
                    frm = ch.get('from') or ''
                    if frm and frm in cur: text = cur.replace(frm, text)
                    else:
                        log.append(f"  sentence to replace not found, skipped: {pt['id']} {field}"); continue
                rec[field] = {'en': text}          # older Arabic/Hebrew drafts no longer match; retranslated later
            elif re.fullmatch(r'sources\[(\d+)\]\.ref', ch['field']):
                i = int(re.search(r'\d+', ch['field']).group())
                cit = (rec.get('sources') or [])[i] if i < len(rec.get('sources') or []) else None
                if not cit or cit['ref'] != ch.get('from'):
                    log.append(f"  citation not as expected, skipped: {pt['id']} {ch['field']}"); continue
                cit['ref'] = to
            elif '.' in ch['field'] and not ch['field'].startswith('sources['):
                # Nested field, e.g. destination.label.en: set it; a changed English text drops its old drafts.
                *path, last = ch['field'].split('.')
                node = rec
                for k in path: node = node.setdefault(k, {})
                if last == 'en' and isinstance(node, dict):
                    for l in ('ar', 'he', 'translation_status'): node.pop(l, None)
                node[last] = to
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

def lz(v):
    """Localized text from a string or {en,...}."""
    if v is None or v == '': return None
    return loc(v if isinstance(v, dict) else {'en': str(v)})

def import_m8g():
    """New records for known gaps (polities, territories, rulers, languages), then patches to existing records.
    Proposed territory slices for existing polities are listed for review, not applied here."""
    d = load(os.path.join(RES, 'm8-g.json'))
    apply_m8('g')          # sources (incl. stubs and unauthorised-copy handling) and patches
    pol_path = os.path.join(DATA, 'polities.json'); P = load(pol_path)
    have = {x['id'] for x in P['polities']}
    added = []
    for x in d.get('new_polities', []):
        if x['id'] in have: print('  polity exists, skipped:', x['id']); continue
        q = dict(x)
        q['name'] = lz(x['name']); q['notes'] = lz(x.get('notes')); q['sources'] = [tidy_quote(r) for r in refs(x.get('sources'))]
        q['relations'] = [clean({**r, 'sources': refs(r.get('sources')), 'notes': lz(r.get('notes'))}) for r in x.get('relations') or []]
        P['polities'].append(clean(q)); have.add(x['id']); added.append(x['id'])
    write(pol_path, P)
    for t in d.get('new_territories', []):
        path = os.path.join(DATA, 'territories', t['file'])
        doc = load(path) or {'$schema': '../../schema/territory.schema.json', 'type': 'FeatureCollection', 'features': []}
        ids = {f['properties'].get('id') for f in doc['features']}
        for f in t['features']:
            pr = dict(f['properties'])
            if pr.get('id') in ids: print('  territory exists, skipped:', pr.get('id')); continue
            pr['description'] = lz(pr.get('description')); pr['notes'] = lz(pr.get('notes'))
            pr['sources'] = [tidy_quote(r) for r in refs(pr.get('sources'))]
            doc['features'].append({'type': 'Feature', 'geometry': None, 'properties': clean(pr)})
        write(path, doc)
    R = load(os.path.join(DATA, 'rulers.json')); rid = {x['id'] for x in R['rulers']}
    for x in d.get('new_rulers', []):
        if x['id'] in rid: print('  ruler exists, skipped:', x['id']); continue
        R['rulers'].append(clean({**x, 'name': lz(x['name']), 'office': lz(x.get('office')), 'notes': lz(x.get('notes')),
                                  'sources': [tidy_quote(r) for r in refs(x.get('sources'))]}))
    write(os.path.join(DATA, 'rulers.json'), R)
    L = load(os.path.join(DATA, 'languages.json')); lid = {x['id'] for x in L['languages']}
    for x in d.get('new_languages', []):
        if x['id'] in lid: print('  language exists, skipped:', x['id']); continue
        L['languages'].append(clean({**x, 'name': lz(x['name']), 'notes': lz(x.get('notes')), 'sources': refs(x.get('sources')),
                                     'periods': [clean({**pp, 'speakers': lz(pp.get('speakers')), 'sources': refs(pp.get('sources'))}) for pp in x['periods']]}))
    write(os.path.join(DATA, 'languages.json'), L)
    print('new polities:', ', '.join(added) or '-', '| new territory files/features:', sum(len(t['features']) for t in d.get('new_territories', [])),
          '| new rulers:', len(d.get('new_rulers', [])), '| new languages:', len(d.get('new_languages', [])),
          '| proposed slices for review:', len(d.get('proposed_territories', [])))

def import_m8h(name):
    """Round H: patches (incl. relation patches), then new records given as {"file", "record"}."""
    d = load(os.path.join(RES, f'm8-{name}.json'))
    apply_m8(name)
    for nr in d.get('new_records', []):
        f, rec = nr['file'], nr['record']
        if f.endswith('.geojson'):
            path = os.path.join(DATA, 'territories', f)
            doc = load(path) if os.path.exists(path) else {'$schema': '../../schema/territory.schema.json', 'type': 'FeatureCollection', 'features': []}
            pr = dict(rec.get('properties', rec))
            if pr.get('id') in {x['properties'].get('id') for x in doc['features']}: print('  exists, skipped:', pr.get('id')); continue
            pr['description'] = lz(pr.get('description')); pr['notes'] = lz(pr.get('notes'))
            pr['sources'] = [tidy_quote(r) for r in refs(pr.get('sources'))]
            doc['features'].append({'type': 'Feature', 'geometry': None, 'properties': clean(pr)})
            write(path, doc); print('  new territory slice', pr.get('id'))
        else:
            path = os.path.join(DATA, f); doc = load(path)
            coll = next(v for k, v in doc.items() if isinstance(v, list))
            if rec['id'] in {x['id'] for x in coll}: print('  exists, skipped:', rec['id']); continue
            q = dict(rec)
            for k in ('name', 'notes', 'office', 'description'):
                if k in q: q[k] = lz(q[k])
            q['sources'] = [tidy_quote(r) for r in refs(q.get('sources'))]
            if 'relations' in q:
                q['relations'] = [clean({**r, 'sources': refs(r.get('sources')), 'notes': lz(r.get('notes'))}) for r in q['relations'] or []]
            coll.append(clean(q)); write(path, doc); print('  new record', f, rec['id'])

def import_m8h1(): import_m8h('h1')
def import_m8h2(): import_m8h('h2')
def import_m8h3(): import_m8h('h3')
def import_m8h4(): import_m8h('h4')
def import_m8i1(): import_m8h('i1')
def import_m8i2(): import_m8h('i2')
def import_m8i3(): import_m8h('i3')
def import_m8i3ls(): import_m8h('i3ls')
def import_m8j1(): import_m8h('j1')
def import_m8j2(): import_m8h('j2')
def import_m8j3(): import_m8h('j3')
def import_m8k1(): import_m8h('k1')
def import_m8k2(): import_m8h('k2')
def import_m9(name):
    """Milestone 9: peoples, the links between them, and perspectives topics, into data/peoples.json and data/perspectives.json."""
    d = load(os.path.join(RES, f'm9-{name}.json'))
    # Sources (stubs, new entries, unlinking of unauthorised copies) go through the shared Milestone 8 path.
    write(os.path.join(RES, f'm8-m9{name}-sources.json'), {'sources': d.get('sources', []), 'patches': []})
    apply_m8(f'm9{name}-sources')
    path = os.path.join(DATA, 'peoples.json')
    doc = load(path) if os.path.exists(path) else {'$schema': '../schema/peoples.schema.json', 'peoples': [], 'links': []}
    have = {x['id'] for x in doc['peoples']}
    for x in d.get('peoples', []):
        if x['id'] in have: print('  people exists, skipped:', x['id']); continue
        q = dict(x)
        for k in ('name', 'homeland', 'summary', 'notes'): q[k] = lz(q.get(k))
        q['sources'] = [tidy_quote(r) for r in refs(q.get('sources'))]
        q['related'] = clean({k: v for k, v in (q.get('related') or {}).items() if v})
        doc['peoples'].append(clean(q)); have.add(x['id'])
    lhave = {x['id'] for x in doc['links']}
    for x in d.get('links', []):
        if x['id'] in lhave: print('  link exists, skipped:', x['id']); continue
        q = dict(x)
        for k in ('summary', 'notes'): q[k] = lz(q.get(k))
        dest = q.get('destination')
        if dest:
            q['destination'] = clean({'label': lz({k: v for k, v in dest.items() if k in ('en', 'ar', 'he')} if 'label' not in dest else dest['label']), 'coords': dest.get('coords')})
        if not q.get('to'): q.pop('to', None)
        q['sources'] = [tidy_quote(r) for r in refs(q.get('sources'))]
        doc['links'].append(clean(q)); lhave.add(x['id'])
    write(path, doc)
    if d.get('perspectives'):
        pp = os.path.join(DATA, 'perspectives.json'); P = load(pp); ph = {x['id'] for x in P['perspectives']}
        for x in d['perspectives']:
            if x['id'] in ph: print('  perspective exists, skipped:', x['id']); continue
            q = dict(x); q['title'] = lz(q['title']); q['notes'] = lz(q.get('notes'))
            q['accounts'] = [clean({**a, 'label': lz(a['label']), 'summary': lz(a['summary']), 'sources': refs(a['sources'])}) for a in x['accounts']]
            P['perspectives'].append(clean(q))
        write(pp, P)
    print(f"m9-{name}: {len(d.get('peoples', []))} peoples, {len(d.get('links', []))} links, {len(d.get('perspectives', []))} perspectives")

def import_m9p1(): import_m9('p1')
def import_m9p2(): import_m9('p2')
def import_m9p3(): import_m9('p3')

def import_m9q1(name='q1'):
    """Round M9b-Q1 (and Q4): religions and languages of each people, language descent, new languages and extra language periods."""
    d = load(os.path.join(RES, f'm9-{name}.json'))
    write(os.path.join(RES, f'm8-m9{name}-sources.json'), {'sources': d.get('sources', []), 'patches': []})
    apply_m8(f'm9{name}-sources')
    lp = os.path.join(DATA, 'languages.json'); L = load(lp); langs = {x['id']: x for x in L['languages']}
    def period(pr):
        return clean({**pr, 'speakers': lz(pr.get('speakers')), 'sources': [tidy_quote(r) for r in refs(pr.get('sources'))]})
    for x in d.get('new_languages', []):
        if x['id'] in langs: print('  language exists, skipped:', x['id']); continue
        q = dict(x); q['name'] = lz(q['name']); q['notes'] = lz(q.get('notes'))
        q['periods'] = [period(pr) for pr in q.get('periods', [])]
        if q.get('sources'): q['sources'] = [tidy_quote(r) for r in refs(q['sources'])]
        q.pop('lineage', None)
        L['languages'].append(clean(q)); langs[q['id']] = L['languages'][-1]; print('  new language', q['id'])
    for x in d.get('language_patches', []):
        rec = langs.get(x['language'])
        if not rec: print('  language patch, not found:', x['language']); continue
        for pr in x.get('add_periods', []):
            rec['periods'].append(period(pr)); print('  period added to', x['language'])
    for x in d.get('language_lineage', []):
        rec = langs.get(x['language'])
        bad = [i for i in x['descends_from'] if i not in langs or i == x['language']]
        if not rec or bad: print('  lineage skipped:', x['language'], bad); continue
        rec['lineage'] = {'descends_from': x['descends_from'], **clean({'note': lz(x.get('note')), 'sources': [tidy_quote(r) for r in refs(x['sources'])]})}
    write(lp, L)
    pp = os.path.join(DATA, 'peoples.json'); P = load(pp); peoples = {x['id']: x for x in P['peoples']}
    n = 0
    for x in d.get('people_attributes', []):
        rec = peoples.get(x['people'])
        if not rec: print('  people not found:', x['people']); continue
        rel = [clean({**r, 'label': lz(r['label']), 'note': lz(r.get('note')), 'sources': [tidy_quote(q) for q in refs(r['sources'])]}) for r in x.get('religions') or [] if r.get('sources')]
        lan = [clean({**r, 'note': lz(r.get('note')), 'sources': [tidy_quote(q) for q in refs(r['sources'])]}) for r in x.get('languages') or [] if r.get('sources')]
        unknown = [r['language'] for r in lan if r['language'] not in langs]
        if unknown: print('  unknown languages for', x['people'], unknown); lan = [r for r in lan if r['language'] in langs]
        if rel: rec['religions'] = rel
        if lan: rec['languages'] = lan
        n += 1
    write(pp, P)
    print(f"m9-{name}: attributes for {n} peoples, {len(d.get('language_lineage', []))} lineages, {len(d.get('new_languages', []))} new languages")

def import_m9q2(): apply_m8('m9q2')
def import_m9q4(): import_m9q1('q4')
def import_m9q3(): import_m9('q3')

UA = {'User-Agent': 'LevantThroughTime/1.0 (https://levantthroughtime.com; educational history map)'}
OPEN_LICENCE = re.compile(r'^(public domain|pd\b|cc0|cc[ -]by(-sa)?[ -]\d\.\d|no known restrictions)', re.I)

def http_json(url):
    import urllib.request
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)

def strip_html(t):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', t or '')).strip()

def import_m9img():
    """Real images for the peoples: licence re-checked against Wikimedia Commons, image downloaded into its own folder,
    converted to a web-sized JPEG in public/peoples/, and recorded with caption, credit, licence and identification sources."""
    import subprocess, urllib.parse, urllib.request
    d = load(os.path.join(RES, 'm9-img.json'))
    write(os.path.join(RES, 'm8-m9img-sources.json'), {'sources': d.get('sources', []), 'patches': []})
    apply_m8('m9img-sources')
    pp = os.path.join(DATA, 'peoples.json'); P = load(pp); peoples = {x['id']: x for x in P['peoples']}
    out_dir = os.path.join(DATA, '..', 'public', 'peoples'); os.makedirs(out_dir, exist_ok=True)
    dl_root = os.path.join(RES, 'downloads-img'); os.makedirs(dl_root, exist_ok=True)
    added, rejected = 0, []
    for im in d.get('images', []):
        pid = im.get('people'); rec = peoples.get(pid)
        iid = f"{pid}-{im.get('rank', 1)}"
        if not rec: rejected.append((iid, 'unknown people')); continue
        if any(x['id'] == iid for x in rec.get('images', [])): print('  image exists, skipped:', iid); continue
        lic, lic_url, credit, url = im.get('license', ''), im.get('license_url'), im.get('credit', ''), im.get('image_url')
        if im.get('commons_file'):
            title = im['commons_file'] if im['commons_file'].startswith('File:') else 'File:' + im['commons_file']
            q = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 900, 'format': 'json', 'titles': title})
            try:
                pages = http_json(q)['query']['pages']
            except Exception as e:
                rejected.append((iid, f'Commons API failed: {e}')); continue
            info = next(iter(pages.values())).get('imageinfo')
            if not info: rejected.append((iid, 'not found on Commons')); continue
            info = info[0]; md = info.get('extmetadata', {})
            lic = strip_html(md.get('LicenseShortName', {}).get('value')) or lic
            lic_url = md.get('LicenseUrl', {}).get('value') or lic_url
            artist = strip_html(md.get('Artist', {}).get('value'))
            credit = f"{artist}, via Wikimedia Commons" if artist else (credit or 'Wikimedia Commons')
            url = info.get('thumburl') or info.get('url')
            im['page_url'] = info.get('descriptionurl') or im.get('page_url')
        if re.match(r'^pd\b', lic or '', re.I): lic = 'Public domain'
        lic = re.sub(r'^cc[ -]by', 'CC BY', lic or '', flags=re.I)
        if not OPEN_LICENCE.search(lic or ''): rejected.append((iid, f'licence not open: {lic}')); continue
        if not url: rejected.append((iid, 'no image URL')); continue
        folder = os.path.join(dl_root, iid); os.makedirs(folder, exist_ok=True)
        raw = os.path.join(folder, 'original')
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(raw, 'wb') as f:
                f.write(r.read())
        except Exception as e:
            rejected.append((iid, f'download failed: {e}')); continue
        kind = subprocess.run(['file', '-b', '--mime-type', raw], capture_output=True, text=True).stdout.strip()
        if kind not in ('image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/gif'):
            rejected.append((iid, f'not an image: {kind}')); continue
        dest = os.path.join(out_dir, f'{iid}.jpg')
        conv = subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '78', '-Z', '900', raw, '--out', dest], capture_output=True, text=True)
        if conv.returncode != 0 or not os.path.exists(dest): rejected.append((iid, 'conversion failed')); continue
        # A small copy for the cards, so the gallery does not load 60 full-size pictures.
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '70', '-Z', '440', dest, '--out', dest.replace('.jpg', '-thumb.jpg')], capture_output=True)
        obj = im.get('object') or {}
        record = clean({
            'id': iid, 'file': f'peoples/{iid}.jpg', 'kind': im.get('kind', 'depiction'),
            'caption': lz(im.get('caption')), 'perspective': lz(im.get('perspective')),
            'object': clean({'what': lz(obj.get('what')), 'date': obj.get('date'), 'made_by': lz(obj.get('made_by')), 'where_now': obj.get('where_now')}) if obj.get('what') else None,
            'license': lic, 'license_url': lic_url if lic_url and lic_url.startswith('http') else None,
            'credit': credit[:300], 'page_url': im.get('page_url'),
            'confidence': im.get('confidence', 'estimated'),
            'sources': [tidy_quote(r) for r in refs(im.get('identification_sources'))],
        })
        if not record.get('sources'): rejected.append((iid, 'no identification source')); os.remove(dest); continue
        rec.setdefault('images', []).append(record); added += 1
    for x in P['peoples']:
        if x.get('images'): x['images'].sort(key=lambda r: r['id'])
    write(pp, P)
    print(f'm9-img: {added} images added; {len(rejected)} rejected')
    for r in rejected: print('  rejected', *r)

def import_m8e(): apply_m8('e')
def import_m8f(): apply_m8('f')

# ---------------------------------------------------------------- run
for w in WANT:
    globals()[f'import_{w}']()
save_sources()
print('sources now', len(sources), '| aliased', alias)
