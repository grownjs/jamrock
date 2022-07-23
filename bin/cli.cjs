const fs = require('fs-extra');
const path = require('path');

module.exports = input => {
  const argv = require('wargs')(input, {
    default: {
      cwd: 'pages',
      dest: 'build',
      serve: 'public',
      upload: require('os').tmpdir(),
    },
    boolean: 'lrdwqVS',
    string: 'ucsyiDheap',
    alias: {
      V: 'verbose',
      S: 'silent',
      r: 'reload',
      u: 'upload',
      f: 'force',
      d: 'debug',
      i: 'index',
      c: 'chdir',
      w: 'watch',
      s: 'serve',
      q: 'quiet',
      y: 'only',
      D: 'dest',
      l: 'lint',
      h: 'host',
      p: 'port',
      e: 'env',
      a: 'app',
      U: 'uws',
    },
  });

  const Grown = require('grown')();
  const pkg = require('../package.json');
  const ctx = { Grown };

  process.name = `🔥 Jamrock v${pkg.version}`;

  process.env.U_WEBSOCKETS_SKIP = argv.flags.uws ? '' : true;
  process.env.PORT = argv.flags.port || process.env.PORT || 3000;
  process.env.DEV_PORT = process.env.DEV_PORT || parseInt(process.env.PORT, 10) + 1001;

  Grown.defn('listen', () => ctx.app.listen);

  Grown.use(require('@grown/cli'));
  Grown.use(require('modelorama/bin/main'));
  Grown.use(require('./shell.cjs'));

  ctx.main = () => {
    if (argv.flags.chdir) process.chdir(argv.flags.chdir);
    if (argv.flags.upload) fs.ensureDirSync(argv.flags.upload);

    // adjust defaults
    const [task, subtask] = argv._;

    argv.params.models = argv.params.models || 'shared/database';
    argv.flags.routes = argv.flags.routes || 'routes';

    if (!argv.flags.app && argv.flags.cwd) {
      argv.flags.app = argv.flags.cwd.replace(/[^/]+(?=\/)/g, '..').replace(/[^/]+$/, Grown.pkg.main);
    } else {
      argv.flags.app = argv.flags.app || Grown.pkg.main;
    }

    if (
      (task === 'build' && subtask === 'types')
      || task === 'migrate'
      || task === 'backup'
    ) {
      argv._.push(argv.params.models);
    }

    process.main = argv.flags.app;
    process.silent = !argv.flags.verbose;
    process.proxied = argv.flags.proxy !== false;

    Grown('CLI', {
      banner_text: false,
      command_name: 'jamrock',
      command_line: argv,
      task_folders: [
        path.join(__dirname, 'tasks'),
        path.resolve(require.resolve('modelorama'), '../bin/tasks'),
      ],
    });

    return Promise.resolve()
      .then(() => Grown.CLI.start(argv._[0]))
      .catch(ctx.onError);
  };

  let app;
  Object.defineProperty(ctx, 'app', {
    configurable: false,
    enumerable: true,
    get: () => {
      if (!app) app = require('./server').setInstance(Grown, argv);
      return app;
    },
  });

  return ctx;
};
