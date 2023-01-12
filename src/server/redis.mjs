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

  listen(key, fn) {
    this.subscriber.subscribe(key, args => fn(...JSON.parse(args)));
  }

  async emit(key, ...args) {
    if (!this.emitters.has(key)) {
      this.emitters.set(key, { data: [] });
    }

    const state = this.emitters.get(key);

    if (state.ready && !state.locked) {
      if (state.data.length > 0) {
        state.locked = true;

        for (const chunk of state.data.splice(0, state.data.length)) {
          await this.client.publish(key, JSON.stringify(chunk));
        }

        state.locked = false;
        state.data.length = 0;
      }

      await this.client.publish(key, JSON.stringify(args));
    } else {
      state.data.push(args);
      state.ready = state.ready || await this.client.get(key);
    }
  }

  off(key) {
    this.client.unsubscribe(key);
  }
}
