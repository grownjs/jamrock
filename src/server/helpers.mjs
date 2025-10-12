import { Is } from '../utils/client.mjs';
import { createCache } from './store.mjs';
import { createBundler } from './bundler.mjs';
import { RedisHub, RedisStore } from './redis.mjs';

export function createChokidarWatcher(opts, chokidar) {
  const params = { ignoreInitial: true };
  const watcher = chokidar.watch(opts.src, params);
  const watchers = [];

  if (Is.arr(opts.watch)) watcher.add(opts.watch);

  function on(src, cb) {
    const subwatch = chokidar.watch(src, params);
    subwatch.on('all', (e, file) => {
      if (e !== 'addDir') cb(e, file);
    });
    watchers.push(subwatch);
  }
  function tap(cb) {
    watcher.on('all', (e, file) => {
      if (e !== 'addDir') cb(e, file);
    });
  }
  function close() {
    watchers.forEach(x => x.close());
    watcher.close();
  }

  return { on, tap, close };
}

export async function createFSWatcher(options, getChokidarModule) {
  const chokidar = await getChokidarModule();

  return createChokidarWatcher(options, chokidar);
}

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

  env.cache = createCache(options);
}

export const createTranspiler = ({ getESbuildModule, ...deps }) => {
  let esbuild;
  let bundler;
  return async function transpile(tpl, ext, opts) {
    if (Is.arr(tpl)) {
      return Promise.all(tpl.map(x => transpile(x, ext, opts)));
    }

    esbuild = esbuild || await getESbuildModule();
    bundler = bundler || createBundler({ ...deps, esbuild });

    const params = { ...tpl.attributes };

    tpl = await bundler.bundle(tpl, ext, opts);

    return {
      params,
      parent: tpl.root,
      content: tpl.source,
      children: tpl.children,
    };
  };
};
