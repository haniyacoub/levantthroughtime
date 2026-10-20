import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData, LanguageRecord, People, PeopleLink } from '../data/model';
import { isRtl } from '../i18n';
import { loc } from '../i18n/localize';
import { useStore } from '../state/store';
import type { EraScale } from '../time/eraScale';
import { formatDate } from '../time/format';
import { endT, startT } from '../time/years';
import { Badge } from './Badge';
import { LocText } from './LocText';
import { SourceButton } from './Sources';

const TOP = 36;
const MIN_W = 760;

/** Line styles by link type: what a people continued as, merged into, migrated to… */
const STYLE: Record<PeopleLink['type'], { dash?: string; color: string }> = {
  'continued-as': { color: '#3b5b78' },
  'split-into': { color: '#3b5b78' },
  'merged-into': { color: '#7a5c99' },
  'assimilated-into': { color: '#7a5c99', dash: '6 3' },
  'contributed-to': { color: '#4f8a6b', dash: '2 3' },
  'converted-to': { color: '#a0662f', dash: '8 3 2 3' },
  'migrated-to': { color: '#8a6d3b', dash: '1 3' },
};

const KIND_FILL: Record<People['kind'], string> = {
  people: '#c8b273',
  'religious-community': '#88b5a8',
  'tribal-confederation': '#b9a8c9',
  community: '#c9c0b0',
};

/** Colours for religions and language families that have no group colour of their own (colour-blind-safe, no flag colours). */
const EXTRA = ['#c8b273', '#9ab0c9', '#c9a3b6', '#a8c39a', '#d6b48a', '#b9a8c9', '#8fc1b5', '#cdbb94', '#b3b3b3', '#d0a7a0'];
const hashColour = (key: string) => {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return EXTRA[Math.abs(h) % EXTRA.length]!;
};
/** The broad family of a language ("Semitic (Northwest, Canaanite)" → "Semitic: Canaanite"). */
const familyKey = (fam: string | undefined) => {
  if (!fam) return '?';
  const m = /^([^(]+)\(([^)]*)\)/.exec(fam);
  if (!m) return fam.trim();
  const inner = m[2]!.split(',').map((x) => x.trim());
  return `${m[1]!.trim()}${inner.length ? `: ${inner[inner.length - 1]}` : ''}`;
};

type ColourBy = 'kind' | 'religion' | 'language';
interface Segment {
  t0: number;
  t1: number;
  colour: string;
  key: string;
  label: string;
}

function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(1000);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => e && setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Shortest paths along the links, forwards (descendants) or backwards (ancestors). */
function trace(start: string, links: PeopleLink[], dir: 'down' | 'up'): Map<string, PeopleLink[]> {
  const out = new Map<string, PeopleLink[]>();
  const queue: { id: string; path: PeopleLink[] }[] = [{ id: start, path: [] }];
  const seen = new Set([start]);
  // Within each step, prefer links the sources agree on over contested ones.
  const ordered = [...links].sort((a, b) => Number(a.confidence === 'contested') - Number(b.confidence === 'contested'));
  while (queue.length) {
    const { id, path } = queue.shift()!;
    for (const l of ordered) {
      if (!l.to || l.type === 'migrated-to') continue;
      const next = dir === 'down' ? (l.from === id ? l.to : null) : l.to === id ? l.from : null;
      if (!next || seen.has(next)) continue;
      seen.add(next);
      const p = [...path, l];
      out.set(next, p);
      queue.push({ id: next, path: p });
    }
  }
  return out;
}

