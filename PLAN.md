# PLAN — Interactive history map of the southern Levant, 10,000 BCE to today

Status: **draft for approval (Milestone 1)**. Nothing beyond this file has been built yet.

This plan covers what will be built, how the data is structured, which sources will be used, and the order of work. Section 13 lists the decisions I need from you before starting Milestone 2.

---

## 1. Principles that shape every decision

1. **No invented facts.** Every number, date, border and name in `/data` is tied to a source someone can check. When something is not known, the record says `confidence: "unknown"` and the UI shows "unknown". It never shows a guess.
2. **No interpolated numbers shown as data.** The population chart draws lines between estimates so trends are visible, but the year panel only reports actual estimates, with their own year, e.g. "nearest estimate: 1931 census". It never computes a "1925 population" between two points.
3. **Honest provenance.** Each source entry records how it was checked: full text read, excerpt or table seen, catalogue record only, or "cited via" a secondary work. If I only found a figure quoted in another book, the citation says so. I won't cite a page I haven't seen.
4. **Comparable areas.** Population figures refer to different territories in different periods (Persian Yehud, "western Palestine", the Ottoman sanjaks, Mandate Palestine, Israel as counted by its statistics bureau, the West Bank as counted by the Palestinian bureau). Every population record names the area it covers, and the chart only joins points that share the same area definition (§5.4).
5. **Evenhandedness is checked, not assumed.** Contested items must carry at least two sourced positions. A report script counts sources by kind (academic, government, NGO, UN) and by institutional country for each era and topic, so we can see if one side's sources dominate a topic.
6. **Data is separate from code.** A historian can review and correct `/data` without touching the app. The validator explains every error in plain language.

---

## 2. Tech stack

I'm keeping your proposed stack. The table lists the additions and the few places where I'm deviating, with reasons.

| Area | Choice | Why |
|---|---|---|
| Build | Vite + React + TypeScript | As specified. Static output works on GitHub Pages or Vercel. |
| Map | MapLibre GL JS | As specified. No API keys. |
| Basemap tiles | **Self-hosted elevation tiles as a plain folder of PNG files** (downloaded once by a script from the public AWS Terrain Tiles, which for this region are built from SRTM, GMTED and ETOPO1, all US-government public domain). Physical vectors (coastline, rivers, lakes) as small Natural Earth GeoJSON files (public domain). | No tile server, no API key, and nothing depends on a third-party service staying online. I considered PMTiles (single-file tiles), but the research agent reproduced a bug today: GitHub Pages compresses the file for Firefox, which breaks the byte-range requests PMTiles relies on. A plain folder of tiles avoids that on every host. Details in §7.1. |
| Map labels in Arabic/Hebrew | **MapLibre's built-in text shaping** (version 6.9 or later), plus self-hosted Noto fonts | Since MapLibre 6.9.0 (released 9 Sept 2026) it draws Arabic and Hebrew labels correctly without the old RTL plugin; I confirmed this in its changelog. The plugin stays as a fallback if we have to pin an older version. Fonts load either through MapLibre's new `font-faces` style option or as self-hosted glyph files; I'll pick at scaffold time. |
| Animated flows | deck.gl (`@deck.gl/mapbox` overlay) | As specified. `TripsLayer` gives animated trails along precomputed curved paths. |
| Charts | D3 for scales/shapes, React renders the SVG | Easier to test and to make accessible than D3 manipulating the DOM directly. |
| **Diaspora inset** | **d3-geo SVG map**, not a second MapLibre map | Compare mode already needs two WebGL maps. Phones limit how many WebGL contexts a page can hold, and an SVG inset is lighter and screen-reader-friendly. |
| Compare mode | Two synced MapLibre maps; swipe via `@maplibre/maplibre-gl-compare` (ISC) | Covers both split and swipe views. |
| App state | Zustand (small state library), synced both ways with the URL | One place holds year, layers, language, compare and story state, so shareable links are a direct copy of that state. |
| Translations | i18next + react-i18next for UI strings; content text lives in `/data` per language | As specified. |
| Validation | **Zod schemas written once in TypeScript**, used by both the app and `npm run validate-data`; JSON Schema files generated from them | One definition means the app and the validator can't disagree. The generated JSON Schema gives autocomplete and inline errors when someone edits a data file in VS Code. |
| Geometry processing | mapshaper (simplification), Turf (validity and bounds checks) | Standard, scriptable, permissive licenses. |
| Tests | Vitest (unit), Playwright (smoke + screenshots), axe-core (accessibility checks inside Playwright) | As specified, plus automated accessibility checks. |
| Fonts | Noto Sans / Noto Sans Arabic / Noto Sans Hebrew via `@fontsource` (OFL), self-hosted; ancient-script Noto fonts (Phoenician, Imperial Aramaic, Samaritan, Greek, Syriac, Nabataean, Cuneiform, Egyptian Hieroglyphs) loaded only when a place-name panel needs them | Full script coverage without a heavy first load. |
| Data-prep helpers | Node scripts by default. Optional Python scripts in `scripts/py/` for pulling tables out of census or statistics files | You know Python. Running and deploying the site needs only Node; Python is only for re-extracting source tables. |
| Hosting | GitHub Pages via a GitHub Actions workflow (Vercel works unchanged) | Free, and every push re-runs the validator and tests before deploying. |

Versions: I'll pin exact versions when I scaffold, preferring releases at least two weeks old. Current releases as of 18 Oct 2026: Vite 8.3, React 19.3, MapLibre GL 6.x, deck.gl 9.4, D3 7.9, i18next 26.5, Zod 4.6, Vitest 5.0, Playwright 1.64. TypeScript 7.0 is the new native compiler. I'll use it if Vite, Vitest and the linter all support it at scaffold time; otherwise I'll stay on TypeScript 6.0.

**Routing.** One page. Bibliography and methodology are views inside the app, addressed with `#/bibliography`-style links, so GitHub Pages never returns a 404 on a shared link.

---

## 3. How the pieces fit together

```text
 /data  (human-edited JSON + GeoJSON, full precision, with sources)
   │
   ├── npm run validate-data   →  Zod schema checks + cross-file rules → plain-language error list
   │
   └── npm run build-data      →  validate, simplify geometries, split by era, build search
                                  indexes → public/data/*.json  (generated, not committed)
                                          │
 src/ (React app) ───── lazy-loads era bundles as the slider moves ──→ static site (dist/)
```

`npm run dev` and `npm run build` run `build-data` automatically, so the site can't be built from invalid data.

---

## 4. Time model

### 4.1 Years and dates

- **Years are signed integers with no year 0.** `-3000` = 3000 BCE, `1` = 1 CE, `-1` = 1 BCE. The validator rejects `0`.
- **Duration math** converts to astronomical numbering internally (1 BCE → 0, 2 BCE → −1), so "from 4 BCE to 6 CE" is correctly 9 years, not 10. All conversion lives in one module (`src/time/`), with unit tests for the edge cases.
- A **date** in the data is an object:
  ```json
  { "year": -586, "month": 7, "circa": false, "precision": "month" }
  ```
  `precision` is one of `day | month | season | year | decade | century | millennium`. `circa: true` shows "c." in the UI. When scholars give a window ("between 722 and 720 BCE"), use `{"year": -722, "latest": -720}`. Optional `"calendar_note"` records things like "Julian calendar" or "converted from cal BP".
