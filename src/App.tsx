import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadAppData, type AppData } from './data/model';
import { applyLanguage, LANGS } from './i18n';
import { resolve } from './i18n/localize';
import { MapView } from './map/MapView';
import { OnMapPanel } from './panels/OnMapPanel';
import { useStore } from './state/store';
import { readUrl, writeUrl } from './state/url';
import { Timeline } from './timeline/Timeline';
import { EraScale } from './time/eraScale';
import { startT } from './time/years';

export default function App() {
  const { t: tr } = useTranslation();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t, lang, setT, setLang } = useStore();

  useEffect(() => {
    loadAppData()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const scale = useMemo(() => {
    if (!data) return null;
    const asOf = data.config.timeline.as_of;
    return new EraScale(data.eras, startT({ year: asOf.year, month: asOf.month }));
  }, [data]);

  // Initial state from the URL (or the start of the timeline).
  useEffect(() => {
    if (!scale) return;
    const u = readUrl(window.location.search);
    setT(u.t !== undefined ? scale.snap(scale.clampT(u.t)) : scale.tMin);
    if (u.lang) setLang(u.lang);
  }, [scale, setT, setLang]);

  useEffect(() => applyLanguage(lang), [lang]);

  // Keep the URL shareable, without flooding history during playback.
  useEffect(() => {
    if (!scale) return;
    const id = window.setTimeout(() => writeUrl({ t, lang }, scale), 250);
    return () => window.clearTimeout(id);
  }, [t, lang, scale]);

  if (error) {
    return (
      <div className="fatal" role="alert">
        {tr('loadError')} ({error})
      </div>
    );
  }
  if (!data || !scale) return <div className="fatal">{tr('loading')}</div>;

  const title = resolve(data.config.title, lang);
  const subtitle = resolve(data.config.subtitle, lang);

  return (
    <div className="app">
      <a className="skip-link" href="#timeline">
        {tr('skipToTimeline')}
      </a>
      <header className="site-header">
        <div className="titles">
          <h1>{title.text}</h1>
          <p className="subtitle">{subtitle.text}</p>
        </div>
        <nav className="lang-switch" aria-label={tr('lang.label')}>
          {LANGS.map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)} data-testid={`lang-${l}`}>
              {tr(`lang.${l}`)}
            </button>
          ))}
        </nav>
      </header>
      {lang !== 'en' && (
        <p className="draft-banner" role="note">
          {tr('draftNotice')}
        </p>
      )}
      <main className="content">
        <MapView data={data} t={t} lang={lang} />
        <OnMapPanel data={data} />
      </main>
      <Timeline data={data} scale={scale} />
    </div>
  );
}
