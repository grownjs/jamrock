import { equals } from 'nohooks';
import { Is } from '../utils/server.mjs';

export async function peek(data, context, callback) {
  for (const [k, v] of Object.entries(data)) {
    if (Is.store(v)) {
      if (v.reload) v.reload(context);
      if (Is.func(callback)) callback(v);
    }
    data[k] = v;
  }
  return data;
}

export function resolver(context) {
  const calls = [];
  const values = [];

  const fx = (fn, deps) => values.push({ fn, deps }) && fn();

  const sync = async () => {
    for (const prop of values) {
      const next = await peek(prop.deps(), context);

      if (!equals(prop.value, next)) {
        prop.value = next;
        calls.push(prop.fn());
      }
    }
  };

  const resolve = async (mod, props, source, filepath, importer, timeout, callback) => {
    const { ctx, data } = await mod(props, source, filepath, fx, sync, importer);
    const stores = [];

    for (const prop of values) {
      prop.value = await peek(prop.deps(), context);
    }

    const locals = await peek(data(), context, v => stores.push(new Promise(next => {
      let t;
      const off = v.subscribe(() => {
        clearTimeout(t);
        t = setTimeout(() => next(off()), timeout || 20);
      });
      t = setTimeout(off, timeout || 20);
    })));

    if (Is.func(callback)) await callback(ctx, locals);
    await Promise.all(calls);
    await Promise.all(stores);
    return peek(data(), context);
  };

  return { fx, sync, resolve };
}
