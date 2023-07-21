import {
  get as peek,
  readable as read,
  writable as write,
} from 'svelte/store';

export {
  get,
  derived,
} from 'svelte/store';

import { Is, set } from '../utils/server.mjs';

const STORE_KEY = Symbol('@@store');

Object.assign(Is, { computed: v => v && !!v[STORE_KEY] });

export function writable(...args) {
  const target = write(...args);

  Object.defineProperty(target, STORE_KEY, { value: true });
  Object.defineProperty(target, 'valueOf', { value: () => target.current });
  Object.defineProperty(target, 'current', {
    get: () => peek(target),
    set: v => target.set(v),
  });
  return target;
}

export function readable(...args) {
  const target = read(...args);

  Object.defineProperty(target, STORE_KEY, { value: true });
  Object.defineProperty(target, 'current', { get: () => peek(target) });
  Object.defineProperty(target, 'valueOf', { value: () => target.current });
  return target;
}

export function computed(update, callback) {
  const store = writable(null);

  let _self;
  if (callback) {
    store.subscribe(_next => {
      if (_self) callback(_self, _next);
    });
  }

  return Object.freeze(Object.assign(store, {
    derive: conn => {
      store.set(update(conn));
      _self = conn;
    },
  }));
}

export function session(key, value) {
  const root = key.split('.')[0];
  const store = computed(conn => {
    const temp = typeof conn.session[root] !== 'undefined'
      && conn.session[root] !== null ? conn.session[root] : null;

    if (Is.func(value)) return value(temp);
    return temp === null ? value : temp;
  }, (conn, _next) => set(conn.session, key, _next));

  return store;
}
