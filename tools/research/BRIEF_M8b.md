# Milestone 8 brief: scholarly sources for records that rest only on encyclopaedias

The project (an educational, neutral history map of Israel/Palestine) has records whose only sources are
reference works (mostly Encyclopaedia Britannica). Your job: for the records listed for your period in
`m8_targets2.txt` (lines under your group heading), find scholarly sources that support (or correct)
each record's dates and description, and write a patch file. Do NOT edit anything under <project>.

## Priorities
1. polities.json and territory records first (they drive the map), then events, then rulers.
2. Prefer sources a reader can open: open-access journals and repositories (e.g. Mamluk Studies Review, Encyclopaedia Iranica,
   TDV İslâm Ansiklopedisi, Bryn Mawr Classical Review, Persée, OpenEdition, 'Atiqot / IAA reports, university repositories,
   Cambridge/OUP open-access chapters), primary texts in reliable editions (Perseus, LacusCurtius, Livius, Avalon), and
   public-domain scholarly works on archive.org/HathiTrust (say in the verification note when a work is dated, e.g. 19th century).
3. Balance: where the history is contested (e.g. Jewish revolts, the Islamic conquest, the Crusades), include scholars from
   different traditions (Israeli, Arab/Palestinian, Western, Turkish) where you can.

## Rules (hard)
- Cite only what you actually opened. Record verification honestly: full-text, excerpt (only a part/preview seen),
  catalogue-only (only bibliographic data seen — never the sole support of a fact), cited-via (seen quoted in another work; give `via`).
- Verbatim quotes under 40 words, checked against the text you downloaded. Never quote from a model summary.
- No Wikipedia citations (you may use it to find sources). No sub-agents. No Claude in Chrome / browser tools.
- Modest web searching: a shared search budget is limited; prefer direct fetches of known URLs.
- If a scholarly source contradicts a record's date or claim, propose a change (do not silently adopt it), quoting both.
- Save your output file after every 10 records so nothing is lost. Finish within this session; list gaps rather than continuing indefinitely.

## Output: research/m8-<group>.json
{
  "sources": [ {full source entries in the project format: id (lowercase-kebab), type, authors, title, container, publisher, year,
               url, doi/isbn if any, accessed: "2026-10-19", verification: {level, note}, kind: "academic"|"reference"|..., institution_country} ],
  "patches": [
    { "file": "polities.json" | "<territory file>.geojson" | "events.json" | "rulers.json",
      "id": "<record id from m8_targets.txt>",
      "add_sources": [ {"ref": "<source id>", "locator": "page/section", "quote": "verbatim < 40 words", "via": "optional"} ],
      "proposed_change": null | { "field": "start" | "end" | "confidence" | "notes" | ..., "from": ..., "to": ..., "why": "one or two sentences", "sources": [refs as above] } }
  ],
  "gaps": [ "record ids you could not source, and why" ]
}
Check the file with `python3 -I -m json.tool`. Finish with a short report: counts, main sources, proposed changes, gaps.

## Additional notes for this round
- The target list is `m8_targets2.txt` in the scratchpad (not under research/).
- For the Ottoman and Mandate periods, include Palestinian and Arab scholarship (e.g. the Institute for Palestine Studies / Jerusalem Quarterly, Beshara Doumani, Rashid Khalidi, Butrus Abu-Manneh), Israeli scholarship (e.g. Yehoshua Ben-Arieh, Gideon Biger, Haim Gerber, the Yad Ben-Zvi Cathedra journal) and Turkish and Western work, where open access.
- For the Bronze and Iron Ages, keep the textual tradition (the Bible) and archaeology apart: for a biblical king or event, cite both the text and the archaeological or epigraphic evidence (or its absence), and mark the basis.
- If a record already has a scholarly source but it is classed "reference", do not count it; the targets are records whose every source is a reference work.
