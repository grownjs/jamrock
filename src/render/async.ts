import { Is } from '../utils/client.ts';
import { execute } from './hooks.ts';

const REACTIVE_TAGS = ['if-block', 'each-block'];

function resolveReactiveVnode(result: any, isSsr: boolean): any {
  if (!Is.arr(result) || result.length < 2 || !REACTIVE_TAGS.includes(result[0])) return result;
  if (!isSsr) return result;

  const [, props] = result;

  if (result[0] === 'if-block') {
    const cond = (props as any).__cond;
    const then = (props as any).__then;
    const else_ = (props as any).__else;
    const branches = (props as any).__branches || [];

    const value = Is.func(cond) ? (cond as Function)() : cond;

    if (value) return then ? then() : undefined;

    for (const block of branches) {
      const branchResult = Is.func(block) ? block() : block;
      if (branchResult) return branchResult;
    }

    return else_ ? else_() : undefined;
  }

  if (result[0] === 'each-block') {
    const subj = (props as any).__subj;
    const body = (props as any).__body;
    const fallback = (props as any).__fallback;

    let items: any[] = [];
    const resolved = Is.func(subj) ? (subj as Function)() : subj;

    if (Is.plain(resolved)) {
      items = Object.entries(resolved);
    } else if (Is.iterable(resolved) || Is.arr(resolved)) {
      items = [...resolved as any];
    } else if (Is.num(resolved)) {
      items = Array.from({ length: resolved as number }, (_, i) => i);
    }

    return items.length
      ? items.map((v: any, i: number) => body(v, i))
      : (fallback && fallback());
  }

  return result;
}

export async function execAsync(chunk: any, ctx: any[], isSsr: boolean = true): Promise<any> {
  let result: any = await chunk;

  if (Is.func(result)) {
    const name = (result as Function).name;
    if (!isSsr && name === '$signal') {
      // Preserve $signal functions for client-side reactivity
    } else if (!name || name === '$signal') {
      // Original: call unnamed functions and $signal in both SSR and client
      result = await result.apply(undefined, ctx);
    }
    // Named functions (not $signal): pass through — original SSR behavior
  }

  if (Is.arr(result)) {
    result = resolveReactiveVnode(result, isSsr);
    result = await Promise.all(result.map((item: any) => execAsync(item, ctx, isSsr)));
  }

  return result;
}

export function execSync(chunk: any, ctx: any[], isSsr: boolean = true): any {
  if (Is.func(chunk)) {
    if (!isSsr && (chunk as Function).name === '$signal') {
      // Preserve $signal functions for client-side reactivity
    } else if (!(chunk as Function).name || (chunk as Function).name === '$signal') {
      // Original behavior: call unnamed functions and $signal
      chunk = (chunk as Function).apply(undefined, ctx);
    } else if (!isSsr) {
      // Client-side: call all named functions
      chunk = (chunk as Function).apply(undefined, ctx);
    }
    // SSR + named function (not $signal): pass through unchanged (original behavior)
  }

  if (Is.arr(chunk)) {
    chunk = resolveReactiveVnode(chunk, isSsr);
    chunk = chunk.map((item: any) => execSync(item, ctx, isSsr));
  }

  return chunk;
}

export const executeAsync = (tag: any, loader: any, callback: any) => execute(tag as any, loader as any, callback as any, execAsync);
export const executeSync = (tag: any, loader: any, callback: any) => execute(tag as any, loader as any, callback as any, execSync);
