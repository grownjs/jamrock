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

export { onError, useState } from 'nohooks';

export { wrapComponent, clientComponent as mountableComponent } from '../client/render.ts';

export const useRef = <T,>(current: T): { current: T } => ({ current });

export const useMemo = computed;

export const useEffect = effect;
