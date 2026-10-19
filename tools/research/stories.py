"""Builds data/stories/*.json. Every source reference is either copied from an existing record in
/data (found by ref + the start of its quote) or is a new quote that must appear verbatim in a
downloaded source text under research/. Run: python3 -I stories.py <project> <research_dir>"""
import json, os, re, sys, glob

PROJ, RES = sys.argv[1], sys.argv[2]
DATA = os.path.join(PROJ, 'data')

# ---------------------------------------------------------------- index of existing quotes
existing = []
def walk(o):
    if isinstance(o, dict):
        if isinstance(o.get('ref'), str) and isinstance(o.get('quote'), str):
            existing.append({k: o[k] for k in ('ref', 'locator', 'quote', 'via') if k in o})
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in glob.glob(os.path.join(DATA, '*.json')) + glob.glob(os.path.join(DATA, 'territories', '*.geojson')):
    if f.endswith(('sources.json', 'config.json')): continue
    walk(json.load(open(f)))
source_ids = {s['id'] for s in json.load(open(os.path.join(DATA, 'sources.json')))['sources']}

texts = None
def norm(s): return re.sub(r'\s+([,.;:)])', r'\1', ' '.join(re.sub(r'<[^>]+>', ' ', s).split()))
def in_downloads(quote):
    global texts
    if texts is None:
        texts = []
        for root, _, fs in os.walk(RES):
            for f in fs:
                if f.endswith(('.txt', '.html', '.md')):
                    try: texts.append(norm(open(os.path.join(root, f), errors='ignore').read()))
                    except OSError: pass
    q = norm(quote)
    return any(q in t for t in texts)

missing = []
def Q(ref, quote, locator=None, new=False):
    """A source reference. Existing quotes are looked up by prefix; new ones are checked against downloads."""
    assert ref in source_ids, f'unknown source {ref}'
    if not new:
        for e in existing:
            if e['ref'] == ref and e['quote'].startswith(quote):
                return dict(e)
        missing.append((ref, quote)); return {'ref': ref, 'quote': quote}
    if not in_downloads(quote): missing.append((ref, quote))
    r = {'ref': ref, 'quote': quote}
    if locator: r['locator'] = locator
    return r
def L(ref, locator):
    assert ref in source_ids, f'unknown source {ref}'
    return {'ref': ref, 'locator': locator}


_records = {}
for f in glob.glob(os.path.join(DATA, '*.json')):
    if f.endswith(('sources.json', 'config.json')): continue
    for v in json.load(open(f)).values():
        if isinstance(v, list):
            for r in v:
                if isinstance(r, dict) and 'id' in r: _records.setdefault(r['id'], []).append(r)
def R(record_id, ref, quote=None):
    """Copy a source reference (by ref, optionally by quote prefix) from a record already in /data
    (ids can repeat across collections, e.g. an event and a migration; all are searched)."""
    for rec in _records[record_id]:
        for r in rec.get('sources', []):
            if r['ref'] == ref and (quote is None or (r.get('quote') or '').startswith(quote)):
                return {k: r[k] for k in ('ref', 'locator', 'quote', 'via') if k in r}
    raise SystemExit(f'no source {ref} {quote!r} in {record_id}')

def step(year, title, card, sources, month=None, view=None, layers=None, highlight=None, duration=14):
    d = {'year': year}
    if month: d['month'] = month
    s = {'date': d}
    if view: s['view'] = {'center': view[0], 'zoom': view[1]}
    if layers: s['layers'] = layers
    if highlight: s['highlight'] = highlight
    s.update({'title': {'en': title}, 'card': {'en': card}, 'sources': sources, 'duration_s': duration})
    return s

WIDE = ([35.6, 31.6], 6.3)
POL = ['territories', 'places', 'holy', 'conflicts', 'landscape']
JER = ([35.232, 31.777], 10.5)

stories = {}

