# Data changelog

What changed in `/data`, when, and why, so reviewers can trace every decision that wasn't simply "copied from a source".

---

## 2026-10-18 — Milestone 2: first pass across all eras

### How the data was gathered

Six research passes, each with a written brief requiring that every figure come from a source actually seen, with honest verification levels (see `data/README.md` §1):

| Pass | Covers | Result |
|---|---|---|
| Polities 10,000–332 BCE | Archaeological cultures; Bronze and Iron Age polities; Assyrian, Babylonian and Persian provinces | 11 cultures, 30 polities |
| Polities 332 BCE–1099 CE | Hellenistic, Hasmonean, Roman, Herodian, Byzantine, early Islamic | 40 polities |
| Polities 1099–1917 | Crusader, Ayyubid, Mamluk, Ottoman (incl. provinces and local rulers), Egyptian rule 1831–40 | 22 polities |
| Polities 1917–today | Mandate, states, military administrations, Palestinian Authority, Hamas-led administration in Gaza, post-2023 zones | 27 polities |
| Population to 1800 | Archaeological and textual estimates, Ottoman tax registers | 107 records |
| Population 1800–today | Ottoman figures, Mandate censuses, Israeli CBS, Palestinian PCBS, Jordanian and Israeli censuses of the territories | 97 records |

Totals after merging: **289 sources, 117 polities, 11 cultures, 221 territory slices, 201 population records.**

### Decisions made when importing (by hand, recorded here)

**Sources**
- Three books (McCarthy 1990, Schölch 1993, Karpat 1978) were read in third-party PDF copies of uncertain licensing status. Those links were removed and replaced with a library catalogue record or DOI. The source note says how the work was read, and page references are flagged for confirmation against a library copy.
- The same work entered under two ids was merged: `bachi-1977`, `hirschberg-1971`, `landes-1976`.
- Arabic and Hebrew names taken from Wikidata labels are marked `machine-draft`. They are crowd-edited and have not been reviewed.

**Confidence: "contested" means a dispute between sourced positions**
- Where a record was marked `contested` but cited one source, the competing position was added if it already existed in the data. Examples: McCarthy vs Schölch vs Bachi on late-Ottoman totals; Bachi vs Lewis for 1553–54; Broshi's maximum of about 1 million vs Avi-Yonah's 3.25 million for the Byzantine period. 62 population records were linked this way, each with a note naming the alternative record.
- Where the uncertainty sat inside a single account (e.g. "357–358, or perhaps as late as the 390s"), or no competing estimate exists in the data, the record became `estimated`. Lists:
  - Population: Bachi 1533–39 and 1690–91; Benvenisti's Crusader-period figures; Kennedy, Finkelstein and Albright Late Bronze figures; several Broshi Jerusalem estimates; Avi-Yonah before and after Bar Kokhba; Schwartz 2006.
  - Polities and territories: some relations of Jund Filastin and of Atsiz; the first Ptolemaic slice; the third Syria Palaestina slice; the 2023 Israeli-held zone in Gaza.
