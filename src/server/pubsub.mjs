import { MemoryStore } from './store.mjs';

export function createPubSub(options) {
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
