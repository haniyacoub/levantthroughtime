# Milestone 8, round H brief

The project is an educational, neutral history map of Israel/Palestine. Its data lives in
<project>/data. **Do not edit anything under <project>.**
Read the data files there to see each record in full. Work only in the scratchpad research folder:
<scratch> = <scratch>/research
Your targets are in `<scratch>/m8h_targets.txt` under your group heading (or, for group H4, in this brief).
Put downloads in `<scratch>/m8h<your group letter+digit>_dl/` and scripts in `<scratch>/m8h<…>_scripts/`.

## Rules (hard)
- Cite only what you actually opened. Record verification honestly: full-text, excerpt (only a part seen),
  catalogue-only (only bibliographic data seen; never the sole support of a fact), cited-via (seen quoted in another work; give `via`).
- Verbatim quotes under 40 words, checked by script against the text you downloaded. Never quote from a search-engine or model summary.
- No Wikipedia citations (you may use it to find sources). No sub-agents. No Claude in Chrome / browser tools.
- **Linking:** never put a URL to a copy that is not authorised: user uploads of in-copyright books on the Internet Archive or similar,
  Internet Archive lending-library ("borrow") copies, shadow libraries, Scribd/academia.edu re-uploads by third parties.
  You may read such a copy only if nothing better exists; then omit `url` and say in the verification note
  "read in a third-party copy of uncertain licensing status; not linked". Public-domain scans (pre-1930 US publications,
  or uploads by the library/publisher itself), open-access journals and official sites are fine to link.
- Never put local file paths (e.g. where you saved a download) in any note or field. Describe the copy instead
  ("Internet Archive OCR of the University of Toronto scan").
- No casualty figures anywhere.
- Modest web searching; prefer direct fetches of known URLs. Save your output file after every 10 records.
  Finish within this session; list gaps rather than continuing indefinitely.
- If a scholarly source contradicts a record, propose a change (do not silently adopt it), quoting both sides.
- Keep textual tradition and archaeology apart: for a biblical king or event cite both the text and the archaeological or
  epigraphic evidence (or its absence), and say which basis a quote supports.
- Balance: on contested topics include scholars from different traditions (Israeli, Arab/Palestinian, Western, Turkish) where open.

## Output: `<scratch>/m8-h<N>.json` (e.g. m8-h1.json)
{
  "sources": [ full new source entries in the project format: id (lowercase-kebab), type, authors, title, container, publisher, year,
               url (omit if not linkable), doi/isbn if any, accessed: "2026-10-20", verification: {level, note},
               kind: "academic"|"reference"|"primary"|"government"|"un"|"press"|"ngo"|"religious-institution", institution_country (ISO code or "UN") ;
               for a source that already exists in data/sources.json, give only {"id", "existing": true, "verification": {"level", "note"}}
               where level is what you achieved now and note says what you read (pages/sections) ],
  "patches": [
    { "file": "polities.json" | "population.json" | "<territory file>.geojson" | "events.json" | "rulers.json" | "conflicts.json" | "places.json" | "migrations.json",
      "id": "<record id>",
      "relation": <index, ONLY for polity relations: the patch then applies to polities[id].relations[index]>,
      "add_sources": [ {"ref": "<source id>", "locator": "page/section", "quote": "verbatim < 40 words", "via": "optional"} ],
      "proposed_change": null | { "field": "start" | "end" | "type" | "overlord" | "confidence" | "notes" | ..., "mode": "append" (notes only) ,
                                  "from": <current value>, "to": <new value>, "why": "one or two sentences", "sources": [refs as above] },
      "more_proposed_changes": [ further changes in the same format ] }
  ],
  "new_records": [ only if your group asks for them: {"file": ..., "record": {full record in the project format}} ],
  "gaps": [ "record ids you could not source, and why" ]
}
Check the file with `python3 -I -m json.tool`. Finish with a short report: counts, main sources, proposed changes, gaps.

