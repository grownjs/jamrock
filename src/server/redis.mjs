export class RedisStore {
  constructor(redis, options) {
    this.client = redis;
    this.options = options;
  }

  async pop(sid) {
    const value = await this.get(sid);
    this.del(sid);
    return value;
  }

  async get(sid, or = null) {
    const data = await this.client.get(sid);
    return data ? JSON.parse(data) : or;
  }

  set(sid, data, expire = 10) {
    this.client.set(sid, JSON.stringify(data), { EX: expire });
  }

  del(sid) {
    this.client.del(sid);
  }
}

export class RedisHub {
  constructor(redis, options, subscriber) {
    this.emitters = new Map();

    this.client = redis;
    this.options = options;
    this.subscriber = subscriber;
  }

  off(key) {
    this.client.unsubscribe(key);
  }
}
