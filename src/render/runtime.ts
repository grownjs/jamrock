import {
  signal,
  computed,
  effect,
  batch,
  untracked,
} from 'somedom';

export {
  signal,
  computed,
  effect,
  batch,
  untracked,
};

// TODO: Add trap and scope when somedom 0.9.5 is published
// export { trap, scope } from 'somedom';

export { onError, useState } from 'nohooks';

export { wrapComponent, clientComponent as mountableComponent } from '../client/render.ts';

export const useRef = <T,>(current: T): { current: T } => ({ current });

export const useMemo = computed;

export const useEffect = effect;
