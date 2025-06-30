export class RedisStore {
  constructor(redis, options) {
    this.client = redis;
    this.options = options;
  }

  unset(key) {
    this.client.del(key);
  }

  async get(key, or) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : or;
  }

  set(key, data, expire = 10) {
    this.client.set(key, JSON.stringify(data), { EX: expire });
  }
}

export class RedisHub {
  constructor(redis, options, subscriber) {
    this.client = redis;
    this.options = options;
    this.subscriber = subscriber;
  }
}
