const {
  get, derived, writable: _writable, readable: _readable,
} = require('./_store');

function valid(value) {
  return value && !!value.__store_value;
}

function writable(...args) {
  return Object.assign(_writable(...args), {
    __store_value: true,
  });
}

function readable(...args) {
  return Object.assign(_readable(...args), {
    __store_value: true,
  });
}

function conn(update, callback) {
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

function session(key, value) {
  const store = conn(ctx => {
    const temp = typeof ctx.session[key] !== 'undefined' && ctx.session[key] !== null ? ctx.session[key] : null;

    if (typeof value === 'function') return value(temp);
    return temp === null ? value : temp;
  }, (ctx, _next) => {
    ctx.put_session(key, _next);
  });

  return store;
}

module.exports = {
  get,
  conn,
  valid,
  session,
  derived,
  writable,
  readable,
};
