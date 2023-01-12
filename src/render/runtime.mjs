export { onError, useState, createContext } from 'nohooks';

export { wrapComponent, clientComponent as mountableComponent } from '../client/render.mjs';

export const useRef = current => ({ current });
export const useMemo = callback => callback();
export const useEffect = () => { /* noop */ };
