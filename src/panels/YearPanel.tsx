import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { activeAt, depthAt, happeningAt, relationsAt, stepYearsAt, type AppData, type Extent, type Polity, type PopulationPoint } from '../data/model';
import { nearestFigures, panelSeries } from '../data/population';
import { loc, resolve } from '../i18n/localize';
import { useStore } from '../state/store';
import { formatDate, intlLocale, type Lang } from '../time/format';
import { endT, startT } from '../time/years';
import { formatRange } from './format';
import { SourceButton } from './Sources';
import { Badge } from './Badge';
import { PerspectiveCard } from './Perspectives';
import { LocText } from './LocText';
import { deadSeaLevelAt, levelValue, seaLevelAt } from '../data/landscape';

interface Row {
  owner: string;
  isCulture: boolean;
  name: string;
  draft: boolean;
  color: string;
  depth: number;
  relation?: string;
  extents: Extent[];
  record: { start: Extent['start']; end?: Extent['start']; sources: Extent['sources'] };
}

/** How far around the selected date to list events. */
function eventWindow(t: number): number {
  if (t < -1000) return 50;
  if (t < 1500) return 15;
  if (t < 1900) return 3;
  return 1;
}

/** A list joined the way the reader's language joins lists (Arabic uses "،" and "و"). */
const listOf = (items: string[], lang: Lang) => new Intl.ListFormat(intlLocale(lang), { style: 'narrow', type: 'conjunction' }).format(items);

function PopulationFigure({ p, lang, areaName }: { p: PopulationPoint; lang: Lang; areaName: string }) {
  const { t } = useTranslation();
  return (
    <li className={`pop-fig conf-${p.confidence}`}>
      <span className="pop-num">{formatRange(p.total, lang)}</span>
      <span className="pop-meta">
        {formatDate(p.date, lang)}
        {p.date_note ? ` (${p.date_note})` : ''} · {areaName} <Badge confidence={p.confidence} />
      </span>
      <SourceButton refs={p.sources} title={`${t('panel.population')}, ${formatDate(p.date, lang)}`} />
    </li>
  );
}

