import { useTranslation } from 'react-i18next';
import type { AppData } from '../data/model';
import { nameDisplay, namesByTime } from '../data/places';
import { loc, resolve } from '../i18n/localize';
import { useStore } from '../state/store';
import { formatDate } from '../time/format';
import { SourceButton } from './Sources';

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
              {tr('place.founded')}: {formatDate(p.founded, lang)} {p.founded_note ? `— ${p.founded_note}` : ''}
            </li>
          )}
          {p.destroyed?.map((d, i) => (
            <li key={i}>
              {tr('place.destroyed')}: {formatDate(d.date, lang)}
              {d.by ? ` — ${d.by}` : ''}
              {d.note ? ` (${d.note})` : ''} <SourceButton refs={d.sources} title={`${nm.text}: ${tr('place.destroyed')}`} compact />
            </li>
          ))}
        </ul>
      )}

      {names.length > 0 && (
        <section aria-labelledby="place-names">
          <h3 id="place-names" className="panel-sub">
            {tr('place.names')}
          </h3>
          <table className="data-table names-table">
            <thead>
              <tr>
                <th scope="col">{tr('place.period')}</th>
                <th scope="col">{tr('place.names')}</th>
                <th scope="col">{tr('place.lang')}</th>
                <th scope="col">{tr('place.usedBy')}</th>
                <th scope="col">
                  <span className="visually-hidden">{tr('sources.button')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {names.map((n, i) => (
                <tr key={i} className={`conf-${n.confidence}`}>
                  <td>
                    {n.start ? formatDate(n.start, lang) : '…'} – {n.end ? formatDate(n.end, lang) : '…'}
                  </td>
                  <td>
                    <span className="name-orig" lang={n.lang} dir="auto">
                      {n.text}
                    </span>
                    {nameDisplay(n, lang) !== n.text && <span className="name-tr"> ({nameDisplay(n, lang)})</span>}
                  </td>
                  <td>
                    {tr(`place.langNames.${n.lang}`, { defaultValue: n.lang })}
                    {n.script ? ` · ${n.script}` : ''}
                  </td>
                  <td>{n.used_by ?? ''}</td>
                  <td>
                    <SourceButton refs={n.sources} title={n.text} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
      {p.notes && <p className="fine">{loc(p.notes, lang)}</p>}
    </aside>
  );
}
