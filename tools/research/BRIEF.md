# Research brief — shared by all data-research agents

Project: a public, educational interactive history map of the southern Levant (the land now Israel and the Palestinian territories, plus neighbouring areas for context), 10,000 BCE to today (18 Oct 2026). It will be scrutinised by people with strong views on every side. Accuracy and evenhandedness are requirements.

## Hard rules
1. NEVER invent a number, date, border, name or citation. If you can't find it, leave it out or mark it `"confidence": "unknown"`.
2. Every non-unknown record needs at least one source you actually saw. Record honestly HOW you saw it in the source's `verification.level`:
   - `full-text` — you read the relevant passage in the work itself (PDF, HTML, scan with text).
   - `excerpt` — you saw the relevant passage/table in a preview, abstract or snippet of the work itself.
   - `catalogue-only` — you only confirmed the work exists (catalogue/DOI record), not its content. Don't use such a source alone to support a fact.
   - `cited-via` — you saw the fact quoted in ANOTHER work; then cite the original AND put the secondary work's id in the record's source entry `via` field, and ALSO add the secondary work to `sources`.
3. Do NOT cite Wikipedia. You may use it to find sources, but cite only works you then actually opened.
4. Prefer, in order: peer-reviewed/academic works you can open (open access, university repositories, publisher previews); official statistics and primary documents; reputable reference works (Encyclopaedia Britannica online is acceptable as a tertiary source for first-pass dates; Encyclopaedia Iranica; Metropolitan Museum Heilbrunn Timeline). Avoid partisan advocacy sites as sole sources.
5. Where scholars disagree, set `"confidence": "contested"`, give at least two sources with differing positions, and explain the disagreement neutrally in `notes`.
6. For the early Israelite period (Exodus, conquest, United Monarchy extent): keep "textual tradition" and "archaeological" accounts as separate records with `"basis": "textual-tradition"` or `"basis": "archaeological"`, both marked contested.
7. Use neutral, descriptive language.
8. Include a short verbatim `quote` (under 40 words) from the source supporting each key date/number when you have the text.
9. Do not modify anything in <project>. Write ONLY your output JSON file (path given in your task). Make sure it is valid JSON (check it with `python3 -I -m json.tool <file>`).

## Formats

Date object: `{"year": -586, "month": 7, "circa": true, "precision": "year", "latest": -585}`
- `year`: signed integer, negative = BCE, NO year 0 (1 BCE = -1, 1 CE = 1). Required.
- `precision`: one of `day|month|season|year|decade|century|millennium`. Required.
- `month`, `day`, `circa`, `latest` (end of a scholarly window) optional.
- Convert cal BP to BCE as BCE ≈ BP − 1950 and record the original in notes.
- For an entity that still exists today, omit `end`.

Source entry (in the top-level `sources` array; `id` is lowercase-kebab like `bar-yosef-1998` or `britannica-hasmonean-dynasty`):
```json
{"id": "...", "type": "book|article|chapter|web|dataset|document|map|census",
 "authors": ["Last, First"], "title": "...", "container": "journal / book / website title",
 "publisher": "...", "year": 1998, "volume": "", "issue": "", "pages": "", "edition": "",
 "doi": "", "url": "", "accessed": "2026-10-18",
 "verification": {"level": "full-text|excerpt|catalogue-only|cited-via", "note": "what exactly you saw and where"},
 "kind": "academic|government|un|ngo|press|reference|religious-institution",
 "institution_country": "ISO-2 country of the publishing institution, e.g. IL, PS, US, GB, DE"}
```
Record-level source reference: `{"ref": "<source id>", "locator": "page/table/section", "quote": "...", "via": "<secondary source id, only for cited-via>"}`

Localized name: `{"en": "...", "ar": "...", "he": "..."}`. Give `ar`/`he` ONLY if you found an established form in a reliable place (e.g. the Wikidata label — then put the QID in `"wikidata"` on the record). Otherwise omit them; they will be drafted later.

## Geographic units (for territories before 1917)
Territories before 1917 are described as unions of these schematic units (each one a rough geographic region). Pick the units that best match the source's textual description. Use `partial_units` for units only partly held, and say which part in `description`.

