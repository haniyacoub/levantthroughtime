# Milestone 8, round I brief: second sources for single-source "documented" claims

Follow every rule and the output format in `BRIEF_M8h.md` (same folder): honest verification levels, verbatim quotes under 40 words
checked by script, no Wikipedia citations, no browser tools, no sub-agents, no unauthorised copies linked, no local paths in notes,
no casualty figures, do not edit anything under <project>. Use accessed: "2026-10-20".

## The task
Each target in `m8i_targets.txt` (under your group heading) is a claim the project marks `"confidence": "documented"` but which
rests on a single source. "Documented" should mean at least two independent sources agree. For each target:
1. Read the record in <project>/data (the subpath, e.g. `relations[8]` or `periods[2]`, points inside it).
2. Find a second, independent source (a different author and institution; where the topic is contested, preferably from a
   different tradition: Israeli, Palestinian/Arab, Turkish, Western, international) that supports the same facts and dates.
   Re-using a source the project already has is fine if it is independent of the first and you quote the supporting passage.
3. If the second source disagrees, propose a change quoting both. If no second source can be found, propose
   `{"field": "confidence", "from": "documented", "to": "estimated", "why": "..."}` and list it under gaps.

## Patch format addition
For a claim inside a record, give `"subpath"` exactly as in the target list, e.g.
`{"file": "polities.json", "id": "jund-filastin", "subpath": "relations[8]", "add_sources": [...], "proposed_change": ...}`.
The patch then applies to that part of the record. Notes you append should be given as {"en": "..."} only; translations are done later.

Output: `<scratch>/research/m8-i<N>.json` (e.g. m8-i1.json). Finish with a short report: counts, main sources, proposed changes, gaps.
