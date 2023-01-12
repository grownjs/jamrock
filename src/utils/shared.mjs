const RE_DASH_CASE = /-([a-z])/g;
const RE_CAMEL_CASE = /(?<=[a-z])[A-Z]/;
const RE_FIXED_NAMES = /^[a-zA-Z][\w:-]*$/;

export class Is {
  static num(value) {
    return typeof value === 'number';
  }

  static tag(value) {
    return Is.str(value) && RE_FIXED_NAMES.test(value);
  }

  static value(value) {
    if (value === null) return true;
    if (value instanceof Date) return true;
    if (value instanceof Symbol) return true;
    if (value instanceof String) return true;
    if (value instanceof Number) return true;
    if (value instanceof Boolean) return true;
    return Is.scalar(value);
  }

  static vnode(value) {
    return Is.arr(value) && Is.tag(value[0]) && Is.plain(value[1]);
  }

  static empty(value) {
    if (Is.arr(value)) return value.every(Is.empty);
    if (Is.not(value)) return true;
    return Is.str(value) && value.trim() === '';
  }

  static iterable(value) {
    if (Object.isFrozen(value)) return;
    return typeof value === 'object' && (
      Is.func(value[Symbol.iterator])
      || Object.prototype.toString.call(value) === '[object AsyncGenerator]'
    );
  }
}

export const noop = () => {};

export function pick(obj, keys) {
  return Object.keys(obj).reduce((memo, key) => {
    if ((!keys || key.charAt() === '@' || keys.includes(key)) && typeof obj[key] !== 'undefined' && obj[key] !== null) {
      memo[key] = obj[key];
    }
    return memo;
  }, {});
}

export function merge(target, ...objs) {
  const copy = { ...target };

  objs.forEach(obj => {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] !== 'undefined' && obj[key] !== null) {
        copy[key] = obj[key];
      }
    });
  });
  return copy;
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

export function sleep(n) {
  return new Promise(ok => setTimeout(ok, n));
}

export function repeat(char, length) {
  return Array.from({ length }).join(char);
}

export function toProps(value) {
  return Is.arr(value) ? value : [].concat(...Object.entries(value));
}

export function ucFirst(value) {
  return value[0].toUpperCase() + value.substr(1);
}

export function dashCase(value) {
  return value.replace(RE_CAMEL_CASE, '-$&').toLowerCase();
}

export function camelCase(value) {
  return value.replace(RE_DASH_CASE, (_, chunk) => chunk.toUpperCase());
}

export function pascalCase(value) {
  return ucFirst(camelCase(value));
}

export function realpath(base, filepath) {
  if (!base) return;

  const resolved = new URL(filepath, `file:${base}`).pathname;

  return resolved.indexOf(base) === 0 ? resolved : resolved.substr(1);
}

export function stringhash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return new Uint32Array([hash])[0].toString(36);
}

export function identifier(prefix, suffix) {
  const hash = suffix
    ? `x${stringhash(suffix)}`
    : `x${Math.random().toString(36).substr(2, 7)}`;

  return prefix ? [prefix.replace(/[^a-zA-Z\d]/g, '-'), hash] : hash;
}
