# Milestone 9 brief: peoples of the land through time

Follow every rule in `BRIEF_M8h.md` (same folder): honest verification levels, verbatim quotes under 40 words checked by script,
no Wikipedia citations, no browser tools, no sub-agents, no unauthorised copies linked, no local paths in notes, no casualty
figures, do not edit anything under <project>. accessed: "2026-10-20".

## Purpose
Readers want to follow the peoples of this land through time: where each came from, what it became, what it merged into, where
it went. The site is read by people with strong views on every side. Record what scholars say, attributed, with the kind of evidence.

## Neutrality rules for this topic (hard)
- Do not label any people "indigenous" or "native" in a record. Both Palestinians and Jews describe themselves as the land's
  indigenous people; that debate goes into a perspectives topic (see 4), not into the lineage data.
- Keep evidence types apart and say which a statement rests on: `textual-tradition` (e.g. the Bible, later traditions),
  `documentary` (inscriptions, chronicles, archives), `archaeological` (material culture), `linguistic`, `genetic` (ancient or modern DNA).
- Genetics shows shared ancestry, not identity or rights: quote what a study found (e.g. "Bronze Age Southern Levant ancestry contributes
  to present-day Jewish and Arab groups") and do not extend it. Prefer peer-reviewed open-access studies (Cell, Nature, Science Advances,
  AJHG, PLOS) and give their exact wording.
- Where scholars disagree (e.g. Israelite origins; continuity versus replacement of the population after the Islamic conquest; the origins of
  Palestinian Arabs; the origins of Ashkenazi Jews), record each position as its own link or in the link's notes, with sources from
  different traditions (Israeli, Palestinian/Arab, Western, international).

## Output: `m9-p<N>.json` in this folder
{
  "sources": [ as in BRIEF_M8h (new entries, or stubs {"id","existing":true,"verification":{...}} for sources already in data/sources.json) ],
  "peoples": [ {
      "id": "kebab-case", "name": {"en": "..."}, "also_known_as": ["..."],
      "kind": "people" | "religious-community" | "tribal-confederation" | "community",
      "attested": {"start": HistDate, "end": HistDate | null},   // as a distinct, named group in the sources; null end = still exists
      "homeland": {"en": "where they lived in or near the map area"}, "units": ["geo unit ids from data/geo/units.json", ...],
      "related": {"polities": [...], "cultures": [...], "languages": [...], "migrations": [...], "groups": [...]},   // ids that already exist in /data
      "summary": {"en": "2-4 neutral sentences"}, "basis": ["documentary", "archaeological", ...],
      "confidence": "documented" | "estimated" | "contested", "sources": [refs with quotes], "notes": {"en": "..."} } ],
  "links": [ {
      "id": "from--type--to", "from": "people id", "to": "people id" or null with "destination": {"en": "label", "coords": [lon, lat]} for places outside the data,
      "type": "continued-as" | "merged-into" | "assimilated-into" | "contributed-to" | "migrated-to" | "split-into" | "converted-to",
      "start": HistDate, "end": HistDate | null,
      "evidence": ["documentary" | "archaeological" | "textual-tradition" | "linguistic" | "genetic"],
      "summary": {"en": "one or two sentences, attributed"}, "confidence": "documented" | "estimated" | "contested",
      "sources": [refs with quotes; a contested link needs at least two sources stating the different positions], "notes": {"en": "..."} } ],
  "perspectives": [ only group P3: see 4 ],
  "gaps": [ "..." ]
}
HistDate is {"year": signed int (no year 0; negative = BCE), "month"?, "day"?, "circa"?, "precision": "year"|"decade"|"century"|"millennium", "latest"?}.
Read data/polities.json, data/cultures.json, data/languages.json, data/migrations.json and data/geo/units.json first and reuse their ids in "related".
Give a people only once across groups: P1 owns peoples first attested before 539 BCE, P2 those first attested 539 BCE–640 CE, P3 those from 640 CE;
links may point to peoples of another group by the id you expect them to use (list such ids under "gaps" so they can be matched).

## Groups
- **P1: Bronze and Iron Ages.** Canaanites (and Amorites as relevant), Hyksos, Israelites / Judahites (textual tradition and archaeology apart;
  e.g. emergence from the Canaanite population, Finkelstein, Faust, Dever, Killebrew), Philistines (Feldman et al. 2019 aDNA), Phoenicians,
  Arameans, Ammonites, Moabites, Edomites, the deportations and exiles, and what became of each by the Persian period.
- **P2: 539 BCE – 640 CE.** Judeans / Jews (the return, Hellenistic and Roman periods, the diaspora), Samaritans, Idumeans (merger into Judeans under the
  Hasmoneans), Itureans, Nabataeans (absorption into Provincia Arabia; Arab tribes), Greek-speaking city populations, Christians (conversion of the
  local population), Arab tribal groups before Islam (e.g. Ghassanids), and what became of each.
- **P3: 640 CE – today.** The local population's Arabisation and Islamisation (pace and continuity debates: Levtzion, Ellenblum, Avni, Bulliet; Arab
  and Palestinian historians), Christians of the land, Samaritans, Jews in the land and in the diaspora (Sephardi, Ashkenazi, Mizrahi; return
  migrations), Druze, Bedouin tribes, Franks, Mamluk and Ottoman-era settlers (Egyptians, Maghrebis, Kurds, Bosnians, Circassians), Palestinian
  Arabs, Israeli Jews, the Palestinian refugees and diaspora. Genetic studies of present-day Palestinians and Jews (e.g. Behar 2010, Haber, Nebel,
  Agranat-Tamir 2020) as published.
  P3 also drafts one perspectives topic, "Who are the indigenous people of the land?", in the format of data/perspectives.json: accounts for the
  Palestinian view, the Israeli/Jewish view, and international scholarship (history, archaeology, genetics), each sentence ending with a citation
  marker [n] before the full stop, each account with its own sources.
