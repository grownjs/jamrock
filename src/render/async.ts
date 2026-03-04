import { Is } from '../utils/client.ts';
import { execute } from './hooks.ts';

export async function execAsync(chunk: any, ctx: any[]): Promise<any> {
  let result: any = await chunk;

  if (Is.func(result) && !result.name) {
    result = await result.apply(undefined, ctx);
  }

  if (Is.arr(result)) {
    result = await Promise.all(result.map((item: any) => execAsync(item, ctx)));
  }

  return result;
}

export function execSync(chunk: any, ctx: any[]): any {
  if (Is.func(chunk) && !(chunk as Function).name) {
    chunk = (chunk as Function).apply(undefined, ctx);
  }

  if (Is.arr(chunk)) {
    chunk = chunk.map((item: any) => execSync(item, ctx));
  }

  return chunk;
}

// FIXME: here we could inject a cusotm "execute" context
export const executeAsync = (tag: any, loader: any, callback: any) => execute(tag as any, loader as any, callback as any, execAsync);
export const executeSync = (tag: any, loader: any, callback: any) => execute(tag as any, loader as any, callback as any, execSync);
