import { Is } from '../utils/server.mjs';
import { Ref } from '../markup/expr.mjs';
import { render } from './hooks.mjs';

const REF_CHUNK = Symbol('@@ref');

export async function resolveRecursively(out) {
  while (out.length === 1 && Is.arr(out[0])) out = out[0];

  for (let i = 0; i < out.length; i++) {
    out[i] = Is.arr(out[i]) ? resolveRecursively(out[i]) : out[i];
  }
  return Promise.all(out);
}

export async function execAsync(chunk, ctx, or, _) {
  let result = await chunk;
  if (result instanceof Ref) {
    result = await _.chunks.get(result.$key);
  }

  if (Is.empty(result)) return or ? execAsync(or, ctx, undefined, _) : result;
  if (Is.func(result) && !result.name) result = await result.apply(undefined, ctx);
  if (Is.arr(result) && !result[REF_CHUNK]) {
    result = await Promise.all(result.map(item => execAsync(item, ctx, undefined, _)));

    while (result.length === 1 && Is.arr(result[0])) result = result[0];

    Object.defineProperty(result, REF_CHUNK, { value: 1 });
  }
  return result;
}

export const renderAsync = (chunk, data, cb, _) => render(chunk, data, execAsync, cb, _ || null);
