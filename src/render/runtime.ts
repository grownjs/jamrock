import * as somedom from 'somedom/ssr';

const {
  signal,
  computed,
  effect,
  batch,
  untracked,
  trap,
  scope,
} = somedom as any;

export {
  signal,
  computed,
  effect,
  batch,
  untracked,
  trap,
  scope,
};

export { clientComponent as mountableComponent } from '../client/render.ts';

export const ref = <T,>(current: T): { current: T } => ({ current });

export const useMemo = computed;

export const useEffect = effect;
