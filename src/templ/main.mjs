import { pascalCase, realpath, identifier, pick, merge, Is } from '../utils/server.mjs';
import { serialize, scopify, rulify } from '../markup/html.mjs';
import { streamify, decorate, consume } from './send.mjs';
import { serverComponent } from '../render/ssr.mjs';
import { renderAsync } from '../render/async.mjs';
import { resolver } from '../reactor/loop.mjs';
import { reduce } from '../markup/utils.mjs';
import { ents } from '../render/hooks.mjs';
import { Ref, Expr } from '../markup/expr.mjs';
import { debug, highlight } from './utils.mjs';
import { build, transpile } from './builder.mjs';
import * as Store from '../reactor/store.mjs';

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;
const RE_SAFE_NAME = /\/(.+?)(?:\/\+\w+)?\.\w+$/;

export class Template {
  constructor(name, block, hooks, callback) {
    this.generators = hooks;
    this.component = name;
    this.partial = block;
    this.build = callback;
  }

  async transform(cb, bundle, parent, options, isServer, imported = []) {
    const { markup, fragments } = this.partial;
    const target = this.partial.file;
    const context = this.partial.context;
    const resources = { js: [], css: [] };
    const scope = identifier('jam', target).join('-');

    const isAsync = !(bundle || context === 'client');
    const isStatic = context === 'static';

    const tasks = [];
    const mod = [];

    if (this.partial.failure) {
      throw this.partial.failure;
    }

    if (!imported.includes(target)) {
      imported.push(target);
    }

    for (const c of this.partial.children) {
      if (c.found) {
        // FIXME: I think they can interoperate, but only as static markup...
        // so if we render a Svelte component it should be pre-rendered only,
        // and on client-side it should be skipped?

        if (!isAsync && c.found.includes('.svelte')) {
          throw new ReferenceError(`Svelte component '${c.found}' cannot be used in '${target}'`);
        }

        if (imported.includes(c.found)) continue;

        imported.push(c.found);

        if (c.found.includes('.svelte')) {
          tasks.push(cb({
            filepath: c.found,
          }).then(result => {
            result.content = Template.identify(result.content, c.found);

            mod.push({
              ...result,
              src: c.found,
              client: true,
              children: c.children ? c.children.slice(1) : [],
            });
          }));

          tasks.push(cb({
            content: c.code,
            filepath: c.found,
            attributes: { server: true },
          }).then(result => {
            if (result.resources) {
              result.resources.forEach(([key, content]) => {
                resources[key].push(key === 'js' ? [false, content] : content);
              });
            }

            result.content = Template.identify(result.content, c.found);

            mod.push({
              ...result,
              src: c.found,
              server: true,
            });
          }));
        } else if (c.found.includes('.html')) {
          tasks.push(this.build(c.found, c.code, { sync: !isAsync })
            .transform(cb, !isAsync, target, options, isServer, imported)
            .then(result => mod.push(...result)));
        }
      } else {
        console.debug(`=> '${c.src}' not found in`, target || parent.partial.file);
      }
    }

    tasks.push(cb(this.partial.scripts
      .filter(x => x.root || x.attributes.scoped || x.attributes.bundle || x.attributes.type === 'module'), 'js', null, options)
      .then(js => { resources.js = js.map(x => [x.params.type === 'module' || !x.params.bundle, x.content]); }));

    this.partial.styles.forEach(x => {
      tasks.push(cb(x, 'css', null, options).then(code => {
        if (!x.attributes.global) {
          resources.css.push(scopify(scope, x.attributes.scoped, code.content, markup.content, `${x.identifier}.css`));
        } else {
          resources.css.push(rulify(code.content, `${x.identifier}.css`));
        }
      }));
    });

    await Promise.all(tasks);

    this.partial.sync(options.props);

    if (this.generators && this.generators.css) {
      const { css } = await this.generators.css.generate(this.partial.rules.join(' '));

      resources.css.push(rulify(css, target));
    }

    let result;
    if (isStatic) {
      result = {
        content: [
          `const __render = ${this.partial.render.toString().replace('(_, $$)', '({ $$$$slots, $$$$props }, $$$$)')};`,
          `export default { src: '${target}', render: __render, stylesheet: ${JSON.stringify(resources.css)} };`,
        ].join('\n'),
      };
      mod.push({
        ...result,
        src: target,
        bundle: true,
      });
    } else if (!isAsync) {
      result = transpile(this.partial, resources);
      mod.push({
        ...result,
        src: target,
        bundle: true,
      });
    } else {
      result = build({
        id: this.component,
        block: this.partial,
        assets: resources,
        templates: {
          metadata: reduce(markup.metadata || { elements: [] }, context, 1),
          document: Expr.props(markup.document || {}, '\t'),
          attributes: Expr.props(markup.attributes || {}, '\t'),
        },
        fragments: Object.keys(fragments).reduce((memo, key) => {
          memo.push({
            attributes: Expr.props(fragments[key].attributes, '\t'),
            template: reduce(fragments[key].elements, context, 1),
            scope: fragments[key].scope,
            name: key,
          });
          return memo;
        }, []),
      }, Template.path);

      const children = [...new Set(this.partial.children.map(x => x.found))];

      mod.unshift({ ...result, src: target, children });
    }

    if (Template.cache) {
      Template.cache.set(target.replace('.html', '.js'), result);
    }
    return mod;
  }

