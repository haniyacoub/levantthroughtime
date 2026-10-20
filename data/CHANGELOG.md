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

### Scholarly sources for 634–1517 (group B)

All 73 records in this period that rested only on reference works now cite further sources: 298 source references, 29 new works. Among them: the University of Wisconsin *History of the Crusades* (chapters by Gibb, Cahen, Fink, Nicholson, M. W. Baldwin, Painter, Van Cleve, Runciman, Boase, İnalcık and the Cairo historian Ziada), Hitti's *History of the Arabs*, Lane-Poole, Doumani, Burgoyne's *Mamluk Jerusalem*, Köprülü, and Arabic chroniclers in scholarly translation (al-Baladhuri, Baha' al-Din, Ibn Iyas, Mujir al-Din, Ibn al-Wardi).
- Burgoyne and Köprülü were read in copies uploaded to the Internet Archive by users; those copies are not authorised, so the project cites the books but does not link them.

Corrections applied:
- Lordship of Sidon: from December 1110 (was c. 1112).
- Lordship of Oultrejordain: from c. 1115, when Montréal (Shawbak) was built (was c. 1132, Britannica's date for Kerak, which Boase dates to 1142); ends 1189, when Montréal surrendered.
- Kingdom of Jerusalem: the last mainland slice ends 14 August 1291 with the evacuation of Château Pèlerin ('Atlit), not with Acre on 18 May; the description of 1187–1191 now names Belfort, not Belvoir, as the last castle held (until 22 April 1190).
- Ascalon fell on 22 August 1153 (county of Jaffa and Ascalon; end of Fatimid Ascalon). Ahmad ibn Tulun died in May 884 (was March); Tancred gave up Galilee on 8 March 1101; Fulk died 10 November 1143; Melisende's rule in Jerusalem ended c. 1152.
- Notes added on: interruptions of Fatimid rule; Ibn Ra'iq's hold on northern Syria 939–942; Kerak outside Mamluk control until 1263; the end of the Mamluk state (Raydaniyya, January 1517, or Tumanbay's execution, April 1517); the differing accounts of the 1229 treaty; the Black Death in Palestine (Ibn al-Wardi); the Treaty of Jaffa's terms (Baha' al-Din); dates for Qalawun and Qaytbay.

Held back: Ziada's statement that a treaty of April 1253 gave the Mamluks Jerusalem and the coast would change the map for 1253–1260; it rests on one source, so it is recorded as a note until checked against Humphreys (1977).

Gaps: the early Islamic records still rest on older works (Gil, Donner and Kennedy could not be opened); one Hitti quotation comes from a poor OCR line and should be checked against a page image.

### Scholarly sources for 1517–1948 (group C)

All 60 records in this period that rested only on reference works now cite further sources: 230 source references, 31 new works. Open-access monographs from the University of California Press (Doumani, Kayalı, Akarlı, Makdisi, Lockman, Beinin, Vitalis, and chapters by Tariq Tell, Elizabeth Thompson, Joel Migdal and Elizabeth Picard), *Ordinary Jerusalem 1840–1940* (Brill, open access; chapters by Muhtadi and Naïli, using the Jerusalem Islamic court registers, Yazbak, Hanssen, Rioli, Gribetz and Eldem), the 1988 Taba arbitration award, and older public-domain works marked as dated or partisan where they are (Antonius 1938, Sokolow 1919, Volney 1787, Napier 1842, the 1922 *Handbook of Palestine*, the Admiralty *Handbook of Syria*, Ruppin 1920, van Berchem's corpus of Jerusalem inscriptions, Djemal Pasha's memoirs).
- Begin's *The Revolt* was read in an unauthorised upload; it is cited but not linked.

Corrections applied: the Arab Kingdom of Syria proclaimed on 8 March 1920 (Antonius; Akarlı gives the congress session of 7 March; Britannica's 20 March is not supported); Ottoman rule restored in November 1840 (Acre taken 4 November; Jerusalem court records), with the end of Egyptian rule aligned; Abdulhamid II 31 August 1876 – 27 April 1909; Cemal Pasha took command in Damascus in December 1914; the bombardment of Acre on 3–4 November 1840; the Rafah–Aqaba agreement signed 1 October 1906; the Jaffa–Jerusalem railway inaugurated 26 September 1892; the First Zionist Congress from 29 August 1897. Notes added or corrected on: the Jerusalem municipality (1863, not 1887), Petah Tikva (1878), Suleiman's walls (inscriptions AH 944–947), the Land Code, the 1773 and 1775 campaigns, OETA East and Transjordan, the Golan and Karak in the vilayet of Syria, the Ottoman occupation of Sinai in 1915–16, and the 1917 British advance.

Not changed on the map yet: Faisal's administration in northern and central Transjordan (1918–1920) and the wartime Ottoman occupation of Sinai are described in notes but not drawn.

Gaps: Suleiman's death (1566), Syria's independence (April 1946), Egypt's republic (1953) and the days of the Gülhane edict, the Kütahya convention and the King David Hotel bombing still rest on Britannica alone; DergiPark (Turkish journals) and the Jerusalem Quarterly could not be searched.

### Scholarly sources for 3300 BCE – 640 CE (group D)

All 68 remaining records from the Bronze Age to the Byzantine period that rested only on reference works now cite further sources: 236 source references, 34 new works. Open-access science and epigraphy (PLOS ONE studies of the Hyksos, the Sea Peoples and Egyptian radiocarbon dates; Regev et al. 2012; the Assyrian and Babylonian royal inscription editions on Oracc), Finkelstein, Mazar, Avni (Israel Antiquities Authority) on 614, Honigmann on Chalcedon, the Inscriptions of Israel/Palestine database, ancient authors in standard translations (Egyptian annals, Arrian, Diodorus, Polybius, Cassius Dio, Tacitus, Herodotus, Josephus, Antiochus Strategos, al-Baladhuri) and the Bible (JPS), kept apart from the archaeology.

Corrections applied: the Neo-Assyrian Empire from 745 BCE (Tiglath-pileser III's accession; 746 was a revolt); the walled Early Bronze towns abandoned about 2500 BCE (Regev et al.), not 2300; Ammon's first slice ends in 582 BCE with the Babylonian conquest (Josephus), like Moab's; Jeroboam II's windows widened to cover Finkelstein's and Young's chronologies; Jerusalem made a patriarchate on 26 October 451. Notes added: the Hyksos rose from a population already in the Delta (strontium study); Esarhaddon's destruction of Sidon c. 677; Egypt's loss of its Asian territory by 600/599; the Tyrian records on Hiram; the epitaph of Uzziah; radiocarbon dates for Thutmose III and Merneptah; the Hasmonean civil war from 69 or 67 BCE; Avni's archaeology of 614; the year the True Cross was returned; al-Baladhuri's date for Gaza.

Gaps: Egyptian absolute dates rest on a single open radiocarbon study; the start dates of Tyre, Sidon, Moab and Ammon and the 525 BCE end of the 26th Dynasty are still unsupported; no open modern Arab, Palestinian or Turkish study of the 634–640 conquest, and no modern Israeli or Palestinian study of the Jewish revolts, was found.

### Missing polities and map changes (group G)

A further research round filled gaps the earlier groups had only described in notes: 31 sources (14 new works, among them Humphreys' *From Saladin to the Mongols*, the Wisconsin *History of the Crusades* chapters by Gibb and Ziada, Midilli's 2022 study of the Jerusalem niyaba, Walker on Mamluk Transjordan, Matras on Domari).

New records:
- Polities: the Zengid state of Zengi and Nur al-Din (1127–1174, from 1154 including Damascus), the Mamluk province of Karak (1263 – c. 1516) and the Mamluk province of Jerusalem (from 777 AH / c. 1376). Each has territory slices; the Ayyubid sultanate is shown as a vassal of the Zengid state, 1171–1174.
- Rulers: Zengi and Nur al-Din.
- Languages: Russian, Amharic and Domari.

Map changes:
- The 1253 treaty, held back in group B, is now confirmed by Humphreys (1977) and Gibb (1969). From April 1253 to about 1256 the Mamluks held southern Palestine (new slice mamluk-sultanate-5); the Ayyubid slices were split at April 1253 and 1256 to match. The 1255/56 settlement gave al-Nasir Yusuf "all Palestine, as far south as al-'Arish"; this is shown as a partial northern Sinai coast for 1256–1260.
- Damascus province split at 1376, when Jerusalem became a separate niyaba. Richards places Jerusalem and Hebron under Gaza for most of the Bahri period; that is noted, not drawn.
- Faisal's administration in northern and central Transjordan (1918–1920) is now drawn as a partial unit for OETA East and the Arab Kingdom of Syria.
- The wartime Ottoman hold on Sinai (December 1914 – January 1917) is now drawn as partial units on a new Ottoman slice.

Not applied: eight further territory proposals (among them Burid Damascus and Zengid reach east of the Jordan) need sources the round did not reach. Humphreys was read in an unauthorised upload; it is cited but not linked.

Gaps: no Burid Damascus record covers 1098–1154. The extent of the Karak and Jerusalem provinces (Ma'an, Aqaba, Hebron, Ramla) is not verified, and al-Bakhit's study of Mamluk Karak was not seen. The British canal zone and the 1916 front lines in Sinai are not drawn. Nothing yet covers August 1920 – April 1921 in Transjordan. There is no Kingdom of Hejaz record to carry the annexation of Ma'an and Aqaba. Russian among pre-1914 Jewish immigrants, Amharic speaker numbers and Domari's endangerment status are unsourced.

### Scholarly sources for pre-1948 conflicts, migrations and places (group F)

48 of 49 records that rested only on reference works now cite further sources: 187 quotes, 23 new works. Among them:
- **Crusades and Mamluks:** further chapters of the Wisconsin *History of the Crusades*; Baha al-Din and Ibn al-Qalanisi in translation; Ibn Iyas; Aigle (2007) and Jackson (2024) in *Mamluk Studies Review*.
- **Early Islamic period:** an Arabic survey by Nabila Hasan Muhammad (1969).
- **Prehistory:** Weinstein (1984) and Grosman and Belfer-Cohen (2022) on Natufian chronology.
- **Places:** the *Survey of Western Palestine* memoirs (1881–83), seven *Hadashot Arkheologiyot* excavation reports, the PalQuest village pages, Ruppin (1920) and Sokolow (1919).

Corrections applied:
- **Day dates:**
  - Ascalon: siege from January 1153, fall on 22 August 1153.
  - Jerusalem: siege from 20 September 1187.
  - Jaffa: attack from 27 July 1192.
  - Khwarazmian capture of Jerusalem: 11 July – 23 August 1244.
  - Antioch: 14–18 May 1268.
  - Tripoli: March – 26 April 1289.
  - Wadi al-Khaznadar: 22 December 1299.
  - Marj al-Saffar: 20 April 1303.
- **Timur's invasion of Syria:** now autumn 1400 – c. April 1401, replacing a vague 1399–1405.
- **Hasidic immigration:** now 1777, possibly 1778. The Posen Library and the Encyclopaedia Judaica differ.
- **Notes added:**
  - Battle of Khan Yunis: Ibn Iyas confirms the date (Sunday 24 Dhu'l-Qa'da 922 ≈ 21 December 1516), but places the battle near Baysan, so the location is now marked uncertain.
  - Marj Dabiq: Ziada's account of treachery on the Mamluk left wing is recorded beside Emecen's rejection of it.
  - Also: Hijri dates for the revolt of Abu Harb and the Qarmatian rising; the Survey's identification of as-Samu' with Eshtemoa.
- **Natufian Jericho, removed as an event:** "about 9000 BCE" (Britannica) is an uncalibrated radiocarbon date. In calendar years the Jericho Natufian falls about 13,000–10,500 BC (Weinstein; Grosman and Belfer-Cohen; UNESCO), which is before the 10,000 BCE start of this timeline. The event was removed, and the dating and sources are kept in the founding note of Tell es-Sultan.

Copies not linked:
- Benvenisti (1970), Hitti's *History of the Arabs*, Boas (2001) and Dols (1974) were read in user uploads of in-copyright works.
- Ibn al-Qalanisi (1932) and Nabila Hasan Muhammad (1969) were read in copies whose licensing could not be confirmed.
- Four works were seen in the Internet Archive's lending library: Avi-Yonah (1976), Cohen and Lewis (1978), Knoppers and Grabbe (2009) and Tsafrir (1996).

All ten are still cited but no longer linked. Verification notes no longer contain the research team's working file paths.

Gaps:
- Eilat has no open scholarly source.
- The 1936 evacuation of Hebron's Jewish community still rests on the Encyclopaedia Judaica.
- Seven West Bank towns rest on the 19th-century Survey as their only non-reference source: Tulkarm, Qalqilya, Ramallah, al-Bireh, Halhul, as-Samu' and Bayt Nuba. Khan Yunis rests on a 1920 British handbook.
- These sites refused automated download: Sefaria, *Jerusalem Quarterly*, *'Atiqot*, OpenEdition, MDPI, Project MUSE and the SOAS repository.

### Official and UN sources for 1948–2026 (group E)

All 52 modern records that rested only on reference works now cite further sources: 205 quotes, 63 new works.
- **Agreement texts:** the 1994 Gaza–Jericho Agreement and Oslo II (UN Peacemaker); the 1949 armistice, the 1974 Israel–Syria separation agreement and the 1979 treaty (Avalon).
- **UN documents:** UNEF and UNDOF reports; resolution 1701 reports; Security Council records that carry both the Iranian and the Israeli positions; OCHA updates.
- **Official sources:**
  - Palestinian: WAFA decrees and the PLO Negotiations Affairs Department.
  - Egyptian: the Presidency, the State Information Service, and the Bibliotheca Alexandrina's Nasser and Sadat archives.
  - Syrian: SANA.
  - Jordanian: the King Hussein site.
  - Israeli: the foreign ministry and the State Comptroller.
- **US and press:** FRUS and CRS; AP and NPR.
- **Scholarship:** Shlaim (1990), Picard (2000), Hajjar (1988), PalQuest and PASSIA.

Corrections applied:
- **Day dates:**
  - Palestinian Authority: from 4 May 1994.
  - Israeli ground operations in Gaza: from 27 October 2023.
  - Egypt: Sadat from 29 September 1970; Mubarak from 14 October 1981; Mansour 4 July 2013 – 8 June 2014; Sisi from 8 June 2014.
  - Syria: Bashar al-Assad from 17 July 2000; al-Sharaa president from 29 January 2025.
  - Israel: Rivlin to 7 July 2021, and Herzog from that day.
  - PLO and Palestinian Authority:
    - Abbas: PLO chairman from 11 November 2004; PA president from 15 January 2005.
    - Fayyad: second government from 19 May 2009.
    - Hamdallah: second government to 13 April 2019.
    - Shtayyeh: 13 April 2019 – 31 March 2024, which closes a gap before the next government.
  - Iran–Israel strikes: 13 April – 26 October 2024.
  - The 27 November 2024 ceasefire in Lebanon is no longer marked approximate.
- **Palestinian Authority in the West Bank:** the map now shows it from 13 November 1995, when the PA took over Jenin, not from the signing of Oslo II in September (PASSIA).
- **Hussein al-Sheikh:** recorded under his official titles, Vice President of the State of Palestine and Vice-Chairman of the PLO Executive Committee, with the State of Palestine. Britannica's "vice president of the PA" is noted.
- **Hamdallah:** he formed a 16th government on 19 September 2013; he was not caretaker until 2014.
- **Notes added:**
  - The end of the Gaza military government (12 or 21 September 2005).
  - The dates of the 1956–57 occupation of Sinai and Gaza.
  - The UN account of the December 2024 entry into the Golan area of separation, with both governments' statements.
  - Taba remained under Israel until 1989.
  - Egyptian official sources treat 1954–56 as rule by the Revolutionary Command Council with the presidency vacant.
  - Arafat's swearing-in and Fattouh's interim presidency.
  - The Ta'if accords.
- Earlier caveats such as "not verified in an opened source" were removed where the new sources settle the point.

Gaps:
- Exact inauguration days for nine earlier Israeli presidents are still missing: the Knesset and President's Office sites blocked automated access.
- Hafez al-Assad's 1971 start rests on Britannica and an indirect CRS inference.
- Egypt's non-annexation of Gaza (1948–67) rests on Britannica alone.
- French law articles on the Oslo agreements and the ICJ order of 24 May 2024 could not be downloaded.
- There is no peer-reviewed study of the 2023–25 zones of control.
- The exact start and end days of the Lebanese Civil War are still unsourced.
- Most new sources for this period are official and UN documents rather than scholarship.

## 2026-10-20 — Bibliography and consistency fixes

- 34 sources that had no URL, DOI or ISBN now carry one. Each was found by exact title, year and author (and, for books, publisher) in Crossref or Open Library. Examples: Byatt 1973 and McCown 1947 (DOIs); Humphreys 1977, Khalidi 1992 and 2006, Morris 1987 and 2008, Pappé 2006, Karsh 2010 and Oren 2002 (ISBNs). Books from before about 1970, and works whose edition could not be matched exactly, are still cited by their full details only.
- Two works appeared twice in the bibliography under different ids: Morris 1987 and Peters 1984. Each pair was merged and the references updated.
- Three territory slices ended after, or less precisely than, their polity: Alexander's empire, the late Ptolemaic kingdom and Agrippa II's kingdom. Their end dates now match the polity records.
- The check for overlapping territory slices no longer counts a handover within the same month or year: when a slice ends in, say, April 1253 and the next starts that month, the map already shows the newer one. 69 warnings of this kind are gone. The two overlaps that remain are deliberate: the Mamluk hold on southern Palestine in 1253–56 and the Ottoman hold on Sinai in 1914–17 are drawn as separate slices beside the main ones.
- Two first-pass Ottoman slices for December 1917 – October 1918 covered the same area with the same dates, so both were drawn. They are now one slice, keeping both sets of sources and notes. The Fatimid slice after the loss of Ascalon now starts on 22 August 1153, the day Ascalon fell.

### Population estimates checked against the originals (round H3)

Many ancient population figures had been seen only as quoted in Bachi's 1977 survey. The originals that are public domain have now been read in library scans:
- Albright (1925, *Journal of the Palestine Oriental Society*)
- Conder (Hastings' *Dictionary of the Bible*, 1900)
- Socin (*Encyclopaedia Biblica*, 1902)
- Juster (1914)
- Beloch (1886)
- Eduard Meyer (1909)
- Harnack (2nd and 4th editions)
- F. C. Grant (1926)
- Derwacter (1930)
- Lowdermilk (1944), in a copy that is not linked
- Baron's own Encyclopaedia Judaica article

26 records now quote the original directly.

What reading the originals changed:
- **Eduard Meyer:** about 1,500,000 ("rund 1½ Millionen"), not 2,000,000. He says Beloch's figure is somewhat too high.
- **Beloch:** "hardly 2 million", for an area that includes Transjordan, so the figure is now an upper bound. The pages Broshi (1979) cites for Beloch are about northern Italy.
- **Juster:** gives only a Jewish figure (about 5,000,000, derived from Josephus). The "over 5,000,000" total was Bachi's inference and has been removed.
- **Conder:** made no estimate for the first century. Bachi's "6,000,000" is Conder's statement that the fully cultivated land could support ten times the 600,000 people of his own day. The record was removed. The other first-century estimates had listed it as their opposing position; they now cite Broshi (1979), who argues the population never exceeded about 1 million.
- **Albright:** his 1925 article has no figures for Solomon, 586 BCE or Persian Yehud, so those records now cite his 1960 chapter, still as quoted by Bachi.
- **Context added in notes:**
  - Albright's 600,000 includes the Transjordanian tribes.
  - Grant's text gives 2–3 million; his footnote's "safer" range is 1½–2½ million.
  - Lowdermilk's 3 million covers Palestine and Transjordan together.
  - Harnack gives 700,000 in the 1906 edition but 500,000 in the 1924 edition.
  - Socin's figure is an undated ceiling for the country's "most flourishing period".
- **Links:** the public-domain scans are now linked.

Not resolved (still marked "seen quoted"): Broshi's Jerusalem series (1975), Avi-Yonah (1947, 1966, 1973), Albright (1960), Baron's book (1972), Carter, Lipschits, Geva, Weinberg, the Late Bronze Age estimates (Finkelstein, Bunimovitz, Broshi and Gophna), Byatt, McCown, Poliak, and several popular works. These are in copyright with no open copy. The open surveys that report these figures (Finkelstein 2018, Lipschits 2009, Kennedy 2013) are kept as the way they were seen. They are not cited as if the originals had been checked.

### Modern gaps closed (round H4)

- **Israeli presidents:** every term now starts and ends on the day of the swearing-in, using contemporary Jewish Telegraphic Agency reports from 1949 to 2014 (dates checked against the dispatch datelines) and the Basic Law: The President of the State.
  - Weizmann from 17 February 1949; Ben-Zvi from 10 December 1952; Shazar 22 May 1963 – 24 May 1973; Katzir to 29 May 1978; Navon to 5 May 1983; Chaim Herzog to 13 May 1993; Weizman to about 12 July 2000; Katsav 1 August 2000 – 1 July 2007; Peres 15 July 2007 – 24 July 2014; Rivlin from 24 July 2014.
  - Weizman's last day is worked out from his resignation letter and the Basic Law's 48-hour rule. It is marked approximate.
- **Hafez al-Assad:** president from 12 March 1971. The sources differ on whether he was chosen by referendum or by parliament, and the note says so.
- **Lebanese Civil War:** 13 April 1975 – 13 October 1990. The end date is a convention; the note gives the alternatives (the Ta'if Agreement of 1989; disarmament in 1991).
- **Egyptian administration of Gaza (1948–67):** now supported by the Egyptian legal texts themselves. Law 255 of 1955 calls the Strip "the area under the supervision of the Egyptian forces in Palestine"; the 1962 Constitutional Declaration calls it "an indivisible part of the land of Palestine". It was administered, not annexed.
- **Eilat:** a founding note with the sequence army arrival (March 1949), civilian camp (December 1949), local council (1952) and city (1959). Sources differ on the arrival day (10 or 13 March), and the Arab name Umm al-Rashrash is recorded.
- **Hebron, 1936:** a second source (a JTA dispatch) shows the Mandate government decided on 22 April 1936 to move the Jews of Hebron to Jerusalem.
- **New polity, the Kingdom of the Hejaz (1916–1925):**
  - **Territory:** Aqaba and Ma'an, which it held from 1918/19 until their transfer to Transjordan in 1925. Sources differ between May and June 1925 for the transfer.
  - **Notes:** Britain's non-recognition of the Hijazi claim, and the Hijaz Congress's renewed claim of 1926.
  - **Start date:** 2 November 1916, marked approximate, because the day depends on reading a garbled scan of Antonius.
- **Importer fix:** a source note that said a page "is not linked" had wrongly triggered the rule for unauthorised copies. That rule now matches only explicit wording such as "third-party copy" or "user upload".

Gaps:
- The Knesset, President's Office and Israel State Archives sites refused automated access.
- No contemporary Syrian record for 1971 was opened.
- Several open studies sit behind anti-bot filters: Golan 2024 on Gaza; the Ifpo atlas of Jordan.

### Relations between states, 640 CE onwards (round H2)

All 42 relations from 640 CE on that rested only on reference works now cite primary or scholarly sources: 181 quotes, 10 new works. Examples of what "relation" means here: Jund Filastin as part of each caliphate in turn; the Crusader baronies as vassals of the Kingdom of Jerusalem; the Ottoman provinces; the Mandate and the All-Palestine Government.
- **Early Islamic and Byzantine:** al-Baladhuri, Antiochus Strategos, Procopius and Justinian's Novels; Le Strange; Gibb; Lane-Poole (Tulunid and Ikhshidid mints at Ramla and Tiberias).
- **Crusader states:** Fink, Baldwin and Richard in the Wisconsin *History of the Crusades*; Prawer; Boase.
- **Ottoman period:** Doumani; the 1920 *Handbook of Syria*.
- **Modern period:** FRUS (1922); Antonius; Tell; the Mandate text; UN documents; Shlaim.
- **Turkish scholarship:** seven new TDV İslâm Ansiklopedisi entries.

Corrections:
- **Crusader states:**
  - Principality of Galilee: ends 5 July 1187.
  - County of Jaffa and Ascalon: starts 22 August 1153. A note adds that it was in the royal domain from 1163 to 1176/77.
  - Lordship of Oultrejordain: as a fief from c. 1118 (latest 1128, Roman of Le Puy) to c. May 1189.
  - Lordship of Sidon: from December 1110.
- **Other date corrections:**
  - Palaestina Salutaris: Byzantine rule until c. 616.
  - Mamluk Damascus: until September 1516.
  - Zahir al-Umar's rule: ends 23 August 1775.
  - Egypt as a British protectorate: from 18 December 1914.
- **Rated documented:** the Tulunid emirate's and OETA East's relations, now supported by primary or scholarly sources.
- **Notes added:**
  - Ibn Ra'iq's hold on northern Syria (940–942).
  - Acre staying Fatimid until 1074.
  - A short-lived first Eyalet of Sidon after 1613.
  - Zahir al-Umar's status as a tax-farmer.

New polity, the Burid atabegate of Damascus (1104–1154):
- **Dates:** from Duqaq's death to Nur al-Din's entry.
- **Relations:** nominally under the Seljuks (estimated); a vassal of Nur al-Din from May 1150 (documented: his name in the Friday sermon and on the coins).
- **Territory:** three slices, leaving out Baalbek while Zengi held it (1139–1146).
- **Sources:** Ibn al-Qalanisi (cited, not linked), Gibb, Cahen and TDV.

Map colours: a polity now gets, where possible, a colour no other polity on the map at the same time uses. Before, only touching neighbours had to differ, so the legend could show two identical swatches, for example the Kingdom of Jerusalem and the Seljuks. Pairs of polities sharing a colour at the same time fell from 200 to 74; the rest occur where more than twelve polities overlap. 25 polities changed colour. Pinned colours are unchanged.

Gaps:
- The Sasanian occupation of Palaestina Secunda and Tertia rests on Iranica and Antiochus alone.
- The start of the junds (c. 638) is unresolved: al-Baladhuri, Le Strange and TDV differ.
- Egypt's 1922 independence rests on Britannica alone.
- No Arabic or Egyptian source was read for the All-Palestine Government.

### Relations between states before 640 CE (round H1)

All 35 relations before 640 CE that rested only on reference works now cite primary or scholarly sources: 231 quotes, 14 new works. Examples: Judah as a vassal of Assyria, Egypt and Babylon; Tyre and Sidon as tributaries; the Herodian client kingdoms; the Roman provinces.
- **Assyrian royal inscriptions on Oracc:** Ashurnasirpal II, Shalmaneser III, Tiglath-pileser III, Sargon II, Sennacherib, Esarhaddon and Ashurbanipal.
- **Babylonian chronicles:** ABC 1b, 3 and 5; the Cyrus Cylinder.
- **Neo-Babylonian inscriptions:** the open-access *RINBE 1/1* (2024), whose court list names the kings of Tyre, Gaza, Sidon, Arwad and Ashdod as Nebuchadnezzar's subjects.
- **Jordanian scholarship:** Kafafi's study of the Ammonites (*SHAJ* XV, 2025).
- **Classical authors:** Josephus, Strabo, Pliny, Cassius Dio, Tacitus, Herodotus and Arrian.
- **Older scholarship:** Schürer.

For the Iron Age, each quote says whether it rests on the biblical text, a cuneiform inscription or chronicle, or archaeology. David's rule over Ammon, for example, is marked as resting on the biblical account alone.

Corrections:
- **Sidon under Assyria:**
  - Tribute until Esarhaddon levelled the city in 677/676.
  - A new relation records the Assyrian province that replaced it, centred on Kar-Esarhaddon, until about 630.
  - The earliest recorded tribute from Tyre and Sidon (Ashurnasirpal II, c. 870 BCE) is given in the notes. The data format has no field for an "earliest" bound on a date.
- **Now rated documented:** Ammon's and Moab's tribute to Assyria (their kings are named in the inscriptions from 734 to 667) and the Ituraean principality's client status under Rome.
- **Agrippa II:** his relation to Rome now carries the same latest end date (100 CE) as the kingdom.
- **Notes added:**
  - The debate over whether Judaea was a full province or attached to Syria.
  - The Decapolis lasting beyond 106.
  - Nabataean dependence on Rome after 63 BCE.
  - Schipper's view that Judah was already an Egyptian vassal under Josiah.
  - Seti I's renewed claim on Tyre.
  - Fleming's view of the Phoenician cities as Persian "allies rather than vassals".

Gaps:
- No source states 395 CE as the end of the Roman provinces of Arabia and Syria Palaestina; that date is the project's convention for the Roman–Byzantine change.
- The exact date when Judaea was renamed Syria Palaestina was not found (the earliest evidence is a military diploma of 139 CE).
- Sidon's status from about 594 to 539 BCE is undocumented in the sources read.
- The Epigraphic Database Heidelberg, papyri.info and Encyclopaedia Iranica blocked automated access.

### Second sources for single-source claims: polities, rulers, territories (round I2)

40 claims marked "documented" had rested on a single source; each now has a second, independent one. 183 quotes, 14 new works. No rating had to be lowered.
- **Turkish scholarship:** TDV İslâm Ansiklopedisi entries; Aydın's 2022 thesis on the Ottoman governors of Jerusalem, built from Ottoman archival appointment records; Elçi and Karataş (2024).
- **The Wisconsin *History of the Crusades*:** chapters by Gibb, Cahen, Fink, Ziada and Runciman.
- **Ibn al-Qalanisi:** cited, not linked.
- **Official and legal texts:** the Palestine Act 1948, the 1920 Franco-British Convention, the ICJ 2004 opinion, Israel's Supreme Court in al-Bassiouni, and Egypt's State Information Service.
- **UN Security Council documents.**
- **PalQuest and Walid Khalidi.**

Corrections:
- **Mount Lebanon Mutasarrifate:** ends July 1915. Akarli and TDV give 11 July; the 1920 *Handbook* says 1914.
- **Israeli positions in south Lebanon:** the slice for the five fortified positions now starts on 18 February 2025, when the UN reports the army had withdrawn from the rest of the south. The record itself still starts in 2024, with the ground invasion.
- **Ottoman governors of Jerusalem:** exact days from the Ottoman archives (Aydın).
  - Rauf Pasha: 18 April 1877 – 4 April 1889.
  - İbrahim Hakkı Pasha: 15 October 1890 – 30 September 1897, with an 11-day break in November 1896.
  - Ali Ekrem Bey, the poet Ali Ekrem Bolayır: 3 December 1906 – 10 August 1908.
- **Notes added:**
  - Tutush's arrival (1078 or 1079).
  - The Fatimid recapture of Jerusalem in 1098.
  - The Artuqids' divided loyalties after 1095.
  - The Mamluk province of Gaza (c. 1300 – 1516/17).
  - The Jerusalem sanjak's Beersheba district (1900).
  - May or June 1925 for Ma'an and Aqaba passing to Transjordan.
  - Abdullah I's start in February–April 1921.
  - The possible end points of the French mandate.
  - 12 or 21 September 2005 for the end of the Gaza military government.
  - Taba under Israel until 1989.

Gaps: these still rest on one source:
- The All-Palestine Government's end in 1959, and the October 1948 limit of its territory (Shlaim).
- Abdullah's start day of 11 April 1921 (the Jordanian royal site).
- The 25 May 2000 withdrawal day from south Lebanon (UN documents; the Israeli foreign ministry page was blocked).
- The c. 630 BCE end of the Assyrian province of Magiddu, which no source dates.

### Second sources for single-source claims: migrations, places, languages, landscape (round I3)

28 of 33 single-source "documented" claims now have an independent second source (76 quotes, 24 new works):
- **Places:** the *Survey of Western Palestine*; Le Strange; the Franciscan Custody; Jordan's Baptism Site Commission; Tel Aviv University's Beth-Shemesh project; the Nelson Glueck School (Shiqmim).
- **Migrations:**
  - Encyclopaedia Judaica and the *Encyclopedia of the Modern Middle East and North Africa* (Morocco, Tunisia, Syria).
  - Beinin (Egypt).
  - UNRWA and a JTA report (the 1967 returns).
  - Tolts (post-Soviet immigration).
  - The Temple Society (the Templers).
  - Human Rights Watch, which also quotes the Israeli reply (the northern West Bank camps).
- **Languages:** the open-access *Languages from the World of the Bible* (Gzella, Gianto); the Palestine Order in Council 1922; the Palestinian Basic Law.
- **Dead Sea levels:** the USGS (1978) and a University of Jordan study (2026).

Changes:
- **Migration figures:**
  - Moroccan Jewish immigration: the range now runs from 235,000 to the CBS figure of 254,715.
  - Tunisian Jewish immigration: up to 54,000.
  - Egyptian Jews: Beinin's estimate that one-third to one-half of the community went to Israel is added.
- **Northern West Bank camps (2025):** displacement from 21 January 2025, 32,000–40,000 people, with the Israeli position noted.
- **Ugaritic:** dated c. 1300 – c. 1190 BCE, following the tablets and Ugarit's destruction, instead of Britannica's 1450–1200 "golden age".
- **Arabic as the official language of the Palestinian Authority:** from the Basic Law of 2002, not 2003.
- **Sebastia:** now lists the Christian tradition (John the Baptist's burial place, with the Crusader church over the tomb).
- **Dead Sea levels:** 1900 and 1932 are now ranges (−392 to −389 m; −390.5 to −389 m), because independent series differ by a few metres.

Not downgraded: the Dead Sea readings for 1990–2026 are dated measurements from the Israel Water Authority's official series. A dated reading from an official measurement dataset now counts as documented on its own, as place names already did; the validator was changed accordingly.

Gaps:
- The 2024 counts of asylum seekers and foreign workers rest on one official table; the Population Authority, UNHCR and OECD sites blocked automated access.
- Some second sources for migration figures draw on the same Israeli statistics, so they are separate compilations rather than separate counts.

### Second sources for single-source claims: events and conflicts (round I1)

All 46 events and conflicts marked "documented" on a single source now have an independent second source: 146 quotes, 49 new works. No rating had to be lowered.
- **Crusader period:** the Wisconsin *History of the Crusades*, including Cate on the Crusade of 1101.
- **Holy Sepulchre (1048) and Atsiz:** TDV, Le Strange and the *Catholic Encyclopedia*.
- **Mount Tabor (1799):** Berthier's *Relation* and J. H. Rose.
- **Ancient events:** Honor and Montgomery (Eltekeh; the Samaritan revolt).
- **First World War:** the British official histories and Liman von Sanders, the German general who commanded the Ottoman army group.
- **Modern events:**
  - Twenty contemporary JTA reports and FRUS 1949.
  - The EU election observers' 2005 report.
  - UN statements, Peace Now and Zochrot.
  - Arab and international press: Al Jazeera, Arab News, Masrawy, RFE/RL, CBC, NPR/AP.

**Balancing sides:**
- Records that had only a Palestinian source gained Israeli or Western ones: Land Day, Karameh, October 2000, May 2021, al-Dawayima.
- Records that had only Western or Israeli sources gained Arab ones: the Khartoum summit, the War of Attrition, the Arab Peace Initiative.
- Israel's reactions are now quoted for the ICJ order, the ICC warrants and General Assembly resolution ES-10/24.

Changes:
- **Day dates:**
  - Montgisard: 25 November 1177.
  - La Forbie: 17 October 1244. The note now names the forces on each side.
  - The Biltmore Program: 11 May 1942.
- **Mount Tabor (1799):** the outcome is now sourced instead of "general knowledge". The sources differ by a day (15 or 16 April).
- **Holy Sepulchre:** notes record that one account names Michael IV instead of Constantine IX, and that the destruction is dated 1009 or 1010.
- **Other dates added to notes:** Romani (night of 3/4 August 1916), the Third Battle of Gaza, the War of Attrition (Egyptian dates 8 March 1968 – 8 August 1970), the PLO vice-presidency (26 April 2025), and the Samaritan revolt (484, Montgomery).
- **Notes rewritten:** notes that called a record "single-source" or "Palestinian source only" now name the sources.
- **A JTA article from May 2021 is cited but not linked:** its web address contains a casualty figure.

Gaps:
- No Israeli archival account of al-Dawayima was opened. The 89th Battalion's role rests on PalQuest alone.
- No Israeli government source for May 2021: the official sites blocked automated access.
- No Ottoman account of Mount Tabor was found.
- The day of the 1101 battle of Ramla is not verified.
- The end date of Operation Defensive Shield still rests on Wikidata.
- The second source for resolution 43/177 is the UN's own text.

### Validator: official counts

A population figure or refugee count whose sources are all official publications counts as documented on its own. That covers a census, a government statistical table, or UNRWA's register of refugees in its annual report. The figure is the publisher's own count, so a second source would only repeat it. This removes 31 warnings, mostly CBS, PCBS and Mandate census tables and UNRWA's 1951 and 2021 figures. Bachi's adjusted census figures (excluding the armed forces) are not official counts and are still flagged.
- Another 25 works appeared twice in the bibliography under different ids, left by separate research passes. Examples: the same Britannica article, the same treaty text on the Avalon Project, the Mitchell Report, the JPS Tanakh. Each pair is now one entry, keeping the fuller details and both verification notes. The Cassius Dio entry that covers books 68 and 69 now links to LacusCurtius's index of the whole work, since some of its citations are to book 68.
- The 1949 armistice line layer (OpenStreetMap geometry) now also cites the Israel–Jordan General Armistice Agreement itself (Arts. IV and V), which defines the line.
- 17 more works now carry an ISBN or a library catalogue link, found by matching title, author, year and publisher in Open Library. The catalogue links point to HathiTrust records, never to a copy of the work. For chapters, the ISBN or record is that of the containing volume. Four candidate ISBNs were rejected because they belong to later reprints of books first published before ISBNs existed: Baron 1952, Daniel-Rops 1962, Joseph 1960 and Runciman 1954.
- Arabic and Hebrew drafts: recurring scholars' names are now spelled one way throughout (47 texts). Examples: H. A. R. Gibb جب in Arabic, which some drafts had written غيب ("unseen"); Le Strange; Avi-Yonah; Finkelstein. "Britannica" left in Latin letters is now in Arabic or Hebrew script. The translation brief now lists these forms.
- Lebanon's map colour changed from light cyan to pear (still avoiding the colours of its flag). In the legend the light cyan was hard to tell apart from Jordan's cyan.

### The missing side for contested population estimates (round J3)

The nine contested population estimates from 1880 to 1966 had cited demographers from only one side. Each now also cites the other side, with a note setting the figures side by side; no figures were changed.
- **Israeli demographers** for the Ottoman-period estimates (1881–1914) and Gaza in 1958:
  - Bachi (1977): his c. 1890 figure built partly on the 1880 estimate; his 1914 estimate based on the official Ottoman total of 689,275; his Jewish figure of 94,000 against Barron's 84,660.
  - DellaPergola (2001).
  - Grossman, as reviewed by Meir.
- **Palestinian and Arab scholars** for 1880, 1919 and Gaza in 1966:
  - Yousef Kamel Ibrahim (Al-Aqsa University, 2009), who calls the 19th-century estimates contradictory, and gives 694,000 for 1918, from Musa Samha.
  - Hagopian and Zahlan (*Journal of Palestine Studies*, 1974).
  - Courbage on PalQuest.
  - A 2022 study for the Palestinian NGO Network that sets the Egyptian 1966 figure beside the Israeli 1967 count.

DellaPergola's paper is now coded by its author's institution (Hebrew University), like other sources.

Gaps: an Institute for Palestine Studies article on West Bank and Gaza population, and Janet Abu-Lughod's 1971 chapter, could not be opened. No open Israeli study discusses the 1881–93 Ottoman census itself.

### The missing side for contested modern records (rounds J1 and J2)

A check found 39 of the 55 contested records from 1880 onwards citing sources from only one side (or neither). After rounds J1–J3, each now also cites the side that was missing. New notes set out each position with attribution; no dates or figures were changed. 115 source references, 39 new works.
- **Israeli sources added:**
  - The Kahan Commission report (for Sabra and Shatila; it replaces a note that said the report could not be opened).
  - Foreign Ministry documents: Peres on Qana (1996) and on Jenin (2002), the 1947–74 documents volume on the refugees, the ministry's history page on 1929.
  - Israel's statements to the Mitchell Committee.
  - Israel's letters to the UN Security Council: 7 October 2023; the Golan, December 2024.
  - Prime Minister's Office statements on Palestinian statehood (2024) and on the Golan buffer zone (2024–25).
  - Ben-Gurion's 1955 Knesset statement on Nasser.
  - The IDF History Department's journal (Plan Dalet).
  - JCPA and the Meir Amit Intelligence and Terrorism Information Center.
  - Israeli press: Ynet, Israel Hayom, the Jerusalem Post.
- **Palestinian sources added:**
  - The PLO Negotiations Affairs Department: borders; the February 2026 West Bank decisions; Gaza after November 2025.
  - Al-Haq on Gaza.
  - PalQuest and Walid Khalidi on 1947–48.
  - Hanan Ashrawi on the term "Jewish refugees".
- **Lebanese, Syrian and other Arab sources added:**
  - Lebanon: the joint statement of President Aoun, Speaker Berri and Prime Minister Salam (18 February 2025) calling any continued Israeli presence an occupation; An-Nahar on Qana.
  - Syria: SANA on the Golan buffer zone and the 1974 agreement.
  - Al Jazeera on the departure of Iraq's Jews.

**Points recorded side by side:**
- Israel's official refugee figures ("some 500,000" for 1947–49; "some 250,000" for 1967).
- Israel's UN letter of December 2024 saying it remains committed to the 1974 framework, beside the earlier report that Israel called the agreement void.
- Haniyeh's 2006 commission dated 21 February (ITIC) or 22 February (PalQuest).
- The share of Area C (58% after 1999, per PalQuest; over 60% today, per OCHA).

Gaps:
- No Israeli government statement on the 2018–19 Great March of Return could be opened (gov.il blocks automated access); the Israeli side comes from ITIC.
- Lorch's history of the 1948 war was seen only as quoted.
- No Palestinian institutional paper on "Jewish refugees from Arab countries" was found.

### Population estimates for 640–1517 (round K2)

The chart had only eight records for these nine centuries. Fifteen published estimates have been added, each as the scholar or eyewitness gives it, with no interpolation:
- **Jerusalem:**
  - About 24,000–25,000 in the 10th century (Arar 2004).
  - At least 20,000 in 1047 (Nasir-i Khusraw's "twenty thousand men", recorded as a lower bound).
  - 10,000 around 1200 (Russell).
  - About 2,000 in 1267, of whom 300 Christians and two Jewish households (Nahmanides).
  - 40,000 after 1260 (Arar) against about 20,000 in the 14th century (Lutfi, as quoted in TDV) and about 10,000 for the Mamluk period (Tomar, TDV).
  - 10,000 with 1,000 Christians in 1483 (Bachi), and Felix Fabri's "more than five hundred Jews and more than a thousand Christians" (1483).
- **Acre:** 5,625 around 1200 (Russell) against 30,000 in the Crusader period (Benvenisti), recorded as contested.
- **Jews in the Crusader period:**
  - 1,693–8,465 around 1163 (Arar's reading of Benjamin of Tudela).
  - In Jerusalem around 1170, 200 or 4 depending on the manuscript of Benjamin of Tudela.
- **Shares by religion, the earliest on the site before the Ottoman registers:**
  - Hitti's statement that Greek Orthodox Christians were about half the population on the eve of the Crusades, recorded as contested with the scholars who dispute it.
  - Arar's estimate for Mamluk Palestine: Muslims 70–80%, Christians 20–30%, Jews under 5%.

New group: Greek Orthodox Christians, a sub-group of Christians. New area: the city of Acre.

**Sources:** Shafiq Arar's Birzeit thesis on the population of Mamluk Palestine (2004); Hitti; Russell; Bachi; Benvenisti; Prawer; the TDV İslâm Ansiklopedisi; and public-domain translations of Nasir-i Khusraw, Benjamin of Tudela, Nahmanides, Felix Fabri, Meshullam of Volterra and Obadiah of Bertinoro.

**Validator:** a record may now give shares by group without a total (as Arar's does). It is then an estimate, not "unknown".

Gaps:
- No open source gives country-wide figures for the early Islamic period, or numbers for the pace of conversion to Islam. The scholarly debate is summarised in the notes.
- Prawer's and Kedar's Crusader totals, and the Mamluk studies by Ashtor, Drory and Little, could not be opened.
- City figures for Gaza, Hebron, Ascalon, Tiberias, Jaffa and Caesarea (Russell, Benvenisti) are not yet added.

### Population estimates for the Iron Age to 640 CE (round K1)

Twenty-two published estimates, each recorded as given, with no interpolation:
- **Iron Age by region:** Judah about 110,000; the inland regions of the northern kingdom west of the Jordan about 205,500; the Philistine cities about 50,000. These figures are Broshi and Finkelstein's (1992), seen as reported by Siquans and others; the article itself is still unread. Lipschits gives about 110,000 for late Iron Age Judah. Geva gives Jerusalem about 2,000 in the 10th century, 8,000 in the late 8th century, and 6,000 between 701 and 586 BCE.
- **Babylonian and Persian periods:** Judah about 40,000 (Lipschits). Jerusalem at most 3,000 or about 1,500 (Lipschits) against about 15,000 (Weinberg).
- **Hellenistic and Hasmonean:**
  - The three toparchies (highland parts) about 15,000, Judea with the toparchies "almost 60,000", and Judea under Simeon "over 100,000" (Finkelstein 2018).
  - Jerusalem about 8,000 (Geva).
- **Roman:**
  - Judea and Samaria 552,427 (Applebaum).
  - Judea 700,000–900,000 (Kloner).
  - The Land of Judea 500,000–650,000 (Raviv and Ben David 2021).
  - Jerusalem in 70 CE about 20,000 (Geva).
- **Byzantine:**
  - Palestine about 2 million (Bar 2005).
  - Jerusalem about 15,000 (Geva).
  - The Samaritan writer Tsedaka's 1.2 million Samaritans, recorded as contested against Pummer's "tens or even hundreds of thousands".
- **Corrections:**
  - Lipschits's Yehud figure is now dated to the mid-5th century BCE, as he states (p. 372), instead of spanning the whole Persian period.
  - The 8th-century record now gives Broshi and Finkelstein's regional breakdown.

Eight new areas define the territories these scholars counted, from Philistia to "the Land of Israel from Syria to Egypt".

Gaps:
- No published estimate by an Arab or Palestinian scholar was found for these periods.
- No open numerical breakdown by religion exists for the Byzantine period: Tsafrir, Dauphin, Di Segni and Avi-Yonah could not be opened.
- The figures for Gilead, Ammon, Moab and Edom from Broshi and Finkelstein are still missing.
