import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData, People, PeopleLink } from '../data/model';
import { isRtl } from '../i18n';
import { loc } from '../i18n/localize';
import { useStore } from '../state/store';
import type { EraScale } from '../time/eraScale';
import { formatDate } from '../time/format';
import { endT, startT } from '../time/years';
import { Badge } from './Badge';
import { LocText } from './LocText';
import { SourceButton } from './Sources';

const ROW = 26;
const BAND = 14;
const LABEL_W = 190;
const TOP = 34;

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

/** The peoples of the land through time: who they were, what they became, where they went. */
export function PeoplesPage({ data, scale }: { data: AppData; scale: EraScale }) {
  const { t: tr } = useTranslation();
  const { lang, setView, setT } = useStore();
  const rtl = isRtl(lang);
  const [selected, setSelected] = useState<string | null>(() => {
    const m = typeof window === 'undefined' ? null : /^#\/peoples\/([a-z0-9-]+)$/.exec(window.location.hash);
    return m ? m[1]! : null;
  });
  const asOfT = endT(data.config.timeline.as_of);

  const rows = useMemo(
    () => [...data.peoples].sort((a, b) => startT(a.attested.start) - startT(b.attested.start) || a.id.localeCompare(b.id)),
    [data],
  );
  const rowOf = useMemo(() => new Map(rows.map((p, i) => [p.id, i])), [rows]);
  const byId = useMemo(() => new Map(data.peoples.map((p) => [p.id, p])), [data]);

  // Horizontal positions follow the site's own (non-linear) timeline, over the span the peoples cover.
  const t0 = rows.length ? Math.min(...rows.map((p) => startT(p.attested.start))) : 0;
  const p0 = scale.tToPos(t0);
  const p1 = scale.tToPos(asOfT);
  const W = 1000;
  const plotW = W - LABEL_W - 16;
  const xOf = (tt: number) => {
    const f = (scale.tToPos(Math.min(asOfT, Math.max(t0, tt))) - p0) / Math.max(1e-9, p1 - p0);
    return rtl ? W - LABEL_W - f * plotW : LABEL_W + f * plotW;
  };
  const yOf = (id: string) => TOP + (rowOf.get(id) ?? 0) * ROW + ROW / 2;
  const H = TOP + rows.length * ROW + 12;

  const eraTicks = useMemo(() => {
    const segs = scale.segmentPositions();
    return segs
      .map((s, i) => ({ s, era: data.eras[i] }))
      .filter(({ s }) => s.p1 > p0 && s.p0 < p1)
      .map(({ s, era }) => ({ id: s.id, pos: Math.max(s.p0, p0), label: era ? loc(era.label, lang) : s.id }));
  }, [scale, data, p0, p1, lang]);
  const posX = (pos: number) => {
    const f = (pos - p0) / Math.max(1e-9, p1 - p0);
    return rtl ? W - LABEL_W - f * plotW : LABEL_W + f * plotW;
  };

  const sel = selected ? byId.get(selected) : undefined;
  const choose = (id: string) => {
    setSelected(id);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#/peoples/${id}`);
  };
  const showOnMap = (tt: number) => {
    setT(scale.floor(Math.max(scale.tMin, Math.min(scale.tMax, tt))));
    setView('map');
  };
  const name = (id: string | null | undefined) => (id ? loc(byId.get(id)?.name, lang) || id : '');

  return (
    <main className="page peoples-page" aria-labelledby="peoples-title" data-testid="peoples-page">
      <button type="button" className="link-btn" onClick={() => setView('map')}>
        ← {tr('nav.backToMap')}
      </button>
      <h1 id="peoples-title">{tr('peoples.title')}</h1>
      <p>{tr('peoples.intro')}</p>
      <p className="fine">
        {tr('peoples.indigenousNote')}{' '}
        <button type="button" className="link-btn" onClick={() => setView('perspectives')}>
          {tr('nav.perspectives')}
        </button>
      </p>
      {rows.length === 0 ? (
        <p className="empty">{tr('peoples.none')}</p>
      ) : (
        <>
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
          <div className="peoples-scroll">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={tr('peoples.diagramLabel')} className="peoples-diagram">
              <defs>
                {(Object.keys(STYLE) as PeopleLink['type'][]).map((k) => (
                  <marker key={k} id={`arrow-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 z" fill={STYLE[k].color} />
                  </marker>
                ))}
              </defs>
              {eraTicks.map((e) => (
                <g key={e.id}>
                  <line x1={posX(e.pos)} x2={posX(e.pos)} y1={TOP - 6} y2={H} stroke="#e4ded2" />
                  <text x={posX(e.pos) + (rtl ? -3 : 3)} y={TOP - 12} fontSize="10" fill="#6b6457" textAnchor={rtl ? 'end' : 'start'}>
                    {e.label}
                  </text>
                </g>
              ))}
              {rows.map((p) => {
                const y = yOf(p.id);
                const xa = xOf(startT(p.attested.start));
                const xb = xOf(p.attested.end ? endT(p.attested.end) : asOfT);
                const on = p.id === selected;
                return (
                  <g key={p.id} className="people-row" onClick={() => choose(p.id)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={Math.min(xa, xb)}
                      y={y - BAND / 2}
                      width={Math.max(3, Math.abs(xb - xa))}
                      height={BAND}
                      rx="3"
                      fill={KIND_FILL[p.kind]}
                      stroke={on ? '#1d2a36' : p.confidence === 'contested' ? '#9a4a2a' : 'none'}
                      strokeWidth={on ? 2 : 1}
                      strokeDasharray={p.confidence === 'contested' && !on ? '3 2' : undefined}
                    >
                      <title>{`${loc(p.name, lang)} · ${formatDate(p.attested.start, lang)} – ${p.attested.end ? formatDate(p.attested.end, lang) : tr('peoples.today')}`}</title>
                    </rect>
                    <text x={rtl ? W - 6 : 6} y={y + 4} fontSize="12" textAnchor={rtl ? 'end' : 'start'} fontWeight={on ? 700 : 400} fill="#1d2a36">
                      {loc(p.name, lang)}
                    </text>
                  </g>
                );
              })}
              {data.peopleLinks.map((l) => {
                if (!rowOf.has(l.from)) return null;
                const st = STYLE[l.type];
                const x = xOf(startT(l.start));
                const y1 = yOf(l.from);
                const hot = selected && (l.from === selected || l.to === selected);
                const common = {
                  stroke: st.color,
                  strokeWidth: hot ? 2.6 : 1.6,
                  strokeDasharray: st.dash,
                  fill: 'none',
                  opacity: selected && !hot ? 0.25 : l.confidence === 'contested' ? 0.75 : 0.95,
                  markerEnd: `url(#arrow-${l.type})`,
                  onClick: () => choose(l.from),
                  style: { cursor: 'pointer' },
                };
                const tip = `${name(l.from)} ${tr(`peoples.type.${l.type}`)} ${l.to ? name(l.to) : loc(l.destination?.label, lang)} (${formatDate(l.start, lang)})`;
                if (l.to && rowOf.has(l.to)) {
                  const y2 = yOf(l.to);
                  const bend = (rtl ? -1 : 1) * 18;
                  return (
                    <path key={l.id} d={`M${x},${y1} C${x + bend},${y1} ${x + bend},${y2} ${x + 2 * bend},${y2}`} {...common}>
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
                    <text x={x + dx + (rtl ? -3 : 3)} y={y1 - 9} fontSize="10" fill={st.color} textAnchor={rtl ? 'end' : 'start'}>
                      {loc(l.destination?.label, lang)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <nav className="peoples-list" aria-label={tr('peoples.listLabel')}>
            {rows.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={p.id === selected} onClick={() => choose(p.id)}>
                {loc(p.name, lang)}
              </button>
            ))}
          </nav>
          {sel ? <PeopleDetail data={data} p={sel} name={name} choose={choose} showOnMap={showOnMap} /> : <p className="fine">{tr('peoples.select')}</p>}
        </>
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
}: {
  data: AppData;
  p: People;
  name: (id: string | null | undefined) => string;
  choose: (id: string) => void;
  showOnMap: (t: number) => void;
}) {
  const { t: tr } = useTranslation();
  const { lang } = useStore();
  const out = data.peopleLinks.filter((l) => l.from === p.id).sort((a, b) => startT(a.start) - startT(b.start));
  const inc = data.peopleLinks.filter((l) => l.to === p.id).sort((a, b) => startT(a.start) - startT(b.start));
  const title = loc(p.name, lang);
  const related = [
    ...(p.related?.polities ?? []).map((id) => ({ id, label: loc(data.polities.find((x) => x.id === id)?.name, lang), t: data.polities.find((x) => x.id === id)?.start })),
    ...(p.related?.migrations ?? []).map((id) => ({ id, label: loc(data.migrations.find((x) => x.id === id)?.name, lang), t: data.migrations.find((x) => x.id === id)?.start })),
    ...(p.related?.languages ?? []).map((id) => ({ id, label: loc(data.languages.find((x) => x.id === id)?.name, lang), t: undefined })),
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
      {p.notes && (
        <p className="fine">
          <LocText text={p.notes} lang={lang} />
        </p>
      )}
      <button type="button" className="src-btn" onClick={() => showOnMap(startT(p.attested.start))}>
        {tr('peoples.showOnMap', { date: formatDate(p.attested.start, lang) })}
      </button>
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
    </article>
  );
}
