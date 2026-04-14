import { test } from '@japa/runner';

// Signal implementation (matches src/gtk4/runtime.ts)
function signal(initial) {
  let value = initial;
  const subscribers = new Set();

  return {
    get value() { return value; },
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
    peek() { return value; }
  };
}

function computed(fn, deps) {
  let cached = fn();

  deps.forEach(sig => {
    sig.subscribe(() => {
      cached = fn();
    });
  });

  return {
    get value() { return cached; }
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
    const sum = computed(() => a.value + b.value, [a, b]);
    
    expect(sum.value).toBe(5);
  });

  test('computed() updates when dependencies change', ({ expect }) => {
    const count = signal(2);
    const doubled = computed(() => count.value * 2, [count]);
    
    expect(doubled.value).toBe(4);
    
    count.value = 5;
    expect(doubled.value).toBe(10);
  });

  test('computed() with multiple dependencies', ({ expect }) => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    
    const sum = computed(() => a.value + b.value + c.value, [a, b, c]);
    expect(sum.value).toBe(6);
    
    a.value = 10;
    expect(sum.value).toBe(15);
    
    c.value = 30;
    expect(sum.value).toBe(42);
  });

  test('computed() with object values', ({ expect }) => {
    const items = signal([{ id: 1 }, { id: 2 }]);
    const count = computed(() => items.value.length, [items]);
    
    expect(count.value).toBe(2);
    
    items.value = [...items.value, { id: 3 }];
    expect(count.value).toBe(3);
  });
});
