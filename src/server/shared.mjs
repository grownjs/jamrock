// @ts-check

import { Template, Runtime, Handler, Markup, Render, Util } from '../main.mjs';

import { createBody } from './request.mjs';
import { createFSWatcher } from './helpers.mjs';
import { createConnection } from './connection.mjs';

const PATH_PROPERTY = Symbol('@@path');
const FILES_PROPERTY = Symbol('@@files');
const ASSETS_PROPERTY = Symbol('@@assets');
const ROUTES_PROPERTY = Symbol('@@routes');
const VERSION_PROPERTY = Symbol('@@version');

/**
 * @import {RouteInfo, Environment} from "../../types/env.d.ts"
 */

export function printLog(...msg) {
  console.log(...msg);
}

// FIXME: we need to implement a file watcher that yield two kind of events,
// recompile and/or reload specific sources, recompile only touched sources,
// but reload consumers only (unless they recompile as well), so we can
// just reload an svg, file, component, etc. if consumer did not changed,
// make sure the clear import() cache from all environments as needed...
// actually we can add tests for this mechanism... right?

export const createWatcher = ({ fs }, watcher, compiler) => {
  const clients = [];
  const before = [];

  let timeout;
  let reloading;
  let sources = {};
  async function sync(quiet, routes) {
    const changeset = Object.entries(sources)
      .map(([k, v]) => ({ ...v, src: v.src || k }))
      .sort((a, b) => b.hits - a.hits);

    // printLog('SYNC', changeset);

    const modified = changeset.filter(_ => _.type === 'compile').map(_ => _.src);
    const refreshed = changeset.filter(_ => _.type === 'refresh').map(_ => _.src);

    try {
      await Promise.all(before.map(fn => fn(changeset)));
      const newdeps = await compiler.recompile([...new Set(modified)]);
      await compiler.save(routes, newdeps);
      await compiler.reload();
    } catch (e) {
      Util.trace('E_COMPILE', e);
    }

    const changed = [...new Set(refreshed)].filter(_ => !/\+(?:layout|error|server)\.(?:md|html)$/.test(_));

    reloading = true;
    sources = {};

    if (!quiet) {
      // console.log('[CHANGE]', changed);
      clients.forEach(ws => {
        // console.log('[SOCKET]', changed);
        ws.send(`reload ${changed.join(' ')}`);
      });
    }

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      reloading = false;
    }, 1260);
  }

  function push(src, type) {
    if (!sources[src]) {
      sources[src] = { src, type, hits: 0 };
    } else {
      sources[src].type = type;
      sources[src].hits++;
    }
  }

  const cache = new Map();

  let t;
  watcher.tap((type, src) => {
    const changes = [];
    const pending = [];

    if (type === 'unlink') {
      delete compiler[FILES_PROPERTY][src];
      printLog(`  ${Util.$.red('delete')} ${Util.$.gray(src)}`);
    }

    // FIXME: trigger tree changes... say, we got a dependency,
    // we lookup for its consumer, and read from styles/scripts/media
    // we can then check if touched file is within, and send sources to reload

    if (/\.(?:md|html)$/.test(src)) {
      changes.push([src, 'compile']);
    }

    Object.entries(compiler[FILES_PROPERTY]).forEach(([k, v]) => {
      if (v.children?.includes(src)) {
        const mod = Template.cache?.get(compiler[FILES_PROPERTY][k].filepath);

        if (mod?.module) {
          if (mod.module.__media.includes(src)) {
            changes.push([src, 'refresh']);
          }

          for (const [key, children] of mod.module.__styles) {
            if (children?.includes(src)) {
              pending.push(key);
              changes.push([k, 'compile']);
              changes.push([key, 'refresh']);
              return;
            }
          }
        }

        changes.push([k, 'compile']);
      }
    });

    if (!changes.length) {
      changes.push([src, 'refresh']);
    }

    // console.log(changes);
    changes.forEach(([file, kind]) => {
      if (!sources[file]) {
        clearTimeout(t);
        // FIXME: configure this
        t = setTimeout(sync, 60);

        if (pending.includes(file)) {
          push(file, kind);
        } else if (!fs.existsSync(file)) {
          Template.cache?.delete(file);
          cache.delete(file);
        } else {
          const mtime = fs.statSync(file).mtime;
          cache.set(file, mtime);
          push(file, kind);
        }
      } else {
        push(file, kind);
      }
    });
    // console.log({changes,sources});
    if (/\+(?:error|layout|server)/.test(src)) {
      clearTimeout(t);
      t = setTimeout(sync, 60);
    }
  });

  function appendSource(found) {
    if (found.route.middleware && !compiler.has(found.route.middleware)) push(found.route.middleware, 'compile');
    if (found.route.layout && !compiler.has(found.route.layout)) push(found.route.layout, 'compile');
    if (found.route.error && !compiler.has(found.route.error)) push(found.route.error, 'compile');
    if (found.route.src) push(found.route.src, 'compile');
  }

  async function retryCompile(url, retries) {
    const found = compiler.matches(url);

    if (found.route) {
      appendSource(found);
      reloading = true;
      await sync(true, found.routes);
      // console.log('RECOMPILE', found.route);
    } else if (retries > 0) {
      await new Promise(_ => setTimeout(_, 20)).then(() => retryCompile(url, retries - 1));
    } else {
      console.log('NOT FOUND', sources);
    }
  }

  async function tryRebuild(req) {
    // console.log('request', reloading, req.url);
    if (reloading) return;
    if (req.url.split('/').pop().includes('.')) return;
    if (req.method === 'GET') {
      try {
        const url = req.url[0] === '/' ? req.url : new URL(req.url).pathname;
        // const start = new Date();
        console.log('E_REQ', url);
        await retryCompile(url, 10);
        // console.log('>>>', (new Date() - start) / 1000);
      } catch (e) {
        Util.trace(e, 'E_REBUILD');
        reloading = false;
      }
    }
  }

  return {
    rebuild: tryRebuild,
    close: () => watcher.close(),
    before: cb => before.push(cb),
    observe: (src, cb) => watcher.on(src, cb),
    forEach: fn => clients.forEach(fn),
    subscribe: ws => clients.push(ws),
    unsubscribe: ws => clients.splice(clients.indexOf(ws), 1),
  };
};

