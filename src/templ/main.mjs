import { pascalCase, snakeCase, realpath, Is } from '../utils/server.mjs';
import { serialize, taggify, scopify, rulify } from '../markup/html.mjs';
import { executeAsync } from '../render/async.mjs';
import { debug, stringify } from './utils.mjs';
import { ents } from '../render/hooks.mjs';
import { decorate } from './send.mjs';

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;
const RE_SAFE_NAME = /(?:^|\/)(.+?)(?:\/\+\w+)?\.\w+$/;

const NO_HOOKS = {
  useState: v => [v],
  useRef: () => null,
  onError: () => null,
  useEffect: () => null,
  wrapComponent: () => null,
};

export class Template {
  constructor(name, block, hooks, callback) {
    this.generators = hooks || [];
    this.component = name;
    this.partial = block;

    Object.defineProperty(this, 'build', { value: callback });
  }

  async regenerate(imported = []) {
    const cwd = process.cwd();

    Template.cache = Template.cache || new Map();

    const mods = await this.transform(Template.transpile, null, {
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

    if (!mods.length) {
      throw new Error(`Failed to compile '<${this.component}>' component`);
    }
    return mods;
  }

  async transform(cb, bundle, options, imported = []) {
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
          .transform(cb, isClient, options, imported)
          .then(result => mod.push(...result)));
      } else {
        console.debug(`=> '${c.src}' not found in`, target);
      }
    }

    mod.push(...this.partial.imports);