  static async finalize(e, self, chunk, mixins, component) {
    const selectors = new Set();

    await Promise.all([
      serialize(chunk.body, null, (_, x) => decorate(self, _, x, selectors)),
      serialize(chunk.head, null, (_, x) => decorate(self, _, x)),
    ]);

    chunk.doc = Object.assign({ ...chunk.doc }, ...mixins.map(x => x.doc));
    chunk.attrs = Object.assign({ ...chunk.attrs }, ...mixins.map(x => x.attrs));
    chunk.styles = Object.assign({ ...chunk.styles }, ...mixins.map(x => x.styles));
    chunk.scripts = Object.assign({ ...chunk.scripts }, ...mixins.map(x => x.scripts));

    chunk.head = (chunk.head || []).concat(mixins.map(x => x.head));
    chunk.head.unshift(['base', { href: self.base_url || '/' }]);
    chunk.head.unshift(['meta', { charset: 'utf-8' }]);

    chunk.doc['data-location'] = process.env.NODE_ENV !== 'production' ? component.src : undefined;
    chunk.status = e ? e.status : null;

    const all = [...selectors];
    const ids = all.filter(x => x.charAt() === '#').map(x => x.substr(1));
    const tags = all.filter(x => x.charAt() === '!').map(x => x.substr(1));
    const attrs = all.filter(x => x.charAt() === '@').map(x => x.substr(1));
    const classes = all.filter(x => x.charAt() === '.').map(x => x.substr(1));

    const regexes = []
      .concat(ids.length > 0 ? `#(?:${ids.join('|')})\\b` : [])
      .concat(tags.length > 0 ? `(?![[:#.])(?:${tags.join('|')})\\b` : [])
      .concat(attrs.length > 0 ? `\\[(?:${attrs.join('|')})(?=[~|^$*=\\]])` : [])
      .concat(classes.length > 0 ? `\\.(?:${classes.join('|')})\\b` : [])
      .join('|');

    const seen = new Set();
    const used = new RegExp(regexes);

    Object.entries(chunk.styles).forEach(([src, rules]) => {
      chunk.styles[src] = Is.arr(rules) ? rules.reduce((memo, styles) => {
        if (Is.arr(styles)) {
          styles.forEach(style => {
            if (Is.arr(style)) {
              if (style[0].charAt() === '@') {
                const css = [];

                style[1].forEach(([k, v]) => {
                  if (!seen.has(`@${k}`) && used.test(k)) {
                    seen.add(`@${k}`);
                    css.push(k + v);
                  }
                });

                if (css.length > 0) {
                  memo.push(`${style[0]}{${css.join('')}}`);
                }
              } else if (!seen.has(style[0]) && used.test(style[0])) {
                memo.push(style.join(''));
                seen.add(style[0]);
              }
            } else {
              memo.push(style);
            }
          });
          return memo;
        }
        return memo.concat(styles);
      }, []).join('') : rules;
    });

    return chunk;
  }

