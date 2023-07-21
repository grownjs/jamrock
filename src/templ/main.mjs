import { pascalCase, snakeCase, realpath, Is } from '../utils/server.mjs';
// import { pascalCase, snakeCase, realpath, identifier, pick, merge, Is } from '../utils/server.mjs';
import { serialize, taggify, scopify, rulify } from '../markup/html.mjs';
import { decorate } from './send.mjs';
// import { streamify, decorate, consume } from './send.mjs';
// import { serverComponent } from '../render/ssr.mjs';
import { executeAsync } from '../render/async.mjs';
import { debug, stringify } from './utils.mjs';
import { ents } from '../render/hooks.mjs';
// import { Ref } from '../markup/expr.mjs';

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;
const RE_SAFE_NAME = /(?:^|\/)(.+?)(?:\/\+\w+)?\.\w+$/;

export class Template {
  constructor(name, block, hooks, callback) {
    this.generators = hooks || [];
    this.component = name;
    this.partial = block;

    Object.defineProperty(this, 'build', { value: callback });
  }

  async regenerate(callback, imported = []) {
    const cwd = process.cwd();

    Template.cache = Template.cache || new Map();

    const mods = await this.transform(Template.transpile, null, null, {
      external: ['jamrock'],
      locate: path => {
        if (path.indexOf(cwd) === 0) {
          const file = path.replace(`${cwd}/`, '');

          if (Template.cache.has(`${file}.mjs`)) {
            return `${cwd}/${file}.mjs`;
          }
        }
      },
      resolve: path => {
        if (path.indexOf(cwd) === 0) {
          const file = path.replace(`${cwd}/`, '');

          if (Template.cache.has(file)) {
            const chunk = Template.cache.get(file);

            return {
              loader: 'js',
              contents: chunk.content,
              resolveDir: Template.dirname(path),
            };
          }
        }
      },
    }, imported);

    if (callback) {
      if (!mods.length) {
        throw new Error(`Failed to compile '<${this.component}>' component`);
      }
      for (let i = 1; i < mods.length; i++) {
        callback(mods[i].content, mods[i].dest, true, '');
      }
      return this.compile(mods[0], this.partial, callback);
    }
    return mods;
  }

  async transform(cb, bundle, parent, options, imported = []) {
    const resources = this.partial.assets;
    const context = this.partial.context;
    const filepath = this.partial.src;
    const target = this.partial.dest;
    const scope = this.partial.id;
    const { markup } = this.partial;

    const isStatic = context === 'static';
    const isClient = bundle || context === 'client';

    const tasks = [];
    const mod = [];

    if (!imported.includes(target)) {
      imported.push(target);
    }

    for (const c of this.partial.children) {
      if (Template.exists(c.src)) {
        if (imported.includes(c.src)) continue;
        imported.push(c.src);
        tasks.push(this.build(c.src, c.code)
          .transform(cb, isClient, target, options, imported)
          .then(result => mod.push(...result)));
      } else {
        console.debug(`=> '${c.src}' not found in`, target);
      }
    }

    try {
      tasks.push(cb(this.partial.scripts
        .filter(x => x.root || x.attributes.scoped || x.attributes.bundle || x.attributes.type === 'module'), 'js', null, options)
        .then(js => { resources.js = js.map(x => [x.params.type === 'module' || !x.params.bundle, x.content]); }));

      this.partial.styles.forEach(x => {
        tasks.push(cb(x, 'css', null, options).then(code => {
          if (!x.attributes.global) {
            resources.css.push(scopify(scope, x.attributes.scoped, code.content, markup.content, `${x.identifier}.css`));
          } else {
            resources.css.push(rulify(code.content, target));
          }
        }));
      });
    } catch (e) {
      console.log('E_TRANSPILE', e.name, e.message, { cb });
    }

    await Promise.all(tasks);

    if (this.generators && this.generators.css) {
      const { css } = await this.generators.css.generate(this.partial.rules.join(' '));

      resources.css.push(rulify(css, target));
    }

    let result;
    if (isStatic) {
      mod.push(result = { content: this.partial.toString(), src: filepath, dest: target });
    } else {
      const children = [...new Set(this.partial.children.map(x => x.src))];

      result = { content: this.partial.toString(), src: filepath, children, dest: target };

      if (isClient) {
        mod.push(result);
      } else {
        mod.unshift(result);
      }
    }

    if (Template.cache) {
      Template.cache.set(target.replace('.html', '.js'), result);
    }
    return mod;
  }

