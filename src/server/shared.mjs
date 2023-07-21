// import { Template, Compiler, Runtime, Handler, Markup, Util } from 'jamrock';
import { Template, Runtime, Handler, Markup, Util } from '../main.mjs';

import { createQueue } from './pubsub.mjs';
import { createFSWatcher } from './fswatch.mjs';
import { createConnection } from './connection.mjs';
import { RedisHub, RedisStore } from './redis.mjs';

const FILES_PROPERTY = Symbol('@@files');
const ROUTES_PROPERTY = Symbol('@@routes');
const VERSION_PROPERTY = Symbol('@@version');

export async function createRedisConnection(env, options, getRedisModule) {
  if (options.redis !== false) {
    const { createClient } = await getRedisModule();

    const opts = { ...options.redis };
    const redis = await createClient(opts);
    const subscriber = redis.duplicate();

    const onError = e => {
      if (!e.message.includes('Connection timeout')) {
        console.error('E_REDIS', e);
      }
    };

    redis.on('error', onError);
    subscriber.on('error', onError);

    const store = new RedisStore(redis, options);
    const pubsub = new RedisHub(redis, options, subscriber);

    await Promise.all([redis.connect(), subscriber.connect()]);

    Object.assign(options, { store, pubsub });
  }

  env.streaming = createQueue(options);
}

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

      const ssr = v.filepath.replace('.client.', '.server');

      if (v.filepath.includes('.client') && Template.exists(ssr)) {
        let mod = await Template.import(path.resolve(ssr), true);
        mod = mod.default || mod;
        mod.destination = v.filepath;

        this[FILES_PROPERTY][v.filepath] = { module: mod.default || mod, source: Template.read(k) };
        Template.cache.set(ssr, this[FILES_PROPERTY][v.filepath]);
        continue;
      }

      let mod = await Template.import(path.resolve(v.filepath), true);
      if (!k.includes('+server')) {
        mod = mod.default || mod;

        if (v.filepath.includes('.client') || v.filepath.includes('.server')) {
          mod.destination = v.filepath;
        }

        this[FILES_PROPERTY][v.filepath] = { module: mod, source: Template.read(k) };
        Template.cache.set(v.filepath, this[FILES_PROPERTY][v.filepath]);
      } else {
        Template.cache.set(v.filepath, this[FILES_PROPERTY][v.filepath] = { module: mod });
      }
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

          // FIXME: this is missing...
          // const code = Template.read(src);
          const result = {}; // await Compiler.get(src, code, { generators, auto: true }, imported);

          result.forEach(chunk => {
            const destFile = path.join(options.dest, path.relative(options.src, chunk.src))
              .replace('.html', chunk.bundle ? '.client.mjs' : '.server.mjs');

            console.log(`  ${Util.$.green('write')} ${Util.$.gray(path.relative('.', destFile))}`);

            results.push([chunk, destFile]);
          });
        } catch (e) {
          e.source = src;
          throw e;
        }
      }
    }

    results.forEach(([chunk, destFile]) => {
      chunk.content = chunk.content.replace(/unwrap`([^]*?)`\.end/g, '$1');

      Template.write(destFile, chunk.content);

      this[FILES_PROPERTY][chunk.src] = {
        filepath: destFile,
        children: chunk.children
          ? chunk.children.map(x => path.relative(cwd, x))
          : [],
      };
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

export const createTranspiler = ({ createMortero }) => async function transpile(tpl, ext, data, options) {
  if (Array.isArray(tpl)) {
    return Promise.all(tpl.map(x => transpile(x, ext, data, options)));
  }

  const params = { ...tpl.attributes, ...data };

  if (typeof tpl === 'object') {
    const mortero = await createMortero();
    const result = await new Promise((resolve, reject) => {
      const filepath = tpl.filepath || `${tpl.identifier}.${params.lang || ext}`;
      const partial = (mortero.default || mortero).parse(filepath, tpl.content, {
        ...options,

        write: false,
        watch: false,

        format: 'esm',
        bundle: params.bundle || params.scoped,
        online: !(params.bundle || params.scoped) || params.online,
        minify: process.env.NODE_ENV === 'production',
        modules: params.type === 'module',

        install: process.env.NODE_ENV === 'development',

        progress: false,
        platform: 'browser',
      });

      partial(params, (err, output) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(output);
      });
    });

    tpl = result;
  }

  return {
    params,
    content: tpl.source,
    children: tpl.children,
    resources: tpl.resources,
  };
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
      console.error(e);
      process.exit(1);
    }
  }

  function locate(src) {
    const key = src.replace('./', '');
    const mod = compiler[FILES_PROPERTY][key];

    if (!mod) throw new Error(`Could not locate '${key}' file`);

    if (compiler[FILES_PROPERTY][mod.filepath]) {
      return compiler[FILES_PROPERTY][mod.filepath].module;
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
      const result = await Template.execute(mod, mod.src, { conn, route: params.route || {} }, props, Handler.middleware);

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
    async mount(mod, opts) {
      const target = document.createElement('root');

      if (mod.render || mod.$$render) {
        return Runtime.mountableComponent(mod, {
          load: id => env.locate(Template.path(id, mod.src, mod.destinaton)),
        }).mount(target, opts || {});
      }

      target.innerHTML = Markup.taggify(mod.body);
      return target;
    },
  });
}
