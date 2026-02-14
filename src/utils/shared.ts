const RE_DASH_CASE = /[_-]([a-zA-Z])/g;
const RE_CAMEL_CASE = /(?<=[a-z])[A-Z]/;
const RE_TO_SNAKE_CASE = /[_\W]+/g;

let ID_COUNTER = 0;

export const noop = (): void => {};

export function omit<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.keys(obj).reduce((memo, key) => {
    if (!keys.includes(key)) (memo as any)[key] = obj[key];
    return memo;
  }, {} as Partial<T>);
}

export function pick<T extends Record<string, unknown>>(obj: T, keys?: string[]): Partial<T> {
  return Object.keys(obj).reduce((memo, key) => {
    if ((!keys || key[0] === '@' || keys.includes(key)) && typeof obj[key] !== 'undefined' && obj[key] !== null) {
      (memo as any)[key] = obj[key];
    }
    return memo;
  }, {} as Partial<T>);
}

export function merge<T extends Record<string, unknown>>(target: T, ...objs: Record<string, unknown>[]): T {
  const copy = { ...target };

  objs.forEach(obj => {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] !== 'undefined' && obj[key] !== null) {
        (copy as any)[key] = obj[key];
      }
    });
  });
  return copy;
}

export function flatten(v: unknown): unknown {
  return Array.isArray(v)
    ? v.reduce((memo: unknown[], x: unknown) => memo.concat(flatten(x)), []).filter((x: unknown) => x && String(x).trim().length > 0)
    : v;
}

export function stack(source: string, line?: number, col?: number, ok?: boolean): string {
  const lines = source.split('\n');
  const idx = typeof line === 'undefined' ? lines.length : +line;
  const pos = typeof col === 'undefined' ? lines.at(-1)!.length : +col;

  return lines.concat('')
    .map((x, i) => {
      const num = `   ${i + 1}`.substr(-4);
      const out = [i + 1 === idx ? '⚠' : ' ', num, `| ${x}`].join(' ');
      const length = pos + num.toString().length + 5;

      return !ok && i === idx ? `${Array.from({ length }).join('~')}^\n${out}` : out;
    })
    .slice(Math.max(0, idx - 3), Math.max(3, Math.min(lines.length, idx + 3)))
    .join('\n');
}

export function sleep(n: number): Promise<void> {
  return new Promise(ok => setTimeout(ok, n));
}

export function ignore(code: string): string {
  return code.replace(/./g, ' ');
}

export function repeat(char: string, length: number): string {
  return Array.from({ length }).join(char);
}

export function ucFirst(value: string): string {
  return value[0].toUpperCase() + value.substr(1);
}

export function dashCase(value: string): string {
  return value.replace(RE_CAMEL_CASE, '-$&').toLowerCase();
}

export function snakeCase(value: string): string {
  return value.replace(RE_TO_SNAKE_CASE, '_').toLowerCase();
}

export function camelCase(value: string): string {
  return value.replace(RE_DASH_CASE, (_, chunk) => chunk.toUpperCase());
}

export function pascalCase(value: string): string {
  return ucFirst(camelCase(value.replace(/\W/g, '-')));
}

export function stringhash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return new Uint32Array([hash])[0].toString(36);
}

export function identifier(prefix?: string, suffix?: string): any {
  const hash = suffix
    ? `x${stringhash(suffix)}`
    : `x${(
      Date.now() + Math.random() + ID_COUNTER++
    ).toString(36).replace(/\W/g, '').substr(2, 7)}`;

  return prefix ? [prefix.replace(/[^a-zA-Z\d]/g, '-'), hash] : hash;
}