  async compile(mod, block, callback) {
    const value = await callback(mod.content, block.src);
    Object.defineProperty(this, 'module', { value });
    return this;
  }

  async render(props = {}) {
    const self = this.module.__handler
      ? await this.module.__handler(props, Template.load)
      : null;

    const { __actions, ...data } = self?.__context ? await self.__context() : props;
    const view = executeAsync(Template.load);

    const [out, doc, meta, attrs] = await Promise.all([
      view(this.module.__template, data),
      view(this.module.__doctype, data),
      view(this.module.__metadata, data),
      view(this.module.__attributes, data),
    ]);

    const html = taggify(out);
    const css = this.module.__styles;

    return { attrs, meta, html, css, doc };
  }

  static async finalize(e, self, chunk, mixins, filepath) {
    const fragments = self.is_json ? {} : null;

    await Promise.all([
      serialize(chunk.body, null, (_, x) => decorate(self, _, x), fragments),
      serialize(chunk.head, null, (_, x) => decorate(self, _, x), fragments),
    ]);

    chunk.doc = Object.assign({ ...chunk.doc }, ...mixins.map(x => x.doc));
    chunk.attrs = Object.assign({ ...chunk.attrs }, ...mixins.map(x => x.attrs));
    chunk.styles = Object.assign({ ...chunk.styles }, ...mixins.map(x => x.styles));
    chunk.scripts = Object.assign({ ...chunk.scripts }, ...mixins.map(x => x.scripts));

    chunk.prelude = (chunk.prelude || []).concat(mixins.map(x => x.prelude));
    chunk.head = (chunk.head || []).concat(mixins.map(x => x.head));
    chunk.head.unshift(['base', { href: self.base_url || '/' }]);
    chunk.head.unshift(['meta', { charset: 'utf-8' }]);

    chunk.doc['data-location'] = process.env.NODE_ENV !== 'production' ? filepath : undefined;
    chunk.status = e ? e.status : null;
    chunk.fragments = fragments;

    Object.entries(chunk.styles).forEach(([src, rules]) => {
      if (Is.arr(rules)) console.log('CSS_RULES', { src, rules });
      chunk.styles[src] = Is.arr(rules) ? rules.reduce((memo, styles) => {
        if (Is.arr(styles)) {
          styles.forEach(style => {
            if (Is.arr(style)) {
              if (style[0].charAt() === '@') {
                if (style[1].length > 0) {
                  memo.push(`${style[0]}{${style[1].join('')}}`);
                }
              } else {
                memo.push(style.join(''));
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
    const response = await Template.reduce(component, filepath, context, props, cb);
    if (context.write) stringify(response, context.write);
    return response;
  }

  static async reduce(component, filepath, context, props, cb) {
    let result;
    if (!context.components) {
      result = await Template.execute(component, filepath, context, props, cb);
      return result;
    }

    for (const mod of context.components) {
      try {
        mod._responses = result ? [result] : null;

        if (result) {
          // eslint-disable-next-line no-loop-func
          props.children = () => result.body;
        }

        result = await Template.execute(mod, filepath, context, props, cb);
      } catch (e) {
        console.log('E_RESOLVE', e);
      }
    }
    return result;
  }

  static async execute(component, filepath, context, props, cb) {
    const shared = {
      prelude: [],
      failure: null,
      fragments: {},
      scripts: {},
      styles: {},
      attrs: {},
      head: [],
      doc: {},
    };

    // FIXME: this could be an extension...
    //    const self = Object.assign(context || {}, {
    //      filepath,
    //      callbacks: [],
    //      streams: new Map(),
    //      chunks: new Map(),
    //      depth: 0,
    //      send: async (key, data, uuid, chunk, source, params, result) => {
    //        try {
    //          const children = await invoke(self, chunk, { ...result, [key]: data });
    //
    //          serialize(children, null, (_, x) => decorate(self, _, x));
    //
    //          if (self.socket.identity === uuid) {
    //            self.socket.emit('update', source, params, children);
    //          }
    //        } catch (e) {
    //          // ctx.socket.emit('error', e);
    //          console.error('E_SEND', e);
    //        }
    //      },
    //      emit: async (data, uuid, path, source, target) => {
    //        if (self.streams.has(path)) {
    //          const { locals, calls } = self.streams.get(path);
    //          const handler = self.streams.get(`${path}?handler`);
    //
    //          if (calls[source]) {
    //            const result = calls[source](data);
    //            const depth = +path.split('/').pop();
    //            const key = target || source;
    //
    //            let _props;
    //            let chunk;
    //            let name;
    //            for (const frag in handler.fragments) {
    //              if (handler.fragments[frag].scope && handler.fragments[frag].scope.includes(key)) {
    //                _props = await invoke(self, { render: handler.fragments[frag].attributes, depth }, locals);
    //                chunk = { slots: handler.component._slots, render: handler.fragments[frag].template };
    //                name = frag;
    //                break;
    //              }
    //            }
    //
    //            const push = item => self.send(key, [item], uuid, chunk, `${path}/${name}`, _props, locals);
    //
    //            if (Is.iterable(result)) {
    //              for await (const item of result) await push(item);
    //            } else {
    //              await push(result);
    //            }
    //          }
    //        }
    //      },
    //      accept: (src, key, _depth, _handler, _socket) => {
    //        self.streams.set(`${src}/${_depth}?handler`, _handler);
    //        self.streams.set(`${src}/${_depth}/${key}?socket`, _socket);
    //
    //        if (_socket.streams) _socket.streams.add(`${src}/${_depth}/${key}`);
    //        if (!_socket.context) _socket.context = self;
    //      },
    //      connect: (src, key, _depth, _socket) => {
    //        if (self.streams.has(`${src}/${_depth}/${key}`)) {
    //          return self.streams.get(`${src}/${_depth}/${key}`).accept(_socket);
    //        }
    //      },
    //      subscribe: (src, key, params, _depth) => {
    //        self.streams.set(`${src}/${_depth}/${key}`, params);
    //      },
    //      unsubscribe: (src, key, _depth) => {
    //        self.streams.delete(`${src}/${_depth}?handler`);
    //        self.streams.delete(`${src}/${_depth}/${key}`);
    //        self.streams.delete(`${src}/${_depth}/${key}?socket`);
    //      },
    //    });
    //
    //    if (Is.func(self.clients) && !self.socket) {
    //      let _socket;
    //      Object.defineProperty(self, 'socket', {
    //        get: () => {
    //          // eslint-disable-next-line no-return-assign
    //          return _socket || (_socket = self.clients().find(x => x.identity === self.uuid));
    //        },
    //        set: v => {
    //          _socket = v;
    //        },
    //      });
    //    }

    const self = Object.assign(context || {}, {
      filepath,
      callbacks: [],
      streams: new Map(),
      chunks: new Map(),
      depth: 0,
    });

    self.base_url = self.conn?.base_url;
    self.is_json = self.conn?.is_xhr;

    try {
      let result = await Template.render(component, props, self, cb);

      await Promise.all(self.callbacks.map(fn => fn(result)));

      if (!(result instanceof Response)) {
        if (self.route?.layout) {
          props.children = () => result.body;

          const layout = await Template.render(self.route.layout, props, self);
          const response = await Template.finalize(null, self, layout, [result, shared].concat(component._responses || []), component.src);
          return response;
        }
        result = await Template.finalize(null, self, result, [shared].concat(component._responses || []), component.src);
      }
      return result;
    } catch (e) {
      if (self.route?.error) {
        props = props || {};
        props.failure = e;
        props.failure.reason = e.message;
        props.failure.source = props.failure.stack.split('\n')[0].split(' at ')[1];
        props.failure.stack = props.failure.stack.split('\n').slice(1).join('\n');

        const error = await Template.render(self.route.error, props, self);
        const result = await Template.finalize(e, self, error, [shared].concat(component._responses || []), component.src);
        return result;
      }
      throw e;
    }
  }

  static async render(component, props, ctx, cb = null) {
    const context = component._callbacks = {
      onFinish: fn => {
        ctx.callbacks.push(fn);
      },
      getContext: k => {
        return component._parent ? component._parent._callbacks?.[k] : component._callbacks[k];
      },
      setContext: (k, v) => {
        if (component._parent) {
          component._parent._callbacks = component._parent._callbacks || component._callbacks;
          component._parent._callbacks[k] = v;
        } else {
          component._callbacks[k] = v;
        }
      },
    };

    const styles = {
      [component.src]: component.__styles,
    };

    const scripts = {
      [component.src]: component.__scripts
        .map(([k, v], i) => [k, `/* ${component.src}(${i}) */\n${v}`]),
    };

    ++ctx.depth;
    // const _depth = ++ctx.depth;
    // const _ref = `${component.src}/${_depth}`;

    const mocks = {
      useState: v => [v],
      useRef: () => null,
      onError: () => null,
      useEffect: () => null,
      wrapComponent: () => null,
    };

    const loader = (...args) => {
      if (args[0] === 'jamrock') return mocks;
      if (args[0] === 'jamrock:conn') return ctx.conn;
      if (args[0] === 'jamrock:hooks') return context;
      return Template.load(...args);
    };

    const self = component.__handler
      ? await component.__handler(props, loader)
      : null;

    const { __actions, ...data } = self?.__context ? await self.__context() : props;

    try {
      let response;
      if (__actions && cb) {
        let _chunk = await cb(ctx, __actions);
        _chunk = Template.response(_chunk);
        if (_chunk instanceof Response) response = _chunk;
      }

      // FIXME: how call those?
      //      if (invoke
      //        && !response
      //        && ctx.conn
      //        && ctx.conn.params
      //        && ctx.conn.params._action
      //        && ctx.conn.params._self === _ref
      //        // && Is.func(_data[ctx.conn.params._action])
      //      ) response = await _data[ctx.conn.params._action](ctx.conn);

      if (response) return response;
      if (ctx.conn && ctx.conn.has_status) {
        return new Response(ctx.conn.body, {
          status: ctx.conn.status_code,
          headers: ctx.conn.resp_headers,
        });
      }

      const view = executeAsync(loader, ctx);

      const [doc, body, head, attrs] = await Promise.all([
        view(component.__doctype, data),
        view(component.__template, data),
        view(component.__metadata, data),
        view(component.__attributes, data),
      ]);

      return {
        scripts, styles, attrs, head, body, doc,
      };
    } catch (e) {
      if (Is.func(__actions?.catch)) {
        await __actions.catch(e);
      } else {
        this.failure = debug({
          file: component.src,
          html: Template.read(component.dest),
          code: Template.read(component.dest.replace('.html', '.generated.mjs')),
        }, e);

        if (ctx.route?.error) throw this.failure;

        return { scripts, styles, body: [['pre', {}, ents(this.failure.stack)]] };
      }
    } finally {
      if (Is.func(__actions?.finally)) {
        await __actions.finally();
      }
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

    if (resolved && (resolved.includes('.html'))) {
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

  static response(body) {
    if (Is.plain(body)) {
      body = JSON.stringify(body);
      body = new Response(body, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': body.length,
        },
      });
    }
    if (Is.arr(body)) {
      body = new Response(body[1], { status: body[0], headers: body[2] });
    }
    if (Is.num(body)) body = new Response(null, { status: body });
    if (Is.str(body)) body = new Response(body, { status: 200 });
    return body;
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

  static join(base, leaf) {
    const args = base.split('/');
    const chunks = leaf.split('/');

    while (chunks.length > 0) {
      if (!args.length) break;
      if (chunks[0] === '..') {
        chunks.shift();
        args.pop();
        continue;
      }
      if (chunks[0] === '.') {
        chunks.shift();
        break;
      }
      break;
    }

    while (args[0] === '.') args.shift();
    return args.concat(chunks).join('/');
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
      const subject = paths[i].replace(/\.(?:html)$/, '');

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

  static from(compile, block, opts) {
    const name = (opts.src || block.src).match(RE_SAFE_NAME)[1]
      .replace(/\W+/g, '-')
      .replace(/-$/, '');

    Object.assign(block.opts, opts);

    const id = pascalCase(snakeCase(name));
    const cb = (src, code, _opts) => Template.from(compile, compile(code, src), { ...opts, ..._opts });

    return new Template(id, block, opts.generators, cb);
  }
}
