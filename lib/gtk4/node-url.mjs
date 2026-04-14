const GLib = imports.gi.GLib;

const _URL = typeof URL !== 'undefined' ? URL : class URL {
  constructor(url) {
    const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
    this.href = url;
    this.protocol = uri.get_scheme() + ':';
    this.host = uri.get_host();
    this.hostname = uri.get_host();
    this.port = uri.get_port();
    this.pathname = uri.get_path();
    this.search = uri.get_query();
    this.hash = uri.get_fragment();
  }
};

const _URLSearchParams = typeof URLSearchParams !== 'undefined' ? URLSearchParams : class URLSearchParams {
  constructor(value) {
    this.params = GLib.Uri.parse_params(value, -1, '&', GLib.UriParamsFlags.NONE);
  }
  get(key) {
    return this.params[key];
  }
  toString() {
    return Object.entries(this.params).map(([k, v]) => `${k}=${v}`).join('&');
  }
};

export default {
  parse: (urlStr) => {
    try {
      const url = new _URL(urlStr);
      return {
        href: urlStr,
        protocol: url.protocol,
        host: url.host,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      };
    } catch {
      return null;
    }
  },
  format: (urlObj) => {
    if (typeof urlObj === 'string') return urlObj;
    return urlObj.href || '';
  },
  resolve: (from, to) => {
    if (to.startsWith('/')) return to;
    if (to.includes('://')) return to;
    return from.replace(/[^/]*$/, '') + to;
  },
  URL: _URL,
  URLSearchParams: _URLSearchParams,
};
