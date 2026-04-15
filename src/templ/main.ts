import { serialize, taggify, scopify, rulify, cssify } from '../markup/html.ts';
import { pascalCase, snakeCase, trace, dump, Is } from '../utils/server.ts';

import { executeAsync, executeSync } from '../render/async.ts';
import { debug, stringify } from './utils.ts';
import { rebase } from '../handler/utils.ts';
import { ents } from '../render/hooks.ts';
import { decorate } from './send.ts';

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;
const RE_SAFE_NAME = /(?:^|\/)(.+?)(?:\/\+\w+)?\.\w+$/;

const RE_EXTERNALS = /\b(?:import[^;=]*\(?(?:"([^;]+)"|'([^;]+)')|(?:export|import)[^;=]+from\s*(?:"([^;]+)"|'([^;]+)'))/g;
const RE_COMMENTS = /\/\*[\S\s]*?\*\/|\/\/.*/g;

const NO_HOOKS = {
  signal: (v: any) => ({ value: v }),
  computed: (fn: any) => ({ value: fn() }),
  effect: () => null,
  trap: () => null,
  scope: (v: any) => ({ value: v }),
  ref: () => ({ current: null }),
};

const LIBDIR = 'jamrock';

export class Template {
  static cache: any = null;
  static shared: string = LIBDIR;

  generators: any;
  elements: any;
  attributes: any;
  component: string;
  partial: any;
  module: any;

  declare _build: any;
  declare failure: any;

  constructor(name: string, block: any, options: any, callback: any) {
    this.generators = options.generators;
    this.elements = options.elements;
    this.attributes = { ...options };

    delete this.attributes.generators;
    delete this.attributes.elements;

    this.component = name;
    this.partial = block;
    this.module = {};

    Object.defineProperty(this, '_build', { value: callback, enumerable: false });
  }

  build(src: string, code: string) {
    return this._build(src, code);
  }

  async regenerate(imported: string[] = []): Promise<any> {
    return this.transform(Template.transpile, null, {
      params: this.attributes,
      use: this.generators,
    }, imported);
  }

  async transform(cb: any, bundle: any, options: any, imported: string[] = []): Promise<any[]> {
    const defaults = this.partial.opts;
    const resources = this.partial.assets;
    const context = this.partial.context;
    const filepath = this.partial.src;
    const target = this.partial.dest;
    const scope = this.partial.id;
    const { markup } = this.partial;

    const set: any[] = [];
    const tasks: Promise<any>[] = [];
    const isStatic = context === 'static';
    const isClient = bundle || context === 'client';
    const children = this.partial.children.map((_: any) => _.src);

    if (!imported.includes(target)) {
      imported.push(target);
    }

    for (const c of this.partial.children) {
      if (Template.exists(c.src)) {
        if (imported.includes(c.src)) continue;
        imported.push(c.src);
        tasks.push(this.build(c.src, c.code)
          .transform(cb, isClient, options, imported)
          .then((result: any[]) => set.push(...result)));
      } else {
        dump(`=> '${c.src}' not found in`, target);
      }
    }

    set.push(...this.partial.imports);

    if (Is.func(cb)) {
      tasks.push(cb(this.partial.scripts
        .filter((x: any) => x.root || x.attributes.scoped || x.attributes.global), 'js', options)
        .then((js: any[]) => set.unshift(...js.map((x: any, i: number) => {
          const destFile = `${target.replace(/\.(?:md|html)/, '')}(${i}).js`;

          children.push(...x.children);
          resources.js.push([x.parent, destFile, x.children]);
          return { content: x.content, dest: destFile };
        }))));

      tasks.push(cb(this.partial.styles, 'css', options)
        .then((css: any[]) => set.unshift(...css.map((x: any, i: number) => {
          const destFile = `${target.replace(/\.(?:md|html)/, '')}(${i}).css`;

          if (defaults.src) {
            x.content = x.content.replace(/url\((.+?)\)/g, (_: string, $1: string) => {
              if ($1.charAt(0) === '/' || $1.indexOf('http') === 0) return _;
              resources.media.push(Template.join(defaults.src, $1));
              return `url(${Template.url(defaults.target || '/', $1, true)})`;
            });
          }

          let styles;
          if (!x.params.global) {
            styles = scopify(scope, x.params.scoped, x.content, markup.content, destFile);
          } else {
            styles = rulify(x.content, target);
          }

          children.push(...x.children);
          resources.css.push([destFile, x.children]);
          return { content: cssify(styles), dest: destFile };
        }))));
    }

    await Promise.all(tasks);

    if (this.generators?.css) {
      const { css } = await this.generators.css.generate(this.partial.rules.join(' '));
      const destFile = target.replace(/\.(?:md|html)/, '.css');
      const styles = cssify(rulify(css, target));

      resources.css.push([destFile]);
      set.unshift({ content: styles, dest: destFile });
    }

    await this.partial.transform(this.elements, resources);

    const _children = [...new Set(children)];

    let result: any = this.partial.toString();
    if (isStatic) {
      set.unshift(result = { content: result, children: _children, src: filepath, dest: target, js: true });
    } else {
      set.unshift(result = { children: _children, content: result, client: isClient, src: filepath, dest: target, js: true });
    }
    return set;
  }

  async compile(mod: any, block: any, callback: any): Promise<this> {
    const value = await callback(mod.content, block.src);
    Object.defineProperty(this, 'module', { value });
    return this;
  }

  async render(props: any = {}, ctx: any = {}, cb: any = null): Promise<any> {
    const result = await Template.render(this.module, null, props, ctx, cb);
    const output = Template.finalize(null, ctx, result, [], this.module.__src);

    const html = taggify(output.body);
    const css = output.styles[this.module.__src];
    const js = output.scripts[this.module.__src];
    const doc = output.doc;
    const meta = output.head;
    const attrs = output.attrs;
    const media = output.media;
    const actions = output.actions;

    return { actions, media, attrs, meta, html, doc, css, js };
  }

  static async preflight(main: any, ctx: any, cb: any): Promise<any> {
    let response;
    try {
      if (main.__default && cb) {
        let _chunk = await cb(ctx, main.__default);
        _chunk = Template.response(_chunk);
        if (_chunk instanceof Response) response = _chunk;
      }
    } catch (e: any) {
      trace('E_ACTIONS', e);
      if (Is.func(main.__default?.catch)) {
        await main.__default.catch(e);
      } else {
        throw e;
      }
    } finally {
      if (Is.func(main.__default?.finally)) {
        await main.__default.finally();
      }
    }
    if (response) return response;
    if (ctx.conn && ctx.conn.is_close) {
      return new Response(ctx.conn.resp_body, {
        status: ctx.conn.status_code,
        headers: ctx.conn.resp_headers,
      });
    }
  }

  private static MERGE_KEYS = ['doc', 'attrs', 'media', 'styles', 'scripts', 'actions'] as const;

  static finalize(e: any, self: any, chunk: any, mixins: any, filepath: string): any {
    mixins.forEach((mixin: any) => {
      chunk.head = (chunk.head || []).concat(mixin.head);

      for (const key of Template.MERGE_KEYS) {
        Object.assign(chunk[key], mixin[key]);
      }
    });

    serialize(chunk.body, null, (vnode: any, hooks: any[]) => decorate(chunk, self, vnode, hooks));
    serialize(chunk.head, null, (vnode: any, hooks: any[]) => decorate(chunk, self, vnode, hooks));

    const images: string[] = [];
    const fragments: any = {};

    const chunkAssets: string[] = [...new Set<string>([].concat(...Object.values(chunk.media) as any))];
    const contextAssets: string[] = self.media ? [...self.media] : [];
    const assets: string[] = [...new Set<string>([...chunkAssets, ...contextAssets])];

    for (const asset of assets) {
      if (asset.endsWith('.svg')) {
        const svg = Template.read(asset)
          .trim()
          .replace(/>\s*</g, '><')
          .replace('</svg>', '</symbol>')
          .replace('<svg ', `<symbol id="${Template.filename(asset, '.svg')}" `);

        images.push(svg);
      }
    }

    if (images.length > 0) {
      chunk.body.push(['svg', {
        width: 0,
        height: 0,
        style: 'position:absolute',
        xmlns: 'http://www.w3.org/2000/svg',
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        '@html': images.join('\n'),
      }]);
    }

    chunk.head.unshift(['base', { href: self.base_url && self.base_url !== '/' ? `${self.base_url}/` : '/' }]);
    chunk.head.unshift(['meta', { charset: 'utf-8' }]);

    chunk.doc['data-location'] = filepath;
    chunk.status = e ? e.status : null;
    chunk.fragments = fragments;

    return chunk;
  }

  static compile(cb: any, mod: any, opts: any, imported?: string[]): Promise<any> {
    mod = Template.from((_: any, file: string, _opts: any) => cb(_, file, { ..._opts, ...opts }), mod, opts);
    return mod.regenerate(imported);
  }

  static async resolve(component: any, filepath: string, context: any, props: any, cb: any): Promise<any> {
    const response = await Template.reduce(component, filepath, context, props, cb);
    if (context.write) stringify(response, context.prefix, context.write);
    return response;
  }

  static resolveSync(component: any, filepath: string, context: any, props: any, cb: any): any {
    const response = Template.reduceSync(component, filepath, context, props, cb);
    if (context.write) stringify(response, context.prefix, context.write);
    return response;
  }

  private static initContext(context: any): void {
    context.base_url = context.base_url || context.conn?.base_url;
    context.is_json = context.is_json || context.conn?.is_json;
    context.mixins = context.mixins || new Map();
    context.stack = context.stack || [];
    context.scope = context.scope || {};
    context.depth = context.depth || 0;
    context.tag = context.tag || Template.tag(context);
    context.media = context.media || new Set<string>();
  }

  static async reduce(component: any, filepath: string, context: any, props: any, cb: any): Promise<any> {
    let result;
    if (!context.components) {
      return Template.execute(component, context, props, cb);
    }

    for (const _component of context.components) {
      try {
        if (result) {
          // eslint-disable-next-line no-loop-func
          props.children = () => result.body;
        }

        result = await Template.execute(_component, context, props, cb);
      } catch (e: any) {
        trace('E_RESOLVE', filepath, e);
      }
    }
    return result;
  }

  static reduceSync(component: any, filepath: string, context: any, props: any, cb: any): any {
    let result;
    if (!context.components) {
      return Template.executeSync(component, context, props, cb);
    }

    for (const _component of context.components) {
      try {
        if (result) {
          // eslint-disable-next-line no-loop-func
          props.children = () => result.body;
        }

        result = Template.executeSync(_component, context, props, cb);
      } catch (e: any) {
        trace('E_RESOLVE', filepath, e);
      }
    }
    return result;
  }

  private static processError(e: any, props: any): void {
    props.failure = e;
    props.failure.reason = e.message;
    props.failure.source = props.failure.stack.split('\n')[0].split(' at ')[1];
    props.failure.stack = props.failure.stack.split('\n').slice(1).join('\n');
  }

  static executeSync(component: any, context: any, props: any, cb: any): any {
    Template.initContext(context);

    const tasks: any[] = [];

    try {
      let result = Template.renderSync(component, null, props, context, cb);

      Object.values(context.scope).forEach((_: any) => tasks.push(..._.handlers));

      tasks.forEach(fn => fn(result));

      if (!(result instanceof Response)) {
        if (context.route?.layout) {
          const markup = result.body;

          delete result.body;
          props.children = () => markup;
          context.mixins.set(component.__src, result);

          const layout = Template.renderSync(context.route.layout, null, props, context);
          return Template.finalize(null, context, layout, context.mixins, component.__src);
        }
        result = Template.finalize(null, context, result, context.mixins, component.__src);
      }
      return result;
    } catch (e: any) {
      trace('E_ROUTE', e);
      if (context.route?.error) {
        props = props || {};
        Template.processError(e, props);

        const error = Template.renderSync(context.route.error, null, props, context);
        return Template.finalize(e, context, error, context.mixins, component.__src);
      }
      throw e;
    }
  }

  static async execute(component: any, context: any, props: any, cb: any): Promise<any> {
    Template.initContext(context);

    const tasks: any[] = [];

    try {
      let result = await Template.render(component, null, props, context, cb);

      Object.values(context.scope).forEach((_: any) => tasks.push(..._.handlers));

      await Promise.all(tasks.map(fn => fn(result)));

      if (!(result instanceof Response)) {
        if (context.route?.layout) {
          const markup = result.body;

          delete result.body;
          props.children = () => markup;
          context.mixins.set(component.__src, result);

          const layout = await Template.render(context.route.layout, null, props, context);
          return await Template.finalize(null, context, layout, context.mixins, component.__src);
        }
        result = await Template.finalize(null, context, result, context.mixins, component.__src);
      }
      return result;
    } catch (e: any) {
      trace('E_ROUTE', e);
      if (context.route?.error) {
        props = props || {};
        Template.processError(e, props);

        const error = await Template.render(context.route.error, null, props, context);
        return Template.finalize(e, context, error, context.mixins, component.__src);
      }
      throw e;
    }
  }

  static async settle(props: any): Promise<void> {
    if (props) {
      const keys = Object.keys(props);
      const promises = Object.values(props);
      const outcomes = await Promise.allSettled(promises);

      for (let i = 0; i < keys.length; i++) {
        if (outcomes[i].status === 'fulfilled') {
          props[keys[i]] = (outcomes[i] as PromiseFulfilledResult<any>).value;
        } else {
          console.error('E_RESOLVE', keys[i], outcomes[i]);
        }
      }
    }
  }

  static prepare(component: any, parent: any, ctx: any): any {
    if (!component) {
      throw new Error(`Missing component, given '${component}'`);
    }

    ctx.ref = ctx.stack && component.__context !== 'static'
      ? `${component.__src}/${++ctx.depth}`
      : component.__src;

    const scripts = { [component.__src]: component.__scripts.map((_: any) => [_[0], _[1]]) };
    const styles = { [component.__src]: component.__styles.map((_: any) => _[0]) };
    const media = { [component.__src]: component.__media };

    const hooks = component.__context === 'module'
      ? Template.hooks(ctx, parent)
      : null;

    const loader = (id: string) => {
      if (id === 'jamrock') return ctx.hooks || NO_HOOKS;
      if (id === 'jamrock:conn') return ctx.conn;
      if (id === 'jamrock:hooks') return hooks;
      if (id === 'jamrock:shared') return { /* shared utils from given runtime? */ };
      throw new Error(`Unable to import "${id}"`);
    };

    return { loader, scripts, styles, media };
  }

  private static normalizeViews(doc: any, body: any, head: any): void {
    while (body?.length === 1 && !Is.vnode(body[0])) body = body[0];
    while (head?.length === 1 && !Is.vnode(head[0])) head = head[0];
  }

  private static createRenderError(e: any, component: any): any {
    trace(e, 'E_RENDER');
    return debug({
      file: component.__src,
      html: Template.read(component.__src),
      code: Template.read(component.__dest),
    }, e);
  }

  private static createErrorResponse(failure: any, scripts: any, styles: any, media: any): any {
    return { scripts, styles, media, body: [['pre', {}, ents(failure.stack)]] };
  }

  private static popStack(ctx: any): void {
    if (ctx.stack) {
      ctx.stack.pop();
      ctx.ref = ctx.stack.at(-1);
    }
  }

  static async render(component: any, parent: any, props: any, ctx: any, cb: any = null): Promise<any> {
    const { scripts, styles, media, loader } = Template.prepare(component, parent, ctx);

    ctx.base = Template.dirname(component.__src);

    await Template.settle(props);

    const self = component.__handler
      ? await component.__handler(props, loader)
      : null;

    const view = executeAsync(ctx.tag, loader, async (child: any, _: any) => {
      const chunk = await Template.render(child, component, _, ctx, cb);
      const body = chunk.body;

      if (ctx.mixins && !ctx.mixins.has(child.__src)) {
        ctx.mixins.set(child.__src, chunk);
      }

      return body;
    });

    if (ctx.stack) ctx.stack.push(ctx.ref);

    const main = self?.__context ? self.__context() : null;

    if (main && component.__context === 'module') {
      const response = await Template.preflight(main, ctx, cb);
      if (response) return response;
    }

    try {
      const data = main?.__scope ?? main?.__callback?.();
      const calls = main?.__default?.actions || {};
      const actions = { [ctx.ref]: calls };

      let state = { ...props, ...data };
      if (ctx.stream) {
        const frags = await Promise.all(Object.entries(component.__fragments).map(async ([k, v]: [string, any]) => ({
          target: k,
          template: v.r,
          variables: v.s,
          attributes: await view(v.a, state, `${component.__src}#@${k}`),
        })));

        state = await ctx.stream.sync(state, async (key: string, item: any) => {
          const input = { ...props, ...data, [key]: [item] };
          const source = frags.find(_ => _.variables.includes(key));

          if (source) {
            const { target, template } = source;
            const vnode = await view(template, input, `${component.__src}#!${key}`);

            return { target, vnode };
          }
        }, frags);
      }

      let [doc, body, head, attrs]: any[] = await Promise.all([
        view(component.__doctype, state, `${component.__src}#doctype`),
        view(component.__template, state, `${component.__src}#template`),
        view(component.__metadata, state, `${component.__src}#metadata`),
        view(component.__attributes, state, `${component.__src}#attributes`),
      ]);

      Template.normalizeViews(doc, body, head);

      if (component.__context === 'client') {
        body = Template.client(ctx, body, props, parent, component);
      }

      return {
        actions, scripts, styles, media, attrs, head, body, doc,
      };
    } catch (e: any) {
      (this as any).failure = Template.createRenderError(e, component);

      if (ctx.route?.error) throw (this as any).failure;

      return Template.createErrorResponse((this as any).failure, scripts, styles, media);
    } finally {
      Template.popStack(ctx);
    }
  }

  static renderSync(component: any, parent: any, props: any, ctx: any, cb: any = null): any {
    const { scripts, styles, media, loader } = Template.prepare(component, parent, ctx);

    ctx.base = Template.dirname(component.__src);

    const self = component.__handler
      ? component.__handler(props, loader)
      : null;

    const view = executeSync(ctx.tag, loader, (child: any, _: any) => {
      const chunk = Template.renderSync(child, component, _, ctx, cb);
      const body = chunk.body;

      if (ctx.mixins && !ctx.mixins.has(child.__src)) {
        ctx.mixins.set(child.__src, chunk);
      }
      return body;
    });

    if (ctx.stack) ctx.stack.push(ctx.ref);

    const main = self?.__context ? self.__context() : null;

    try {
      const data = main?.__scope ?? main?.__callback?.();
      const calls = main?.__default?.actions || {};
      const actions = { [ctx.ref]: calls };

      let state = { ...props, ...data };
      let [doc, body, head, attrs]: any[] = [
        view(component.__doctype, state, `${component.__src}#doctype`),
        view(component.__template, state, `${component.__src}#template`),
        view(component.__metadata, state, `${component.__src}#metadata`),
        view(component.__attributes, state, `${component.__src}#attributes`),
      ];

      Template.normalizeViews(doc, body, head);

      if (component.__context === 'client') {
        body = Template.client(ctx, body, props, parent, component);
      }

      return {
        actions, scripts, styles, media, attrs, head, body, doc,
      };
    } catch (e: any) {
      (this as any).failure = Template.createRenderError(e, component);

      if (ctx.route?.error) throw (this as any).failure;

      return Template.createErrorResponse((this as any).failure, scripts, styles, media);
    } finally {
      Template.popStack(ctx);
    }
  }

  static async load(id: string): Promise<any> {
    let resolved;
    if (!id.includes(':')) {
      resolved = Template.path(id);
    } else if (!RE_SAFE_IMPORTS.test(id)) {
      const [mod, name] = id.split(':');

      resolved = Template.path(`${Template.cwd()}/node_modules/${mod}/shared/${name}`);

      if (!resolved) {
        return Template.reload(id);
      }
    }

    if (Template.cache && Template.cache.has(resolved || id)) {
      return Template.cache.get(resolved || id)?.module;
    }

    if (resolved && (resolved.includes('.md') || resolved.includes('.html'))) {
      throw new Error(`Cannot import '${resolved}' file as module`);
    }

    if (resolved && Template.exists(resolved)) {
      return resolved[0] === '/'
        ? Template.reload(`file://${resolved}`)
        : Template.reload(`file://${Template.cwd()}/${resolved}`);
    }

    return Template.reload(id);
  }

  static async reload(id: string, force?: boolean): Promise<any> {
    if (!force && Template.cache?.has(id)) {
      return Template.cache.get(id)?.module;
    }
    if (force && id[0] === '/') {
      // @ts-expect-error
      if (typeof globalThis.imports !== 'undefined') {
        // eslint-disable-next-line
        (globalThis as any).imports.searchPath = (globalThis as any).imports.searchPath.filter((_: string) => !_.includes(id));
        return import(`file://${id}`);
      }
      return import(`${id}?_=${Math.random()}`);
    }
    return import(id);
  }

  static transpile(tpl: any): any {
    if (Is.arr(tpl)) {
      return Promise.all(tpl.map(Template.transpile));
    }

    return Promise.resolve({
      params: { ...tpl.attributes },
      content: tpl.content,
      children: [],
    });
  }

  static plain(code: number, body: any, headers?: any): [number, any, any] {
    if (Is.plain(body)) {
      body = JSON.stringify(body);
      headers = {
        ...headers,
        'content-type': 'application/json',
        'content-length': body.length,
      };
    }
    return [code, body, headers];
  }

  static response(body: any): any {
    if (Is.plain(body)) {
      body = Template.plain(200, body);
    }
    if (Is.arr(body)) {
      const [status, _body, headers] = body;
      body = new Response(_body, { status, headers });
    }
    if (Is.num(body)) body = new Response(null, { status: body });
    if (Is.str(body)) body = new Response(body, { status: 200 });
    return body;
  }

  static client(ctx: any, body: any, props: any, parent: any, component: any): any {
    if (parent?.__context !== 'module') return;

    ctx.cache?.set(ctx.uuid, ctx.ref, component.__exported.reduce((memo: any, key: string) => {
      if (Is.data(props[key])) memo[key] = props[key];
      return memo;
    }, {}));

    const fields = component.__exported.concat('tag');
    const attrs = Object.keys(props).reduce((memo: any, key: string) => {
      if (Is.scalar(props[key]) && !fields.includes(key)) memo[key] = props[key];
      return memo;
    }, { 'data-component': ctx.ref });

    return [props.tag || 'div', attrs, body || []];
  }

  static hooks(ctx: any, parent: any): any {
    const _parent = ctx.stack?.at(-1) ?? parent?.__src;

    return {
      render: (fn: any) => {
        try {
          let ret = fn;
          while (typeof ret === 'function') ret = ret();
          return ret;
        } catch (e) {
          console.error('E_HOOK', e);
        }
      },
      after: (fn: any) => {
        const stack = ctx.scope[ctx.ref] ?? ctx.scope[_parent];
        if (stack) stack.handlers.push(fn);
      },
      get: (k: string) => {
        const stack = ctx.scope[ctx.ref] ?? ctx.scope[_parent];
        return stack?.values[k];
      },
      set: (k: string, v: any) => {
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

  static imports(str: string, base: string, shared: any, filepath: string, imported: Map<string, any> = new Map()): any {
    const ret = shared || {};
    str
      .replace(RE_COMMENTS, '')
      .replace(RE_EXTERNALS, (_: string, $1: string, $2: string, $3: string, $4: string) => {
        const src = $4 || $3 || $2 || $1;
        const source = base ? Template.join(base, src) : src;

        if (src[0] !== '.' || filepath === source) return _;

        const key = rebase(source, Template.cwd())!;

        if (imported.has(key)) {
          const { set, found } = imported.get(key)!;

          ret[key] = { ...ret[key], children: [...new Set(Object.keys(set).concat(ret[key]?.children || []))] };
          Object.assign(ret, found);
          return _;
        }

        const set: any = {};
        const code = Template.read(source);
        const found = Template.imports(code, Template.dirname(source), set, source, imported);

        ret[key] = { ...ret[key], children: [...new Set(Object.keys(set).concat(ret[key]?.children || []))] };
        imported.set(key, { set, found });
        Object.assign(ret, found);
        return _;
      });
    return ret;
  }

  static async refetch(url: string, base: string, options: any): Promise<string> {
    const source = url.replace(/^\/\//, 'http://');
    const target = Template.join(options.dest || '/build', base);
    const _base = [options.target || '/', options.prefix || '@', base].filter(p => p && p !== '/').join('/');

    if (source[0] === '/') return '/* not found */';

    try {
      const cached = Template.join(target, source.replace(/[^\w.]/g, '_'));

      if (!Template.exists(cached)) {
        const text = await fetch(source).then(_ => _.text());
        Template.write(cached, text);
      }

      const urls: any[] = [];

      let html = Template.read(cached);
      html = html.replace(/url\((['"]?)(.+?)\1\)/g, (_: string, _q: string, v: string) => {
        const found = { url: v, fixed: v.replace(/[^\w.]/g, '_') };
        urls.push(found);
        return `url(${Template.url(_base, found.fixed)})`;
      });

      await Promise.all(urls.map(found => fetch(found.url).then(async (result: globalThis.Response) => {
        const destFile = Template.join(target, found.fixed);
        const blob = await result.blob();
        const buffer = await blob.arrayBuffer();

        Template.write(destFile, Buffer.from(buffer));
      })));

      return html;
    } catch (e: any) {
      trace(e, 'E_FETCH');
      return `/* ${e.message} (${source}) */`;
    }
  }

  static relative(base: string, leaf?: string, cwd?: string): string {
    const root = cwd || Template.cwd();
    if (!leaf) {
      return !base.includes(root) && root ? Template.join(root, base) : base;
    }

    const c: string[] = [];
    const a = base.split('/');
    const b = leaf.split('/');

    let i = 0;
    for (; i < a.length && i < b.length; i++) {
      if (a[i] !== b[i]) break;
      c.push(a[i]);
    }

    const backtracks = Math.max(a.length - c.length - 1, 0);
    const diff = b.slice(c.length);

    const result = [...Array(backtracks).fill('..'), ...diff].join('/');
    return result || '.';
  }

  static filename(path: string, ext?: string): string {
    const name = path.split('/').pop()!;
    return ext ? name.replace(ext, '') : name;
  }

  static dirname(path: string): string {
    const parts = path.split('/');
    parts.pop();
    if (parts.length === 0) return '.';
    if (parts.length === 1 && parts[0] === '') return '/';
    let result = parts.join('/');
    if (path.endsWith('/') && !result.endsWith('/')) result += '/';
    return result;
  }

  static exists(filepath: string): boolean {
    return !!filepath;
  }

  static read(filepath: string): string {
    return filepath;
  }

  static glob(filepath: string): string[] {
    return [filepath];
  }

  static cwd() {
    return typeof process === 'object' && typeof process.cwd === 'function' ? process.cwd() : '.';
  }

  static write(dest: string, code: any): void {
    // TODO: implement file writing
  }

  static join(...args: string[]): string {
    let parts: string[] = [];
    for (let i = 0, l = args.length; i < l; i++) {
      parts = parts.concat(args[i].split('/'));
    }

    const newParts: string[] = [];

    for (let i = 0, l = parts.length; i < l; i++) {
      const part = parts[i];

      if (!part || part === '.') continue;
      if (part === '..') newParts.pop();
      else newParts.push(part);
    }
    if (parts[0] === '') newParts.unshift('');
    return newParts.join('/') || (newParts.length ? '/' : '.');
  }

  static path(mod: string): string | undefined {
    const paths: string[] = [];

    if (mod.indexOf('node:') === 0) return mod;
    if (!mod.includes(':') && mod[0] === '/') paths.push(mod);
    else if (this.exists(`node_modules/${mod.split(':')[0]}/package.json`)) return mod;

    for (let i = 0; i < paths.length; i += 1) {
      if (this.exists(paths[i])) return paths[i];
      if (this.exists(`${paths[i]}.js`)) return `${paths[i]}.js`;
      if (this.exists(`${paths[i]}.mjs`)) return `${paths[i]}.mjs`;
      if (this.exists(`${paths[i]}.cjs`)) return `${paths[i]}.cjs`;
      if (this.exists(`${paths[i]}/index.js`)) return `${paths[i]}/index.js`;
      if (this.exists(`${paths[i]}/index.mjs`)) return `${paths[i]}/index.mjs`;
      if (this.exists(`${paths[i]}/index.cjs`)) return `${paths[i]}/index.cjs`;
    }
  }

  static from(compile: any, block: any, opts: any = {}): Template {
    if (!block.src) {
      throw new Error(`Failed to parse '${block.filepath}'`, { cause: block.failure });
    }

    const name = block.src.match(RE_SAFE_NAME)![1]
      .replace(/\W+/g, '-')
      .replace(/-$/, '');

    Object.assign(block.opts, opts);

    const id = pascalCase(snakeCase(name));
    const cb = (src: string, code: string, _opts?: any) => {
      return Template.from(compile, compile(code, src), { ...opts, ..._opts });
    };

    return new Template(id, block, opts, cb);
  }

  static tag(context: any) {
    return (name: string, attrs: any, children: any) => {
      if (name === 'resource') {
        const tag = attrs['data-tag'];
        const srcAttr = attrs['data-src'];
        const path = attrs[srcAttr];
        const isInline = attrs['data-inline'];
        const { 'data-tag': _, 'data-src': __, 'data-inline': ___, [srcAttr]: ____, ...restAttrs } = attrs;

        const result = Template.media(path, context);
        if (!result) return [tag, restAttrs, children || []];

        if (tag === 'svg') {
          if (isInline && result.file) {
            const svgContent = Template.read(result.file)
              .trim()
              .replace(/>\s*</g, '><');

            const innerContent = svgContent
              .replace(/<svg[^>]*>/, '')
              .replace(/<\/svg>$/, '');

            return ['svg', { ...restAttrs, '@html': innerContent }, []];
          }
          return ['svg', restAttrs, [['use', { 'xlink:href': `#${result.id}` }]]];
        }
        return [tag, { ...restAttrs, [srcAttr]: result.path }, children || []];
      }

      if (
        ['form', 'select', 'textarea'].includes(name)
        || (name === 'input' && attrs.type !== 'hidden')
        || (name === 'button' && (attrs.onclick || attrs.type === 'submit'))
      ) {
        if (context.ref) attrs['@source'] = context.ref;
      }

      if (process.env.HEADLESS || process.env.NODE_ENV === 'production') {
        delete attrs['@location'];
        delete attrs['@source'];
        delete attrs['@async'];
      }

      if (name === 'fragment') {
        if (context.uuid) attrs['@request'] = context.uuid;
      }

      return [name, attrs, children];
    };
  }

  static url(base_url: string, segment: string, timestamp?: boolean): string {
    return `/${[base_url, segment].join('/')}${timestamp ? `?_=${Date.now()}` : ''}`.replace(/\/+/g, '/');
  }

  static media(path: string, context: any): { type: string; id?: string; path?: string; file: string } | null {
    if (!path || path.includes('://') || path.charAt(0) === '/') return null;

    const file = Template.join(context.base || '.', path);

    if (!Template.exists(file)) {
      if (context.strict) throw new Error(`File not found '${path}'`);
      return null;
    }

    context.media = context.media || new Set<string>();
    context.media.add(file);

    if (path.endsWith('.svg')) {
      return { type: 'svg', id: Template.filename(path, '.svg'), file };
    }
    return { type: 'asset', path: `@/${file}`, file };
  }
}