  static async resolve(component, filepath, context, props, cb) {
    const shared = {
      failure: null,
      scripts: {},
      styles: {},
      attrs: {},
      head: [],
      doc: {},
    };

    function invoke(ctx, chunk, payload, _component) {
      const _render = async (_chunk, locals) => {
        if (!Is.func(_chunk)) {
          if (_chunk.stylesheet) {
            shared.styles[_chunk.src] = _chunk.stylesheet;
          }

          if (_chunk.src && _chunk.render && !_chunk.resolve && !_chunk.$$render) {
            const $$props = pick(merge(payload, locals || {}), _chunk._scope && _chunk._scope[0]);

            const $$slots = Object.keys(_chunk._slots || {}).reduce((memo, key) => {
              memo[key] = !!_chunk._slots[key];
              return memo;
            }, {});

            return renderAsync(_chunk, { $$props, $$slots }, _render, ctx);
          }

          if (_chunk.$$render || _chunk.resolve) {
            const scope = {
              props: payload,
              parent: _component,
            };

            return serverComponent(ctx, _chunk, locals, scope, _render, Template.load, shared.styles);
          }

          const result = await renderAsync(_chunk, pick(locals, _chunk.props), _render, ctx);

          if (Is.plain(result)) {
            result.name = `${result['@location'].split(':')[0]}/${_chunk.depth}/${result.name}`;
          }
          return result;
        }

        const key = identifier();
        const state = pick(merge(payload, locals), _chunk.props);

        ctx.chunks.set(key, Template.render(_chunk, invoke, state, ctx)
          .then(result => {
            shared.head.push(...(result.head || []));
            Object.assign(shared.doc, result.doc);
            Object.assign(shared.attrs, result.attrs);
            Object.assign(shared.styles, result.styles);
            Object.assign(shared.scripts, result.scripts);
            return result.body;
          }));

        return Ref.from(key);
      };
      return chunk ? _render(chunk, payload) : _render;
    }

    const self = Object.assign(context || {}, {
      filepath,
      callbacks: [],
      streams: new Map(),
      chunks: new Map(),
      depth: 0,
      send: async (key, data, uuid, chunk, source, params, result) => {
        try {
          const children = await invoke(self, chunk, { ...result, [key]: data });

          serialize(children, null, (_, x) => decorate(self, _, x));

          if (self.socket.identity === uuid) {
            self.socket.emit('update', source, params, children);
          }
        } catch (e) {
          // ctx.socket.emit('error', e);
          console.error('E_SEND', e);
        }
      },
      emit: async (data, uuid, path, source, target) => {
        if (self.streams.has(path)) {
          const { locals, calls } = self.streams.get(path);
          const handler = self.streams.get(`${path}?handler`);

          if (calls[source]) {
            const result = calls[source](data);
            const depth = +path.split('/').pop();
            const key = target || source;

            let _props;
            let chunk;
            let name;
            for (const frag in handler.fragments) {
              if (handler.fragments[frag].scope && handler.fragments[frag].scope.includes(key)) {
                _props = await invoke(self, { render: handler.fragments[frag].attributes, depth }, locals);
                chunk = { slots: handler.component._slots, render: handler.fragments[frag].template };
                name = frag;
                break;
              }
            }

            const push = item => self.send(key, [item], uuid, chunk, `${path}/${name}`, _props, locals);

            if (Is.iterable(result)) {
              for await (const item of result) await push(item);
            } else {
              await push(result);
            }
          }
        }
      },
      accept: (src, key, _depth, _handler, _socket) => {
        self.streams.set(`${src}/${_depth}?handler`, _handler);
        self.streams.set(`${src}/${_depth}/${key}?socket`, _socket);

        if (_socket.streams) _socket.streams.add(`${src}/${_depth}/${key}`);
        if (!_socket.context) _socket.context = self;
      },
      connect: (src, key, _depth, _socket) => {
        if (self.streams.has(`${src}/${_depth}/${key}`)) {
          return self.streams.get(`${src}/${_depth}/${key}`).accept(_socket);
        }
      },
      subscribe: (src, key, params, _depth) => {
        self.streams.set(`${src}/${_depth}/${key}`, params);
      },
      unsubscribe: (src, key, _depth) => {
        self.streams.delete(`${src}/${_depth}?handler`);
        self.streams.delete(`${src}/${_depth}/${key}`);
        self.streams.delete(`${src}/${_depth}/${key}?socket`);
      },
    });

    if (Is.func(self.clients) && !self.socket) {
      let _socket;
      Object.defineProperty(self, 'socket', {
        get: () => {
          // eslint-disable-next-line no-return-assign
          return _socket || (_socket = self.clients().find(x => x.identity === self.uuid));
        },
        set: v => {
          _socket = v;
        },
      });
    }

    self.base_url = self.conn && self.conn.base_url;
    self.is_json = self.conn && self.conn.is_xhr;

    try {
      const result = await Template.render(component, invoke, props, self, cb);

      await Promise.all(self.callbacks.map(fn => fn(result)));

      if (!(result instanceof Response)) {
        if (self.route && self.route.layout) {
          self.route.layout._slots = { default: result.body };

          const layout = await Template.render(self.route.layout, invoke, props, self);

          return Template.finalize(null, self, layout, [shared, result], component);
        }
        return Template.finalize(null, self, result, [shared], component);
      }
      return result;
    } catch (e) {
      if (self.route && self.route.error) {
        // console.log(e.stack);
        props = props || {};
        props.failure = e;
        props.failure.reason = e.message;
        props.failure.source = props.failure.stack.split('\n')[0].split(' at ')[1];
        props.failure.stack = props.failure.stack.split('\n').slice(1).join('\n');

        const error = await Template.render(self.route.error, invoke, props, self);

        return Template.finalize(e, self, error, [shared], component, true);
      }
      throw e;
    }
  }