West of the Jordan:
- `upper-galilee` — Upper Galilee hills (Safed, Meron), incl. the hills of southern Lebanon (Jabal Amil) up to the Litani river
- `lower-galilee` — Lower Galilee (Nazareth, Sepphoris, western shore of the Sea of Galilee)
- `acre-plain` — coastal plain from Ras en-Naqura to Mount Carmel (Akko/Acre, Haifa bay)
- `phoenician-coast` — coast north of Ras en-Naqura: Tyre, Sidon, Beirut, up to Byblos
- `carmel-sharon` — Mount Carmel and the Sharon coastal plain south to the Yarkon river (Dor, Caesarea)
- `jezreel` — Jezreel and Harod valleys to Beth Shean
- `samaria` — Samarian hills (Shechem/Nablus, Samaria/Sebastia) from the Jezreel valley south to about Bethel
- `judea` — Judean hills from about Bethel to the southern Hebron hills (Jerusalem, Bethlehem, Hebron)
- `shephelah` — Judean foothills (Lachish, Beth Shemesh)
- `philistia` — southern coastal plain from the Yarkon to Raphia (Jaffa, Ashdod, Ashkelon, Gaza)
- `judean-desert` — eastern slopes down to the Dead Sea (En Gedi, Qumran)
- `jordan-valley` — the Jordan rift floor between the Sea of Galilee and the Dead Sea, both banks (Jericho)
- `negev-north` — Beersheba basin and northern Negev (Beersheba, Arad)
- `negev-south` — Negev highlands and southern Negev to the Gulf of Aqaba (Avdat, Eilat)
- `arabah` — Wadi Arabah rift from the Dead Sea to the Gulf of Aqaba
- `sinai-north` — northern Sinai coast from Raphia to Pelusium (el-Arish)
- `sinai` — rest of the Sinai peninsula
East of the Jordan and north:
- `golan` — Golan (Gaulanitis)
- `bashan` — Bashan/Hauran plateau east of the Golan (Daraa, Bosra)
- `gilead` — highlands between the Yarmuk and the Jabbok/Zarqa (Gerasa/Jerash)
- `ammon` — Amman plateau around the upper Jabbok (Rabbath Ammon / Philadelphia)
- `madaba-plain` — tableland from Heshbon/Madaba south to the Arnon (Wadi Mujib), incl. Dhiban
- `moab` — between the Arnon (Wadi Mujib) and the Zered (Wadi al-Hasa) (Kerak)
- `edom` — from the Zered south to Ras en-Naqb (Bozrah, Petra)
- `aqaba-hisma` — Hisma desert and Aqaba region south of Ras en-Naqb
- `badia` — eastern desert of Transjordan
- `damascus` — Damascus and its oasis
- `lebanon-mountains` — Mount Lebanon, the Beqaa valley and Anti-Lebanon

## Modern units (for territories from 1917 on)
`israel-1949` (Israel within the 1949 armistice lines), `west-bank` (excluding East Jerusalem), `east-jerusalem`, `gaza-strip`, `golan-heights`, `shebaa-farms`, `nml-latrun` (1949–67 no-man's land at Latrun), `nml-jerusalem` (no-man's land in Jerusalem), `mount-scopus` (1949–67 Israeli enclave), `sinai-egypt`, `transjordan` (today's Jordan), `lebanon`, `syria`. Mandate Palestine ≈ israel-1949 + west-bank + east-jerusalem + gaza-strip + the no-man's-land units + mount-scopus.

## Output for polity research
```json
{
 "sources": [ ...source entries... ],
 "polities": [
  {"id": "kebab-id", "name": {"en": "..."}, "wikidata": "Q...", "kind": "empire|kingdom|city-state|province|caliphate|sultanate|crusader-state|lordship|mandate|state|military-administration|authority|tribal-confederation|other",
   "start": {date}, "end": {date}, "confidence": "documented|estimated|contested|unknown", "basis": "textual-tradition|archaeological|documentary (optional)",
   "sources": [ {ref...} ], "notes": "caveats",
   "relations": [ {"type": "vassal|client|province|tributary|occupied|mandate|part-of|autonomous-under", "overlord": "<polity id>", "start": {date}, "end": {date}, "confidence": "...", "sources": [ {ref...} ], "notes": ""} ] }
 ],
 "territories": [
  {"polity": "<polity id>", "start": {date}, "end": {date}, "units": ["judea", "..."], "partial_units": ["..."],
   "boundary_certainty": "surveyed|approximate|schematic|contested",
   "description": "the source's description of the extent, in your words or a short quote",
   "confidence": "...", "sources": [ {ref...} ], "notes": ""}
 ]
}
```
Each polity needs 1–3 territory slices showing its extent in the map area at its main phases (low resolution is fine: this is a first pass). Overlords (empires) also need territory slices covering the units they controlled in the map area. Territory slices of the same polity should not overlap in time.
