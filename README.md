# Southern Levant Through Time

An interactive, sourced history map of the southern Levant (the land that is today Israel and the Palestinian territories) from 10,000 BCE to today. Move the timeline and the map shows who controlled the land, with every claim linked to its source.

- The design and the reasons behind it are in [PLAN.md](PLAN.md).
- All historical content lives in [data/](data/). [data/README.md](data/README.md) explains how to read and correct it.

**What you can do on the site:**

- **Move through time** with the slider (keyboard: arrows, Page Up/Down for eras, Space to play). The slider gives more room to busy periods, and the ruler bands below it show who held the land.
- **Read the year panel:** who controlled the land, rulers, the nearest published population figures (never an in-between guess), languages, conflicts, events, and perspectives on contested topics.
- **Click any "sources" button** to see the full citation, page, quoted passage and how it was checked. Every source is listed on the **Bibliography** page.
- **Click a place** to see its names through time and, for holy sites, what it means to each tradition.
- **Switch layers** (top right of the map): territories, places, holy sites, conflicts, migrations, landscape (past coastlines, Dead Sea), trade routes, and modern lines and settlements.
- **Compare two dates** side by side or with a swipe handle, with presets for 1947, 1949, 1967 and today.
- **Take a guided tour** (Stories), or read the **Perspectives** and **About & method** pages.
- **Share a link:** the address bar always holds the date, language, layers, compare dates, open place and tour step.

---

## 1. One-time setup

You need two programs:

