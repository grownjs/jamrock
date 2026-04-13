import { Is } from '../utils/client.ts';

export function str(value: unknown): string {
  if (!Is.value(value)) value = Object.prototype.toString.call(value);
  if (!Is.str(value)) value = (value as any).toString();
  return value as string;
}

export function ents(value: unknown): string {
  return str(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type RunFn = (chunk: unknown, ctx: unknown[]) => unknown;
type LoaderFn = (name: string) => unknown;
type NextFn = (tpl: unknown, props: unknown, loader: LoaderFn, self: ReturnType<typeof createSelf>) => unknown;
type ElementFn = (tag: string, props: Record<string, unknown>, children: unknown) => unknown;

function createSelf(element: ElementFn | null, loader: LoaderFn, next: NextFn, run: RunFn) {
  const self = {
    $: (value: any): unknown => {
      if (value === null || value === false || typeof value === 'undefined') return '';
      if (value.current) value = value.current;
      if (Is.func(value) && value.name === '$signal') value = value();
      if (!Is.scalar(value)) {
        return Is.arr(value)
          ? value.map(self.$).join('')
          : Object.prototype.toString.call(value);
      }
      return Is.str(value) ? ents(value) : value.toString();
    },
    d: (value: unknown): string => {
      if (typeof window === 'undefined') console.debug('E_DEBUG', value);
      return ents(JSON.stringify(value, null, 2));
    },
    r: (value: unknown): unknown => {
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
      if (cond) return run(then(), []);

      const fallback = branches.pop();

      let otherwise: unknown;
      for (const block of branches) {
        const result = block && block();

        if (result) {
          otherwise = result;
          break;
        }
      }

      return run(otherwise || (fallback && fallback()), []);
    },
    map: (subj: any, body: (...args: unknown[]) => unknown, fallback?: () => unknown): unknown => {
      function it(_: unknown, offset: unknown) {
        return run(body, [_, offset]);
      }

      if (Is.plain(subj)) {
        const items = Object.entries(subj);

        return items.length
          ? run(items.map(([k, v]) => it(v, k)), [])
          : run(fallback && fallback(), []);
      }

      let input: unknown[] = [];
      if (subj?.current) subj = subj.current;
      if (Is.iterable(subj) || Is.arr(subj)) input = [...subj];
      else if (Is.num(subj)) input = Array.from({ length: subj }).map((_, i) => i);

      return input.length
        ? run(input.map(it), [])
        : run(fallback && fallback(), []);
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
    const self = createSelf(element, loader, next, run);
    return run(tpl(self, props), []);
  };
};
