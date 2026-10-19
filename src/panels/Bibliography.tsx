import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData } from '../data/model';
import { useStore } from '../state/store';
import { formatCitation, sourceLink } from './format';

const LEVELS = ['full-text', 'excerpt', 'cited-via', 'catalogue-only'] as const;

/** Every work cited on the site, with how it was checked and how often it is cited. */
export function Bibliography({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const setView = useStore((s) => s.setView);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<string>('all');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...data.sources]
      .filter((s) => level === 'all' || s.verification.level === level)
      .filter((s) => !needle || `${formatCitation(s)} ${s.id}`.toLowerCase().includes(needle))
      .sort((a, b) => formatCitation(a).localeCompare(formatCitation(b)));
  }, [data, q, level]);

  return (
    <main className="page" aria-labelledby="biblio-title" data-testid="bibliography">
      <button type="button" className="link-btn" onClick={() => setView('map')}>
        ← {t('nav.backToMap')}
      </button>
      <h1 id="biblio-title">{t('biblio.title')}</h1>
      <p>{t('biblio.intro')}</p>
      <div className="biblio-filters">
        <label>
          <span className="visually-hidden">{t('biblio.filter')}</span>
          <input type="search" placeholder={t('biblio.filter')} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label>
          {t('biblio.levelFilter')}:{' '}
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">{t('biblio.all')}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {t(`sources.level.${l}`)}
              </option>
            ))}
          </select>
        </label>
        <span>{t('biblio.count', { count: list.length })}</span>
      </div>
      <ol className="biblio-list">
        {list.map((s) => {
          const link = sourceLink(s);
          return (
            <li key={s.id} id={`src-${s.id}`}>
              <p className="citation">
                {formatCitation(s)}{' '}
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    ↗
                  </a>
                )}
              </p>
              <p className="biblio-meta">
                <span className={`verify level-${s.verification.level}`}>{t(`sources.level.${s.verification.level}`)}</span> · {t(`biblio.kind.${s.kind}`, { defaultValue: s.kind })}
                {s.institution_country ? ` · ${s.institution_country}` : ''} · {t('biblio.citedBy', { count: data.sourceUsage[s.id] ?? 0 })} · <code>{s.id}</code>
              </p>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
