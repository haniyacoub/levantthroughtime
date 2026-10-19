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

### Migrations and conflicts (imported 2026-10-19)

| Pass | Covers | Result |
|---|---|---|
| Migrations and diaspora | Movements into, out of and within the region from the Bronze Age to 2026, and diaspora snapshots | 73 migrations (32 documented, 27 estimated, 14 contested); 33 diaspora snapshots |
| Conflicts before 1517 | Wars, battles and sieges from Megiddo (c. 1468 BCE) to the Ottoman conquest | 112 records (90 documented, 13 estimated, 9 contested) |
| Conflicts 1517–today (first part) | From the Ottoman period to today | 43 records so far |

**Decisions**
- The research pass classed seven movements as "colonization". They are recorded with the project's neutral category "settlement", and each record says so in its note.
- Figures published as a single number are stored as `low = high = best`.
- Second Aliyah: CBS gives 35,000–40,000 and Bachi's sub-periods sum to 34,300, so the range runs from 34,300 to 40,000 with no single best figure.
- 1948 refugees: the research used Wikidata's single point for Israel (in the Negev) as the origin. Because the origin label names Jaffa, Haifa, Lydda and Ramla first, the arrows start from the centroid of those four places. The five destinations (West Bank, Gaza Strip, Transjordan, Lebanon, Syria) are drawn as equal thin legs, because the sources don't split the number between them.
- Arrows for "Israel" as a whole are drawn to or from Tel Aviv–Jaffa (display convention, see `data/README.md`).
- Conflict place ids that are not project places (e.g. Kadesh, Carchemish, the Horns of Hattin, Ain Jalut) were dropped; the coordinates from Wikidata are kept. Six were matched to existing places (Samaria → Samaria-Sebastia, Tel Ashdod → Isdud, Tell es-Safi → Gath, Panias → Banias, Emmaus → Imwas, Shechem → Tell Balata).
- Casualty fields are empty in every conflict record.

**Gaps**
- No sourced figures for Palestinians in Chile or the United States; UNRWA's 2024 field totals for Lebanon and the West Bank were not found.
- No overall total for Aliyah Bet; CBS period totals are used instead.
- Samaritan revolts carry reign windows rather than the usual years (484, 529, 556), which were not in any source read; 556 is omitted.
- Dathin, Fahl, Ramla 1105 and Montfort have no record (no source opened).

### Modern map layers (imported 2026-10-19)

Seven layers, each with publisher, licence, as-of date and method in `data/modern/layers.json`:

