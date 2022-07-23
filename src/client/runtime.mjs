export { onError, useState } from 'somedom';

export const useRef = current => ({ current });
export const useMemo = callback => callback();
export const useEffect = () => { /* noop */ };

const cache = new Map();

export function importComponent(ref) {
  return cache.get(ref);
}

export function registerComponent(ref, module) {
  cache.set(ref, module);
  return module;
}
