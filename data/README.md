# The data: how to read it, check it and correct it

Everything the map shows comes from the files in this folder. No historical fact lives in the website code. This page explains the files for historians, reviewers and anyone who wants to fix something.

**After any change, run `npm run validate-data`.** It checks every rule below and tells you, in plain language, what's wrong and where. The website won't build while there are errors.

Working in VS Code? Each file names its schema on its first line (`"$schema": ...`), so the editor suggests field names and underlines mistakes as you type.

---

## 1. Rules every record follows

### Dates

```json
{ "year": -586, "month": 7, "circa": true, "precision": "year" }
```

- **`year`** is a whole number. Negative means BCE: `-586` is 586 BCE, `70` is 70 CE. **There is no year 0**: 1 BCE (`-1`) is followed directly by 1 CE (`1`), and the validator rejects `0`.
- **`precision`** says how exact the date is: `day`, `month`, `season`, `year`, `decade`, `century` or `millennium`.
- **`circa: true`** shows "c." before the date.
- **A scholarly window** ("between 722 and 720 BCE") is `{ "year": -722, "latest": -720, "precision": "year" }`.
- **Radiocarbon dates** in "cal BP" are converted with BCE ≈ BP − 1950; put the original BP value in `notes`.
- Dates before 1582 follow the Julian calendar, as is scholarly convention.
- An `end` date is **inclusive**: something that "ends in 63 BCE" existed during 63 BCE. Leave `end` out for things that still exist.
- The timeline runs from 10,000 BCE to the `as_of` date in `config.json`. A record may *start* before 10,000 BCE (the Natufian did) but must reach into the timeline. Nothing may be dated after `as_of`.

### Numbers are ranges

```json
{ "low": 60000, "high": 80000, "best": 70000 }
```

Never a single number where scholarship gives a range. Fill `best` only when the source itself gives one. An exact census count is `low = high = best`. The validator rejects `low > high` and a `best` outside the range.

### Confidence

Every record has one of:

| Value | Meaning | Rule |
|---|---|---|
| `documented` | Directly recorded: a census, a dated treaty, a contemporary record | Needs a source |
| `estimated` | A scholar's reconstruction or estimate | Needs a source |
| `contested` | Scholars or sides disagree | Needs **at least two different sources**, giving the competing positions |
| `unknown` | Not known | May have no source. The site shows "unknown", never a guess |

### Sources

Each record cites works by id:

```json
"sources": [
  { "ref": "barron-1923", "locator": "Table I", "quote": "…short supporting excerpt…" }
]
```

- **`ref`** points to an entry in **`sources.json`**, which holds the full citation once.
- **`locator`** is the page, table or map sheet.
- **`quote`** (optional, encouraged for numbers) lets a reviewer check without the book in hand.
- **`via`**: if a figure was seen only quoted in another work, name that work here. Never present a second-hand figure as if it came from the original.
- **`note`**: why this source is cited, e.g. "Alternative estimate: …".

Each entry in `sources.json` records **how it was checked**, in `verification.level`:

| Level | Meaning |
|---|---|
| `full-text` | The relevant passage was read in the work itself |
| `excerpt` | The passage or table was seen in a preview, abstract or transcription |
| `catalogue-only` | Only the work's existence was confirmed (library record, DOI). Not enough on its own to support a fact; the validator warns |
| `cited-via` | Only seen quoted in another work. Cite with `via` |

Sources also record `kind` (academic, government, UN, NGO, press, reference work, religious institution) and `institution_country`. A later report uses these to check that no topic relies only on one side's sources.

We never link to unauthorised copies of books. If a book was read in such a copy, its entry says so and links to a library catalogue record instead.

### Text in three languages

User-facing text is stored like this:

```json
"name": {
  "en": "Hasmonean kingdom",
  "ar": "المملكة الحشمونية",
  "he": "ממלכת החשמונאים",
  "translation_status": { "ar": "machine-draft", "he": "machine-draft" }
}
```

- English (`en`) is the original and is required.
- Arabic and Hebrew are optional, and each needs a `translation_status`: `machine-draft` (shown with a "not yet reviewed" notice), `reviewed`, or `original` (written in that language, e.g. a quotation).
- **When you review a translation, change its status to `reviewed`.**

### Ids

Ids are lowercase words joined by hyphens (`hasmonean-kingdom`). Don't change or reuse an id once it's published: shared links and other records depend on it.

---

## 2. The files

