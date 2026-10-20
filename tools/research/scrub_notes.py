"""Remove research-workflow download paths (e.g. 'm8b_dl/ia/x.txt') from source verification notes.
Usage: python3 -I scrub_notes.py <project>"""
import json, os, re, sys

P = r'(?:scratchpad |research/)?m8[a-g]?_dl/[^ ,;)"]*'
ANY = r'(?:research/|_late_work/)?(?:[\w-]+/)?[\w-]+_dl/[^ ,;)"]*'
VOL = {'1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI'}

def scrub(n):
    n = re.sub(r' from ' + r'(?:scratchpad |research/)?m8[a-g]?_dl/hoc/hoc(\d)\.txt:',
               lambda m: f' from the OCR text of History of the Crusades vol. {VOL[m.group(1)]}:', n)
    n = re.sub(r' \(' + P + r'\)', '', n)
    n = re.sub(r'\(' + P + r', ', '(', n)
    n = re.sub(r', (OCR text downloaded earlier), ' + P, r', \1', n)
    n = re.sub(r'; copy saved as ' + P, '', n)
    n = re.sub(r' \(copy saved as ' + P + r'\)', '', n)
    n = n.replace('Re-read in Milestone 8: Re-read in M8c (group F)', 'Re-read in Milestone 8 (group F)')
    # Any other parenthetical that only records where a working copy was saved.
    n = re.sub(r' \([^()]*?' + ANY + r'[^()]*?\)', '', n)
    return n

if __name__ == '__main__':
    path = os.path.join(sys.argv[1], 'data', 'sources.json')
    d = json.load(open(path))
    k = 0
    for s in d['sources']:
        v = s.get('verification') or {}
        if v.get('note'):
            new = scrub(v['note'])
            if new != v['note']: v['note'] = new; k += 1
    left = [s['id'] for s in d['sources'] if re.search(r'_dl/', (s.get('verification') or {}).get('note', ''))]
    open(path, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print('scrubbed', k, '| still containing paths:', left)
