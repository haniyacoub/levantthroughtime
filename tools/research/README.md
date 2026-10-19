# How the research passes reached `/data`

These are the one-off tools used to build the data, kept so reviewers can see exactly how each
research pass was turned into records. They are not part of the site build, and you don't need
them to correct data: edit the files in `/data` directly (see `data/README.md`).

| File | What it did |
|---|---|
| `BRIEF.md`, `BRIEF2.md`, `BRIEF_events_rulers.md`, `BRIEF_M8.md`, `BRIEF_M8b.md` | The written instructions every research pass followed: cite only what was opened, honest verification levels, no Wikipedia citations, balanced sources, no casualty figures. |
| `import_research.py` | Imported the first wave (polities, territories, population) into `/data`. |
| `import_more.py` | Imported the second wave (places, holy sites, languages, landscape, migrations, conflicts, events, rulers, perspectives, modern layers) and applied the Milestone 8 patch files. Every decision it takes (e.g. renaming a category, aligning a date, not linking an unauthorised copy) is also written up in `data/CHANGELOG.md`. |
| `stories.py` | Wrote the guided tours in `data/stories/`. Every quote it cites is either copied from a record already in `/data` or checked word for word against a downloaded copy of the source. |
| `i18n_extract.py`, `i18n_merge.py`, `i18n_check.py`, `I18N_BRIEF.md` | Drafted Arabic and Hebrew: extract untranslated texts, check that drafts sit under the right keys and keep their citation markers, merge them as `machine-draft`. |

Paths such as `<scratch>` stand for the temporary working folder used at the time; the downloaded
source texts are not included because many are copyrighted.
