// @ts-check

import { MemoryStore } from './store.mjs';

export async function createStore(hash, options) {
  const secret = options.secret || '__UNSAFE__';
  const shared = options.store || new MemoryStore(options);

  function encode(value = Date.now()) {
    return hash.encode(value, secret);
  }

  function verify(input, value) {
    return hash.compare(input, value);
  }

  function key(sid) {
    return sid || encode();
  }

  function read(sid) {
    return shared.get(sid, {});
  }

  function write(sid, data, expire = 300) {
    return shared.set(sid, data, expire);
  }

  return {
    shared,
    encode,
    verify,
    write,
    read,
    key,
  };
}

/**
 * @typedef {object} SessionObject
 * @property {function}             verifyToken
 * @property {function}             nextToken
 * @property {Record<string, any>}  state
 * @property {string}               sid
 */

/**
 * @param {any}     store
 * @param {string}  sid
 * @returns {SessionObject}
 */
export function createSessionSync(store, sid) {
  return {
    verifyToken: store.verify,
    nextToken: store.encode,
    state: store.read(sid),
    sid: store.key(sid),
  };
}

/**
 * @param {any}     store
 * @param {string}  sid
 * @returns {Promise<SessionObject>}
 */
export async function createSession(store, sid) {
  return {
    verifyToken: store.verify,
    nextToken: store.encode,
    state: await store.read(sid),
    sid: await store.key(sid),
  };
}
