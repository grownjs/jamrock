const path = require('path');
const fs = require('fs-extra');

const { toArray } = require('./util');

function getServer(Grown, argv) {
  const HAS_ROUTES = fs.existsSync('routes');
  const HAS_DATABASE = fs.existsSync('shared/database');
  const SHARED_CONFIG = fs.existsSync('shared/config.js') || fs.existsSync('shared/config/index.js')
    ? require(path.resolve('shared/config'))
    : {};

  const server = new Grown({
    ...SHARED_CONFIG,
    body: !!process.env.U_WEBSOCKETS_SKIP,
    cors: SHARED_CONFIG.cors || Grown.env !== 'production',
    html: {
      cwd: argv.flags.cwd,
      dest: argv.flags.dest,
      chdir: argv.flags.chdir,
      debug: argv.flags.debug,
      reload: argv.flags.reload,
      inline: argv.flags.inline,
      jamrock: path.resolve(__dirname, '../dist/shared'),
      runtime: path.resolve(__dirname, '../dist/runtime'),
    },
  });

  if (Grown.CLI._task === 'server') {
    Grown.use(require('@grown/conn'));
    Grown.use(require('@grown/cache'));
    Grown.use(require('@grown/static'));
    Grown.use(require('@grown/upload'));
    Grown.use(require('@grown/session'));

    if (argv.flags.debug) {
      server.plug([Grown.Logger]);
    }

    if (argv.flags.verbose) {
      server.plug(require('logro').getExpressLogger());
    }

    if (HAS_DATABASE) {
      Grown.use(require('@grown/model'));
      Grown.use(require(path.resolve('shared/database')));

      require('modelorama').plug(Grown, server, SHARED_CONFIG);

      if (SHARED_CONFIG.grpc) Grown.use(require('@grown/grpc'));
      if (SHARED_CONFIG.graphql) Grown.use(require('@grown/graphql'));
    }

    server.plug([
      argv.flags.upload && Grown.Upload({
        save_directory: argv.flags.upload,
      }),
      Grown.Static({
        from_folders: [
          path.join(argv.flags.dest, 'assets'),
          ...(!argv.flags.watch ? toArray(argv.flags.serve) : []),
        ],
      }),
      argv.flags.scaffold && HAS_DATABASE && require('modelorama').db(Grown),
      argv.flags.auth !== false && HAS_DATABASE && Grown.Session.Auth.use('/auth', {
        facebook: {
          redirect: server.config('auth_redirect_url', '/login'),
          enabled: server.config('facebook', false) !== false,
          credentials: server.config('facebook', false) !== false && {
            clientID: server.config('facebook.clientID'),
            clientSecret: server.config('facebook.clientSecret'),
            callbackURL: server.config('facebook.callbackURL'),
            profileFields: server.config('facebook.profileFields'),
          },
        },
      }, (type, profile) => Grown.Models.get('Session').checkLogin(type, {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        picture: profile.photos[0] ? profile.photos[0].value : null,
      })),
      Grown.Conn,
      Grown.Session,
      Grown.Cache({
        enabled: Grown.env !== 'development' ? argv.flags.redis !== false : false,
      }),
    ]);
  }

  Grown.use(require('./jamrock.cjs'));
  server.plug(Grown.Jamrock);

  if (HAS_ROUTES) {
    Grown.use((_, util) => {
      util.readOnlyProperty(server, 'router', () => ({
        routes: server.routes,
      }));
    });

    Grown('Routes', {
      typedefs: [
        'export default interface Routes {\n',
        ...server.routes.map(x => {
          return `  ${x.as}: (${x.params.length ? `params: {${
            x.params.length ? ` ${x.params.map(_ => `${_}: string | number`).join(', ')} ` : ''
          }}` : ''}) => string;\n`;
        }),
        '}',
      ].join(''),
    });
  }

  server.on('start', () => {
    const _level = argv.flags.debug ? 'debug' : 'info';
    const level = argv.flags.quiet ? false : _level;

    Grown.Logger.setLevel(level);
  });

  return server;
}

let server;
module.exports.setInstance = (Grown, argv) => {
  server = getServer(Grown, argv);
  return server;
};
module.exports.getInstance = () => {
  return server;
};
