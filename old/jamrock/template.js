/* eslint-disable object-property-newline, no-unused-expressions */

import fs from 'fs';
import path from 'path';
import Mortero from 'mortero';
import reExport from 'rewrite-exports';
import { vars as _vars } from 'eslint-plugin-jamrock/util';

import * as Store from '../reactor/store';
import * as Markup from '../markup';
import * as Render from '../render';
import * as Reactor from '../reactor';

// import { render, rewrite } from '../render/transpile';
import { req } from './matcher';

import {
  isFile, isSource, isFunction, isThenable, isGenerator, isIterable, noExt,
  hasChanged, identifier, safeJSON, readFile, writeFile, relative, trace, time, load, use,
} from '../shared';

const SHARED_COMPONENTS = ['Link', 'Tabs', 'Route', 'Form', 'Input', 'Failure', 'Debugger'];

export default class Template {
  constructor(name, scope, options) {
    Object.assign(this, scope.definition);
    Object.defineProperties(this, {
      _opts: { value: options },
      _name: { value: name.split('/').pop().replace(/\..*$/, '') },
      _hooks: {
        value: {
          streams: [],
          effects: [],
          cleanup: [],
          teardown: [],
          bootstrap: [],
        },
      },
      _scope: { value: Object.create(null) },
      _refs: { value: { self: this } },
      _tpl: { value: scope },
    });
  }

  toString() {
    return `[object ${this._key || this._name}]`;
  }

  invoke(ctx, chunk, payload) {
    const _render = async (_chunk, locals) => {
      if (this._refs[_chunk._key]) {
        this._refs[_chunk._key]._slots = _chunk._slots;

        const _result = await this._refs[_chunk._key].resolve(ctx, locals, true, payload);

        if (_result.failure) ctx.errors.push(_result.failure);
        return _result.content;
      }
      return Render.renderAsync(_chunk, locals, _render);
    };
    return chunk ? _render(chunk, payload) : _render;
  }

  render(ctx, props, include, callback) {
    ctx._offset = 0;
    return this.resolve(ctx, props, include, callback)
      .catch(e => {
        e.sample = trace(e, {
          file: this._tpl.source,
        }, this._tpl.render.toString(), true);
        throw e;
      });
  }

  append(key, value, target, callback) {
    target[key] = [];

    return async (uuid, next) => {
      let cancelled;
      let timeout;
      let open;

      function check(...args) {
        return cancelled || (typeof callback === 'function' && callback.apply(this, args));
      }

      this._tpl[`${uuid}?${this._name}#${key}`] = {
        cancel() {
          clearTimeout(timeout);
          timeout = undefined;
          cancelled = true;
        },
        accept(ws) {
          if (!timeout || open) return;

          ws.instances = ws.instances || Object.create(null);
          ws.instances[key] = this;
          ws.on('close', () => this.cancel());

          clearTimeout(timeout);
          timeout = undefined;
          open = true;
        },
        get idle() {
          return !!cancelled;
        },
        pause() {
          if (!cancelled) {
            this.cancel();
          }
        },
        resume: () => {
          if (cancelled) {
            cancelled = false;
            this.consume(key, next, uuid, value, 0, () => {}, check);
          }
        },
      };

      timeout = setTimeout(() => {
        cancelled = true;
      }, 3000);

      await this.consume(key, next, uuid, value, this._opts.limit, (chunk, result) => {
        target[key][(chunk && chunk.attributes.mode) === 'prepend' ? 'unshift' : 'push'](result);
      }, check);

      clearTimeout(timeout);
    };
  }

  async consume(key, next, uuid, value, limit, append, callback) {
    let cancelled;
    let finished;
    let i = 0;

    const chunk = this._tpl.fragments[key];
    const self = this._tpl[`${uuid}?${this._name}#${key}`];

    try {
      let done;
      let timeout = 24;
      let interval = this._opts.interval;

      if (chunk) {
        if ('limit' in chunk.attributes) {
          limit = parseInt(chunk.attributes.limit, 10);
        }

        if ('timeout' in chunk.attributes) {
          timeout = parseInt(chunk.attributes.timeout, 10);
        }

        if ('interval' in chunk.attributes) {
          interval = parseInt(chunk.attributes.interval, 10);
        }
      }

      setTimeout(() => { done = true; }, timeout);

      if (isThenable(value) || isGenerator(value)) {
        value = await (isFunction(value) && !value.length ? value() : value);
      }

      if (Store.valid(value)) {
        const end = value.subscribe(async item => {
          if (i++ >= limit) done = true;
          if (!done) cancelled = await append.call(self, chunk, item, key); // eslint-disable-line
          else if (process.headless || cancelled === true) end();
          else {
            if (!finished) next(finished = true); // eslint-disable-line
            if (interval > 0) await new Promise(ok => setTimeout(ok, time(interval)));
            if (typeof callback === 'function') {
              cancelled = await callback.call(self, null, key, item, chunk);
            } else end();
          }
        });
        return;
      }

      if (!isIterable(value)) {
        await append.call(self, chunk, value, key);
        next(finished = true);
        return;
      }

      for await (const item of value) {
        if (i++ >= limit) done = true;
        if (!done) cancelled = await append.call(self, chunk, item, key); // eslint-disable-line
        else if (process.headless || cancelled === true) break;
        else {
          if (!finished) next(finished = true); // eslint-disable-line
          if (interval > 0) await new Promise(ok => setTimeout(ok, time(interval)));
          if (typeof callback === 'function') {
            cancelled = await callback.call(self, null, key, item, chunk);
          } else break;
        }
      }
    } catch (e) {
      await callback.call(self, e);
    } finally {
      next();
    }
  }

