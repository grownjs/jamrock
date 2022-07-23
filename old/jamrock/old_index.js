const { v4 } = require('@lukeed/uuid');
const csurf = require('csurf');

const {
  onError, useState,
} = require('somedom');

const useRef = current => ({ current });
const useMemo = callback => callback();
const useEffect = () => { /* noop */ };

const socket = require('./socket');
const inject = require('./inject');
const { handle, serve, view } = require('./handler');

const { isSource } = require('../util');
const { Template } = require('./template');
const { LIVE_RELOAD } = require('./reloader');
const { store: Store } = require('../reactor');
const { match, routes } = require('./matcher');
const { createRender, registerComponent } = require('../render/component');

const {
  use, join, nodir, File, exists, unlink, relative, readFile,
} = require('../util');

module.exports = (Grown, util) => {
  function $install(ctx, scope) {
    socket.setup(ctx);

    const cached = Object.create(null);
    const options = scope._options('html');

    options.cwd = options.cwd || 'pages';
    options.dest = options.dest || 'build';
    options.limit = options.limit || 50;
    options.inline = options.inline !== false;
    options.interval = options.interval || 0;

    util.hiddenProperty(options, 'container', Grown);

    const csrfProtection = csurf({ cookie: true });
    const destDir = join(options.dest, nodir(options.cwd));

    let code = '';
    if (options.reload) {
      code += LIVE_RELOAD;
    }

    async function send(err, body, status, complete) {
      this.status_code = status;
      if (typeof body === 'string') {
        if (!complete) {
          const chunk = status >= 400 ? '_error' : '_layout';

          let tpl = Template.locate(destDir, chunk);
          tpl = exists(tpl) ? tpl : Template.locate(options.cwd, chunk);

          // FIXME: reuse same mechanism as main files...
          if (exists(tpl) && isSource(tpl)) {
            tpl = await Template.compile(relative(tpl, true), tpl, options);
            tpl = tpl.destination;
          }

          if (exists(tpl)) {
            const main = use(tpl);

            if (options.reload) {
              delete require.cache[tpl];
            }

            const {
              _, $$, data, info, flush, update, failure, content,
            } = await view(this, tpl, main.source, {
              failure: err,
              status,
              slots: {
                default: [body],
              },
            }, options);

            const { type, buffer, payload } = await serve(_, this, info, content, failure, options, true);

            if (!process.headless) {
              socket.ready(this, ctx.clients(), async ws => {
                ws.send(`@html ${type} ${this.status_code} ${payload}`);
                ws.handler = $$;
                await flush(data);
                await update();
              });
            }
            body = buffer;
          }
        }

        this.content_type = 'text/html';
        this.resp_body = !this.is_xhr
          ? body.replace(/<script|<\/(?:body|head)>|$/, x => inject(this, code) + x)
          : body;
      } else {
        this.resp_body = body;
      }
    }

    let _routes;
    async function run() {
      // FIXME: check for Jamrock, or warn abou,...
      if (!this.session) {
        throw new Error('Missing session, or Jamrock instance');
      }

      if (this.session.cached_uuid) {
        this.put_session('uuid', this.session.cached_uuid);
      }

      if (this.params._method && this.method === 'POST') {
        this.req.method = this.params._method;
        delete this.req.body._method;
        delete this.req.query._method;
      }

      const temp = await ctx.cache.get(`html:${this.session.uuid}${this.req.url}`);
      const type = this.req_headers['request-type'] || 'http';
      const uuid = this.req_headers['request-uuid'] || v4();
      const name = this.path_info[0] || '';

      this.req.uuid = uuid;
      if (!this.session.uuid) {
        this.put_session('uuid', v4());
      }

      if (this.method === 'GET' && !['link', 'live'].includes(type) && temp !== null) {
        const offset = temp.indexOf('\n');

        if (!process.headless) {
          socket.ready(this, ctx.clients(), ws => {
            ws.send(`@html cache 200 ${temp.substr(0, offset)}`);
          });
        }
        return send.call(this, null, temp.substr(offset + 1), 200, true);
      }

      if (this.req._html) {
        return send.call(this, null, readFile(this.req._html), 200, true);
      }

      if (name === 'jamrock-runtime.js') {
        return this.send_file(join(__dirname, '../dist/render.js'));
      }

      if (process.env.NODE_ENV === 'development' && name === '__open') {
        return socket.editor.open(this.query_params['@']).catch(err => {
          console.debug('E_OPEN', err);
        }).then(() => {
          this.end('OK');
        });
      }

      if (!_routes || options.reload) {
        _routes = await routes(['routes', destDir]);
      }

      this.match = match.bind(null, this);
      this.current_page = name;
      this.routes = _routes;

      let mod = Template.locate(options.cwd, name);
      mod = mod || (this.routes.find(x => x.route && match(this, x.path)) || {}).file;

      if (mod) {
        if (isSource(mod)) {
          mod = await Template.compile(relative(mod, true), mod, options);
          mod = mod.destination;
        }

        const def = cached[mod] || (cached[mod] = handle(mod, options)); // eslint-disable-line
        const props = Object.create(null);
        const files = [];

        if (this.method === 'PATCH' && !this.req_headers['request-from']) {
          Object.assign(props, this.body_params);
          Object.entries(this.uploaded_files || {})
            .forEach(([key, entry]) => {
              files.push(entry.path);
              props[key] = new File(entry);
            });
        }

        this.req.originalUrl = this.req.url;
        this.req.url = this.req.url.replace(/^\/[^/]+/, '') || '/';
        this.ready = ctx.clients().some(x => x.identity === this.req_headers['request-uuid']);

        return def(this, props, ctx.clients(), (err, buffer, status, complete) => {
          if (err) {
            status = status || err.status || err.statusCode || 500;
            buffer = buffer || err.sample || err.message;
          }

          if (this.ready && typeof buffer !== 'string') {
            this.status_code = status;
            this.resp_body = { status: 'ok' };
          } else {
            return send.call(this, err, buffer, status, complete);
          }
        }).catch(e => send.call(this, e, e.message, 500)).then(() => {
          files.forEach(file => {
            if (exists(file)) unlink(file);
          });

          if (type === 'live' || ['PUT', 'POST', 'PATCH', 'DELETE'].includes(this.method)) {
            ctx.cache.del(`html:${this.session.uuid}${this.req.originalUrl}`);
          }
        });
      }

      return send.call(this, null, `Cannot ${this.method} ${this.req.url}`, 404);
    }

    // FIXME: needs dsl or something... to turn on/off on some pages?
    ctx.mount(conn => new Promise(next => {
      if (!process.headless) {
        csrfProtection(conn.req, conn.res, err => {
          if (err) next(send.call(conn, err, err.message, 403));
          else next(run.call(conn));
        });
      } else {
        next(run.call(conn));
      }
    }));
  }

  return Grown('Jamrock', { Template, Store, $install });
};

Object.assign(module.exports, {
  onError, useRef, useMemo, useState, useEffect, createRender, registerComponent,
});
