'use strict';

/* istanbul ignore file */

const fs = require('fs-extra');
const path = require('path');

const USAGE_INFO = `

  Compiles any sources for production usage

  --lint    Optional. Runs ESLint over given sources
  --watch   Optional. Enables file watching of sources

`;

module.exports = {
  description: USAGE_INFO,
  callback(Grown, util) {
    if (!Grown.argv._[1]) throw new Error('Missing sources');

    if (Grown.argv.flags.lint) {
      return Grown.CLI._exec([require.resolve('eslint/bin/eslint'),
        ...Grown.argv._.slice(1),
        '--ext', 'html,js',
        '--ignore-pattern', 'generated',
        '--ignore-pattern', 'migrations',
        ...(Grown.argv.flags.fix ? ['--fix'] : []),
      ], () => {
        util.getLogger().printf('\r{% gray. No issues were found %}\n');
      });
    }

    const { Mortero } = require('../../dist/jamrock');
    const { toArray, toFlag } = require('../util');

    const cwd = Grown.argv.flags.cwd;
    const depth = cwd.split('/').length;

    const { JS_RUNTIME, LIVE_RELOAD } = require('jamrock');
    const injected = path.resolve(require.resolve('live-server'), '../injected.html');

    let loader = fs.readFileSync(injected).toString();
    if (!loader.includes('Jamrock')) {
      loader = loader.replace('<script', `${JS_RUNTIME('development') + LIVE_RELOAD}<script`);
      loader = loader.replace("if ('WebSocket' in window)", "if ('WebSocket' in window && !('Jamrock' in window))");
    }

    fs.outputFileSync(injected, loader);

    return Mortero.run([
      Grown.argv._.slice(1),
      Grown.argv.flags.watch ? '-w' : null,
      `-p${process.env.DEV_PORT}`,
      '--kramed.highlight=true',
      "-B '**/assets/scripts/*.js'",
      '-r**/!(index).html:{basedir}/{name}/index.html',
      depth > 1 ? `-r**:{filepath/${depth - 1}}` : null,
      `-D${Grown.argv.flags.dest}`,
      `-G${Grown.argv.flags.serve}`,
      `-G${Grown.argv.flags.upload}`,
      `-L${require.resolve('../plug')}`,
      '-X{lib,util,shared,helpers,partials,includes,components}',
      '-i', '**/{database,mailings}/**',
      '-I.gitignore', '-Gfront',
      toFlag('-y', toArray(Grown.argv.flags.only)),
      toFlag('-s', toArray(Grown.argv.flags.serve)),
      Grown.argv.flags.watch ? `/:${Grown.argv.flags.dest}/assets` : null,
      Grown.argv.flags.watch ? `-Phttp://localhost:${process.env.PORT}/` : null,
      Grown.argv.flags.watch && fs.existsSync('shared') ? ['-w', 'shared'] : null,
      Grown.argv.flags.quiet ? `-O${process.silent || Grown.argv.flags.silent ? 'q' : ''}` : null,
      Grown.argv.flags.force ? '-f' : null,
      Grown.argv.flags.debug ? '-d' : null,
      Grown.argv.flags.verbose ? '-V' : null,
    ].reduce((prev, cur) => prev.concat(cur || []), []).filter(Boolean)).then(() => {
      if (!Grown.argv.flags.watch) {
        process.exit();
      }
    });
  },
};