# ================================================================ 1. 12,000 years in 5 minutes
stories['twelve-thousand-years'] = {
    'title': {'en': '12,000 years in 5 minutes'},
    'summary': {'en': 'A fast pass through the whole timeline, from the first villages to today, one stop per era.'},
    'steps': [
        step(-9500, 'Foragers and the first villages',
             'The Middle Stone Age here is best known from the Natufian culture, excavated at ʿAin Mallaha and Jericho [1]. '
             'The Pre-Pottery Neolithic A that followed lasted about 1,000 years, roughly 40 generations [2]. '
             'By about 8000 BCE the people of Jericho had built a massive stone wall around their settlement [3].',
             [Q('britannica-palestine-history', 'The Mesolithic Period'), Q('goring-morris-belfer-cohen-2011', 'a mere 1,000 calendrical years'),
              Q('britannica-jericho', 'By about 8000 bce')], view=WIDE, layers=['territories', 'places', 'landscape']),
        step(-7500, 'Farming villages spread',
             'Villages of the Pre-Pottery Neolithic B were first founded in a narrow north–south corridor on the western edge of the Transjordanian plateau [1]. '
             'At Jericho, a new group arrived around 7000 BCE with a culture that was still Neolithic and did not yet make pottery [2].',
             [Q('goring-morris-belfer-cohen-2011', 'The southern Levant settlements were initially founded'), Q('britannica-jericho', 'These occupants were succeeded')],
             view=WIDE, layers=['territories', 'places', 'landscape']),
        step(-4200, 'The Copper Age',
             'Ghassulian (Chalcolithic) settlements lay mainly in the south, with an extension up the coastal plain [1]. '
             'Occupation had ended at almost all the major Chalcolithic centres by 3800/3700 BCE [2].',
             [Q('britannica-palestine-history', 'The region in which the Ghassulian'), Q('bourke-et-al-2004-ghassul', 'Chalcolithic period occupation had ceased')],
             view=WIDE, layers=['territories', 'places', 'landscape']),
        step(-2700, 'The first towns',
             'In the Early Bronze Age the towns were probably independent city-states, except where Egypt may at times have held loose control [1]. '
             'By about the 23rd century BCE, urban life had come to an end [2].',
             [Q('britannica-palestine-history', 'Palestine’s towns presumably remained independent'), Q('britannica-palestine-history', 'By about the 23rd century BCE')],
             view=WIDE, layers=POL),
        step(-1400, 'Egyptian rule in Canaan',
             'Shortly before 1515 BCE Egyptian armies began to conquer the land [1]. '
             'Egypt ran it as its district of Canaan, from the Egyptian border to Byblos [2]. '
             'Local city-states such as Shechem and Jerusalem pressed on Egyptian strongholds like Beth-shean, which linked to Egyptian centres at Jaffa and Gaza [3].',
             [Q('britannica-palestine-history', 'Shortly before the death of Ahmose I'), Q('britannica-palestine-history', 'The third district (Canaan)'),
              Q('finkelstein-2013-forgotten-kingdom', 'The Shechem coalition put pressure')], view=WIDE, layers=POL),
        step(-1150, 'Philistines on the coast',
             'Around 1190 BCE the Philistines appear in Egyptian records as one of the Sea Peoples [1]. '
             'They founded five city-states on the southern coast: Gaza, Ashkelon, Ashdod, Gath and Ekron [2].',
             [Q('britannica-philistine', 'they appear under the name prst'), Q('britannica-philistine', 'The area contained the five cities')], view=WIDE, layers=POL),
        step(-850, 'Israel and Judah',
             'From the late 10th century BCE two kingdoms existed side by side: Israel in the north and Judah, under the Davidic dynasty, in the south [1][2]. '
             'Assyrian records name Ahab of Israel in a coalition that fought Shalmaneser III in 853/852 BCE [3].',
             [Q('finkelstein-2013-forgotten-kingdom', 'Jeroboam I: 931–909'), Q('britannica-israel-kingdom', 'The southern kingdom, ruled by the Davidic dynasty'),
              Q('britannica-israel-kingdom', 'Ahab the Israelite')], view=WIDE, layers=POL),
        step(-715, 'Assyria',
             'In 733 BCE the Assyrian king Tiglath-pileser III devastated Israel and took large parts of its territory [1]. '
             'After Samaria fell in 722–720 BCE, Israel became an Assyrian province and its upper class was deported [2][3].',
             [Q('britannica-mesopotamia-neo-assyrian', 'In 733 Tiglath-pileser'), Q('finkelstein-2013-forgotten-kingdom', 'Samaria was captured by Assyria'),
              Q('britannica-mesopotamia-neo-assyrian', 'The Samarian upper class was deported')], view=WIDE, layers=POL),
        step(-586, 'Babylon',
             'Nebuchadnezzar II of Babylon captured Jerusalem in 597 BCE and deported Judah’s king, Jehoiachin [1]. '
             'About 587/586 BCE the city was stormed and destroyed, and prominent citizens were deported [2][3].',
             [Q('britannica-nebuchadnezzar-ii', 'He attacked Judah a year later'), Q('britannica-palestine-iron-age', 'Jerusalem was twice besieged'),
              Q('britannica-nebuchadnezzar-ii', 'The siege of Jerusalem ended')], view=WIDE, layers=POL),
        step(-450, 'Persian rule',
             'Cyrus of Persia decreed around 538 BCE that Judah be restored and the Temple in Jerusalem rebuilt [1]. '
             'Seals of the late 6th and early 5th centuries name a province of Judah (Yehud), although some scholars date the province itself only to the end of the 5th century [2][3].',
             [Q('britannica-palestine-iron-age', 'One of Cyrus’s first acts'), Q('iranica-eber-nari', 'Bullae and seal impressions'),
              Q('stern-yehud-vision-reality', 'The province of Yehud was founded only')], view=WIDE, layers=POL),
        step(-130, 'Greeks and Hasmoneans',
             'Alexander the Great, passing south towards Egypt, took the coastal cities that could serve the Persian fleet [1]. '
             'In 142 BCE Simon the Hasmonean won recognition from the Seleucid king, and Judea came to be ruled by hereditary high priests [2][3].',
             [Q('britannica-palestine-hellenistic', 'he confined his attention'), Q('schiffman-1991', 'In 142 B.C.E. Simon gained recognition'),
              Q('britannica-hasmonean-dynasty', 'He soon became independent')], view=WIDE, layers=POL),
        step(140, 'Rome',
             'The lands ruled by Herod’s son Archelaus — Judaea, Samaria and Edom — became the Roman province of Judaea [1]. '
             'Jerusalem was sacked in 70 CE [2]. '
             'After the Bar Kokhba revolt the province was renamed Syria Palaestina; the earliest dated evidence of the new name is from 139 CE, and the reason for the change is debated [3][4][5].',
             [Q('britannica-palestine-hasmonean-herodian', 'The region under Archelaus'), Q('britannica-palestine-roman-to-fatimid', 'removed after the sack of Jerusalem in 70 ce', locator='Roman Palestine (illustration caption)', new=True),
              Q('britannica-palestine-roman-to-fatimid', 'The province of Judaea was renamed'), Q('barron-judaism-rome-cil-xvi-87', 'it is the earliest material evidence'),
              Q('feldman-1990-name-palestine', 'there is only circumstantial evidence')], view=WIDE, layers=POL),
        step(500, 'Christian Byzantium',
             'After Constantine I converted to Christianity early in the 4th century, a new era of prosperity began for Palestine [1]. '
             'The emperor built a church on the site of the Holy Sepulchre, and the land drew pilgrims from all parts of the empire [2][3].',
             [Q('britannica-palestine-roman-to-fatimid', 'After Constantine I converted to Christianity', locator='Roman Palestine', new=True),
              Q('britannica-palestine-roman-to-fatimid', 'The emperor himself built a magnificent church on the site of the Holy Sepulchre', locator='Roman Palestine', new=True),
              Q('britannica-palestine-roman-to-fatimid', 'Palestine began to attract floods of pilgrims from all parts of the empire.', locator='Roman Palestine', new=True)],
             view=WIDE, layers=POL),
        step(700, 'The Islamic conquest',
             'Arab Muslim forces won a battle at Ajnadayn in southern Palestine on 30 July 634 [1]. '
             'Jerusalem surrendered in 638 and Caesarea in October 640 [2]. '
             'The Umayyad caliph ʿAbd al-Malik built the Dome of the Rock in 691 [3].',
             [Q('britannica-palestine-roman-to-fatimid', 'the combined forces won a bloody victory'), Q('britannica-palestine-roman-to-fatimid', 'Only Jerusalem and Caesarea held out'),
              Q('britannica-palestine-roman-to-fatimid', 'The caliph ʿAbd al-Malik')], view=WIDE, layers=POL),
        step(1150, 'The Crusades',
             'European Christians of the First Crusade took Jerusalem on 15 July 1099 and founded the Kingdom of Jerusalem [1][2]. '
             'The kingdom lasted until 1291, when the last Crusaders were driven out of Acre [3].',
             [Q('britannica-crusades', 'on July 15 Godfrey’s men'), Q('britannica-kingdom-of-jerusalem', 'kingdom of Jerusalem, a state formed in 1099'),
              Q('britannica-palestine-to-1900', 'during whose reign the last of the Crusaders')], view=WIDE, layers=POL),
        step(1350, 'The Mamluks',
             'The Mamluks of Egypt defeated the invading Mongols at Ayn Jalut on 3 September 1260 [1]. '
             'Their dynasty ruled Egypt and Syria from 1250 to 1517 [2].',
             [Q('britannica-battle-of-ayn-jalut', 'decisive victory of the Mamluks'), Q('britannica-mamluk', 'Mamluk generals used their power')], view=WIDE, layers=POL),
        step(1700, 'Four Ottoman centuries',
             'The Ottoman sultan Selim I defeated the Mamluks in 1516–17, bringing Syria, Egypt and Palestine under Ottoman rule [1]. '
             'Ottoman rule lasted four centuries [2]. '
             'British and Allied forces took Jerusalem in December 1917 and the rest of the area by October 1918 [3].',
             [Q('britannica-selim-i', 'Selim defeated the Mamluk armies'), Q('britannica-palestine-to-1900', 'on August 24, 1516'),
              Q('britannica-palestine-ww1', 'Jerusalem was captured by British and Allied forces under the command of General Sir Edmund (later')], view=WIDE, layers=POL),
        step(1935, 'The British Mandate',
             'A British civilian High Commissioner, Sir Herbert Samuel, took office on 1 July 1920 [1]. '
             'The League of Nations approved the Mandate for Palestine on 24 July 1922, and it came into formal effect in September 1923 [2].',
             [Q('un-dpr-origins-part1', 'a civilian High Commissioner'), Q('un-dpr-origins-part1', 'which was approved by the League of Nations')], view=WIDE, layers=POL),
        step(1949, '1948',
             'Israel declared its independence on 14 May 1948, and the British Mandate ended the next day [1]. '
             'The armies of Egypt, Transjordan, Iraq, Syria and Lebanon then invaded, carrying out a decision of the Arab League [2]. '
             'From the start of the civil war to the end of the war, more than 400 Palestinian Arab towns and villages were destroyed or depopulated [3]. '
             'Armistice agreements with Egypt, Lebanon, Transjordan and Syria followed in 1949 [4].',
             [Q('un-dpr-origins-part2', 'Israel declared its independence on 14 May 1948. The departure', new=True),
              Q('britannica-1948-war', 'The following day, the armies of Egypt, Transjordan (Jordan), Iraq, Syria, and Lebanon invaded and attacked the Jewish paramilitaries, carrying out a decision that the Arab League had made weeks before.', new=True),
              Q('britannica-1948-war', 'From the start of the civil war to the end of the conventional war, more than 400 Palestinian Arab towns and villages were destroyed or depopulated.', new=True),
              Q('britannica-1948-war', 'A series of armistice agreements')], month=8, view=WIDE, layers=POL + ['migrations']),
        step(1968, '1967',
             'In the June 1967 war Israel captured the Sinai Peninsula, the Gaza Strip, the West Bank, the Old City of Jerusalem and the Golan Heights [1]. '
             'It set up a military administration in the West Bank, except in East Jerusalem, which it incorporated into Israel [2][3].',
             [Q('britannica-six-day-war', 'Israel'), Q('britannica-west-bank', 'During the 1967 war Israel occupied'), Q('britannica-west-bank', 'except in East Jerusalem')],
             view=WIDE, layers=POL + ['modern']),
        step(1998, 'Oslo',
             'An agreement signed in Cairo on 4 May 1994 began the transfer of authority to the newly created Palestinian Authority [1]. '
             'Since 2007, when Hamas took control of the Gaza Strip by force, the Palestinian Authority has not exercised control there [2].',
             [Q('britannica-oslo-accords', 'On May 4, 1994'), Q('britannica-palestinian-authority', 'the PA also has de jure')], view=WIDE, layers=POL + ['modern']),
        step(2026, 'Today',
             'The war in Gaza began on 7 October 2023, when Hamas launched a land, sea and air assault on Israel from the territory [1]. '
             'Israeli ground forces advanced into the Gaza Strip at the end of that month [2]. '
             'Under the ceasefire in force from 10 October 2025, the Israeli military was to keep about 53 percent of the Gaza Strip in the first phase of its withdrawal [3][4].',
             [Q('britannica-israel-hamas-war', 'a war in the Gaza Strip'), Q('britannica-israel-hamas-war', 'The war entered a new chapter'),
              Q('afp-2025-10-10-pullback', 'the Israeli military announced'), Q('afp-2025-10-10-pullback', 'During this first part')], month=10, view=WIDE, layers=POL + ['modern']),
    ],
}

