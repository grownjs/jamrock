// @ts-check

import { serialize, taggify, scopify, rulify, cssify } from '../markup/html.mjs';
import { pascalCase, snakeCase, trace, Is } from '../utils/server.mjs';

import { executeAsync } from '../render/async.mjs';
import { debug, stringify } from './utils.mjs';
import { rebase } from '../handler/utils.mjs';
import { ents } from '../render/hooks.mjs';
import { decorate } from './send.mjs';

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;
const RE_SAFE_NAME = /(?:^|\/)(.+?)(?:\/\+\w+)?\.\w+$/;

const RE_EXTERNALS = /\b(?:import[^;=]*\(?(?:"([^;]+)"|'([^;]+)')|(?:export|import)[^;=]+from\s*(?:"([^;]+)"|'([^;]+)'))/g;
const RE_COMMENTS = /\/\*[\S\s]*?\*\/|\/\/.*/g;

const TEMP_DIR = process.env.TMPDIR || '/tmp';

const NO_HOOKS = {
  useState: v => [v],
  useRef: () => null,
  onError: () => null,
  useEffect: () => null,
  wrapComponent: () => null,
};

/**
 * @import {TemplateImpl, TemplateCache} from "../../types/main.d.ts"
 */

/**
 * @type {TemplateImpl}
 */
export class Template {
  /**
   * @type {TemplateCache}
   */
  static cache = null;

  constructor(name, block, options, callback) {
    this.generators = options.generators;
    this.elements = options.elements;
    this.attributes = { ...options };

    delete this.attributes.generators;
    delete this.attributes.elements;

    this.component = name;
    this.partial = block;
    this.module = {};

    Object.defineProperty(this, 'build', { value: callback });
  }

  /**
   * @abstract
   * @param {string}  src
   * @param {string}  code
   * @returns {Template}
   */
  build(src, code) {
    console.log(src, code);
    return this;
  }

  /**
   * @abstract
   * @param {string}  dest
   * @param {string | Buffer}  code
   */
  static write(dest, code) {
    console.log(dest, code);
  }

  async regenerate(imported = []) {
    return this.transform(Template.transpile, null, {
      params: this.attributes,
      use: this.generators,
    }, imported);
  }

  async transform(cb, bundle, options, imported = []) {
    const defaults = this.partial.opts;
    const resources = this.partial.assets;
    const context = this.partial.context;
    const filepath = this.partial.src;
    const target = this.partial.dest;
    const scope = this.partial.id;
    const { markup } = this.partial;
    const base_url = defaults.target || '/';

    const set = [];
    const tasks = [];
    const isStatic = context === 'static';
    const isClient = bundle || context === 'client';
    const children = this.partial.children.map(_ => _.src);

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
        .filter(x => x.root || x.attributes.scoped || x.attributes.global), 'js', options)
        .then(js => set.unshift(...js.map((x, i) => {
          const destFile = `${target.replace(/\.(?:md|html)/, '')}(${i}).js`;

          children.push(...x.children);
          resources.js.push([x.parent, destFile, x.children]);
          return { content: x.content, dest: destFile };
        }))));

      tasks.push(cb(this.partial.styles, 'css', options)
        .then(css => set.unshift(...css.map((x, i) => {
          const destFile = `${target.replace(/\.(?:md|html)/, '')}(${i}).css`;

          if (defaults.src) {
            x.content = x.content.replace(/url\((.+?)\)/g, (_, $1) => {
              if ($1.charAt() === '/' || $1.indexOf('http') === 0) return _;
              resources.media.push(Template.join(defaults.src, $1));
              return `url(${Template.url(base_url, $1, true)})`;
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

    let result = this.partial.toString();
    if (isStatic) {
      set.unshift(result = { content: result, children: _children, src: filepath, dest: target, js: true });
    } else {
      set.unshift(result = { children: _children, content: result, client: isClient, src: filepath, dest: target, js: true });
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
    const output = await Template.finalize(null, ctx, result, [], this.module.__src);

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

  static async preflight(main, ctx, cb) {
    let response;
    try {
      if (main.__default && cb) {
        let _chunk = await cb(ctx, main.__default);
        _chunk = Template.response(_chunk);
        if (_chunk instanceof Response) response = _chunk;
      }
    } catch (e) {
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

  static async finalize(e, self, chunk, mixins, filepath) {
    mixins.forEach(mixin => {
      // FIXME: how to check dupes?
      chunk.head = (chunk.head || []).concat(mixin.head);

      Object.assign(chunk.doc, mixin.doc);
      Object.assign(chunk.attrs, mixin.attrs);
      Object.assign(chunk.media, mixin.media);
      Object.assign(chunk.styles, mixin.styles);
      Object.assign(chunk.scripts, mixin.scripts);
      Object.assign(chunk.actions, mixin.actions);
    });

    // FIXME: use this technique when executing from fragments over ws/sse
    // also, how in the hell we're going to capture fragment and such?
    serialize(chunk.body, null, (vnode, hooks) => decorate(chunk, self, vnode, hooks));
    serialize(chunk.head, null, (vnode, hooks) => decorate(chunk, self, vnode, hooks));

    const images = [];
    const fragments = {};

    // FIXME: check if we could prebuilt these files...
    /**
     * @type {string[]}
     */
    const assets = [...new Set([].concat(...Object.values(chunk.media)))];

    for (const asset of assets) {
      if (asset.includes('.svg')) {
        const svg = Template.read(asset)
          .trim()
          .replace(/>\s*</g, '><')
          .replace('</svg>', '</symbol>')
          .replace('<svg ', `<symbol id="${Template.filename(asset, '.svg')}" `);

        images.push(svg);
      }
    }

    // FIXME: after or before?
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

    // chunk.prelude = (chunk.prelude || []).concat(mixins.map(x => x.prelude));
    chunk.head.unshift(['base', { href: self.base_url && self.base_url !== '/' ? `${self.base_url}/` : '/' }]);
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
    if (context.write) stringify(response, context.prefix, context.write);
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
        trace('E_RESOLVE', filepath, e);
      }
    }
    return result;
  }

  static async execute(component, context, props, cb) {
    context.base_url = context.base_url || context.conn?.base_url;
    context.is_json = context.is_json || context.conn?.is_json;
    context.mixins = context.mixins || new Map();
    context.stack = context.stack || [];
    context.scope = context.scope || {};
    context.depth = context.depth || 0;
    context.tag = context.tag || Template.tag(context);

    const tasks = [];

    try {
      let result = await Template.render(component, null, props, context, cb);

      Object.values(context.scope).forEach(_ => tasks.push(..._.handlers));

      await Promise.all(tasks.map(fn => fn(result)));

      if (!(result instanceof Response)) {
        if (context.route?.layout) {
          const markup = result.body;

          delete result.body;
          props.children = () => markup;
          context.mixins.set(component.__src, result);

          const layout = await Template.render(context.route.layout, null, props, context);
          const response = await Template.finalize(null, context, layout, context.mixins, component.__src);
          return response;
        }
        result = await Template.finalize(null, context, result, context.mixins, component.__src);
      }
      return result;
    } catch (e) {
      trace('E_ROUTE', e);
      if (context.route?.error) {
        props = props || {};
        props.failure = e;
        props.failure.reason = e.message;
        props.failure.source = props.failure.stack.split('\n')[0].split(' at ')[1];
        props.failure.stack = props.failure.stack.split('\n').slice(1).join('\n');

        const error = await Template.render(context.route.error, null, props, context);
        const result = await Template.finalize(e, context, error, context.mixins, component.__src);
        return result;
      }
      throw e;
    }
  }

  static async render(component, parent, props, ctx, cb = null) {
    ctx.ref = ctx.stack && component.__context !== 'static'
      ? `${component.__src}/${++ctx.depth}`
      : component.__src;

    const scripts = { [component.__src]: component.__scripts.map(_ => [_[0], _[1]]) };
    const styles = { [component.__src]: component.__styles.map(_ => _[0]) };
    const media = { [component.__src]: component.__media };

    const hooks = component.__context === 'module'
      ? Template.hooks(ctx, parent)
      : null;

    const loader = id => {
      if (id === 'jamrock') return NO_HOOKS;
      if (id === 'jamrock:conn') return ctx.conn;
      if (id === 'jamrock:hooks') return hooks;
      return Template.load(id);
    };

    const self = component.__handler
      ? await component.__handler(props, loader)
      : null;

    const view = executeAsync(ctx.tag, loader, async (child, _) => {
      const chunk = await Template.render(child, component, _, ctx, cb);
      const body = chunk.body;

      if (ctx.mixins && !ctx.mixins.has(child.__src)) {
        ctx.mixins.set(child.__src, chunk);
      }

      // chunk.body = null;
      return body;
    });

    if (ctx.stack) ctx.stack.push(ctx.ref);

    const main = self?.__context ? await self.__context() : null;

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
        // FIXME: this can be cached somehow?
        const frags = await Promise.all(Object.entries(component.__fragments).map(async ([k, v]) => ({
          target: k,
          template: v.r,
          variables: v.s,
          attributes: await view(v.a, state, `${component.__src}#@${k}`),
        })));

        state = await ctx.stream.sync(state, async (key, item) => {
          const input = { ...props, ...data, [key]: [item] };
          const source = frags.find(_ => _.variables.includes(key));

          if (source) {
            const { target, template } = source;
            const vnode = await view(template, input, `${component.__src}#!${key}`);

            return { target, vnode };
          }
        }, frags);
      }

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

      return {
        actions, scripts, styles, media, attrs, head, body, doc,
      };
    } catch (e) {
      trace(e, 'E_RENDER');
      this.failure = debug({
        file: component.__src,
        html: Template.read(component.__src),
        code: Template.read(component.__dest),
      }, e);

      if (ctx.route?.error) throw this.failure;

      return { scripts, styles, media, body: [['pre', {}, ents(this.failure.stack)]] };
    } finally {
      if (ctx.stack) {
        ctx.stack.pop();
        ctx.ref = ctx.stack.at(-1);
      }
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
      return Template.cache.get(resolved || id)?.module;
    }

    if (resolved && (resolved.includes('.md') || resolved.includes('.html'))) {
      throw new Error(`Cannot import '${resolved}' file as module`);
    }

    if (resolved && Template.exists(resolved)) {
      return resolved[0] === '/'
        ? Template.reload(`file://${resolved}`)
        : Template.reload(`file://${process.cwd()}/${resolved}`);
    }

    return Template.reload(id);
  }

  static async reload(id, force) {
    if (!force && Template.cache?.has(id)) {
      return Template.cache.get(id)?.module;
    }
    if (force && id[0] === '/') {
      // @ts-expect-error
      if (typeof Bun !== 'undefined') {
        return require(`${id}?_=${Math.random()}`);
      }
      return import(`${id}?_=${Math.random()}`);
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

  // handle Buffer or more values?
  static plain(code, body, headers) {
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

  static response(body) {
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

  static client(ctx, body, props, parent, component) {
    if (parent?.__context !== 'module') return;

    ctx.cache?.set(ctx.uuid, ctx.ref, component.__exported.reduce((memo, key) => {
      if (Is.data(props[key])) memo[key] = props[key];
      return memo;
    }, {}));

    const fields = component.__exported.concat('tag');
    const attrs = Object.keys(props).reduce((memo, key) => {
      if (Is.scalar(props[key]) && !fields.includes(key)) memo[key] = props[key];
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
        const source = base ? Template.join(base, src) : src;

        if (src[0] !== '.' || filepath === source) return _;

        const key = rebase(source, process.cwd());

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

  // FIXME: recursive inline? e.g. urls() and @imports?
  static async refetch(url, options) {
    const base_url = options.target || '/';
    const source = url.replace(/^\/\//, 'http://');

    if (source[0] === '/') return '/* not found */';

    try {
      const cached = Template.join(TEMP_DIR, source.replace(/[^\w.]/g, '_'));

      if (!Template.exists(cached)) {
        const text = await fetch(source).then(_ => _.text());
        Template.write(cached, text);
      }

      const urls = [];

      let html = Template.read(cached);
      html = html.replace(/url\((['"]?)(.+?)\1\)/g, (_, _q, v) => {
        const found = { url: v, fixed: v.replace(/[^\w.]/g, '_') };
        urls.push(found);
        return `url(${Template.url(base_url, found.fixed)})`;
      });

      await Promise.all(urls.map(found => fetch(found.url).then(async result => {
        const destFile = Template.join(TEMP_DIR, found.fixed);
        const blob = await result.blob();
        const buffer = await blob.arrayBuffer();

        Template.write(destFile, Buffer.from(buffer));
      })));

      return html;
    } catch (e) {
      trace(e, 'E_FETCH');
      return `/* ${e.message} (${source}) */`;
    }
  }

  static relative(base, leaf) {
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

  static filename(path, ext) {
    let name = path.split('/').pop();
    if (ext) name = name.replace(ext, '');
    return name;
  }

  static dirname(path) {
    return Template.join(path, '..');
  }

  /**
   * @abstract
   * @param {string} filepath
   * @returns {boolean}
   */
  static exists(filepath) {
    return !!filepath;
  }

  /**
   * @abstract
   * @param {string} filepath
   * @returns {string}
   */
  static read(filepath) {
    return filepath;
  }

  /**
   * @abstract
   * @param {string} filepath
   * @returns {string[]}
   */
  static glob(filepath) {
    return [filepath];
  }

  static join(...args) {
    let parts = [];
    for (let i = 0, l = args.length; i < l; i++) {
      parts = parts.concat(args[i].split('/'));
    }

    const newParts = [];

    for (let i = 0, l = parts.length; i < l; i++) {
      const part = parts[i];

      if (!part || part === '.') continue;
      if (part === '..') newParts.pop();
      else newParts.push(part);
    }
    if (parts[0] === '') newParts.unshift('');
    return newParts.join('/') || (newParts.length ? '/' : '.');
  }

  static path(mod) {
    const paths = [];

    if (mod.indexOf('node:') === 0) return mod;
    if (!mod.includes(':') && mod[0] === '/') paths.push(mod);
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

  static tag(context) {
    return (name, attrs, children) => {
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

  static url(base_url, segment, timestamp) {
    return `/${[base_url, segment].join('/')}${timestamp ? `?_${Date.now()}` : ''}`.replace(/\/+/g, '/');
  }
}
