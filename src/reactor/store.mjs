import {
  get as peek,
  readable as read,
  writable as write,
} from 'svelte/store';

export {
  get,
  derived,
} from 'svelte/store';

export function isStore(value) {
  return value && !!value.__store_value;
}

export function writable(...args) {
  const target = write(...args);

  Object.defineProperty(target, '__store_value', { value: true });
  Object.defineProperty(target, 'current', {
    get: () => peek(target),
    set: v => target.set(v),
  });
  return target;
}

export function readable(...args) {
  const target = read(...args);

  Object.defineProperty(target, '__store_value', { value: true });
  Object.defineProperty(target, 'current', { get: () => peek(target) });
  return target;
}

export function connect(update, callback) {
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
  const store = connect(ctx => {
    const temp = typeof ctx.session[key] !== 'undefined'
      && ctx.session[key] !== null ? ctx.session[key] : null;

    if (typeof value === 'function') return value(temp);
    return temp === null ? value : temp;
  }, (ctx, _next) => {
    ctx.put_session(key, _next);
  });

  return store;
}
