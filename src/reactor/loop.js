const util = require('util');
const { equals } = require('somedom');
const { get, valid } = require('./store');

function read(value) {
  return valid(value) ? get(value) : value;
}

module.exports = async ($$, props, handler, callback) => {
  const $ = Object.keys(props);
  const ctx = Object.create(null);
  const data = Object.create(null);

  const effs = [];
  const seen = [];
  const track = [];
  const pending = [];

  Object.defineProperty(ctx, '_$', {
    set: v => {
      data.default = data.default || Object.create(null);
      Object.assign(data.default, v);
    },
    get: () => data,
  });

  ctx.$def = (_, obj) => {
    Object.assign(data, obj);
  };

  let skip;
  ctx.$get = (fn, deps) => {
    effs.push({ fn, deps, values: [] });
    skip = fn;
    pending.push(fn());
    skip = null;
  };

  let keys = null;
  ctx.$set = async fn => {
    keys = { fn, deps: [], track: [] };
    track.push(keys);
    return fn();
  };

  $.forEach(k => {
    Object.defineProperty(ctx, k, {
      set: v => {
        if (!(k in data)) {
          v = typeof props[k] !== 'undefined' ? props[k] : v;
        }

        if (keys) {
          keys.deps.push(k);
        }

        let dirty;
        let err;
        try {
          if (valid(data[k])) {
            if (data[k].upgrade && !seen.includes(k)) {
              data[k].upgrade($$);
              seen.push(k);
            }

            if (!data[k].set) {
              err = true;
              throw new Error(`Store value for '${k}' is not writable`);
            } else {
              data[k].set(read(v));
            }
          } else {
            data[k] = v;
          }
        } catch (e) {
          if (err) throw e;
          throw new ReferenceError(`Failed to set '${k}' as '${util.inspect(v)}' (${e.message})`);
        }

        track.filter(x => x.track.includes(k)).forEach(x => x.fn());

        if (keys === null) {
          effs.forEach(x => {
            if (!x.deps.includes(k) || x.locked) return;

            const n = x.deps.length && x.deps.map(_k => read(data[_k]));
            if (!n || (!equals(n, x.values) && x.fn !== skip)) {
              x.values = n;
              x.locked = true;
              dirty = true;
              pending.push(x.fn());
            }
          });
        }
        effs.forEach(x => {
          if (!dirty) delete x.locked;
        });
        keys = null;
      },
      get: () => {
        if (keys) {
          keys.track.push(k);
        }

        try {
          const v = typeof data[k] === 'undefined' ? props[k] : data[k];

          if (valid(v) && v.upgrade) v.upgrade($$);
          return read(v);
        } catch (e) {
          throw new ReferenceError(`Failed to get '${k}'\n${e.stack}`);
        }
      },
    });
  });

  const next = await handler(ctx);

  $.forEach(k => {
    if (!(k in data)) {
      data[k] = props[k];
    }
  });

  if (typeof next === 'function') await next();

  if (callback) await callback(data);
  await Promise.all(pending);

  return { data };
};
