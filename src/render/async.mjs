import { Is } from '../utils/client.mjs';
// import { Ref } from '../markup/expr.mjs';
import { execute } from './hooks.mjs';

// const REF_CHUNK = Symbol('@@ref');

export async function resolveRecursively(out) {
  while (out.length === 1 && Is.arr(out[0])) out = out[0];

  for (let i = 0; i < out.length; i++) {
    out[i] = Is.arr(out[i]) ? resolveRecursively(out[i]) : out[i];
  }
  return Promise.all(out);
}

export async function execAsync(chunk, ctx, _) {
  let result = await chunk;
  // FIXME: what about these?
  // if (result instanceof Ref) {
  //  result = await _.chunks.get(result.$key);
  // }

  if (Is.func(result) && !result.name) {
    result = await result.apply(undefined, ctx);
  }

  if (Is.arr(result) /* && !result[REF_CHUNK] */) {
    result = await Promise.all(result.map(item => execAsync(item, ctx, _)));
    // Object.defineProperty(result, REF_CHUNK, { value: 1, enumerable: false });
  }
  return result;
}

export const executeAsync = (loader, callback) => execute(loader, callback, execAsync);