# ================================================================ 2. Jerusalem through time
stories['jerusalem-through-time'] = {
    'title': {'en': 'Jerusalem through time'},
    'summary': {'en': 'One city under many names and rulers, holy to three religions, and contested today.'},
    'steps': [
        step(-1350, 'Urusalim',
             'The city’s earliest recorded name, Urusalim, appears in Akkadian cuneiform texts of the Late Bronze Age [1]. '
             'Jerusalem was then the centre of one of two large political units in the highlands; the other was centred on Shechem [2]. '
             'Letters written by its ruler, Abdi-Heba, survive [3].',
             [L('pleiades', "places/687928, name 'urusalim'"), Q('finkelstein-2013-forgotten-kingdom', 'apparently indicating that the entire area'),
              Q('finkelstein-2013-forgotten-kingdom', 'written by Abdi-Heba')], view=JER, layers=POL, highlight=['jerusalem']),
        step(-950, 'David’s city: text and archaeology',
             'Many scholars date a united monarchy of Israel to about 1020–922 BCE, while others doubt that it existed [1]. '
             'Archaeologists who accept it differ on its size: some see a small entity centred on Jerusalem and its vicinity, others a short-lived tribal alliance with wide influence [2][3]. '
             'Israel Finkelstein argues that the great united monarchy of the Bible is a literary construct [4].',
             [Q('britannica-israel-kingdom', 'scholars date the united monarchy'), Q('mazar-2021-beth-shean', 'others either negate'),
              Q('mazar-2021-beth-shean', 'The Davidic state should perhaps'), Q('finkelstein-2013-forgotten-kingdom', 'the biblical idea of a great united monarchy')],
             view=JER, layers=POL, highlight=['jerusalem']),
        step(-586, 'Destroyed by Babylon',
             'Nebuchadnezzar II captured Jerusalem in 597 BCE and deported King Jehoiachin to Babylon [1]. '
             'About 587/586 BCE the city was stormed and destroyed [2].',
             [Q('britannica-nebuchadnezzar-ii', 'He attacked Judah a year later'), Q('britannica-palestine-iron-age', 'Jerusalem was twice besieged')],
             view=JER, layers=POL, highlight=['jerusalem']),
        step(-450, 'A small Persian-period town',
             'Cyrus decreed around 538 BCE that the Temple of Jerusalem be rebuilt [1]. '
             'Archaeological estimates of the Persian-period city’s population range from about 1,000 people to about 4,800 [2][3].',
             [Q('britannica-palestine-iron-age', 'One of Cyrus’s first acts'), Q('lipschits-2009-persian-period-finds-jerusalem', 'Calculating the population of Jerusalem'),
              Q('broshi-1977-number-of-inhabitants-jerusalem', 'Broshi (1977: 68')], view=JER, layers=POL, highlight=['jerusalem']),
        step(-167, 'The Temple rededicated to Zeus',
             'Greek rule Hellenized much of Jerusalem’s upper class [1]. '
             'On 25 December 167 BCE the Seleucid king Antiochus IV rededicated the Temple in Jerusalem to the Olympian god Zeus [2]. '
             'Under the Hasmoneans who rose against him, Judea became independent of the Seleucids [3].',
             [Q('britannica-palestine-hellenistic', 'The century and a half of Greek rule'),
              Q('britannica-maccabees', 'his final act of spite, on December 25, 167', locator='article', new=True),
              Q('britannica-hasmonean-dynasty', 'He soon became independent')], view=JER, layers=POL, highlight=['jerusalem']),
        step(70, 'The Roman sack',
             'Herod, the Roman-appointed king of Judaea from 37 to 4 BCE, ordered the Temple rebuilt on a magnificent scale in 20/19 BCE [1][2]. '
             'Jerusalem was sacked in 70 CE, and the Jews, deprived of the Temple, founded a new religious centre at Jamnia (Yavne) [3][4].',
             [Q('britannica-herod', 'Herod (born 73 bce'), Q('britannica-temple-mount', 'Herod, who was appointed ruler of Judaea in 40 bce, ordered a reconstruction on a magnificent scale in 20/19 bce', locator='article', new=True),
              Q('britannica-palestine-roman-to-fatimid', 'removed after the sack of Jerusalem in 70 ce', locator='Roman Palestine (illustration caption)', new=True),
              Q('britannica-palestine-roman-to-fatimid', 'The Jews, deprived of the Temple, founded a new religious center in the rabbinical school of Jamnia', locator='Roman Palestine', new=True)],
             view=JER, layers=POL, highlight=['temple-mount-haram-al-sharif']),
        step(140, 'Aelia Capitolina',
             'In 132 the emperor Hadrian decided to build a Roman colony, Aelia Capitolina, on the site of Jerusalem [1]. '
             'The plan helped provoke the Second Jewish Revolt, led by Bar Kokhba [2]. '
             'According to Le Strange, Hadrian removed all the Jews from the city when he renamed it [3].',
             [Q('britannica-palestine-roman-to-fatimid', 'In 132 the emperor Hadrian'),
              Q('britannica-palestine-roman-to-fatimid', 'The announcement of his plan, as well as his ban on circumcision (revoked later, but only for the Jews), provoked a much more serious uprising, the Second Jewish Revolt, led by Bar Kokhba', locator='Roman Palestine', new=True),
              Q('le-strange-1890', 'The Emperor Hadrian, after removing all the Jews')], view=JER, layers=POL, highlight=['jerusalem']),
        step(400, 'A Christian holy city',
             'Constantine built a church on the site of the Holy Sepulchre, the most sacred of Christian holy places [1]. '
             'Christians venerate it as the place of Jesus’ crucifixion and burial [2].',
             [Q('britannica-palestine-roman-to-fatimid', 'The emperor himself built a magnificent church on the site of the Holy Sepulchre', locator='Roman Palestine', new=True),
              Q('britannica-church-of-the-holy-sepulchre', 'built on the traditional site')], view=JER, layers=POL, highlight=['church-of-the-holy-sepulchre']),
        step(700, 'Bayt al-Maqdis',
             'Jerusalem surrendered to the Muslims in 638 [1]. '
             'The Umayyad caliph ʿAbd al-Malik built the Dome of the Rock in 691 [2]. '
             'Muslims hold that the Prophet Muhammad was taken up to heaven from the rock beneath it, and Jerusalem was the first direction of Muslim prayer [3][4]. '
             'Arabic writers called the city Iliya, from the Latin Aelia, and Bayt al-Maqdis, “the Holy House” [5][6].',
             [Q('britannica-palestine-roman-to-fatimid', 'Only Jerusalem and Caesarea held out'), Q('britannica-palestine-roman-to-fatimid', 'The caliph ʿAbd al-Malik'),
              Q('britannica-dome-of-the-rock', 'According to Muslims'), Q('wailing-wall-commission-1930', 'Jerusalem and especially the Temple area'),
              Q('le-strange-1890', 'the first part of this name was preserved'), Q('le-strange-1890', 'The Holy City, Bait-al-Makdis')],
             view=JER, layers=POL, highlight=['dome-of-the-rock']),
        step(1010, 'The church destroyed',
             'The Fatimid caliph al-Hakim (996–1021) was at times extremely harsh towards his non-Muslim subjects [1]. '
             'In 1009 he ordered the destruction of the Church of the Holy Sepulchre, which was severely damaged [2].',
             [Q('britannica-palestine-roman-to-fatimid', 'The country suffered even greater hardship, however, under the Fatimid caliph al-Ḥākim (996–1021)', locator='The Fatimid dynasty', new=True),
              Q('britannica-palestine-roman-to-fatimid', 'In 1009 he ordered the destruction of the Church of the Holy Sepulchre', locator='The Fatimid dynasty', new=True)],
             view=JER, layers=POL, highlight=['church-of-the-holy-sepulchre']),
        step(1150, 'Crusader capital',
             'As the Crusaders approached in 1099, villagers from the surrounding area left their homes for the safety of the walls, doubling a population that had reached about 20,000, according to Benvenisti [1][2]. '
             'The Crusaders took Jerusalem on 15 July 1099, and a year later the Latin Kingdom of Jerusalem was established [3][4]. '
             'The Ayyubid sultan al-Salih Ayyub restored Jerusalem to Muslim rule for good in 1244 [5].',
             [Q('benvenisti-1970-crusaders-holy-land', 'The inhabitants of the villages and townships abandoned their homes and concentrated within the city walls.', locator='p. 35', new=True),
              Q('benvenisti-1970-crusaders-holy-land', 'The population of Jerusalem, which in recent years'),
              Q('britannica-crusades', 'on July 15 Godfrey’s men'), Q('britannica-palestine-to-1900', 'A year after the capture of Jerusalem'),
              Q('britannica-palestine-to-1900', 'a 10-year treaty')],
             view=JER, layers=POL, highlight=['jerusalem']),
        step(1600, 'Al-Quds under the Ottomans',
             'Under the Ottomans, Jerusalem was for centuries an ordinary district of the province of Damascus [1]. '
             'In 1872 it was made a separate district answering directly to Istanbul, and stayed so until the First World War [2][3]. '
             'Le Strange noted that “al-Quds”, “the Holy”, had become the city’s most common Arabic name [4].',
             [Q('abu-manneh-1999-sanjak-jerusalem', 'Throughout the Ottoman period'), Q('abu-manneh-1999-sanjak-jerusalem', 'in the summer of 1872'),
              Q('abu-manneh-1999-sanjak-jerusalem', 'Thus Jerusalem with the districts'), Q('le-strange-1890', 'or else simply as Al Kuds')],
             view=JER, layers=POL, highlight=['jerusalem']),
        step(1930, 'The Wall and the Mandate',
             'British and Allied forces under General Allenby captured Jerusalem in December 1917 [1]. '
             'A commission approved by the League of Nations found in 1930 that the Western Wall had for centuries been an object of Jewish religious veneration [2]. '
             'It also found that the wall is sacred to Muslims because of the Prophet’s visit with his steed al-Buraq, and that its ownership is Muslim [3][4].',
             [Q('britannica-palestine-ww1', 'Jerusalem was captured by British and Allied forces under the command of General Sir Edmund (later'),
              Q('wailing-wall-commission-1930', 'the Western Wall of the Temple area'), Q('wailing-wall-commission-1930', 'the Wall as a whole'),
              Q('wailing-wall-commission-1930', 'To the Moslems belong the sole ownership')], view=JER, layers=POL, highlight=['western-wall']),
        step(1950, 'A divided city',
             'In January 1948 Lifta, a Palestinian Arab village in west Jerusalem, became one of the first Arab towns to be depopulated [1]. '
             'On 28 May 1948 the Jewish Quarter of the Old City was taken by Transjordan’s Arab Legion and left in rubble [2]. '
             'From 1948 to 1967 Israelis were not allowed access to the Temple Mount or the Western Wall [3].',
             [Q('britannica-1948-war', 'In January 1948 Lifta'),
              Q('britannica-1948-war', 'Gains from the civil war that had allowed Israel to protect the Jewish communities in Jerusalem were threatened by Arab advances, and on May 28 the Jewish quarter', new=True),
              Q('britannica-temple-mount', 'Israelis were not allowed access')], view=JER, layers=POL + ['modern'], highlight=['jerusalem']),
        step(1968, '1967',
             'Israel captured the Old City in the June 1967 war and extended Israeli law and administration to East Jerusalem [1][2]. '
             'After the war the adjoining Mughrabi Quarter, an Islamic endowment, was bulldozed and its inhabitants expelled, which Arab sources describe as illegal [3][4]. '
             'Israel’s government announced that the Temple Mount compound would remain under Muslim administration; Jews could visit it but not pray there [5][6].',
             [Q('britannica-six-day-war', 'Israel'), Q('britannica-west-bank', 'except in East Jerusalem'),
              Q('kassim-2023-jordan-role', 'totally bulldozing'), Q('kassim-2023-jordan-role', 'Despite all these'),
              Q('reiter-2017-eroding-status-quo', 'Prime Minister Levi Eshkol'), Q('reiter-2017-eroding-status-quo', 'in the status-quo arrangements of 1967')],
             view=JER, layers=POL + ['modern'], highlight=['temple-mount-haram-al-sharif']),
        step(2026, 'Capital claims today',
             'Israel’s Basic Law of 1980 declares Jerusalem, “complete and united”, its capital, and Prime Minister Netanyahu has called it “our eternal capital” [1][2]. '
             'The 1988 Palestinian declaration of independence names Jerusalem as the capital of the State of Palestine [3]. '
             'The UN Security Council declared Israel’s measures altering the city’s status null and void, and the International Court of Justice regards East Jerusalem as occupied territory [4][5]. '
             'The United States, which recognised Jerusalem as Israel’s capital in 2017, says the boundaries of Israeli sovereignty there are subject to final-status negotiations [6].',
             [Q('knesset-basic-law-jerusalem', 'Jerusalem, complete and united, is the capital of Israel', locator='s. 1', new=True), Q('algemeiner-2024-07-19-netanyahu', 'The Jewish people are not occupiers'),
              Q('pnc-declaration-1988', 'The Palestine National Council hereby declares'), Q('unsc-res-478-1980', 'all legislative and administrative measures'),
              Q('icj-2004-wall-ao', 'All these territories'), Q('us-proclamation-9683', 'The specific boundaries')],
             month=10, view=JER, layers=POL + ['modern'], highlight=['jerusalem']),
    ],
}


