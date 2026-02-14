import { Util } from '../main.ts';

import { createCache } from './store.ts';
import { createBundler } from './bundler.ts';
import { RedisHub, RedisStore } from './redis.ts';

export function createChokidarWatcher(opts: any, chokidar: any): any {
  const params = { ignoreInitial: true };
  const watcher = chokidar.watch(opts.src, params);
  const watchers: any[] = [];

  if (Util.Is.arr(opts.watch)) watcher.add(opts.watch);

  function on(src: string, cb: any) {
    const subwatch = chokidar.watch(src, params);
    subwatch.on('all', (e: string, file: string) => {
      if (e !== 'addDir') cb(e, file);
    });
    watchers.push(subwatch);
  }
  function tap(cb: any) {
    watcher.on('all', (e: string, file: string) => {
      if (e !== 'addDir') cb(e, file);
    });
  }
  function close() {
    watchers.forEach(x => x.close());
    watcher.close();
  }

  return { on, tap, close };
}

export async function createFSWatcher(options: any, getChokidarModule: any): Promise<any> {
  const chokidar = await getChokidarModule();

  return createChokidarWatcher(options, chokidar);
}

export async function createRedisConnection(env: any, options: any, getRedisModule: any): Promise<void> {
  if (options.redis) {
    const { createClient } = await getRedisModule();

    const opts = options.redis === true ? {} : { ...options.redis };
    const redis = await createClient(opts);
    const subscriber = redis.duplicate();

    const onError = (e: any) => {
      if (!e.message.includes('Connection timeout')) {
        Util.dump('E_REDIS', e);
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

export const createTranspiler = ({ fs, Readable, getESbuildModule }: any) => {
  let esbuild: any;
  let bundler: any;
  return async function transpile(tpl: any, ext?: string, opts?: any): Promise<any> {
    if (Util.Is.arr(tpl)) {
      return Promise.all(tpl.map((x: any) => transpile(x, ext, opts)));
    }

    esbuild = esbuild || await getESbuildModule();
    bundler = bundler || createBundler({ Readable, esbuild, fs });

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
