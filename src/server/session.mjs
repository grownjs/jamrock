export class MemoryStore {
  constructor() {
    this.storage = new Map();
    this.timeouts = new Map();
  }

  pop(sid) {
    const value = this.get(sid);
    this.del(sid);
    return value;
  }

  get(sid, or = null) {
    return this.storage.get(sid) || or;
  }

  set(sid, data, expire = 300) {
    clearTimeout(this.timeouts.get(sid));
    this.storage.set(sid, data);
    this.timeouts.set(sid, setTimeout(() => this.del(sid), expire * 1000));
  }

  del(sid) {
    this.storage.delete(sid);
    this.timeouts.delete(sid);
  }
}

export async function createStore(hash, options) {
  const secret = options.secret || '__UNSAFE__';
  const shared = options.store || new MemoryStore();

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