export const createCompiler = ({ fs, path }, options, external) => {
  const cwd = options.cwd || process.cwd();
  const base = path.join(cwd, options.dest || 'generated');
  const index = path.join(base, 'index.json');

  const config = Template.exists(index)
    ? JSON.parse(Template.read(index))
    : { files: {}, assets: [], routes: [] };

  function has(file) {
    if (!file) return;
    const key = Handler.rebase(file);
    return typeof this[FILES_PROPERTY][key] !== 'undefined';
  }

  function save(routes, dependencies) {
    config.routes = routes || config.routes;
    Template.write(index, JSON.stringify({
      path: `${(options.src || this[PATH_PROPERTY]).replace('./', '')}`,
      files: Object.entries(this[FILES_PROPERTY]).reduce((memo, [k, v]) => {
        memo[k] = { ...memo[k], ...v };
        return memo;
      }, dependencies || {}),
      assets: this[ASSETS_PROPERTY].slice(),
      routes: this[ROUTES_PROPERTY].map(route => ({
        ...route,
        re: undefined,
        lvl: undefined,
        root: undefined,
      })),
    }, null, process.env.NODE_ENV === 'production' ? 0 : 2));
  }

  function handlers() {
    const api = Template.glob(`${options.src}/**/+server.mjs`);
    const pages = Template.glob(`${options.src}/**/*.{md,html}`);

    const sources = pages.concat(api).map(x => x.replace(cwd, '.'));
    const routes = Handler.controllers(options.src, sources.filter(x => /\+(?:page|error|layout|server)/.test(x)));

    return { sources, routes };
  }

  let generators = options.generators;
  async function hooks(watcher) {
    const unoConfig = Template.path(`${cwd}/unocss.config`);

    if (options.unocss && unoConfig) {
      const unocss = await external.getUnoCSSModule();
      const _reload = async () => {
        printLog(`💅 ${unoConfig.replace(cwd, '.')}`);

        const _config = await Template.reload(unoConfig, true);
        generators = { ...generators, css: await unocss.createGenerator(_config.default || _config) };
      };

      if (watcher) {
        watcher.observe(unoConfig, _reload);
        watcher.before(_reload);
      } else {
        await _reload();
      }
    }

    if (options.__filename && watcher) {
      const _reconfigure = async () => {
        printLog(`⚡ ${options.__filename.replace(cwd, '.')}`);

        const _options = await Template.reload(options.__filename, true);

        delete _options.default.src;
        delete _options.default.dest;
        delete _options.default.host;
        delete _options.default.port;
        delete _options.default.https;

        Object.assign(options, _options.default);
        this.refresh(watcher);
      };

      watcher.observe(options.__filename, _reconfigure);
    }
  }

  async function reload() {
    this[ROUTES_PROPERTY].forEach(route => {
      if (!route.url) Handler.rematch(route);
    });

    for (const [k, v] of Object.entries(this[FILES_PROPERTY])) {
      if (!v.filepath || !fs.existsSync(k)) continue;

      let mod = await Template.reload(path.resolve(v.filepath), true);
      if (!k.includes('+server')) {
        mod = {
          module: mod.default || mod,
          source: Template.read(k),
        };
      } else {
        mod = {
          module: mod,
        };
      }

      Template.cache?.set(v.filepath, mod);
    }
  }

  const cache = new Map();

  function matches(url) {
    if (cache.has(url)) {
      return cache.get(url);
    }

    const { routes } = handlers();

    for (const route of routes) {
      if (route.verb === 'GET' && route.re.test(url)) {
        cache.set(url, { route, routes });
        return { route, routes };

        // const _ = route.src || route.middleware;
        // const key = `${_}@mtime`;
        // const mtime = fs.statSync(_).mtime;
        // const cached = cache.get(key);

        // if (!cached || cached < mtime) {
        //   cache.set(key, mtime);
        //   return { route, routes };
        // }
      }
    }
    return { routes };
  }

  function compile(...args) {
    return new Markup.Block(...args);
  }

  let imported = [];
  async function recompile(sources) {
    const start = Date.now();
    const tasks = [];
    const bundle = [];
    const results = [];

    imported = imported.filter(x => !sources.includes(x));

    for (const file of sources) {
      const src = file.replace(cwd, '.');
      const key = Handler.rebase(src);

      if (!(key.includes('.md') || key.includes('.html'))) {
        this[FILES_PROPERTY][key] = { filepath: key, children: [] };
        continue;
      }

      if (!imported.includes(key)) {
        printLog(Util.$.bold(key));

        const shared = { ...options, generators };
        const mod = compile(Template.read(src), src, shared);
        const result = await Template.compile(compile, mod, shared, imported);

        mod.assets.media.forEach(asset => {
          if (!this[ASSETS_PROPERTY].includes(asset)) {
            this[ASSETS_PROPERTY].push(asset);
          }
        });

        result.forEach(chunk => {
          if (!chunk.dest) {
            const destFile = Template.join(options.dest, chunk.src);
            const relative = Template.relative(destFile, chunk.src);

            results.push([{ content: `export * from '${relative}';\n` }, Handler.rebase(destFile)]);
          } else {
            const destFile = Template.join(options.dest, chunk.dest).replace(/\.(?:md|html)/, '.generated.mjs');

            printLog(`  ${Util.$.green('write')} ${Util.$.gray(destFile)}`);

            results.push([chunk, Handler.rebase(destFile)]);
            bundle.push(destFile);

            if (chunk.client) {
              const clientFile = destFile.replace('.generated.', '.bundled.');

              printLog(`  ${Util.$.green('write')} ${Util.$.gray(clientFile)}`);

              tasks.push(() => Template.transpile({
                filepath: destFile.replace('.mjs', '.js'),
                content: `export * from '${Template.join(cwd, destFile)}'`,
              }).then(params => Template.write(clientFile, params.content)));
            }
          }
        });
      }
    }

    results.forEach(([chunk, destFile]) => {
      Template.write(destFile, Markup.Block.unwrap(chunk.content, chunk.src, destFile));
      if (chunk.src) {
        this[FILES_PROPERTY][chunk.src] = {
          filepath: destFile,
          children: chunk.children
            ? chunk.children.map(x => path.relative(cwd, x))
            : [],
        };
      }
    });

    await Promise.all(tasks.map(fn => fn()));

    printLog(`${results.length > 0 ? results.length : 'No'} file${results.length === 1 ? '' : 's'} processed (${Util.ms(start)})`);

    return Template.imports(`${bundle.map(_ => `import '${_}';`).join('\n')}`);
  }

  async function precompile() {
    const { sources, routes } = handlers();

    const deps = await this.recompile(sources);
    await this.save(routes, deps);
  }

  function refresh(watcher) {
    this.recompile([...cache.values().map(_ => _.route.src)]);
    watcher.forEach(ws => ws.send('refresh'));
  }

  return Object.defineProperties({
    has,
    save,
    hooks,
    reload,
    refresh,
    matches,
    compile,
    recompile,
    precompile,
  }, {
    [PATH_PROPERTY]: {
      get: () => config.path,
    },
    [FILES_PROPERTY]: {
      get: () => config.files,
    },
    [ASSETS_PROPERTY]: {
      get: () => config.assets,
    },
    [ROUTES_PROPERTY]: {
      get: () => config.routes,
    },
    [VERSION_PROPERTY]: {
      get: () => config.version || 'HEAD',
    },
  });
};

