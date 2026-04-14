const join = (...args) => {
  let result = args.join('/').replace(/\/+/g, '/');
  if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
  return result || '.';
};

const dirname = (p) => {
  const parts = p.split('/');
  parts.pop();
  if (parts.length === 0) return '.';
  if (parts.length === 1 && parts[0] === '') return '/';
  return parts.join('/');
};

const basename = (p) => p.split('/').pop();

const extname = (p) => {
  const base = p.split('/').pop();
  const idx = base.lastIndexOf('.');
  return idx > 0 ? base.slice(idx) : '';
};

const resolve = (...args) => {
  let result = join(...args);
  if (!result.startsWith('/')) {
    result = join(process.cwd(), result);
  }
  return result;
};

const normalize = (p) => p.replace(/\/+/g, '/').replace(/\/\.$/, '').replace(/\/\//g, '/');

const isAbsolute = (p) => p.startsWith('/');

const relative = (from, to) => {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
  const up = fromParts.length - i;
  return Array(up).fill('..').concat(toParts.slice(i)).join('/') || '.';
};

const parse = (p) => {
  const base = p.split('/').pop();
  const ext = extname(p);
  return {
    root: p.startsWith('/') ? '/' : '',
    dir: dirname(p),
    base,
    ext,
    name: ext ? base.slice(0, -ext.length) : base,
  };
};

export default {
  join,
  dirname,
  basename,
  extname,
  resolve,
  normalize,
  isAbsolute,
  relative,
  parse,
  sep: '/',
  delimiter: ':',
};