# ================================================================ 3. Peoples and migrations
MIGL = ['territories', 'places', 'migrations']
stories['peoples-and-migrations'] = {
    'title': {'en': 'Peoples and migrations'},
    'summary': {'en': 'Who came, who left and who was forced out, from the Philistines to today, with the numbers and where they are disputed.'},
    'steps': [
        step(-1150, 'The Philistines',
             'Whether the arrival of the Philistines around 1200 BCE was a large movement of people, perhaps linked to the “Sea Peoples”, has long been debated [1]. '
             'Ancient DNA shows that the early Iron Age population there carried a European-related ancestry that is no longer detectable later in the Iron Age [2].',
             [R('philistine-arrival', 'feldman-2019-philistines', 'It has been long debated'), R('philistine-arrival', 'feldman-2019-philistines', 'We find that')],
             view=WIDE, layers=MIGL),
        step(-720, 'Assyrian deportations',
             'The Bible says that Tiglath-pileser III of Assyria deported the inhabitants of Galilee and Gilead [1]. '
             'One of his own inscriptions lists several thousand captives from eight cities in Galilee [2]. '
             'His successor Sargon II states that 27,290 people were exiled from Samaria, and the Assyrians settled other groups in the land [3][4].',
             [R('assyrian-deportations-galilee-gilead', 'jps-tanakh-2023'), R('assyrian-deportations-galilee-gilead', 'malamat-ej-exile-assyrian'),
              R('assyrian-deportation-samaria', 'malamat-ej-exile-assyrian'), R('assyrian-deportation-samaria', 'finkelstein-2013-forgotten-kingdom')],
             view=WIDE, layers=MIGL),
        step(-586, 'Exile to Babylon',
             'The Book of Jeremiah counts 4,600 Judeans exiled by Nebuchadnezzar in three deportations [1]. '
             'Oded Lipschits, working from archaeological population estimates, rejects the idea of large-scale deportations and of big waves of returnees afterwards [2].',
             [R('babylonian-exile', 'jps-tanakh-2023', 'This is the number'), R('babylonian-exile', 'lipschits-2005-fall-and-rise')], view=WIDE, layers=MIGL),
        step(-450, 'Return',
             'The books of Ezra and Nehemiah count 42,360 people returning from Babylonia, not counting servants [1]. '
             'Archaeological estimates put the whole province of Yehud at 20,000–30,000 people, which does not fit that number if it is taken literally [2][3].',
             [R('return-to-zion', 'jps-tanakh-2023', 'The sum of the entire community'), R('return-to-zion', 'finkelstein-2018-hasmonean-realities', 'archaeologically-based'),
              R('return-to-zion', 'finkelstein-2018-hasmonean-realities', 'the number of returnees')], view=WIDE, layers=MIGL),
        step(140, 'After the revolts against Rome',
             'Josephus says 97,000 people were taken captive in the war against Rome; the historian Seth Schwartz judges Josephus’s figures, especially his count of the dead, clearly impossible [1][2]. '
             'Jews living outside Palestine already far outnumbered those inside it before 70 CE [3]. '
             'After the Bar Kokhba revolt the centre of Jewish life moved north, chiefly to Galilee [4].',
             [R('roman-war-captives-66-73', 'josephus-war-whiston'), R('roman-war-captives-66-73', 'schwartz-2006-land-of-israel-66-235', 'Josephus claims'),
              R('roman-era-jewish-diaspora', 'britannica-jewish-diaspora', 'Diaspora Jews far outnumbered'), R('judaea-to-galilee-after-bar-kokhba', 'ej-bar-kokhba')],
             view=WIDE, layers=MIGL),
        step(850, 'Arab tribes',
             'The 9th-century geographer al-Yaʿqubi describes the people of Palestine as Arabs of the tribes of Lakhm, Judham, ʿAmilah, Kindah, Qays and Kinanah [1]. '
             'Recent archaeological work describes the change from Byzantine to Islamic society as slow, with Christians still an overwhelming majority on the eve of the Crusades [2][3].',
             [R('arab-tribal-settlement-early-islam', 'le-strange-1890'), R('arab-tribal-settlement-early-islam', 'avni-2014', 'the Byzantine-Islamic transition'),
              R('arab-tribal-settlement-early-islam', 'avni-2014', 'by the eve of the Crusader period')], view=WIDE, layers=MIGL),
        step(1150, 'Frankish settlers',
             'Meron Benvenisti estimated the Frankish population of the Crusader kingdom at 140,000, almost all of it in the towns [1].',
             [R('frankish-settlement', 'benvenisti-1970-crusaders-holy-land')], view=WIDE, layers=MIGL),
        step(1530, 'Refugees from Spain in Safed',
             'Jewish refugees from Spain strengthened the community of Safed after 1492 [1]. '
             'In 1522 a visiting rabbi found 300 Jewish families there: Sephardim, Moriscos and Jews from the Maghreb [2].',
             [R('sephardi-arrival-safed', 'ej-safed', 'Toward the end of Mamluk rule'), R('sephardi-arrival-safed', 'ej-safed', 'In 1522')],
             view=([35.5, 32.96], 9), layers=MIGL, highlight=['safed']),
        step(1880, 'Newcomers under the Ottomans',
             'The Ottoman authorities settled Algerians and, from 1878, Circassians and Tatars from the Balkans [1]. '
             'Egyptian migrants moved into southern Palestine over a long period, above all under Egyptian rule in the 1830s [2]. '
             'German Templers founded settlements from 1868, but never numbered more than 2,200 [3][4].',
             [R('circassian-settlement', 'scholch-1993', 'the Ottoman authorities tried'), R('egyptian-settlers-19th-century', 'marom-sasson-2022', 'While the period'),
              R('templer-settlement', 'scholch-1993', 'the Schwabian'), R('templer-settlement', 'scholch-1993', 'The number of Templars')], view=WIDE, layers=MIGL),
        step(1905, 'Immigration and a debate',
             'Jewish immigration grew from the 1880s; Israel’s Central Bureau of Statistics counts 35,000–40,000 immigrants in 1904–1914 [1]. '
             'How much Arab immigration there was in the late Ottoman and Mandate periods is disputed [2]. '
             'Justin McCarthy calls it small, while Fred Gottheil argues it was consequential [3][4].',
             [R('second-aliyah', 'cbs-sai-2025-t2-35'), R('arab-immigration-late-ottoman-mandate', 'bachi-1977', 'However, in the present state'),
              R('arab-immigration-late-ottoman-mandate', 'mccarthy-1990', 'That there was unrecorded'), R('arab-immigration-late-ottoman-mandate', 'gottheil-2003-meq', 'there is every reason')],
             view=WIDE, layers=MIGL),
        step(1936, 'The Mandate years',
             'Between 1932 and 1938/39 about 197,000 (Israel’s Central Bureau of Statistics) to 248,000 (Bachi) Jewish immigrants arrived [1][2]. '
             'In the early Mandate years emigration, mostly of men, continued from Palestine to the Americas, especially Latin America [3].',
             [R('fifth-aliyah', 'cbs-sai-2025-t2-35'), R('fifth-aliyah', 'bachi-1977'), R('christian-emigration-latin-america', 'bachi-1977', 'During the first part')],
             view=WIDE, layers=MIGL),
        step(1949, '1948: refugees',
             'The UN Conciliation Commission estimated that about 711,000 refugees had left the territory held by Israel [1]. '
             'Israeli spokesmen spoke of about 520,000, and Arab officials of 900,000 to a million [2]. '
             'The historian Benny Morris concludes that war, not design, Jewish or Arab, created the refugee problem; the Palestinian account describes three-quarters of a million people forced to leave their land [3][4]. '
             'In September 1948 the UN Mediator also counted about 7,000 Jewish refugees needing aid [5].',
             [R('palestinian-refugees-1947-1949', 'unccp-1950-a1367'), R('palestinian-refugees-1947-1949', 'morris-2004', 'From 1949 onwards'),
              R('palestinian-refugees-1947-1949', 'morris-2004', 'That war and not design'), R('palestinian-refugees-1947-1949', 'palquest-charif-nakba'),
              R('jewish-displacement-1948', 'un-mediator-1948-a648')], month=1, view=WIDE, layers=MIGL),
        step(1951, 'Mass immigration',
             'Between May 1948 and the end of 1951, 689,739 Jews immigrated to Israel [1]. '
             'In several Arab and Muslim-majority countries, riots, insecurity and anti-Jewish laws pushed Jews to leave, and many had to leave almost everything behind [2][3]. '
             'Whether they were expelled, or left for other reasons including Zionist efforts to bring them, is debated [4][5].',
             [R('jewish-mass-immigration-1948-1951', 'bachi-1977', 'In the course of'), R('jewish-emigration-arab-muslim-countries', 'bachi-1977', 'outbursts'),
              R('jewish-emigration-arab-muslim-countries', 'bachi-1977', 'In many cases'), R('jewish-emigration-arab-muslim-countries', 'shenhav-2002', 'He took'),
              R('jewish-emigration-arab-muslim-countries', 'shenhav-2002', 'Refugee status')], view=WIDE, layers=MIGL),
        step(1968, '1967',
             'About 200,000 people moved from the West Bank to the East Bank of the Jordan in 1967 [1]. '
             'Between 85,000 (Israeli figure) and 110,000 (Syrian figure) left the Golan Heights [2]. '
             'The UN envoy found the truth to lie between Israel’s statement that no encouragement was given to flee and refugees’ allegations of brutal force and intimidation [3].',
             [R('naksa-1967-west-bank', 'un-sg-1967-s8158', 'About 200,000'), R('golan-1967-displacement', 'un-sg-1967-s8158', 'About 110,000'),
              R('naksa-1967-west-bank', 'un-sg-1967-s8158', 'The truth seems')], view=WIDE, layers=MIGL),
        step(1995, 'From the Soviet Union and Ethiopia',
             'Between 1969 and 1975 about 106,000 Jews immigrated from the Soviet Union [1]. '
             'In 1990–1999 another 821,906 immigrants born in the former Soviet Union arrived [2]. '
             'Airlifts in 1984–85 and in May 1991 brought more than 6,500 and then more than 14,000 Ethiopian Jews to Israel [3][4].',
             [R('soviet-immigration-1970s', 'bachi-1977'), R('post-soviet-immigration-1989-2000s', 'cbs-sai-2025-t2-37'),
              R('ethiopian-operation-moses', 'ej-beta-israel', 'During a period'), R('ethiopian-operation-solomon', 'ej-beta-israel')], view=WIDE, layers=MIGL),
        step(2024, 'Settlers',
             'According to Peace Now figures cited by the UN human rights office, there were 503,732 Israeli settlers in the West Bank and 233,600 in East Jerusalem by late 2024 [1]. '
             'Israel evacuated its localities in the Gaza Strip, where about 8,200 Israelis lived at the end of 2004, in August 2005 [2][3].',
             [R('west-bank-settlement', 'ohchr-2025-a-hrc-58-73'), R('gaza-disengagement-2005', 'cbs-sai-2005-t2-8'), R('gaza-disengagement-2005', 'cbs-sai-2025-t2-11')],
             view=WIDE, layers=MIGL + ['modern']),
        step(2026, 'Displaced since 2023',
             'By October 2025 nearly all of Gaza’s 2.1 million people had been displaced, many of them repeatedly [1]. '
             'The Palestinian Central Bureau of Statistics says about 100,000 Palestinians were forced to leave the Gaza Strip [2]. '
             'In Israel, about 200,000 people from areas near Gaza and Lebanon were still displaced at the end of 2023, and 68,000 at the end of 2024 [3]. '
             'In the West Bank, Israeli operations displaced 40,000 people, mostly from northern refugee camps, in 2025 [4].',
             [R('gaza-internal-displacement-2023', 'ocha-flash-appeal-2026'), R('gaza-departures-2023-2025', 'pcbs-2025-end-year'),
              R('israeli-evacuation-north-2023', 'idmc-grid-2025'), R('west-bank-northern-camps-2025', 'ocha-flash-appeal-2026', 'Forty thousand')],
             month=10, view=WIDE, layers=MIGL + ['modern']),
    ],
}


