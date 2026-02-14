interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

interface RedisOptions {
  [key: string]: unknown;
}

export class RedisStore {
  client: RedisClient;
  options: RedisOptions;

  constructor(redis: RedisClient, options: RedisOptions) {
    this.client = redis;
    this.options = options;
  }

  unset(key: string): void {
    this.client.del(key);
  }

  async get(key: string, or?: unknown): Promise<unknown> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : or;
  }

  set(key: string, data: unknown, expire: number = 10): void {
    this.client.set(key, JSON.stringify(data), { EX: expire });
  }
}

export class RedisHub {
  client: RedisClient;
  options: RedisOptions;
  subscriber: RedisClient;

  constructor(redis: RedisClient, options: RedisOptions, subscriber: RedisClient) {
    this.client = redis;
    this.options = options;
    this.subscriber = subscriber;
  }
}
