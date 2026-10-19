import { geoEqualEarth, geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { baseUrl, type AppData, type Diaspora } from '../data/model';
import { loc } from '../i18n/localize';
import { formatRange } from '../panels/format';
import { useStore } from '../state/store';
import { endT, startT } from '../time/years';
import { formatDate } from '../time/format';

const W = 260;
const H = 150;
/** The map area; flows with an end outside it are drawn on the inset. */
const REGION = { x0: 31.5, y0: 28, x1: 39, y1: 34.6 };
const inRegion = ([x, y]: [number, number]) => x >= REGION.x0 && x <= REGION.x1 && y >= REGION.y0 && y <= REGION.y1;

/**
 * A zoomed-out world map: where people went outside the region and where immigrants came from.
 * Shows the diaspora snapshot nearest to (and not after) the selected date for each group and place.
 */
export function DiasporaInset({ data }: { data: AppData }) {
  const { t: tr } = useTranslation();
  const { t, lang, openSources } = useStore();
  const [world, setWorld] = useState<FeatureCollection | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch(`${baseUrl()}data/basemap/world-land-110m.geojson`)
      .then((r) => r.json())
      .then(setWorld)
      .catch(() => setWorld(null));
  }, []);

  const projection = useMemo(() => geoEqualEarth().center([20, 25]).scale(52).translate([W / 2, H / 2]), []);
  const path = useMemo(() => geoPath(projection), [projection]);

  // Latest snapshot at or before t for each group + place (no interpolation).
  const snapshots = useMemo(() => {
    const best = new Map<string, Diaspora>();
    for (const d of data.diaspora) {
      if (startT(d.date) > t + 1e-9) continue;
      const key = `${d.group}|${d.location.label.en}`;
      const cur = best.get(key);
      if (!cur || startT(d.date) > startT(cur.date)) best.set(key, d);
    }
    return [...best.values()];
  }, [data, t]);

  const flows = useMemo(
    () =>
      data.migrations.filter((m) => {
        const a = startT(m.start);
        const b = m.end ? endT(m.end) : a + 1;
        return t >= a && t < b && m._from && m._to && (!inRegion(m._from) || !inRegion(m._to) || m._legs?.some(([x, y]) => !inRegion(x) || !inRegion(y)));
      }),
    [data, t],
  );

  // Regional totals with no single place are listed under the map.
  const totals = snapshots.filter((d) => !d.location.coords);
  if (!data.diaspora.length && !data.migrations.length) return null;
  // Nothing outside the region at this date: show only the toggle.
  const empty = snapshots.length === 0 && flows.length === 0;
  const maxN = Math.max(1, ...snapshots.map((d) => d.number.best ?? d.number.high ?? d.number.low ?? 0));

  return (
    <div className={`inset${open && !empty ? '' : ' closed'}`} data-testid="diaspora-inset">
      <button type="button" className="inset-toggle" aria-expanded={open && !empty} disabled={empty} title={empty ? tr('inset.empty') : undefined} onClick={() => setOpen(!open)}>
        {tr('inset.title')}
      </button>
      {open && !empty && (
        <svg width={W} height={H} role="img" aria-label={tr('inset.label')}>
          <rect width={W} height={H} fill="#dfe8ee" />
          {world && <path d={path(world) ?? ''} fill="#f1ede3" stroke="#c9c2b2" strokeWidth={0.4} />}
          {flows.flatMap((m) => {
            const legs = m._legs?.length ? m._legs : [[m._from!, m._to!] as [[number, number], [number, number]]];
            const color = m.direction === 'in' ? '#00796b' : m.direction === 'out' ? '#bf5b17' : '#6a3d9a';
            return legs.map(([from, to], i) => {
              const a = projection(from);
              const b = projection(to);
              if (!a || !b) return null;
              const mx = (a[0] + b[0]) / 2;
              const my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.25;
              return (
                <path key={`${m.id}#${i}`} d={`M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`} fill="none" stroke={color} strokeWidth={1.6} opacity={0.85}>
                  <title>{loc(m.name, lang)}</title>
                </path>
              );
            });
          })}
          {snapshots.map((d) => {
            if (!d.location.coords) return null;
            const p = projection(d.location.coords);
            if (!p) return null;
            const n = d.number.best ?? d.number.high ?? d.number.low ?? 0;
            const r = 2 + 12 * Math.sqrt(n / maxN);
            return (
              <g key={d.id} className="inset-pt" onClick={() => openSources({ title: `${loc(d.definition, lang)} — ${loc(d.location.label, lang)}`, refs: d.sources })}>
                <circle cx={p[0]} cy={p[1]} r={r} fill={d.group === 'jewish' ? '#AA3377' : d.group === 'palestinian' ? '#EE7733' : '#4477AA'} fillOpacity={0.55} stroke="#fff" strokeWidth={0.6} />
                <title>
                  {loc(d.location.label, lang)}: {formatRange(d.number, lang)} — {loc(d.definition, lang)} ({formatDate(d.date, lang)})
                </title>
              </g>
            );
          })}
          {/* region marker */}
          <rect x={projection([REGION.x0, REGION.y1])![0]} y={projection([REGION.x0, REGION.y1])![1]} width={8} height={8} fill="none" stroke="#333" strokeWidth={1} />
        </svg>
      )}
      {open && !empty && totals.length > 0 && (
        <ul className="inset-totals">
          {totals.map((d) => (
            <li key={d.id}>
              {loc(d.location.label, lang)}: {formatRange(d.number, lang)} ({formatDate(d.date, lang)}){' '}
              <button type="button" className="link-btn" onClick={() => openSources({ title: `${loc(d.definition, lang)} — ${loc(d.location.label, lang)}`, refs: d.sources })}>
                {tr('sources.button')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
