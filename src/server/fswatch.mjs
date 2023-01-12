import { spawn, execSync } from 'node:child_process';

export function createFSWatchWatcher(path) {
  try {
    execSync('which fswatch');
  } catch (e) {
    console.error('fswatch is required, see https://github.com/emcrisostomo/fswatch');
    process.exit(1);
  }

  const watcher = spawn('fswatch', ['-nr', path]);
  const watchers = [];

  const cwd = process.cwd();

  let prev;
  function send(data, callback) {
    const [file, code] = data.split(' ');
    const src = file.replace(`${cwd}/`, '');

    if (['584', '520', '522', '536', '538'].includes(code)) callback('unlink', src);
    if (['576', '580'].includes(code)) callback('change', src);
    if (code === '514') callback('add', src);

    if (code === '528' || code === '530') {
      if (!prev) {
        prev = src;
      } else {
        callback('unlink', prev);
        callback('add', src);
        prev = null;
      }
    }
  }
  function push(data, callback) {
    const lines = data.toString().split('\n');

    lines.forEach(line => line && send(line, callback));
  }

  let callback;
  function on(src, cb) {
    const subwatch = spawn('fswatch', ['-nr', src]);
    subwatch.stdout.on('data', data => push(data, cb));
    watchers.push(subwatch);
  }
  function tap(cb) {
    callback = cb;
  }
  function emit(e, file) {
    callback(e, file);
  }
  function close() {
    watchers.forEach(x => x.kill());
    watcher.kill();
  }

  watcher.stdout.on('data', data => push(data, emit));

  return { on, tap, close };
}

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
  if (options.fswatch !== false) {
    return createFSWatchWatcher(options.src);
  }

  const chokidar = await getChokidarModule();

  return createChokidarWatcher(options.src, chokidar);
}
