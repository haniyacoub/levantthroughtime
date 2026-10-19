import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData, Perspective } from '../data/model';
import { loc } from '../i18n/localize';
import { useStore } from '../state/store';
import { CitedText } from './CitedText';

/** Column order chosen by the project owner: Israeli · Palestinian · Academic, then any others. */
function rank(perspective: string): number {
  if (perspective.startsWith('israeli')) return 0;
  if (perspective.startsWith('palestinian')) return 1;
  if (perspective.startsWith('academic') || perspective.startsWith('international')) return 2;
  return 3;
}

export function sortedAccounts(p: Perspective) {
  return p.accounts.map((a, i) => ({ a, i })).sort((x, y) => rank(x.a.perspective) - rank(y.a.perspective) || x.i - y.i).map((x) => x.a);
}

/** One contested topic: accounts side by side, each sentence sourced, no verdict. */
export function PerspectiveCard({ p }: { p: Perspective }) {
  const { lang } = useStore();
  const title = loc(p.title, lang);
  return (
    <article className="perspective" aria-labelledby={`persp-${p.id}`} data-testid={`perspective-${p.id}`}>
      <h3 id={`persp-${p.id}`}>{title}</h3>
      <div className="accounts">
        {sortedAccounts(p).map((a, i) => (
          <section key={i} className={`account acc-${a.perspective.split('-')[0]}`}>
            <h4>{loc(a.label, lang)}</h4>
            <p>
              <CitedText text={a.summary} sources={a.sources} title={`${title} — ${loc(a.label, lang)}`} />
            </p>
          </section>
        ))}
      </div>
      {p.notes && <p className="fine">{loc(p.notes, lang)}</p>}
    </article>
  );
}

/** The perspectives page: every contested topic. */
export function PerspectivesPage({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const setView = useStore((s) => s.setView);
  const list = useMemo(() => [...data.perspectives].sort((a, b) => (a._t0 ?? 0) - (b._t0 ?? 0)), [data]);
  return (
    <main className="page" aria-labelledby="persp-title" data-testid="perspectives-page">
      <button type="button" className="link-btn" onClick={() => setView('map')}>
        ← {t('nav.backToMap')}
      </button>
      <h1 id="persp-title">{t('persp.title')}</h1>
      <p>{t('persp.intro')}</p>
      {list.length === 0 && <p className="empty">{t('persp.none')}</p>}
      {list.map((p) => (
        <PerspectiveCard key={p.id} p={p} />
      ))}
    </main>
  );
}
