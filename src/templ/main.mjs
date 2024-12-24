import { serialize, taggify, scopify, rulify } from '../markup/html.mjs';
import { pascalCase, snakeCase, Is } from '../utils/server.mjs';

import { executeAsync } from '../render/async.mjs';
import { decorate, streamify } from './send.mjs';
import { debug, stringify } from './utils.mjs';
import { rebase } from '../handler/utils.mjs';
import { ents } from '../render/hooks.mjs';

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;
const RE_SAFE_NAME = /(?:^|\/)(.+?)(?:\/\+\w+)?\.\w+$/;

const RE_EXTERNALS = /\b(?:import[^;=]*\(?(?:"([^;]+)"|'([^;]+)')|(?:export|import)[^;=]+from\s*(?:"([^;]+)"|'([^;]+)'))/g;
const RE_COMMENTS = /\/\*[\S\s]*?\*\/|\/\/.*/g;

const NO_HOOKS = {
  useState: v => [v],
  useRef: () => null,
  onError: () => null,
  useEffect: () => null,
  wrapComponent: () => null,
};

export class Template {
  constructor(name, block, options, callback) {
    this.generators = options.generators;
    this.attributes = { ...options };
    delete this.attributes.generators;

    this.component = name;
    this.partial = block;

    Object.defineProperty(this, 'build', { value: callback });
  }

  async regenerate(imported = []) {
    Template.cache = Template.cache || new Map();

    return this.transform(Template.transpile, null, {
      params: this.attributes,
      use: this.generators,
    }, imported);
  }

  async transform(cb, bundle, options, imported = []) {
    const resources = this.partial.assets;
    const context = this.partial.context;
    const filepath = this.partial.src;
    const target = this.partial.dest;
    const scope = this.partial.id;
    const { markup } = this.partial;

    const set = [];
    const tasks = [];
    const isStatic = context === 'static';
    const isClient = bundle || context === 'client';

    if (!imported.includes(target)) {
      imported.push(target);
    }

    for (const c of this.partial.children) {
      if (Template.exists(c.src)) {
        if (imported.includes(c.src)) continue;
        imported.push(c.src);
        tasks.push(this.build(c.src, c.code)
          .transform(cb, isClient, options, imported)
          .then(result => set.push(...result)));
      } else {
        console.debug(`=> '${c.src}' not found in`, target);
      }
    }

    set.push(...this.partial.imports);

    if (Is.func(cb)) {
      tasks.push(cb(this.partial.scripts
        .filter(x => x.root || x.attributes.scoped || x.attributes.type === 'module'), 'js', options)
        .then(js => set.unshift(...js.map((x, i) => {
          const destFile = `${target.replace('.html', '')}(${i}).js`;

          resources.js.push([x.params.type === 'module' ? 1 : 0, x.parent, destFile]);
          return { content: x.content, dest: destFile };
        }))));

      this.partial.styles.forEach(x => {
        tasks.push(cb(x, 'css', options).then(code => {
          if (!x.attributes.global) {
            resources.css.push(scopify(scope, x.attributes.scoped, code.content, markup.content, `${x.identifier}.css`));
          } else {
            resources.css.push(rulify(code.content, target));
          }
        }));
      });
    }

    await Promise.all(tasks);

    if (this.generators?.css) {
      const { css } = await this.generators.css.generate(this.partial.rules.join(' '));

      resources.css.push(rulify(css, target));
    }

    let result;
    if (isStatic) {
      set.push(result = { content: this.partial.toString(), src: filepath, dest: target });
    } else {
      const children = [...new Set(this.partial.children.map(x => x.src))];

      result = { content: this.partial.toString(), src: filepath, children, dest: target };

      if (isClient) {
        set.push({ ...result, client: true });
      } else {
        set.unshift(result);
      }
    }
    return set;
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
    const js = result.scripts[this.module.__src];
    const doc = result.doc;
    const meta = result.head;
    const attrs = result.attrs;

    return { attrs, meta, html, doc, css, js };
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
      // console.log('E_ACTIONS', e);
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

    // FIXME: use this technique when executing from fragments over ws/sse
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

    return chunk;
  }

  static compile(cb, mod, opts, imported) {
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
    context.base_url = context.base_url || context.conn?.base_url;
    context.is_json = context.is_json || context.conn?.is_xhr;
    context.streams = context.streams || new Map();
    context.locals = context.locals || streamify(context);
    context.mixins = context.mixins || [];
    context.stack = context.stack || [];
    context.scope = context.scope || {};
    context.depth = context.depth || 0;

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

    // 1. setup hooks for ws/sse here
    const tasks = [];

    try {
      let result = await Template.render(component, null, props, context, cb);

      // 4. a this point we should have something... so, we can wait, or not...

      if (!result) {
        // console.log({ component, props });
        throw new Error('Missing response?');
      }

      Object.values(context.scope).forEach(_ => tasks.push(..._.handlers));
      await Promise.all(tasks.map(fn => fn(result)));

      // console.log('GOT', context.stack);

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
      // console.log('E_ROUTE', e);
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

    const styles = { [component.__src]: component.__styles };
    const scripts = { [component.__src]: component.__scripts };

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

      let state = { ...props, ...data };
      if (ctx.locals) state = await ctx.locals.wrap(state);

      let [doc, body, head, attrs] = await Promise.all([
        view(component.__doctype, state, `${component.__src}#doctype`),
        view(component.__template, state, `${component.__src}#template`),
        view(component.__metadata, state, `${component.__src}#metadata`),
        view(component.__attributes, state, `${component.__src}#attributes`),
      ]);

      while (body?.length === 1 && !Is.vnode(body[0])) body = body[0];
      while (head?.length === 1 && !Is.vnode(head[0])) head = head[0];

      if (component.__context === 'client') {
        body = Template.client(ctx, body, props, parent, component);
      }

      // 3. render cycle is over...

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
        return Template.reload(id);
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
        ? Template.reload(`file://${resolved}`)
        : Template.reload(`file://${process.cwd()}/${resolved}`);
    }

    return Template.reload(id);
  }

  static async reload(id, force) {
    if (!force && Template.cache?.has(id)) {
      return Template.cache.get(id).module;
    }
    if (force && id.charAt() === '/') {
      return import(`file://${id}?d=${Date.now()}`);
    }
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

    if (ctx.queue) {
      ctx.queue.set(ctx.uuid, ctx.ref, component.__exported.reduce((memo, key) => {
        const value = props[key];
        if (Is.data(value)) memo[key] = value;
        return memo;
      }, {}));
    }

    const attrs = Object.keys(props).reduce((memo, key) => {
      if (/^(?:@|on|data|class|style|aria)/.test(key)) memo[key] = props[key];
      else if (key !== 'tag' && Is.scalar(props[key])) memo[key] = props[key];
      return memo;
    }, { 'data-component': ctx.ref });

    return [props.tag || 'div', attrs, body || []];
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

  static imports(str, base, shared, filepath, imported = new Map()) {
    const ret = shared || {};
    str
      .replace(RE_COMMENTS, '')
      .replace(RE_EXTERNALS, (_, $1, $2, $3, $4) => {
        const src = $4 || $3 || $2 || $1;
        const source = base ? Template.join(`${base}/`, src) : src;

        if (src.charAt() !== '.' || filepath === source) return _;

        const key = rebase(source.replace(process.cwd(), '.'));

        if (imported.has(key)) {
          const { set, found } = imported.get(key);

          ret[key] = { ...ret[key], children: [...new Set(Object.keys(set).concat(ret[key]?.children || []))] };
          Object.assign(ret, found);
          return _;
        }

        const set = {};
        const code = Template.read(source);
        const found = Template.imports(code, Template.dirname(source), set, source, imported);

        ret[key] = { ...ret[key], children: [...new Set(Object.keys(set).concat(ret[key]?.children || []))] };
        imported.set(key, { set, found });
        Object.assign(ret, found);
      });
    return ret;
  }

  static relative(a, b) {
    return rebase(Template.join(a, b).replace(process.cwd(), '.'));
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

  static path(mod) {
    const paths = [];

    if (mod.indexOf('node:') === 0) return mod;
    if (!mod.includes(':') && mod.charAt() === '/') paths.push(mod);
    else if (Template.exists(`node_modules/${mod.split(':')[0]}/package.json`)) return mod;

    for (let i = 0; i < paths.length; i += 1) {
      if (Template.exists(paths[i])) return paths[i];
      if (Template.exists(`${paths[i]}.js`)) return `${paths[i]}.js`;
      if (Template.exists(`${paths[i]}.mjs`)) return `${paths[i]}.mjs`;
      if (Template.exists(`${paths[i]}.cjs`)) return `${paths[i]}.cjs`;
      if (Template.exists(`${paths[i]}/index.js`)) return `${paths[i]}/index.js`;
      if (Template.exists(`${paths[i]}/index.mjs`)) return `${paths[i]}/index.mjs`;
      if (Template.exists(`${paths[i]}/index.cjs`)) return `${paths[i]}/index.cjs`;
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

    return new Template(id, block, opts, cb);
  }
}