1. **Node.js** (version 22 or newer). Download the "LTS" installer from <https://nodejs.org> and run it. To check, open a terminal and type `node -v`.
2. **Git** (macOS: it's already installed if `git --version` prints a version).

Then, in a terminal, inside this folder:

```bash
npm install                # downloads the libraries the site uses (into node_modules/)
npm run build-basemap      # downloads the elevation tiles for the hillshade (~55 MB, once)
npx playwright install chromium   # only needed to run the browser tests
```

## 2. See the site on your computer

```bash
npm run dev
```

Open the address it prints (normally <http://localhost:5173>). The page reloads when you change code. **After editing a data file, stop the server (Ctrl+C) and run `npm run dev` again**, so the data is re-checked and rebuilt.

## 3. Check and correct the data

Every fact is in a JSON file under `data/`. To change one:

1. Open the file in a text editor (VS Code recommended: it autocompletes fields and flags mistakes as you type, using the schemas in `schema/`).
2. Make the change, including the source (see [data/README.md](data/README.md)).
3. Run the checker:

   ```bash
   npm run validate-data
   ```

   It prints `✓ No errors` or a list of problems in plain language, each with the file and record, e.g.
   `data/polities.json › id "hasmonean-kingdom": Ends (63 BCE) before it starts (140 BCE)`.

   To also list *warnings* (things a reviewer should look at, such as claims resting on one source):

   ```bash
   npm run validate-data -- --warnings
   ```

The site refuses to build while the data has errors, so a broken file can never reach the public site.

## 4. Review reports

```bash
npm run review             # writes data/REVIEW.md: source balance by era, contested items, weak sources
```

`data/REVIEW.md` is the checklist for historians and translators. `data/CHANGELOG.md` records every decision taken when data was imported.

## 5. Arabic and Hebrew

All interface text is in `src/i18n/locales/` (`en.json`, `ar.json`, `he.json`). Data text has `ar` and `he` next to `en`, with a `translation_status` for each:

- `machine-draft`: drafted by machine, not yet checked. The site marks it with an asterisk and a notice.
- `reviewed`: checked by a fluent reviewer. To mark a text as reviewed, correct it if needed and change its status to `"reviewed"`.
- `original`: the text is the name itself, in its own language (e.g. a place name in Arabic or Hebrew).

`npm run review` counts how many texts are still drafts. Citation markers like `[1]` must stay exactly as in the English; the checker fails otherwise.

## 6. Stories and perspectives

- A guided tour is one file in `data/stories/`. Each step has a date, a short card and its sources; every sentence of a card must end with a citation marker `[n]` pointing into that step's `sources` list.
- `data/perspectives.json` holds the contested topics. Each topic has at least three accounts (Israeli, Palestinian, academic or international), each sentence cited the same way, and `about` lists the records the topic concerns, so it appears in the year panel at the right dates.

## 7. Rebuilding generated geography (rarely needed)

```bash
npm run build-basemap      # Natural Earth layers + elevation tiles
npm run build-landscape    # past coastlines and Dead Sea extents, modelled from the elevation tiles
```

## 8. Tests

```bash
npm test                   # fast unit tests (dates, timeline maths, every validator rule)
npm run build              # full production build (also re-checks the data)
npm run test:e2e           # opens the built site in a headless browser and clicks through it
npm run screenshots        # saves screenshots of key views to docs/screenshots/
```

## 9. Publish the site

The site is a set of static files, so it can be hosted for free. Nothing has been published yet; these are the steps for when you're ready.

### GitHub Pages (recommended)

1. Create an empty repository on <https://github.com> (public, so readers can file corrections).
2. In this folder:

   ```bash
   git remote add origin https://github.com/<your-user>/<repo-name>.git
   git push -u origin main
   ```

3. On GitHub, open the repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Every push now runs the checks in `.github/workflows/ci.yml`: validate the data, run the tests, build. Pushing does **not** publish anything.
5. To publish: open the **Actions** tab → **CI** → **Run workflow**, choose the `main` branch, tick **Deploy to GitHub Pages**, and press the green button. When it finishes, the site is at `https://<your-user>.github.io/<repo-name>/`. Repeat this whenever you want the public site updated.
6. Optional: to turn on the "Suggest a correction" links, add this line to `data/config.json`:
   `"corrections_url": "https://github.com/<your-user>/<repo-name>/issues/new"`

### Vercel (alternative)

Import the repository at <https://vercel.com/new>. Set the build command to `npm run build-basemap -- --tiles-only && npm run build` and the output directory to `dist`. No other settings are needed.

## 10. What's where

| Path | What it is |
|---|---|
| `data/` | All historical content (JSON / GeoJSON). Edit here. |
| `data/geo/units.json` | The schematic geographic regions that pre-modern territories are built from |
| `schema/` | Generated JSON Schema files (editor autocomplete). Don't edit by hand. |
| `scripts/` | Data checker, data build, basemap download |
| `src/` | The website code (React + TypeScript) |
| `tests/` | Unit tests and browser tests |
| `public/` | Static files. `public/data`, `public/tiles` and `public/fonts` are generated; don't edit them. |
| `data/stories/` | Guided tours |
| `data/modern/` | Modern map layers (1947 plan, 1949 lines, Oslo areas, barrier, settlements, Gaza lines) with `layers.json` describing each |
| `docs/screenshots/` | Screenshots from each milestone |

## 11. Credits and licences

- Elevation: SRTM, GMTED2010 and ETOPO1 (USGS, NOAA; US public domain), via AWS Terrain Tiles.
- Coastlines, rivers, lakes and reference outlines: Natural Earth (public domain).
- Fonts: Noto Sans, Noto Sans Arabic and Noto Sans Hebrew (SIL Open Font License), via Fontsource.
- Map rendering: MapLibre GL JS (BSD-3-Clause).
- Modern map layers: OpenStreetMap contributors (ODbL), OCHA oPt via the Humanitarian Data Exchange (CC BY), Israel Central Bureau of Statistics (data.gov.il), Peace Now via OCHA (CC BY-IGO), OpenHistoricalMap (CC0).
- Place names and coordinates: Wikidata (CC0) and Pleiades (CC BY).
- Historical sources: every source is listed with its citation in `data/sources.json` and on the site's **Bibliography** page.
- This project's own code: MIT ([LICENSE](LICENSE)). Its data: CC BY 4.0, with the exceptions listed in [DATA-LICENSE](DATA-LICENSE).
