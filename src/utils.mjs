import reExport from 'rewrite-exports';
import { rewrite } from 'rewrite-imports';

const RE_DASH_CASE = /-([a-z])/g;
const RE_FIXED_NAMES = /^[a-zA-Z][\w:-]*$/;
const RE_FIXED_PROPS = /^[a-zA-Z$@][\w:-]*$/;
const RE_FIXED_IMPORTS = /\n\s+import\b/g;
const RE_MATCH_IMPORTS = /import[^]+?from.*?[\n;]/;

const SCALAR_TYPES = ['string', 'number', 'boolean', 'symbol'];

export function rexports(code, defns, ...args) {
  if (defns) {
    if (defns.length > 0) {
      code = code.replace(new RegExp(`(?:^|\\$)(${defns.join('|')})(?:\\b|\\$)`, 'g'), '$1.current');
    }

    code = rexports(code, null, '$$props', 'import', '!', (kind, vars, _, ctx) => {
      if (kind === 'object') {
        return Object.keys(vars).reduce((memo, k) => memo.concat(vars[k]
          ? `${vars[k]} = ${ctx}.${k} || ${vars[k]}`
          : k), []).join(';\n');
      }
      if (!(kind === '*' || kind === 'default')) {
        return `({ ${vars.join(', ')} } = ${ctx})`;
      }
      return vars;
    });
  }
  return reExport(code, ...args);
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

  return code.replace(prelude, rewrite(fixed, loader));
}

export function stack(source, line, col) {
  const lines = source.split('\n');
  const idx = typeof line === 'undefined' ? lines.length : +line;
  const pos = typeof col === 'undefined' ? lines[lines.length - 1].length : +col;

  return lines.concat('')
    .map((x, i) => {
      const num = `   ${i + 1}`.substr(-4);
      const out = [i + 1 === idx ? '⚠' : ' ', num, `| ${x}`].join(' ');
      const length = pos + num.toString().length + 5;

      return i === idx ? `${Array.from({ length }).join('~')}^\n${out}` : out;
    })
    .slice(Math.max(0, idx - 3), Math.max(3, Math.min(lines.length, idx + 3)))
    .join('\n');
}

export function ucFirst(value) {
  return value[0].toUpperCase() + value.substr(1);
}

export function camelCase(value) {
  return value.replace(RE_DASH_CASE, (_, chunk) => chunk.toUpperCase());
}

export function pascalCase(value) {
  return ucFirst(camelCase(value));
}

export function identifier(prefix) {
  const hash = `x${Math.random().toString(36).substr(2, 7)}`;

  return prefix ? [prefix.replace(/[^a-zA-Z\d]/g, '-'), hash] : hash;
}

export function realpath(base, filepath) {
  if (base) {
    const chunks = base.split('/');
    const parts = filepath.split('/');

    if (parts.length <= chunks.length) {
      chunks.pop();
      for (let i = 0; i < parts.length; i += 1) {
        // eslint-disable-next-line no-continue
        if (parts[i] === '.') continue;
        if (parts[i] === '..') chunks.pop();
        else chunks.push(parts[i]);
      }
      return chunks.join('/');
    }
  }
}

export function sleep(n) {
  return new Promise(ok => setTimeout(ok, n));
}

export function repeat(char, length) {
  return Array.from({ length }).join(char);
}

export function flatten(v) {
  return Array.isArray(v)
    ? v.reduce((memo, x) => memo.concat(flatten(x)), []).filter(x => x && String(x).trim().length > 0)
    : v;
}

export function isName(value) {
  return typeof value === 'string' && RE_FIXED_NAMES.test(value);
}

export function isProp(value) {
  return typeof value === 'string' && typeof value === 'string' && RE_FIXED_PROPS.test(value);
}

export function isUpper(value) {
  return value.charCodeAt() >= 65 && value.charCodeAt() <= 90;
}

export function isArray(v) {
  return Array.isArray(v);
}

export function isEmpty(value) {
  if (isArray(value)) return value.every(isEmpty);
  if (typeof value === 'undefined' || value === null) return true;
  return typeof value === 'string' && value.trim() === '';
}

export function isScalar(value) {
  if (value === null) return true;
  if (value instanceof Date) return true;
  if (value instanceof Symbol) return true;
  if (value instanceof String) return true;
  if (value instanceof Number) return true;
  if (value instanceof Boolean) return true;
  if (typeof value === 'function') return false;
  return SCALAR_TYPES.includes(typeof value);
}

export function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]' && typeof value.constructor === 'function';
}

export function isVNode(value) {
  return isArray(value) && isName(value[0]) && isObject(value[1]);
}

export function isFactory(value) {
  return typeof value === 'function' && value.constructor.name !== 'Function' && !value.length;
}

export function isIterable(value) {
  if (Object.isFrozen(value)) return;
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
