import {
  isArray, isFactory, isThenable, isIterable, isGenerator,
} from '../utils.mjs';

import { isStore } from '../reactor/store.mjs';

export function decorate(ctx, vnode, hooks) {
  if (hooks.length) {
    hooks.forEach(fn => fn[0](fn[1], ctx, vnode));
  }

  if (vnode[0] === 'form') {
    vnode[2].unshift(['input', { type: 'hidden', name: '_csrf', value: ctx.csrf_token }]);

    if (vnode[1]['data-source']) {
      vnode[2].unshift(['input', { type: 'hidden', name: '_ref', value: vnode[1]['data-source'] }]);
    }

    if (vnode[1]['data-trigger']) {
      vnode[2].push(['noscript', null, [
        ['p', null, 'Please turn on JavaScript to enable this form.'],
      ]]);
    }
  }
}

export async function consume(ctx, self, append, callback) {
  let interval = 0;
  let timeout = 50;
  let limit = 100;
  if (self.chunk) {
    if (self.props.limit > 0) limit = self.props.limit;
    if (self.props.timeout > 0) timeout = self.props.timeout;
    if (self.props.interval > 0) interval = self.props.interval;
  }

  let done;
  setTimeout(() => { done = true; }, timeout);

  self.result[self.key] = [];

  function push(item) {
    self.result[self.key].push(item);
  }

  ctx.subscribe(self.handler.component.src, self.key, {
    cancel() {
      ctx.unsubscribe(self.handler.component.src, self.key);
      clearTimeout(timeout);
      timeout = undefined;
      done = true;
    },
    accept(ws) {
      ctx.accept(self.handler.component.src, self.key, this, ws);
      clearTimeout(timeout);
      timeout = undefined;
      return true;
    },
  });

  let cancelled;
  let finished;
  let i = 0;
  if (isIterable(self.value)) {
    for await (const item of self.value) {
      if (i++ >= limit) done = true;
      if (!done) cancelled = push(item); // eslint-disable-line
      else if (process.headless || cancelled === true) break;
      else {
        if (!finished) append(finished = true, item); // eslint-disable-line
        if (interval > 0) await new Promise(ok => setTimeout(ok, interval));
        if (typeof callback === 'function') cancelled = callback(self) || append(ctx, item, self);
        else break;
      }
    }
    if (typeof callback === 'function') callback(self);
  } else if (isStore(self.value)) {
    const end = self.value.subscribe(async item => {
      if (i++ >= limit) done = true;
      if (!done) cancelled = push(item); // eslint-disable-line
      else if (process.headless || cancelled === true) end();
      else {
        if (!finished) append(finished = true, item); // eslint-disable-line
        if (interval > 0) await new Promise(ok => setTimeout(ok, interval));
        if (typeof callback === 'function') cancelled = callback(self) || append(ctx, item, self);
        else end();
      }
    });
  }
}

export async function streamify(ctx, depth, result, invoke, handler, callback) {
  for (const key of Object.keys(result)) {
    let value = result[key];
    if (value && (isThenable(value) || isGenerator(value))) {
      value = await (isFactory(value) && !value.length ? value() : value);
    }

    let dynamic;
    if (value && (isStore(value) || isIterable(value))) {
      dynamic = !isArray(value);

      let props;
      let chunk;
      if (handler.fragments[key]) {
        props = await invoke(ctx, { render: handler.fragments[key].attributes, depth }, result);
        chunk = { slots: handler.component._slots, render: handler.fragments[key].template };
      }

      await new Promise(next => {
        const values = [];

        function flush(e, data) {
          invoke(e, chunk, { ...result, [key]: data })
            .then(children => {
              ctx.socket.send(`rpc:update ${handler.component.src} ${key}.${depth}\t${JSON.stringify(children)}`);
            })
            .catch(_e => ctx.socket.fail(_e))
            .catch(console.error);
        }

        function retry(e, data) {
          setTimeout(() => {
            if (ctx.socket) flush(e, data);
            else if (!ctx.done) retry(e, data);
          }, 60);
        }

        let ready;
        let done;
        callback(ctx, {
          key, value, result, props, chunk, invoke, handler,
        }, (e, item) => {
          if (values.length > 1000) return true;
          if (!chunk || ctx.done) return true;
          if (!ctx.socket) {
            if (e !== true) values.push(item);
          } else if (chunk) {
            if (e !== true) values.push(item);
            if (values.length) flush(e, values.splice(0, values.length));
            if (!ready) ready = ctx.connect(handler.component.src, key, ctx.socket);
          }
        }, e => {
          if (!done) {
            done = true;
            next();
          }
          if (values.length && !ctx.socket && !dynamic) {
            retry(e, values.splice(0, values.length));
          }
          return ctx.done;
        });
      });
    }
  }
}
