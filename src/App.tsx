import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadAppData, type AppData } from './data/model';
import { applyLanguage, LANGS } from './i18n';
import { resolve } from './i18n/localize';
import { MapView } from './map/MapView';
import { YearPanel } from './panels/YearPanel';
import { PlacePanel } from './panels/PlacePanel';
import { SourceDialog } from './panels/Sources';
import { RulerBands } from './timeline/RulerBands';
import { StoriesDialog, StoryCard } from './stories/StoryMode';
import { mapRegistry } from './map/registry';
// Perspectives cards are also used by the year panel, so the page is not split out.
import { PerspectivesPage } from './panels/Perspectives';
import { DEFAULT_LAYERS, LAYER_KEYS, type LayerKey } from './state/store';
import { useStore, viewFromHash } from './state/store';
import { readUrl, writeUrl } from './state/url';
import { Timeline } from './timeline/Timeline';
import { EraScale } from './time/eraScale';
import { startT } from './time/years';

const Bibliography = lazy(() => import('./panels/Bibliography').then((m) => ({ default: m.Bibliography })));
const PopulationChart = lazy(() => import('./charts/PopulationChart').then((m) => ({ default: m.PopulationChart })));
const CompareView = lazy(() => import('./map/CompareView').then((m) => ({ default: m.CompareView })));
const About = lazy(() => import('./panels/About').then((m) => ({ default: m.About })));
export default function App() {
  const { t: tr } = useTranslation();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const { t, lang, setT, setLang, view, setView, placeId, setPlace, compare, setCompare, layers, setLayers, story, setStory } = useStore();

  // Pages inside the app use the hash (#/bibliography), so static hosting never returns 404.
  useEffect(() => {
    // The starting page is read from the hash when the store is created; here we follow later changes.
    const sync = () => setView(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [setView]);
  useEffect(() => {
    const want = view === 'map' ? '' : `#/${view}`;
    if (window.location.hash !== want) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${want}`);
    }
  }, [view]);

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
    setT(u.t !== undefined ? scale.floor(scale.clampT(u.t)) : scale.tMin);
    if (u.lang) setLang(u.lang);
    setCompare({ on: u.t2 !== undefined, t2: u.t2 !== undefined ? scale.floor(scale.clampT(u.t2)) : scale.tMax, ...(u.cmpMode ? { mode: u.cmpMode } : {}) });
    if (u.layers) setLayers(u.layers.filter((k): k is LayerKey => (LAYER_KEYS as readonly string[]).includes(k)));
    if (u.place) setPlace(u.place);
    if (u.story) setStory({ id: u.story, step: u.step ?? 1 });
  }, [scale, setT, setLang, setCompare, setLayers, setPlace, setStory]);

  useEffect(() => applyLanguage(lang), [lang]);

  // Keep the URL shareable, without flooding history during playback.
  useEffect(() => {
    if (!scale) return;
    const id = window.setTimeout(() => writeUrl({ t, lang, compare, layers, defaultLayers: DEFAULT_LAYERS, place: placeId, story }, scale), 250);
    return () => window.clearTimeout(id);
  }, [t, lang, scale, compare, layers, placeId, story]);

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
        <nav className="site-nav" aria-label={tr('nav.map')}>
          {view === 'map' && (
            <button type="button" className="link-btn" aria-pressed={compare.on} onClick={() => setCompare({ on: !compare.on })} data-testid="nav-compare">
              {compare.on ? tr('compare.close') : tr('compare.open')}
            </button>
          )}
          {view === 'map' && data.stories.length > 0 && (
            <button type="button" className="link-btn" onClick={() => setStoriesOpen(true)} data-testid="nav-stories">
              {tr('nav.stories')}
            </button>
          )}
          {view !== 'map' && (
            <button type="button" className="link-btn" onClick={() => setView('map')}>
              {tr('nav.backToMap')}
            </button>
          )}
          <button type="button" className="link-btn" aria-current={view === 'perspectives' ? 'page' : undefined} onClick={() => setView('perspectives')} data-testid="nav-perspectives">
            {tr('nav.perspectives')}
          </button>
          <button type="button" className="link-btn" aria-current={view === 'bibliography' ? 'page' : undefined} onClick={() => setView('bibliography')} data-testid="nav-bibliography">
            {tr('nav.bibliography')}
          </button>
          <button type="button" className="link-btn" aria-current={view === 'about' ? 'page' : undefined} onClick={() => setView('about')} data-testid="nav-about">
            {tr('nav.about')}
          </button>
        </nav>
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
      <Suspense fallback={<div className="fatal">{tr('loading')}</div>}>
      {view === 'bibliography' ? (
        <Bibliography data={data} />
      ) : view === 'perspectives' ? (
        <PerspectivesPage data={data} />
      ) : view === 'about' ? (
        <About data={data} />
      ) : (
        <>
          {compare.on ? (
            <CompareView data={data} scale={scale} />
          ) : (
            <main className="content">
              <MapView data={data} t={t} lang={lang} onMap={(m) => (mapRegistry.main = m)} />
              <StoryCard data={data} scale={scale} />
              {placeId ? <PlacePanel data={data} placeId={placeId} /> : <YearPanel data={data} />}
            </main>
          )}
          <Timeline data={data} scale={scale}>
            <RulerBands data={data} scale={scale} />
            <PopulationChart data={data} scale={scale} />
          </Timeline>
        </>
      )}
      </Suspense>
      <SourceDialog data={data} />
      <StoriesDialog data={data} open={storiesOpen} onClose={() => setStoriesOpen(false)} />
    </div>
  );
}