# ================================================================ 4. 1917-1949
MAND = ['territories', 'places', 'holy', 'conflicts', 'migrations']
B48 = 'britannica-1948-war'
stories['1917-1949'] = {
    'title': {'en': '1917–1949'},
    'summary': {'en': 'From the British conquest and the Mandate to the 1948 war and the armistice lines, with each side’s account.'},
    'steps': [
        step(1918, 'British conquest',
             'British and Allied forces under General Allenby captured Jerusalem in December 1917, and the rest of the area by October 1918 [1]. '
             'In 1917 the British government had declared its support for “the establishment in Palestine of a national home for the Jewish people”, the Balfour Declaration, and the later Mandate made carrying it out a primary aim [2]. '
             'Arab representatives held that the Mandate, which incorporated the Balfour Declaration, was illegal [3].',
             [Q('britannica-palestine-ww1', 'Jerusalem was captured by British and Allied forces under the command of General Sir Edmund (later'),
              Q('un-dpr-origins-part2', 'The exception was Palestine where, instead of being limited to', new=True),
              Q('un-dpr-origins-part2', 'The Arabs have persistently adhered to the position that the Mandate for Palestine, which incorporated the Balfour Declaration, is illegal.', new=True)],
             month=6, view=WIDE, layers=MAND),
        step(1920, 'First violence',
             'In March 1920 the Jewish settlement of Tel Hai in the far north was attacked; its defence became legendary throughout Jewish Palestine [1][2]. '
             'In April anti-Zionist riots broke out in the Jewish quarter of Jerusalem’s Old City [3]. '
             'British authorities attributed them to Arab disappointment that promises of independence had not been kept [4].',
             [R('battle-of-tel-hai-1920', 'britannica-trumpeldor', 'On March 1'), R('battle-of-tel-hai-1920', 'britannica-trumpeldor', 'The resistance'),
              R('nebi-musa-riots-1920', 'britannica-palestine-ww1', 'In April 1920'), R('nebi-musa-riots-1920', 'britannica-palestine-ww1', 'British authorities')],
             month=5, view=WIDE, layers=MAND),
        step(1923, 'The Mandate',
             'A British civilian High Commissioner, Sir Herbert Samuel, took office on 1 July 1920 [1]. '
             'The League of Nations approved the Mandate in July 1922, and it came into formal effect in September 1923 [2]. '
             'The first census, on 23 October 1922, counted 757,182 people [3].',
             [Q('un-dpr-origins-part1', 'a civilian High Commissioner'), Q('un-dpr-origins-part1', 'which was approved by the League of Nations'),
              R('palestine-1922-census', 'barron-1923', None)], view=WIDE, layers=MAND),
        step(1929, '1929',
             'In August 1929 a dispute over the Western Wall (al-Buraq) in Jerusalem led to violence [1]. '
             'The British Shaw Commission found that the outbreak in Jerusalem was from the beginning an attack by Arabs on Jews, and that it was not premeditated [2][3]. '
             'The Palestinian narrative calls it the al-Buraq uprising and attributes it to Jewish provocations near the wall [4]. '
             'In Hebron many Jews were killed by Arab rioters; many of the survivors had been protected by Arab neighbours [5][6].',
             [R('palestine-riots-1929', 'un-dpr-origins-part1'), R('palestine-riots-1929', 'palquest-shaw-report-1929', 'The outbreak in Jerusalem'),
              R('palestine-riots-1929', 'palquest-shaw-report-1929', 'The outbreak was not'), R('palestine-riots-1929', 'prime-2003-narratives'),
              R('hebron-jewish-community-1929-1936', 'ej-hebron', 'The year 1929'), R('hebron-jewish-community-1929-1936', 'ej-hebron', 'The remaining Jews')],
             month=9, view=WIDE, layers=MAND, highlight=['western-wall']),
        step(1937, 'The Arab Revolt and partition',
             'The Arab Revolt of 1936–39 was the first sustained violent uprising of Palestinian Arabs in more than a century [1]. '
             'In July 1937 the Peel Commission reported that it was caused by Arab desire for independence and fear of the Jewish national home, and recommended partition [2][3]. '
             'The Zionist attitude to partition was ambivalent, but overall one of cautious acceptance [4].',
             [R('arab-revolt-1936-1939', 'britannica-palestine-arab-revolt', 'The Arab Revolt of'),
              Q('britannica-palestine-arab-revolt', 'A royal commission of inquiry presided over by Robert Peel, which was sent to investigate the volatile situation, reported in July 1937', locator="section 'The Arab Revolt'", new=True),
              Q('britannica-palestine-arab-revolt', 'In the face of what it described as “right against right,” the commission recommended that the region be partitioned.', locator="section 'The Arab Revolt'", new=True),
              Q('britannica-palestine-arab-revolt', 'The Zionist attitude toward partition, though ambivalent, was overall one of cautious acceptance.', locator="section 'The Arab Revolt'", new=True)],
             month=8, view=WIDE, layers=MAND),
        step(1939, 'The White Paper',
             'British forces suppressed the revolt by the late summer of 1939 [1]. '
             'In May 1939 Britain issued a White Paper that essentially yielded to Arab demands [2]. '
             'The Arabs nevertheless rejected it, largely because they mistrusted the British government [3].',
             [R('arab-revolt-1936-1939', 'palquest-great-rebellion', 'The combined impact'), R('arab-revolt-1936-1939', 'britannica-palestine-arab-revolt', 'In May 1939'),
              Q('britannica-palestine-arab-revolt', 'The Arabs, although in favor of the new policy, rejected the white paper, largely because they mistrusted the British government', locator="section 'The Arab Revolt'", new=True)],
             month=6, view=WIDE, layers=MAND),
        step(1946, 'Underground war against Britain',
             'At the end of 1946 the population was estimated at 1,203,000 Arabs, 608,000 Jews and 35,000 others [1]. '
             'From 1944 the Irgun, led by Menachem Begin, and the smaller LEHI attacked the British [2]. '
             'On 22 July 1946 the Irgun blew up a wing of Jerusalem’s King David Hotel housing British government and military offices [3]. '
             'In 1947 Britain turned the problem over to the United Nations [4].',
             [R('palestine-1946-unscop-national', 'unscop-1947'), R('jewish-insurgency-1944-1947', 'britannica-palestine-arab-revolt', 'In response'),
              R('king-david-hotel-bombing-1946', 'britannica-palestine-arab-revolt'),
              Q('un-dpr-origins-part2', 'A partition scheme, a formula for provincial autonomy, a unified independent Palestine were all considered and abandoned, and in 1947, Great Britain in frustration turned the problem over to the United Nations.', new=True)],
             month=8, view=WIDE, layers=MAND),
        step(1947, 'The partition plan',
             'On 29 November 1947 the UN General Assembly passed Resolution 181, which called for the partition of Palestine into a Jewish state and an Arab state [1]. '
             'Opponents of partition had argued that the UN could not take the territory of the majority of Palestine’s people and give it to a minority [2]. '
             'The next morning an Arab attack on a bus near Lydda killed Jewish passengers, an attack often cited as the start of the civil war [3].',
             [Q(B48, 'November 29, 1947: The UN General Assembly passes UN Resolution 181', locator='timeline', new=True),
              Q('un-dpr-origins-part2', 'The United Nations cannot make a disposition or alienation of territory, nor can it deprive the majority of the people of Palestine of their territory', new=True),
              R('civil-war-1947-1948', B48, 'November 30, 1947')], month=12, view=WIDE, layers=MAND + ['modern']),
        step(1948, 'Civil war',
             'In March 1948 the Haganah prepared Plan D [1]. '
             'Israeli accounts describe its purpose as securing the areas assigned to the Jewish state, plus Jerusalem and the road to it [2]. '
             'The Palestinian historian Walid Khalidi sees it as a plan for the conquest of Palestine, and its text orders that where there is resistance the population be expelled [3][4]. '
             'On 9 April Irgun and Lehi forces, acting independently of Ben-Gurion, attacked the village of Deir Yassin, and word of the massacre spread among Palestinians [5][6].',
             [R('plan-dalet-1948', 'un-dpr-origins-part2'), R('plan-dalet-1948', 'prime-2003-narratives', 'The purpose of Plan Daled was to shore up control of the areas designated in the partition plan as part'),
              R('plan-dalet-1948', 'khalidi-1988-plan-dalet', 'The plan visualized'), R('plan-dalet-1948', 'khalidi-1988-plan-dalet', 'In the event of resistance'),
              R('deir-yassin-massacre-1948', B48), Q(B48, 'word spread among Palestinians of the massacre at Deir Yassin')],
             month=4, view=WIDE, layers=MAND, highlight=['deir-yassin']),
        step(1948, 'Independence and invasion',
             'Between 18 April and 13 May Jewish forces took Tiberias, Haifa, Safed and Jaffa, displacing some of the largest Palestinian Arab urban populations [1]. '
             'Israel declared its independence on 14 May 1948 [2]. '
             'The next day the armies of Egypt, Transjordan, Iraq, Syria and Lebanon invaded, carrying out a decision of the Arab League [3]. '
             'On 28 May the Arab Legion took the Jewish Quarter of Jerusalem’s Old City and left it in rubble [4].',
             [R('civil-war-1947-1948', B48, 'Jewish forces then took control'), Q('un-dpr-origins-part2', 'Israel declared its independence on 14 May 1948. The departure', new=True),
              Q(B48, 'The following day, the armies of Egypt, Transjordan (Jordan), Iraq, Syria, and Lebanon invaded and attacked the Jewish paramilitaries, carrying out a decision that the Arab League had made weeks before.', new=True),
              R('battle-for-jerusalem-1948', B48, 'on May 28')], month=6, view=WIDE, layers=MAND),
        step(1948, 'Lydda and Ramle',
             'In July the Israeli army took Lydda and Ramle, two Arab cities that lay within the partition plan’s Arab state [1]. '
             'According to the historian Benny Morris, an Israeli decision was taken on 12 July to expel all the residents of Lydda [2].',
             [R('lydda-and-ramle-1948', B48, 'The IDF took Lod'), R('lydda-and-ramle-1948', 'palquest-lydda-1948')],
             month=8, view=([34.9, 31.93], 9.5), layers=MAND, highlight=['lod']),
        step(1948, 'Refugees: two accounts',
             'In October Israel launched Operation Yoav to take the Negev, and Operation Hiram took the Upper Galilee [1][2]. '
             'Israeli spokesmen have long said that the Palestinians left on the orders of their own leaders [3]. '
             'Arab spokesmen have maintained that Israel forcibly expelled some 750,000 Palestinians [4]. '
             'Benny Morris concluded that war, not design, Jewish or Arab, created the refugee problem [5].',
             [R('operation-yoav-1948', B48), R('operation-hiram-1948', 'israel-mfa-arab-israeli-wars'),
              R('palestine-war-1947-1949', 'shlaim-1995-debate-about-1948', 'Ever since'), R('palestine-war-1947-1949', 'shlaim-1995-debate-about-1948', 'Arab spokesmen'),
              R('palestinian-refugees-1947-1949', 'morris-2004', 'That war and not design')], month=11, view=WIDE, layers=MAND),
        step(1949, 'The armistice lines',
             'Armistice agreements with Egypt, Lebanon, Transjordan and Syria in 1949 brought a formal end to the war [1]. '
             'Israeli forces then held 77 percent of pre-1948 Palestine [2]. '
             'Arab forces held much of what became the Gaza Strip and the West Bank, including the Old City of Jerusalem [3]. '
             'Israelis remember the war as the War of Independence; Arabs remember it as the Nakba, “the catastrophe” [4][5].',
             [R('arab-israeli-war-1948', B48, 'A series of armistice'), R('palestine-war-1947-1949', 'palquest-palestine-war-1947-1950'),
              R('battle-for-jerusalem-1948', B48, 'they secured'), R('palestine-war-1947-1949', B48, 'For Israel'), R('palestine-war-1947-1949', B48, 'For Arabs')],
             month=8, view=WIDE, layers=MAND + ['modern']),
    ],
}


