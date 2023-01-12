import { render } from './hooks.mjs';
import { Is } from '../utils/client.mjs';

export function execSync(chunk, ctx, or, _) {
  if (Is.empty(chunk)) chunk = or ? execSync(or, ctx, undefined, _) : chunk;
  if (Is.func(chunk) && !chunk.name) chunk = chunk.apply(undefined, ctx);
  if (Is.arr(chunk)) chunk = chunk.map(x => execSync(x, ctx, undefined, _));
  return chunk;
}

export const renderSync = (chunk, data, cb, _) => render(chunk, data, execSync, cb, _);