- Records that depend on a disputed entity (the Assyrian provinces of Duʾru and Galʿaza, Persian Idumea, the Early Bronze I Egyptian presence) are `estimated`. The dispute itself is on the polity or culture record, with both positions.
- Claims that rest on the biblical narrative (David's rule over Aram and Edom; the textual United Monarchy extent) stay `contested`. They cite Finkelstein 2013 as the counter-position and point to the archaeological record.

**Population**
- Compositions that list only some groups (e.g. CBS religion tables without "others" and "not classified") are marked `partial`, with a note. The validator does not require them to sum to the total.
- Open-ended figures ("at least", "at most") keep one bound empty.
- Duplicate c. 1800 estimates entered by two passes were removed; the version with fuller sourcing was kept.
- Areas that cover roughly the same land (Broshi's "western Palestine", Mandate Palestine, the late-Ottoman sanjaks) share `series: "core"`, so a chart can join them while marking the change of definition.

**Territories**
- Dropped: the Hyksos slice (no source shows Hyksos control of territory in Canaan; the polity is kept for its relations) and the first Late Natufian zone (wholly before 10,000 BCE).
- Modern slices were remodelled so the map doesn't overstate disputes or claims:
  - Israel (1967–81 and from 1981): the 1949-lines area is ordinary; East Jerusalem, the Golan Heights and Shebaa Farms are `contested_units` (annexations most states do not recognise).
  - Jordan 1948–67: the West Bank and East Jerusalem are `contested_units` (the 1950 annexation had very limited recognition).
  - State of Palestine: `extent_type: "claim"`, drawn as an outline. Control on the ground is shown by the Palestinian Authority, Hamas-led administration and Israeli military government records.
  - Syria and Lebanon: drawn whole; Israeli-held positions are separate records on top. Israeli positions in Syria since 2024 are drawn as the UN area of separation (UNDOF) only.

**Colours**
- Modern entities have pinned colours chosen to avoid flag and politically coded colours. Each has a written rationale in `palette.json`.

### Known gaps and imbalances (to address in Milestone 8)

- **Reliance on Britannica.** About a third of sources (99 of 289) are Encyclopaedia Britannica entries, used for first-pass dates. They should be replaced or backed by scholarly sources era by era.
- **Institutional balance.** 38 sources come from Israeli institutions and 5 from Palestinian ones; much of the gap is Israeli statistics tables and Israeli archaeology. Palestinian scholarship and institutions (PCBS series, the Institute for Palestine Studies, Palestinian archaeologists) need to be added, especially for the Ottoman, Mandate and modern periods.
- **Population gaps.** No absolute estimate before the Early Bronze Age (none found in the literature). No country-wide estimates for the Early Islamic or Crusader periods. Byzantine religious shares not numeric. Hütteroth & Abdulfattah (1977) and Gophna & Portugali (1988) were not accessible.
- **Polity gaps.** The Zengids (Damascus 1099–1174); Ayyubid successor principalities; the Mamluk provinces of Kerak and Jerusalem; Josiah's expansion; the Babylonian-period province at Mizpah; Qarmatian incursions (no citable source found).
- **Paywalled originals.** Many figures are cited via secondary works (60 sources are `cited-via`). The validator lists them for confirmation against the originals.
- **Fast-moving present.** Post-2023 Gaza, south Lebanon and Syria records carry dated figures from several sides as of 18 Oct 2026 and need regular updating.

---

## 2026-10-19 — Milestones 3–4: languages, landscape, places and holy sites

### What was added

| Pass | Covers | Result |
|---|---|---|
| Languages and landscape | Languages spoken and written, by period and role; Mediterranean sea level; Dead Sea levels; four trade routes | 22 languages; 19 sea-level and 23 Dead Sea points; 4 routes |
| Places | Cities, towns, villages (including depopulated villages), archaeological and prehistoric sites, with dated names | 115 places, 524 names |
| Holy sites | Significance to each tradition (Jewish, Christian, Muslim, Samaritan, Druze, Bahá'í), names used by each community, custody today, UNESCO listings | 38 sites (3 merged into existing places) |

Totals after merging: **438 sources, 150 places.**

### Decisions made when importing

**Place names**
- Most ancient names come from Pleiades, whose dates are the bounds of broad periods (to the century), not exact dates of use. Pleiades period tags that are impossible for the language (e.g. an Arabic name tagged to the Bronze Age) were not used; each such name says so in its note.
- Medieval Arabic names start at the earliest dated geographer quoted by Le Strange (1890). That is a first attestation, not the date the name came into use.
- A displayed form that is the name itself, in its own language and script, is marked `original`. Arabic and Hebrew place titles taken from Wikidata labels remain `machine-draft`, as decided in Milestone 2.
- Contested names (e.g. Nablus/Shekhem, Hebron/al-Khalil/Hevron, Jerusalem/al-Quds/Yerushalayim, the Temple Mount/al-Haram al-Sharif) are separate name records, each saying who uses it.
- **Undated names and places.** Names with no sourced date (mostly current names from Wikidata) are treated as current usage and shown from 1800, the period of the modern surveys (`config.json` › `undated_names_from`). Inhabited places with no dated name at all are also shown from 1800. This is a display rule, not a claim that the place or name is no older; the place panel shows such names with an open date ("…").
- **Map label in "names then" mode.** The map shows a name in use at the date in the reader's language when there is one, preferring the reader-language rendering of the main name. Otherwise it shows the main name attested most recently. This keeps, for example, Hebron labelled al-Khalil rather than Masjid Ibrahim after 1300.

**Destroyed and depopulated places**
- A destruction is marked `ended_settlement: true` (shown as a hollow ring) only where the cited source says the place was not lived in again: ancient Ascalon (1191), Lifta and Deir Yassin (1948), Imwas, Yalu and Bayt Nuba (1967), Quneitra (1974). Other destructions (e.g. Ramla 1187, the Gerizim temple c. 110s BCE) are listed in the place panel but do not change the marker.
- For Deir Yassin, a quote from the Institute for Palestine Studies' Palestinian Journeys was added recording that the captured villagers were removed by truck.
- Casualty figures are not recorded for any place.

**Holy sites**
- Custody summaries (13 sites) are marked `contested` where the parties describe the arrangements differently, and cite each side (e.g. for the Temple Mount/al-Haram al-Sharif: the Jerusalem Center for Public Affairs, Jordan's Royal Court, the Arab Center Washington DC, and Reiter 2017).
- UNESCO's own wording is kept, including the listing "Jerusalem (Site proposed by Jordan)".

### Known gaps (to address in Milestone 8)

- **1948 depopulation dates** are missing for al-Tantura, Saffuriya, Isdud, Yibna, Bayt Jibrin, al-Lajjun and Zir'in: neither Khalidi's *All That Remains* nor Morris's *Birth of the Palestinian Refugee Problem* could be opened. Until they are added, these villages are shown as inhabited after 1948, which is wrong.
- Late Bronze Age (Amarna) names only where Pleiades has them; the *Tabula Imperii Romani* was not opened directly.
- Quneitra's 1974 destruction rests on Britannica alone; the Israeli account is not represented.
- Druze shrine sourcing is thin (Nabi Sabalan rests on one underlying source). The 1967 Protection of Holy Places Law and the Oslo II holy-sites article could not be retrieved.
