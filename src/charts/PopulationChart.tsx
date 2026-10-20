import { scaleLinear, scaleLog } from 'd3-scale';
import { area as d3area, line as d3line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData, PopulationPoint } from '../data/model';
import { pointT, seriesAreas } from '../data/population';
import { isRtl } from '../i18n';
import { loc } from '../i18n/localize';
import { formatCompact, formatRange, plotValue } from '../panels/format';
import { SourceButton } from '../panels/Sources';
import { useStore } from '../state/store';
import type { EraScale } from '../time/eraScale';
import { formatDate } from '../time/format';
import { fromT } from '../time/years';

/** Chart height: tall enough to tell figures apart (phones get a little less). */
const H_WIDE = 230;
const H_PHONE = 190;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;
/** In "this period" view, room for the year axis at the bottom and the value labels at the side. */
const AXIS_H = 18;
const GUTTER = 40;
/** Points further apart than this (years) are not joined by lines or areas, so long gaps (e.g. across the 1947–49 war) are not drawn as smooth change. */
const MAX_GAP = 15;

type Axis = 'religion' | 'ethnicity' | 'population-group';
/** Synthetic layer: the part of the total that the source does not break down by group. */
const REST = '_rest';

/** Width of the element, re-measured whenever it appears (the chart starts hidden on small screens). */
function useWidth(ref: React.RefObject<HTMLElement | null>, visible: boolean): number {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 800 : Math.min(800, window.innerWidth - 32)));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => e && setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, visible]);
  return w;
}

