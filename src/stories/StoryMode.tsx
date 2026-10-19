import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData } from '../data/model';
import { loc } from '../i18n/localize';
import { mapRegistry } from '../map/registry';
import { CitedText } from '../panels/CitedText';
import { LAYER_KEYS, useStore, type LayerKey } from '../state/store';
import type { EraScale } from '../time/eraScale';
import { tOf } from '../time/years';

/** List of guided tours. */
export function StoriesDialog({ data, open, onClose }: { data: AppData; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { lang, setStory, setStoryAuto } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="source-dialog stories-dialog" onClose={onClose} aria-labelledby="stories-title" data-testid="stories-dialog">
      <header>
        <h2 id="stories-title">{t('story.title')}</h2>
        <button type="button" className="close" onClick={onClose} aria-label={t('sources.close')}>
          ×
        </button>
      </header>
      <ul className="story-list">
        {data.stories.length === 0 && <li>{t('story.none')}</li>}
        {data.stories.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                setStory({ id: s.id, step: 1 });
                setStoryAuto(true);
                onClose();
              }}
              data-testid={`story-${s.id}`}
            >
              <strong>{loc(s.title, lang)}</strong>
              <span>{loc(s.summary, lang)}</span>
              <span className="fine">{t('story.steps', { count: s.steps.length })}</span>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}

/** The narration card of the tour being played; drives the timeline, layers and camera. */
export function StoryCard({ data, scale }: { data: AppData; scale: EraScale }) {
  const { t: tr } = useTranslation();
  const { lang, story, setStory, storyAuto, setStoryAuto, setT, setPlaying, setLayers, setPlace } = useStore();
  const s = story ? data.stories.find((x) => x.id === story.id) : undefined;
  const step = s && story ? s.steps[story.step - 1] : undefined;

  // Apply the step: date, layers, highlighted place, camera.
  useEffect(() => {
    if (!step) return;
    setPlaying(false);
    setT(scale.floor(scale.clampT(tOf(step.date.year, step.date.month))));
    if (step.layers) setLayers(step.layers.filter((k): k is LayerKey => (LAYER_KEYS as readonly string[]).includes(k)));
    const place = step.highlight?.find((id) => data.places.some((p) => p.id === id));
    setPlace(place ?? null);
    if (!step.view) return;
    const view = step.view;
    const fly = () => {
      if (!mapRegistry.main) return false;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // Keep the point of interest clear of the story card (bottom-left, or bottom-right in RTL).
      const wide = window.innerWidth > 700;
      const rtl = document.documentElement.dir === 'rtl';
      const padding = wide ? { top: 0, bottom: 0, left: rtl ? 0 : 420, right: rtl ? 420 : 0 } : { top: 0, bottom: 220, left: 0, right: 0 };
      mapRegistry.main.flyTo({ center: view.center, zoom: view.zoom, padding, duration: reduce ? 0 : 2200 });
      return true;
    };
    if (fly()) return;
    // Opened from a link: wait for the map to be created.
    const id = window.setInterval(() => fly() && window.clearInterval(id), 200);
    const stop = window.setTimeout(() => window.clearInterval(id), 15000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [step, scale, setT, setPlaying, setLayers, setPlace, data]);

  // Autoplay: advance after the step's duration.
  useEffect(() => {
    if (!s || !story || !step || !storyAuto) return;
    const id = window.setTimeout(() => {
      if (story.step < s.steps.length) setStory({ id: s.id, step: story.step + 1 });
      else setStoryAuto(false);
    }, (step.duration_s ?? 12) * 1000);
    return () => window.clearTimeout(id);
  }, [s, story, step, storyAuto, setStory, setStoryAuto]);

  if (!s || !story || !step) return null;
  const go = (n: number) => setStory({ id: s.id, step: Math.min(s.steps.length, Math.max(1, n)) });

  return (
    <section className="story-card" aria-labelledby="story-step-title" aria-live="polite" data-testid="story-card">
      <p className="story-meta">
        {loc(s.title, lang)} · {tr('story.stepOf', { n: story.step, total: s.steps.length })}
      </p>
      <h2 id="story-step-title">{loc(step.title, lang)}</h2>
      <p>
        <CitedText text={step.card} sources={step.sources} title={loc(step.title, lang)} />
      </p>
      <div className="story-controls">
        <button type="button" onClick={() => go(story.step - 1)} disabled={story.step <= 1}>
          <span className="dir-icon" aria-hidden>◀</span> {tr('story.prev')}
        </button>
        <button type="button" onClick={() => setStoryAuto(!storyAuto)} aria-pressed={storyAuto}>
          {storyAuto ? tr('timeline.pause') : tr('timeline.play')}
        </button>
        <button type="button" onClick={() => go(story.step + 1)} disabled={story.step >= s.steps.length} data-testid="story-next">
          {tr('story.next')} <span className="dir-icon" aria-hidden>▶</span>
        </button>
        <button type="button" className="link-btn" onClick={() => setStory(null)}>
          {tr('story.close')}
        </button>
      </div>
    </section>
  );
}