  static async render(component, invoke, props, ctx, cb = null) {
    if (!Is.func(component)) {
      return { body: await invoke(ctx, component, props, component) };
    }

    const depth = ++ctx.depth;
    const reactor = resolver(ctx.conn);

    const context = component._scope = {
      onFinish: fn => ctx.callbacks.push(fn),

      getContext: k => {
        return component._parent ? (component._parent._scope && component._parent._scope[k]) : component._scope[k];
      },
      setContext: (k, v) => {
        if (component._parent) {
          component._parent._scope = component._parent._scope || component._scope;
          component._parent._scope[k] = v;
        } else {
          component._scope[k] = v;
        }
      },

      useSlot: async name => {
        if (!component._slots[name]) {
          throw new ReferenceError(`Missing slot '${name}' in ${component.src}`);
        }

        const children = await component._slots[name]();
        component._slots[name] = () => children;
        return children;
      },
    };

    const handler = await component(component.src, (...args) => {
      if (args[0] === 'jamrock:conn') return ctx.conn;
      if (args[0] === 'jamrock:hooks') return context;
      if (args[0] === 'jamrock:store') return Store;
      return Template.load(...args);
    }, reactor, component.destination || ctx.filepath);

    const $$props = props ? pick(props, handler.props) : {};

    let response;
    let data = { ...props, $$props, $$slots: {} };
    Object.keys(component._slots || {}).forEach(key => {
      data.$$slots[key] = !!component._slots[key];
    });

    const _ref = `${component.src}/${ctx.depth}`;

    const styles = {
      [component.src]: handler.assets && handler.assets.styles.length > 0
        ? handler.assets.styles
        : [],
    };

    const scripts = {
      [component.src]: handler.assets && handler.assets.scripts.length > 0
        ? handler.assets.scripts.map(([k, v], i) => [k, `/* ${component.src}(${i}) */\n${v}`])
        : [],
    };

    try {
      if (invoke && Is.func(handler)) {
        const main = handler.bind({ filepath: ctx.filepath, module: component });
        const result = await reactor.resolve(main, data, null, null, undefined, 0, async (_ctx, _data) => {
          const locals = { ...handler.definitions, ..._data };
          const calls = {};

          Object.keys(locals).forEach(key => {
            // FIXME: we could identify these methods somehow?
            if (Is.func(locals[key])) calls[key] = locals[key];
          });

          ctx.streams.set(_ref, { locals, calls });

          try {
            if (Is.func(cb)) {
              let _chunk = await cb(ctx, _data, _ctx.default || {});
              if (Is.plain(_chunk)) {
                const body = JSON.stringify(_chunk);

                _chunk = new Response(body, {
                  status: 200,
                  headers: {
                    'content-type': 'application/json',
                    'content-length': body.length,
                  },
                });
              }
              if (Is.arr(_chunk)) {
                _chunk = new Response(_chunk[1], { status: _chunk[0], headers: _chunk[2] });
              }
              if (Is.num(_chunk)) _chunk = new Response(null, { status: _chunk });
              if (Is.str(_chunk)) _chunk = new Response(_chunk, { status: 200 });
              if (_chunk instanceof Response) response = _chunk;
            }

            if (invoke
              && !response
              && ctx.conn
              && ctx.conn.params
              && ctx.conn.params._action
              && ctx.conn.params._self === _ref
              && Is.func(_data[ctx.conn.params._action])
            ) response = await _data[ctx.conn.params._action](ctx.conn);
          } catch (e) {
            if (_ctx.default && Is.func(_ctx.default.onError)) {
              response = await _ctx.default.onError(e);
            } else {
              throw e;
            }
          }
        });

        if (response) return response;
        if (ctx.conn && ctx.conn.has_status) {
          return new Response(ctx.conn.body, { status: ctx.conn.status_code, headers: ctx.conn.resp_headers });
        }

        await streamify(ctx, depth, result, invoke, handler, consume);
        Object.assign(data, result, ctx.conn && ctx.conn.req ? ctx.conn.req.params : null);
      }

      const exec = invoke ? invoke(ctx, null, data, component) : undefined;
      const [doc, body, head, attrs] = await Promise.all([
        renderAsync({ render: handler.document }, data),
        renderAsync({ chunks: handler.fragments, slots: component._slots, render: handler.render, depth, component }, data, exec, ctx),
        renderAsync({ chunks: handler.fragments, slots: component._slots, render: handler.metadata, depth, component }, data, exec, ctx),
        renderAsync({ render: handler.attributes }, data),
      ]);

      return {
        scripts, styles, attrs, head, body, doc,
      };
    } catch (e) {
      // console.log(e);
      this.failure = debug({
        file: component.src,
        code: component.toString(),
        html: Template.exists(component.src)
          ? Template.read(component.src)
          : null,
      }, e);

      if (ctx.route && ctx.route.error) throw this.failure;

      return { scripts, styles, body: [['pre', {}, ents(this.failure.stack)]] };
    }
  }