  async resolve(ctx, props, include, callback) {
    props = { ...props };

    if (props.slots) {
      this._slots = props.slots;
      delete props.slots;
    }

    const _stack = [];
    const _offset = ctx._offset++;
    const _actions = Object.create(null);
    const _anchor = `${this._tpl.source}#${props.key || _offset}`;
    const _uuid = `${ctx.$$.remote_ip || '0.0.0.0'}/${ctx.$$.req.uuid}`;

    const _seen = [];
    const _locs = this._tpl.locations.reduce((memo, cur) => {
      cur.locals.forEach(local => {
        if (local.name !== 'this' && !_seen.includes(local.name)) {
          _seen.push(local.name);
          memo.push({ name: local.name, repeat: cur.block.indexOf('{#each ') === 0 });
        }
      });
      return memo;
    }, []);

    // if (ctx.$$.method === 'PATCH' && ctx.$$.req_headers['request-from'] === _anchor) {
    //   Object.assign(props, ctx.$$.body_params);
    //   Object.entries(ctx.$$.uploaded_files || {})
    //     .forEach(([key, entry]) => {
    //       props[key] = new File(entry);
    //     });
    // }

    // FIXME: revise this, streaming and hooks is on top

    let data = { ...props };
    let deferred;
    let failure;
    let retval;
    if (!this._tpl.prelude) {
      deferred = Template.assign(ctx, data, this, _uuid, _locs, _anchor, callback);
    } else {
      // const self = ctx.$$.current_handler;

      let slots = {};
      if (this._tpl._self) {
        slots = this._tpl._self._slots;
      }

      props['@@anchor'] = _anchor;
      props['@@slots'] = slots;
      props['@@'] = {};

      // if (this._tpl.scope) {
      //   props['@@'][`data-${this._tpl.scope[0]}`] = this._tpl.scope[1];
      // }

      // ctx.$$.current_hooks = {
      //   getContext: k => {
      //     return this._parent ? (this._parent._scope && this._parent._scope[k]) : this._scope[k];
      //   },
      //   setContext: (k, v) => {
      //     if (this._parent) {
      //       this._parent._scope = this._parent._scope || this._scope;
      //       this._parent._scope[k] = v;
      //     } else {
      //       this._scope[k] = v;
      //     }
      //   },

      //   // TODO: consider using an external pub/sub for these hooks...
      //   onConnect: cb => this.interpolate('bootstrap', cb),
      //   onRelease: cb => this.interpolate('teardown', cb),
      //   onTeardown: cb => this.subscribe('cleanup', cb)(),
      //   useCallback: cb => this.subscribe('effects', cb),

      //   useFragment: (id, channel, source, targets) => {
      //     const _self = this._tpl;
      //     const key = [id, channel || id].join('#');

      //     if (source) {
      //       const chunk = this._tpl.fragments[id];

      //       if (typeof targets === 'string') {
      //         targets = [targets];
      //       } else if (!Array.isArray(targets)) {
      //         targets = Object.keys(targets);
      //       }

      //       _stack.push(state => this.interpolate('streams', {
      //         id, key, state, chunk, source, channel, targets, context: this,
      //       }));
      //     }

      //     let s;
      //     return {
      //       get stream() {
      //         if (!s) {
      //           s = Object.keys(_self).find(k => {
      //             return k === [_uuid, key].join('?');
      //           });
      //           s = _self[s];
      //         }
      //         return s;
      //       },
      //       get idle() {
      //         return this.stream.idle;
      //       },
      //       pause() {
      //         this.stream.pause();
      //       },
      //       resume() {
      //         this.stream.resume();
      //       },
      //     };
      //   },

      //   useSlot: name => {
      //     if (!props['@@slots'][name]) {
      //       throw new Error(`Unknown slot ${name}`);
      //     }
      //     return () => props['@@slots'][name].children();
      //   },
      // };

      // ctx.$$.ref = (as, _ctx, vnode) => {
      //   if (!(_ctx && vnode)) {
      //     return [_anchor, typeof as === 'string' ? `.${as}` : ''].join('');
      //   }
      //   if (as === 'ref') {
      //     vnode[1]['data-source'] = _anchor;
      //   }
      // };

      // ctx.$$.reply = async (frag, payload) => {
      //   try {
      //     const tasks = [];

      //     if (typeof frag === 'object') {
      //       Object.keys(frag).forEach(key => {
      //         tasks.push([key, { [key]: frag[key] }]);
      //       });
      //     } else {
      //       tasks.push([frag, payload]);
      //     }

      //     await Promise.all(tasks.map(([key, value]) => {
      //       if (!(key in this._tpl.fragments)) {
      //         throw new ReferenceError(`Fragment not found, given '${key}'`);
      //       }

      //       return self._emit(this._tpl.fragments[key], Object.assign(data, value));
      //     }));
      //   } catch (e) {
      //     if (ctx.$$.socket) {
      //       ctx.$$.socket.emit('failure', { e, frag, payload });
      //     } else {
      //       // FIXME: investigate...
      //       console.debug('E_REPLY', e);
      //     }
      //   }
      // };

      // const _from = ctx.$$.req_headers['request-from'] || ctx.$$.body_params._ref;
      // const _call = ctx.$$.req_headers['request-call'] || ctx.$$.body_params._cta;

      retval = await this._tpl(ctx.$$, props, ctx.loader, Reactor.resolve, ctx.debugger, async payload => {
        try {
          // if (_call && (!_from || _anchor === _from)) {
          //   if (typeof payload[_call] === 'function') await payload[_call](ctx.$$);
          // }

          if (payload.default) {
            const methods = {};

            Object.keys(payload.default).forEach(key => {
              if (typeof payload.default[key] !== 'function') return;
              if (/^(GET|PUT|POST|PATCH|DELETE)/.test(key)) {
                methods[key] = payload.default[key];
              } else {
                _actions[key] = payload.default[key];
              }
            });

            await req(ctx.$$, true, methods, this._opts.context);
          }
        } catch (e) {
          if (_actions.onError) {
            await _actions.onError(e);
          } else {
            failure = e;
          }
        }
      });

      data = { ...retval.data };
      data.self = (as, _ctx, vnode) => {
        if (as === 'self') {
          vnode[1]['data-location'] = props['data-location'];
        }
      };

      deferred = Template.assign(ctx, data, this, _uuid, _locs, _anchor, callback);
    }

    try {
      await Promise.all(deferred.map(cb => new Promise(next => cb(_uuid, next))));
    } catch (e) {
      ctx.errors.push(e);
    }

    const _render = this._render = this.invoke(ctx, null, callback);
    const _props = {
      file: this._tpl.source,
      slots: this._tpl.slots,
    };

    // FIXME: this should be streamable...
    const [content, metadata, document, attributes] = await Promise.all([
      Render.renderAsync({ props: _props, _slots: this._slots, render: this._tpl.render }, data, _render),
      Render.renderAsync({ props: _props, _slots: this._slots, render: this._tpl.metadata }, data),
      Render.renderAsync({ props: _props, render: this._tpl.document }, data),
      Render.renderAsync({ props: _props, render: this._tpl.attributes }, data),
    ]);

    _stack.forEach(cb => cb(data));

    // TODO: improve these apis....
    // await this.dispatch('effects');
    // await this.dispatch('cleanup');

    ctx.css[this._tpl.source] = this._tpl.styles;
    ctx.js[this._tpl.source] = this._tpl.scripts;
    ctx.call[_anchor] = [data, _actions];
    ctx.on.push(...this._hooks.bootstrap);
    ctx.end.push(...this._hooks.teardown);

    this._hooks.streams.forEach(stream => {
      ctx.streams[stream.key] = stream;
    });

    ctx.meta.push(...metadata);

    Object.assign(ctx.doc, document);
    Object.assign(ctx.attrs, attributes);

    if (include) {
      return { data, failure, content };
    }
    return content;
  }

