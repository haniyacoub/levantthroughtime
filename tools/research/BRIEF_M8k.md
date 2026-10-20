# Milestone 8, round K brief: published population estimates and breakdowns before 1517

Follow every rule and the output format in `BRIEF_M8h.md` (same folder): honest verification levels, verbatim quotes under 40 words
checked by script, no Wikipedia citations, no browser tools, no sub-agents, no unauthorised copies linked, no local paths in notes,
no casualty figures, do not edit anything under <project>. accessed: "2026-10-20".

## Why
Readers ask why the population chart has so few figures before the Ottoman period and no breakdown by religion before 1533.
The site shows only published figures (never interpolated). Find the published estimates that exist for your period and add them.

## What to add (as `new_records`)
1. **Population estimates** (`"file": "population.json"`): one record per estimate, exactly as the scholar gives it, in the format of
   `PopulationPoint` in <project>/src/schema/index.ts (read it, and look at existing records in
   data/population.json for the style):
   - `id` (kebab-case, author-year-topic), `area` (an existing id from data/areas.json if the scholar's territory matches one; otherwise
     propose a new area, see 3), `date` (HistDate; use `circa`, `precision` and `latest` honestly), `total` as a Range
     ({low, high, best?}; null bounds allowed; `best` only if the source gives one), optional `composition`
     ([{axis: "religion"|"ethnicity", groups: [{group, count|share_pct as a Range}], partial: true if the source gives only some groups}]),
     `basis` (estimate-archaeological / estimate-textual / estimate-tax-register / estimate-other / registration),
     `method` (one sentence: how the scholar got the figure), `confidence` ("estimated", or "contested" when scholars disagree; a
     contested record needs at least two different sources, typically the estimate and a scholar who disputes it),
     `sources` (quotes!), `notes` ({"en": "..."}), English only.
   - Never compute, average or interpolate a figure yourself. If a source gives a share but no total, record the share (`share_pct`)
     with `total: null` only if the schema allows it, else attach it to the same scholar's total.
2. **Groups** (`"file": "groups.json"`) only if needed: existing ids are religion: jews, christians, muslims, samaritans, druze, others…;
   ethnicity: israelites, jews, arabs, franks, local-population, others. Propose new ones (e.g. religion "pagans" for the Roman period)
   as {"id", "axis", "name": {"en": "..."}, "notes"?}.
3. **Areas** (`"file": "areas.json"`) only if no existing area fits the scholar's territory: {"id", "name": {"en"}, "definition": {"en"},
   "sources": [...]} following existing entries in data/areas.json.

Balance: include Israeli, Palestinian/Arab and international scholars where they publish estimates; where estimates differ widely
(e.g. the size of the Jewish population in the Roman period, or how fast the population became Muslim), add each as its own record.
Prefer open-access sources; record catalogue-only or cited-via honestly (a figure resting only on cited-via is acceptable but marked).

## Groups
- **K1: 539 BCE – 640 CE**, plus Iron Age figures broken down by kingdom or region (e.g. Broshi & Finkelstein 1992 give Iron II figures for
  Judah, Israel, Philistia…; record each region as its own record with an appropriate area). Persian Yehud, Hellenistic and Hasmonean
  Judea, the Roman and Byzantine periods (Jews, Samaritans, Christians, pagans: e.g. Broshi, Avi-Yonah, Schwartz, Safrai, Tsafrir, Dauphin,
  Bar, Di Segni; Arab and international scholarship where available).
- **K2: 640 – 1517**: early Islamic (the pace of conversion: e.g. Levtzion, Bulliet, Ellenblum, Avni, Gil), Crusader (Franks and local
  Christians and Muslims: Prawer, Benvenisti, Ellenblum, Kedar, Russell), Ayyubid and Mamluk (Ashtor, Drory, Russell, Mamluk tax and
  waqf records, Arab historians), the Black Death.

Output: `m8-k<N>.json` in this research folder with "sources", "patches" (if any), "new_records", "gaps".
Finish with a short report: records added by period, sources by side, gaps.
