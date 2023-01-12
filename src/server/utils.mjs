export { default as colors } from '../chalk.mjs';

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
