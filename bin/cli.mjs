import { PKG_VERSION, Template, Util, process } from '../dist/main.mjs';
import { createLocalEnvironment } from '../lib/main.mjs';

const {
  printLog, printError, fileURLToPath,
  writeFileSync, existsSync, readdirSync, chmodSync, cpSync,
} = process.shared || {};

Util.onTrace((e, kind, label) => {
  printError('__ON__TRACE__');
  printError(label);
  printError(kind);
  printError(e);
  printError('__ON__TRACE__');
});

/* global Bun, Deno */

const __dirname = Template.dirname(fileURLToPath(import.meta.url));

// eslint-disable-next-line no-nested-ternary
const runtime = typeof Deno !== 'undefined'
  ? `deno ${Deno.version.deno}`
  : typeof Bun !== 'undefined'
    ? `bun ${Bun.version}`
    : `${typeof globalThis.imports !== 'undefined' ? 'gtk' : 'node'} ${process.version}`;

printLog(Util.$.bold(`■ Jamrock v${PKG_VERSION}`), Util.$.gray(`(${runtime}, ${process.env.GIT_REVISION || 'HEAD'})`));

const USAGE_INFO = `
Usage: ./bin/{node,deno,bun,gjs} <COMMAND> [OPTIONS]

  init   Generates a new application into the given directory
  serve  Starts the web-server on the given --port and --host
  build  Compiles *.{md,html} sources into server-components
  route  Prints the available routes found

Options:

  --src      Directory of *.{md,html} files to compile (default is ./pages)
  --dest     Destination for compiled files (default is ./build)

  --watch    Enable file-watching on the web-server
  --target   Value for <base href="..." /> (default is /)
  --prefix   Prefix for bundled resources (default is @)

  --port     The port number to bind the web-server
  --host     The host address to bind the web-server

  --uws      Use uWebSockets.js instead of native HTTP (node)
  --https    Enable HTTPS (requires SSL_KEY_FILE and SSL_KEY_FILE)

  --dts      Produce the .d.ts definitions from web-server routes
  --name     Filter routes by name (contains)
  --path     Filter routes by path (contains)
  --method   Filter routes by method (exact match)
`;