## Group notes
- **H1 and H2 (polity relations).** Each target is one relation (e.g. "Kingdom of Judah, vassal of the Neo-Assyrian Empire")
  whose only sources are reference works. Find primary or scholarly evidence for the relation and for its start and end dates.
  Primary texts in reliable editions are welcome (RINAP / ORACC for Assyrian royal inscriptions; Josephus, Strabo, Cassius Dio on
  LacusCurtius/Perseus; al-Baladhuri; Ibn al-Qalanisi; Ottoman documents in translation), alongside scholarship (the Wisconsin
  *History of the Crusades*, Mamluk Studies Review, Encyclopaedia Iranica, TDV İslâm Ansiklopedisi, Persée, OpenEdition, BMCR, UC Press E-Books).
  Many polities already have scholarly sources in data/sources.json: re-using a source the project already has is fine and cheap,
  but quote the passage that supports the relation and give it as an existing-source stub with what you re-read.
  If the relation's type, overlord or dates are wrong, propose a change.
- **H2 additionally:** draft a new polity record `burid-damascus` (the Burid atabegate of Damascus, from Tughtigin's
  rule after Duqaq, c. 1104, to Nur al-Din's entry on 25 April 1154), with one or more territory slices
  (units such as damascus, bashan, partial golan and lebanon-mountains; check data/geo/units.json for unit ids and look at an
  existing territory file for the format) and its relations (e.g. vassal of zengid-state 1150/51–1154 if supported). Gibb's chapters in
  the Wisconsin History of the Crusades vol. I and Ibn al-Qalanisi (Gibb's 1932 translation; do not link it) are starting points.
  Give its name in en with ar and he drafts marked machine-draft.
- **H3 (works seen only second-hand).** The targets are population estimates whose sources were only seen quoted (mostly in
  Bachi 1977). Several underlying works are public domain and on archive.org or HathiTrust: Conder's article in Hastings'
  Dictionary of the Bible (1900, 25 records), Albright 1925 in the Journal of the Palestine Oriental Society (17 records),
  Juster 1914, Beloch 1886, Meyer 1909, Harnack 1915, F. C. Grant 1926, Socin in Encyclopaedia Biblica, Derwacter 1930.
  Read the passages and give each source an existing-source stub with level full-text/excerpt and what you read, and
  add direct quotes (no `via`) to the population records. If the original's figure differs from the record's, propose a change.
  For in-copyright works (Baron 1972, Broshi 1975, Avi-Yonah 1947/1966, Carter 1999, Lipschits 2005, Byatt 1973, McCown 1947),
  look for an open-access copy (author or publisher upload, Persée, Gallica, JSTOR early content) or for an open-access modern
  study that reports the same estimate directly; otherwise list them as gaps.
- **H4 (modern gaps)** — targets:
  1. Inauguration (swearing-in) days for the Israeli presidents: weizmann-president, ben-zvi-president, shazar-president,
     katzir-president, navon-president, chaim-herzog-president, ezer-weizman-president, katsav-president, peres-president,
     and the start day of rivlin-president. The Knesset and President's Office sites block automated access; try the JTA
     archive (jta.org, contemporary press reports), the Israel State Archives, the Israeli foreign ministry, Davar/Maariv via
     the National Library of Israel's historical press, UN or US records. Propose day-precision starts and ends.
  2. hafez-assad-president-syria: a contemporary or official source for the March 1971 start (FRUS, CIA reading room, UN, SANA history, scholarship).
  3. egypt-2 (Egyptian administration of Gaza 1948–1967): a scholarly or official source on its legal status (that Egypt did not annex the Strip).
  4. lebanese-civil-war-1975-1990: sources for the start (13 April 1975) and end (13 October 1990) days.
  5. eilat (places.json): an archaeological, historical or official source for the founding (1949/1951) and the place's history.
  6. hebron-jewish-community-1929-1936 (migrations.json): a second source for the 1936 evacuation.
  7. A Kingdom of Hejaz polity is missing: the annexation of Ma'an and Aqaba to the Hijaz (1918/19) and their transfer to Transjordan (1925).
     Draft a new polity record `kingdom-of-hejaz` with a territory slice limited to the map area (unit ids from data/geo/units.json,
     e.g. aqaba-hisma, partial edom) for 1918/19–1925, with sources; ar and he names as machine-draft.