/**
 * @typedef {any} TemplateInstance
 * @typedef {(path: string) => TemplateInstance} TemplateLocator
 */

/**
 * @typedef {object} Environment
 * @property {any}                  cache
 * @property {RouteInfo[]}          routes
 * @property {Record<string, any>}  files
 * @property {string[]}             assets
 * @property {TemplateLocator}      locate
 * @property {function}             build
 * @property {function}             request
 * @property {string}               version
 * @property {any}                  context
 * @property {any}                  options
 */

/**
 * @param {any} deps
 * @param {any} options
 * @param {any} external
 * @returns {Environment}
 */
export function createEnvironment({ fs, path }, options, external) {
  Template.cache = new Map();

  const compiler = createCompiler({ fs, path }, options, external);

  const location = {
    host: options.host || `localhost:${options.port || 8000}`,
    port: options.port || '8000',
  };

  async function serve(overrides) {
    this.options = { ...options, ...overrides, location };

    if (options.watch) {
      const watcher = await createFSWatcher(options, external.getChokidarModule);

      this.watcher = createWatcher({ fs }, watcher, compiler);
    }

    await external.createServer(this, this.options);
    await compiler.hooks(this.watcher);
    await compiler.reload();
  }

  async function build(reload) {
    if (reload) {
      await compiler.reload();
    } else {
      await compiler.hooks();
      await compiler.precompile();
    }
    return this;
  }

  function copy(source, target) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  function write(target, contents) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }

  async function _static() {
    try {
      const start = Date.now();
      const base = compiler[PATH_PROPERTY];
      const files = compiler[FILES_PROPERTY];
      const routes = compiler[ROUTES_PROPERTY];
      const assets = compiler[ASSETS_PROPERTY];

      const publicDir = options.public || 'public';
      const publicDest = path.join(options.dest, 'static');

      await compiler.reload();

      process.env.HEADLESS = 'true';

      fs.mkdirSync(publicDest, { recursive: true });

      if (fs.existsSync(publicDir)) {
        fs.cpSync(publicDir, publicDest, { recursive: true });
      }

      let count = 0;

      assets.forEach(asset => {
        fs.cpSync(asset, Template.join(publicDest, asset.replace(base, '')), { recursive: true });
        count++;
      });

      const modules = Object.fromEntries(Template.cache?.entries() || []);

      // FIXME: mock this better!
      const req = {};
      const uuid = '';
      const client = '';

      for (const route of routes.filter(_ => _.kind === 'page')) {
        // FIXME: try createConnection?
        const conn = {
          req,
          headers: {},
          base_url: options.target || '/',
          request_path: route.path,
        };

        const destFile = path.join(publicDest, route.path, 'index.html');

        printLog(Util.$.green(route.verb), route.path, Util.$.gray(destFile));

        // env.context.wrap
        const env = { files, locate: k => modules[files[k].filepath].module };

        // @ts-expect-error
        const result = await createBody(env, conn, [], { uuid, client, options, matches: route });

        write(destFile, result.body);
        count++;
      }

      for (const bundle of Template.glob(path.join(options.dest, compiler[PATH_PROPERTY], '/**/*.{css,bundled.mjs}'))) {
        const destFile = path.join(publicDest, options.prefix, path.relative(options.dest, bundle));
        copy(bundle, destFile);
        count++;
      }

      for (const [file, mod] of Object.entries(files)) {
        if (!mod.module?.__functions || !mod.module.__functions.length) continue;

        const key = file.replace('.generated.', '.hooks.');
        const destFile = path.join(publicDest, options.prefix, path.relative(options.dest, key));
        const code = `/* ${key} */\n${Object.values(mod.module.__functions).map(_ => `export ${_.toString()}\n`).join('')}`;

        write(destFile, code);
        count++;
      }

      for (const file of fs.readdirSync(import.meta.dirname)) {
        if (['client.mjs', 'server.mjs', 'main.mjs'].includes(file) || file.includes('.d.ts')) continue;

        const srcFile = path.join(import.meta.dirname, file);
        const destFile = path.join(publicDest, file);

        fs.copyFileSync(srcFile, destFile);
        count++;
      }

      printLog(`${count} file${count === 1 ? '' : 's'} written (${Util.ms(start)})`);
    } catch (e) {
      Util.trace(e, 'E_WRITE');
      printLog(e);
      process.exit(1);
    } finally {
      process.exit();
    }
  }

  function locate(src) {
    const key = Handler.rebase(src);
    const mod = compiler[FILES_PROPERTY][key];

    if (!mod) throw new Error(`Could not locate '${key}' file`);

    const dest = Template.cache?.get(mod.filepath);

    if (!dest?.module) {
      throw new Error(`Could not locate '${key}' module (${mod.filepath})`);
    }
    return dest.module;
  }

  function request(params = {}) {
    return new Request(`http://${location.host}${params.url || '/'}`, {
      // @ts-expect-error
      duplex: 'half',
      body: params.body,
      method: params.method || 'GET',
      headers: { ...location, ...params.headers },
    });
  }

  const context = Template.streamify();

  // @ts-expect-error
  return Object.defineProperties({
    serve, build, locate, request, context, compiler, static: _static,
  }, {
    path: { get: () => compiler[PATH_PROPERTY] },
    files: { get: () => compiler[FILES_PROPERTY] },
    assets: { get: () => compiler[ASSETS_PROPERTY] },
    routes: { get: () => compiler[ROUTES_PROPERTY] },
    version: { get: () => compiler[VERSION_PROPERTY] },
  });
}

