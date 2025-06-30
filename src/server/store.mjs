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
