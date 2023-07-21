export function createChokidarWatcher(path, chokidar) {
  const opts = { ignoreInitial: true };
  const watcher = chokidar.watch(path, opts);
  const watchers = [];

  function on(src, cb) {
    const subwatch = chokidar.watch(src, opts);
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

  return createChokidarWatcher(options.src, chokidar);
}