# ================================================================ 5. 1967 to today
NOW = ['territories', 'places', 'holy', 'conflicts', 'migrations', 'modern']
stories['1967-to-today'] = {
    'title': {'en': '1967 to today'},
    'summary': {'en': 'From the June 1967 war through peace treaties, uprisings, the Oslo years and the wars since 2023, with each side’s account.'},
    'steps': [
        step(1967, 'June 1967',
             'Between 5 and 10 June 1967 Israel defeated Egypt, Jordan and Syria and occupied the Sinai Peninsula, the Gaza Strip, the West Bank, East Jerusalem and the Golan Heights [1]. '
             'Israelis call it the Six-Day War; in Arabic it is called al-Naksa, “the setback” [2][3].',
             [R('six-day-war-1967', 'us-oh-1967-war'), R('six-day-war-1967', 'palquest-june-1967-war', 'Dubbed the Six-Day War'), R('six-day-war-1967', 'britannica-six-day-war', 'Also called')],
             month=7, view=WIDE, layers=NOW),
        step(1967, 'Jerusalem',
             'On 27 and 28 June 1967 Israel applied its law, jurisdiction and administration to East Jerusalem and surrounding areas [1][2]. '
             'Israel told the UN that “annexation” was the wrong word and that the measures concerned administrative integration; the Palestinian account calls them annexation [3][4].',
             [R('israeli-law-applied-to-east-jerusalem-1967', 'un-s-8146-1967', 'Under the Law'), R('israeli-law-applied-to-east-jerusalem-1967', 'un-s-8146-1967', 'the Government issued'),
              R('israeli-law-applied-to-east-jerusalem-1967', 'un-s-8052-1967'), R('israeli-law-applied-to-east-jerusalem-1967', 'palquest-fischbach-jerusalem')],
             month=8, view=JER, layers=NOW, highlight=['jerusalem']),
        step(1967, 'Resolution 242',
             'In September an Arab summit in Khartoum resolved on “no peace with Israel, no recognition of Israel, no negotiations with it” [1]. '
             'In November the UN Security Council unanimously called for the “withdrawal of Israel armed forces from territories occupied in the recent conflict” [2][3]. '
             'Whether that means all the territories is disputed: Israeli scholars note that proposals to require a total withdrawal were rejected, while others point to the French text, “des territoires”, “the territories” [4][5].',
             [R('khartoum-resolution-1967', 'avalon-khartoum'), R('unsc-resolution-242', 'un-s-res-242-1967', 'Withdrawal'), R('unsc-resolution-242', 'un-s-res-242-1967', 'Adopted unanimously'),
              R('unsc-resolution-242', 'blum-boundaries'), R('unsc-resolution-242', 'palquest-fischbach-242')], month=12, view=WIDE, layers=NOW),
        step(1973, 'October 1973',
             'On 6 October 1973, the Jewish Day of Atonement, Egyptian forces crossed the Suez Canal and broke through Israel’s Bar Lev line [1][2]. '
             'The UN Security Council called for a ceasefire on 22 October [3]. '
             'Israelis call it the Yom Kippur War; it is also known as the October War and the Ramadan War [4].',
             [R('october-war-1973', 'israel-mfa-arab-israeli-wars', 'The war was so called'), R('october-war-1973', 'palquest-october-1973-war', 'On the afternoon'),
              R('october-war-1973', 'palquest-october-1973-war', 'on 22 October'), R('october-war-1973', 'britannica-yom-kippur-war', 'Also called')],
             month=11, view=WIDE, layers=NOW),
        step(1974, 'The PLO at the UN',
             'In 1974 the Arab states meeting at Rabat recognised the PLO as the “sole legitimate representative of the Palestinian people” [1]. '
             'Yasser Arafat told the UN General Assembly that he had come “bearing an olive branch and a freedom-fighter’s gun” [2]. '
             'Israel’s representative replied that the PLO sought not the rights of the Palestinians but the annulment of the rights of the Jewish people [3].',
             [R('rabat-arab-summit-1974', 'kinghussein-1988-disengagement'), R('arafat-unga-address-1974', 'un-dpr-origins-part2', 'Today I have come'),
              R('arafat-unga-address-1974', 'un-dpr-origins-part2', 'concerned primarily')], month=12, view=WIDE, layers=NOW),
        step(1979, 'Peace with Egypt',
             'Egypt’s President Anwar Sadat visited Israel and addressed the Knesset in November 1977 [1]. '
             'After the Camp David summit, Egypt and Israel signed a peace treaty on 26 March 1979, and Israel completed its withdrawal from Sinai on 25 April 1982 [2][3]. '
             'Many Arabs rejected the accompanying framework for a wider peace, which had been negotiated without the PLO [4].',
             [R('sadat-visit-to-jerusalem-1977', 'britannica-anwar-sadat', 'In November 1977'), R('egypt-israel-peace-treaty-1979', 'ohist-camp-david'),
              R('israeli-withdrawal-from-sinai-completed-1982', 'reagan-1982-sinai'), R('camp-david-accords', 'palquest-winder-camp-david')],
             month=4, view=WIDE, layers=NOW),
        step(1982, 'Jerusalem, the Golan and Lebanon',
             'In 1980 the Knesset declared “Jerusalem, complete and united” Israel’s capital, and the UN Security Council decided not to recognise the law [1][2]. '
             'In 1981 Israel applied its law to the Golan Heights, which the Security Council declared null and void [3][4]. '
             'On 6 June 1982 Israel invaded Lebanon, saying it intended to end attacks on its territory, and reached Beirut [5][6].',
             [R('jerusalem-law-1980', 'knesset-basic-law-jerusalem'), R('jerusalem-law-1980', 'unsc-res-478-1980', 'Decides not to recognize'),
              R('golan-heights-law-1981', 'israel-mfa-golan-heights-law', 'The Law'), R('golan-heights-law-1981', 'unsc-res-497-1981', 'Decides'),
              R('lebanon-war-1982', 'britannica-palestine-intl-recognition'), R('lebanon-war-1982', 'unifil-background')], month=7, view=WIDE, layers=NOW),
        step(1988, 'The First Intifada',
             'On 9 December 1987 demonstrations broke out in Jabaliya, the largest refugee camp, and grew into the First Intifada [1]. '
             'The same day, leaders of the Muslim Brotherhood in Gaza agreed to set up the group that became Hamas [2]. '
             'In 1988 Jordan cut its legal and administrative ties with the West Bank, and the Palestine National Council proclaimed the State of Palestine, accepting for the first time the partition of Palestine [3][4].',
             [R('first-intifada-1987-1993', 'palquest-first-intifada', 'Demonstrations'), R('hamas-founded-1987', 'palquest-charif-hamas'),
              R('jordan-disengagement-1988', 'kinghussein-1988-disengagement', 'full legal'), R('palestinian-declaration-of-independence-1988', 'palquest-charif-declaration-1988')],
             month=12, view=WIDE, layers=NOW),
        step(1993, 'Oslo',
             'After the Madrid conference of October 1991, Israel and the PLO recognised each other in September 1993: Israel accepted the PLO as the representative of the Palestinians, and the PLO renounced terrorism and recognised Israel’s right to exist in peace [1][2]. '
             'On 13 September they signed the Declaration of Principles in Washington, for Palestinian self-government during a transitional period of up to five years [3][4].',
             [R('madrid-peace-conference-1991', 'palquest-fischbach-madrid-oslo'), R('israel-plo-mutual-recognition-1993', 'ohist-oslo'),
              R('oslo-i-declaration-of-principles', 'ohist-oslo'), R('oslo-i-declaration-of-principles', 'avalon-dop-1993')], month=10, view=WIDE, layers=NOW),
        step(1996, 'Interim years',
             'Israel and Jordan signed a peace treaty in October 1994 [1]. '
             'The 1995 Interim Agreement divided the West Bank into Areas A, B and C, with different Palestinian and Israeli powers in each [2]. '
             'On 4 November 1995 Prime Minister Yitzhak Rabin was assassinated by an Israeli extremist [3].',
             [R('israel-jordan-peace-treaty-1994', 'un-a-50-73'), R('oslo-ii-interim-agreement-1995', 'britannica-palestinian-authority'),
              R('assassination-of-yitzhak-rabin-1995', 'un-dpr-origins-part5', 'the assassination')], view=WIDE, layers=NOW),
        step(2000, 'Camp David and the Second Intifada',
             'The Camp David summit of July 2000 ended without agreement [1]. '
             'Ehud Barak, interviewed by Benny Morris, said Arafat refused even to accept Israel’s proposals as a basis for negotiation; the Palestinian negotiators called them a “re-packaging” of military occupation [2][3]. '
             'The Second Intifada began on 29 September 2000 [4]. '
             'The international Mitchell committee found that Ariel Sharon’s visit to the Temple Mount/al-Haram al-Sharif did not cause it but was provocative, and found no basis to conclude that the Palestinian Authority had planned the violence [5][6].',
             [R('camp-david-summit-2000', 'clinton-wh-trilateral-statement-2000', 'While they'), R('camp-david-summit-2000', 'nyrb-morris-barak-2002'), R('camp-david-summit-2000', 'nad-faq-camp-david'),
              R('second-intifada-2000-2005', 'prime-2003-narratives'), R('second-intifada-2000-2005', 'mitchell-report-2001', 'The Sharon visit'),
              R('second-intifada-2000-2005', 'mitchell-report-2001', 'we have no basis')], month=10, view=WIDE, layers=NOW, highlight=['temple-mount-haram-al-sharif']),
        step(2005, 'The barrier and Gaza disengagement',
             'In 2002 Israel’s cabinet approved the first phase of a continuous barrier in the West Bank, which Israel says is meant to stop attacks [1][2]. '
             'In 2004 the International Court of Justice advised that the wall built inside the occupied territory is contrary to international law [3]. '
             'In August–September 2005 Israel evacuated all 21 settlements in Gaza and four in the northern West Bank [4]. '
             'Israel said there was then no basis for calling Gaza occupied; the Palestinian Authority argued that Israel remained the occupying power while it controlled the crossings [5][6].',
             [R('west-bank-barrier-construction-2002', 'icj-2004-wall-ao', 'the Israeli Cabinet approved'), R('west-bank-barrier-construction-2002', 'icj-2004-wall-ao', 'Israel has argued'),
              R('icj-wall-advisory-opinion-2004', 'icj-2004-wall-ao', 'By fourteen'), R('gaza-disengagement-2005', 'crs-rs22000-2005', 'the government approved'),
              R('gaza-disengagement-2005', 'un-a-hrc-12-48'), R('gaza-disengagement-2005', 'crs-rs22000-2005', 'The PA rejected')], month=10, view=WIDE, layers=NOW),
        step(2010, 'Hamas, Gaza and the blockade',
             'Hamas won 74 of the 132 seats in the 2006 legislative election [1]. '
             'In June 2007, after fighting with Fatah, Hamas took control of the Gaza Strip, while a Fatah-led emergency cabinet governed the West Bank [2]. '
             'Israel and Egypt then blockaded Gaza [3]. '
             'Wars between Israel and Hamas followed in 2008–09, 2012, 2014 and 2021 [4][5][6][7].',
             [R('palestinian-legislative-election-2006', 'britannica-palestinian-authority'), R('hamas-takeover-of-gaza-2007', 'britannica-hamas'),
              R('gaza-declared-hostile-territory-2007', 'britannica-israel-hamas-war'), R('gaza-war-2008-2009', 'un-a-hrc-12-48', 'lasted from'),
              R('gaza-conflict-2012', 'palquest-gaza-war-2014', 'Israel launched'), R('gaza-war-2014', 'israel-mfa-2015-gaza-conflict-report'),
              R('israel-palestine-crisis-2021', 'palquest-gaza-war-2021', 'The fighting ended')], view=WIDE, layers=NOW),
        step(2023, '7 October 2023',
             'On 7 October 2023 Hamas and other armed groups from Gaza attacked southern Israel; Hamas’s military commander announced it as “Operation Al-Aqsa Flood” [1][2]. '
             'A UN commission of inquiry found that the war crimes of deliberately attacking civilians and murder had been committed [3]. '
             'Hamas has described it as “a necessary step and a normal response to confront all Israeli conspiracies against the Palestinian people” [4]. '
             'The next day Israel declared war, for the first time since 1973 [5].',
             [R('october-7-attack-2023', 'britannica-israel-hamas-war', 'Hamas, along with'), R('october-7-attack-2023', 'aljazeera-2023-10-07-al-aqsa-flood'),
              R('october-7-attack-2023', 'un-a-hrc-56-26'), R('october-7-attack-2023', 'hamas-2024-our-narrative'), R('october-7-attack-2023', 'britannica-israel-hamas-war', 'The next day')],
             month=10, view=WIDE, layers=NOW),
        step(2024, 'The courts',
             'In January 2024, in a case brought by South Africa, the International Court of Justice ordered Israel to take all measures within its power to prevent acts covered by the Genocide Convention against Palestinians in Gaza [1]. '
             'In July 2024 the court advised that Israel’s continued presence in the occupied Palestinian territory is unlawful [2]. '
             'Prime Minister Netanyahu responded that “the Jewish people are not occupiers in their own land” [3]. '
             'In November 2024 the International Criminal Court issued arrest warrants for Netanyahu and former defence minister Yoav Gallant, after rejecting Israel’s challenge to its jurisdiction [4][5].',
             [R('icj-south-africa-v-israel-provisional-measures-2024', 'icj-pr-2024-6', 'By fifteen'), R('icj-opt-advisory-opinion-2024', 'icj-2024-opt-ao', 'By eleven'),
              R('icj-opt-advisory-opinion-2024', 'algemeiner-2024-07-19-netanyahu'), R('icc-arrest-warrants-netanyahu-gallant-2024', 'icc-pr-2024-11-21', 'Today'),
              R('icc-arrest-warrants-netanyahu-gallant-2024', 'icc-pr-2024-11-21', 'Israel challenged')], month=12, view=WIDE, layers=NOW),
        step(2025, 'Recognition and ceasefire',
             'In September 2025 the United Kingdom, Canada, Australia, Portugal, France and other states recognised a Palestinian state [1][2]. '
             'Prime Minister Netanyahu said a Palestinian state “will not happen” [3]. '
             'A US-brokered ceasefire took effect in Gaza on 10 October 2025, and the last surviving hostages were released on 13 October [4]. '
             'Israeli forces withdrew to the “Yellow Line”, keeping about half of the Strip [5].',
             [R('recognitions-of-palestine-september-2025', 'ap-2025-09-21-recognition', 'The U.K.'), R('recognitions-of-palestine-september-2025', 'aljazeera-2025-09-23-recognition'),
              R('recognitions-of-palestine-september-2025', 'ap-2025-09-21-recognition', '“It will not happen,”'), R('gaza-ceasefire-october-2025', 'britannica-israel-hamas-war'),
              R('gaza-ceasefire-october-2025', 'aljazeera-2026-10-10-board-of-peace')], month=10, view=WIDE, layers=NOW),
        step(2026, 'Today',
             'In November 2025 the UN Security Council endorsed a US plan for Gaza with a transitional “Board of Peace” [1]. '
             'In December 2025 Israel’s defence minister said Israel would “never leave all of Gaza” [2]. '
             'A year after the ceasefire, Human Rights Watch reported that Israel kept moving the Yellow Line westward [3]. '
             'In October 2026 a presidential decree set Palestinian legislative and presidential elections for 11 September 2027 [4].',
             [R('unsc-resolution-2803-board-of-peace-2025', 'unsc-res-2803-2025'), R('gaza-ceasefire-october-2025', 'aljazeera-2025-12-23-katz'),
              R('gaza-ceasefire-october-2025', 'hrw-2026-10-10'), R('palestinian-legislative-elections-called-and-postponed-2026', 'cec-ps-legislative-elections-2026', 'صدر مرسوم')],
             month=10, view=WIDE, layers=NOW),
    ],
}

# ---------------------------------------------------------------- write
if missing:
    print('QUOTES NOT FOUND:'); [print('  ', r, '|', q[:120]) for r, q in missing]
os.makedirs(os.path.join(DATA, 'stories'), exist_ok=True)
for sid, st in stories.items():
    out = {'$schema': '../../schema/story.schema.json', 'id': sid, **st}
    with open(os.path.join(DATA, 'stories', f'{sid}.json'), 'w') as f:
        json.dump(out, f, ensure_ascii=False, indent=2); f.write('\n')
    print(sid, len(st['steps']), 'steps')
