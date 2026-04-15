export function computed(fn) {
  const ctx = () => (globalThis).__JAMROCK_CONTEXT__ || {};
  const obj = {
    valueOf() {
      return fn(ctx());
    },
    toString() {
      return String(this.valueOf());
    },
  };
  return obj;
}

export function session(path, fn) {
  const ctx = () => (globalThis).__JAMROCK_CONTEXT__ || {};
  const obj = {
    valueOf() {
      const parts = path.split('.');
      let value = ctx().session || {};
      for (const part of parts) {
        value = value?.[part];
      }
      return fn(value);
    },
    toString() {
      return String(this.valueOf());
    },
  };
  return obj;
}