- **Radiocarbon "BP" dates** from archaeology are converted to BCE when entered (BCE ≈ cal BP − 1950). The original BP value goes in `notes`.
- Dates before 1582 follow the Julian calendar, as is scholarly convention. Years are unaffected.
- **Timeline range:** 10,000 BCE to "today". "Today" is the `as_of` date set in `data/config.json`, so the end of the timeline matches the newest data. A record must overlap the timeline. A *start* date may be earlier than 10,000 BCE (the Natufian began earlier) and is shown as "before 10,000 BCE". The validator fails on any date after `as_of`, and on records that end before 10,000 BCE.

### 4.2 Non-linear slider

- `data/eras.json` defines **contiguous slider segments**. Each has a time range, a **display weight** (its share of slider width, set by how much happened rather than by duration) and a **step size**.
- Position on the slider maps linearly to time *within* a segment, so the mapping can be inverted exactly and is unit-tested both ways.
- Short, dense periods (the 1947–49 war, June 1967, October 1973, October 2023 onward) are their own segments with month steps. Otherwise they would be a sliver of the slider.
- The step size only controls arrow keys and snapping. A "go to year" box and clickable events jump to any exact date.
- **The population chart and ruler bands use the same non-linear time scale**, so their cursors line up with the slider. A toggle switches the chart to linear time.

Draft segments (weights sum to 100; all dates approximate and to be verified in Milestone 2):

| Slider segment | Range | Weight | Step | Map mode |
|---|---|---|---|---|
| Late Natufian & Pre-Pottery Neolithic | 10,000–6,400 BCE | 4 | 100 yr | prehistoric |
| Pottery Neolithic & Chalcolithic | 6,400–3,600 BCE | 3 | 100 yr | prehistoric |
| Early Bronze Age | 3,600–2,000 BCE | 3 | 50 yr | prehistoric until c. 3000 BCE, then political |
| Middle & Late Bronze Age | 2,000–1,150 BCE | 5 | 25 yr | political |
| Iron Age | 1,150–586 BCE | 8 | 10 yr | political |
| Babylonian & Persian | 586–332 BCE | 4 | 10 yr | political |
| Hellenistic (Ptolemaic, Seleucid) | 332–c. 140 BCE | 4 | 5 yr | political |
| Hasmonean | c. 140–63 BCE | 3 | 5 yr | political |
| Roman | 63 BCE–324 CE | 8 | 5 yr (1 yr in 66–73 and 132–136) | political |
| Byzantine (incl. Sasanian 614–628) | 324–636 | 5 | 5 yr (1 yr in 614–638) | political |
| Early Islamic | 636–1099 | 6 | 10 yr | political |
| Crusader & Ayyubid | 1099–1260 | 6 | 5 yr (1 yr around 1099, 1187–92, 1229–44) | political |
| Mamluk (Crusader Acre until 1291 shown in ruler bands) | 1260–1516 | 4 | 10 yr | political |
| Ottoman | 1516–1917 | 7 | 10 yr; 1 yr from 1800 | political |
| British rule & Mandate | 1917–Nov 1947 | 7 | 1 yr | political |
| 1947–49 war | Nov 1947–Jul 1949 | 4 | 1 month | political |
| 1949–1967 | Jul 1949–May 1967 | 4 | 1 yr | political |
| June 1967 war | May–Jun 1967 | 1 | 1 month | political |
| 1967–1993 (Oct 1973 at month resolution) | Jun 1967–Sep 1993 | 5 | 1 yr | political |
| 1993 to Oct 2023 | Sep 1993–Oct 2023 | 6 | 1 yr | political |
| Oct 2023 to today | Oct 2023–`as_of` | 3 | 1 month | political |

The first column is a navigation label, not a ruling. The ruler bands show the overlaps that slider labels can't, such as the Crusader states lasting until 1291 alongside the Mamluks.

---

## 5. Data schema

All files are JSON or GeoJSON in `/data`. TypeScript Zod schemas in `src/schema/` are the formal definition. `data/README.md` will explain them in plain language with examples.

### 5.1 Fields every record shares

```jsonc
{
  "id": "hasmonean-kingdom",              // lowercase-kebab, unique within its file, never reused
  "name": {                               // user-facing text, per language
    "en": "Hasmonean kingdom",
    "ar": "المملكة الحشمونية",
    "he": "ממלכת החשמונאים",
    "translation_status": { "ar": "machine-draft", "he": "machine-draft" }   // en is always "original"
  },
  "start": { "year": -140, "circa": true, "precision": "decade" },
  "end":   { "year": -63, "precision": "year" },
  "confidence": "documented",             // documented | estimated | contested | unknown
  "sources": [
    { "ref": "<id of an entry in sources.json>", "locator": "<page, table or map sheet>", "quote": "<short supporting excerpt>" }
  ],
  "notes": { "en": "Caveats go here.", "translation_status": { "ar": "machine-draft", "he": "machine-draft" } }
}
```

- `sources[].ref` points to an entry in **`data/sources.json`**, the bibliography. It holds each work's full citation once: authors, title, publisher or journal, year, edition, volume, pages, DOI, URL, access date, license for datasets, and a **`verification`** block that says how I checked it: `full-text | excerpt | catalogue-only | cited-via`. This meets "full citation on every record" without repeating citations thousands of times. The validator checks every `ref` resolves.
- `locator` gives the page, table or map sheet. `quote` is optional but encouraged for numbers, so a reviewer can check without the book in hand. `via` records "as cited in …" when a figure came from a secondary work.
- **Quantities** are always ranges:
  ```json
  { "low": 60000, "high": 80000, "best": 70000, "unit": "people" }
  ```
  `best` is optional and only filled when the source gives one. An exact census figure is `low = high = best`.
