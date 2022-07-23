import { isEmpty, isArray } from '../utils.mjs';
import { render } from './hooks.mjs';

export async function execAsync(chunk, ctx, or) {
  let result = await chunk;
  if (isEmpty(result)) return or || result;
  if (typeof result === 'function' && !result.name) result = await result.apply(null, ctx);
  if (isArray(result)) result = await Promise.all(result.map(item => execAsync(item, ctx)));
  return result;
}

export function execSync(chunk, ctx, or) {
  if (isEmpty(chunk)) chunk = or || chunk;
  if (typeof chunk === 'function' && !chunk.name) chunk = chunk.apply(null, ctx);
  if (isArray(chunk)) chunk = chunk.map(x => execSync(x, ctx));
  return chunk;
}

export const renderAsync = (chunk, data, cb) => render(chunk, data, execAsync, cb);
export const renderSync = (chunk, data, cb) => render(chunk, data, execSync, cb);
