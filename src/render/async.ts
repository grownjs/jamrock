import { Is } from '../utils/client.ts';
import { execute } from './hooks.ts';

export async function execAsync(chunk: any, ctx: any[], isSsr: boolean = true): Promise<any> {
  let result: any = await chunk;

  if (Is.func(result)) {
    if (!isSsr && result.name === '$signal') {
      // Preserve $signal functions for client-side reactivity
    } else {
      result = await result.apply(undefined, ctx);
    }
  }

  if (Is.arr(result)) {
    result = await Promise.all(result.map((item: any) => execAsync(item, ctx, isSsr)));
  }

  return result;
}

export function execSync(chunk: any, ctx: any[], isSsr: boolean = true): any {
  if (Is.func(chunk)) {
    if (!isSsr && (chunk as Function).name === '$signal') {
      // Preserve $signal functions for client-side reactivity
    } else {
      chunk = (chunk as Function).apply(undefined, ctx);
    }
  }

  if (Is.arr(chunk)) {
    chunk = chunk.map((item: any) => execSync(item, ctx, isSsr));
  }

  return chunk;
}

export const executeAsync = (tag: any, loader: any, callback: any) => execute(tag as any, loader as any, callback as any, execAsync);
export const executeSync = (tag: any, loader: any, callback: any) => execute(tag as any, loader as any, callback as any, execSync);
