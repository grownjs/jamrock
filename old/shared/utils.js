import { rewrite as reImport } from 'rewrite-imports';

const RE_FIXED_IMPORTS = /\n\s+import\b/g;
const RE_MATCH_IMPORTS = /import[^]+?from.*?[\n;]/;

export function identifier(prefix) {
  const hash = `x${Math.random().toString(36).substr(2, 7)}`;

  return prefix ? [prefix.replace(/[^a-zA-Z\d]/g, '-'), hash] : hash;
}

export function imports(code, loader) {
  let temp = code;
  let offset = 0;
  let matches;
  // eslint-disable-next-line no-cond-assign
  while (matches = temp.match(RE_MATCH_IMPORTS)) {
    temp = temp.replace(matches[0], matches[0].replace(/\S/g, ' '));
    offset = matches.index + matches[0].length;
  }

  const prelude = code.substr(0, offset);
  const fixed = prelude.replace(RE_FIXED_IMPORTS, '\nimport ');

  return code.replace(prelude, reImport(fixed, loader));
}

export function empty(value) {
  if (Array.isArray(value)) return value.every(empty);
  if (typeof value === 'undefined' || value === null) return true;
  return typeof value === 'string' && value.trim() === '';
}

export function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function encode(value, unsafe) {
  return unsafe
    ? value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function isUpper(value) {
  return value.charCodeAt() >= 65 && value.charCodeAt() <= 90;
}

export function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function isVNode(value) {
  if (!Array.isArray(value)) return false;
  if (typeof value[0] !== 'string') return false;
  if (typeof value[1] !== 'object' || Array.isArray(value[1])) return false;
  return true;
}

export function isFunction(value) {
  return typeof value === 'function' && value.constructor.name !== 'Function';
}

export function isIterable(value) {
  return typeof value === 'object' && (
    typeof value[Symbol.iterator] === 'function'
    || Object.prototype.toString.call(value) === '[object AsyncGenerator]'
  );
}

export function isThenable(value) {
  return value instanceof Promise
    || (typeof value === 'object'
      && typeof value.then === 'function'
      && typeof value.catch === 'function');
}

export function isGenerator(value) {
  return /\[object Generator|GeneratorFunction\]/.test(Object.prototype.toString.call(value));
}
