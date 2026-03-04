import mime from 'mime/lite';
import { isNot as not, isArray as arr, isPlain as plain, isString as str, isScalar as scalar, isFunction as func } from 'somedom/ssr';
import { Is } from './base.ts';

export { COLORS as $ } from '../chalk.js';
export { default as glob2re } from 'glob-to-regexp';
export { format, enable, disable, findAll, encodeText, decodeEnts, parseMarkup, markupAdapter } from 'somedom/ssr';

const STACK_TRACE: Array<(error: unknown, kind: string, label: string) => Promise<unknown>> = [];

export function dump(...args: unknown[]): void {
  if (typeof logError !== 'undefined') {
    for (const e of args) {
      if (e instanceof Error) {
        // eslint-disable-next-line no-undef
        logError(e);
      } else {
        // eslint-disable-next-line no-undef
        log(e);
      }
    }
  } else {
    console.debug(...args);
  }
}

export async function trace(e: any, kind?: string, label?: string): Promise<void> {
  kind = kind || 'E_UNKNOWN';
  label = label || e.message || 'Unknown error';

  let error: unknown = e;
  if (STACK_TRACE.length > 0) {
    try {
      for (let c = STACK_TRACE.length; c > 0; c--) {
        dump('E_TRACE', error, kind, label);
        error = await STACK_TRACE[c]?.(error as Error, kind, label);
      }
    } catch (_e) {
      dump('E_FATAL', _e, e, error, kind, label);
    }
  } else {
    dump('E_TRACE', error, kind, label);
  }
}

export function onTrace(fn: (error: unknown, kind: string, label: string) => Promise<unknown>): void {
  if (typeof fn === 'function' && !STACK_TRACE.includes(fn)) STACK_TRACE.push(fn);
}

function upper(value: string): boolean {
  return value.charCodeAt(0) >= 65 && value.charCodeAt(0) <= 90;
}

function blank(value: string): boolean {
  return value === '' || (value.includes('\n') && !value.trim().length);
}

function generator(value: unknown): boolean {
  return /\[object Generator|GeneratorFunction\]/.test(Object.prototype.toString.call(value));
}

const _Is = Object.assign(Is, {
  not,
  str,
  arr,
  func,
  plain,
  scalar,
  upper,
  blank,
  generator,
  factory(value: unknown): boolean {
    return _Is.func(value) && (value as Function).constructor.name !== 'Function' && !(value as Function).length;
  },
  thenable(value: unknown): boolean {
    return value instanceof Promise
      || (typeof value === 'object'
        && _Is.func((value as any).then)
        && _Is.func((value as any).catch));
  },
});

export * from './shared.ts';
export { _Is as Is };

export function mimeType(file: string): string {
  return mime.getType(file) || 'application/octet-stream';
}

export function concat(a: string, b: string): string {
  return ((a === '/' ? '' : a) + b).replace(/\/$/, '');
}

export function rtrim(value: string): string {
  return value.replace(/\/$/, '');
}

export function flag(value: string, argv: string[], or?: string): string | boolean | undefined {
  const offset = argv.indexOf(`--${value}`);
  const next = argv[offset + 1] || '';

  if (argv.includes(`--no${value}`)) return false;
  return offset > 0 && next.indexOf('--') !== 0 ? next || or : or;
}

export function list(value: string, argv: string[], or?: string[]): string[] | undefined {
  const offset = argv.indexOf(`--${value}`);
  const values: string[] = [];

  if (offset > 0) {
    for (let i = offset; i < argv.length; i++) {
      const [k, v] = argv[i].split('=');
      const next = v?.length > 0 ? v : argv[++i];
      if (typeof next === 'undefined' || next.indexOf('--') === 0) break;
      if (k === `--${value}`) values.push(next);
    }
  }

  return values.length > 0 ? values : or;
}

export function has(value: string, argv: string[]): boolean {
  return argv.includes(`--${value}`);
}

export function fill(value: string, length: number): string {
  return Array.from({ length }).join(value);
}

export function pad(value: string, length: number, direction: number = 1, character: string = ' '): string {
  const padding = fill(character, length);

  // eslint-disable-next-line no-nested-ternary
  return direction > 0
    ? (padding + value).substr(-length)
    : direction < 0
      ? (value + padding).substr(0, length)
      : padding.substr(0, Math.ceil((length - value.length) / 2))
        + value + padding.substr(0, Math.floor((length - value.length) / 2));
}

export function set(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');

  let result: Record<string, unknown> = obj;
  while (keys.length > 1) {
    const key = keys.shift()!;

    result[key] = result[key] || {};
    result = result[key] as Record<string, unknown>;
  }

  if (keys.length > 0) {
    result[keys.shift()!] = value;
  }
}

export function ms(start: number): string {
  const diff = (Date.now() - start);
  const prefix = diff < 1000 ? diff : diff / 1000;
  const suffix = diff < 1000 ? 'ms' : 's';

  return prefix + suffix;
}

declare function logError(e: Error): void;
declare function log(e: unknown): void;
