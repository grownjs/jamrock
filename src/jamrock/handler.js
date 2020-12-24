const _util = require('@grown/bud/util');

const {
  readFile, isSource, relative, exists,
} = require('../util');

const socket = require('./socket');
const { req } = require('./matcher');
const { util } = require('../markup');
const { use, trace } = require('../util');
const { Template } = require('./template');

const OK_CODES = [200, 203, 204, 206, 300, 301, 404, 405, 410, 414, 501];

const view = async (ctx, mod, file, props, options) => {
  const name = ctx.current_module = relative(file, true);

  const off = [];
  const info = [];
  const defer = [];

  const _ = Template.create(ctx, mod, options);
  const $$ = ctx.current_handler = Template.from(name, _.handler, options);

  _.debugger = console;
  if (process.env.NODE_ENV !== 'production') {
    _.debugger = Object.keys(_.debugger).reduce((memo, k) => {
      memo[k] = (...args) => {
        console[k](...args);
        info.push({
          lvl: k,
          src: file,
          msg: JSON.stringify(args, (key, v) => {
            if (['string', 'object', 'number', 'boolean'].includes(typeof v)) return v;
            return `<!#(${Object.prototype.toString.call(v)})>`;
          }),
          now: new Date().toISOString().substr(11, 12),
        });
      };
      return memo;
    }, {});
  }

  $$._emit = async (chunk, variables) => { // eslint-disable-line
    if (!chunk || process.headless) return;

    try {
      variables[chunk.id] = [variables[chunk.id]];

      const partial = await $$.invoke(_, { render: chunk.template }, variables);
      const target = variables[util.__ANCHOR__] ? `${chunk.id}:${variables[util.__ANCHOR__]}` : chunk.id;

      if (ctx.socket && !ctx.socket.closed) {
        ctx.socket.send(`rpc:update ${target} ${chunk.attributes.mode || 'replace'}\t${JSON.stringify(util.serialize(partial))}`);
      }
    } catch (e) {
      throw new Error(`Fragment failure (${e.message})\n${e.sample || e.stack}`);
    }
  };

  $$._send = (ws, args, data, scope, result) => {
    if (typeof result === 'undefined') return;
    return new Promise(done => $$.consume(args[1], done, ws.identity, result, Infinity, (chunk, item, key) => {
      scope[key] = item;
      return $$._emit(chunk, scope)
        .catch(e => ws.emit('failure', { e, args, data }));
    }, e => {
      ws.emit('failure', { e, args, data });
    })).then(() => ws.emit('finished'));
  };

  $$._call = (ws, args, data) => {
    const [context, actions] = _.call[args[3] || `${_.handler.source}#0`] || [];
    const handler = ((args[0] in context ? context : actions) || {})[args[0]];

    if (typeof handler !== 'function') {
      throw new Error(`Function not found, given '${args[0]}' in '${args[3] || `${_.handler.source}#0`}'`);
    }

    $$._send(ws, args, data, context, handler(JSON.parse(data)));
  };

  const flush = async payload => {
    while (off.length) {
      const tmp = off.shift();

      payload[tmp.key] = tmp.value;

      if (tmp.e) {
        ctx.socket.emit('failure', { e: tmp.e, key: tmp.key });
        return;
      }

      await $$._emit(tmp.chunk, payload);
    }
  };

  const update = async () => {
    for (const [key, prop, stream, value] of defer) {
      if (typeof value !== 'undefined') {
        stream.state[prop] = !Array.isArray(value) ? [value] : value;

        if (!stream.chunk) {
          ctx.socket.emit('failure', { e: new Error(`Fragment not found, given '${key}'`), key, prop });
          return;
        }

        return stream.context._render({ render: stream.chunk.template }, stream.state)
          .then(partial => {
            ctx.socket.send(`rpc:${stream.chunk.attributes.mode || 'append'} ${stream.channel}\t${JSON.stringify(util.serialize(partial))}`);
          });
      }
    }
  };

  // FIXME: streams?
  let flood;
  const {
    data, content, failure,
  } = await $$.render(_, props, true, function on(e, key, value, chunk) {
    if (process.headless) return;
    if (ctx.socket) this.accept(ctx.socket);
    process.nextTick(async () => {
      try {
        if (ctx.socket) {
          if (!flood) {
            await flush(data);
            flood = true;
          }

          data[key] = value;
          await $$._emit(chunk, data);
        } else {
          off.push({
            e, key, value, chunk,
          });
        }
      } catch (_e) {
        // console.debug('E_SKIP', _e);
        off.push({
          e, key, value, chunk,
        });
      }
    });
  });

  // eslint-disable-next-line guard-for-in
  for (const key in _.streams) {
    for (const prop of _.streams[key].targets) {
      if (!(_.streams[key].id in _.streams[key].context._tpl.fragments)) {
        throw new ReferenceError(`Fragment not found, given '${key}'`);
      }

      defer.push([key, prop, _.streams[key], await _.streams[key].source()]);
    }
  }

  return {
    _, $$, data, info, flush, update, failure, content,
  };
};

const serve = async (_, ctx, info, content, failure, options, stringify) => {
  const request = {
    uuid: ctx.req.uuid,
    csrf: ctx.csrf_token,
    path: ctx.request_path,
    query: ctx.query_params,
    method: ctx.method,
    params: ctx.path_params,
    headers: ctx.req_headers,
  };

  if (process.env.NODE_ENV !== 'production') {
    request.current_mod = ctx.current_mod;
    request.current_page = ctx.current_page;
    request.current_module = ctx.current_module;
  }

  const markup = await Template.compact(ctx, content, _, options);
  const type = ctx.req_headers['request-type'] || 'http';
  const { styles, scripts } = markup;

  delete markup.scripts;
  delete markup.styles;

  let payload;
  let buffer = payload = {
    request, markup, scripts, styles, debug: info,
  };

  if (_.prelude.length) {
    payload.scripts.unshift(_.prelude.join(''));
  }

  payload = JSON.stringify(payload);

  if (stringify && !ctx.has_body) {
    buffer = Template.stringify(content, _, options, scripts, styles);

    if (
      !failure
      && !process.headless
      && ctx.method === 'GET'
      && OK_CODES.includes(ctx.status_code)
    ) {
      const cached = `${payload}\n${buffer}`;

      ctx.put_session('cached_uuid', ctx.session.uuid);
      ctx.cache.set(`html:${ctx.session.uuid}${ctx.req.originalUrl}`, cached, 'ex', 3);
    }
  }

  return { type, buffer, payload };
};

const handle = (mod, options) => async (ctx, props, sockets, callback) => {
  if (options.reload) {
    delete require.cache[mod];
  }

  try {
    ctx.current_mod = mod;

    const fn = use(mod);
    const src = readFile(mod);

    if (typeof fn !== 'function' || fn.name !== 'c$$') {
      try {
        let out;
        if (typeof fn === 'function') {
          out = await fn(ctx, options.container);
          out = { called: true, result: out };
        } else {
          out = await req(ctx, false, fn, options.container);
        }

        if (!ctx.has_status && !out.called && typeof out.result === 'undefined') {
          return callback(null, `Cannot ${ctx.method} ${ctx.req.originalUrl}`, 404);
        }

        if (!ctx.has_status && typeof out.result !== 'undefined') {
          return callback(null, out.result, 200);
        }
      } catch (e) {
        e.sample = trace(e, { file: mod }, src, true);
        return callback(e);
      }
      return;
    }

    if (!('socket' in ctx)) {
      let _socket;
      _util.readOnlyProperty(ctx, 'socket', () => {
        if (!_socket) _socket = sockets.find(x => ctx.req.uuid === x.identity && !x.closed);
        return _socket;
      });
    }

    let {
      _, $$, data, info, flush, update, failure, content,
    } = await view(ctx, mod, fn.source, props, options);

    if (failure) {
      failure.status = failure.status || failure.statusCode || 500;
    }

    // FIXME: abstract a way to render nested layouts,
    // see next.js RFC: https://nextjs.org/blog/layouts-rfc

    const chunk = failure ? '/_error$1' : '/_layout$1';

    let tpl = mod.replace(/\/\w+([^/]+)$/, chunk);
    tpl = exists(tpl) ? tpl : fn.source.replace(/\/\w+([^/]+)$/, chunk);

    // FIXME: use same mmachanism as index/template...
    if (exists(tpl) && isSource(tpl)) {
      tpl = await Template.compile(relative(tpl, true), tpl, options);
      tpl = tpl.destination;
    }

    if (exists(tpl)) {
      const main = use(tpl);

      if (options.reload) {
        delete require.cache[tpl];
      }

      const layout = await view(ctx, tpl, main.source, {
        ...props,
        failure,
        status: ctx.status_code,
        slots: {
          ...props.slots,
          default: content,
        },
      }, options);

      content = layout.content;
      info.push(...layout.info);
      _.meta.push(...layout._.meta);
      Object.assign(_.js, layout._.js);
      Object.assign(_.css, layout._.css);
      Object.assign(_.doc, layout._.doc);
      Object.assign(_.attrs, layout._.attrs);
    }

    if (!ctx.has_status) {
      const { buffer, payload } = await serve(_, ctx, info, content, failure, options, !ctx.is_xhr);

      if (!process.headless) {
        const type = ctx.req_headers['request-type'] || 'http';

        let done = _.end.slice();
        function close() { // eslint-disable-line
          done.forEach(cb => cb());
          done = [];
        }

        const end = setTimeout(close, 3000);

        socket.ready(ctx, sockets, async ws => {
          clearTimeout(end);

          ws.on('failure', _info => {
            console.debug('E_SOCKET', _info);
            ctx.socket.send(`rpc:failure\t${JSON.stringify({
              message: _info.e.message,
            })}`);
          });

          ws.send(`@html ${type} ${ctx.status_code} ${payload}`);
          ws.handler = $$;

          _.on.forEach(cb => {
            const func = cb(ws);
            if (typeof func === 'function') done.push(func);
          });

          ws.on('disconnect', close);

          await flush(data);
          await update();
        });
      }

      return callback(null, buffer, failure ? failure.status : ctx.status_code, true);
    }
  } catch (e) {
    console.debug('E_HANDLE', ctx.current_module, e.stack);
    return callback(e, `Failed to execute '${ctx.method} ${ctx.req.originalUrl}'`);
  }
};

module.exports = { handle, serve, view };
