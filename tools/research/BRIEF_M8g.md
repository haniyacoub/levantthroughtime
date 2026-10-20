# Milestone 8 brief: fill known gaps with new records

The project (a neutral, educational history map of Israel/Palestine; see BRIEF_M8.md for the hard rules, which
all apply: cite only what you opened, honest verification levels, verbatim quotes < 40 words, no Wikipedia
citations, no sub-agents, no browser tools, modest web searching, save often, finish within the session) has
these known gaps. Research each and write ONE file: `<scratch>/research/m8-g.json`. Do not edit anything under
the project folder; read `data/*.json`, `data/territories/*.geojson` and `data/geo/units.json` freely.

## Tasks
1. **Zengids.** A polity record for the Zengid state as it bore on the map area (Nur al-Din's rule of Damascus
   1154–1174, and any earlier reach), with territory slices, rulers (Zengi, Nur al-Din), and relations to the
   Abbasid caliphate / Seljuks if sourced. Check what the project already says about Damascus in 1099–1174
   (Burids? Atabegs?) and do not duplicate an existing polity.
2. **Mamluk provinces of Kerak and Jerusalem.** The project has `mamluk-niyaba-safad`, `-gaza`, `-damascus`.
   Add `mamluk-niyaba-karak` and, if the sources support a separate province, `mamluk-niyaba-jerusalem`
   (with its date of creation), each with territory slices. Mamluk Studies Review (open access) is a good start.
3. **Languages:** records for Russian (late-Ottoman and post-1989 immigration), Amharic (Ethiopian Jews,
   from 1984), and Domari (the Dom community of Jerusalem and elsewhere), with periods, roles and speakers.
4. **The 1253 treaty.** Ziada (1969) says Aybeg held 'a slice of Palestine … including Jerusalem as well as the
   coastline' from April 1253. Find a second source (e.g. Humphreys, *From Saladin to the Mongols*, 1977,
   or another study) that confirms or contradicts it, and if confirmed propose the territory change exactly.
5. **Faisal's administration in Transjordan (1918–1920)** and **the Ottoman occupation of Sinai (1915–1916)**:
   propose territory slices (which units, full or partial, dates) with sources, so the map can show them.

## Formats
`<scratch>/research/m8g_examples.json` holds one real record of each kind from the project (polity, territory
feature, ruler, language, source). Copy those shapes exactly. Territory features have `"geometry": null`; their
shape comes from `units` (fully held) and `partial_units` (partly held), which must be ids from this list:
phoenician-coast, lebanon-mountains, upper-galilee, acre-plain, lower-galilee, carmel-sharon, jezreel, samaria,
philistia, shephelah, judea, judean-desert, jordan-valley, negev-north, negev-south, arabah, sinai-north, sinai,
golan, bashan, damascus, gilead, ammon, madaba-plain, moab, edom, aqaba-hisma, badia — and for modern dates
also israel-1949, west-bank, east-jerusalem, gaza-strip, golan-heights, shebaa-farms, sinai-egypt, transjordan,
lebanon, syria. Give each territory feature a unique `id` (e.g. `zengid-damascus-1`). Dates use signed years
(no year 0) with `precision`; use `circa` and `latest` for windows.

Output:
{
  "sources": [full source entries; for ids already in data/sources.json add only {"id", "existing": true, "verification": {...}}],
  "new_polities": [polity records],
  "new_territories": [ {"file": "<polity-id>.geojson", "features": [features]} ],
  "new_rulers": [ruler records],
  "new_languages": [language records],
  "patches": [ same as BRIEF_M8.md: {"file","id","add_sources",[ "proposed_change" ], ["more_proposed_changes"]} for existing records ],
  "proposed_territories": [ {"file": "<existing territory file>", "feature": {new feature}, "why": "...", "sources": [refs]} ],
  "gaps": ["..."]
}
Check with `python3 -I -m json.tool`. Report counts, main sources, what you could not establish.
