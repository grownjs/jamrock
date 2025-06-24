import { isNot as not, isArray as arr, isPlain as plain, isString as str, isScalar as scalar, isFunction as func } from 'somedom/ssr';
import mime from 'mime/lite';
import { Is } from './shared.mjs';

export { default as $ } from 'picocolors';

export { format, enable, disable, findAll, encodeText, decodeEnts, parseMarkup, markupAdapter } from 'somedom/ssr';

function upper(value) {
  return value.charCodeAt() >= 65 && value.charCodeAt() <= 90;
}

function blank(value) {
  return value === '' || (value.includes('\n') && !value.trim().length);
}

function factory(value) {
  return Is.func(value) && value.constructor.name !== 'Function' && !value.length;
}

function thenable(value) {
  return value instanceof Promise
    || (typeof value === 'object'
      && Is.func(value.then)
      && Is.func(value.catch));
}

function generator(value) {
  return /\[object Generator|GeneratorFunction\]/.test(Object.prototype.toString.call(value));
}

Object.assign(Is, {
  not, str, arr, func, plain, scalar, upper, blank, factory, thenable, generator,
});

export * from './shared.mjs';

export function mimeType(file) {
  return mime.getType(file);
}

export function concat(a, b) {
  return ((a === '/' ? '' : a) + b).replace(/\/$/, '');
}

export function rtrim(value) {
  return value.replace(/\/$/, '');
}

export function flag(value, argv, or) {
  const offset = argv.indexOf(`--${value}`);
  const next = argv[offset + 1] || '';

  if (argv.includes(`--no${value}`)) return false;
  return offset > 0 && next.indexOf('--') !== 0 ? next || or : or;
}

export function list(value, argv, or) {
  const offset = argv.indexOf(`--${value}`);
  const values = [];

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

export function has(value, argv) {
  return argv.includes(`--${value}`);
}

export function fill(value, length) {
  return Array.from({ length }).join(value);
}

export function pad(value, length, direction = 1, character = ' ') {
  const padding = fill(character, length);

  // eslint-disable-next-line no-nested-ternary
  return direction > 0
    ? (padding + value).substr(-length)
    : direction < 0
      ? (value + padding).substr(0, length)
      : padding.substr(0, Math.ceil((length - value.length) / 2))
        + value + padding.substr(0, Math.floor((length - value.length) / 2));
}

export function set(obj, path, value) {
  const keys = path.split('.');

  let result = obj;
  while (keys.length > 1) {
    const key = keys.shift();

    result[key] = result[key] || {};
    result = result[key];
  }

  if (keys.length > 0) {
    result[keys.shift()] = value;
  }
}

export function ms(start) {
  const diff = (Date.now() - start);
  const prefix = diff < 1000 ? diff : diff / 1000;
  const suffix = diff < 1000 ? 'ms' : 's';

  return prefix + suffix;
}
