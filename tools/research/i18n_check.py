"""Check that machine-drafted translations sit under the right keys before merging.
Usage: python3 -I i18n_check.py <dir with chunk-NN.json and chunk-NN.out.json> [chunk numbers...]
Flags: missing keys, extra keys, citation-marker mismatches, numbers in the English that do not appear in the
translation (Western digits are kept by the brief), and implausible length ratios.
"""
import glob, json, os, re, sys

D = sys.argv[1]
want = set(sys.argv[2:])
num = lambda s: sorted(re.findall(r'\d{2,}', (s or '').replace(',', '')))
markers = lambda s: sorted(re.findall(r'\[\d+\]', s or ''))
total = bad_n = 0
for f in sorted(glob.glob(os.path.join(D, 'chunk-*.json'))):
    if '.out.' in f: continue
    n = re.search(r'chunk-(\d+)', f).group(1)
    if want and n not in want: continue
    out = f.replace('.json', '.out.json')
    if not os.path.exists(out): print(f'chunk-{n}: no output yet'); continue
    src = {x['k']: x for x in json.load(open(f))}
    tr = {x['k']: x for x in json.load(open(out))}
    probs = []
    for k in set(src) - set(tr): probs.append(('missing', k, ''))
    for k in set(tr) - set(src): probs.append(('extra', k, ''))
    for k, s in src.items():
        t = tr.get(k)
        if not t: continue
        for lang in s['need']:
            x = t.get(lang) or ''
            total += 1
            if not x: probs.append(('empty', k, lang)); continue
            if markers(x) != markers(s['en']): probs.append(('markers', k, lang))
            en_nums = num(s['en'])
            if en_nums and not set(en_nums) <= set(num(x)):
                probs.append(('numbers', k, f"{lang}: en {en_nums[:6]} vs {num(x)[:6]}"))
            r = len(x) / max(1, len(s['en']))
            if len(s['en']) > 40 and (r < 0.35 or r > 2.2): probs.append(('length', k, f'{lang} ratio {r:.2f}'))
    bad_n += len(probs)
    print(f'chunk-{n}: {len(src)} items, {len(probs)} flags')
    for p in probs[:12]: print('   ', *p)
print(f'checked {total} translations, {bad_n} flags')
