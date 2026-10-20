# Milestone 9, round b: improving the peoples data

Follow every rule in `BRIEF_M8h.md` and the neutrality rules in `BRIEF_M9_peoples.md` (same folder): honest verification levels,
verbatim quotes under 40 words checked by script, no Wikipedia citations, no browser tools, no sub-agents, no unauthorised copies
linked, no local paths in notes, no casualty figures, no "indigenous/native" labels on peoples, evidence types kept apart, do not edit
anything under <project>. accessed: "2026-10-20".
Read <project>/data/peoples.json (45 peoples, 86 links), data/languages.json, data/groups.json first.

## Q1: religions, languages and language descent  →  m9-q1.json
For every people in data/peoples.json, record which religion(s) and which language(s) the sources attribute to it, with periods:
{
  "sources": [ ... as in BRIEF_M8h ... ],
  "people_attributes": [ {
      "people": "<people id>",
      "religions": [ {"label": {"en": "e.g. Canaanite religion / Judaism / Samaritanism / Sunni Islam / Druze faith / Greek Orthodox Christianity"},
                      "group": "<optional religion-axis id from data/groups.json: jews, christians, muslims, samaritans, druze, bahais>",
                      "start": HistDate?, "end": HistDate|null?, "confidence": "documented"|"estimated"|"contested", "sources": [refs with quotes]} ],
      "languages": [ {"language": "<id from data/languages.json, or a new id you add under new_languages>", "start": HistDate?, "end": HistDate|null?,
                      "note": {"en": "..."}?, "confidence": ..., "sources": [refs with quotes]} ] } ],
  "language_lineage": [ {"language": "<id>", "descends_from": ["<language ids>"], "note": {"en": "one sentence"}, "sources": [refs with quotes]} ],
  "new_languages": [ full records in the format of data/languages.json, only where needed (e.g. ammonite, edomite, judaeo-arabic,
                     western-neo-aramaic, palestinian-arabic as a modern spoken variety if the sources treat it so) ],
  "language_patches": [ {"language": "<id>", "add_periods": [period objects in the languages.json format], "why": "..."} ],
  "gaps": [...]
}
Aim: a reader can follow each people to the languages and religions of today (e.g. Canaanite → Phoenician and Hebrew → Modern Hebrew;
Aramaic → Syriac and Western Neo-Aramaic; Arabic → the spoken Arabic of Palestinians today). Hebrew needs a period for its revival as a
spoken language from the late 19th century, with sources. Quote linguists and historians; keep the descent of languages separate from the
descent of peoples (a people can change language).

## Q2: audit and second sources  →  m9-q2.json
1. Check every people and link in data/peoples.json against its own quoted sources: dates (attested start/end, link start/end), the summary's
   claims, the link type and confidence. Where a statement is not supported by the quotes, or a date is wrong, propose a correction quoting the
   source (patch format of BRIEF_M8h, "file": "peoples.json", "id": the people or link id; fields: "summary", "notes" (mode append), "start",
   "end", "attested", "confidence", "type").
2. The items listed in `m9b_single.txt` are marked "documented" on a single source: add an independent second source, or propose
   "confidence": "estimated".
3. Clarity: flag any summary a general reader would not understand (jargon, unexplained terms like "toparchy", "Rum", "Musta'arabim") and
   propose a clearer one-sentence wording (mode "replace-sentence" with the exact "from" sentence).
Report counts of: checked, confirmed, corrected, second sources added, downgraded, clarified.

## Q3: missing communities  →  m9-q3.json  (format of BRIEF_M9_peoples: "peoples", "links", "sources", "gaps")
Add the communities of the land that are missing, each with links to existing peoples where the sources support them:
Armenians of Jerusalem and the land (from late antiquity), Syriac / Assyrian Christians, Copts, Ethiopian Christians (the Ethiopian Orthodox
community, distinct from Beta Israel), Maronites, Greek Orthodox (Rum) clergy and Greek community if distinct from Arab Christians in the
sources, Kurds (Ayyubid and later), Turkmen, the Dom (Nawar), Afro-Palestinians, the Maghrebi community of Jerusalem, the Bahá'í community,
the Ahmadiyya of Kababir, Russian and German (Templer) communities where not already covered by migrations, and any other community the
sources treat as distinct. Use ids that do not clash with data/peoples.json.
