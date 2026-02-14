export { onError, useState, createContext } from 'nohooks';

export { wrapComponent, clientComponent as mountableComponent } from '../client/render.ts';

export const useRef = <T,>(current: T): { current: T } => ({ current });
export const useMemo = <T,>(callback: () => T): T => callback();
export const useEffect = (): void => { /* noop */ };