  static stringify(result, context, options, javascript, stylesheets, inlineScripts) {
    const body = Markup.taggify(result, context.buffer);
    const head = Markup.taggify(context.meta, context.buffer);

    let prelude = '';
    if (options.inline && context.prelude.length) {
      prelude = `\n<script>${context.prelude.join('')}</script>`;
    }

    const scripts = javascript.map(code => (
      code.indexOf('/*!@@module*/') === 0
        ? `\n<script type=module>\n${code.substr(13)}</script>`
        : `\n<script>\n${code}</script>`
    ));

    const styles = stylesheets ? `\n<style>\n${stylesheets}</style>` : '';
    const prefix = head.length || styles ? `<head>\n${head}${styles}</head>\n` : '';
    const suffix = inlineScripts ? scripts.join('') + prelude : '';

    let content = `${prefix}<body${Markup.attributes(context.attrs)}>\n${body + suffix}</body>`;
    content = `<!DOCTYPE html>\n<html${Markup.attributes(context.doc)}>\n${content}</html>`;

    return content;
  }

  static transform($$, mod, file, main, paths) {
    const {
      hasVars, variables, children, locals, alias, deps, keys, code,
    } = Reactor.transform($$, '$$props', 'await $$loader', false, _ => {
      return _.reduce((prev, x) => prev.concat(Mortero.resolve(x, file, paths) || []), []);
    });

    children.push(...mod.includes);

    const src = relative(file);
    const name = code.match(/_\$=\{[^]*?((?:,|\s?)\s*as\s*:\s*(["'])(\w+)\2\s*(?:,|\s?))[^]*?\}/);

    // FIXME: extract simple values from code, similar to `as:"..."` but for `use:["..."]`

    const used = [...new Set(keys.concat(deps))];
    const shared = [...main.deps].concat(variables);

    const tmp = [];
    const vars = [];
    const frags = [];

    used.forEach(key => {
      if (alias[key] || ['const', 'function'].includes(locals[key])) shared.push(key);
      if (locals[key] !== 'function') tmp.push(key);
      if (locals[key] === 'var') vars.push(key);
    });

    let tpl = mod.template;
    Object.keys(mod.fragments).forEach(x => {
      frags.push(`Object.defineProperty(c$$.fragments, '${x}', { value: {
      attributes: ${JSON.stringify({ ...mod.fragments[x].attributes, key: undefined })},
      template: async function ($$ctx, $$) { with ($$ctx) return [\n${mod.fragments[x].template}]; },
      id: '${x}',
    }, enumerable: true });`);
    });

    const script = (variables.length ? `let ${variables.join(', ')}; ${code}` : code)
      .replace(/(await \$\$loader)\(([^()]+)\)/g, '$1($2, c$$$$.source, __filename)');

    const unsafe = ['self', 'module', 'require', 'global', 'process'].map(x => `const ${x} = void 0`).join('; ');
    const buffer = `/*!#@@src=${src}*/\n${reExport(load(main.code)).trim()}
  async function c$$($$, $$props, $$loader, $$reactor, $$debugger, $$callback) {
    const $$vars = ${JSON.stringify(vars)};
    const $$data = Object.create(null);
    ${JSON.stringify(tmp)}.forEach(k => { $$data[k] = $$vars.includes(k) ? undefined : $$props[k]; });
    const $$result = await $$reactor($$, $$data, async _$ => { const console = $$debugger; ${unsafe}; with (_$) {\n${script}${
  shared.length ? `\nreturn () => {$def(_$, { ${shared.join(', ')} }); }` : ''
}}}, $$callback);
    return $$result;
  }

  c$$.as = '${(name && name[3]) || `${file.replace(/^.*?([^/]+)\.\w+$/, '$1')}_page`}';
  c$$.scope = ${JSON.stringify(mod.identifier)};
  c$$.prelude = ${!hasVars ? 'false' : 'true'};
  c$$.source = '${src}';
  c$$.render = ${tpl};
  c$$.metadata = async function ($$ctx, $$) { with ($$ctx) return [${mod.metadata.template}] };
  c$$.document = async function ($$ctx, $$) { with ($$ctx) return ${mod.document.template} };
  c$$.attributes = async function ($$ctx, $$) { with ($$ctx) return ${mod.attributes.template} };
  c$$.fragments = Object.create(null);
  c$$.definition = module.exports;
  module.exports = c$$;
  ${frags.join('\n')}
  ;(set$ => {
    set$(c$$, 'components', ${safeJSON(mod.components)});
    set$(c$$, 'locations', ${safeJSON(mod.locations)});
    set$(c$$, 'scripts', ${safeJSON(mod.scripts)});
    set$(c$$, 'styles', ${safeJSON(mod.styles)});
  })((o, p, d) => { let v; Object.defineProperty(o, p, { enumerable: true, get: () => (typeof v === 'undefined' && (v = JSON.parse(d)), v) }) });
  `;

    return {
      code: buffer, locals, children,
    };
  }

  static transpile(markup, callback) {
    let prefix = '';
    let script = markup.scripts.filter(x => x.isMain).map(x => x.body).join('');
    const exprs = _vars(script);

    if (exprs.children.includes('jamrock')) {
      script = script.replace(/\s*\}\s*from\s*["']jamrock["']/, ', registerComponent$&');
    } else {
      prefix = "import { registerComponent } from 'jamrock';\n";
    }

    const lines = script.split('\n');

    let offset = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim().indexOf('import') === 0) offset = i + 2;
    }

    const locals = exprs.keys.filter(x => exprs.locals[x] !== 'import').concat(exprs.deps);
    const children = [];

    Object.keys(exprs.imports).forEach(dep => {
      if (dep.charAt() === '.') {
        const partial = Template.locate(path.dirname(markup.file), dep);

        locals.push(...exprs.imports[dep]);
        children.push(partial);
      }
    });

    let obj;
    let scope;
    if (markup.styles.some(x => x.scoped)) {
      scope = identifier(path.basename(markup.file));
    }

    const partial = Markup.compile(markup.template, markup.file, tree => {
      obj = Markup.metadata(tree, scope);
      return obj.markup.content || [];
    });

    const base = path.basename(path.resolve('.'));
    const name = noExt(markup.file).split('/client/')[1] || path.basename(noExt(markup.file));

    const view = partial.render.toString();
    const content = lines.slice(offset).join('\n')
      .replace(/export\s+((?:async\s+)?function\*?)\s+([*\s]*)(\w+)/g, 'const $3 = $$$$props.$3 || $1 $2$3')
      .replace(/export\s+(let|const)\s+(\w+)\s*;/g, '$1 $2 = $$$$props.$2;')
      .replace(/export\s+(let|const)\s+(\w+)\s*=/g, '$1 $2 = $$$$props.$2 ||');

    Template.render(markup.styles.map(x => ({ ...x, scope })), null, markup.file, 'css')
      .then(results => {
        const body = view
          .replace(/"(on\w+)":\s*"(.+?)"/g, '"$1": $2')
          .replace(/\swith\s\((\$\$\w+)\)\sreturn/g, 'return $1 &&');

        const source = [
          lines.slice(0, offset).join('\n') + prefix,
          `const stylesheet = \`${results.join('\n')}\`;`,
          `const component = $$props => {\n${content}\nreturn { ${[...new Set(locals)].join(', ')} }};\n`,
          `const template = { render: ${body} };\n`,
          `export default registerComponent("${base}:${name}", { stylesheet, component, template });\n`,
        ].join('');

        callback({ source, children });
      })
      .catch(console.debug);
  }

  static async bundle(name, input, dest, runtime, callback) {
    const result = await Mortero.parse(name, input, {
      platform: 'browser',
      format: 'iife',
      bundle: true,
      write: false,
      aliases: {
        jamrock: runtime,
      },
    })();

    writeFile(dest, callback(result.source));

    if (!process.silent) {
      Template.status(relative(dest));
    }
  }

  static async compile(src, file, options = {}) {
    let destFile;
    if (options.dest) {
      destFile = path.resolve(path.join(options.dest, src.replace(/\.\w+$/, '.js').replace(/^[^/]+?\//, '')));

      if (!hasChanged(file, destFile)) {
        return { destination: destFile, code: null };
      }
    }

    const markup = options.component || Markup.parts(readFile(file), file);
    const script = markup.scripts.filter(x => x.isMain).map(x => x.body).join('\n');
    const main = Reactor.variables(markup.scripts.filter(x => x.shared).map(x => x.body).join('\n'));
    // const cwd = relative(path.dirname(file), `${process.cwd()}/`, true);
    const $$ = Reactor.variables(script, true);
    // const re = relative(path.dirname(file));
    // const id = path.basename(cwd);

    let scope = null;
    let obj = {};

    if (markup.styles.some(x => x.scoped)) {
      scope = identifier(path.basename(file));
    }

    const partial = Markup.compile(markup.template, file, tree => {
      obj = Markup.metadata(tree, scope);
      return obj.markup.content || [];
    }, true);

    // const seen = [];
    // const bundles = {};
    const deferred = [];

    obj.includes = [];
    // obj.components.forEach(key => {
    //   let base = re;
    //   let ref = key.replace('~', cwd);
    //   if (ref.includes(':')) {
    //     const [mod, ...dir] = ref.replace(':', '/components/client/').split('/');

    //     base = mod === 'jamrock'
    //       ? options.jamrock
    //       : require.resolve(mod);

    //     ref = path.join(base, dir.join('/'));
    //     ref = !fs.existsSync(ref) ? `${ref}.js` : ref;
    //   } else {
    //     ref = Mortero.resolve(ref, file, options.paths) || Template.locate('/', ref);
    //   }

    //   const len = relative(options.dest).split('/').length;
    //   const dirs = relative(`/${base}`, `/${relative(noExt(ref))}`, true).split('/');
    //   const outFile = `${path.join(options.dest, dirs.slice(len + 1).join('/'))}.js`;

    //   if (!fs.existsSync(ref)) {
    //     throw new Error(`Component not found, given '${key}'`);
    //   }

    //   if (!seen.includes(ref)) {
    //     seen.push(ref);
    //     if (isSource(ref)) {
    //       if (hasChanged(ref, outFile)) {
    //         deferred.push(Mortero.parse(`${key}.some`, readFile(ref), { write: false })()
    //           .then(result => {
    //             writeFile(outFile, result.source);

    //             if (!process.silent) {
    //               Template.status(relative(outFile));
    //             }

    //             obj.includes.push(...result.children);
    //             obj.includes.push(ref);
    //             bundles[key] = { id, ref: outFile };
    //           }));
    //       } else {
    //         obj.includes.push(ref);
    //         bundles[key] = { id, ref: outFile };
    //       }
    //     } else {
    //       obj.includes.push(ref);
    //       bundles[key] = { id, ref };
    //     }
    //   } else {
    //     bundles[key] = { id, ref: outFile };
    //   }
    // });

    await Promise.all(deferred);
    // await Promise.all(Object.keys(bundles)
    //   .map(bundle => {
    //     const _src = bundles[bundle].ref;
    //     const _dest = _src.replace('.js', '.bundle.js');

    //     return hasChanged(_src, _dest) && Template.bundle(_src, readFile(_src), _dest, options.runtime);
    //   }));

    obj.identifier = scope;
    obj.destination = null;
    // obj.components = Object.keys(bundles).reduce((memo, cur) => {
    //   memo[cur] = [bundles[cur].id, bundles[cur].ref.replace('.js', '.bundle.js')];
    //   return memo;
    // }, {});

    obj.scripts.push(...await Template.render(markup.scripts.filter(x => !x.isMain && !x.shared), null, src, 'js'));
    obj.styles.push(...await Template.render(markup.styles.map(x => ({ ...x, scope })), null, src, 'css'));

    function locate(offset, value) {
      let found;
      for (const chunk of partial.props.locations) {
        found = chunk;
        if (chunk.block === value && chunk.offset[0] >= offset) break;
      }
      return found;
    }

    obj.locations = partial.props.locations;
    obj.template = partial.render.toString();
    obj.attributes = {
      template: `{${partial.enhance(Markup.Expression.props(obj.markup.attributes || {}, '', 0, true, locate), true)}};`,
    };
    obj.document = {
      template: `{${partial.enhance(Markup.Expression.props(obj.markup.document || {}, '', 0, true, locate), true)}};`,
    };
    obj.metadata = {
      template: partial.enhance(partial.compact(obj.markup.metadata, markup.html.indexOf('<head'), true), true),
    };
    obj.fragments = Object.keys(obj.fragments).reduce((memo, key) => {
      memo[key] = {
        attributes: obj.fragments[key].attributes,
        template: partial.enhance(partial.compact(obj.fragments[key].elements, 0, true), true),
      };
      return memo;
    }, {});

    const out = Template.transform($$, obj, file, main, options.paths);

    if (options.dest) {
      out.destination = destFile;

      if (options.write !== false) {
        writeFile(out.destination, out.code);

        if (options.reload) {
          delete require.cache[out.destination];
        }
      }
    }
    return out;
  }

  static async compact(ctx, body, context, options) {
    // const seen = [];
    const result = {
      set: [],
      html: context.doc,
      attrs: context.attrs,
      styles: Object.values(context.css).reduce((a, b) => a.concat(b), []).join(''),
      scripts: Object.values(context.js).reduce((a, b) => a.concat(b), []),
    };

    context.prelude = [];
    context.buffer = {};
    context.stack = [];

    // function serialize(vnode, hooks) {
    //   if (hooks.length) {
    //     hooks.forEach(fn => fn[0](fn[1], ctx, vnode));
    //   }

    //   if (!vnode[1].$key) {
    //     if (vnode[0] === 'fragment') {
    //       // FIXME: skip if it is from a loop, they're sent differently
    //       result.set.push({ ...vnode[1], children: vnode[2] });

    //       if (vnode[1]['data-source']) {
    //         vnode[1].id = `${vnode[1].id}:${vnode[1]['data-source']}`;
    //         delete vnode[1]['data-source'];
    //       }
    //     }
    //     if (vnode[0] === 'template') {
    //       const children = vnode[2];

    //       vnode.length = 0;
    //       vnode.push(...children);
    //     }
    //     if (vnode[0] === 'form') {
    //       vnode[2].unshift(['input', { type: 'hidden', name: '_csrf', value: ctx.csrf_token }]);

    //       if (vnode[1]['data-source']) {
    //         vnode[2].unshift(['input', { type: 'hidden', name: '_ref', value: vnode[1]['data-source'] }]);
    //       }

    //       if (vnode[1]['@trigger']) {
    //         vnode[2].push(['noscript', null, [
    //           ['p', null, 'Please turn on JavaScript to enable this form.'],
    //         ]]);
    //       }
    //     }
    //     return;
    //   }

    //   const {
    //     $key, $src, $props, $slots, $target, $children,
    //   } = vnode[1];

    //   const id = $src.includes(':') ? $src : `${$target[0]}:${
    //     $src.includes('/client/') ? $src.split('/client/')[1] : $src.replace(/^\.{1,2}\//g, '')
    //   }`;

    //   const mod = realpath($target[1].replace('.bundle', ''));
    //   const Elem = use(mod);

    //   if (!seen.includes($src)) {
    //     context.prelude.push(readFile($target[1]));
    //     result.styles += Elem.stylesheet || '';
    //     seen.push($src);
    //   }

    //   if (options.reload || options.watch) {
    //     delete require.cache[require.resolve(mod)];
    //   }

    //   // createContext should be computed once?
    //   // in nohooks, we should not create a new instance from args
    //   // instead we should return the same instance, then, invoke with
    //   // any given args... like a singleton (also check if this is true on somedom)
    //   createContext(() => {
    //     try {
    //       vnode[0] = $props.as || 'div';
    //       vnode[1] = { id: `component-${$key}`, 'data-component': $src };
    //       vnode[2] = Elem.render({ ...$props, slots: { default: $children, ...$slots } });

    //       Object.keys($props).forEach(key => {
    //         if (key.indexOf('data-') === 0 || key === 'class') vnode[1][key] = $props[key];
    //       });

    //       let slots = '';
    //       Object.keys($slots).forEach(slot => {
    //         slots += `,"${slot}":${JSON.stringify(renderSync({ render: $slots[slot] }, $props))}`;
    //       });

    //       let payload = JSON.stringify($props);

    //       payload = payload.substr(0, payload.length - 1).trim();
    //       payload = payload.length === 1 ? payload : `${payload},`;
    //       payload += `"slots":{"default":${JSON.stringify($children)}${slots}}}`;

    //       context.buffer[$key] = html.taggify(vnode);
    //       context.prelude.push(`Jamrock.mount('${id}', '${vnode[1].id}', ${payload});\n`);
    //     } catch (e) {
    //       vnode[0] = 'pre';
    //       vnode[1] = null;
    //       vnode[2] = [e.stack];

    //       context.buffer[$key] = `<pre>${e.stack}</pre>`;
    //     }
    //   })();
    // }

    // result.body = util.serialize(body || [], null, serialize);
    // result.head = util.serialize(context.meta, null, serialize);

    console.log(options);

    result.body = Markup.serialize(body || []);
    result.head = Markup.serialize(context.meta);

    return result;
  }

  static async render(tpl, data, source, extension) {
    if (Array.isArray(tpl)) {
      return Promise.all(tpl.map(x => Template.render(x, data, source, extension)));
    }

    if (typeof tpl === 'object') {
      const result = await new Promise((resolve, reject) => {
        const filepath = `${source.replace(/\.\w+$/, '')}.${tpl.language || extension}`;
        const partial = Mortero.parse(path.resolve(filepath), tpl.body, {
          write: false,
          watch: false,

          bundle: !tpl.isModule || tpl.isScoped,
          online: tpl.isModule,
          modules: tpl.isModule,

          install: process.env.NODE_ENV === 'development',

          aliases: {
            jamrock: path.join(__dirname, 'browser.js'),
          },

          progress: false,
          platform: 'browser',
        });

        partial(data, (err, output) => {
          if (err) {
            reject(err);
            return;
          }

          if (output.extension === 'css' && tpl.scoped) {
            output.source = Markup.stylesheet(tpl.scope.join('='), output.source);
          }
          resolve(output);
        });
      });

      if (extension === 'js') {
        tpl = tpl.isModule ? `/*!@@module*/${result.source}` : result.source;
      } else {
        tpl = result.source;
      }
    }
    return tpl;
  }

  static async loader($$, mod, file, source, options) {
    if (file === 'jamrock/conn') return $$;
    if (file === 'jamrock/store') return Store;
    if (file === 'jamrock/hooks') return $$.current_hooks;

    // FIXME: try to use/expose global objects? e.g. File
    // but for other helper... what to do?
    // if (file === 'jamrock/utils') {
    //   return {};
    // }

    if (file === 'jamrock/components') {
      const map = {};

      return SHARED_COMPONENTS.reduce((prev, cur) => prev
        .then(() => Template.loader($$, mod, `jamrock/components/${cur.toLowerCase()}`, source, options))
        .then(result => { map[cur] = result; }), Promise.resolve()).then(() => map);
    }

    if (file.indexOf('jamrock') === 0) {
      file = file.replace('jamrock', options.jamrock);
    }

    if (file.indexOf('~/') === 0) {
      file = path.resolve(file.replace('~', '.'));
    }

    const [base, field] = file.split(':');

    try {
      let res = './'.includes(base.charAt()) && Template.locate(path.dirname(mod), base);

      res = !fs.existsSync(res)
        ? Template.locate(path.dirname(source), base)
        : res;

      res = !fs.existsSync(res)
        ? Template.locate('/', base)
        : res;

      if (res) {
        if (isSource(res)) {
          const _mod = path.resolve(res);
          const name = relative(res, true);
          const view = await Template.compile(name, _mod, options);

          res = view.destination;
        }

        const $ = await use(res);

        if (!$._self) {
          $._self = typeof $ === 'function' && $.name !== 'c$$'
            ? $(options.container)
            : $;

          if (typeof $ === 'function' && $.name === 'c$$') {
            $._self = Template.from(base, $, options);
          }
          if (typeof $._self.connect === 'function') {
            await $._self.connect();
          }
        }

        if (typeof field === 'string') {
          return $._self[field];
        }
        return $._self;
      }
      return use(base);
    } catch (e) {
      e.sample = trace(e, { file: source }, readFile(mod), true);
      throw e;
    }
  }

  static async create($$, mod, options, _template) {
    const handler = _template || await use(mod);

    const js = Object.create(null);
    const css = Object.create(null);
    const doc = Object.create(null);
    const call = Object.create(null);
    const attrs = Object.create(null);
    const streams = Object.create(null);

    const on = [];
    const end = [];
    const meta = [];
    const errors = [];
    const loader = (file, source, _filename) => Template.loader($$, _filename || mod, file, source || handler.source, options);

    return {
      $$, js, css, doc, on, end, meta, call, attrs, errors, streams, loader, handler,
    };
  }

  static status(message) {
    process.stdout.write(` \x1b[90m${message}\x1b[0m\x1b[K\n`);
  }

  static require(mod, options) {
    const file = path.resolve(mod);
    const src = relative(file, true);

    return async (ctx, container) => {
      const tpl = await Template.compile(src, file, options);
      const _template = await use(tpl.destination);

      return {
        context: await Template.create(ctx, file, { ...options, container }, _template),
        template: Template.from(src, _template, { ...options, container }),
      };
    };
  }

  static assign(ctx, data, self, uuid, locals, _anchor, callback) {
    const deferred = [];

    if (!_anchor.includes('#0')) {
      data[Markup.__ANCHOR__] = _anchor;
    }

    Object.keys(data).forEach(key => {
      if (Template.valid(data[key])) {
        self._refs[key] = data[key];
      } else if (locals.some(x => x.name === key)) {
        const { repeat } = locals.find(x => x.name === key);
        const value = data[key];

        if (!repeat && Store.valid(value)) {
          if (value.upgrade) value.upgrade(ctx.$$);
          data[key] = Store.get(value);
          return;
        }

        if (value && (isThenable(value) || isGenerator(value) || isIterable(value) || Store.valid(value))) {
          if (value.length) return;

          if (ctx.handler[`${uuid}?${self._name}#${key}`]) {
            ctx.handler[`${uuid}?${self._name}#${key}`].cancel();
          }

          deferred.push(self.append(key, value, data, callback));
        }
      }
    });

    return deferred;
  }

  static locate(base, target) {
    const exts = ['.js', '.jam', '.rock', '.html', '.htmlx'];
    const a = path.join(base, target);

    if (isFile(a)) return path.resolve(a);

    for (let i = 0; i < exts.length; i += 1) {
      const x = `${target}${exts[i]}`;
      const y = `${target}/index${exts[i]}`;

      const b = path.join(base, x);
      const c = path.join(base, y);

      if (isFile(b)) return path.resolve(b);
      if (isFile(c)) return path.resolve(c);
    }
  }

  static from(name, chunk, options) {
    if (!Template[`#${name}`] || options.reload) {
      Template[`#${name}`] = new Template(name, chunk, options);
    }
    return Template[`#${name}`];
  }

  static valid(obj) {
    return obj instanceof Template;
  }
}

if (!Mortero.__ready) {
  Mortero.__ready = true;
  Mortero.use([{
    name: 'SomeDOM',
    run: ({ register }) => {
      register(['some'], (params, done) => {
        Template.transpile(Markup.parts(params.source, params.filepath), result => {
          params._bundle = true;
          params.source = result.source;
          params.children.push(...result.children);
          done();
        });
      });
    },
  }]);
}
