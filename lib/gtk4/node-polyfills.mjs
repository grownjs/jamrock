/* eslint-disable no-undef */
const GLib = imports.gi.GLib;

export default {
  util: {
    inspect: obj => String(obj),
    format: (fmt, ...args) => fmt.replace(/%[sdj]/g, () => args.shift()),
    inherits: (ctor, superCtor) => {
      ctor.super_ = superCtor;
      Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
    },
    isDate: d => d instanceof Date,
    isError: e => e instanceof Error,
    types: {},
    TextEncoder,
    TextDecoder,
  },
  url: {
    parse: urlStr => {
      try {
        const uri = GLib.Uri.parse(urlStr, GLib.UriFlags.NONE);
        return {
          href: urlStr,
          protocol: uri.get_scheme(),
          host: uri.get_host(),
          hostname: uri.get_host(),
          port: uri.get_port(),
          pathname: uri.get_path(),
          search: uri.get_query(),
          hash: uri.get_fragment(),
        };
      } catch {
        return null;
      }
    },
    format: urlObj => {
      if (typeof urlObj === 'string') return urlObj;
      return urlObj.href || '';
    },
    resolve: (from, to) => {
      if (to.startsWith('/')) return to;
      if (to.includes('://')) return to;
      return from.replace(/[^/]*$/, '') + to;
    },
    URL,
    URLSearchParams,
  },
  path: {
    join: (...args) => args.join('/').replace(/\/+/g, '/'),
    dirname: p => p.split('/').slice(0, -1).join('/') || '.',
    basename: p => p.split('/').pop(),
    extname: p => {
      const base = p.split('/').pop();
      const idx = base.lastIndexOf('.');
      return idx > 0 ? base.slice(idx) : '';
    },
    resolve: (...args) => GLib.canonicalize_filename(args.join('/'), null),
    normalize: p => p.replace(/\/+/g, '/').replace(/\/\.$/, ''),
    isAbsolute: p => p.startsWith('/'),
    sep: '/',
    delimiter: ':',
  },
  fs: {
    existsSync: p => {
      try {
        return GLib.file_test(p, GLib.FileTest.EXISTS);
      } catch {
        return false;
      }
    },
    readFileSync: p => {
      const [ok, contents] = GLib.file_get_contents(p);
      if (!ok) throw new Error(`ENOENT: no such file or directory, open '${p}'`);
      return new TextDecoder().decode(contents);
    },
    writeFileSync: (p, data) => {
      GLib.file_set_contents(p, new TextEncoder().encode(data));
    },
    mkdirSync: p => {
      GLib.mkdir_with_parents(p, 0o755);
    },
    statSync: p => ({
      isFile: () => GLib.file_test(p, GLib.FileTest.IS_REGULAR),
      isDirectory: () => GLib.file_test(p, GLib.FileTest.IS_DIR),
    }),
  },
};
