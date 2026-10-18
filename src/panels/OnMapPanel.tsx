import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { activeAt, depthAt, relationsAt, type AppData, type Extent, type Polity } from '../data/model';
import { loc, resolve } from '../i18n/localize';
import { useStore } from '../state/store';
import { formatDate } from '../time/format';
import { startT } from '../time/years';

interface Row {
  owner: string;
  isCulture: boolean;
  name: string;
  draft: boolean;
  color: string;
  depth: number;
  relation?: string;
  extents: Extent[];
  start: Parameters<typeof formatDate>[0];
  end?: Parameters<typeof formatDate>[0];
}

export function OnMapPanel({ data }: { data: AppData }) {
  const { t: tr } = useTranslation();
  const { t, lang } = useStore();

  const rows = useMemo<Row[]>(() => {
    const polities = new Map<string, Polity>(data.polities.map((p) => [p.id, p]));
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
      out.push({
        owner,
        isCulture: !pol,
        name: nm.text,
        draft: nm.draft,
        color: rec.color,
        depth: pol ? depthAt(owner, polities, t) : 0,
        relation,
        extents,
        start: rec.start,
        end: rec.end,
      });
    }
    out.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name, lang));
    return out;
  }, [data, t, lang, tr]);

  const unitNames = useMemo(() => new Map(data.units.map((u) => [u.id, u.name])), [data]);
  const cultureRows = rows.filter((r) => r.isCulture);
  const polityRows = rows.filter((r) => !r.isCulture);

  const renderRow = (r: Row) => {
    const ext = r.extents[0]!;
    const certainty = ext.boundary_certainty;
    const confidence = ext.confidence;
    const disputed = (ext.contested_units ?? []).map((u) => loc(unitNames.get(u), lang) || u);
    return (
      <li key={r.owner} style={{ paddingInlineStart: `${r.depth * 14}px` }}>
        <span className={`swatch cert-${certainty}`} style={{ background: r.color }} aria-hidden />
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
          {disputed.length > 0 && <span className="row-rel">{tr('onMap.disputedUnits', { units: disputed.join(', ') })}</span>}
          <span className="row-meta">
            {formatDate(r.start, lang)}
            {' – '}
            {r.end ? formatDate(r.end, lang) : ''}
            {' · '}
            {tr(`certainty.${certainty}`)}
            {confidence !== 'documented' && (
              <>
                {' · '}
                <span className={`badge conf-${confidence}`}>{tr(`confidence.${confidence}`)}</span>
              </>
            )}
          </span>
        </div>
      </li>
    );
  };

  return (
    <aside className="side-panel" aria-labelledby="onmap-title">
      <h2 id="onmap-title">{tr('onMap.title')}</h2>
      {rows.length === 0 && (
        <p className="empty" data-testid="onmap-empty">
          {tr('onMap.empty')}
        </p>
      )}
      {polityRows.length > 0 && (
        <>
          <h3 className="panel-sub">{tr('onMap.political')}</h3>
          <ul className="onmap-list" data-testid="onmap-list">
            {polityRows.map(renderRow)}
          </ul>
        </>
      )}
      {cultureRows.length > 0 && (
        <>
          <h3 className="panel-sub">{tr('onMap.prehistoric')}</h3>
          <ul className="onmap-list" data-testid="onmap-cultures">
            {cultureRows.map(renderRow)}
          </ul>
        </>
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
        </ul>
      </details>
    </aside>
  );
}