export function PopulationChart({ data, scale }: { data: AppData; scale: EraScale }) {
  const { t: tr } = useTranslation();
  const { t, lang, chartOpen, chartMode, chartLog: logSetting, chartSeries, setChart, openSources } = useStore();
  // Stacked areas on a log axis misrepresent the parts, so only the total view can be logarithmic.
  const chartLog = logSetting && chartMode === 'total';
  const wrap = useRef<HTMLDivElement>(null);
  const W = useWidth(wrap, chartOpen);
  const rtl = isRtl(lang);
  const [hover, setHover] = useState<PopulationPoint | null>(null);
  const [showTable, setShowTable] = useState(false);
  // "all": aligned with the timeline above; "period": the current era and its neighbours, spread out on a year axis.
  const [zoom, setZoom] = useState<'all' | 'period'>(() => (typeof window !== 'undefined' && window.innerWidth < 760 ? 'period' : 'all'));
  const H = W < 600 ? H_PHONE : H_WIDE;
  const plotBottom = zoom === 'period' ? H - AXIS_H : H;
  const areaNames = useMemo(() => new Map(data.areas.map((a) => [a.id, a.name])), [data]);
  const groupNames = useMemo(() => new Map(data.groups.map((g) => [`${g.axis}:${g.id}`, g.name])), [data]);

  // Series offered: the comparable whole-country series, then every area with at least two figures.
  const seriesOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of data.population) if (p.total) counts.set(p.area, (counts.get(p.area) ?? 0) + 1);
    const coreAreas = new Set(seriesAreas(data, 'core'));
    const others = [...counts.entries()].filter(([a, n]) => n >= 2 && !coreAreas.has(a)).sort((a, b) => b[1] - a[1]);
    return [{ id: 'core', label: tr('chart.core') }, ...others.map(([id]) => ({ id, label: loc(areaNames.get(id), lang) || id }))];
  }, [data, areaNames, lang, tr]);

  const areas = useMemo(() => seriesAreas(data, chartSeries), [data, chartSeries]);
  const points = useMemo(
    () => data.population.filter((p) => areas.includes(p.area) && p.total).sort((a, b) => pointT(a) - pointT(b)),
    [data, areas],
  );

  // The window shown in "this period" view: the era of the selected date and the eras on either side.
  const win = useMemo(() => {
    const segs = scale.segments;
    const i = scale.segmentIndexAt(t);
    const a = segs[Math.max(0, i - 1)]!;
    const b = segs[Math.min(segs.length - 1, i + 1)]!;
    return { t0: a.t0, t1: b.t1 };
  }, [scale, t]);
  const xOf = (tt: number) => {
    if (zoom === 'period') {
      const f = (tt - win.t0) / Math.max(1e-9, win.t1 - win.t0);
      const x = GUTTER + f * (W - GUTTER - 6);
      return rtl ? W - x : x;
    }
    const p = scale.tToPos(tt);
    return (rtl ? 1 - p : p) * W;
  };
  const inView = (tt: number) => zoom === 'all' || (tt >= win.t0 - 1e-9 && tt <= win.t1 + 1e-9);

  // Composition: which axis has most data in this series.
  const axis: Axis = useMemo(() => {
    const n: Record<Axis, number> = { religion: 0, ethnicity: 0, 'population-group': 0 };
    for (const p of points) for (const c of p.composition ?? []) n[c.axis] += 1;
    return (Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] as Axis) ?? 'religion';
  }, [points]);

  const compPoints = useMemo(
    () =>
      points
        .map((p) => {
          const c = p.composition?.find((x) => x.axis === axis);
          const total = p.total ? plotValue(p.total)?.value : undefined;
          if (!c || !total) return null;
          const groups = c.groups
            .map((g) => {
              const v = g.count ? plotValue(g.count)?.value : g.share_pct ? ((plotValue(g.share_pct)?.value ?? 0) * total) / 100 : undefined;
              return v === undefined ? null : { group: g.group, value: v };
            })
            .filter((x): x is { group: string; value: number } => !!x);
          // When the source gives only some groups, the rest of the total is shown as "not broken down".
          const sum = groups.reduce((a, g) => a + g.value, 0);
          if (total - sum > total * 0.005) groups.push({ group: REST, value: total - sum });
          return { p, total, groups, partial: !!c.partial };
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    [points, axis],
  );
  const groupOrder = useMemo(() => {
    const seen: string[] = [];
    for (const cp of compPoints) for (const g of cp.groups) if (!seen.includes(g.group)) seen.push(g.group);
    // The remainder goes on top.
    return [...seen.filter((g) => g !== REST), ...(seen.includes(REST) ? [REST] : [])];
  }, [compPoints]);

  const yDomain = useMemo(() => {
    if (chartMode === 'share') return [0, 100] as [number, number];
    let lo = Infinity;
    let hi = 0;
    for (const p of points) {
      if (!inView(pointT(p))) continue;
      for (const v of [p.total!.low, p.total!.high, p.total!.best]) if (v != null) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    if (!Number.isFinite(lo)) return [1, 10] as [number, number];
    return chartLog ? ([Math.max(1, lo / 1.5), hi * 1.5] as [number, number]) : ([0, hi * 1.08] as [number, number]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, chartLog, chartMode, zoom, win]);

  const y = useMemo(() => {
    const range: [number, number] = [plotBottom - PAD_BOTTOM, PAD_TOP];
    return chartLog ? scaleLog().domain(yDomain).range(range).clamp(true) : scaleLinear().domain(yDomain).range(range).clamp(true);
  }, [yDomain, chartLog, chartMode, plotBottom]);

  // Lines join consecutive documented censuses / official counts only, within MAX_GAP years.
  const linePaths = useMemo(() => {
    const segs: { x: number; y: number }[][] = [];
    let cur: { x: number; y: number }[] = [];
    let last: PopulationPoint | null = null;
    for (const p of points) {
      const ok = p.confidence === 'documented' && ['census', 'official-estimate', 'registration'].includes(p.basis);
      const v = plotValue(p.total!);
      if (!ok || !v) continue;
      if (last && (pointT(p) - pointT(last) > MAX_GAP || last.area !== p.area)) {
        if (cur.length > 1) segs.push(cur);
        cur = [];
      }
      cur.push({ x: xOf(pointT(p)), y: y(v.value) });
      last = p;
    }
    if (cur.length > 1) segs.push(cur);
    const ln = d3line<{ x: number; y: number }>().x((d) => d.x).y((d) => d.y);
    return segs.map((s) => ln(s) ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, y, W, rtl, scale, zoom, win]);

  const stacks = useMemo(() => {
    if (chartMode === 'total') return [];
    // Break into runs of points no more than MAX_GAP years apart.
    const runs: (typeof compPoints)[] = [];
    let run: typeof compPoints = [];
    for (const cp of compPoints) {
      if (run.length && pointT(cp.p) - pointT(run[run.length - 1]!.p) > MAX_GAP) {
        runs.push(run);
        run = [];
      }
      run.push(cp);
    }
    if (run.length) runs.push(run);
    const out: { group: string; d: string }[] = [];
    for (const r of runs) {
      const rows = r.map((cp) => {
        const scaleBy = chartMode === 'share' ? 100 / cp.total : 1;
        let acc = 0;
        const bounds: Record<string, [number, number]> = {};
        for (const g of groupOrder) {
          const v = (cp.groups.find((x) => x.group === g)?.value ?? 0) * scaleBy;
          bounds[g] = [acc, acc + v];
          acc += v;
        }
        return { x: xOf(pointT(cp.p)), bounds };
      });
      for (const g of groupOrder) {
        const ar = d3area<(typeof rows)[number]>()
          .x((d) => d.x)
          .y0((d) => y(Math.max(0, d.bounds[g]![0])))
          .y1((d) => y(Math.max(0, d.bounds[g]![1])));
        // A single point is drawn as a thin bar so it stays visible.
        const pts = rows.length === 1 ? [{ ...rows[0]!, x: rows[0]!.x - 2 }, { ...rows[0]!, x: rows[0]!.x + 2 }] : rows;
        out.push({ group: g, d: ar(pts) ?? '' });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compPoints, groupOrder, chartMode, y, W, rtl, scale, chartLog, yDomain, zoom, win]);

  const ticks = chartMode === 'share' ? [0, 25, 50, 75, 100] : chartLog ? (y as ReturnType<typeof scaleLog>).ticks(4).filter((v) => /^[125]/.test(String(v))) : (y as ReturnType<typeof scaleLinear>).ticks(4);

  const yearTicks = zoom === 'period' ? scaleLinear().domain([win.t0, win.t1]).ticks(W < 600 ? 4 : 7) : [];

  if (!chartOpen) {
    return (
      <div className="chart-collapsed">
        <button type="button" className="link-btn" onClick={() => setChart({ chartOpen: true })}>
          {tr('chart.show')}
        </button>
      </div>
    );
  }

  const cursorX = xOf(t);

  return (
    <section className="pop-chart" aria-labelledby="pop-chart-title" data-testid="population-chart">
      <div className="chart-head">
        <h2 id="pop-chart-title">{tr('chart.title')}</h2>
        <label>
          <span className="visually-hidden">{tr('chart.series')}</span>
          <select value={chartSeries} onChange={(e) => setChart({ chartSeries: e.target.value })} data-testid="chart-series">
            {seriesOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="seg" role="group" aria-label={tr('chart.title')}>
          {(['total', 'composition', 'share'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={chartMode === m} onClick={() => setChart({ chartMode: m })}>
              {tr(`chart.${m}`)}
            </button>
          ))}
        </div>
        <label className="chk">
          <input type="checkbox" checked={chartLog} disabled={chartMode !== 'total'} onChange={(e) => setChart({ chartLog: e.target.checked })} /> {tr('chart.log')}
        </label>
        <div className="seg" role="group" aria-label={tr('chart.zoom')}>
          {(['all', 'period'] as const).map((z) => (
            <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)} data-testid={`chart-zoom-${z}`}>
              {tr(`chart.zoom_${z}`)}
            </button>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={() => setShowTable(!showTable)}>
          {showTable ? tr('chart.hideTable') : tr('chart.table')}
        </button>
        <button type="button" className="link-btn" onClick={() => setChart({ chartOpen: false })}>
          {tr('chart.hide')}
        </button>
      </div>
      <div className="chart-wrap" ref={wrap}>
        {points.length === 0 ? (
          <p className="empty">{tr('chart.noData')}</p>
        ) : (
          <svg width={W} height={H} role="img" aria-label={tr('chart.label')} onMouseLeave={() => setHover(null)}>
            <defs>
              <pattern id="hatch-pop" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="5" stroke="#555" strokeWidth="1.2" />
              </pattern>
            </defs>
            {ticks.map((v) => (
              <g key={v} className="tick">
                <line x1={zoom === 'period' && !rtl ? GUTTER : 0} x2={zoom === 'period' && rtl ? W - GUTTER : W} y1={y(v)} y2={y(v)} />
                <text x={zoom === 'period' ? (rtl ? W - GUTTER + 4 : GUTTER - 4) : rtl ? W - 2 : 2} y={zoom === 'period' ? y(v) + 4 : y(v) - 2} textAnchor={zoom === 'period' ? (rtl ? 'start' : 'end') : rtl ? 'end' : 'start'}>
                  {chartMode === 'share' ? `${v}%` : formatCompact(v, lang)}
                </text>
              </g>
            ))}
            {zoom === 'period' &&
              yearTicks.map((yt) => (
                <g key={yt} className="tick year-tick">
                  <line x1={xOf(yt)} x2={xOf(yt)} y1={PAD_TOP} y2={plotBottom} />
                  <text x={xOf(yt)} y={H - 4} textAnchor="middle">
                    {formatDate({ year: fromT(yt).year, precision: 'year' }, lang)}
                  </text>
                </g>
              ))}
            <clipPath id="pop-plot">
              <rect x={zoom === 'period' && !rtl ? GUTTER : 0} y={0} width={zoom === 'period' ? W - GUTTER : W} height={plotBottom} />
            </clipPath>
            <g clipPath="url(#pop-plot)">
            {stacks.map((s, i) => (
              <path key={`${s.group}-${i}`} d={s.d} fill={s.group === REST ? 'url(#hatch-pop)' : data.groupColors[`${axis}:${s.group}`] ?? '#bbb'} opacity={s.group === REST ? 0.45 : 0.75} />
            ))}
            {chartMode === 'total' &&
              linePaths.map((d, i) => <path key={i} d={d} className="pop-line" />)}
            {chartMode === 'total' &&
              points.map((p) => {
                if (!inView(pointT(p))) return null;
                const x = xOf(pointT(p));
                const tot = p.total!;
                const v = plotValue(tot);
                if (!v) return null;
                const yLo = tot.low !== null ? y(tot.low) : plotBottom - PAD_BOTTOM;
                const yHi = tot.high !== null ? y(tot.high) : PAD_TOP;
                const cy = y(v.value);
                const hollow = v.isMidpoint || p.confidence !== 'documented';
                return (
                  <g
                    key={p.id}
                    className={`pop-point conf-${p.confidence}`}
                    onMouseEnter={() => setHover(p)}
                    onClick={() => openSources({ title: `${tr('chart.title')} ${formatDate(p.date, lang)}`, refs: p.sources })}
                  >
                    {yLo - yHi > 1 && <line x1={x} x2={x} y1={yLo} y2={yHi} className="range" strokeDasharray={p.confidence === 'documented' ? undefined : '3 2'} />}
                    {p.confidence === 'contested' ? (
                      <rect x={x - 5} y={cy - 5} width={10} height={10} transform={`rotate(45 ${x} ${cy})`} fill="url(#hatch-pop)" stroke="#333" />
                    ) : (
                      <circle cx={x} cy={cy} r={4.5} fill={hollow ? '#fff' : '#3b5b78'} stroke="#3b5b78" strokeWidth={1.6} />
                    )}
                    <circle cx={x} cy={cy} r={9} fill="transparent" />
                  </g>
                );
              })}
            </g>
            <line className="chart-cursor" x1={cursorX} x2={cursorX} y1={0} y2={plotBottom} />
          </svg>
        )}
        {hover && (
          <div className="chart-tip" style={{ insetInlineStart: Math.min(W - 230, Math.max(0, rtl ? W - xOf(pointT(hover)) : xOf(pointT(hover)))) }}>
            <strong>{formatRange(hover.total, lang)}</strong>
            <br />
            {formatDate(hover.date, lang)} · {loc(areaNames.get(hover.area), lang)}
            <br />
            {tr(`confidence.${hover.confidence}`)} · {hover.basis}
          </div>
        )}
      </div>
      {chartMode !== 'total' && groupOrder.length > 0 && (
        <ul className="chart-legend">
          <li className="axis-label">{tr(axis === 'religion' ? 'chart.axisReligion' : axis === 'ethnicity' ? 'chart.axisEthnicity' : 'chart.axisPopulationGroup')}:</li>
          {groupOrder.map((g) => (
            <li key={g}>
              <span className="swatch" style={{ background: g === REST ? 'repeating-linear-gradient(45deg,#777 0 2px,#fff 2px 4px)' : data.groupColors[`${axis}:${g}`] }} aria-hidden />{' '}
              {g === REST ? tr('chart.rest') : loc(groupNames.get(`${axis}:${g}`), lang) || g}
            </li>
          ))}
        </ul>
      )}
      {chartMode !== 'total' && (
        <p className="fine" data-testid="chart-groups-note">
          {compPoints.length ? tr('chart.groupsFrom', { date: formatDate(compPoints[0]!.p.date, lang) }) : tr('chart.groupsNone')} {tr('chart.groupsWhy')}
        </p>
      )}
      {chartMode === 'total' && (
        <ul className="chart-legend">
          <li>
            <svg width="12" height="12" aria-hidden>
              <circle cx="6" cy="6" r="3.5" fill="#3b5b78" />
            </svg>{' '}
            {tr('chart.legendDocumented')}
          </li>
          <li>
            <svg width="12" height="12" aria-hidden>
              <circle cx="6" cy="6" r="3.5" fill="#fff" stroke="#3b5b78" />
            </svg>{' '}
            {tr('chart.legendEstimated')}
          </li>
          <li>
            <svg width="12" height="12" aria-hidden>
              <rect x="2" y="2" width="8" height="8" transform="rotate(45 6 6)" fill="#ccc" stroke="#333" />
            </svg>{' '}
            {tr('chart.legendContested')}
          </li>
          <li>{tr('chart.legendMidpoint')}</li>
        </ul>
      )}
      {showTable && (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{tr('chart.date')}</th>
              <th scope="col">{tr('panel.area')}</th>
              <th scope="col">{tr('chart.value')}</th>
              <th scope="col">{tr('chart.confidence')}</th>
              <th scope="col">{tr('sources.button')}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.date, lang)}</td>
                <td>{loc(areaNames.get(p.area), lang)}</td>
                <td>{formatRange(p.total, lang)}</td>
                <td>{tr(`confidence.${p.confidence}`)}</td>
                <td>
                  <SourceButton refs={p.sources} title={formatDate(p.date, lang)} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