  static async load(id, src, file) {
    let resolved;
    if (!id.includes(':')) {
      resolved = Template.path(id, src, file);
    } else if (!RE_SAFE_IMPORTS.test(id)) {
      const [mod, name] = id.split(':');

      resolved = Template.path(`${process.cwd()}/node_modules/${mod}/shared/${name}`);

      if (!resolved) {
        return Template.import(id);
      }
    }

    if (Template.cache && Template.cache.has(resolved || id)) {
      return Template.cache.get(resolved || id).module;
    }

    if (resolved && (resolved.includes('.html') || resolved.includes('.svelte'))) {
      throw new Error(`Cannot import '${resolved}' file as module`);
    }

    if (resolved && Template.exists(resolved)) {
      return resolved.charAt() === '/'
        ? Template.import(`file://${resolved}`)
        : Template.import(`file://${process.cwd()}/${resolved}`);
    }

    return Template.import(id);
  }

  static async import(id) {
    return import(id);
  }

  static transpile(tpl) {
    if (Is.arr(tpl)) {
      return Promise.all(tpl.map(Template.transpile));
    }

    return Promise.resolve({
      params: { ...tpl.attributes },
      content: tpl.content,
      children: [],
      resources: [],
    });
  }

  static identify(code, filepath) {
    return code.replace(/export default (\w+)/, (_, x) => `${_};\n${x}.src = "${filepath}"`);
  }

  static dirname(path) {
    const parts = path.split('/');
    return parts.slice(0, parts.length - 1).join('/');
  }

  static exists() {
    return false;
  }

  static read() {
    return '';
  }

  static glob() {
    return [];
  }

  static eval(code) {
    // eslint-disable-next-line no-new-func
    return new Function('', `return(${code})`)();
  }

  static path(mod, source, filepath) {
    const cwd = process.cwd();
    const paths = [];

    if (mod.charAt() === '~') {
      paths.push(mod.replace('~', cwd).replace(`${cwd}/`, ''));
    } else if (mod.charAt() === '.') {
      const src = realpath(source, mod);
      const dest = realpath(filepath, mod);

      if (src) paths.push(src.replace('./', ''));
      if (dest) paths.unshift(dest.replace('./', ''));
    } else if (mod.indexOf('node:') === 0) return mod;
    else if (!mod.includes(':') && mod.charAt() === '/') paths.push(mod);
    else if (Template.exists(`node_modules/${mod.split(':')[0]}/package.json`)) return mod;

    for (let i = 0; i < paths.length; i += 1) {
      const subject = paths[i].replace(/\.(?:html|svelte)$/, '');

      if (Template.exists(`${subject}.server.mjs`)) return `${subject}.server.mjs`;
      if (Template.exists(`${subject}.client.mjs`)) return `${subject}.client.mjs`;
      if (Template.exists(`${paths[i]}/index.mjs`)) return `${paths[i]}/index.mjs`;
      if (Template.exists(`${paths[i]}/index.cjs`)) return `${paths[i]}/index.cjs`;
      if (Template.exists(`${paths[i]}/index.js`)) return `${paths[i]}/index.js`;
      if (Template.exists(`${paths[i]}.mjs`)) return `${paths[i]}.mjs`;
      if (Template.exists(`${paths[i]}.cjs`)) return `${paths[i]}.cjs`;
      if (Template.exists(`${paths[i]}.js`)) return `${paths[i]}.js`;
      if (Template.exists(paths[i])) return paths[i];
    }
  }

  static from(compile, source, opts) {
    const block = compile(source, opts);
    const name = (opts.src || block.file).match(RE_SAFE_NAME)[1].replace(/\W+/g, '-').replace(/-$/, '');

    if (opts.html !== false && block.failure) {
      block.failure.stack = highlight(block.failure.stack, opts.html);
    }

    return new Template(pascalCase(name), block, opts.generators, (src, code, _opts) => Template.from(compile, code, { ...opts, ..._opts, src }));
  }
}
