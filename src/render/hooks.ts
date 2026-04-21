import { Is, isSignal } from '../utils/client.ts';

export function str(value: unknown): string {
  if (!Is.value(value)) value = Object.prototype.toString.call(value);
  if (Is.func(value)) value = (value as Function)();
  if (!Is.str(value)) value = (value as any).toString();
  return value as string;
}

export function ents(value: unknown): string {
  return str(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type RunFn = (chunk: unknown, ctx: unknown[], isSsr?: boolean) => unknown;
type LoaderFn = (name: string) => unknown;
type NextFn = (tpl: unknown, props: unknown, loader: LoaderFn, self: ReturnType<typeof createSelf>) => unknown;
type ElementFn = (tag: string, props: Record<string, unknown>, children: unknown) => unknown;

function createSelf(element: ElementFn | null, loader: LoaderFn, next: NextFn, run: RunFn, isSsr: boolean) {
  let _blockIdx = 0;
  const self = {
    _: (fn: () => unknown) => {
      (fn as any).__reactive = true;
      return fn;
    },
    $: (value: any): unknown => {
      if (value === null || value === false || typeof value === 'undefined') return '';
      if (isSignal(value)) {
        if (!isSsr) return value;
        value = value.value;
      } else if (value !== null && typeof value === 'object' && 'value' in value && typeof value.value !== 'function') {
        if (!isSsr) return value;
        value = value.value;
      }
      if (value.current) value = value.current;
      if (Is.func(value) && value.name === '$signal') value = value();
      if (!Is.scalar(value)) {
        return Is.arr(value) ? value.map(self.$).join('') : Object.prototype.toString.call(value);
      }
      return Is.str(value) ? ents(value) : value.toString();
    },
    d: (value: unknown): string => {
      if (typeof window === 'undefined') console.debug('E_DEBUG', value);
      return ents(JSON.stringify(value, null, 2));
    },
    r: (value: unknown, _tag: string = 'fragment'): unknown => {
      if (Is.empty(value)) return;
      return Is.func(value) ? value : () => value;
    },
    e: (tag: string, props: Record<string, unknown>, children: unknown): unknown => {
      return element ? element(tag, props, children) : [tag, props, children];
    },
    h: (value: unknown, tag: string = 'fragment'): unknown => {
      return Is.arr(value) ? value : [tag, { '@html': String(value) }];
    },
    s: (value: unknown, tag: string = 'fragment'): unknown => {
      return [tag, { 'd:html': value, tag }];
    },
    if: (cond: unknown, then: () => unknown, ...branches: Array<(() => unknown) | undefined>): unknown => {
      const isReactive = Is.func(cond) && (cond as any).__reactive;
      if (isReactive && !isSsr) {
        return ['if-block', {
          __cond: cond,
          __then: then,
          __else: branches.pop(),
          __branches: branches.filter(Boolean),
          __index: _blockIdx++,
        }, []];
      }

      let value: any;
      if (Is.func(cond)) {
        value = (cond as Function)();
      } else if (cond !== null && typeof cond === 'object' && 'valueOf' in cond) {
        value = (cond as any).valueOf();
      } else {
        value = cond;
      }

      let result: any;
      if (value) {
        result = then();
      } else {
        const fallback = branches.pop();
        let otherwise: unknown;
        for (const block of branches) {
          const r = block && block();
          if (r) { otherwise = r; break; }
        }
        result = otherwise || (fallback && fallback());
      }

      const resolved = run(result, []);
      if (isReactive && isSsr) {
        return [{ __hydrate: '[' }, ...Array.isArray(resolved) ? resolved : [resolved], { __hydrate: ']' }];
      }
      return resolved;
    },
    map: (subj: any, body: (...args: unknown[]) => unknown, fallback?: () => unknown): unknown => {
      const isReactive = Is.func(subj) && (subj as any).__reactive;
      if (isReactive && !isSsr) {
        return ['each-block', { __subj: subj, __body: body, __fallback: fallback, __index: _blockIdx++ }, []];
      }
      function it(_: unknown, offset: unknown) {
        return run(body, [_, offset]);
      }

      let items: unknown[] = [];
      if (isReactive) {
        let resolved: any;
        try { resolved = (subj as Function)(); } catch { resolved = subj; }
        if (resolved?.value !== undefined && typeof resolved.value !== 'function') resolved = resolved.value;
        if (Is.plain(resolved)) {
          items = Object.entries(resolved);
        } else if (Is.arr(resolved)) {
          items = resolved;
        } else if (Is.iterable(resolved)) {
          try { items = [...resolved as any]; } catch { items = []; }
        } else if (Is.num(resolved)) {
          items = Array.from({ length: resolved as number }, (_, i) => i);
        }
      } else if (Is.plain(subj)) {
        items = Object.entries(subj);
      } else {
        let input: unknown[] = [];
        if (subj?.current) subj = subj.current;
        if (subj?.value !== undefined && typeof subj.value !== 'function') subj = subj.value;
        if (Is.iterable(subj) || Is.arr(subj)) input = [...subj];
        else if (Is.num(subj)) input = Array.from({ length: subj }).map((_, i) => i);
        items = input;
      }

      const result = items.length ? items.map(it) : (fallback && fallback());
      const resolved = run(result, []);
      if (isReactive && isSsr) {
        return [{ __hydrate: '[' }, ...Array.isArray(resolved) ? resolved : [resolved], { __hydrate: ']' }];
      }
      return resolved;
    },
    block: (tpl: unknown, name: string, props: Record<string, unknown>, _children?: unknown): unknown => {
      if (!tpl) throw new Error(`Missing '${name}' component`);
      if (_children) props.children = () => _children;

      return run(next(tpl, props, loader, self), []);
    },
  };
  return self;
}

export const execute = (element: ElementFn | null, loader: LoaderFn, next: NextFn, run: RunFn) => {
  return (tpl: Function, props: unknown, label: string = 'unknown') => {
    if (!tpl) {
      throw new TypeError(`Invalid template (${label})`);
    }
    const isSsr = element !== null;
    const wrappedRun: RunFn = (chunk, ctx) => run(chunk, ctx, isSsr);
    const self = createSelf(element, loader, next, wrappedRun, isSsr);
    return wrappedRun(tpl(self, props), []);
  };
};