export async function createTestingEnvironment({ fs, path }, options, external) {
  const env = createEnvironment({ fs, path }, options, external);

  await env.build(true);

  const store = {
    key: () => null,
    read: () => null,
    write: () => null,
    ...options.store,
  };

  const location = {
    host: options.host || 'localhost:8000',
    port: options.port || '8000',
  };

  const teardown = () => options.close && options.close();

  return Object.assign(env, {
    async resolve(mod, props, params = {}) {
      const request = env.request(params);

      const ctx = {
        route: params.route || {},
        conn: await createConnection(store, options, request, location, teardown),
      };

      const result = await Template.resolve(mod, mod.__src, ctx, props, Handler.middleware);

      // FIXME: how to deal with responses? as this method will invoke the component
      // we should be allowed to bypass some stuff if we want full-coverage...
      // also, we'll need a full-context instead of just conn/route info
      // const resp = await createResponse(env, conn, clients);
      // btw, this is similar to rpc:request calls?
      return result;
    },
    lookup(name) {
      const key = Object.keys(env.files).find(x => x.includes(name));
      if (!key) throw new Error(`Not found '${name}'`);
      return env.locate(key);
    },
    async mount(mod, props) {
      const runtime = { ...Runtime, ...Render.createRender() };
      const target = document.createElement('root');

      if (mod.__context === 'client') {
        return runtime.mountableComponent(mod).mount(target, props);
      }

      const result = await Template.resolve(mod, mod.__src, {}, props, () => null);

      target.innerHTML = Markup.taggify(result.body);
      return target;
    },
  });
}