    if (Is.func(cb)) {
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

  async render(props = {}, ctx = {}, cb = null) {
    const result = await Template.render(this.module, null, props, ctx, cb);
    const html = taggify(result.body);
    const css = result.styles[this.module.__src];
    const doc = result.doc;
    const meta = result.head;
    const attrs = result.attrs;

    return { attrs, meta, html, css, doc };
  }

  static async preflight(main, ctx, cb) {
    let response;
    try {
      if (main.__actions && cb) {
        let _chunk = await cb(ctx, main.__actions);
        _chunk = Template.response(_chunk);
        if (_chunk instanceof Response) response = _chunk;
      }
    } catch (e) {
      if (Is.func(main.__actions?.catch)) {
        await main.__actions.catch(e);
      } else {
        throw e;
      }
    } finally {
      if (Is.func(main.__actions?.finally)) {
        await main.__actions.finally();
      }
    }
    if (response) return response;
    if (ctx.conn && ctx.conn.has_status) {
      return new Response(ctx.conn.body, {
        status: ctx.conn.status_code,
        headers: ctx.conn.resp_headers,
      });
    }
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

    chunk.doc['data-location'] = filepath;
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

  static async compile(cb, mod, opts, imported) {
    mod = Template.from((_, file, _opts) => cb(_, file, { ..._opts, ...opts }), mod, opts);
    return mod.regenerate(imported);
  }

  static async resolve(component, filepath, context, props, cb) {
    const response = await Template.reduce(component, filepath, context, props, cb);
    if (context.write) stringify(response, context.write);
    return response;
  }

  static async reduce(component, filepath, context, props, cb) {
    let result;
    if (!context.components) {
      result = await Template.execute(component, context, props, cb);
      return result;
    }

    for (const _component of context.components) {
      try {
        if (result) {
          // eslint-disable-next-line no-loop-func
          props.children = () => result.body;
        }

        result = await Template.execute(_component, context, props, cb);
      } catch (e) {
        console.log('E_RESOLVE', e);
      }
    }
    return result;
  }

  static async execute(component, context, props, cb) {
    context.base_url = context.conn?.base_url;
    context.is_json = context.conn?.is_xhr;
    context.mixins = [];
    context.stack = [];
    context.scope = {};

    const shared = {
      failure: null,
      fragments: {},
      prelude: [],
      scripts: {},
      styles: {},
      attrs: {},
      head: [],
      doc: {},
    };

    const tasks = [];

    try {
      let result = await Template.render(component, null, props, context, cb);

      if (!result) {
        // console.log({ component, props });
        throw new Error('Missing response?');
      }

      Object.values(context.scope).forEach(_ => tasks.push(..._.handlers));
      await Promise.all(tasks.map(fn => fn(result)));

      if (!(result instanceof Response)) {
        if (context.route?.layout) {
          props.children = () => result.body;

          const layout = await Template.render(context.route.layout, null, props, context);
          const response = await Template.finalize(null, context, layout, [result, shared].concat(context.mixins), component.__src);
          return response;
        }
        result = await Template.finalize(null, context, result, [shared].concat(context.mixins), component.__src);
      }
      return result;
    } catch (e) {
      if (context.route?.error) {
        props = props || {};
        props.failure = e;
        props.failure.reason = e.message;
        props.failure.source = props.failure.stack.split('\n')[0].split(' at ')[1];
        props.failure.stack = props.failure.stack.split('\n').slice(1).join('\n');

        const error = await Template.render(context.route.error, null, props, context);
        const result = await Template.finalize(e, context, error, [shared].concat(context.mixins), component.__src);
        return result;
      }
      throw e;
    }
  }

  static async render(component, parent, props, ctx, cb = null) {
    ctx.ref = ctx.stack && component.__context !== 'static'
      ? `${component.__src}/${++ctx.depth}`
      : component.__src;

    const styles = {
      [component.__src]: component.__styles,
    };

    const scripts = {
      [component.__src]: component.__scripts
        .map(([k, v], i) => [k, `/* ${component.__src}(${i}) */\n${v}`]),
    };

    const hooks = component.__context === 'module'
      ? Template.hooks(ctx, parent)
      : null;

    const loader = (...args) => {
      if (args[0] === 'jamrock') return NO_HOOKS;
      if (args[0] === 'jamrock:conn') return ctx.conn;
      if (args[0] === 'jamrock:hooks') return hooks;
      return Template.load(...args);
    };

    const self = component.__handler
      ? await component.__handler(props, loader)
      : null;

    const view = executeAsync(loader, async (child, _) => {
      const result = await Template.render(child, component, _, ctx, cb);
      return result.body;
    });

    if (ctx.stack) ctx.stack.push(ctx.ref);

    const main = self?.__context ? await self.__context() : null;

    if (main && component.__context === 'module') {
      const response = await Template.preflight(main, ctx, cb);
      if (response) return response;
    }

    try {
      const data = main?.__scope ?? main?.__callback?.();
      const state = { ...props, ...data };

      const [doc, body, head, attrs] = await Promise.all([
        view(component.__doctype, state),
        view(component.__template, state),
        view(component.__metadata, state),
        view(component.__attributes, state),
      ]);

      if (component.__context === 'client') {
        Template.client(ctx, body, props, parent, component);
      }

      return {
        scripts, styles, attrs, head, body, doc,
      };
    } catch (e) {
      this.failure = debug({
        file: component.__src,
        html: Template.read(component.__src),
        code: Template.read(component.__dest),
      }, e);

      if (ctx.route?.error) throw this.failure;

      return { scripts, styles, body: [['pre', {}, ents(this.failure.stack)]] };
    } finally {
      if (ctx.stack) ctx.stack.pop();
    }
  }

  static async load(id) {
    let resolved;
    if (!id.includes(':')) {
      resolved = Template.path(id);
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

  static client(ctx, body, props, parent, component) {
    if (parent?.__context !== 'module') return;

    // FIXME: we need a particular strategy here,
    // we should wrap only top-level components that
    // are client-side, and let the inner ones as is...
    // once on the DOM, we only patch the root-component!!
    // also, we can provide special tags or meanings to
    // hydrate on interaction, or client-side only, etc.
    // i.e. on:idle on:visible on:interaction

    console.log('CSR', component.__src, props);

    if (!body[0] && body.length === 1) {
      body[0] = 'div';
      body[1] = { ...props, 'data-component': ctx.ref };
      body[2] = [];
    } else if (Is.vnode(body[0]) && body.length === 1) {
      body.unshift({ ...props, 'data-component': ctx.ref });
      body.unshift('div');
    }
  }

  static hooks(ctx, parent) {
    const _parent = ctx.stack?.at(-1) ?? parent?.__src;

    return {
      onComplete: fn => {
        const stack = ctx.scope[ctx.ref] ?? ctx.scope[_parent];
        if (stack) stack.handlers.push(fn);
      },
      getContext: k => {
        const stack = ctx.scope[ctx.ref] ?? ctx.scope[_parent];
        return stack?.values[k];
      },
      setContext: (k, v) => {
        const _component = ctx.stack?.at(-1);
        const current = ctx.scope[_component] ?? { handlers: [], values: {} };

        if (current) {
          current.values[k] = v;
        }

        if (!ctx.scope[_component]) {
          ctx.scope[_component] = current;
        }
      },
    };
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

  static join(base, leaf, resolve) {
    if (resolve) {
      const c = [];
      const a = base.split('/');
      const b = leaf.split('/');

      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) break;
        c.push(a[i]);
      }

      const backtracks = Math.max(a.length - c.length - 1, 0);
      const diff = b.slice(c.length, b.length);

      return [...Array.from({ length: backtracks }).fill('..'), ...diff].join('/');
    }

    const a = new URL(`file://${base}`);
    const b = URL.parse(leaf, a);
    return b.href.replace('file://', '');
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

  static from(compile, block, opts = {}) {
    if (!block.src) {
      throw new Error(`Failed to parse '${block.filepath}'`, { cause: block.failure });
    }

    const name = block.src.match(RE_SAFE_NAME)[1]
      .replace(/\W+/g, '-')
      .replace(/-$/, '');

    Object.assign(block.opts, opts);

    const id = pascalCase(snakeCase(name));
    const cb = (src, code, _opts) => Template.from(compile, compile(code, src), { ...opts, ..._opts });

    return new Template(id, block, opts.generators, cb);
  }
}
