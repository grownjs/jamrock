import {
  signal,
  computed,
  effect,
  batch,
  untracked,
  trap,
  scope,
} from 'somedom';

export {
  signal,
  computed,
  effect,
  batch,
  untracked,
  trap,
  scope,
};

export { wrapComponent, clientComponent as mountableComponent } from '../client/render.ts';

export const ref = <T,>(current: T): { current: T } => ({ current });

export const useMemo = computed;

export const useEffect = effect;
