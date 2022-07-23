const path = require('path');
const fs = require('fs');

const SERVER_TASK = `

  Runs Jamrock's server

  --watch   Optional. It'll use nodemon to handle the server

`;

const BUILD_PAGES = `

  Generate pages statatically

  This action will produce HTML files from any generated routes,
  make sure you bundled the application sources prior building.

`;

const BUILD_MAIL = `

  Generate templates for mailings

  This produces the required HTML for mailing purposes,
  make sure you ran this task prior using the mailer.

`;

module.exports = (Grown, util) => {
  Grown.CLI.define('server:up', SERVER_TASK, async () => {
    const argv = Grown.CLI.command_line;

    if (argv.flags.watch) {
      const server = [path.resolve(__dirname, './cli'),
        's', 'up',
        '--dest', argv.flags.dest,
        argv.flags.uws ? '--uws' : null,
        argv.flags.quiet ? '--quiet' : null,
        argv.flags.debug ? '--debug' : null,
        argv.flags.verbose ? '--verbose' : null,
        argv.flags.auth === false ? '--no-auth' : null,
        argv.flags.redis === false ? '--no-redis' : null,
        argv.flags.inline === false ? '--no-inline' : null,
        ...(argv.flags.app ? ['--app', argv.flags.app] : null),
        ...(argv.flags.cwd ? ['--cwd', argv.flags.cwd] : null),
        '--proxy',
        '--reload',
        '--scaffold',
      ];

      return Grown.CLI._exec([
        require.resolve('nodemon/bin/nodemon'),
        '--ignore', argv.flags.dest,
        '--ignore', 'cache.json',
        '--watch', 'shared',
        '--quiet',
        '--exec', server.filter(Boolean).join(' ')]);
    }

    return Grown.listen(process.env.PORT, () => {
      if (!argv.flags.silent) {
        Grown.Logger.getLogger()
          .printf('\r{%ok ready%} {%bold. at http://localhost:%s%} {%gray. [press CTRL-C to quit]%}\n', process.env.PORT);
      }
    });
  });

  Grown.CLI.define('build:pages', BUILD_PAGES, async () => {
    const index = Grown.argv.flags.index ? require(path.resolve(Grown.argv.flags.index)) : {};
    const config = typeof index === 'function' ? await index(Grown) : index;
    const server = new Grown({ html: { write: false } });

    process.headless = true;

    Grown.use(require('@grown/test'));
    Grown.use(require('@grown/conn'));
    Grown.use(require('@grown/model'));
    Grown.use(require('@grown/cache'));
    Grown.use(require('@grown/session'));
    Grown.use(require('../dist/jamrock'));

    if (fs.existsSync('shared/database')) {
      await Grown.use(require(path.resolve('shared/database'))).connect();
    }
    server.plug([Grown.Test, Grown.Conn, Grown.Cache, Grown.Session, Grown.Jamrock]);

    config.pages = config.pages || [];
    config.pages.push(...server.routes.filter(x => x.kind === 'page').map(x => x.path));

    if (!config.pages.length) {
      util.getLogger().printf('\r{% gray. No pages were found %}\n');
    }

    await config.pages.reduce((prev, route) => prev.then(() => server.request(route, (err, conn) => {
      Grown.CLI._.write(path.join(Grown.argv.flags.dest, route.replace(/\/?$/, '/index.html')), conn.resp_body);
    })), Promise.resolve());
  });

  Grown.CLI.define('build:mail', BUILD_MAIL, async () => {
    await Grown.CLI._exec([require.resolve('mailor/bin/cli'),
      Grown.argv.flags.watch ? 'watch' : 'build',
      'shared/mailings/templates',
      '-Bd', 'shared/mailings/generated',
      '-p', parseInt(process.env.PORT, 10) - 1919,
      '--no-open',
      Grown.argv.flags.verbose ? '--no-format' : null,
    ].filter(Boolean), { PUBLIC_URL: process.env.PUBLIC_URL || `http://localhost:${process.env.DEV_PORT}` });
  });
};