- **Derived numbers** (for example, combining two statistics bureaus' figures into one total for the whole area) must carry a `derivation` block naming the input records and the formula. The UI marks them "derived" and shows the calculation.

### 5.2 Validator rules (`npm run validate-data`)

Hard failures:
- Schema violations (missing fields, wrong types, unknown ids, malformed GeoJSON or self-intersecting polygons).
- A record with confidence other than `unknown` and no source.
- A `contested` record with fewer than two sources and no linked `perspectives` entry.
- `low > high`, or `best` outside `[low, high]`.
- Composition shares that can't add up to 100%. Specifically: the sum of `low`s exceeds 100% + tolerance, or the sum of `high`s falls below 100% − tolerance, or (when every group has a `best`) the sum of `best`s is more than ±2 percentage points from 100. Counts are checked the same way against the total for that year and area.
- Year `0`, end before start, any date after `as_of`, or a record lying entirely before 10,000 BCE.
- Missing English text. English is the original language; Arabic and Hebrew may be missing (the UI shows English and a notice) or present with a `translation_status`.
- Narrative text (story cards, panel descriptions, perspectives) where a sentence has no citation marker. Translations must carry the same citation markers as the English.
- Geometry outside the expected bounding box (catches swapped latitude/longitude).

Warnings, collected into `/data/REVIEW.md` in Milestone 8:
- Sources only checked via catalogue or a secondary citation.
- `documented` claims resting on a single source.
- Translations whose English text has changed since they were drafted (detected by storing a short hash of the English text alongside each translation).
- Topics where every source comes from one institutional country or kind.

### 5.3 Files

| File | Contents | Key fields beyond the common ones |
|---|---|---|
| `config.json` | Timeline bounds, `as_of` date, tolerance settings | |
| `eras.json` | Slider segments (§4.2) and era labels | `weight`, `step`, `map_mode`, `label` |
| `sources.json` | Bibliography | `type`, citation fields, `url`, `license`, `verification`, `kind` (academic / government / NGO / UN / press / religious-institution), `institution_country` |
| `areas.json` | Reference areas used by statistics (written definitions; shapes added in M3): core area (§5.4), Mandate Palestine, Israel as counted by its Central Bureau of Statistics, West Bank incl. East Jerusalem, Gaza Strip, Persian Yehud, Jerusalem city, … | `definition`, `sources` |
| `polities.json` | States, empires, kingdoms, provinces, city-states | `kind`, `relations[]` (each relation has `type`: vassal / client / province / tributary / occupied / mandate, `overlord`, start, end, sources), `color_key` |
| `territories/<polity>.geojson` | One file per polity. Each feature is a time slice of that polity's extent | `start`, `end`, `boundary_certainty` (`surveyed` / `approximate` / `schematic` / `contested`), `geometry_method` (`imported` / `traced-from-map` / `from-text-description` / `buffer-around-sites`), `method_note` |
| `cultures.json` + `culture-zones/<culture>.geojson` | Pre-state archaeological cultures (Natufian, PPNA/PPNB, Yarmukian, Ghassulian, …) and their zones | as territories |
| `places.json` | Cities, archaeological sites, holy sites, and places outside the region used by migrations and the diaspora inset | `coords`, `kind[]`, `founded`, `destroyed[]`, `names[]`, `holy_site` |
| `groups.json` | Religious, ethnic and ethnolinguistic group definitions and colors | `axis` (religion / ethnicity), `parent` |
| `population.json` | Total population and composition series | `area`, `date`, `total`, `composition: {axis, groups: [{group, share or count}]}` |
| `migrations.json` | Movements into, out of and within the region | `group`, `types[]`, `origin`, `destination`, `numbers`, `direction` |
| `conflicts.json` | Wars, battles, sieges, revolts | `kind`, `parent`, `location`, `belligerents[]`, `outcome`, `casualties` (optional, left empty for now), `names[]` |
| `events.json` | Non-war events for the year panel: treaties, declarations, foundations, earthquakes, plagues | `kind`, `location` |
| `rulers.json` | Rulers and governors where documented (Herod, Abd al-Malik, Saladin, the Mandate high commissioners, …) | `polity`, `office` |
| `languages.json` | Languages and their role over time | `periods[]: {start, end, role: vernacular / administrative / liturgical / literary / lingua-franca, speakers}` |
| `landscape/` | `shorelines.geojson`, `dead-sea-levels.json` (level time series), `dead-sea-extents.geojson`, `trade-routes.geojson` | `method` (e.g. "modelled from bathymetry + sea-level curve") |
| `modern/` | `partition-1947`, `armistice-1949` (incl. demilitarized zones and no-man's land), `lines-1967`, `settlements` (points with founding dates), `oslo-areas`, `barrier` (segments with construction status and date), `gaza` (time-stamped boundaries and zones) | `as_of`, `publisher`, `license` on each file |
| `perspectives.json` | Accounts of contested events | `about[]` (record ids), `accounts[]: {perspective, label, summary, sources}` |
| `stories/<story>.json` | Guided tours | `steps[]: {date, view, layers, highlight, card}` |
| `palette.json` | Fixed color per polity and per group, with a short rationale | |

### 5.4 Population, specifically

- Each point: `area`, `date`, `total` (range), optional `composition` by `religion` or `ethnicity`. Each has its own sources and confidence, and each group within a composition can have a different confidence.
- **The core area** is defined in `areas.json` as the land of present-day Israel, the West Bank and the Gaza Strip, which is close to the Mandate Palestine boundary. Any total for this area combined from Israeli and Palestinian statistics must be a `derived` record, because the two bureaus overlap. These counting rules are confirmed from each bureau's own documentation:
  - Israel's Central Bureau of Statistics counts East Jerusalem residents since 1967, the Golan population since 1982, and Israeli localities in the West Bank since 1972. The Golan was never part of Mandate Palestine. (*Statistical Abstract of Israel 2019*, ch. 2 introduction.)
  - The Palestinian Central Bureau of Statistics includes East Jerusalem (its "J1" area) in its totals, estimating it by a separate method. (2017 census preliminary results.)
  - So adding the two double-counts East Jerusalem's Palestinians and wrongly includes the Golan. The derivation subtracts both explicitly. Whether the Palestinian figures exclude settlers still has to be confirmed before any sum is published.
  - UNRWA counts *registered refugees*, including descendants and people living outside the area. Its figures are never added to population totals.
- Ancient estimates (Broshi and colleagues) are built-up area × an assumed number of persons per hectare. They're entered as `estimated`, with the method and the density assumption in `notes`, and the range covers the published alternatives.
- **Before the Early Bronze Age there is no absolute population estimate** I could find in the literature. The research turned up relative signals only: radiocarbon date densities and cemetery age profiles. The chart therefore shows "unknown" for absolute numbers before about 3000 BCE. Optionally, it can add a separate, clearly labeled *relative* activity index from Palmisano et al. 2021 (open access, CC BY) on its own axis, never mixed with headcounts.

### 5.5 Names, perspectives and contested terms

- `names[]` on places, conflicts and regions: `{text, lang, script, translit, start, end, used_by, sources}`. `lang` uses ISO 639 codes (`he`, `ar`, `arc` Aramaic, `grc` Ancient Greek, `la`, `akk` Akkadian, `egy` Egyptian), and `script` uses ISO 15924 codes (`Hebr`, `Arab`, `Grek`, `Latn`, `Phnx`, `Armi`, `Samr`, `Xsux`, `Egyp`).
- On the map, labels show **the name(s) in use at the selected date**, written in the UI language's script. A setting switches to today's names. Clicking a place shows its full list of names over time.
- **Contested modern terms** are stored as several names, each with its `used_by`, and are always shown together. The display rule (which name comes first) is an editorial decision for you (§13, decision 2). Names can also change: Israel's cabinet voted on 19 Oct 2025 to rename the "Swords of Iron" war the "War of Revival", and that renaming is itself disputed. So names carry dates too.
- **Textual tradition vs archaeology.** For the Exodus, the conquest of Canaan and the extent of the United Monarchy, the data holds separate records marked `basis: "textual-tradition"` and `basis: "archaeological"`. They are linked by a `perspectives` entry and marked contested. On the map, tradition-based extents get a distinct hatch and label ("as described in the Hebrew Bible") and are never presented as surveyed borders.

---

## 6. File layout

```text
/
├── PLAN.md, README.md, ATTRIBUTIONS.md (generated from sources.json + basemap credits)
├── LICENSE (code), DATA-LICENSE (data; see §13)
├── data/                      ← everything historical; see data/README.md
│   ├── README.md, REVIEW.md (M8)
│   ├── config.json, eras.json, sources.json, areas.json, palette.json
│   ├── polities.json, territories/*.geojson
│   ├── cultures.json, culture-zones/*.geojson
│   ├── places.json, groups.json, population.json
│   ├── migrations.json, conflicts.json, events.json, rulers.json, languages.json
│   ├── landscape/*, modern/*, perspectives.json, stories/*.json
│   └── raw/manifest.json      ← where each raw input was downloaded from, date, checksum
├── schema/                    ← generated JSON Schema (for editor autocomplete)
├── scripts/                   ← validate-data, build-data, build-basemap, build-glyphs, source-balance; py/ (optional)
├── src/
│   ├── schema/  time/  state/  map/  timeline/  panels/  charts/  inset/  stories/  i18n/  styles/
│   └── main.tsx, App.tsx
├── public/                    ← fonts; tiles/ and data/ are generated here (not committed)
├── tests/unit/, tests/e2e/
├── docs/screenshots/m<N>/     ← Playwright screenshots shown to you after each milestone
└── .github/workflows/         ← CI (validate + test) and deploy to GitHub Pages
```

---

## 7. Map and visual design

### 7.1 Basemap

- Physical only: hillshade from a digital elevation model, sea and land, coastline, rivers and lakes. **No modern borders, no modern place labels.**
- Elevation: terrain tiles covering roughly 28°–36° N, 32°–39° E at zoom levels 0–10 (about 800 small PNG files), plus low-zoom world tiles for context. MapLibre computes the hillshade in the browser. `npm run build-basemap` downloads them once. In CI they're cached rather than re-downloaded, so the repository doesn't carry tens of megabytes of images.
- Vectors: Natural Earth 10m coastline, land, ocean, rivers and lakes clipped to the region; 110m for the diaspora inset.
- **The modern Dead Sea is not part of the basemap.** Natural Earth's Dead Sea polygons are today's undated outline, and the lake has dropped tens of meters in the past century (Israel's Hydrological Service measured −441.5 m on 4 Oct 2026). The Dead Sea and the coastline come from the landscape layer, keyed to the selected date.
- Map labels for historical places use self-hosted Noto fonts, with MapLibre's built-in Arabic and Hebrew support.

### 7.2 Two map modes

- **Prehistoric** (before about 3000 BCE, set per segment in `eras.json`): culture zones as soft-edged areas and archaeological sites as points.
- **Political** (after): territories by polity, with vassal and client relationships shown as the overlord's outline around the client's fill, and a legend entry such as "Herodian kingdom (client of Rome)".
- The switch is a crossfade around the threshold, not an abrupt jump.

### 7.3 Showing confidence

One consistent visual language, explained in a legend that is always reachable:

| Status | Areas | Lines and flows | Chart | Numbers in panels |
|---|---|---|---|---|
| documented | solid outline, solid fill | solid | solid line | plain |
| estimated | dashed outline, lighter fill | dashed | dashed line + uncertainty band | "≈" prefix |
| contested | hatched fill | hatched / double line | hatched band | "contested" badge, links to Perspectives |
| unknown | not drawn; noted in panel | not drawn | gap in line | "unknown" |
| schematic boundary (area known, edge not) | feathered edge, dotted outline | | | |

Every number is a button that opens its source card: full citation, locator, quote, link, verification level and notes.

### 7.4 Color

- Color-blind-safe categorical palettes (Paul Tol's "muted" and "light" sets, Okabe–Ito for small sets), with **one fixed color per polity and per group** in `palette.json`.
- Flag colors and politically coded colors are avoided for modern entities. Each choice has a written rationale in `palette.json` so reviewers can challenge it.
- A test checks that polities shown at the same time and next to each other never share a color, and simulates common color-vision deficiencies to check they stay distinguishable. Labels and patterns back up color, so nothing is conveyed by color alone.

### 7.5 Motion

- Territories crossfade between states. Migration flows animate along curved paths with width on a square-root scale of the estimated number; the estimate's range shows as a faint wider halo. Active conflicts pulse.
- All of this respects the "reduce motion" system setting: no pulsing, and instant changes instead of crossfades.

---

## 8. Features → where they live

| # | Feature | Component(s) | Milestone |
|---|---|---|---|
| 1, 2 | Map + non-linear slider with era labels, play/pause, speed, keyboard | `map/`, `timeline/Slider` | 2 |
| 3 | Prehistoric / political modes | `map/layers/cultures`, `map/layers/territories` | 2 (political), 4 (prehistoric) |
| 4 | Crossfade, flows, pulsing conflicts, full-history autoplay | `map/`, `map/deck/` | 2, 4 |
| 5 | Ruler bands (Gantt strip) | `timeline/RulerBands` | 3 |
| 6 | Year panel | `panels/YearPanel` | 3 |
| 7 | Population chart (stacked by religion or ethnicity, log and % modes, bands) | `charts/Population` | 3 |
| 8 | Source cards, confidence styling, legend, bibliography view | `panels/SourceCard`, `panels/Bibliography` | 3 |
| 9 | Place names through time | `panels/PlacePanel` | 3 |
| 10 | Holy sites | `map/layers/holySites`, `panels/PlacePanel` | 4 |
| 11 | Languages | `panels/Languages` | 4 |
| 12 | Landscape | `map/layers/landscape` | 4 |
| 13 | Modern layers | `map/layers/modern/*` | 5 |
| 14 | Compare (split / swipe, presets) | `map/Compare` | 5 |
| 15 | Perspectives | `panels/Perspectives` | 6 |
| 16 | Diaspora inset | `inset/DiasporaInset` | 6 |
| 17 | Story mode (5 tours) | `stories/` | 6 |
| 18 | Shareable URLs | `state/url.ts` | 2 (year), 7 (everything) |
| 19 | en/ar/he, RTL, machine-draft notices | `i18n/` | 2 (plumbing), 7 (complete) |
| 20 | Mobile, keyboard, screen readers | everywhere | checked every milestone; audit in 7 |

Notes on a few features:
- **Population chart modes.** *Absolute*: stacked areas of each group's `best` (or range midpoint, visibly marked as such), with the total's low–high band on top. *Percent*: 100% stacked shares. *Log*: unstacked lines with bands, because stacked areas on a log axis misrepresent the parts. Lines stop at gaps; they never bridge an "unknown".
- **Year panel.** Who rules (with overlord/client chain), the nearest population estimates before and after the date with their own dates, composition, main languages, active conflicts, events, and sources.
- **Story narration.** Story cards are written like the panels: every sentence carries a citation marker, which the validator enforces.
- **URL format** (readable on purpose): `?y=-586` or `?y=1948-05`, `&layers=territories,migrations,holy`, `&lang=ar`, `&cmp=1947-11,1967-06&cmpmode=swipe`, `&story=jerusalem&step=4`, `&view=31.78,35.23,9`.
- **Holy sites.** You listed Jews, Christians, Muslims, Samaritans and Druze. I suggest adding the **Bahá'í Faith**: its holy places in Haifa and Western Galilee have been a UNESCO World Heritage site since 2008. The schema keeps a `traditions` map, so adding it costs nothing. Christian significance can note denominations where they differ, as can Jewish (e.g. Karaite). Where UNESCO lists a site, we use UNESCO's own wording. For example, Jerusalem's listing is "Jerusalem (Site proposed by Jordan)", under neither state.
- **"Suggest a correction".** Every source card and panel gets a link that opens a pre-filled GitHub issue with the record's id. That gives reviewers and critics a visible, public channel, and fits a site that expects scrutiny.

---

## 9. Languages and RTL

- UI strings in `src/i18n/locales/{en,ar,he}.json`. Content text in `/data` as described in §5.1.
- `dir="rtl"` on the document for Arabic and Hebrew. CSS uses logical properties (start/end rather than left/right), so the layout mirrors automatically.
- **The timeline also runs right-to-left in RTL languages** (earliest on the right), following the reading direction. Conventions differ here (some interfaces keep time axes left-to-right even in RTL), so this is flagged for the Arabic and Hebrew reviewers. The chart and ruler bands mirror with it so they stay aligned. The map itself never mirrors.
- Machine-drafted text gets a small "machine-translated draft — not yet reviewed" notice on the block it applies to. I'll do the first-pass Arabic and Hebrew drafts and mark them `machine-draft`. They must be reviewed by fluent readers before a public launch, especially for proper names and contested terms.
- Numbers and dates are formatted per locale with `Intl`. Era wording:
  - English: "BCE/CE".
  - Hebrew: "לפנה״ס / לספירה" ("before/of the count"). This is the standard Hebrew form and is already religion-neutral.
  - Arabic: the standard form is "ق.م / م", but it literally means "before/after the birth [of Christ]", i.e. BC/AD. A neutral Arabic equivalent exists but is rarely used. I'll use the standard form by default and flag it for your Arabic reviewers to decide.

---

## 10. Accessibility and mobile

- The slider is a proper ARIA slider. Its spoken value reads like "1948 CE, month May, 1947–49 war". Arrow keys step, Page Up/Down jump eras, Home/End go to the ends, Space plays and pauses.
- Panels are labeled regions with headings. **The year panel is the text equivalent of the map**, so a screen-reader user gets the same information without seeing it.
- axe-core checks run in the Playwright tests; contrast meets WCAG AA.
- Mobile: the map takes the full screen, with the slider docked at the bottom and panels as bottom sheets. Compare mode falls back to swipe on narrow screens.

---

## 11. Testing, CI and deployment

- **Unit tests (Vitest):** year math (no year 0, BCE/CE formatting, durations across the BCE/CE boundary), slider ↔ time mapping in both directions, every validator rule (a "bad" fixture file for each rule must fail with the expected message), URL state round-trip, palette constraints.
- **Smoke tests (Playwright):** the app loads; the slider moves the map and the year panel; autoplay runs; each layer toggles; compare and story modes work; Arabic and Hebrew render right-to-left; a shared URL restores the same view; no accessibility violations. The same run saves **screenshots of key views** to `docs/screenshots/m<N>/`, which I'll show you after each milestone.
- **CI (GitHub Actions):** every push runs the validator, unit tests, smoke tests and build. Pushes to `main` deploy to GitHub Pages.
- **README** for you, in plain steps: install Node; `npm install`; `npm run dev` to preview; how to edit a data file and run `npm run validate-data`; how to read validator errors; how to deploy (push to GitHub, and the action does the rest); Vercel as an alternative.

---

## 12. Sources I intend to use

**What "checked" means here.** On 18 Oct 2026, research agents I ran fetched each source's own page, a library or publisher catalogue record, DOI metadata, or the license text, and downloaded and opened key datasets. I re-checked two claims myself: MapLibre's Arabic/Hebrew support and the boundary text of UN Resolution 181. Being listed here means the source exists and its terms are known. It does **not** mean every figure in it has been read. Each figure entered in `/data` gets its own page or table locator and verification level. Many key works are paywalled books or JSTOR articles, so for now they're checked at catalogue or metadata level. §15 covers what that means.

### 12.1 Base geography and landscape

| Source | Used for | License / terms | Checked |
|---|---|---|---|
| Natural Earth 10m and 110m physical vectors | Coastline, land, rivers, lakes; diaspora inset | Public domain | Terms page; files downloaded (Dead Sea and Jordan present) |
| AWS Terrain Tiles (Tilezen/Mapzen). Built from SRTM, GMTED2010 and ETOPO1 for this region | Hillshade | US-government public domain; credit USGS and NOAA | Tile download tested; attribution doc read |
| GEBCO_2026 Grid | Seabed depths for modelling past shorelines | Public domain; acknowledge GEBCO; not for navigation | Terms page |
| Sivan et al. 2001, *Palaeo3* 167:101–117; Sivan et al. 2004, *EPSL* 222:315–330; Galili et al. 1993, *J. Field Archaeology* 20:133–157 | Holocene sea level on the Israeli coast; submerged sites (Atlit-Yam) | Cite | DOI metadata |
| Migowski et al. 2006, *Quaternary Research* 66:421–431; Bookman (Ken-Tor) et al. 2004, *GSA Bulletin* 116(5); Enzel et al. 2003, *Quaternary Research* 60:263–273 | Dead Sea level history | Cite | DOI metadata |
| Israel Water Authority / Hydrological Service, Dead Sea level series (data.gov.il) | Modern Dead Sea level, monthly since 1976 | data.gov.il open terms (attribution) | API queried; latest −441.50 m on 4 Oct 2026 |
| Dorsey 1991, *The Roads and Highways of Ancient Israel* (Johns Hopkins UP); UNESCO WHS 1107 "Incense Route – Desert Cities in the Negev" | Trade routes | Cite | Catalogue; UNESCO page |

### 12.2 Places, names, archaeology, holy sites

| Source | Used for | License / terms | Checked |
|---|---|---|---|
| Pleiades gazetteer (release v4.1, May 2025) | Ancient places; attested names with language, script and date range. About 620 places and 1,042 names fall in the region | CC BY 3.0 | Downloads page; dataset counted |
| Wikidata | Modern names in en/ar/he; cross-identifiers | CC0 | License page; test query found 2,593 places in the region |
| Survey of Western Palestine (PEF): *Memoirs* 1881–83; 1880 map at 1:63,360; *Arabic and English Name Lists* | 19th-century place names and sites | Memoirs public domain (archive.org); map scan at Cornell has no rights statement | archive.org items. The *Name Lists* item was seen only in search results, so it still needs opening |
| Palestine Open Maps (Visualizing Palestine) | Georeferenced Mandate-era maps (Survey of Palestine 1:20,000 and 1:250,000, 1946); locality table with 1922/1931/1945 populations | Scans stated public domain. **Locality table and vector tracings have no license** (§12.9) | About page; repositories |
| Tsafrir, Di Segni & Green 1994, *Tabula Imperii Romani: Iudaea–Palaestina* (Israel Academy of Sciences and Humanities) | Hellenistic–Byzantine places and names | Cite | Catalogue |
| Aharoni 1979, *The Land of the Bible*, rev. ed. (Westminster); Rainey & Notley 2006/2014, *The Sacred Bridge* (Carta) | Biblical-period historical geography (text-led) | Cite | Catalogue |
| Mazar 1990, *Archaeology of the Land of the Bible* (Doubleday); Steiner & Killebrew (eds), *Oxford Handbook of the Archaeology of the Levant* (OUP; 2013 or 2014, to confirm on title page) | Archaeology, 10,000–332 BCE | Cite | Catalogue; DOI |
| Finkelstein & Silberman 2001, *The Bible Unearthed* (Free Press); Finkelstein & Mazar, ed. Schmidt, 2007, *The Quest for the Historical Israel* (SBL); Dever 2001 (Eerdmans) | Textual tradition vs archaeology. The 2007 volume puts both sides in one book | Cite | Catalogue |
| Bar-Yosef 1998, *Evolutionary Anthropology* 6(5):159–177; Kenyon, *Excavations at Jericho* (BSAJ 1960–83); Sparks et al. (eds) 2019, *Digging Up Jericho* (Archaeopress) | Natufian; Jericho | Cite | DOI; catalogue |
| NERD v6.0, Near East Radiocarbon Dates (Palmisano et al. 2022, Zenodo) | Site dating | CC BY 4.0 | Zenodo record |
| UNESCO World Heritage List: 9 properties in Israel; 6 in Palestine, including Sebastia (2026); "Jerusalem (Site proposed by Jordan)" (ID 148) | Heritage and holy sites; official wording | Descriptions CC BY-SA IGO 3.0 | Archived UNESCO pages (live site blocked the agents) |
| Breger, Reiter & Hammer (eds) 2010, *Holy Places in the Israeli–Palestinian Conflict* (Routledge); Grabar & Kedar 2009, *Where Heaven and Earth Meet* (Yad Ben-Zvi / U. Texas); Petersen 2001, *Gazetteer of Buildings in Muslim Palestine* (OUP/CBRL); Pummer 2016, *The Samaritans* (Eerdmans); Magen 2004/2008, *Mount Gerizim Excavations* I–II (IAA); Firro 1999 (Brill) and Dana 2003 (Sussex Academic) on the Druze | Each tradition's view of holy sites | Cite | Catalogue |

### 12.3 Later periods (narrative and reference)

| Source | Used for | Checked |
|---|---|---|
| Gil 1992, *A History of Palestine, 634–1099* (CUP) | Early Islamic period. To be paired with works built on Arabic sources (gap to fill in M8) | Catalogue |
| Ellenblum 1998, *Frankish Rural Settlement in the Latin Kingdom of Jerusalem* (CUP) | Crusader settlement | DOI |
| Burgoyne 1987, *Mamluk Jerusalem*; Hebrew University "Late Medieval Rural Palestine" project | Mamluk period. Gap: no checked monograph yet on Mamluk Palestine as a whole | Catalogue; project site |
| Cohen 1973, *Palestine in the 18th Century* (Magnes); Doumani 1995, *Rediscovering Palestine* (UC Press) | Ottoman period | Publisher pages |
| UCDP datasets (Uppsala Conflict Data Program) | Modern conflict events | CC BY 4.0; downloads page |

### 12.4 Population

| Source | Covers | Checked / access |
|---|---|---|
| Broshi 1979, *BASOR* 236:1–10; Broshi & Gophna 1984, *BASOR* 253:41–53 and 1986, *BASOR* 261:73–90; Broshi & Finkelstein 1992, *BASOR* 287:47–60; Gophna & Portugali 1988, *BASOR* 269:11–28; Gonen 1984, *BASOR* 253:61–73 | Early Bronze to Byzantine estimates (area × density). Each covers a different area or site type | DOI metadata; paywalled (JSTOR) |
| Carter 1999, *The Emergence of Yehud* (JSOTSup 294); Lipschits 2003, in Lipschits & Blenkinsopp (eds), pp. 323–376; Finkelstein 2010, *Revue Biblique* 117:39–54 (free in SBL Press reprint, 2018) | Persian Yehud (a small province) and competing views of its size | Catalogue; publisher PDF |
| Bocquet-Appel 2011, *Science* 333:560–561; Bocquet-Appel & Bar-Yosef (eds) 2008 (Springer); Kuijt 2000, *J. Anthropological Archaeology* 19:75–102; Palmisano et al. 2021, *Quaternary Science Reviews* 252:106739 | Neolithic: relative trends and village sizes only | DOI |
| Hütteroth & Abdulfattah 1977 (Erlangen); Cohen & Lewis 1978 (Princeton UP) | 16th-century Ottoman tax registers (households, needs multipliers; the second covers six towns only) | Catalogue; archive.org loan copy |
| McCarthy 1990, *The Population of Palestine* (Columbia UP, Institute for Palestine Studies series); Schölch 1985, *IJMES* 17(4):485–505; Karpat 1985, *Ottoman Population 1830–1914* (U. Wisconsin Press); Bachi 1974, *The Population of Israel* (CICRED; open PDF) | Late Ottoman and Mandate | Catalogue; DOI; Bachi in full text |
| Census of Palestine 1922 (Barron); Census of 1931 (Mills; village volume); *Village Statistics 1945*; *A Survey of Palestine* (1946) | Mandate counts. Village Statistics gives estimates, not a count | Wikimedia Commons and archive.org scans (UK Crown copyright expired) |
| Israel Central Bureau of Statistics: *Statistical Abstract*; localities file | Israel, 1948 to today | CBS end-user licence: open, attribution required. A reported 2026 change in how CBS counts "foreigners" and emigrants still has to be checked in a CBS document |
| Palestinian Central Bureau of Statistics: 2017 census and estimates | West Bank (incl. East Jerusalem) and Gaza | "All rights reserved", citation required. We cite individual figures only |
| UNRWA | Refugee definition and registrations (not a population count) | Archived page |
| DellaPergola 2003, *American Jewish Year Book* 103:3–68; 2024, *AJYB 2023*:309–422 | Jewish population; demography of Israel/Palestine. He notes himself that he "may have stressed an Israeli point of view" | Catalogue; DOI |
| Arab immigration debate: Gottheil 1973, *Middle Eastern Studies* 9(3):315–324 and 2003, *Middle East Quarterly*; Bachi 1974; McCarthy 1990; Peters 1984 (Harper & Row); Porath 1986, *NYRB*; Farrell 1984, *J. Palestine Studies* 14(1); N. Finkelstein 1995/2003 (Verso); Grossman 2017 (Routledge) | The positions and evidence on each side, presented in Perspectives | Catalogue; DOI; NYRB page |

### 12.5 Modern layers

| Source | Used for | License / terms |
|---|---|---|
| UNGA Res. 181(II) text, which describes the boundaries in words, village by village; Survey of Palestine 1:250,000 (1946) via Palestine Open Maps | **Our own digitization** of the 1947 plan and the Jerusalem corpus separatum | UN resolution text; public-domain maps. UN maps 103/104 are only for visual cross-checking, because UN terms forbid redistribution |
| Natural Earth 10m "breakaway and disputed areas" | 1949 lines: West Bank, Gaza, no-man's land, Mount Scopus; Golan | Public domain |
| UN map 547.1 (1953); armistice agreement texts (Yale Avalon Project) | Demilitarized zones with Egypt, Syria and Lebanon, which we'll digitize ourselves (no vector source exists) | UN terms; public texts |
| Israel CBS localities file (data.gov.il, 2023) | Settlements recognised by Israel, with founding year and coordinates | Open, attribution |
| Peace Now GIS layers (Nov 2024) | Outposts, farms, pre-2005 Gaza settlements, Jerusalem layers | **No license stated** (§12.9) |
| HDX / OCHA: barrier (2018, CC BY; status only, no construction years); oPt settlements (CC BY-IGO); Oslo areas (Palestinian Ministry of Planning, license "Other"; Area B appears mislabeled as A); COD-AB boundaries (CC BY-IGO) | Barrier, boundaries, Oslo areas | Per dataset |
| UNOSAT Gaza damage assessments (latest with downloadable data: imagery of 11 Oct 2025) | Gaza damage | CC BY-SA |
| OCHA oPt reports and snapshots | Dated figures for Gaza and the West Bank | We cite figures. Their maps and PDFs forbid derivatives, so we don't trace them |

### 12.6 Perspectives and primary documents

- **Dual-narrative works:** Adwan, Bar-On & Naveh 2012, *Side by Side* (The New Press, PRIME project); Rotberg (ed.) 2006, *Israeli and Palestinian Narratives of Conflict* (Indiana UP); Salem & Pogrund (eds) 2005, *Shared Histories* (Left Coast); Rogan & Shlaim (eds) 2007, *The War for Palestine*, 2nd ed. (CUP).
- **Palestinian scholarship and institutions:** W. Khalidi (ed.) 1992, *All That Remains* (IPS); R. Khalidi 1997/2009, *Palestinian Identity* (Columbia UP) and 2020, *The Hundred Years' War on Palestine* (Metropolitan); Masalha 1992, *Expulsion of the Palestinians* (IPS); the *Interactive Encyclopedia of the Palestine Question* (IPS with the Palestinian Museum), which we'll link to only because its terms are unknown.
- **Israeli scholarship, both "New Historians" and their critics:** Morris 2004 (CUP) and 2008, *1948* (Yale UP); Shlaim, *The Iron Wall* (Norton, 1999/2014); Pappé 2006 (Oneworld); Shapira 2012, *Israel: A History* (Brandeis UP); Karsh 1997, *Fabricating Israeli History* (Cass) and 2010, *Palestine Betrayed* (Yale UP); Gelber 2001/2006, *Palestine 1948* (Sussex Academic).
- **General syntheses:** Tessler 2009, 2nd ed. (Indiana UP); Smith 2020 (Bedford/St. Martin's; edition number to confirm); Bickerton & Klausner 2022, 9th ed. (Routledge); Gelvin 2021, 4th ed. (CUP).
- **Primary documents** (Yale Avalon Project, UN Official Document System, ICJ):
  - Balfour Declaration (1917); Mandate for Palestine (1922)
  - UNGA Res. 181 and 194; Israel's Declaration of Independence (1948); the four Armistice Agreements (1949)
  - UNSC Res. 242 and 338
  - Oslo I (1993) and Oslo II (1995). For Oslo II, whether the online copy includes all annexes still has to be confirmed.
  - ICJ advisory opinions of 2004 and 2024, and the pending case *South Africa v. Israel*
- **7 October 2023 and the war since.** Recorded now for later use, because casualty fields stay empty as you asked:
  - Israeli sources: Israel's National Insurance Institute (civilian victims); Mor et al. 2024, *Forensic Science International* 363:112188.
  - UN: OCHA's "reported impact" snapshots, which attribute figures to the Gaza Ministry of Health and to Israeli authorities.
  - Studies supporting the Gaza figures: Jamaluddine et al. 2025, *Lancet* 405:469–77; Spagat et al. 2026, *Lancet Global Health* 14(4):e552–9; Huynh et al. 2024, *Lancet* 403:23–24.
  - A critique: Fox 2024, Henry Jackson Society.
  - War names: "Swords of Iron", renamed "War of Revival" in Oct 2025 (disputed); "Al-Aqsa Flood" (Hamas).
- **Terminology:** BBC "key terms" guide (2006, archived); the 1930 Western/Wailing Wall Commission report, which uses both "Kothel Maaravi" and "Al Buraq"; Grabar & Kedar's scholarly term "Sacred Esplanade".

### 12.7 Checked and rejected or limited

| Source | Problem found | Decision |
|---|---|---|
| historical-basemaps (aourednik) | **Factually wrong for this region.** Its 1945 map labels the area "Israel"; its 1960, 1994 and 2010 maps put Gaza and Nablus inside Israel; its 1200 map shows the Fatimid Caliphate (ended 1171) holding Crusader Acre. Also GPL-3.0 | Not used |
| CShapes 2.0 | Non-commercial, share-alike license; merges territories occupied in 1967 into Israel | Not used |
| ACLED | License forbids redistributing its events | Not used; UCDP instead |
| DARE (Roman Empire atlas) | Share-alike (CC BY-SA 3.0); no bulk download | Cross-check only |
| OpenStreetMap | Share-alike (ODbL) | Cross-check only, unless we accept an ODbL-licensed file (decision 4) |
| CONTEXT radiocarbon database; DAAHL | Offline or deleted | Replaced by NERD |
| ToposText; IAA Archaeological Survey; PalQuest | All rights reserved, or terms unclear | Cite and link only |
| World Historical Gazetteer | Licenses vary by source; API token needed | Lookup aid only |
| Copernicus DEM | Heavy attribution and pass-through terms | Not needed (SRTM covers it) |
| Pirated PDFs of McCarthy and Karpat; a 1922 census upload on archive.org by an account with a neo-Nazi-style name | Provenance | Never linked; we use Wikimedia Commons or official scans |
| Mossek 1978; Bernstein 2000 | Real books, but neither estimates Arab immigration | Not cited for that debate |

### 12.8 Attributions

`ATTRIBUTIONS.md` and an in-app credits panel are generated from `sources.json`, so every dataset's required credit line appears exactly as its terms require.

### 12.9 Permissions worth requesting

Each of these has a fallback, so none blocks Milestone 2. I can draft the emails; you would send them.
- **Peace Now:** outposts and pre-2005 Gaza settlement layers. Fallback: settlements from Israel's statistics bureau, with outposts shown as counts per year rather than mapped.
- **Visualizing Palestine (Palestine Open Maps):** locality table and vectors. Fallback: digitize from the public-domain scans and enter figures from the census volumes directly.
- **Institute for Palestine Studies (PalQuest):** short excerpts. Fallback: links only.
- **OCHA oPt:** license for the Oslo dataset and for maps of Gaza access restrictions. Fallback: OSM-derived Oslo areas under ODbL; Gaza as described in decision 7.

---

## 13. Decisions I need from you

You can reply "approved, use your recommendations", or change any item.

1. **Site title.** Recommended: **"Southern Levant Through Time"**, subtitled "12,000 years of history in the land that is today Israel and the Palestinian territories". Alternatives: "A Land Through Time" or "Layers of the Land". I'll avoid any phrasing that echoes slogans, such as "river to the sea". Arabic and Hebrew titles will be drafted and flagged for review.
2. **Order of contested names.** Recommended:
   - For wars and events, show a descriptive scholarly name first, then each side's name labeled ("1948 Arab–Israeli War — Israeli usage: War of Independence · Palestinian usage: al-Nakba").
   - For places with no neutral name in common use, show both names in alphabetical order of the display language ("Haram al-Sharif / Temple Mount"). The place panel adds the scholarly term "Sacred Esplanade".
   - The alternative is to always show both names alphabetically, for events too.
3. **Column order in Perspectives.** Recommended: keep your order, Israeli · Palestinian · Academic, identical in every language. It's one setting, so it's easy to change later.
4. **Licenses.** Recommended: MIT for the code. CC BY 4.0 for the data we create, with per-file exceptions in `DATA-LICENSE` where a source forces share-alike (for example, an ODbL file if we use OpenStreetMap-derived Oslo areas).
5. **Hosting and repository.** Recommended: a **public** GitHub repository with GitHub Pages. Public is free and it's where the "Suggest a correction" links lead. Do you have a GitHub account? I'll create the local git repository now, but I won't push anything anywhere until you say so.
6. **Permission emails** (§12.9): do you want me to draft them?
7. **Gaza since October 2023.** No open vector data exists for evacuation zones, the corridors or the ceasefire "yellow line". The IDF calls its own map "an illustration", and OCHA's maps forbid derivatives. Recommended: show dated figures (e.g. OCHA's share of land under restrictions) and short sourced text, with labeled schematic markers for the corridors, and no precise-looking polygons. The alternative is to trace schematic zones from published maps, which carries accuracy and licensing risk.
8. **Add the Bahá'í Faith** to holy-site traditions. Recommended: yes.
9. **Run the timeline right-to-left in Arabic and Hebrew.** Recommended: yes.
10. **Prehistoric population.** Recommended: show "unknown" for absolute numbers before about 3000 BCE, plus a clearly labeled *relative* activity index from radiocarbon dates on its own axis. The alternative is "unknown" only.

---

## 14. Milestones

Each milestone ends with: the validator and all tests passing, Playwright screenshots of key views in `docs/screenshots/m<N>/` (I'll show them to you), a short "what works / what doesn't yet" note, and a git commit.

| # | Deliverables | Data scope at the end of the milestone |
|---|---|---|
| **1** | This plan. Git repository created, plan committed. **Stop for your approval.** | — |
| **2** | Vite/React/TS scaffold. Physical basemap (hillshade, coast, rivers, no modern borders or labels). Time module. Non-linear slider with era labels, play/pause, speed, keyboard, go-to-year. Territories crossfade. Zod schemas, `validate-data`, generated JSON Schema, `data/README.md`. Year in the URL. CI workflow. Basic en/ar/he switch plumbing. | Every era has a first pass: ~45 polities with relationships; coarse territories (one or two time slices per polity, mostly `schematic`); population totals wherever a published estimate exists, "unknown" elsewhere; ~60 checked bibliography entries. **The whole timeline plays end to end.** |
| **3** | Year panel; ruler bands; population chart (absolute, percent and log modes, uncertainty bands, synced cursor); source cards, confidence styling and legend; bibliography view; place panel with names through time; "Suggest a correction" links. | ~120 key places with names through time (from Pleiades, Wikidata, the Survey of Western Palestine name lists and *TIR*); composition series by religion and ethnicity where sources exist; main rulers. |
| **4** | Prehistoric map mode; migrations (deck.gl flows, places outside the region); conflicts (pulsing markers, wars → battles); landscape (sea-level shorelines, Dead Sea levels and extents, trade routes); languages panel; holy-sites layer. | The 14 migrations you listed as a minimum; first pass of conflicts for every era (no casualty figures); Natufian-to-Chalcolithic cultures and key sites; holy sites with significance per tradition. |
| **5** | Modern layers: 1947 plan, 1949 armistice lines incl. demilitarized zones, 1967 lines, settlements by founding year, Oslo areas, barrier, Gaza per decision 7. Compare mode (split and swipe) with presets 1947 / 1949 / 1967 / today. | Each layer with publisher, license and `as_of`. |
| **6** | Perspectives panel; diaspora inset; story mode with the five tours ("12,000 years in 5 minutes", "Jerusalem through time", "Peoples and migrations", "1917–1949", "1967 to today"). | ~15 perspective entries: early Israel; the United Monarchy; Arab immigration debate; 1929; 1936–39; the partition plan; causes of the 1948 exodus; 1967; settlements and international law; the First Intifada; Oslo and Camp David 2000; the Second Intifada; Gaza disengagement and blockade; 7 October and the war since; contested place names. |
| **7** | Full machine-draft Arabic and Hebrew with notices; RTL polish; full URL state (layers, compare, story step, view); accessibility audit (keyboard, screen reader, axe); performance (simplified geometries, lazy-loaded eras, code splitting, mobile check); deploy to GitHub Pages (only after your go-ahead); final README. | — |
| **8** | Data deepening, era by era: fill gaps, raise verification levels, add sources from the under-represented side of each topic. `/data/REVIEW.md` lists every contested or weakly sourced item, generated in part by the validator's warnings and the source-balance report. | — |

---

## 15. Risks and limits

1. **Scale versus depth.** Twelve thousand years is a lot. My first pass will be thin by design, and the quality of the final site depends on Milestone 8 and on **human expert review**. Before a public launch, I'd strongly recommend at least three reviewers: Israeli, Palestinian, and an outside academic, plus fluent reviewers for the Arabic and Hebrew text. `REVIEW.md` is designed to make their job efficient.
2. **Borders before modern times are reconstructions.** Most will be `schematic`, drawn from scholarly descriptions using rivers, wadis and coastlines as edges. Each records how it was drawn. The map will look less precise than popular atlases. That's deliberate, and the legend explains it.
3. **Paywalled sources.** Many core works (the *BASOR* articles, McCarthy, Hütteroth) can't be read in full from here. Figures I take from abstracts or secondary citations are marked `cited-via`, and `REVIEW.md` lists them so someone with library access can confirm the page numbers. I won't present them as checked against the original.
4. **Licensing gaps** (§12.9). Some of the best modern datasets have no stated license. Fallbacks exist, but some layers will be coarser until permission is granted.
5. **"Today" keeps moving.** Gaza and the West Bank change weekly. Modern layers show their `as_of` date prominently, and the README explains how to refresh them.
6. **Machine translation of sensitive terms** is risky. Every machine-drafted text is labeled until a human reviews it.
7. **No presentation is neutral to everyone.** The site's defensibility comes from transparent sourcing, from showing where scholars disagree, and from a visible corrections channel, not from avoiding hard topics.
8. **Casualty figures are left empty** as you asked. A note in the conflicts panel will say this is deliberate, so it doesn't look like an omission.
9. **Performance on older phones** (WebGL, animated flows). Mitigations: lazy loading, reduce-motion support, and lighter layers on small screens.
10. **Fast-moving dependencies.** MapLibre 6 and TypeScript 7 are new. I'll pin versions and keep the upgrade path documented.
