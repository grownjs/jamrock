let currentEffect = null;
const effects = new Set();

export function signal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  const sig = {
    get value() {
      if (currentEffect && !subscribers.has(currentEffect)) {
        subscribers.add(currentEffect);
        currentEffect.deps.add(subscribers);
      }
      return value;
    },
    set value(newValue) {
      if (value !== newValue) {
        value = newValue;
        subscribers.forEach(fn => fn());
      }
    },
    peek: () => value,
    subscribe: fn => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };

  return sig;
}

export function computed(fn) {
  let cached;
  let dirty = true;
  const sig = signal(undefined);

  const compute = () => {
    if (dirty) {
      const prev = currentEffect;
      currentEffect = { deps: new Set() };
      try {
        cached = fn();
        sig.value = cached;
      } finally {
        currentEffect = prev;
      }
      dirty = false;
    }
    return cached;
  };

  const effectFn = () => {
    dirty = true;
    compute();
  };
  effectFn.deps = new Set();

  const prev = currentEffect;
  currentEffect = effectFn;
  try {
    cached = fn();
  } finally {
    currentEffect = prev;
  }

  return {
    get value() { return compute(); },
    peek: () => cached,
    subscribe: sig.subscribe,
  };
}

export function effect(fn) {
  const effectFn = () => {
    const prev = currentEffect;
    currentEffect = effectFn;
    effectFn.deps = new Set();
    try {
      fn();
    } finally {
      currentEffect = prev;
    }
  };

  effectFn.deps = new Set();
  effects.add(effectFn);

  effectFn();

  return () => {
    effectFn.deps.forEach(set => set.delete(effectFn));
    effects.delete(effectFn);
  };
}

export function batch(fn) {
  fn();
}

export function untracked(fn) {
  const prev = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prev;
  }
}

export function scope(value) {
  return { value };
}

export function ref(initialValue) {
  return { current: initialValue };
}
