"""Build image prompts for labelled AI "artist's impressions" of ancient peoples, and optionally generate them.

Usage:
  python3 -I gen_ai_impressions.py <research_dir> <out_dir>                 # write prompts.json only
  python3 -I gen_ai_impressions.py <research_dir> <out_dir> --generate [--model gpt-image-1] [--only id,id]

The prompts come from the sourced briefs in <research_dir>/m9-img.json ("ai_briefs"): every detail in a prompt is
one the sources support, plus the brief's "avoid" list. Images are written to <out_dir> for review; nothing is added
to the site until a person has looked at each image and it is recorded in data/peoples.json as kind "ai-impression"
(the validator refuses AI impressions of groups that exist today). The API key is read from the environment
variable OPENAI_API_KEY or from a line OPENAI_API_KEY=... in .env.local in the project folder (never committed).
"""
import base64, json, os, sys, urllib.request

RES, OUT, *FLAGS = sys.argv[1:]
GENERATE = '--generate' in FLAGS
MODEL = FLAGS[FLAGS.index('--model') + 1] if '--model' in FLAGS else 'gpt-image-1'
ONLY = set(FLAGS[FLAGS.index('--only') + 1].split(',')) if '--only' in FLAGS else None

STYLE = (
    'Educational illustration for a history museum, painterly realism, muted natural colours, soft daylight. '
    'An everyday scene seen from a medium distance; faces are not the focus. People of varied, natural appearance. '
    'No text, no captions, no labels, no logos, no modern objects.'
)


def year(h):
    y = h['year']
    return f'{-y} BCE' if y < 0 else f'{y} CE'


def prompt(b):
    when = f"around {year(b['period']['start'])}" + (f" to {year(b['period']['end'])}" if b['period'].get('end') else '')
    details = ' '.join(d['en'].rstrip('.') + '.' for d in b.get('details', []))
    avoid = '; '.join(b.get('avoid', []))
    return f"{b['scene']['en'].rstrip('.')}, in the southern Levant {when}. Details supported by the evidence: {details} {STYLE} Do not show: {avoid}."


def api_key():
    if os.environ.get('OPENAI_API_KEY'):
        return os.environ['OPENAI_API_KEY']
    env = os.path.join(os.path.dirname(__file__), '..', '..', '.env.local')
    if os.path.exists(env):
        for line in open(env):
            if line.strip().startswith('OPENAI_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    return None


briefs = json.load(open(os.path.join(RES, 'm9-img.json'))).get('ai_briefs', [])
os.makedirs(OUT, exist_ok=True)
prompts = {b['people']: {'prompt': prompt(b), 'based_on': b.get('based_on', []), 'label': b.get('label')} for b in briefs}
json.dump(prompts, open(os.path.join(OUT, 'prompts.json'), 'w'), ensure_ascii=False, indent=2)
print(f'{len(prompts)} prompts written to {OUT}/prompts.json')

if GENERATE:
    key = api_key()
    if not key:
        sys.exit('No OPENAI_API_KEY found (environment or .env.local).')
    for pid, p in prompts.items():
        if ONLY and pid not in ONLY:
            continue
        dest = os.path.join(OUT, f'{pid}.png')
        if os.path.exists(dest):
            print('exists, skipped:', pid)
            continue
        body = json.dumps({'model': MODEL, 'prompt': p['prompt'], 'size': '1536x1024', 'n': 1}).encode()
        req = urllib.request.Request('https://api.openai.com/v1/images/generations', data=body,
                                     headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.load(r)['data'][0]
        except urllib.error.HTTPError as e:
            print('failed:', pid, e.code, e.read()[:300])
            continue
        if data.get('b64_json'):
            open(dest, 'wb').write(base64.b64decode(data['b64_json']))
        elif data.get('url'):
            urllib.request.urlretrieve(data['url'], dest)
        print('generated:', pid)
