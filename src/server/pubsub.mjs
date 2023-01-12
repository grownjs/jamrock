export class MemoryHub {
  constructor() {
    this.callbacks = new Map();
    this.pending = new Map();
  }

  refresh(key, fn) {
    if (this.pending.has(key)) {
      const q = this.pending.get(key);
      this.pending.delete(key);
      q.forEach(_ => fn(..._, true));
    }
  }

  listen(key, fn) {
    this.callbacks.set(key, fn);
    this.refresh(key, fn);
  }

  emit(key, ...args) {
    const fn = this.callbacks.get(key);

    if (!fn) {
      const q = this.pending.get(key) || [];
      if (!this.pending.has(key)) this.pending.set(key, q);
      q.push(args);
      return;
    }

    this.refresh(key, fn);
    fn(...args);
  }

  off(key) {
    this.callbacks.delete(key);
    this.pending.delete(key);
  }
}

export function createQueue(options) {
  const queue = options.pubsub || new MemoryHub();

  function unsubscribe(key) {
    return queue.off(key);
  }

  function subscribe(key, fn) {
    return queue.listen(key, fn);
  }

  function publish(key, ...args) {
    return queue.emit(key, ...args);
  }

  return {
    unsubscribe,
    subscribe,
    publish,
  };
}
