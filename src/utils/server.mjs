import { isNot as not, isArray as arr, isPlain as plain, isString as str, isScalar as scalar, isFunction as func } from 'somedom/ssr';

import { Is, toProps } from './shared.mjs';

export { default as $ } from 'picocolors';

export { enable, disable, findAll, encodeText, parseMarkup, markupAdapter } from 'somedom/ssr';

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

export function cleanJSON(value) {
  return JSON.stringify(value, (_, v) => {
    if (Is.arr(v)) return v.filter(x => !Is.not(x));
    if (Is.plain(v)) return toProps(v);
    return v;
  });
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
