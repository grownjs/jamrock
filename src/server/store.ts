export interface StoreOptions {
  ttl?: number;
  store?: Store;
}

export interface Store {
  get(key: string, or?: unknown): unknown | Promise<unknown>;
  set(key: string, value: unknown): void;
  unset(key: string): void;
}

export class MemoryStore implements Store {
  timeout: number;
  cache: Map<string, string>;
  ttls: Record<string, ReturnType<typeof setTimeout>>;

  constructor(options: StoreOptions) {
    this.timeout = options.ttl ?? 1000 * 60 * 5;
    this.cache = new Map();
    this.ttls = {};
  }

  unset(key: string): void {
    this.cache.delete(key);
  }

  get(key: string, or?: unknown): unknown {
    const old = this.cache.get(key);
    return old ? JSON.parse(old) : or;
  }

  set(key: string, value: unknown): void {
    clearTimeout(this.ttls[key]);
    this.cache.set(key, JSON.stringify(value));
    this.ttls[key] = setTimeout(() => {
      this.cache.delete(key);
    }, this.timeout);
  }
}

export function createCache(options: StoreOptions): {
  get: (uuid: string) => Promise<Record<string, unknown> | null>;
  set: (uuid: string, key: string, value: unknown) => Promise<void>;
} {
  const shared = options.store || new MemoryStore(options);

  async function set(uuid: string, key: string, value: unknown): Promise<void> {
    const data = (await shared.get(uuid, {})) as Record<string, unknown>;
    data[key] = value;
    shared.set(uuid, data);
  }

  async function get(uuid: string): Promise<Record<string, unknown> | null> {
    const all = (await shared.get(uuid)) as Record<string, unknown> | null || null;
    shared.unset(uuid);
    return all;
  }

  return {
    get,
    set,
  };
}
