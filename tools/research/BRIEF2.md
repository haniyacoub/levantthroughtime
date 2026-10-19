# Research brief, part 2 — formats for places, events, conflicts, migrations, languages, landscape, modern layers, perspectives

FIRST read the hard rules, date format, source format and source-reference format in BRIEF.md (same folder). They all apply here unchanged:
never invent; every non-unknown record cites a source you actually saw; honest verification levels (full-text | excerpt | catalogue-only | cited-via + `via`); no Wikipedia citations; contested = at least two sourced positions; neutral language; short verbatim quotes (< 40 words); write ONLY your output JSON file; validate it with `python3 -I -m json.tool`.

Additional rules:
- Localized text: `{"en": "..."}`; add `"ar"`/`"he"` only if you found an established form in a reliable place (e.g. a Wikidata label — then put the QID on the record). They will be marked as machine-draft (unreviewed) automatically.
- Keep descriptive text short: names, one-sentence descriptions, short notes. Every description must be supported by the record's sources.
- Ids: lowercase-kebab, unique within your file. Reuse polity ids from the project where you refer to polities (list: <project>/data/polities.json — read it, don't edit it). Reuse place ids if a places file you're told about exists; otherwise propose ids and give coordinates.
- Coordinates are `[longitude, latitude]` in decimal degrees (WGS84). Take them from Pleiades (CC BY) or Wikidata (CC0) and record which (`coords_source`: "pleiades:<id>" or "wikidata:<QID>").
- Casualty figures: leave empty (the user asked for this).

## Formats (top-level object of your file has `sources` plus the collections below)

### places
```json
{"id": "jerusalem", "name": {"en": "Jerusalem", "ar": "القدس", "he": "ירושלים"}, "wikidata": "Q1218", "pleiades": "687928",
 "kind": ["city", "holy-site"],            // city | town | village | port | fortress | archaeological-site | holy-site | region | outside-region
 "coords": [35.2316, 31.7767], "coords_source": "wikidata:Q1218", "coords_precision": "exact|approximate|uncertain",
 "founded": {date} | null, "founded_note": "...", "destroyed": [{"date": {date}, "by": "...", "note": "...", "sources": [ref]}],
 "names": [
   {"text": "Urusalim", "translit": "Urusalim", "display": {"en": "Urusalim"}, "lang": "akk", "script": "Xsux",
    "start": {date}, "end": {date}, "used_by": "Egyptian court correspondence (Amarna letters)", "primary": true,
    "confidence": "documented", "sources": [ref]}
 ],
 "holy_site": {"traditions": {
     "jewish": {"significance": {"en": "..."}, "sources": [ref]},
     "christian": {...}, "muslim": {...}, "samaritan": {...}, "druze": {...}, "bahai": {...}}},   // only traditions for which you have a source
 "confidence": "documented|estimated|contested|unknown", "sources": [ref], "notes": "..."}
```
`lang`: ISO 639 (he, hbo = Ancient Hebrew, arc = Aramaic, grc = Ancient Greek, la, akk, egy, ar, en, tr/ota, fr…). `script`: ISO 15924 (Hebr, Arab, Grek, Latn, Phnx, Armi, Samr, Xsux, Egyp, Syrc). `primary: true` marks the name most commonly used in that period by the governing administration or in the main sources (one primary per period where possible). `display` gives the name as an English, Arabic or Hebrew reader would see it.

### events (non-war)
```json
{"id": "balfour-declaration", "name": {"en": "Balfour Declaration"}, "kind": "declaration",   // political|treaty|declaration|foundation|construction|religious|natural-disaster|epidemic|administrative|cultural|economic|demographic|other
 "date": {date}, "end": {date}?, "place": "<place id>"?, "coords": [lon, lat]?,
 "description": {"en": "One sentence, supported by the sources."}, "importance": 1|2|3,      // 1 = shown at all zooms of time
 "confidence": "...", "sources": [ref], "notes": "..."}
```

### rulers
```json
{"id": "herod-the-great", "name": {"en": "Herod the Great"}, "polity": "<polity id>", "office": {"en": "King of Judaea (client of Rome)"},
 "start": {date}, "end": {date}, "confidence": "...", "sources": [ref], "notes": "..."}
```

### conflicts
```json
{"id": "first-jewish-roman-war", "name": {"en": "First Jewish–Roman War"},
 "alt_names": [{"text": {"en": "The Great Revolt"}, "used_by": "israeli|palestinian|arab|jewish-tradition|roman-sources|academic|international|...", "sources": [ref]}],
 "kind": "war|battle|siege|revolt|uprising|campaign|raid|civil-war|occupation",
 "parent": "<conflict id>"?, "start": {date}, "end": {date},
 "location": {"place": "<place id>"?, "coords": [lon, lat]?, "units": ["judea", ...]?, "description": {"en": "..."}},
 "belligerents": [{"side": "A", "parties": [{"polity": "<polity id>"} | {"group": {"en": "Jewish rebels"}}]}, {"side": "B", "parties": [...]}],
 "outcome": {"en": "One neutral sentence."}, "casualties": null,
 "confidence": "...", "sources": [ref], "notes": "..."}
```
Use the names both sides use where they differ (`alt_names`), each sourced.

### migrations
```json
{"id": "babylonian-exile", "name": {"en": "Babylonian exile"}, "group": {"en": "Judahites"},
 "types": ["deportation"],       // conquest-settlement|deportation|exile|return|immigration|emigration|refugee-flight|expulsion|labour-migration|tribal-migration|pilgrimage-settlement|resettlement|internal-displacement|colonization|other
 "origin": {"place": "<place id>"} | {"label": {"en": "Mesopotamia"}, "coords": [lon, lat]},
 "destination": {...same...},
 "start": {date}, "end": {date},
 "numbers": {"low": n|null, "high": n|null, "best": n}? | null,
 "direction": "in|out|within",
 "confidence": "...", "sources": [ref], "notes": "...", "contested_note": "..."}
```
When types are disputed (e.g. flight vs expulsion in 1948), list both types, mark contested, cite both positions.

### diaspora (snapshots for a world inset)
```json
{"id": "unrwa-jordan-2024", "group": "palestinian|jewish|...", "definition": {"en": "UNRWA-registered Palestine refugees"},
 "date": {date}, "location": {"label": {"en": "Jordan"}, "coords": [lon, lat]}, "number": {"low":..,"high":..,"best":..},
 "confidence": "...", "sources": [ref], "notes": "..."}
```

### languages
```json
{"id": "aramaic", "name": {"en": "Aramaic"}, "family": "Semitic (Northwest)", "scripts": ["Armi", "Hebr", "Syrc"],
 "periods": [{"start": {date}, "end": {date}, "role": "vernacular|administrative|liturgical|literary|lingua-franca",
              "speakers": {"en": "who used it"}, "confidence": "...", "sources": [ref]}],
 "sources": [ref], "notes": "..."}
```

### landscape
```json
{"sea_level": [{"id": "...", "date": {date}, "level_m": {"low": -40, "high": -30, "best": -35}, "location": "Israeli Mediterranean coast", "sources": [ref], "notes": "levels are relative to today's mean sea level"}],
 "dead_sea_levels": [{"id": "...", "date": {date}, "level_m": {...}, "sources": [ref], "notes": "metres relative to mean sea level (negative = below)"}],
 "trade_routes": [{"id": "via-maris", "name": {"en": "Via Maris"}, "alt_names": [...], "start": {date}, "end": {date},
                   "waypoints": [{"label": "Gaza", "coords": [lon, lat], "coords_source": "..."}], "certainty": "schematic",
                   "description": {"en": "..."}, "sources": [ref]}]}
```

### perspectives
```json
{"id": "causes-of-1948-exodus", "title": {"en": "Why did Palestinian Arabs leave or lose their homes in 1947–49?"},
 "about": ["<conflict/migration/event ids if known>"],
 "accounts": [
   {"perspective": "israeli", "label": {"en": "Israeli traditional account"},
    "summary": {"en": "Sentence one.[1] Sentence two.[2]"},
    "sources": [{"ref": "...", "locator": "...", "quote": "..."}, ...]}
 ],
 "notes": "..."}
```
In `summary`, EVERY sentence ends with one or more markers `[n]` that index the account's own `sources` list (1-based). Describe each position as its holders describe it, neutrally ("argues", "holds"), never declaring which is right. Include at least: an Israeli account, a Palestinian account, and an academic/international account; split further where the literature does (e.g. Israeli traditional vs "New Historians").
