export class MemoryHub {
  constructor(options) {
    this.timeout = options.ttl ?? 1000 * 60 * 5;
    this.cache = new Map();
    this.ttls = {};
  }

  clear(uuid) {
    this.cache.delete(uuid);
  }

  read(uuid) {
    return this.cache.get(uuid);
  }

  peek(uuid, key, or) {
    const set = this.cache.get(uuid) || {};
    const data = set[key] ?? or;
    delete set[key];
    return data;
  }

  save(uuid, key, data) {
    const set = this.cache.get(uuid) || {};
    set[key] = JSON.stringify(data);
    this.cache.set(uuid, set);
    clearTimeout(this.ttls[`${uuid}@${key}`]);
    this.ttls[`${uuid}@${key}`] = setTimeout(() => { delete set[key]; }, this.timeout);
  }
}

export function createQueue(options) {
  const queue = options.pubsub || new MemoryHub(options);

  function fetch(uuid, key) {
    return queue.peek(uuid, key);
  }

  function keys() {
    return [...queue.cache.keys()];
  }

  function set(uuid, key, data) {
    queue.save(uuid, key, data);
  }

  function get(uuid) {
    const all = queue.read(uuid) || null;
    queue.clear(uuid);
    return all;
  }

  return {
    fetch,
    keys,
    get,
    set,
  };
}
