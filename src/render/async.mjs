import { Is } from '../utils/client.mjs';
import { execute } from './hooks.mjs';

export async function execAsync(chunk, ctx, _) {
  let result = await chunk;

  if (Is.func(result) && !result.name) {
    result = await result.apply(undefined, ctx);
  }

  if (Is.arr(result)) {
    result = await Promise.all(result.map(item => execAsync(item, ctx, _)));
  }

  return result;
}

export async function execSync(chunk, ctx, _) {
  if (Is.func(chunk) && !chunk.name) {
    chunk = chunk.apply(undefined, ctx);
  }

  if (Is.arr(chunk)) {
    chunk = chunk.map(item => execAsync(item, ctx, _));
  }

  return chunk;
}

export const executeAsync = (tag, loader, callback) => execute(tag, loader, callback, execAsync);
export const executeSync = (tag, loader, callback) => execute(tag, loader, callback, execSync);