export function YearPanel({ data }: { data: AppData }) {
  const { t: tr } = useTranslation();
  const { t, lang, setChart } = useStore();
  const unitNames = useMemo(() => new Map(data.units.map((u) => [u.id, u.name])), [data]);
  const areaNames = useMemo(() => new Map(data.areas.map((a) => [a.id, a.name])), [data]);
  const groupNames = useMemo(() => new Map(data.groups.map((g) => [`${g.axis}:${g.id}`, g.name])), [data]);
  const polities = useMemo(() => new Map<string, Polity>(data.polities.map((p) => [p.id, p])), [data]);

  const rows = useMemo<Row[]>(() => {
    const cultures = new Map(data.cultures.map((c) => [c.id, c]));
    const byOwner = new Map<string, Extent[]>();
    for (const e of data.extents) {
      if (!activeAt(e, t)) continue;
      byOwner.set(e.owner, [...(byOwner.get(e.owner) ?? []), e]);
    }
    const out: Row[] = [];
    for (const [owner, all] of byOwner) {
      // Newest slice first: consecutive slices share their boundary year, and the map shows the newest.
      const extents = [...all].sort((a, b) => startT(b.start) - startT(a.start));
      const pol = polities.get(owner);
      const rec = pol ?? cultures.get(owner);
      if (!rec) continue;
      const nm = resolve(rec.name, lang);
      let relation: string | undefined;
      if (pol) {
        const r = relationsAt(pol, t)[0];
        const over = r ? polities.get(r.overlord) : undefined;
        if (r && over) relation = tr(`relation.${r.type}`, { overlord: resolve(over.name, lang).text });
      }
      out.push({ owner, isCulture: !pol, name: nm.text, draft: nm.draft, color: rec.color, depth: pol ? depthAt(owner, polities, t) : 0, relation, extents, record: rec });
    }
    out.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name, lang));
    return out;
  }, [data, t, lang, tr, polities]);

  const rulers = useMemo(() => data.rulers.filter((r) => activeAt(r, t)), [data, t]);
  const conflicts = useMemo(() => data.conflicts.filter((c) => happeningAt(c, t, stepYearsAt(data, t)) && !c.parent), [data, t]);
  const events = useMemo(() => {
    const w = eventWindow(t);
    return data.events
      .filter((e) => {
        const a = startT(e.date);
        const b = e.end ? endT(e.end) : a + 1;
        return b >= t - w && a <= t + w;
      })
      .sort((a, b) => (a.importance ?? 3) - (b.importance ?? 3) || Math.abs(startT(a.date) - t) - Math.abs(startT(b.date) - t))
      .slice(0, 8);
  }, [data, t]);
  const migrations = useMemo(
    () =>
      data.migrations.filter((m) => {
        const a = startT(m.start);
        const b = m.end ? endT(m.end) : a + 1;
        return t >= a - 1e-9 && t < b;
      }),
    [data, t],
  );
  const languages = useMemo(
    () =>
      data.languages
        .map((l) => ({ l, periods: l.periods.filter((p) => activeAt(p, t)) }))
        .filter((x) => x.periods.length > 0),
    [data, t],
  );
  const { layers: shownLayers, modernOff } = useStore();
  const modern = useMemo(
    () =>
      shownLayers.includes('modern')
        ? (data.modernLayers ?? []).filter((m) => !modernOff.includes(m.id) && t >= m.t0 - 1e-9 && (m.t1 === null || t < m.t1))
        : [],
    [data, t, shownLayers, modernOff],
  );
  const perspectives = useMemo(() => data.perspectives.filter((p) => p._t0 !== undefined && t >= p._t0 - 2 && t <= (p._t1 ?? p._t0) + 2), [data, t]);
  const population = useMemo(
    () => panelSeries(data, t).map((s) => ({ ...s, near: nearestFigures(data, s.areas, t, s.key) })),
    [data, t],
  );

  const renderRow = (r: Row) => {
    const ext = r.extents[0]!;
    const disputed = (ext.contested_units ?? []).map((u) => loc(unitNames.get(u), lang) || u);
    return (
      <li key={r.owner} style={{ paddingInlineStart: `${r.depth * 14}px` }}>
        <span className={`swatch cert-${ext.boundary_certainty}`} style={{ background: r.color }} aria-hidden />
        <div className="row-text">
          <span className="row-name">
            {r.name}
            {r.draft && (
              <span className="draft-mark" title={tr('draftNotice')}>
                *
              </span>
            )}
          </span>
          {r.relation && <span className="row-rel">{r.relation}</span>}
          {ext.extent_type === 'claim' && <span className="row-rel">{tr('onMap.claim')}</span>}
          {disputed.length > 0 && <span className="row-rel">{tr('onMap.disputedUnits', { units: listOf(disputed, lang) })}</span>}
          <span className="row-meta">
            {formatDate(r.record.start, lang)} – {r.record.end ? formatDate(r.record.end, lang) : ''} · {tr(`certainty.${ext.boundary_certainty}`)} <Badge confidence={ext.confidence} />{' '}
            <SourceButton refs={[...r.record.sources, ...ext.sources]} title={r.name} />
          </span>
        </div>
      </li>
    );
  };

  const polityRows = rows.filter((r) => !r.isCulture);
  const cultureRows = rows.filter((r) => r.isCulture);

  return (
    <aside className="side-panel" aria-labelledby="onmap-title" data-testid="year-panel">
      <h2 id="onmap-title">{tr('onMap.title')}</h2>
      {rows.length === 0 && (
        <p className="empty" data-testid="onmap-empty">
          {tr('onMap.empty')}
        </p>
      )}
      {polityRows.length > 0 && (
        <section aria-labelledby="sec-polities">
          <h3 id="sec-polities" className="panel-sub">
            {tr('panel.whoRuled')}
          </h3>
          <ul className="onmap-list" data-testid="onmap-list">
            {polityRows.map(renderRow)}
          </ul>
        </section>
      )}
      {cultureRows.length > 0 && (
        <section aria-labelledby="sec-cultures">
          <h3 id="sec-cultures" className="panel-sub">
            {tr('panel.cultures')}
          </h3>
          <ul className="onmap-list" data-testid="onmap-cultures">
            {cultureRows.map(renderRow)}
          </ul>
        </section>
      )}

      {rulers.length > 0 && (
        <section aria-labelledby="sec-rulers">
          <h3 id="sec-rulers" className="panel-sub">
            {tr('panel.rulers')}
          </h3>
          <ul className="plain-list">
            {rulers.map((r) => (
              <li key={r.id}>
                <strong>{loc(r.name, lang)}</strong>
                {r.office ? ` — ${loc(r.office, lang)}` : ''} ({formatDate(r.start, lang)}–{r.end ? formatDate(r.end, lang) : ''}) <Badge confidence={r.confidence} />{' '}
                <SourceButton refs={r.sources} title={loc(r.name, lang)} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="sec-pop" data-testid="panel-population">
        <h3 id="sec-pop" className="panel-sub">
          {tr('panel.population')}
        </h3>
        {population.every((s) => !s.near.before.length && !s.near.after.length) ? (
          <p className="empty">{tr('panel.populationEmpty')}</p>
        ) : (
          population.map((s) => {
            const name = s.key === 'core' ? tr('chart.core') : loc(areaNames.get(s.key), lang);
            const figs = [...s.near.before.map((p) => ({ p, when: 'before' as const })), ...s.near.after.map((p) => ({ p, when: 'after' as const }))];
            const comp = [...s.near.before, ...s.near.after].find((p) => p.composition?.length);
            return (
              <div key={s.key} className="pop-block">
                <p className="pop-area">{name}</p>
                {(['before', 'after'] as const).map((when) => {
                  const list = figs.filter((f) => f.when === when).slice(0, 4);
                  if (!list.length) return null;
                  return (
                    <div key={when}>
                      <p className="pop-when">{tr(when === 'before' ? 'panel.earlier' : 'panel.later')}</p>
                      <ul className="plain-list">
                        {list.map(({ p }) => (
                          <PopulationFigure key={p.id} p={p} lang={lang} areaName={loc(areaNames.get(p.area), lang)} />
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {comp?.composition?.[0] && (
                  <div className="composition">
                    <p className="pop-meta">
                      {tr('panel.composition')} ({formatDate(comp.date, lang)}){comp.composition[0].partial ? ` — ${tr('panel.partial')}` : ''}
                    </p>
                    <ul className="plain-list">
                      {comp.composition[0].groups.map((g) => (
                        <li key={g.group}>
                          <span className="swatch" style={{ background: data.groupColors[`${comp.composition![0]!.axis}:${g.group}`] }} aria-hidden />{' '}
                          {loc(groupNames.get(`${comp.composition![0]!.axis}:${g.group}`), lang) || g.group}: {g.count ? formatRange(g.count, lang) : formatRange(g.share_pct, lang, '%')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
        <p className="fine">{tr('panel.nearestNote')}</p>
        <button type="button" className="link-btn" onClick={() => setChart({ chartOpen: true })}>
          {tr('panel.openChart')}
        </button>
      </section>

      {languages.length > 0 && (
        <section aria-labelledby="sec-lang">
          <h3 id="sec-lang" className="panel-sub">
            {tr('panel.languages')}
          </h3>
          <ul className="plain-list">
            {languages.map(({ l, periods }) => (
              <li key={l.id}>
                <strong>{loc(l.name, lang)}</strong>: {listOf(periods.map((p) => tr(`langRole.${p.role}`, { defaultValue: p.role })), lang)}
                {periods[0]?.speakers ? ` — ${loc(periods[0].speakers, lang)}` : ''}{' '}
                <SourceButton refs={periods.flatMap((p) => p.sources)} title={loc(l.name, lang)} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(seaLevelAt(data, t) || deadSeaLevelAt(data, t)) && (
        <section aria-labelledby="sec-land">
          <h3 id="sec-land" className="panel-sub">
            {tr('landscape.title')}
          </h3>
          <ul className="plain-list">
            {[
              { p: seaLevelAt(data, t), key: 'landscape.seaLevel' },
              { p: deadSeaLevelAt(data, t), key: 'landscape.deadSea' },
            ].map(({ p, key }) =>
              p ? (
                <li key={key}>
                  {tr(key, { level: formatRange({ low: p.level_m.low, high: p.level_m.high, best: p.level_m.best }, lang) || levelValue(p) })} ({formatDate(p.date, lang)}){' '}
                  {key === 'landscape.deadSea' && (levelValue(p) ?? 0) <= -412 ? `— ${tr('landscape.deadSeaModern')} ` : ''}
                  <Badge confidence={p.confidence} /> <SourceButton refs={p.sources} title={tr(key, { level: levelValue(p) })} compact />
                </li>
              ) : null,
            )}
          </ul>
          <p className="fine">{tr('landscape.model')}</p>
        </section>
      )}

      {modern.length > 0 && (
        <section aria-labelledby="sec-modern" data-testid="panel-modern">
          <h3 id="sec-modern" className="panel-sub">
            {tr('modern.title')}
          </h3>
          <ul className="plain-list modern-list">
            {modern.map((m) => (
              <li key={m.id}>
                <strong>{loc(m.name, lang)}</strong> <Badge confidence={m.confidence} /> <SourceButton refs={m.sources} title={loc(m.name, lang)} compact />
                {m.class_styles && (
                  <ul className="plain-list modern-classes">
                    {Object.entries(m.class_styles).map(([c, st]) => (
                      <li key={c}>
                        <span className={`legend-line kind-${m.kind}`} style={{ borderColor: st.color ?? m.color, background: m.kind === 'line' ? undefined : st.color ?? m.color, borderStyle: st.dash ? 'dashed' : 'solid' }} aria-hidden />{' '}
                        {loc(st.label, lang)}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="fine">
                  {tr('modern.meta', { publisher: m.publisher, license: m.license, asOf: formatDate(m.as_of, lang) })}
                </p>
                {m.notes && <p className="fine"><LocText text={m.notes} lang={lang} /></p>}
                <details className="fine">
                  <summary>{tr('modern.method')}</summary>
                  <p>{loc(m.method, lang)}</p>
                  <p>{m.attribution}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      {migrations.length > 0 && (
        <section aria-labelledby="sec-mig">
          <h3 id="sec-mig" className="panel-sub">
            {tr('panel.migrations')}
          </h3>
          <ul className="plain-list">
            {migrations.map((m) => (
              <li key={m.id}>
                <strong>{loc(m.name, lang)}</strong> — {loc(m.group, lang)} · {m.types.map((ty) => tr(`migType.${ty}`, { defaultValue: ty })).join(' / ')}
                {m.numbers ? ` · ${formatRange(m.numbers, lang)}` : ` · ${tr('confidence.unknown')}`} <Badge confidence={m.confidence} />{' '}
                <SourceButton refs={m.sources} title={loc(m.name, lang)} compact />
                {m.contested_note && <span className="fine"> {loc(m.contested_note, lang)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {conflicts.length > 0 && (
        <section aria-labelledby="sec-conf">
          <h3 id="sec-conf" className="panel-sub">
            {tr('panel.conflicts')}
          </h3>
          <ul className="plain-list">
            {conflicts.map((c) => (
              <li key={c.id}>
                <strong>{loc(c.name, lang)}</strong>
                {c.alt_names?.length ? <span className="alt-names"> ({c.alt_names.map((a) => `${loc(a.text, lang)} — ${a.used_by}`).join('; ')})</span> : null} ({formatDate(c.start, lang)}–
                {c.end ? formatDate(c.end, lang) : ''}) <Badge confidence={c.confidence} /> <SourceButton refs={c.sources} title={loc(c.name, lang)} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      {perspectives.length > 0 && (
        <section aria-labelledby="sec-persp" data-testid="panel-perspectives">
          <h3 id="sec-persp" className="panel-sub">
            {tr('persp.inPanel')}
          </h3>
          {perspectives.map((p) => (
            <details key={p.id} className="persp-details">
              <summary>{loc(p.title, lang)}</summary>
              <PerspectiveCard p={p} />
            </details>
          ))}
        </section>
      )}

      {events.length > 0 && (
        <section aria-labelledby="sec-events">
          <h3 id="sec-events" className="panel-sub">
            {tr('panel.events')}
          </h3>
          <ul className="plain-list events">
            {events.map((e) => (
              <li key={e.id}>
                <span className="ev-date">{formatDate(e.date, lang)}</span> <strong>{loc(e.name, lang)}</strong>
                {e.description ? <span className="ev-desc"> — {loc(e.description, lang)}</span> : null} <Badge confidence={e.confidence} />{' '}
                <SourceButton refs={e.sources} title={loc(e.name, lang)} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="legend">
        <summary>{tr('legend.title')}</summary>
        <ul>
          <li>
            <span className="legend-key cert-surveyed" aria-hidden /> {tr('legend.surveyed')}
          </li>
          <li>
            <span className="legend-key cert-approximate" aria-hidden /> {tr('legend.approximate')}
          </li>
          <li>
            <span className="legend-key cert-schematic" aria-hidden /> {tr('legend.schematic')}
          </li>
          <li>
            <span className="legend-key cert-contested" aria-hidden /> {tr('legend.contested')}
          </li>
          <li>
            <span className="legend-key partial" aria-hidden /> {tr('legend.partial')}
          </li>
          <li>
            <span className="legend-key overlord" aria-hidden /> {tr('legend.overlord')}
          </li>
          <li>
            <span className="legend-key claim" aria-hidden /> {tr('legend.claim')}
          </li>
          <li>
            <span className="legend-key shoreline" aria-hidden /> {tr('legend.shoreline')}
          </li>
          <li>
            <span className="legend-key former" aria-hidden /> {tr('legend.former')}
          </li>
        </ul>
      </details>
    </aside>
  );
}
