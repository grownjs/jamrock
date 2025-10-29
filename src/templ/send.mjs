import {
  Is, sleep, dashCase,
} from '../utils/server.mjs';

// import { ents } from '../render/hooks.mjs';

export function decorate($, ctx, vnode, hooks) {
  if (hooks.length) {
    hooks.forEach(fn => {
      if (!Is.func(fn[0]) || !fn[0].$) {
        throw new TypeError(`Unknown function '${fn[0].name}'`);
      }

      const state = {};
      const key = `${fn[0].$}/${ctx.depth}`;

      ctx.cache?.set(ctx.uuid, key, state);

      vnode[1]['@enhance'] = true;
      vnode[1][`@use:${dashCase(fn[1])}`] = key;
    });
  }

  //  if (ctx.is_json) {
  //    if (vnode[1]['@html']) {
  //      vnode[1]['@html'] = ents(vnode[1]['@html']);
  //    }
  //    if (vnode[0] === 'textarea') {
  //      vnode[2] = vnode[2].map(ents);
  //    }
  //  }

  if (vnode[1]['@ref']) {
    Object.values($.scripts).some(set => {
      return set.some(([ref, id]) => {
        if (ref === vnode[1]['@ref']) {
          vnode[1]['@use'] = id;
          return true;
        }
        return false;
      });
    });
    delete vnode[1]['@ref'];
  }

  if (vnode[0] === 'form') {
    if (vnode[1].method && vnode[1].method !== 'GET') {
      if (vnode[1].key) {
        vnode[2].unshift(['input', { type: 'hidden', name: '_key', value: vnode[1].key }]);
        delete vnode[1].key;
      }

      vnode[2].unshift(['input', { type: 'hidden', name: '_self', value: vnode[1]['@source'] }]);

      if (ctx.conn) {
        vnode[2].unshift(['input', { type: 'hidden', name: '_csrf', value: ctx.conn.csrf_token }]);
      }
    }
  }
}

export function streamify(ctx) {
  function peek(key, value, render, fragments) {
    const { attributes } = fragments.find(_ => _.variables.includes(key)) || {};

    let interval = +(attributes?.interval || 0);
    let timeout = +(attributes?.timeout ?? 50);
    let limit = +(attributes?.limit || 100);
    let mode = attributes?.mode || 'append';

    const ref = ctx.ref;
    const values = [];

    let cancelled;
    let done;
    let t = setTimeout(() => { done = true; }, timeout);

    ctx.stream.set(`${ref}/${key}`, {
      cancel() {
        clearTimeout(t);
        cancelled = done = true;
      },
      async publish(item) {
        await ctx.publish?.(ref, key, item, mode, render);
      },
    });

    const push = item => {
      values[mode === 'prepend' ? 'unshift' : 'push'](item);
    };

    const pull = async next => {
      let i = 0;
      for await (const item of value) {
        if (!done && i++ >= limit) {
          next(values);
          done = true;
        }

        if (!done) push(item);
        else if (process.env.HEADLESS || cancelled) break;
        else {
          if (interval > 0) await sleep(interval);
          if (ctx.ready && ctx.socket?.closed) break;
          if (!ctx.ready && ctx.socket) ctx.connect(ctx.socket);
          if (await ctx.publish?.(ref, key, item, mode, render)) break;
        }
      }
      if (process.env.HEADLESS || !done) next(values);
    };

    return new Promise(pull);
  }

  async function wrap(state, render, fragments) {
    const keys = Object.keys(state);
    const values = [];

    for (const key of keys) {
      if (key[0] === '@') continue;

      const value = state[key];

      if (value && (Is.thenable(value) || Is.generator(value))) {
        values.push(Promise.resolve()
          .then(() => (Is.factory(value) ? value() : value))
          .then(_ => (Is.iterable(_) ? peek(key, _, render, fragments) : _))
          .then(result => { value.current = result; }));
      }
    }

    await Promise.all(values);
    return state;
  }

  return Object.assign(new Map(), { wrap });
}
