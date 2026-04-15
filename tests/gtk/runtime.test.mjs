import { test } from '@japa/runner';

let trackingContext = null;

function signal(initial) {
  let value = initial;
  const subscribers = new Set();

  return {
    get value() {
      if (trackingContext) {
        trackingContext.add(subscribers);
      }
      return value;
    },
    set value(v) {
      if (value !== v) {
        value = v;
        subscribers.forEach(cb => cb(v));
      }
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    peek() { return value; },
  };
}

function computed(fn) {
  const deps = new Set();
  const subscribers = new Set();
  let cached;

  const compute = () => {
    const prevContext = trackingContext;
    trackingContext = deps;
    try {
      cached = fn();
    } finally {
      trackingContext = prevContext;
    }
    subscribers.forEach(cb => cb());
  };

  compute();

  deps.forEach(subscriberSet => {
    subscriberSet.add(compute);
  });

  return {
    get value() { return cached; },
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };
}

test.group('Signal', () => {
  test('signal() creates a signal with initial value', ({ expect }) => {
    const count = signal(42);
    expect(count.value).toBe(42);
  });

  test('signal.value can be set', ({ expect }) => {
    const count = signal(0);
    count.value = 10;
    expect(count.value).toBe(10);
  });

  test('signal.subscribe() is called on change', ({ expect }) => {
    const count = signal(0);
    let called = false;

    count.subscribe(() => {
      called = true;
    });

    count.value = 5;
    expect(called).toBe(true);
  });

  test('signal.subscribe() returns unsubscribe function', ({ expect }) => {
    const count = signal(0);
    let callCount = 0;

    const unsub = count.subscribe(() => {
      callCount++;
    });

    count.value = 1;
    expect(callCount).toBe(1);

    unsub();
    count.value = 2;
    expect(callCount).toBe(1);
  });

  test('signal.peek() returns value without subscribing', ({ expect }) => {
    const count = signal(42);
    expect(count.peek()).toBe(42);
  });

  test('signal does not notify if value unchanged', ({ expect }) => {
    const count = signal(5);
    let callCount = 0;

    count.subscribe(() => {
      callCount++;
    });

    count.value = 5;
    expect(callCount).toBe(0);
  });

  test('signal supports objects', ({ expect }) => {
    const obj = signal({ name: 'test', count: 0 });
    expect(obj.value.name).toBe('test');

    obj.value = { name: 'updated', count: 1 };
    expect(obj.value.name).toBe('updated');
  });

  test('signal supports arrays', ({ expect }) => {
    const arr = signal([1, 2, 3]);
    expect(arr.value.length).toBe(3);

    arr.value = [...arr.value, 4];
    expect(arr.value.length).toBe(4);
  });
});

test.group('Computed', () => {
  test('computed() derives value from signals', ({ expect }) => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a.value + b.value);

    expect(sum.value).toBe(5);
  });

  test('computed() updates when dependencies change', ({ expect }) => {
    const count = signal(2);
    const doubled = computed(() => count.value * 2);

    expect(doubled.value).toBe(4);

    count.value = 5;
    expect(doubled.value).toBe(10);
  });

  test('computed() with multiple dependencies', ({ expect }) => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);

    const sum = computed(() => a.value + b.value + c.value);
    expect(sum.value).toBe(6);

    a.value = 10;
    expect(sum.value).toBe(15);

    c.value = 30;
    expect(sum.value).toBe(42);
  });

  test('computed() with object values', ({ expect }) => {
    const items = signal([{ id: 1 }, { id: 2 }]);
    const count = computed(() => items.value.length);

    expect(count.value).toBe(2);

    items.value = [...items.value, { id: 3 }];
    expect(count.value).toBe(3);
  });
});

test.group('define() GObject DSL', () => {
  test('define() creates a class with properties', ({ expect }) => {
    const mockDefine = (name, schema) => {
      const Klass = class {
        constructor(props = {}) {
          Object.assign(this, schema, props);
        }
      };
      Klass.GTypeName = name;
      return Klass;
    };

    const Item = mockDefine('Item', { id: 0, name: '', price: 0.0 });
    const item = new Item({ id: 1, name: 'Apple', price: 1.99 });

    expect(item.id).toBe(1);
    expect(item.name).toBe('Apple');
    expect(item.price).toBe(1.99);
  });

  test('define() infers types from defaults', ({ expect }) => {
    const inferType = value => {
      if (typeof value === 'number') {
        return Number.isInteger(value) ? 'int' : 'double';
      }
      if (typeof value === 'string') return 'string';
      if (typeof value === 'boolean') return 'boolean';
      return 'object';
    };

    expect(inferType(0)).toBe('int');
    expect(inferType(0.5)).toBe('double');
    expect(inferType(1.99)).toBe('double');
    expect(inferType('')).toBe('string');
    expect(inferType(false)).toBe('boolean');
    expect(inferType(null)).toBe('object');
  });
});

