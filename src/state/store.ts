import { create } from 'zustand';
import type { Lang } from '../time/format';

export const SPEEDS = [0.5, 1, 2, 4] as const;
/** At 1× the whole timeline plays in five minutes. */
export const FULL_PLAY_MS = 5 * 60 * 1000;

interface State {
  /** Continuous time (astronomical year + month fraction), always on the step grid. */
  t: number;
  playing: boolean;
  speed: number;
  lang: Lang;
  setT: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  setLang: (l: Lang) => void;
}

export const useStore = create<State>((set) => ({
  t: 1,
  playing: false,
  speed: 1,
  lang: 'en',
  setT: (t) => set({ t }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  setLang: (lang) => set({ lang }),
}));
