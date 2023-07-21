import { Template, Runtime, Handler, Markup, Render, Util } from 'jamrock/core';

import { createFSWatcher } from './helpers.mjs';
import { createConnection } from './connection.mjs';

const FILES_PROPERTY = Symbol('@@files');
const ROUTES_PROPERTY = Symbol('@@routes');
const VERSION_PROPERTY = Symbol('@@version');

export const createWatcher = ({ fs }, watcher, compiler) => {
  const clients = [];
  const before = [];

  let reloading;
  let sources = [];
  async function sync(quiet) {
    try {
      await Promise.all(before.map(fn => fn(sources)));
      await compiler.recompile(sources);
      await compiler.reload();
    } catch (e) {
      // FIXME: decorate errors...
      console.error('E_COMPILE', e);
    }

    reloading = true;
    sources = [];

    if (!quiet) {
      clients.forEach(ws => {
        ws.send('reload');
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
      console.log(`  ${Util.$.red('delete')} ${Util.$.gray(src)}`);
    }

    Object.entries(compiler[FILES_PROPERTY]).forEach(([k, v]) => {
      if (v.children && v.children.includes(src)) changes.push(k);
    });

    if (!changes.length) {
      changes.push(src);
    }

    changes.forEach(file => {
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
  });

  return {
    rebuild: async req => {
      if (reloading) return;
      if (req.url.split('/').pop().includes('.')) return;
      if (req.method === 'GET') {
        try {
          const url = req.url.charAt() === '/' ? req.url : new URL(req.url).pathname;
          const found = compiler.matches(url);

          await compiler.save(found.routes);

          if (found.route) {
            if (found.route.middleware && !compiler.has(found.route.middleware)) sources.push(found.route.middleware);
            if (found.route.layout && !compiler.has(found.route.layout)) sources.push(found.route.layout);
            if (found.route.error && !compiler.has(found.route.error)) sources.push(found.route.error);
            if (found.route.src) sources.push(found.route.src);
            reloading = true;
            await sync(true);
          }
        } catch (e) {
          console.log('E_REBUILD', e);
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
    return file && file in this[FILES_PROPERTY];
  }

  function save(routes) {
    config.routes = routes;
    Template.write(index, JSON.stringify({
      files: Object.entries(this[FILES_PROPERTY]).reduce((memo, [k, v]) => {
        if (v.filepath) memo[k] = v;
        return memo;
      }, {}),
      routes: this[ROUTES_PROPERTY].map(route => ({
        ...route,
        re: undefined,
        lvl: undefined,
        root: undefined,
      })),
    }));
  }

  function handlers() {
    const api = Template.glob(`${options.src}/**/+server.mjs`);
    const pages = Template.glob(`${options.src}/**/*.html`);

    const sources = pages.concat(api).map(x => x.replace(cwd, '.'));
    const routes = Handler.controllers(options.src, sources.filter(x => /\+(?:page|error|layout|server)/.test(x)));

    return { sources, routes };
  }

  let generators;
  async function hooks(watcher) {
    const unoConfig = Template.path('./unocss.config', `${cwd}/`);

    if (options.unocss !== false && unoConfig) {
      const unocss = await external.getUnoCSSModule();
      const _reload = async () => {
        console.log(`💅 ${unoConfig.replace(cwd, '.')}`);

        const _config = await Template.import(unoConfig, true);

        generators = { ...generators, css: unocss.createGenerator(_config.default || _config) };
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

      let mod = await Template.import(path.resolve(v.filepath), true);
      if (!k.includes('+server')) {
        mod = mod.default || mod;

        if (v.filepath.includes('.generated')) {
          mod.destination = v.filepath;
        }

        this[FILES_PROPERTY][v.filepath] = { ...this[FILES_PROPERTY][v.filepath], module: mod, source: Template.read(k) };
      } else {
        this[FILES_PROPERTY][v.filepath] = { ...this[FILES_PROPERTY][v.filepath], module: mod };
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
    const results = [];

    imported = imported.filter(x => !sources.includes(x));

    for (const file of sources) {
      const src = file.replace(cwd, '.');
      const key = src.replace('./', '');

      if (key.includes('.mjs')) {
        this[FILES_PROPERTY][key] = {
          filepath: file,
        };
        continue;
      }

      if (!imported.includes(key)) {
        try {
          console.log(Util.$.bold(key));

          const shared = { ...options, generators };
          const mod = compile(Template.read(src), src, shared);
          const result = await Template.compile(compile, mod, shared, imported);

          result.forEach(chunk => {
            if (!chunk.dest) {
              const source = chunk.src.replace('./', '');
              const destFile = Template.join(`${options.dest}/`, source);
              const relative = Template.join(destFile, chunk.src, true);

              results.push([{ content: `export * from '${relative}';\n` }, destFile]);
            } else {
              const destFile = Template.join(`${options.dest}/`, chunk.dest).replace('.html', '.generated.mjs');

              console.log(`  ${Util.$.green('write')} ${Util.$.gray(destFile)}`);

              results.push([chunk, destFile.replace('./', '')]);
            }
          });
        } catch (e) {
          e.source = src;
          throw e;
        }
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

    console.log(`${results.length > 0 ? results.length : 'No'} file${results.length === 1 ? '' : 's'} processed (${Util.ms(start)})`);
  }

  async function precompile() {
    const { sources, routes } = handlers();

    await this.recompile(sources);
    await this.save(routes);
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
    host: options.host || 'localhost:8000',
    port: options.port || '8000',
  };

  async function serve() {
    this.options = { ...options, location };

    if (options.watch) {
      const watcher = await createFSWatcher(options, external.getChokidarModule);

      this.watcher = createWatcher({ fs }, watcher, compiler);
    }

    await external.createServer(this, options);
    await compiler.hooks(this.watcher);
    await compiler.reload();
  }

  async function build(reload) {
    try {
      if (reload) {
        await compiler.reload();
      } else {
        await compiler.hooks();
        await compiler.precompile();
      }
    } catch (e) {
      console.error('E_BUILD', e);
      process.exit(1);
    }
  }

  function locate(src) {
    const key = src.replace('./', '');
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
    serve, build, locate, request, compiler,
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
      if (!Util.Is.func(mod)) {
        throw new ReferenceError(`Expecting AsyncFunction to resolve, given '${typeof mod}'`);
      }

      const request = new Request(`http://${location.host}${params.url || '/'}`, {
        duplex: 'half',
        body: params.body,
        method: params.method || 'GET',
        headers: { ...location, ...params.headers },
      });

      const conn = await createConnection(store, options, request, location, teardown);
      const result = await Template.execute(mod, { conn, route: params.route || {} }, props, Handler.middleware);

      // FIXME: how to deal with responses? as this method will invoke the component
      // we should be allowed to bypass some stuff if we want full-coverage...
      // also, we'll need a full-context instead of just conn/route info
      // const resp = await createResponse(env, conn, clients);
      return result;
    },
    lookup(name) {
      const key = Object.keys(env.files).find(x => x.includes(name));

      if (!key) {
        console.log('GOT', env.files);
        throw new Error(`Not found '${name}'`);
      }

      return env.locate(key);
    },
    async mount(mod, props) {
      const runtime = { ...Runtime, ...Render.createRender() };
      const target = document.createElement('root');

      if (mod.__context === 'client') {
        window.__client = true;
        return runtime.mountableComponent(mod, {
          loader: id => env.locate(Template.path(id, mod.__src, mod.__dest)),
        }).mount(target, props);
      }

      window.__client = false;
      const result = await Template.resolve(mod, mod.__src, {}, props, () => null);

      target.innerHTML = Markup.taggify(result.body);
      return target;
    },
  });
}