export default async function main(env, argv) {
  if (Util.has('version', argv)) return process.exit(1);

  argv = argv.filter(value => {
    if (value.includes('=')) {
      const [k, v] = value.split('=');

      process.env[k] = v;
      return false;
    }
    return true;
  });

  const src = Util.rtrim(Util.flag('src', argv, './pages'));
  const dest = Util.rtrim(Util.flag('dest', argv, './build'));

  let watch = Util.list('watch', argv, Util.has('watch', argv));

  const uws = Util.has('uws', argv);
  const port = +Util.flag('port', argv, 8080);
  const host = Util.flag('host', argv, 'localhost');
  const https = Util.has('https', argv);
  const _write = Util.has('write', argv);
  const _prefix = Util.flag('prefix', argv, '@');
  const base_url = Util.flag('target', argv, '/');

  if (Util.has('help', argv) || !argv[0]) {
    printLog(USAGE_INFO
      .replace(/(?<=\s\s)\w+(?=\s\s)|<\w+>/g, $0 => Util.$.bold($0))
      .replace(/^\w+:/mg, $0 => Util.$.yellow($0))
      .replace(/--\w+|\[\w+\]/g, $0 => Util.$.blue($0))
      .replace(/\(.+?\)/g, $0 => Util.$.gray($0)));
    return process.exit(1);
  }

  async function routeInfo() {
    const start = Date.now();

    const { createSandbox } = await createLocalEnvironment();
    const _ = await createSandbox({ src, dest });

    const typedefs = [];

    printLog(`Reading routes from ${dest}`);

    const types = Util.flag('dts', argv, Util.has('dts', argv));
    const names = _.routes.map(x => x.name.length).sort((a, b) => b - a)[0] + 2;
    const paths = _.routes.map(x => x.path.length).sort((a, b) => b - a)[0] + 2;
    const verbs = _.routes.map(x => x.verb.length).sort((a, b) => b - a)[0] + 2;

    const url = Util.flag('path', argv);
    const name = Util.flag('name', argv);
    const method = Util.flag('method', argv);

    let current;
    let found = 0;
    _.routes.forEach(route => {
      if (!types) {
        if ((url || name || method) && (!(
          route.verb === method
          || route.path.includes(url)
          || route.name.toLowerCase().includes(name?.toLowerCase())
        ))) return;

        found++;

        const key = route.src || route.middleware;

        if (current !== key) {
          printLog(`${current ? '\n' : ''}${Util.$.bold(key)}`);
          current = key;
        }

        const path = Util.pad(route.path, paths, -1)
          .replace(/:\w+/g, $0 => Util.$.yellow($0))
          .replace(/(?<=\s)\s+/, $0 => Util.$.gray($0.split(' ').join('.')));

        const named = Util.pad(route.name, names)
          .replace(/\s+(?=\s)/, $0 => $0.split(' ').join('.'));

        // eslint-disable-next-line no-nested-ternary
        const prefix = route.verb === 'DELETE' ? 'red' : route.verb === 'GET' ? 'green' : 'yellow';

        printLog(Util.$[prefix](Util.pad(route.verb, verbs)), path + Util.$.gray(named));
      } else {
        const suffix = `\n  /**\n  ${route.verb} ${route.path}\n  */`;

        const params = (route.path.includes(':') && `params: RouteParams<'${route.path}'> | PathParam[]`)
          || (route.path.includes('*') && `params?: RouteParams<'${route.path}'> | PathParam[]`)
          || '';

        const typedef = `NestedRoute<'${route.name}', RouteInfo & {${suffix}\n  url: (${params}) => string }>`;

        found++;
        typedefs.push(typedef);
      }
    });

    if (types) {
      const target = types === true ? 'routes.d.ts' : types;
      const script = `import type { RouteMap, RouteInfo, RouteParams, NestedRoute, PathParam } from '${Util.flag('from', argv, 'jamrock')}';\n
export type Routes = ${['RouteMap'].concat(typedefs).join('\n& ')};\n`;

      printLog(`  ${Util.$.green('write')} ${Util.$.gray(target)}`);

      writeFileSync(target, script);

      printLog(`${found > 0 ? found : 'No'} route${found === 1 ? '' : 's'} written (${Util.ms(start)})`);
    } else {
      printLog(`${found > 0 ? found : 'No'} route${found === 1 ? '' : 's'} found (${Util.ms(start)})`);
    }

    if (!found) process.exit(1);
  }

  try {
    if (argv[0] === 'dev') {
      argv[0] = 'serve';
      watch = watch || true;
    }

    const defaults = {};
    const cwd = process.cwd();
    const config = Template.path(`${cwd}/dev.config`);

    if (config && Template.exists(config)) {
      const mod = await import(`file://${config}`);

      Object.assign(defaults, mod.default, {
        __filename: config,
      });
    }

    const _options = { src, dest, host, port, https, prefix: _prefix, target: base_url };

    switch (argv[0]) {
      case 'serve':
        printLog(`Processing ${src} to ${dest}`);
        await env({ ...defaults, ..._options, uws, watch }).serve();
        break;

      case 'build':
        printLog(`Building ${src} to ${dest}`);
        const self = await env({ ...defaults, ..._options }).build(); // eslint-disable-line no-case-declarations
        if (_write) await self.static();
        break;

      case 'route':
        await routeInfo();
        break;

      case 'init':
        if (!argv[1]) throw new Error('Missing application name');
        if (!Util.has('force', argv)) {
          if (existsSync(argv[1])) throw new Error('Application already exists');
        }

        cpSync(`${__dirname}/sample`, argv[1], { recursive: true });

        chmodSync(`${argv[1]}/bin/node`, '755');
        chmodSync(`${argv[1]}/bin/deno`, '755');
        chmodSync(`${argv[1]}/bin/bun`, '755');

        writeFileSync(`${argv[1]}/package.json`, `${JSON.stringify({
          name: argv[1],
          type: 'module',
          version: '0.0.0',
          devDependencies: {
            esbuild: 'latest',
            less: 'latest',
          },
        }, null, 2)}\n`);

        // eslint-disable-next-line no-case-declarations
        const sources = readdirSync(`${__dirname}/sample`, { recursive: true })
          .filter(_ => !['bin', 'pages', 'pages/components'].includes(_));

        ['package.json'].concat(sources)
          .forEach(file => printLog(`  ${Util.$.green('write')} ${Util.$.gray(file)}`));
        break;

      default:
        throw new Error(`Unknown '${argv[0]}' action`);
    }
  } catch (e) {
    Util.trace(e, 'E_CLI', `${e.message}, add --help for usage info`);
    process.exit(1);
  }
}
