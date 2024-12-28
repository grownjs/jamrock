import {
  Is, sleep, dashCase,
} from '../utils/server.mjs';

// import { ents } from '../render/hooks.mjs';

export function decorate($, ctx, vnode, hooks) {
  if (hooks.length) {
    hooks.forEach(fn => {
      const state = {};
      const key = `${vnode[1]['@location'].split(':')[0]}/${ctx.depth}`;
      const hook = fn[0]({
        ctx,
        key,
        vnode,
        state,
        hook: fn[1],
        props: vnode[1],
        children: vnode[2],
      });

      if (Is.func(hook)) {
        ctx.queue.set(ctx.uuid, `!${key}`, hook.toString());
        ctx.queue.set(ctx.uuid, key, state);

        vnode[1]['@enhance'] = true;
        vnode[1][`@use:${dashCase(fn[1])}`] = key;
      }
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
      vnode[2].unshift(['input', { type: 'hidden', name: '_csrf', value: ctx.conn.csrf_token }]);
    }
  }
}

export function streamify(ctx) {
  function append(key, item) {
    ctx.publish?.(ctx.ref, key, item);
  }

  function peek(key, value) {
    let interval = 0;
    let timeout = 50;
    let limit = 100;
    let mode = 'append';

    const values = [];

    let cancelled;
    let done;
    let t = setTimeout(() => { done = true; }, timeout);

    ctx.streams.set(`${ctx.ref}/${key}`, {
      cancel() {
        clearTimeout(t);
        cancelled = done = true;
      },
      publish(item) {
        append(key, item);
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
          if (this.append(key, item)) break;
        }
      }
      if (process.env.HEADLESS || !done) next(values);
    };

    return new Promise(pull);
  }

  async function wrap(state) {
    const keys = Object.keys(state);
    const values = [];

    for (const key of keys) {
      if (key.charAt() === '@') continue;

      const value = state[key];

      if (value && (Is.thenable(value) || Is.generator(value))) {
        values.push(Promise.resolve()
          .then(() => (Is.factory(value) ? value() : value))
          .then(_ => (Is.iterable(_) ? this.peek(key, _) : _))
          .then(result => { value.current = result; }));
      }
    }

    await Promise.all(values);
    return state;
  }

  return { wrap, peek, append };
}
