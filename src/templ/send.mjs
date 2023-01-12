import {
  Is, sleep, dashCase,
} from '../utils/server.mjs';

import { ents } from '../render/hooks.mjs';

export function decorate(ctx, vnode, hooks, selectors) {
  if (hooks.length) {
    hooks.forEach(fn => {
      const state = {};
      const key = `${ctx.uuid}/${vnode[1]['@location'].split(':')[0]}/${ctx.depth}`;
      const hook = fn[0]({
        ctx,
        key,
        vnode,
        state,
        hook: fn[1],
        props: vnode[1],
        children: vnode[2],
      });

      if (Is.func(hook) && ctx.conn.store) {
        ctx.conn.store.set(`${fn[1]}@${key}?data`, JSON.stringify(state));
        ctx.conn.store.set(`${fn[1]}@${key}?mod`, hook.toString());
      }

      vnode[1]['@enhance'] = true;
      vnode[1][`@use:${dashCase(fn[1])}`] = key;
    });
  }

  if (ctx.is_json) {
    if (vnode[1]['@html']) {
      vnode[1]['@html'] = ents(vnode[1]['@html']);
    }
    if (vnode[0] === 'textarea') {
      vnode[2] = vnode[2].map(ents);
    }
  }

  if (selectors) {
    selectors.add(`!${vnode[0]}`);

    if (vnode[1].id) {
      selectors.add(`#${vnode[1].id}`);
    }

    if (vnode[1].class) {
      vnode[1].class.split(' ').forEach(x => selectors.add(`.${x}`));
    }

    Object.keys(vnode[1]).forEach(key => {
      if (key === 'ref' || key.charAt() === '@') return;
      selectors.add(`@${key}`);
    });
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

export async function consume(ctx, self, append, callback) {
  let interval = 0;
  let timeout = 50;
  let limit = 100;
  let mode = 'append';
  let frame;
  if (self.chunk) {
    if (self.props.frame) frame = true;
    if (self.props.mode) mode = self.props.mode;
    if (self.props.limit > 0) limit = self.props.limit;
    if (self.props.timeout > 0) timeout = self.props.timeout;
    if (self.props.interval > 0) interval = self.props.interval;
  }

  let done;
  setTimeout(() => { done = true; }, timeout);

  self.result[self.key] = [];

  function push(item) {
    self.result[self.key][mode === 'prepend' ? 'unshift' : 'push'](item);
  }

  ctx.subscribe(self.handler.component.src, self.name, {
    cancel() {
      ctx.unsubscribe(self.handler.component.src, self.name, self.depth);
      clearTimeout(timeout);
      timeout = undefined;
      done = true;
    },
    accept(ws) {
      ctx.accept(self.handler.component.src, self.name, self.depth, self.handler, ws);
      clearTimeout(timeout);
      timeout = undefined;
      return true;
    },
  }, self.depth);

  let cancelled;
  let finished;
  let i = 0;
  if (Is.iterable(self.value)) {
    for await (const item of self.value) {
      if (frame) done = true;
      if (i++ >= limit) done = true;
      if (!done) cancelled = push(item);
      else if (process.headless || cancelled === true) break;
      else {
        if (!finished) append(finished = true, item);
        if (interval > 0) await sleep(interval);
        if (Is.func(callback)) cancelled = callback() || append(ctx, item);
        else break;
      }
    }
    if (Is.func(callback)) callback();
  } else if (Is.store(self.value)) {
    const end = self.value.subscribe(async item => {
      if (frame) done = true;
      if (i++ >= limit) done = true;
      if (!done) cancelled = push(item);
      else if (process.headless || cancelled === true) end();
      else {
        if (!finished) append(finished = true, item);
        if (interval > 0) await sleep(interval);
        if (Is.func(callback)) cancelled = callback() || append(ctx, item);
        else end();
      }
    });
  }
}

export async function streamify(ctx, depth, result, invoke, handler, callback) {
  const keys = Object.keys(result);
  const frags = {};

  // we could match more than one fragments at once, right?
  Object.entries(handler.fragments).forEach(([k, v]) => {
    keys.forEach(key => {
      if (v.scope && v.scope.includes(key)) frags[key] = { key: k, frag: v };
    });
  });

  return Promise.all(keys.map(async key => {
    if (key.charAt() === '@' || key === '$$props' || key === '$$slots') return;

    let value = result[key];
    if (value && (Is.thenable(value) || Is.generator(value))) {
      value = result[key] = await (Is.factory(value) ? value() : value);
    }

    if (Is.store(value) && Object.isFrozen(value)) {
      result[key] = value.current;
      return;
    }

    let dynamic;
    if (value && (Is.store(value) || Is.iterable(value))) {
      dynamic = !Is.arr(value);

      let props;
      let chunk;
      let name;
      if (frags[key]) {
        name = frags[key].key;
        props = await invoke(ctx, { render: frags[key].frag.attributes, depth }, result);
        chunk = { slots: handler.component._slots, render: frags[key].frag.template };
      }

      return new Promise(next => {
        const values = [];

        let flushed;
        async function flush(data) {
          if (!chunk) return;
          if (ctx.conn && ctx.conn.aborted) return;
          if (ctx.socket && ctx.socket.closed) return;
          if (ctx.socket && ctx.socket.identity !== ctx.uuid) return;
          flushed = true;

          await ctx.send(key, data, ctx.uuid, chunk, `${handler.component.src}/${depth}/${name}`, props, result);
        }

        let r;
        function retry(data) {
          clearTimeout(r);
          r = setTimeout(() => {
            if (ctx.socket) flush(data);
            else if (!ctx.done) retry(data);
          }, 60);
        }

        let d;
        let p;
        function send() {
          clearTimeout(d);
          let c = 50;
          d = setTimeout(function tick() {
            if (ctx.socket && !flushed) {
              retry(values.splice(0, values.length));
              return;
            }
            if (c-- > 0 && !flushed) {
              clearTimeout(p);
              p = setTimeout(tick, 200);
            }
          });
        }

        let ready;
        let done;
        let t;
        callback(ctx, {
          key, name, value, result, props, depth, chunk, invoke, handler,
        }, (evt, item) => {
          if (ctx.conn && ctx.conn.aborted) return true;
          if (ctx.socket && ctx.socket.identity !== ctx.uuid) return true;

          if (props && props.frame) {
            if (evt !== true) flush([item]);
            return;
          }

          if (values.length > 1000) return true;
          if (!chunk || ctx.done) return true;
          if (!ctx.socket) {
            if (evt !== true) values.push(item);
          } else if (chunk) {
            if (ctx.socket.closed) return true;
            if (evt !== true) values.push(item);
            if (values.length) flush(values.splice(0, values.length));
            if (!ready) ready = ctx.connect(handler.component.src, name, depth, ctx.socket);
          }
        }, () => {
          if (!done) {
            done = true;
            next();
          }

          if (ctx.socket === false) return true;
          if (ctx.socket && ctx.socket.closed) return true;
          if (ctx.socket && ctx.socket.identity !== ctx.uuid) return true;
          if (values.length && !ctx.socket && !dynamic) {
            retry(values.splice(0, values.length));
          } else {
            clearTimeout(t);
            t = setTimeout(send, 200);
          }
          return ctx.done;
        });
      });
    }
  }));
}
