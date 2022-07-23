import { pascalCase, realpath, identifier, isThenable, isObject, isArray } from '../utils.mjs';
import { streamify, decorate, consume } from './send.mjs';
import { serialize, scopify } from '../markup/html.mjs';
import { build, debug, highlight } from './utils.mjs';
import { renderComponent } from '../render/ssr.mjs';
import { renderAsync } from '../render/shared.mjs';
import { resolve } from '../reactor/loop.mjs';
import { reduce } from '../markup/utils.mjs';
import { Expr } from '../markup/expr.mjs';
import { transpile } from './bundle.mjs';
import * as Store from '../reactor/store.mjs';

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;
const RE_SAFE_NAME = /\/(.+?)(?:\/\+\w+)?\.\w+$/;

export class Template {
  constructor(name, block, callback) {
    this.component = name;
    this.partial = block;
    this.build = callback;
  }

  async transform(cb, bundle, parent, options, imported = []) {
    const { markup, fragments } = this.partial;
    const target = this.partial.file;
    const resources = { js: [], css: [] };
    const scoped = identifier('jam').join('-');
    const isAsync = !(bundle || this.partial.context === 'client');

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
        // eslint-disable-next-line no-continue
        if (imported.includes(c.found)) continue;

        imported.push(c.found);

        if (c.found.includes('.svelte')) {
          tasks.push(cb({
            content: `import c from '${c.found}';
            const { registerComponent: r } = window.Jamrock.Browser._;
            r('${c.found}', { component: c })`,
            filepath: target.replace('.html', '.bundle.js'),
          }).then(result => {
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

            mod.push({
              ...result,
              src: c.found,
              server: true,
            });
          }));
        } else if (c.found.includes('.html')) {
          tasks.push(this.build(c.found, c.code, { sync: !isAsync })
            .transform(cb, !isAsync, target, options, imported)
            .then(result => mod.push(...result)));
        }
      } else {
        console.debug(`=> '${c.src}' not found in`, target || parent.partial.file);
      }
    }

    tasks.push(cb(this.partial.scripts
      .filter(x => x.root || x.attributes.scoped || x.attributes.bundle || x.attributes.type === 'module'), 'js', null, options)
      .then(js => { resources.js = js.map(x => [x.params.type === 'module' || !x.params.bundle, x.content]); }));

    this.partial.styles.forEach(css => {
      tasks.push(cb(css, 'css', null, options).then(code => {
        if (!css.attributes.global) {
          resources.css.push(scopify(scoped, code.content, markup.content, `${css.identifier}.css`));
        } else {
          resources.css.push(code.content);
        }
      }));
    });

    await Promise.all(tasks);

    this.partial.sync();

    let result;
    if (!isAsync) {
      result = await transpile(cb, this.partial, resources, options);
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
          metadata: reduce(markup.metadata || { elements: [] }, true, [], 1),
          document: Expr.props(markup.document || {}, '\t'),
          attributes: Expr.props(markup.attributes || {}, '\t'),
        },
        fragments: Object.keys(fragments).reduce((memo, key) => {
          memo.push({
            attributes: Expr.props(fragments[key].attributes, '\t'),
            template: reduce(fragments[key].elements, true, [], 1),
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

  static async resolve(component, filepath, context, props, cb) {
    const shared = {
      failure: null,
      scripts: [],
      styles: [],
      attrs: {},
      meta: [],
      doc: {},
    };

    const self = Object.assign(context || {}, { filepath, streams: Object.create(null), depth: 0 });

    if (self.conn && self.conn.sockets) {
      let _socket;
      Object.defineProperty(self, 'socket', {
        get: () => {
          // FIXME: identify by client uuid
          if (!_socket) _socket = self.conn.sockets()[0];
          return _socket;
        },
        set: v => {
          _socket = v;
        },
      });
    }

    function invoke(ctx, chunk, payload) {
      const _render = async (_chunk, locals) => {
        if (typeof _chunk !== 'function') {
          if (_chunk.$$render || _chunk.component) {
            return renderComponent(_chunk, { ...locals, ...payload }, null, _render);
          }

          const result = await renderAsync(_chunk, { ...locals, ...payload }, _render);

          if (isObject(result)) {
            result.name += `.${_chunk.depth}`;
          }
          return result;
        }

        const result = await Template.render(_chunk, invoke, { ...locals, ...payload }, ctx, cb);

        shared.meta.push(...(result.meta || []));
        shared.styles.push(...(result.styles || []));
        shared.scripts.push(...(result.scripts || []));
        Object.assign(shared.doc, result.doc);
        Object.assign(shared.attrs, result.attrs);
        return result.body;
      };
      return chunk ? _render(chunk, payload) : _render;
    }

    try {
      const result = await Template.render(component, invoke, props, self, cb);

      serialize(result.body, null, (vnode, hooks) => decorate(self, vnode, hooks, component));
      serialize(result.meta, null, (vnode, hooks) => decorate(self, vnode, hooks, component));

      result.scripts.push(...new Set(shared.scripts));
      result.styles.push(...new Set(shared.styles.filter(Boolean)));
      result.meta = [...(result.meta || []), ...shared.meta];
      result.doc = { ...result.doc, ...shared.doc };
      result.attrs = { ...result.attrs, ...shared.attrs };

      // FIXME: layout boundaries...
      return result;
    } catch (e) {
      shared.body = ['pre', {}, e.stack];
      return shared;
    }
  }

  static async render(component, invoke, props, ctx = {}, cb = null) {
    const handler = await component(component.src, (...args) => {
      if (args[0] === 'jamrock/conn') return ctx.conn;
      if (args[0] === 'jamrock/hooks') return ctx.hooks;
      if (args[0] === 'jamrock/store') return Store;
      return Template.load(...args);
    }, resolve, ctx.filepath || null);

    const depth = ctx.depth++;

    Object.assign(ctx, {
      accept: (src, key, _handler, _socket) => {
        ctx.streams[src][`${key}.${depth}`].socket = _socket;
        _socket.on('close', () => {
          delete ctx.streams[src][`${key}.${depth}`].socket;
          _handler.cancel();
        });
      },
      connect: (src, key, _socket) => {
        return ctx.streams[src][`${key}.${depth}`].accept(_socket);
      },
      subscribe: (src, key, params) => {
        ctx.streams[src] = ctx.streams[src] || Object.create(null);
        ctx.streams[src][`${key}.${depth}`] = params;
      },
      unsubscribe: (src, key) => {
        delete ctx.streams[src][`${key}.${depth}`];
      },
    });

    let err;
    let data = { ...props };
    if (typeof handler === 'function' && invoke) {
      const result = await handler(ctx.context || null, data, console, async payload => {
        const handlers = payload.default || {};

        for (const [k, v] of Object.entries(payload)) {
          if (v && isThenable(v)) payload[k] = await v;
        }

        delete payload.default;
        try {
          if (typeof cb === 'function') {
            ctx.file = component.src;
            await cb(ctx, payload, handlers);
          }
        } catch (e) {
          err = e;
        }
      });

      // FIXME: error boundaries...
      if (err) {
        throw err;
      }

      await streamify(ctx, depth, result.data, invoke, handler, consume);
      Object.assign(data, result.data);
    } else if (typeof cb === 'function') {
      await cb(ctx, data, {});
    }

    try {
      const exec = invoke ? invoke(ctx, null, data) : undefined;
      const [doc, body, meta, attrs] = await Promise.all([
        renderAsync({ render: handler.document }, data),
        renderAsync({ chunks: handler.fragments, slots: component._slots, render: handler.render, depth }, data, exec),
        renderAsync({ chunks: handler.fragments, slots: component._slots, render: handler.metadata, depth }, data, exec),
        renderAsync({ render: handler.attributes }, data),
      ]);

      return {
        ...handler.assets, attrs, meta, body, doc,
      };
    } catch (e) {
      console.log(e);
      throw debug({
        file: component.src,
        html: ctx.template || '',
        code: component.toString(),
      }, e);
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

    if (resolved && resolved.includes('.html')) {
      throw new Error(`Cannot import '${resolved}' template`);
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
    if (isArray(tpl)) {
      return Promise.all(tpl.map(Template.transpile));
    }

    return Promise.resolve({
      params: { ...tpl.attributes },
      content: tpl.content,
      children: [],
      resources: [],
    });
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
      if (Template.exists(paths[i])) return paths[i];
      if (Template.exists(`${paths[i]}.html`)) return `${paths[i]}.html`;
      if (Template.exists(`${paths[i]}.svelte`)) return `${paths[i]}.svelte`;
      if (Template.exists(`${paths[i]}/index.mjs`)) return `${paths[i]}/index.mjs`;
      if (Template.exists(`${paths[i]}/index.cjs`)) return `${paths[i]}/index.cjs`;
      if (Template.exists(`${paths[i]}/index.js`)) return `${paths[i]}/index.js`;
      if (Template.exists(`${paths[i]}.mjs`)) return `${paths[i]}.mjs`;
      if (Template.exists(`${paths[i]}.cjs`)) return `${paths[i]}.cjs`;
      if (Template.exists(`${paths[i]}.js`)) return `${paths[i]}.js`;
    }
  }

  static from(compile, source, opts) {
    const block = compile(source, opts);
    const name = (opts.src || block.file).match(RE_SAFE_NAME)[1].replace(/\W+/g, '-').replace(/-$/, '');

    if (opts.html !== false && block.failure) {
      block.failure.stack = highlight(block.failure.stack, opts.html);
    }

    return new Template(pascalCase(name), block, (src, code, _opts) => Template.from(compile, code, { ...opts, ..._opts, src }));
  }
}
