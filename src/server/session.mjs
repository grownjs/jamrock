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

export async function createSession(store, sid) {
  return {
    verifyToken: store.verify,
    nextToken: store.encode,
    session: await store.read(sid),
    sid: await store.key(sid),
  };
}
