import { useTranslation } from 'react-i18next';
import type { AppData } from '../data/model';
import { useStore } from '../state/store';
import { formatDate } from '../time/format';

/** Method page: how to read the map and how it was made. */
export function About({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const { lang, setView } = useStore();
  const sections = t('about.sections', { returnObjects: true }) as [string, string][];
  return (
    <main className="page about" aria-labelledby="about-title" data-testid="about-page">
      <button type="button" className="link-btn" onClick={() => setView('map')}>
        ← {t('nav.backToMap')}
      </button>
      <h1 id="about-title">{t('about.title')}</h1>
      <p className="fine">{t('about.asOf', { date: formatDate(data.config.timeline.as_of, lang) })}</p>
      {sections.map(([h, body]) => (
        <section key={h}>
          <h2>{h}</h2>
          <p>{body}</p>
        </section>
      ))}
    </main>
  );
}
