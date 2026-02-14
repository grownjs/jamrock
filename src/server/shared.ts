import { Template, Runtime, Handler, Markup, Render, Util } from '../main.ts';

import { createBody } from './request.ts';
import { createFSWatcher } from './helpers.ts';
import { createConnection } from './connection.ts';

const $ = Util as any;

const PATH_PROPERTY = Symbol('@@path');
const FILES_PROPERTY = Symbol('@@files');
const ASSETS_PROPERTY = Symbol('@@assets');
const ROUTES_PROPERTY = Symbol('@@routes');
const VERSION_PROPERTY = Symbol('@@version');

export const createWatcher = ({ fs }: any, watcher: any, compiler: any) => {
  const { printLog } = (process as any).shared || { printLog: console.log };

  const clients: any[] = [];
  const before: any[] = [];

  let timeout: any;
  let reloading: boolean;
  let sources: any = {};
  async function sync(quiet?: boolean, routes?: any) {
    const changeset = Object.entries(sources)
      .map(([k, v]: [string, any]) => ({ ...v, src: v.src || k }))
      .sort((a, b) => b.hits - a.hits);

    const modified = changeset.filter(_ => _.type === 'compile').map(_ => _.src);
    const refreshed = changeset.filter(_ => _.type === 'refresh').map(_ => _.src);

    try {
      await Promise.all(before.map(fn => fn(changeset)));
      const newdeps = await compiler.recompile([...new Set(modified)]);
      await compiler.save(routes, newdeps);
      await compiler.reload();
    } catch (e: any) {
      Util.trace('E_COMPILE', e);
    }

    const changed = [...new Set(refreshed)].filter((_: string) => !/\+(?:layout|error|server)\.(?:md|html)$/.test(_));

    reloading = true;
    sources = {};

    if (!quiet) {
      clients.forEach(ws => {
        ws.send(`reload ${changed.join(' ')}`);
      });
    }

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      reloading = false;
    }, 1260);
  }

  function push(src: string, type: string) {
    if (!sources[src]) {
      sources[src] = { src, type, hits: 0 };
    } else {
      sources[src].type = type;
      sources[src].hits++;
    }
  }

  const cache = new Map();

  let t: any;
  watcher.tap((type: string, src: string) => {
    const changes: any[] = [];
    const pending: string[] = [];

    if (type === 'unlink') {
      delete compiler[FILES_PROPERTY][src];
      printLog(`  ${$.$.red('delete')} ${$.$.gray(src)}`);
    }

    if (/\.(?:md|html)$/.test(src)) {
      changes.push([src, 'compile']);
    }

    Object.entries(compiler[FILES_PROPERTY]).forEach(([k, v]: [string, any]) => {
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

    changes.forEach(([file, kind]: [string, string]) => {
      if (!sources[file]) {
        clearTimeout(t);
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
    if (/\+(?:error|layout|server)/.test(src)) {
      clearTimeout(t);
      t = setTimeout(sync, 60);
    }
  });

  function appendSource(found: any) {
    if (found.route.middleware && !compiler.has(found.route.middleware)) push(found.route.middleware, 'compile');
    if (found.route.layout && !compiler.has(found.route.layout)) push(found.route.layout, 'compile');
    if (found.route.error && !compiler.has(found.route.error)) push(found.route.error, 'compile');
    if (found.route.src) push(found.route.src, 'compile');
  }

  async function retryCompile(url: string, retries: number) {
    const found = compiler.matches(url);

    if (found.route) {
      appendSource(found);
      reloading = true;
      await sync(true, found.routes);
    } else if (retries > 0) {
      await new Promise<void>(_ => setTimeout(_, 20)).then(() => retryCompile(url, retries - 1));
    } else {
      printLog('NOT FOUND', sources);
    }
  }

  async function tryRebuild(req: any) {
    if (reloading) return;
    if (req.url.split('/').pop().includes('.')) return;
    if (req.method === 'GET') {
      try {
        const url = req.url[0] === '/' ? req.url : new URL(req.url).pathname;
        printLog('E_REQ', url);
        await retryCompile(url, 10);
      } catch (e: any) {
        Util.trace(e, 'E_REBUILD');
        reloading = false;
      }
    }
  }

  return {
    rebuild: tryRebuild,
    close: () => watcher.close(),
    before: (cb: any) => before.push(cb),
    observe: (src: string, cb: any) => watcher.on(src, cb),
    forEach: (fn: any) => clients.forEach(fn),
    subscribe: (ws: any) => clients.push(ws),
    unsubscribe: (ws: any) => clients.splice(clients.indexOf(ws), 1),
  };
};

export const createCompiler = ({ fs, path }: any, options: any, external: any) => {
  const { printLog } = (process as any).shared || { printLog: console.log };

  const cwd = options.cwd || process.cwd();
  const base = path.join(cwd, options.dest || 'generated');
  const index = path.join(base, 'index.json');

  let config = {
    files: {},
    assets: [],
    routes: [],
    version: '',
    path: '',
  };

  try {
    if (Template.exists(index)) {
      Object.assign(config, JSON.parse(Template.read(index)));
    }
  } catch (e) {
    Util.trace(e, 'E_JSON');
  }

  function has(this: any, file: string) {
    if (!file) return;
    const key = Handler.rebase(file);
    return typeof this[FILES_PROPERTY][key] !== 'undefined';
  }

  function save(this: any, routes: any, dependencies: any) {
    config.routes = routes || config.routes;
    Template.write(index, JSON.stringify({
      path: `${(options.src || this[PATH_PROPERTY]).replace('./', '')}`,
      files: Object.entries(this[FILES_PROPERTY]).reduce((memo: any, [k, v]: [string, any]) => {
        memo[k] = { ...memo[k], ...v };
        return memo;
      }, dependencies || {}),
      assets: this[ASSETS_PROPERTY].slice(),
      routes: this[ROUTES_PROPERTY].map((route: any) => ({
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
  async function hooks(this: any, watcher?: any) {
    const unoConfig = Template.path(`${cwd}/unocss.config`);

    if (options.unocss && unoConfig && external.getUnoCSSModule) {
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

  async function reload(this: any) {
    this[ROUTES_PROPERTY].forEach((route: any) => {
      if (!route.url) Handler.rematch(route);
    });

    for (const [k, v] of Object.entries(this[FILES_PROPERTY]) as [string, any][]) {
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

  function matches(url: string) {
    if (cache.has(url)) {
      return cache.get(url);
    }

    const { routes } = handlers();

    for (const route of routes) {
      if (route.verb === 'GET' && route.re.test(url)) {
        cache.set(url, { route, routes });
        return { route, routes };
      }
    }
    return { routes };
  }

  function compile(...args: any[]) {
    return new (Markup.Block as any)(...args);
  }

  let imported: string[] = [];
  async function recompile(this: any, sources: string[]) {
    const start = Date.now();
    const tasks: (() => Promise<any>)[] = [];
    const bundle: string[] = [];
    const results: any[] = [];

    imported = imported.filter(x => !sources.includes(x));

    for (const file of sources) {
      const src = file.replace(cwd, '.');
      const key = Handler.rebase(src)!;

      if (!(key.includes('.md') || key.includes('.html'))) {
        this[FILES_PROPERTY][key] = { filepath: key, children: [] };
        continue;
      }

      if (!imported.includes(key)) {
        printLog($.$.bold(key));

        const shared = { ...options, generators };
        const mod = compile(Template.read(src), src, shared);
        const result = await Template.compile(compile, mod, shared, imported);

        mod.assets.media.forEach((asset: string) => {
          if (!this[ASSETS_PROPERTY].includes(asset)) {
            this[ASSETS_PROPERTY].push(asset);
          }
        });

        result.forEach((chunk: any) => {
          if (!chunk.dest) {
            const destFile = Template.join(options.dest, chunk.src);
            const relative = Template.relative(destFile, chunk.src);

            results.push([{ content: `export * from '${relative}';\n` }, Handler.rebase(destFile)]);
          } else {
            const destFile = Template.join(options.dest, chunk.dest).replace(/\.(?:md|html)/, '.generated.mjs');

            printLog(`  ${$.$.green('write')} ${$.$.gray(destFile)}`);

            results.push([chunk, Handler.rebase(destFile)]);
            bundle.push(destFile);

            if (chunk.client) {
              const clientFile = destFile.replace('.generated.', '.bundled.');

              printLog(`  ${$.$.green('write')} ${$.$.gray(clientFile)}`);

              tasks.push(() => Template.transpile({
                filepath: destFile.replace('.mjs', '.js'),
                content: `export * from '${Template.join(cwd, destFile)}'`,
              }).then((params: any) => Template.write(clientFile, params.content)));
            }
          }
        });
      }
    }

    results.forEach(([chunk, destFile]: [any, string]) => {
      Template.write(destFile, Markup.Block.unwrap(chunk.content, chunk.src, destFile));
      if (chunk.src) {
        this[FILES_PROPERTY][chunk.src] = {
          filepath: destFile,
          children: chunk.children
            ? chunk.children.map((x: string) => path.relative(cwd, x))
            : [],
        };
      }
    });

    await Promise.all(tasks.map(fn => fn()));

    printLog(`${results.length > 0 ? results.length : 'No'} file${results.length === 1 ? '' : 's'} processed (${Util.ms(start)})`);

    return Template.imports(`${bundle.map(_ => `import '${_}';`).join('\n')}`, '', null as any, '');
  }

  async function precompile(this: any) {
    const { sources, routes } = handlers();

    const deps = await this.recompile(sources);
    await this.save(routes, deps);
  }

  function refresh(this: any, watcher: any) {
    this.recompile([...Array.from(cache.values()).map((_: any) => _.route.src)]);
    watcher.forEach((ws: any) => ws.send('refresh'));
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

export function createEnvironment({ fs, path }: any, options: any, external: any): any {
  Template.cache = new Map();

  const { printLog } = (process as any).shared || { printLog: console.log };

  const compiler = createCompiler({ fs, path }, options, external);

  const location = {
    host: options.host || `localhost:${options.port || 8000}`,
    port: options.port || '8000',
  };

  async function serve(this: any, overrides: any) {
    this.options = { ...options, ...overrides, location };

    if (options.watch) {
      const watcher = await createFSWatcher(options, external.getChokidarModule);

      this.watcher = createWatcher({ fs }, watcher, compiler);
    }

    await compiler.reload();
    await compiler.hooks(this.watcher);
    await external.createServer(this, this.options);
  }

  async function build(this: any, reload?: boolean) {
    if (reload) {
      await compiler.reload();
    } else {
      await compiler.hooks();
      await compiler.precompile();
    }
    return this;
  }

  function copy(source: string, target: string) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  function write(target: string, contents: any) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }

  async function _static(this: any) {
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

      assets.forEach((asset: string) => {
        fs.cpSync(asset, Template.join(publicDest, asset.replace(base, '')), { recursive: true });
        count++;
      });

      const modules = Object.fromEntries(Template.cache?.entries() || []);

      const req = {
        fields: {},
      };
      const uuid = '';
      const client = '';

      for (const route of routes.filter((_: any) => _.kind === 'page')) {
        const conn = {
          req,
          flash: () => null,
          session: {},
          headers: {},
          base_url: options.target || '/',
          request_path: route.path,
        };

        const destFile = path.join(publicDest, route.path, 'index.html');

        printLog($.$.green(route.verb), route.path, $.$.gray(destFile));

        const env = { files, locate: (k: string) => modules[files[k].filepath].module };

        const result = await createBody(env, conn, [], { uuid, client, options, matches: route });

        write(destFile, result.body);
        count++;
      }

      const assetDir = path.join(options.dest, base);

      for (const vendor of Template.glob(path.join(assetDir, '/**/{http,https}___*'))) {
        const destFile = path.join(publicDest, options.prefix, path.relative(options.dest, vendor));
        copy(vendor, destFile);
        count++;
      }

      for (const bundle of Template.glob(path.join(assetDir, '/**/*.{css,bundled.mjs}'))) {
        const destFile = path.join(publicDest, options.prefix, path.relative(options.dest, bundle));
        copy(bundle, destFile);
        count++;
      }

      for (const [file, mod] of Object.entries(files) as [string, any][]) {
        if (!mod.module?.__functions || !mod.module.__functions.length) continue;

        const key = file.replace('.generated.', '.hooks.');
        const destFile = path.join(publicDest, options.prefix, path.relative(options.dest, key));
        const code = `/* ${key} */\n${Object.values(mod.module.__functions).map((_: any) => `export ${_.toString()}\n`).join('')}`;

        write(destFile, code);
        count++;
      }

      for (const file of fs.readdirSync((import.meta as any).dirname)) {
        if (['client.mjs', 'server.mjs', 'main.mjs'].includes(file) || file.includes('.d.ts')) continue;

        const srcFile = path.join((import.meta as any).dirname, file);
        const destFile = path.join(publicDest, file);

        fs.copyFileSync(srcFile, destFile);
        count++;
      }

      printLog(`${count} file${count === 1 ? '' : 's'} written (${Util.ms(start)})`);
    } catch (e: any) {
      Util.trace(e, 'E_WRITE');
      process.exit(1);
    } finally {
      process.exit();
    }
  }

  function locate(src: string) {
    const key = Handler.rebase(src)!;
    const mod = compiler[FILES_PROPERTY][key];

    if (!mod) throw new Error(`Could not locate '${key}' file`);

    const dest = Template.cache?.get(mod.filepath);

    if (!dest?.module) {
      throw new Error(`Could not locate '${key}' module (${mod.filepath})`);
    }
    return dest.module;
  }

  function request(params: any = {}) {
    return new Request(`http://${location.host}${params.url || '/'}`, {
      // @ts-expect-error
      duplex: 'half',
      body: params.body,
      method: params.method || 'GET',
      headers: { ...location, ...params.headers },
    });
  }

  const context = Template.streamify();

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

export async function createTestingEnvironment({ fs, path }: any, options: any, external: any): Promise<any> {
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
    async resolve(mod: any, props: any, params: any = {}) {
      const request = env.request(params);

      const ctx = {
        route: params.route || {},
        conn: await (createConnection as any)(store, options, request, location, teardown),
      };

      const result = await Template.resolve(mod, mod.__src, ctx, props, Handler.middleware);

      return result;
    },
    lookup(name: string) {
      const key = Object.keys(env.files).find((x: string) => x.includes(name));
      if (!key) throw new Error(`Not found '${name}'`);
      return env.locate(key);
    },
    async mount(mod: any, props: any) {
      const runtime = { ...Runtime, ...(Render as any).createRender() };
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