| Layer | Source and licence | Shown |
|---|---|---|
| UN partition plan, 1947 | Digitised by this project from the text of Resolution 181 (II), with Wikidata and OpenHistoricalMap anchors (CC0). **Approximate** (about 1–5 km); the Jerusalem zone is schematic. | 29 Nov 1947 – 15 May 1948 |
| 1949 demilitarised zones | El Auja from the map references in the Egypt–Israel agreement; Israel–Syria zones from OpenHistoricalMap (CC0) | 1949 – June 1967 |
| 1949 armistice line, West Bank sector | OpenStreetMap (ODbL) | from April 1949 |
| Oslo II Areas A, B, C and Hebron H1/H2 | OpenStreetMap (ODbL); the Palestinian Ministry of Planning layer was used only as a cross-check (non-commercial licence) | from 28 Sep 1995 (today's extent for all dates) |
| West Bank barrier | OCHA oPt via HDX (CC BY), route as of January 2018 | from 23 June 2002 (cabinet approval, per the ICJ opinion) |
| Israeli settlements | Israel Central Bureau of Statistics 2023 locality file (data.gov.il), by founding year; East Jerusalem neighbourhoods from Peace Now built-up areas via OCHA (CC BY-IGO); localities evacuated in 2005 from the CBS change list | each from its founding year |
| Gaza since 2023 | Schematic lines only (OpenStreetMap, ODbL; dates from press reports): the October 2025 "Yellow Line", the Netzarim, Philadelphi and Morag corridors | from the dates reported |

**Decisions**
- Arab-population localities in the Golan Heights (Buq'ata, Majdal Shams, Mas'ade, Ghajar, Ein Qiniyye) are in the CBS file but are not settlements, so they are not shown. Nimrod is left out because the CBS file gives neither a founding year nor a population.
- East Jerusalem neighbourhoods have no founding year in the source, so they are shown from 2011, the date of the aerial photographs they were mapped from.
- The Morag corridor has no published geometry; it is a straight line through the former Morag settlement, oriented as press reports describe it, and labelled schematic.
- No areas are drawn for Gaza after 2023, as decided in the plan: the zones changed too often. Dated shares of the Strip under Israeli control are given in the polity records, from several sides.

### 1948 villages and conflicts 1516–today (imported 2026-10-19)

**1948 villages.** Dated captures and depopulations for al-Tantura, Saffuriya, Isdud, Yibna, Bayt Jibrin, al-Lajjun, Zir'in, al-Majdal (1948 and the 1950 transfer of its remaining residents) and Lifta, from the *All That Remains* entries (Institute for Palestine Studies, PalQuest), Zochrot (an Israeli NGO), Britannica, the UN, BADIL, NPR and Morris. Where the accounts differ (whether residents fled or were expelled; what happened at al-Tantura after the fighting), the entry is `contested` and each account is attributed. No casualty figures.
- The Israeli official military histories and Morris's *Birth of the Palestinian Refugee Problem* are cited only as quoted in those entries (`via`); the only Israeli scholarship read directly is the abstract of Morris's 1990 chapter on al-Majdal. Direct Israeli sources should be added in Milestone 8.
- Yavne/Yibna and Ashkelon/al-Majdal: the place records also stand for the Israeli towns there today, so the events are listed without the "former place" marker.

**Conflicts 1516–today.** 96 records from the second pass, merged with the first (205 in all; the 1516–17 Ottoman–Mamluk war, Marj Dabiq and Khan Yunis appeared in both and were merged). 34 records give each side's name for the war with a source (e.g. War of Independence / al-Nakba; Six-Day War / al-Naksa; Operation Al-Aqsa Flood / the October 7 massacre). Fifteen are `contested`, each with both positions sourced.
- Gaps: Karameh (1968), October 2000, al-Dawayima and May 2021 rest only on Palestinian sources; the Kahan Commission report could not be opened (its findings come via a summary); several operation names (e.g. Lebanon's "July War") are mentioned only in notes as unverified.

### Perspectives (imported 2026-10-19)

18 topics, 85 accounts, 166 sources (128 read in full, 7 excerpts, 31 seen only quoted in another work, each with `via`). Every topic has at least an Israeli, a Palestinian and an academic or international account. Where a side is internally divided the accounts are separate: for 1948 the traditional Israeli account, the Israeli "new historians", the Palestinian account, the UN record and outside scholars; for Gaza, Hamas and the Palestinian Authority.
- Citation markers were moved before the full stop ("… honey' [1].") to match the rest of the site, so the validator can check every sentence.
- The research linked each topic to whole polities (e.g. the Mandate for the 1929 riots), which made topics appear across decades. Each topic is now linked to the specific conflicts, events and migrations it is about; the validator checks that these links exist.
- Gaps: not read directly: W. Khalidi's "Plan Dalet", Masalha's *Expulsion*, the Levy Report, the ICRC commentary on Article 49, the Turkel Commission. No Israeli government source rejecting the 2024 ICJ opinion or the 2025 UN commission report; Hamas's "Our Narrative" and Israel's ICJ pleadings only via press and UN summaries. Three publication years (Hoffmeier, Hagopian & Zahlan, Morris 1987) were filled from catalogue knowledge, as the source notes say.

## 2026-10-19 — Milestone 8: data deepening

### Scholarly sources for 330 BCE – 640 CE (group A)

All 83 records in this period that rested only on reference works (mostly Britannica) now cite at least two further sources: 269 source references, 45 new works. Ancient authors in standard translations (Diodorus, Polybius, Cassius Dio, Tacitus, Ammianus, Josephus, 1 Maccabees, the Mishnah and Talmud, the Acts of Chalcedon, Antiochus Strategos, al-Baladhuri), Schürer's *History of the Jewish People* (dated, and noted as such), Di Segni (2018), Eck (1999), Encyclopaedia Iranica, the TDV İslâm Ansiklopedisi, the Encyclopaedia Judaica (2007), Bryn Mawr Classical Review summaries of recent monographs, and De Imperatoribus Romanis.

Corrections applied (each quoting both the old and the new basis):
- The Ptolemaic hold on Palestine starts c. 319/318 BCE, not 323: Diodorus has Syria under the satrap Laomedon until Ptolemy's general took it.
- Zenon's journey: November 260 – c. June 259 BCE (was 259).
- The division into three Palestines: by the early 5th century (latest 451), following Di Segni; Palaestina Salutaris dates from c. 357/8.
- Agrippa I's tetrarchy may have begun only in 40 CE; Agrippa II's death c. 93 with a latest of 100 CE (Jacobson argues for 94/95; Schürer 100).
- Philip's tetrarchy: Iturea proper was not part of it (Josephus, Schürer); the Jewish Encyclopedia statement is no longer used for the map.
- Notes added on: the 312–311 and 302 episodes under Antigonus; Myers on the Ituraeans; the Decapolis outliving 106; the 34–37 CE status of Philip's lands; the Sasanian span conventions; al-Baladhuri's dates for Jerusalem and Caesarea; Bernhardt's view of Antiochus IV's decrees; Luke's census and the date of Jesus' birth; the rabbinic sources on Yavne; the redaction of the Jerusalem Talmud; Tacitus on Cumanus and Felix.

Texts changed by these corrections lost their Arabic and Hebrew drafts and were drafted again.

Gaps: the end of Ptolemy I's reign and the start of Ptolemy II's co-regency; the 616 step to direct Sasanian rule (still Howard-Johnston alone); Bostra as capital of Provincia Arabia; no open-access modern Arab or Palestinian scholarship on the conquest of 634–640 was found.
