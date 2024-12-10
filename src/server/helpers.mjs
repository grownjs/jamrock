import { createQueue } from './pubsub.mjs';
import { RedisHub, RedisStore } from './redis.mjs';

export function createChokidarWatcher(opts, chokidar) {
  const params = { ignoreInitial: true };
  const watcher = chokidar.watch(opts.src, params);
  const watchers = [];

  if (Array.isArray(opts.watch)) watcher.add(opts.watch);

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

  env.queue = createQueue(options);
}

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
        minify: options?.env === 'production',
        modules: params.type === 'module',

        install: options?.env === 'development',

        progress: false,
        platform: 'browser',
      });
      // console.log({params, options});

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
