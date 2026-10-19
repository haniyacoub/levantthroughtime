import { useTranslation } from 'react-i18next';
import type { AppData } from '../data/model';
import { nameDisplay, namesByTime } from '../data/places';
import { loc, resolve } from '../i18n/localize';
import { useStore } from '../state/store';
import { formatDate } from '../time/format';
import { SourceButton } from './Sources';
import { LocText } from './LocText';
import { Badge } from './Badge';

const TRADITIONS = ['jewish', 'christian', 'muslim', 'samaritan', 'druze', 'bahai'] as const;

/** A place: its names through time (language, script, period, who used them) and its significance to religious traditions. */
export function PlacePanel({ data, placeId }: { data: AppData; placeId: string }) {
  const { t: tr } = useTranslation();
  const { lang, setPlace } = useStore();
  const p = data.places.find((x) => x.id === placeId);
  if (!p) return null;
  const nm = resolve(p.name, lang);
  const names = namesByTime(p);

  return (
    <aside className="side-panel place-panel" aria-labelledby="place-title" data-testid="place-panel">
      <button type="button" className="link-btn" onClick={() => setPlace(null)}>
        ← {tr('place.back')}
      </button>
      <h2 id="place-title">
        {nm.text}
        {nm.draft && (
          <span className="draft-mark" title={tr('draftNotice')}>
            *
          </span>
        )}
      </h2>
      {p.description && <p>{loc(p.description, lang)}</p>}
      <p className="row-meta">
        {p.coords[1].toFixed(3)}, {p.coords[0].toFixed(3)} {p.coords_precision && p.coords_precision !== 'exact' ? `(${p.coords_precision})` : ''}{' '}
        <SourceButton refs={p.sources} title={nm.text} />
      </p>
      {(p.founded || p.destroyed?.length) && (
        <ul className="plain-list">
          {p.founded && (
            <li>
              {tr('place.founded')}: {formatDate(p.founded, lang)} {p.founded_note ? `— ${p.founded_note}` : ''}{' '}
              {p.founded_sources?.length ? <SourceButton refs={p.founded_sources} title={`${nm.text}: ${tr('place.founded')}`} compact /> : null}
            </li>
          )}
          {p.destroyed?.map((d, i) => (
            <li key={i} className={d.confidence ? `conf-${d.confidence}` : undefined}>
              <strong>{d.what ? tr(`place.what.${d.what}`, { defaultValue: d.what }) : tr('place.destroyed')}</strong>: {formatDate(d.date, lang)}
              {d.by ? ` — ${d.by}` : ''} {d.confidence && <Badge confidence={d.confidence} />}{' '}
              <SourceButton refs={d.sources} title={`${nm.text}: ${d.what ?? tr('place.destroyed')}`} compact />
              {d.note && <p className="fine">{d.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {names.length > 0 && (
        <section aria-labelledby="place-names">
          <h3 id="place-names" className="panel-sub">
            {tr('place.names')}
          </h3>
          <ol className="names-list">
            {names.map((n, i) => (
              <li key={i} className={`conf-${n.confidence}`}>
                <div className="names-period">
                  {n.start ? formatDate(n.start, lang) : '…'} – {n.end ? formatDate(n.end, lang) : '…'}
                </div>
                <div>
                  <span className="name-orig" lang={n.lang} dir="auto">
                    {n.text}
                  </span>
                  {nameDisplay(n, lang) !== n.text && <span className="name-tr"> ({nameDisplay(n, lang)})</span>}{' '}
                  <SourceButton refs={n.sources} title={n.text} compact />
                </div>
                <div className="fine">
                  {tr(`place.langNames.${n.lang}`, { defaultValue: n.lang })}
                  {n.used_by ? ` · ${n.used_by}` : ''}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {p.holy_site && (
        <section aria-labelledby="place-holy">
          <h3 id="place-holy" className="panel-sub">
            {tr('place.holy')}
          </h3>
          <dl className="traditions">
            {TRADITIONS.filter((k) => p.holy_site!.traditions[k]).map((k) => {
              const e = p.holy_site!.traditions[k]!;
              return (
                <div key={k}>
                  <dt>{tr(`place.traditions.${k}`)}</dt>
                  <dd>
                    {loc(e.significance, lang)} <SourceButton refs={e.sources} title={`${nm.text}: ${tr(`place.traditions.${k}`)}`} compact />
                    {e.denominations?.length ? (
                      <div className="fine">
                        {tr('place.denominations')}: {e.denominations.join(' · ')}
                      </div>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
      {p.custody && (
        <section aria-labelledby="place-custody">
          <h3 id="place-custody" className="panel-sub">
            {tr('place.custody')}
          </h3>
          <p className={`conf-${p.custody.confidence}`}>
            {loc(p.custody.summary, lang)} <SourceButton refs={p.custody.sources} title={`${nm.text}: ${tr('place.custody')}`} compact />
          </p>
          {p.custody.confidence === 'contested' && <p className="fine">{tr('place.custodyContested')}</p>}
        </section>
      )}
      {p.unesco && (
        <p className="fine">
          {tr('place.unesco', { name: p.unesco.name, year: p.unesco.inscribed })}
          {p.unesco.state_party_label ? ` — ${p.unesco.state_party_label}` : ''}
          {p.unesco.in_danger_since ? `. ${tr('place.inDanger', { year: p.unesco.in_danger_since })}` : ''}
          {p.unesco.note ? `. ${p.unesco.note}` : ''}{' '}
          <a href={`https://whc.unesco.org/en/list/${p.unesco.property}/`} target="_blank" rel="noreferrer">
            whc.unesco.org/en/list/{p.unesco.property}
          </a>
        </p>
      )}
      {p.notes && <p className="fine"><LocText text={p.notes} lang={lang} /></p>}
    </aside>
  );
}
