import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppData } from '../data/model';
import { isRtl } from '../i18n';
import { loc } from '../i18n/localize';
import { FULL_PLAY_MS, SPEEDS, useStore } from '../state/store';
import type { EraScale } from '../time/eraScale';
import { formatT, formatYear } from '../time/format';
import { parseUserDate } from '../time/parse';
import { fromT } from '../time/years';

export function Timeline({ data, scale }: { data: AppData; scale: EraScale }) {
  const { t: tr } = useTranslation();
  const { t, setT, playing, setPlaying, speed, setSpeed, lang } = useStore();
  const rtl = isRtl(lang);
  const track = useRef<HTMLDivElement>(null);
  const posRef = useRef(scale.tToPos(t));
  const [goTo, setGoTo] = useState('');
  const [goToError, setGoToError] = useState(false);

  const segs = useMemo(() => scale.segmentPositions(), [scale]);
  const eraById = useMemo(() => new Map(data.eras.map((e) => [e.id, e])), [data]);
  const seg = scale.segmentAt(t);
  const eraLabel = loc(eraById.get(seg.id)?.label, lang);
  const unit = scale.stepAt(t).unit;
  const dateText = formatT(t, lang, unit);
  const pos = scale.tToPos(t);

  // Keep the continuous playback position in step with user changes.
  useEffect(() => {
    if (!playing) posRef.current = scale.tToPos(t);
  }, [t, playing, scale]);

  // Playback: advance the slider position at constant speed; show the date on the step grid.
  useEffect(() => {
    if (!playing) return;
    if (posRef.current >= 1 - 1e-9) {
      posRef.current = 0;
      setT(scale.tMin);
    }
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      posRef.current = Math.min(1, posRef.current + (dt * speed) / FULL_PLAY_MS);
      const nt = scale.floor(scale.posToT(posRef.current));
      if (Math.abs(nt - useStore.getState().t) > 1e-9) setT(nt);
      if (posRef.current >= 1) {
        setT(scale.tMax);
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, scale, setT, setPlaying]);

  const posFromEvent = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    const x = rtl ? r.right - e.clientX : e.clientX - r.left;
    return Math.min(1, Math.max(0, x / r.width));
  };
  const onPointer = (e: PointerEvent) => {
    if (e.type === 'pointerdown') {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setPlaying(false);
    } else if (!(e.buttons & 1)) return;
    setT(scale.snap(scale.posToT(posFromEvent(e))));
  };

  const step = (dir: 1 | -1) => {
    setPlaying(false);
    setT(scale.step(t, dir));
  };
  const jump = (dir: 1 | -1) => {
    setPlaying(false);
    setT(scale.jumpSegment(t, dir));
  };

  const onKey = (e: KeyboardEvent) => {
    // Visual direction: in RTL, the right arrow moves toward the right, i.e. back in time.
    const right: 1 | -1 = rtl ? -1 : 1;
    const map: Record<string, () => void> = {
      ArrowRight: () => step(right),
      ArrowLeft: () => step(-right as 1 | -1),
      ArrowUp: () => step(1),
      ArrowDown: () => step(-1),
      PageUp: () => jump(1),
      PageDown: () => jump(-1),
      Home: () => setT(scale.tMin),
      End: () => setT(scale.tMax),
      ' ': () => setPlaying(!playing),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const onGoTo = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseUserDate(goTo);
    if (parsed === null) {
      setGoToError(true);
      return;
    }
    setGoToError(false);
    setPlaying(false);
    setT(scale.snap(scale.clampT(parsed)));
  };

  return (
    <section className="timeline" id="timeline" aria-label={tr('timeline.label')}>
      <div className="timeline-head">
        <div className="now" aria-live="off">
          <span className="now-date" data-testid="current-date">{dateText}</span>
          <span className="now-era">{eraLabel}</span>
        </div>
        <div className="controls">
          <button type="button" onClick={() => jump(-1)} aria-label={tr('timeline.prevEra')} title={tr('timeline.prevEra')}>
            <span className="dir-icon" aria-hidden>⏮</span>
          </button>
          <button type="button" onClick={() => step(-1)} aria-label={tr('timeline.back')} title={tr('timeline.back')}>
            <span className="dir-icon" aria-hidden>◀</span>
          </button>
          <button type="button" className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? tr('timeline.pause') : tr('timeline.play')} data-testid="play">
            <span className={playing ? '' : 'dir-icon'} aria-hidden>{playing ? '❚❚' : '▶'}</span>
          </button>
          <button type="button" onClick={() => step(1)} aria-label={tr('timeline.forward')} title={tr('timeline.forward')}>
            <span className="dir-icon" aria-hidden>▶</span>
          </button>
          <button type="button" onClick={() => jump(1)} aria-label={tr('timeline.nextEra')} title={tr('timeline.nextEra')}>
            <span className="dir-icon" aria-hidden>⏭</span>
          </button>
          <label className="speed">
            <span>{tr('timeline.speed')}</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
          <form className="goto" onSubmit={onGoTo}>
            <label>
              <span className="visually-hidden">{tr('timeline.goTo')}</span>
              <input
                value={goTo}
                onChange={(e) => {
                  setGoTo(e.target.value);
                  setGoToError(false);
                }}
                placeholder={tr('timeline.goToPlaceholder')}
                aria-invalid={goToError}
                aria-describedby={goToError ? 'goto-error' : undefined}
                data-testid="goto-input"
                dir="ltr"
              />
            </label>
            <button type="submit">{tr('timeline.goTo')}</button>
            {goToError && (
              <span id="goto-error" className="goto-error" role="alert">
                {tr('timeline.goToInvalid')}
              </span>
            )}
          </form>
        </div>
      </div>

      <div
        className="slider"
        role="slider"
        tabIndex={0}
        aria-label={tr('timeline.label')}
        aria-valuemin={0}
        aria-valuemax={1000}
        aria-valuenow={Math.round(pos * 1000)}
        aria-valuetext={tr('timeline.valueText', { date: dateText, era: eraLabel })}
        aria-describedby="timeline-help"
        onKeyDown={onKey}
        data-testid="slider"
      >
        <div className="track" ref={track} onPointerDown={onPointer} onPointerMove={onPointer}>
          {segs.map((s) => {
            const era = eraById.get(s.id);
            const label = loc(era?.label, lang);
            const wide = s.p1 - s.p0 > 0.055;
            const start = scale.segments.find((x) => x.id === s.id)!.t0;
            return (
              <div
                key={s.id}
                className={`band${s.id === seg.id ? ' current' : ''}`}
                style={{ insetInlineStart: `${s.p0 * 100}%`, width: `${(s.p1 - s.p0) * 100}%` }}
                title={`${label} (${formatYear(fromT(start).year, lang)})`}
              >
                {wide && <span className="band-label">{label}</span>}
              </div>
            );
          })}
          <div className="thumb" style={{ insetInlineStart: `${pos * 100}%` }} aria-hidden />
        </div>
      </div>
      <p id="timeline-help" className="visually-hidden">
        {tr('timeline.help')}
      </p>
    </section>
  );
}
