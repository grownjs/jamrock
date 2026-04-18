import { serialize } from '../markup/html.ts';
import { trace, Is } from '../utils/server.ts';
import { rebase } from '../handler/utils.ts';
import { ents } from '../render/hooks.ts';
import { decorate } from './send.ts';
import { debug, stringify } from './utils.ts';

import { executeAsync, executeSync } from '../render/async.ts';
import * as Loader from './loader.ts';
import { dirname, filename, join } from '../utils/path.ts';
import { loadSourceMap } from '../server/sourcemap.ts';

// ---------------------------------------------------------------------------
// NO_HOOKS — fallback hooks object when no signal runtime is loaded
// ---------------------------------------------------------------------------

const NO_HOOKS = {
  signal: (v: any) => ({ value: v }),
  computed: (fn: any) => ({ value: fn() }),
  effect: () => null,
  trap: () => null,
  scope: (v: any) => ({ value: v }),
  ref: () => ({ current: null }),
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function initContext(context: any): void {
  context.base_url = context.base_url || context.conn?.base_url;
  context.is_json = context.is_json || context.conn?.is_json;
  context.mixins = context.mixins || new Map();
  context.stack = context.stack || [];
  context.scope = context.scope || {};
  context.depth = context.depth || 0;
  if (context.tag === undefined) context.tag = tag(context);
  context.media = context.media || new Set<string>();
  (globalThis as any).__JAMROCK_CONTEXT__ = context.conn;
}

function normalizeViews(doc: any, body: any, head: any): void {
  while (body?.length === 1 && !Is.vnode(body[0])) body = body[0];
  while (head?.length === 1 && !Is.vnode(head[0])) head = head[0];
}

function createRenderError(e: any, component: any): any {
  trace(e, 'E_RENDER');

  const mapFile = `${component.__dest}.map`;
  const smap = loadSourceMap(mapFile, Loader.read, Loader.exists);

  return debug({
    file: component.__src,
    html: smap?.sourceContent ?? '',
    smap,
  }, e);
}

function createErrorResponse(failure: any, scripts: any, styles: any, media: any): any {
  return { scripts, styles, media, body: [['pre', {}, ents(failure.stack)]] };
}

function popStack(ctx: any): void {
  if (ctx.stack) {
    ctx.stack.pop();
    ctx.ref = ctx.stack.at(-1);
  }
}

function processError(e: any, props: any): void {
  props.failure = e;
  props.failure.reason = e.message;
  props.failure.source = props.failure.stack.split('\n')[0].split(' at ')[1];
  props.failure.stack = props.failure.stack.split('\n').slice(1).join('\n');
}

// ---------------------------------------------------------------------------
// Merge keys for finalize()
// ---------------------------------------------------------------------------

const MERGE_KEYS = ['doc', 'attrs', 'media', 'styles', 'scripts', 'actions'] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function preflight(main: any, ctx: any, cb: any): Promise<any> {
  let response;
  try {
    if (main.__default && cb) {
      let _chunk = await cb(ctx, main.__default);
      _chunk = responseCoerce(_chunk);
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

export function finalize(e: any, self: any, chunk: any, mixins: any, filepath: string): any {
  mixins.forEach((mixin: any) => {
    chunk.head = (chunk.head || []).concat(mixin.head);
    for (const key of MERGE_KEYS) {
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
      const svg = Loader.read(asset)
        .trim()
        .replace(/>\s*</g, '><')
        .replace('</svg>', '</symbol>')
        .replace('<svg ', `<symbol id="${filename(asset, '.svg')}" `);
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

export async function settle(props: any): Promise<void> {
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

export function prepare(component: any, parent: any, ctx: any): any {
  if (!component) {
    throw new Error(`Missing component, given '${component}'`);
  }

  ctx.ref = ctx.stack && component.__context !== 'static'
    ? `${component.__src}/${++ctx.depth}`
    : component.__src;

  const scripts = { [component.__src]: component.__scripts.map((_: any) => [_[0], _[1]]) };
  const styles = { [component.__src]: component.__styles.map((_: any) => _[0]) };
  const media = { [component.__src]: component.__media };

  const _hooks = component.__context === 'module'
    ? hooks(ctx, parent)
    : null;

  const loader = (id: string) => {
    if (id === 'jamrock') return ctx.hooks || NO_HOOKS;
    if (id === 'jamrock:conn') return ctx.conn;
    if (id === 'jamrock:hooks') return _hooks;
    if (id === 'jamrock:shared') return {};
    throw new Error(`Unable to import "${id}"`);
  };

  return { loader, scripts, styles, media };
}

export function client(ctx: any, body: any, props: any, parent: any, component: any): any {
  if (parent?.__context !== 'module') return;

  ctx.cache?.set(ctx.uuid || ctx.conn?.req?.uuid, ctx.ref, component.__exported.reduce((memo: any, key: string) => {
    if (Is.data(props[key])) memo[key] = props[key];
    return memo;
  }, {}));

  const fields = component.__exported.concat('tag');
  const attrs = Object.keys(props).reduce((memo: any, key: string) => {
    if ((Is.scalar(props[key]) || Is.arr(props[key])) && !fields.includes(key)) memo[key] = props[key];
    return memo;
  }, { 'data-component': ctx.ref });

  return [props.tag || 'div', attrs, body || []];
}

export function hooks(ctx: any, parent: any): any {
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
      if (current) current.values[k] = v;
      if (!ctx.scope[_component]) ctx.scope[_component] = current;
    },
  };
}

export function media(path: string, context: any): { type: string; id?: string; path?: string; file: string } | null {
  if (!path || path.includes('://') || path.charAt(0) === '/') return null;

  const file = join(context.base || '.', path);

  if (!Loader.exists(file)) {
    if (context.strict) throw new Error(`File not found '${path}'`);
    return null;
  }

  context.media = context.media || new Set<string>();
  context.media.add(file);

  if (path.endsWith('.svg')) {
    return { type: 'svg', id: filename(path, '.svg'), file };
  }
  return { type: 'asset', path: `@/${file}`, file };
}

export function tag(context: any) {
  return (name: string, attrs: any, children: any) => {
    if (name === 'resource') {
      const tagName = attrs['data-tag'];
      const srcAttr = attrs['data-src'];
      const srcPath = attrs[srcAttr];
      const isInline = attrs['data-inline'];
      const { 'data-tag': _, 'data-src': __, 'data-inline': ___, [srcAttr]: ____, ...restAttrs } = attrs;

      const result = media(srcPath, context);
      if (!result) return [tagName, restAttrs, children || []];

      if (tagName === 'svg') {
        if (isInline && result.file) {
          const svgContent = Loader.read(result.file)
            .trim()
            .replace(/>\s*</g, '><');
          const innerContent = svgContent
            .replace(/<svg[^>]*>/, '')
            .replace(/<\/svg>$/, '');
          return ['svg', { ...restAttrs, '@html': innerContent }, []];
        }
        return ['svg', restAttrs, [['use', { 'xlink:href': `#${result.id}` }]]];
      }
      return [tagName, { ...restAttrs, [srcAttr]: result.path }, children || []];
    }

    if (attrs['@rpc:call'] && Is.func(attrs['@rpc:call'])) {
      const fn = attrs['@rpc:call'];
      const fnName = fn.name || '';
      attrs['@rpc:call'] = fnName;
      if (fnName && context.component) {
        if (!context.component.__rpc_fns) context.component.__rpc_fns = {};
        context.component.__rpc_fns[fnName] = fn;
      }
    }

    if (attrs['@rpc:yield'] && Is.func(attrs['@rpc:yield'])) {
      attrs['@rpc:yield'] = attrs['@rpc:yield'].name || '';
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

// ---------------------------------------------------------------------------
// Render — async + sync
// ---------------------------------------------------------------------------

let _failure: any;

export async function render(component: any, parent: any, props: any, ctx: any, cb: any = null): Promise<any> {
  const { scripts, styles, media: _media, loader } = prepare(component, parent, ctx);

  ctx.base = dirname(component.__src);
  Object.defineProperty(ctx, 'component', { value: component, enumerable: false, writable: true, configurable: true });

  await settle(props);

  const self = component.__handler
    ? await component.__handler(props, loader)
    : null;

  const view = executeAsync(ctx.tag, loader, async (child: any, _: any) => {
    const chunk = await render(child, component, _, ctx, cb);
    const body = chunk.body;
    if (ctx.mixins && !ctx.mixins.has(child.__src)) ctx.mixins.set(child.__src, chunk);
    return body;
  });

  if (ctx.stack) ctx.stack.push(ctx.ref);

  const main = self?.__context ? self.__context() : null;

  if (main && component.__context === 'module') {
    const resp = await preflight(main, ctx, cb);
    if (resp) return resp;
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
      view(component.__vdom, state, `${component.__src}#vdom`),
      view(component.__metadata, state, `${component.__src}#metadata`),
      view(component.__attributes, state, `${component.__src}#attributes`),
    ]);

    normalizeViews(doc, body, head);

    if (component.__context === 'client') {
      body = client(ctx, body, props, parent, component);
    }

    return { actions, scripts, styles, media: _media, attrs, head, body, doc };
  } catch (e: any) {
    _failure = createRenderError(e, component);
    if (ctx.route?.error) throw _failure;
    return createErrorResponse(_failure, scripts, styles, _media);
  } finally {
    popStack(ctx);
  }
}

export function renderSync(component: any, parent: any, props: any, ctx: any, cb: any = null): any {
  const { scripts, styles, media: _media, loader } = prepare(component, parent, ctx);

  ctx.base = dirname(component.__src);
  Object.defineProperty(ctx, 'component', { value: component, enumerable: false, writable: true, configurable: true });

  const self = component.__handler
    ? component.__handler(props, loader)
    : null;

  const view = executeSync(ctx.tag, loader, (child: any, _: any) => {
    const chunk = renderSync(child, component, _, ctx, cb);
    const body = chunk.body;
    if (ctx.mixins && !ctx.mixins.has(child.__src)) ctx.mixins.set(child.__src, chunk);
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
      view(component.__vdom, state, `${component.__src}#vdom`),
      view(component.__metadata, state, `${component.__src}#metadata`),
      view(component.__attributes, state, `${component.__src}#attributes`),
    ];

    normalizeViews(doc, body, head);

    if (component.__context === 'client') {
      body = client(ctx, body, props, parent, component);
    }

    return { actions, scripts, styles, media: _media, attrs, head, body, doc };
  } catch (e: any) {
    _failure = createRenderError(e, component);
    if (ctx.route?.error) throw _failure;
    return createErrorResponse(_failure, scripts, styles, _media);
  } finally {
    popStack(ctx);
  }
}

// ---------------------------------------------------------------------------
// Execute — render + layout + error boundary
// ---------------------------------------------------------------------------

export async function execute(component: any, context: any, props: any, cb: any): Promise<any> {
  initContext(context);
  const tasks: any[] = [];
  try {
    let result = await render(component, null, props, context, cb);
    Object.values(context.scope).forEach((_: any) => tasks.push(..._.handlers));
    await Promise.all(tasks.map(fn => fn(result)));

    if (!(result instanceof Response)) {
      if (context.route?.layout) {
        const markup = result.body;
        delete result.body;
        props.children = () => markup;
        context.mixins.set(component.__src, result);
        const layout = await render(context.route.layout, null, props, context);
        return await finalize(null, context, layout, context.mixins, component.__src);
      }
      result = await finalize(null, context, result, context.mixins, component.__src);
    }
    return result;
  } catch (e: any) {
    trace('E_ROUTE', e);
    if (context.route?.error) {
      props = props || {};
      processError(e, props);
      const error = await render(context.route.error, null, props, context);
      return finalize(e, context, error, context.mixins, component.__src);
    }
    throw e;
  }
}

export function executeSync_(component: any, context: any, props: any, cb: any): any {
  initContext(context);
  const tasks: any[] = [];
  try {
    let result = renderSync(component, null, props, context, cb);
    Object.values(context.scope).forEach((_: any) => tasks.push(..._.handlers));
    tasks.forEach(fn => fn(result));

    if (!(result instanceof Response)) {
      if (context.route?.layout) {
        const markup = result.body;
        delete result.body;
        props.children = () => markup;
        context.mixins.set(component.__src, result);
        const layout = renderSync(context.route.layout, null, props, context);
        return finalize(null, context, layout, context.mixins, component.__src);
      }
      result = finalize(null, context, result, context.mixins, component.__src);
    }
    return result;
  } catch (e: any) {
    trace('E_ROUTE', e);
    if (context.route?.error) {
      props = props || {};
      processError(e, props);
      const error = renderSync(context.route.error, null, props, context);
      return finalize(e, context, error, context.mixins, component.__src);
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Reduce — walk layout chain
// ---------------------------------------------------------------------------

export async function reduce(component: any, filepath: string, context: any, props: any, cb: any): Promise<any> {
  let result;
  if (!context.components) return execute(component, context, props, cb);

  for (const _component of context.components) {
    try {
      if (result) props.children = () => result.body;
      result = await execute(_component, context, props, cb);
    } catch (e: any) {
      trace('E_RESOLVE', filepath, e);
    }
  }
  return result;
}

export function reduceSync(component: any, filepath: string, context: any, props: any, cb: any): any {
  let result;
  if (!context.components) return executeSync_(component, context, props, cb);

  for (const _component of context.components) {
    try {
      if (result) props.children = () => result.body;
      result = executeSync_(_component, context, props, cb);
    } catch (e: any) {
      trace('E_RESOLVE', filepath, e);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Top-level entry points
// ---------------------------------------------------------------------------

export async function resolve(component: any, filepath: string, context: any, props: any, cb: any): Promise<any> {
  const resp = await reduce(component, filepath, context, props, cb);
  if (context.write) stringify(resp, context.prefix, context.write);
  return resp;
}

export function resolveSync(component: any, filepath: string, context: any, props: any, cb: any): any {
  const resp = reduceSync(component, filepath, context, props, cb);
  if (context.write) stringify(resp, context.prefix, context.write);
  return resp;
}

// ---------------------------------------------------------------------------
// plain / response — HTTP response coercion
// ---------------------------------------------------------------------------

import { plain, response as responseCoerce } from '../utils/path.ts';
export { plain, responseCoerce as response };
