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

export { onError, useState, createContext } from 'nohooks';

export { wrapComponent, clientComponent as mountableComponent } from '../client/render.ts';

export const useRef = <T,>(current: T): { current: T } => ({ current });

export const useMemo = computed;

export const useEffect = effect;
