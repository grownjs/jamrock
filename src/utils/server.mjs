import { isNot as not, isArray as arr, isPlain as plain, isString as str, isScalar as scalar, isFunction as func } from 'somedom/ssr';

import { Is, toProps } from './shared.mjs';

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
