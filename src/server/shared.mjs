import { Template, Runtime, Handler, Markup, Render, Util } from 'jamrock/core';

import { createFSWatcher } from './helpers.mjs';
import { createConnection } from './connection.mjs';

const FILES_PROPERTY = Symbol('@@files');
const ROUTES_PROPERTY = Symbol('@@routes');
const VERSION_PROPERTY = Symbol('@@version');

export function printLog(...msg) {
  console.log(...msg);
}

export const createWatcher = ({ fs }, watcher, compiler) => {
  const clients = [];
  const before = [];

  let reloading;
  let sources = [];
  async function sync(quiet, routes) {
    try {
      await Promise.all(before.map(fn => fn(sources)));
      const deps = await compiler.recompile(sources);
      await compiler.save(routes, deps);
      await compiler.reload();
    } catch (e) {
      // FIXME: decorate errors...
      console.error('E_COMPILE', e);
    }

    const changed = sources.filter(_ => !/\+(?:layout|error|server)/.test(_));

    reloading = true;
    sources = [];

    if (!quiet) {
      console.log('[CHANGE]', changed);
      clients.forEach(ws => {
        console.log('[SOCKET]', changed);
        ws.send(`reload ${changed.join(' ')}`);
      });
    }

    clearTimeout(sync.t);
    sync.t = setTimeout(() => {
      reloading = false;
    }, 1260);
  }

  const cache = new Map();

  let t;
  watcher.tap((type, src) => {
    const changes = [];

    if (type === 'unlink') {
      delete compiler[FILES_PROPERTY][src];
      printLog(`  ${Util.$.red('delete')} ${Util.$.gray(src)}`);
    }

    const old = compiler[FILES_PROPERTY][src];

    if (
      old?.filepath
      && old.filepath.includes('.generated.')
      && Template.exists(old.filepath.replace('.generated.', '.bundled.'))
    ) {
      changes.push(src);
    } else {
      Object.entries(compiler[FILES_PROPERTY]).forEach(([k, v]) => {
        if (v.children?.includes(src)) changes.push(k);
        if (v.deps?.includes(src)) changes.push(k);
      });
    }

    (changes.length ? changes : [src]).forEach(file => {
      if (!file.includes('.html')) return;
      if (!sources.includes(file)) {
        clearTimeout(t);
        t = setTimeout(sync, 60);

        if (type === 'unlink' || !fs.existsSync(file)) {
          Template.cache.delete(file);
          cache.delete(file);
        } else {
          const mtime = fs.statSync(file).mtime;
          cache.set(file, mtime);
          sources.push(file);
        }
      }
    });

    if (/\+(?:error|layout|server)/.test(src)) {
      clearTimeout(t);
      t = setTimeout(sync, 60);
    }
  });

  return {
    rebuild: async req => {
      if (reloading) return;
      if (req.url.split('/').pop().includes('.')) return;
      if (req.method === 'GET') {
        try {
          const url = req.url[0] === '/' ? req.url : new URL(req.url).pathname;
          const found = compiler.matches(url);

          if (found.route) {
            if (found.route.middleware && !compiler.has(found.route.middleware)) sources.push(found.route.middleware);
            if (found.route.layout && !compiler.has(found.route.layout)) sources.push(found.route.layout);
            if (found.route.error && !compiler.has(found.route.error)) sources.push(found.route.error);
            if (found.route.src) sources.push(found.route.src);
            reloading = true;
            await sync(true, found.routes);
          }
        } catch (e) {
          console.error('E_REBUILD', e);
          reloading = false;
        }
      }
    },
    close: () => watcher.close(),
    before: cb => before.push(cb),
    observe: (src, cb) => watcher.on(src, cb),
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
    : { files: {}, routes: [] };

  const cache = new Map();

  function has(file) {
    if (!file) return;
    const key = Handler.rebase(file);
    return typeof this[FILES_PROPERTY][key] !== 'undefined';
  }

  function save(routes, dependencies) {
    config.routes = routes || config.routes;
    Template.write(index, JSON.stringify({
      files: Object.entries(this[FILES_PROPERTY]).reduce((memo, [k, v]) => {
        if (dependencies?.[v.filepath]) v.deps = [...new Set(dependencies[v.filepath].children.concat(v.deps || []))];
        memo[k] = { ...v, module: undefined, source: undefined };
        return memo;
      }, dependencies || {}),
      routes: this[ROUTES_PROPERTY].map(route => ({
        ...route,
        re: undefined,
        lvl: undefined,
        root: undefined,
      })),
    }, null, options.env === 'production' ? 0 : 2));
  }

  function handlers() {
    const api = Template.glob(`${options.src}/**/+server.mjs`);
    const pages = Template.glob(`${options.src}/**/*.html`);

    const sources = pages.concat(api).map(x => x.replace(cwd, '.'));
    const routes = Handler.controllers(options.src, sources.filter(x => /\+(?:page|error|layout|server)/.test(x)));

    return { sources, routes };
  }

  let generators = options.generators;
  async function hooks(watcher) {
    const unoConfig = Template.path(`${cwd}/unocss.config`);

    if (options.unocss !== false && unoConfig) {
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
  }

  async function reload() {
    this[ROUTES_PROPERTY].forEach(route => {
      if (!route.url) Handler.rematch(route);
    });

    for (const [k, v] of Object.entries(this[FILES_PROPERTY])) {
      if (!v.filepath || !fs.existsSync(k)) continue;

      let mod = await Template.reload(path.resolve(v.filepath), true);
      if (!k.includes('+server')) {
        this[FILES_PROPERTY][v.filepath] = {
          ...this[FILES_PROPERTY][v.filepath],
          module: mod.default || mod,
          source: Template.read(k),
        };
      } else {
        this[FILES_PROPERTY][v.filepath] = {
          ...this[FILES_PROPERTY][v.filepath],
          module: mod,
        };
      }

      Template.cache.set(v.filepath, this[FILES_PROPERTY][v.filepath]);
    }
  }

  function matches(url) {
    const { routes } = handlers();

    for (const route of routes) {
      if (route.verb === 'GET' && route.re.test(url)) {
        const _ = route.src || route.middleware;
        const key = `${_}@mtime`;
        const mtime = fs.statSync(_).mtime;
        const cached = cache.get(key);

        if (!cached || cached < mtime) {
          cache.set(key, mtime);
          return { route, routes };
        }
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

      if (!key.includes('.html')) {
        this[FILES_PROPERTY][key] = { filepath: key, children: [] };
        continue;
      }

      if (!imported.includes(key)) {
        printLog(Util.$.bold(key));

        const shared = { ...options, generators };
        const mod = compile(Template.read(src), src, shared);
        const result = await Template.compile(compile, mod, shared, imported);

        result.forEach(chunk => {
          if (!chunk.dest) {
            const destFile = Template.join(options.dest, chunk.src);
            const relative = Template.relative(destFile, chunk.src);

            results.push([{ content: `export * from '${relative}';\n` }, Handler.rebase(destFile)]);
          } else {
            const destFile = Template.join(options.dest, chunk.dest).replace('.html', '.generated.mjs');

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

  return Object.defineProperties({
    has,
    save,
    hooks,
    reload,
    matches,
    compile,
    recompile,
    precompile,
  }, {
    [FILES_PROPERTY]: {
      get: () => config.files,
    },
    [ROUTES_PROPERTY]: {
      get: () => config.routes,
    },
    [VERSION_PROPERTY]: {
      get: () => config.version || 'HEAD',
    },
  });
};

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

      process.env.HEADLESS = true;

      await this.serve({ quiet: true });

      fs.mkdirSync(path.join(options.dest, 'public'));

      let count = 0;
      for (const route of compiler[ROUTES_PROPERTY].filter(_ => _.kind === 'page')) {
        const destFile = path.join(options.dest, 'public', route.path, 'index.html');

        // console.log(route.verb, route.path, destFile);

        const resp = await fetch(`http://${location.host}${route.path}`);
        const html = await resp.text();

        write(destFile, html);
        count++;
      }

      for (const bundle of Template.glob(path.join(options.dest, '/**/*.{css,bundled.mjs}'))) {
        const destFile = path.join(options.dest, 'public', options.prefix, path.relative(options.dest, bundle));

        copy(bundle, destFile);
        count++;
      }

      for (const [file, mod] of Object.entries(compiler[FILES_PROPERTY])) {
        if (!mod.module?.__functions || !mod.module.__functions.length) continue;

        const key = file.replace('.generated.', '.hooks.');
        const destFile = path.join(options.dest, 'public', options.prefix, path.relative(options.dest, key));
        const code = `/* ${key} */\n${Object.values(mod.module.__functions).map(_ => `export ${_.toString()}\n`).join('')}`;

        write(destFile, code);
        count++;
      }

      for (const file of fs.readdirSync(import.meta.dirname)) {
        if (['client.mjs', 'server.mjs', 'main.mjs'].includes(file)) continue;

        const srcFile = path.join(import.meta.dirname, file);
        const destFile = path.join(options.dest, 'public', file);

        fs.copyFileSync(srcFile, destFile);
        count++;
      }

      console.log(`${count} file${count === 1 ? '' : 's'} written (${Util.ms(start)})`);
    } catch (e) {
      console.log(e);
      process.exit(1);
    } finally {
      process.exit();
    }
  }

  function locate(src) {
    const key = Handler.rebase(src);
    const mod = compiler[FILES_PROPERTY][key];

    if (!mod) throw new Error(`Could not locate '${key}' file`);

    if (compiler[FILES_PROPERTY][mod.filepath]) {
      const result = compiler[FILES_PROPERTY][mod.filepath].module;

      if (!result) {
        throw new Error(`Could not locate '${key}' module (${mod.filepath})`);
      }
      return result;
    }
    return mod.module;
  }

  function request(params = {}) {
    return new Request(`http://${location.host}${params.url || '/'}`, {
      duplex: 'half',
      body: params.body,
      method: params.method || 'GET',
      headers: { ...location, ...params.headers },
    });
  }

  return Object.defineProperties({
    serve, build, locate, request, compiler, static: _static,
  }, {
    files: { get: () => compiler[FILES_PROPERTY] },
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