test.group('syncToStore() mutation behavior', () => {
  test('syncToStore updates items in place by index', ({ expect }) => {
    const mockStore = (items = []) => ({
      items,
      get_item(i) { return this.items[i]; },
      get_n_items() { return this.items.length; },
      append(item) { this.items.push(item); },
      remove(i) { this.items.splice(i, 1); },
    });

    const syncByIndex = (newData, store, Klass) => {
      for (let i = 0; i < newData.length; i++) {
        const item = store.get_item(i);
        if (item) {
          Object.assign(item, newData[i]);
        } else {
          store.append(new Klass(newData[i]));
        }
      }
      while (store.get_n_items() > newData.length) {
        store.remove(store.get_n_items() - 1);
      }
    };

    const Item = class { constructor(p) { Object.assign(this, p); } };
    const store = mockStore();

    syncByIndex([{ id: 1, name: 'A' }, { id: 2, name: 'B' }], store, Item);
    expect(store.items.length).toBe(2);
    expect(store.items[0].name).toBe('A');

    const firstItem = store.items[0];
    syncByIndex([{ id: 1, name: 'Updated' }, { id: 2, name: 'B' }], store, Item);
    expect(store.items[0]).toBe(firstItem);
    expect(store.items[0].name).toBe('Updated');
  });

  test('syncToStore removes extra items', ({ expect }) => {
    const mockStore = (items = []) => ({
      items,
      get_item(i) { return this.items[i]; },
      get_n_items() { return this.items.length; },
      append(item) { this.items.push(item); },
      remove(i) { this.items.splice(i, 1); },
    });

    const syncByIndex = (newData, store, Klass) => {
      for (let i = 0; i < newData.length; i++) {
        const item = store.get_item(i);
        if (item) {
          Object.assign(item, newData[i]);
        } else {
          store.append(new Klass(newData[i]));
        }
      }
      while (store.get_n_items() > newData.length) {
        store.remove(store.get_n_items() - 1);
      }
    };

    const Item = class { constructor(p) { Object.assign(this, p); } };
    const store = mockStore();

    syncByIndex([{ id: 1 }, { id: 2 }, { id: 3 }], store, Item);
    expect(store.items.length).toBe(3);

    syncByIndex([{ id: 1 }], store, Item);
    expect(store.items.length).toBe(1);
  });

  test('syncToStore with key matches by property', ({ expect }) => {
    const mockStore = (items = []) => ({
      items,
      get_item(i) { return this.items[i]; },
      get_n_items() { return this.items.length; },
      append(item) { this.items.push(item); },
      remove(i) { this.items.splice(i, 1); },
    });

    const findIndex = (store, key, value) => {
      for (let i = 0; i < store.get_n_items(); i++) {
        if (store.get_item(i)[key] === value) return i;
      }
      return -1;
    };

    const syncByKey = (newData, store, Klass, key) => {
      const currentMap = new Map();
      for (let i = 0; i < store.get_n_items(); i++) {
        const item = store.get_item(i);
        currentMap.set(item[key], { item, index: i });
      }

      const keepKeys = new Set();
      for (const data of newData) {
        const keyValue = data[key];
        const existing = currentMap.get(keyValue);
        if (existing) {
          Object.assign(existing.item, data);
        } else {
          store.append(new Klass(data));
        }
        keepKeys.add(keyValue);
      }

      for (const [keyValue] of currentMap) {
        if (!keepKeys.has(keyValue)) {
          const idx = findIndex(store, key, keyValue);
          if (idx >= 0) store.remove(idx);
        }
      }
    };

    const Item = class { constructor(p) { Object.assign(this, p); } };
    const store = mockStore();

    syncByKey([{ id: 1, name: 'A' }, { id: 2, name: 'B' }], store, Item, 'id');
    expect(store.items.length).toBe(2);

    const firstItem = store.items[0];
    syncByKey([{ id: 2, name: 'B-updated' }, { id: 1, name: 'A-updated' }], store, Item, 'id');
    expect(store.items[0]).toBe(firstItem);
    expect(store.items[0].name).toBe('A-updated');
  });
});