| File | What it holds |
|---|---|
| `config.json` | Site title, timeline start and `as_of` date, the year the map switches from archaeological cultures to political territories, map extent |
| `eras.json` | The slider's segments: label, start, **weight** (share of the slider's width, set by how much happened rather than by length) and **step** (how far one arrow-key press moves). `fine_steps` give finer steps inside key windows, e.g. single years during the revolts of 66–73 CE |
| `sources.json` | The bibliography |
| `polities.json` | States, empires, kingdoms, provinces, city-states. `relations` record vassal, client, province and similar ties to an overlord, each with its own dates and sources |
| `territories/<polity>.geojson` | Where each polity ruled, as time slices (one file per polity) |
| `cultures.json`, `culture-zones/<culture>.geojson` | Archaeological cultures before states existed, and their zones |
| `areas.json` | The areas that population figures refer to (e.g. "Mandate Palestine", "Israel as counted by its Central Bureau of Statistics"). Each has a written definition |
| `groups.json` | Religious, ethnic and population groups used in compositions |
| `population.json` | Population figures |
| `palette.json` | Fixed colours, with the reason for each pinned colour |
| `geo/units.json` | The schematic geographic units that pre-1917 territories are built from (see §3) |
| `geo/modern-units.geojson` | Modern reference outlines (1949 lines, West Bank, Gaza, Golan, …) from Natural Earth. Generated by `npm run build-basemap`; don't edit |
| `geo/basemap/` | Physical basemap layers. Generated; don't edit |
| `raw/manifest.json` | Where each downloaded input came from, when, and its checksum |

---

## 3. How territories are drawn

Before modern surveys, scholars describe extents in words: "Judea, Samaria and Galilee", or "Moab, between the Arnon and the Zered". The map follows the same approach. `geo/units.json` divides the land into **28 schematic units** following natural features: Upper and Lower Galilee, the Jezreel valley, Samaria, Judea, the Shephelah, the southern coastal plain, Gilead, Moab, Edom and so on. A territory slice lists the units it covered:

```json
{
  "type": "Feature",
  "geometry": null,
  "properties": {
    "id": "hasmonean-kingdom-2",
    "polity": "hasmonean-kingdom",
    "start": { "year": -104, "precision": "year" },
    "end": { "year": -63, "precision": "year" },
    "units": ["judea", "samaria", "lower-galilee", "upper-galilee", "philistia"],
    "partial_units": ["gilead"],
    "boundary_certainty": "schematic",
    "geometry_method": "units",
    "description": { "en": "The source's description of the extent" },
    "confidence": "estimated",
    "sources": [{ "ref": "…", "locator": "…" }]
  }
}
```

- **`units`**: units held in full. **`partial_units`**: units held only in part; the map shows them pale.
- **`boundary_certainty`**: `surveyed` (a legally defined or surveyed line), `approximate`, `schematic` (the area is known, the edges are not), or `contested`. The map draws them differently: solid, dashed, soft-edged, hatched.
- **`geometry_method`**: `units` here. Use `traced-from-map`, `from-text-description` or `imported` when the feature carries its own `geometry` instead.
- For 1917 onward, the modern units (`israel-1949`, `west-bank`, `east-jerusalem`, `gaza-strip`, `golan-heights`, `sinai-egypt`, `transjordan`, …) are used in the same way.

**The units are display regions defined by this project, not historical borders.** Their edges follow named rivers, wadis, coastlines and escarpments, placed to about ±5 km. To move a unit's edge, move the shared landmark in `geo/units.json`; every unit using it moves together, so there are never gaps or overlaps.

---

## 4. Population, specifically

```json
{
  "id": "palestine-1922-census",
  "area": "mandate-palestine",
  "date": { "year": 1922, "month": 10, "day": 23, "precision": "day" },
  "total": { "low": 757182, "high": 757182, "best": 757182 },
  "composition": [
    { "axis": "religion", "groups": [ { "group": "muslims", "count": { "low": …, "high": …, "best": … } }, … ] }
  ],
  "basis": "census",
  "confidence": "documented",
  "sources": [ … ]
}
```

- **Every figure names its `area`.** Figures for different areas are not comparable, and the chart only joins figures for the same area. For example, Israel's statistics bureau counts East Jerusalem, the Golan and Israeli residents of the West Bank, while the Palestinian bureau also counts East Jerusalem. Adding the two double-counts East Jerusalem.
- **When scholars disagree, each estimate is its own record** (same date and area, different sources), marked `contested` and citing the competing source. The site shows them side by side; it never averages them.
- **`composition`** gives groups by `count` or by `share_pct`, never mixed. Group ids are defined per axis in `groups.json` (`religion`, `ethnicity`, `population-group`). `label` keeps the source's own name for its classification.
- **The validator checks that groups add up** to the total (counts) or to 100% (shares), within the tolerance in `config.json`. If the source lists only some groups, set `"partial": true` and say what's missing in `notes`.
- **`basis`**: `census`, `official-estimate`, `registration`, `estimate-archaeological`, `estimate-tax-register`, `estimate-textual`, `estimate-other`, or `derived`. A `derived` figure (e.g. a total combined from two bureaus) must include a `derivation` naming its input records and the formula.
- **Unknown is allowed.** `"total": null` with `"confidence": "unknown"` shows a gap rather than a guess.

---

## 5. Fixing something: a checklist

1. Find the record: search the `data/` folder for a word from the name or its id.
2. Change the fact **and its source**: add or update `sources` with a locator, and add the work to `sources.json` if it's new, with an honest `verification.level`.
3. If scholars disagree, don't overwrite. Add a second record or a second source and mark it `contested`.
4. If you changed English text that has Arabic or Hebrew versions, set their `translation_status` back to `machine-draft` (or update them).
5. Run `npm run validate-data` and fix anything it reports.
6. Preview with `npm run dev`.
