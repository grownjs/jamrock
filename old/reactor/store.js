import {
  writable as _writable, readable as _readable,
} from './_store.js';

export {
  get, derived,
} from './_store.js';

export function valid(value) {
  return value && !!value.__store_value;
}

export function writable(...args) {
  return Object.assign(_writable(...args), {
    __store_value: true,
  });
}

export function readable(...args) {
  return Object.assign(_readable(...args), {
    __store_value: true,
  });
}

export function conn(update, callback) {
  const store = writable(null);

  let _self;
  if (callback) {
    store.subscribe(_next => {
      if (_self) callback(_self, _next);
    });
  }

  return Object.assign(store, {
    upgrade: ctx => {
      store.set(update(ctx));
      _self = ctx;
    },
  });
}

export function session(key, value) {
  const store = conn(ctx => {
    const temp = typeof ctx.session[key] !== 'undefined'
      && ctx.session[key] !== null ? ctx.session[key] : null;

    if (typeof value === 'function') return value(temp);
    return temp === null ? value : temp;
  }, (ctx, _next) => {
    ctx.put_session(key, _next);
  });

  return store;
}
