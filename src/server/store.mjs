// @ts-check

export class MemoryStore {
  constructor(options) {
    this.timeout = options.ttl ?? 1000 * 60 * 5;
    this.cache = new Map();
    this.ttls = {};
  }

  unset(key) {
    this.cache.delete(key);
  }

  get(key, or) {
    const old = this.cache.get(key);
    return old ? JSON.parse(old) : or;
  }

  set(key, value) {
    clearTimeout(this.ttls[key]);
    this.cache.set(key, JSON.stringify(value));
    this.ttls[key] = setTimeout(() => {
      this.cache.delete(key);
    }, this.timeout);
  }
}

export function createCache(options) {
  const shared = options.store || new MemoryStore(options);

  async function set(uuid, key, value) {
    const data = await shared.get(uuid, {});
    data[key] = value;
    shared.set(uuid, data);
  }

  async function get(uuid) {
    const all = await shared.get(uuid) || null;
    shared.unset(uuid);
    return all;
  }

  return {
    get,
    set,
  };
}