/** The peoples of the land through time: who they were, what they became, where they went. */
export function PeoplesPage({ data, scale }: { data: AppData; scale: EraScale }) {
  const { t: tr } = useTranslation();
  const { lang, setView, setT } = useStore();
  const rtl = isRtl(lang);
  const [selected, setSelected] = useState<string | null>(() => {
    const m = typeof window === 'undefined' ? null : /^#\/peoples\/([a-z0-9-]+)$/.exec(window.location.hash);
    return m ? m[1]! : null;
  });
  const [query, setQuery] = useState('');
  const [colourBy, setColourBy] = useState<ColourBy>('kind');
  const wrap = useRef<HTMLDivElement>(null);
  const boxW = useWidth(wrap) - 2;
  // On phones the names sit just above each bar (no name column), so names and bars scroll together.
  const compact = boxW < 700;
  const W = compact ? Math.max(600, boxW) : Math.max(MIN_W, boxW);
  const LABEL_W = compact ? 8 : W > 1100 ? 270 : 210;
  const ROW = compact ? 36 : 28;
  const BAND = compact ? 12 : 15;
  const OFF = compact ? 6 : 0;
  const labelChars = Math.floor((LABEL_W - 14) / 7);
  const [hover, setHover] = useState<string | null>(null);
  const asOfT = endT(data.config.timeline.as_of);

  const rows = useMemo(
    () => [...data.peoples].sort((a, b) => startT(a.attested.start) - startT(b.attested.start) || a.id.localeCompare(b.id)),
    [data],
  );
  const rowOf = useMemo(() => new Map(rows.map((p, i) => [p.id, i])), [rows]);
  const byId = useMemo(() => new Map(data.peoples.map((p) => [p.id, p])), [data]);
  const langById = useMemo(() => new Map(data.languages.map((l) => [l.id, l])), [data]);
  const name = (id: string | null | undefined) => (id ? loc(byId.get(id)?.name, lang) || id : '');

  const q = query.trim().toLowerCase();
  const matches = (p: People) =>
    !q || [loc(p.name, lang), p.name.en, ...(p.also_known_as ?? [])].some((s) => (s ?? '').toLowerCase().includes(q));

  // Mostly even years (so the Bronze Age is not squeezed), blended with the site's era scale (so the
  // short modern periods stay visible).
  const t0 = rows.length ? Math.min(...rows.map((p) => startT(p.attested.start))) : 0;
  const p0 = scale.tToPos(t0);
  const p1 = scale.tToPos(asOfT);
  const plotW = W - LABEL_W - 16;
  const frac = (tt: number) => {
    const c = Math.min(asOfT, Math.max(t0, tt));
    const lin = (c - t0) / Math.max(1e-9, asOfT - t0);
    const era = (scale.tToPos(c) - p0) / Math.max(1e-9, p1 - p0);
    return 0.72 * lin + 0.28 * era;
  };
  const xOf = (tt: number) => (rtl ? W - LABEL_W - frac(tt) * plotW : LABEL_W + frac(tt) * plotW);
  const yOf = (id: string) => TOP + (rowOf.get(id) ?? 0) * ROW + ROW / 2 + OFF;
  const H = TOP + rows.length * ROW + 12;
  const short = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

  // Era boundaries as vertical lines; names only where there is room for them.
  const eraTicks = useMemo(() => {
    const out: { id: string; x: number; label: string | null }[] = [];
    let lastLabelX = -Infinity;
    scale.segments.forEach((seg, i) => {
      if (seg.t1 <= t0 || seg.t0 >= asOfT) return;
      const x = xOf(Math.max(seg.t0, t0));
      const room = Math.abs(x - lastLabelX) > 100;
      const era = data.eras[i];
      out.push({ id: seg.id, x, label: room && era ? loc(era.label, lang) : null });
      if (room) lastLabelX = x;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, data, t0, asOfT, lang, rtl, W]);

  // The coloured pieces of each bar: by kind of people, by religion, or by language family, over the periods the sources give.
  const segmentsOf = (p: People): Segment[] => {
    const a = startT(p.attested.start);
    const b = p.attested.end ? endT(p.attested.end) : asOfT;
    if (colourBy === 'kind') return [{ t0: a, t1: b, colour: KIND_FILL[p.kind], key: p.kind, label: tr(`peoples.kind.${p.kind}`) }];
    const items =
      colourBy === 'religion'
        ? (p.religions ?? []).map((r) => {
            const label = loc(r.label, lang);
            const key = r.group ? `religion:${r.group}` : `r:${r.label.en}`;
            return { start: r.start, end: r.end, key, label, colour: (r.group && data.groupColors[`religion:${r.group}`]) || hashColour(key) };
          })
        : (p.languages ?? []).map((l) => {
            const rec = langById.get(l.language);
            const fam = familyKey(rec?.family);
            return { start: l.start, end: l.end, key: `f:${fam}`, label: fam, colour: hashColour(`f:${fam}`) };
          });
    if (!items.length) return [{ t0: a, t1: b, colour: '#e4e0d8', key: 'none', label: tr('peoples.notRecorded') }];
    return items.map((it) => ({
      t0: Math.max(a, it.start ? startT(it.start) : a),
      t1: Math.min(b, it.end ? endT(it.end) : b),
      colour: it.colour,
      key: it.key,
      label: it.label,
    }));
  };
  const legend = (() => {
    const seen = new Map<string, { colour: string; label: string }>();
    for (const p of rows) for (const s of segmentsOf(p)) if (!seen.has(s.key)) seen.set(s.key, { colour: s.colour, label: s.label });
    return [...seen.values()];
  })();

  const sel = selected ? byId.get(selected) : undefined;
  const side = useRef<HTMLElement>(null);
  const choose = (id: string | null) => {
    setSelected(id);
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', id ? `#/peoples/${id}` : '#/peoples');
    // On narrow screens the details sit below the diagram: bring them into view.
    if (id && window.matchMedia('(max-width: 1000px)').matches) requestAnimationFrame(() => side.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };
  useEffect(() => {
    if (selected && !byId.has(selected)) setSelected(null);
  }, [selected, byId]);
  // Follow the address when it changes (back button, an edited or shared link).
  useEffect(() => {
    const onHash = () => {
      const m = /^#\/peoples(?:\/([a-z0-9-]+))?$/.exec(window.location.hash);
      if (m) setSelected(m[1] && byId.has(m[1]) ? m[1] : null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [byId]);
  const showOnMap = (tt: number) => {
    setT(scale.floor(Math.max(scale.tMin, Math.min(scale.tMax, tt))));
    setView('map');
  };

  const howTo = (
    <ul className="peoples-howto-list">
      <li>{tr('peoples.howBars')}</li>
      <li>{tr('peoples.howLinks')}</li>
      <li>{tr('peoples.howContested')}</li>
      <li>{tr('peoples.howEvidence')}</li>
      <li>{tr('peoples.howClick')}</li>
    </ul>
  );

  return (
    <main className="page peoples-page" aria-labelledby="peoples-title" data-testid="peoples-page">
      <button type="button" className="link-btn" onClick={() => setView('map')}>
        ← {tr('nav.backToMap')}
      </button>
      <h1 id="peoples-title">{tr('peoples.title')}</h1>
      <p className="peoples-intro">{tr('peoples.intro')}</p>
      <p className="fine">
        {tr('peoples.indigenousNote')}{' '}
        <button type="button" className="link-btn" onClick={() => setView('perspectives')}>
          {tr('nav.perspectives')}
        </button>
      </p>
      {rows.length === 0 ? (
        <p className="empty">{tr('peoples.none')}</p>
      ) : (
        <div className="peoples-layout">
          <div className="peoples-main">
            <details className="peoples-howto narrow-only">
              <summary>{tr('peoples.howTo')}</summary>
              {howTo}
            </details>
            <div className="peoples-controls">
              <label>
                <span className="visually-hidden">{tr('peoples.search')}</span>
                <input type="search" value={query} placeholder={tr('peoples.search')} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    const first = rows.find(matches);
                    if (e.key === 'Enter' && q && first) choose(first.id);
                  }}
                  data-testid="peoples-search"
                />
              </label>
              <div className="seg" role="group" aria-label={tr('peoples.colourBy')}>
                <span className="seg-label">{tr('peoples.colourBy')}:</span>
                {(['kind', 'religion', 'language'] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={colourBy === c} onClick={() => setColourBy(c)} data-testid={`peoples-colour-${c}`}>
                    {tr(`peoples.colour.${c}`)}
                  </button>
                ))}
              </div>
            </div>
            <ul className="chart-legend peoples-legend" aria-label={tr('peoples.colourBy')}>
              {legend.map((l) => (
                <li key={l.label}>
                  <span className="swatch" style={{ background: l.colour }} aria-hidden /> {l.label}
                </li>
              ))}
            </ul>
            <ul className="chart-legend peoples-legend" aria-label={tr('peoples.legend')}>
              {(Object.keys(STYLE) as PeopleLink['type'][]).map((k) => (
                <li key={k}>
                  <svg width="28" height="10" aria-hidden>
                    <line x1="1" y1="5" x2="27" y2="5" stroke={STYLE[k].color} strokeWidth="2.5" strokeDasharray={STYLE[k].dash} />
                  </svg>{' '}
                  {tr(`peoples.type.${k}`)}
                </li>
              ))}
            </ul>
            <div className="peoples-scroll" ref={wrap}>
              <svg width={W} height={H} role="img" aria-label={tr('peoples.diagramLabel')} className="peoples-diagram" direction="ltr" style={{ direction: 'ltr' }}>
                <defs>
                  {(Object.keys(STYLE) as PeopleLink['type'][]).map((k) => (
                    <marker key={k} id={`arrow-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                      <path d="M0,0 L8,4 L0,8 z" fill={STYLE[k].color} />
                    </marker>
                  ))}
                </defs>
                {eraTicks.map((e) => (
                  <g key={e.id}>
                    <line x1={e.x} x2={e.x} y1={TOP - 6} y2={H} stroke="#e4ded2" />
                    {e.label && (
                      <text x={e.x + (rtl ? -3 : 3)} y={TOP - 14} fontSize="11" fill="#6b6457" textAnchor={rtl ? 'end' : 'start'}>
                        {short(e.label, 18)}
                      </text>
                    )}
                  </g>
                ))}
                {rows.map((p) => {
                  const y = yOf(p.id);
                  const on = p.id === selected;
                  const dim = !matches(p);
                  return (
                    <g
                      key={p.id}
                      className="people-row"
                      onClick={() => choose(p.id)}
                      onMouseEnter={() => setHover(p.id)}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: 'pointer' }}
                      opacity={dim ? 0.2 : 1}
                    >
                      <rect x={0} y={y - OFF - ROW / 2} width={W} height={ROW} fill={on ? '#f1ebdd' : hover === p.id ? '#f7f2e7' : 'transparent'} />
                      {segmentsOf(p).map((s, i) => {
                        const xa = xOf(s.t0);
                        const xb = xOf(s.t1);
                        return (
                          <rect key={i} x={Math.min(xa, xb)} y={y - BAND / 2} width={Math.max(3, Math.abs(xb - xa))} height={BAND} rx="3" fill={s.colour}>
                            <title>{`${loc(p.name, lang)} · ${s.label}`}</title>
                          </rect>
                        );
                      })}
                      <rect
                        x={Math.min(xOf(startT(p.attested.start)), xOf(p.attested.end ? endT(p.attested.end) : asOfT))}
                        y={y - BAND / 2}
                        width={Math.max(3, Math.abs(xOf(p.attested.end ? endT(p.attested.end) : asOfT) - xOf(startT(p.attested.start))))}
                        height={BAND}
                        rx="3"
                        fill="none"
                        stroke={on ? '#1d2a36' : p.confidence === 'contested' ? '#9a4a2a' : 'none'}
                        strokeWidth={on ? 2 : 1}
                        strokeDasharray={p.confidence === 'contested' && !on ? '3 2' : undefined}
                      >
                        <title>{`${loc(p.name, lang)} · ${formatDate(p.attested.start, lang)} – ${p.attested.end ? formatDate(p.attested.end, lang) : tr('peoples.today')}`}</title>
                      </rect>
                      {compact ? (
                        (() => {
                          const xs = xOf(startT(p.attested.start));
                          const xe = xOf(p.attested.end ? endT(p.attested.end) : asOfT);
                          // Start the name at the bar's start, or end it at the bar's end when the bar starts late.
                          const late = rtl ? xs < W * 0.38 : xs > W * 0.62;
                          const anchor = rtl === late ? 'start' : 'end';
                          return (
                            <text x={late ? xe : xs} y={y - BAND / 2 - 3} fontSize="11.5" textAnchor={anchor === 'start' ? 'start' : 'end'} fontWeight={on ? 700 : 400} fill="#1d2a36">
                              {short(loc(p.name, lang), Math.max(12, Math.floor((late ? Math.abs(xe - (rtl ? W : 0)) : rtl ? xs : W - xs) / 6.4)))}
                            </text>
                          );
                        })()
                      ) : (
                        <text x={rtl ? W - 8 : 8} y={y + 4} fontSize="12.5" textAnchor={rtl ? 'end' : 'start'} fontWeight={on ? 700 : 400} fill="#1d2a36">
                          {short(loc(p.name, lang), labelChars)}
                          <title>{loc(p.name, lang)}</title>
                        </text>
                      )}
                    </g>
                  );
                })}
                {data.peopleLinks.map((l) => {
                  if (!rowOf.has(l.from)) return null;
                  const st = STYLE[l.type];
                  // Draw from within the source's bar, even when the link is dated a little before it is first named.
                  const fromP = byId.get(l.from)!;
                  const fs = startT(fromP.attested.start);
                  const fe = fromP.attested.end ? endT(fromP.attested.end) : asOfT;
                  const x = xOf(Math.min(fe, Math.max(fs, startT(l.start))));
                  const y1 = yOf(l.from);
                  const focus = hover ?? selected;
                  const hot = !!focus && (l.from === focus || l.to === focus);
                  const common = {
                    stroke: st.color,
                    strokeWidth: hot ? 2.8 : 1.6,
                    strokeDasharray: st.dash,
                    fill: 'none',
                    opacity: hot ? 1 : focus ? 0.12 : l.confidence === 'contested' ? 0.4 : 0.55,
                    markerEnd: `url(#arrow-${l.type})`,
                    onClick: () => choose(l.from),
                    style: { cursor: 'pointer' },
                  };
                  const tip = `${name(l.from)} ${tr(`peoples.type.${l.type}`)} ${l.to ? name(l.to) : loc(l.destination?.label, lang)} (${formatDate(l.start, lang)})`;
                  if (l.to && rowOf.has(l.to)) {
                    const y2 = yOf(l.to);
                    const dir = rtl ? -1 : 1;
                    // Land the arrow on the target's bar, even when the link is dated before the target is first named.
                    const target = byId.get(l.to)!;
                    const xt = xOf(startT(target.attested.start));
                    const x2 = dir * (xt - x) > 36 ? xt : x + dir * 36;
                    const mid = (x + x2) / 2;
                    return (
                      <path key={l.id} d={`M${x},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`} {...common}>
                        <title>{tip}</title>
                      </path>
                    );
                  }
                  const dx = (rtl ? -1 : 1) * 34;
                  return (
                    <g key={l.id}>
                      <path d={`M${x},${y1} L${x + dx},${y1 - 9}`} {...common}>
                        <title>{tip}</title>
                      </path>
                      {hot && (
                        <text x={x + dx + (rtl ? -3 : 3)} y={y1 - 9} fontSize="10.5" fill={st.color} textAnchor={rtl ? 'end' : 'start'} className="dest-label">
                          {short(loc(l.destination?.label, lang).split(/[(:;,]/)[0]!.trim(), 34)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            <nav className="peoples-list" aria-label={tr('peoples.listLabel')}>
              {rows.filter(matches).map((p) => (
                <button key={p.id} type="button" className="chip" aria-pressed={p.id === selected} onClick={() => choose(p.id)}>
                  {loc(p.name, lang)}
                </button>
              ))}
            </nav>
          </div>
          <aside className="peoples-side" aria-live="polite" ref={side}>
            {sel ? (
              <>
                <button type="button" className="link-btn peoples-close" onClick={() => choose(null)}>
                  × {tr('peoples.close')}
                </button>
                <PeopleDetail data={data} p={sel} name={name} choose={choose} showOnMap={showOnMap} langById={langById} />
              </>
            ) : (
              <>
                <p className="peoples-select">{tr('peoples.select')}</p>
                <div className="wide-only">
                  <h2 className="panel-sub">{tr('peoples.howTo')}</h2>
                  {howTo}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function PeopleDetail({
  data,
  p,
  name,
  choose,
  showOnMap,
  langById,
}: {
  data: AppData;
  p: People;
  name: (id: string | null | undefined) => string;
  choose: (id: string | null) => void;
  showOnMap: (t: number) => void;
  langById: Map<string, LanguageRecord>;
}) {
  const { t: tr } = useTranslation();
  const { lang } = useStore();
  const out = data.peopleLinks.filter((l) => l.from === p.id).sort((a, b) => startT(a.start) - startT(b.start));
  const inc = data.peopleLinks.filter((l) => l.to === p.id).sort((a, b) => startT(a.start) - startT(b.start));
  const title = loc(p.name, lang);
  const byId = new Map(data.peoples.map((x) => [x.id, x]));

  // Who this people leads to today, and where it comes from, along the sourced links.
  const down = trace(p.id, data.peopleLinks, 'down');
  const today = [...down.keys()].filter((id) => byId.get(id) && !byId.get(id)!.attested.end);
  const up = trace(p.id, data.peopleLinks, 'up');

  // Language descent: what each language came from and what continues it.
  const children = (id: string) => data.languages.filter((l) => l.lineage?.descends_from.includes(id));
  const langName = (id: string) => loc(langById.get(id)?.name, lang) || id;
  const modernLine = (id: string): string[] => {
    const out: string[] = [];
    const walk = (cur: string, chain: string[], depth: number) => {
      const kids = children(cur);
      if (!kids.length || depth > 5) {
        if (chain.length > 1) out.push(chain.map(langName).join(' → '));
        return;
      }
      for (const k of kids) walk(k.id, [...chain, k.id], depth + 1);
    };
    walk(id, [id], 0);
    return out;
  };

  const related = [
    ...(p.related?.polities ?? []).map((id) => ({ id, label: loc(data.polities.find((x) => x.id === id)?.name, lang), t: data.polities.find((x) => x.id === id)?.start })),
    ...(p.related?.migrations ?? []).map((id) => ({ id, label: loc(data.migrations.find((x) => x.id === id)?.name, lang), t: data.migrations.find((x) => x.id === id)?.start })),
  ].filter((r) => r.label);

  const linkItem = (l: PeopleLink, dir: 'out' | 'in') => (
    <li key={l.id} className="people-link">
      <p>
        {dir === 'out' ? (
          <>
            <strong>{tr(`peoples.type.${l.type}`)}</strong>{' '}
            {l.to ? (
              <button type="button" className="link-btn" onClick={() => choose(l.to!)}>
                {name(l.to)}
              </button>
            ) : (
              loc(l.destination?.label, lang)
            )}
          </>
        ) : (
          <>
            <button type="button" className="link-btn" onClick={() => choose(l.from)}>
              {name(l.from)}
            </button>{' '}
            <strong>{tr(`peoples.type.${l.type}`)}</strong> {title}
          </>
        )}{' '}
        · {formatDate(l.start, lang)}
        {l.end ? ` – ${formatDate(l.end, lang)}` : ''} <Badge confidence={l.confidence} />{' '}
        <SourceButton refs={l.sources} title={`${name(l.from)} → ${l.to ? name(l.to) : loc(l.destination?.label, lang)}`} compact />
      </p>
      <p className="fine">
        <LocText text={l.summary} lang={lang} /> · {tr('peoples.evidenceLabel')}: {l.evidence.map((e) => tr(`peoples.evidence.${e}`)).join(', ')}
      </p>
      {l.notes && (
        <p className="fine">
          <LocText text={l.notes} lang={lang} />
        </p>
      )}
    </li>
  );

  return (
    <article className="people-detail" aria-labelledby={`people-${p.id}`} data-testid={`people-${p.id}`}>
      <h2 id={`people-${p.id}`}>
        {title} <Badge confidence={p.confidence} />
      </h2>
      {p.also_known_as?.length ? <p className="fine">{p.also_known_as.join(' · ')}</p> : null}
      <p className="pop-meta">
        {tr(`peoples.kind.${p.kind}`)} · {tr('peoples.attested')}: {formatDate(p.attested.start, lang)} – {p.attested.end ? formatDate(p.attested.end, lang) : tr('peoples.today')}{' '}
        <SourceButton refs={p.sources} title={title} compact />
      </p>
      <p>
        <LocText text={p.summary} lang={lang} />
      </p>
      {p.homeland && (
        <p className="fine">
          {tr('peoples.homeland')}: <LocText text={p.homeland} lang={lang} />
        </p>
      )}
      <p className="fine">
        {tr('peoples.evidenceLabel')}: {p.basis.map((e) => tr(`peoples.evidence.${e}`)).join(', ')}
      </p>
      <button type="button" className="src-btn" onClick={() => showOnMap(startT(p.attested.start))}>
        {tr('peoples.showOnMap', { date: formatDate(p.attested.start, lang) })}
      </button>

      {(p.religions?.length ?? 0) > 0 && (
        <section>
          <h3 className="panel-sub">{tr('peoples.religions')}</h3>
          <ul className="plain-list">
            {p.religions!.map((r, i) => (
              <li key={i}>
                {loc(r.label, lang)}
                {r.start ? ` · ${formatDate(r.start, lang)}${r.end ? ` – ${formatDate(r.end, lang)}` : ''}` : ''} <Badge confidence={r.confidence} />{' '}
                <SourceButton refs={r.sources} title={`${title} — ${loc(r.label, lang)}`} compact />
              </li>
            ))}
          </ul>
        </section>
      )}
      {(p.languages?.length ?? 0) > 0 && (
        <section>
          <h3 className="panel-sub">{tr('peoples.languages')}</h3>
          <ul className="plain-list">
            {p.languages!.map((l, i) => {
              const rec = langById.get(l.language);
              const lines = modernLine(l.language);
              return (
                <li key={i}>
                  {langName(l.language)}
                  {l.start ? ` · ${formatDate(l.start, lang)}${l.end ? ` – ${formatDate(l.end, lang)}` : ''}` : ''} <Badge confidence={l.confidence} />{' '}
                  <SourceButton refs={l.sources} title={`${title} — ${langName(l.language)}`} compact />
                  {rec?.lineage && (
                    <p className="fine">
                      {tr('peoples.langFrom')}: {rec.lineage.descends_from.map(langName).join(', ')}{' '}
                      <SourceButton refs={rec.lineage.sources} title={`${langName(l.language)} — ${tr('peoples.langFrom')}`} compact />
                    </p>
                  )}
                  {lines.length > 0 && (
                    <p className="fine">
                      {tr('peoples.langToday')}: {lines.join('; ')}
                    </p>
                  )}
                  {l.note && (
                    <p className="fine">
                      <LocText text={l.note} lang={lang} />
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(down.size > 0 || up.size > 0) && (
        <section>
          <h3 className="panel-sub">{tr('peoples.lineage')}</h3>
          <p className="fine">{tr('peoples.lineageNote')}</p>
          {today.length > 0 && (
            <div className="lineage-today">
              <p className="pop-when">{tr('peoples.descendantsToday')}</p>
              <p>
                {today.map((id) => (
                  <button key={id} type="button" className="chip" onClick={() => choose(id)}>
                    {name(id)}
                  </button>
                ))}
              </p>
            </div>
          )}
          {up.size > 0 && (
            <>
              <p className="pop-when">{tr('peoples.ancestors')}</p>
              <LineageTree root={p.id} found={up} dir="up" name={name} choose={choose} byId={byId} />
            </>
          )}
          {down.size > 0 && (
            <>
              <p className="pop-when">{tr('peoples.descendants')}</p>
              <LineageTree root={p.id} found={down} dir="down" name={name} choose={choose} byId={byId} />
            </>
          )}
        </section>
      )}

      {inc.length > 0 && (
        <section>
          <h3 className="panel-sub">{tr('peoples.incoming')}</h3>
          <ul className="plain-list">{inc.map((l) => linkItem(l, 'in'))}</ul>
        </section>
      )}
      {out.length > 0 && (
        <section>
          <h3 className="panel-sub">{tr('peoples.outgoing')}</h3>
          <ul className="plain-list">{out.map((l) => linkItem(l, 'out'))}</ul>
        </section>
      )}
      {related.length > 0 && (
        <section>
          <h3 className="panel-sub">{tr('peoples.related')}</h3>
          <ul className="plain-list">
            {related.map((r) => (
              <li key={r.id}>
                {r.t ? (
                  <button type="button" className="link-btn" onClick={() => showOnMap(startT(r.t!))}>
                    {r.label}
                  </button>
                ) : (
                  r.label
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.notes && (
        <p className="fine">
          <LocText text={p.notes} lang={lang} />
        </p>
      )}
    </article>
  );
}

/** The chains found by trace(), drawn as a branching list: each group once, under the group it came from (or led to). */
function LineageTree({
  root,
  found,
  dir,
  name,
  choose,
  byId,
}: {
  root: string;
  found: Map<string, PeopleLink[]>;
  dir: 'down' | 'up';
  name: (id: string | null | undefined) => string;
  choose: (id: string | null) => void;
  byId: Map<string, People>;
}) {
  const { t: tr } = useTranslation();
  const kids = new Map<string, { id: string; link: PeopleLink }[]>();
  for (const [id, path] of found) {
    const link = path[path.length - 1]!;
    const parent = dir === 'down' ? link.from : link.to!;
    kids.set(parent, [...(kids.get(parent) ?? []), { id, link }]);
  }
  const branch = (id: string): React.ReactNode => {
    const list = kids.get(id);
    if (!list?.length) return null;
    return (
      <ul className="lineage-tree">
        {list.map(({ id: k, link }) => (
          <li key={k}>
            {dir === 'down' && <span className="lt-verb">{tr(`peoples.type.${link.type}`)} </span>}
            <button type="button" className="link-btn" onClick={() => choose(k)}>
              {name(k)}
            </button>
            {dir === 'up' && (
              <span className="lt-verb">
                {' '}
                {tr(`peoples.type.${link.type}`)} {name(link.to)}
              </span>
            )}
            {dir === 'down' && !byId.get(k)?.attested.end && <span className="lt-today">{tr('peoples.today')}</span>}
            {link.confidence === 'contested' && (
              <>
                {' '}
                <Badge confidence="contested" />
              </>
            )}
            {branch(k)}
          </li>
        ))}
      </ul>
    );
  };
  return <>{branch(root)}</>;
}
