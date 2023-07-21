import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { writeFileSync, existsSync, readdirSync, chmodSync, cpSync } from 'node:fs';

import { Util, process } from '../dist/main.mjs';
import { createLocalEnvironment } from '../lib/main.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

_require('util')._extend = Object.assign;

const pkg = _require('../package.json');

const version = process.env.GIT_REVISION || pkg.revision || 'HEAD';

/* global Bun, Deno */

// eslint-disable-next-line no-nested-ternary
const runtime = typeof Deno !== 'undefined'
  ? `deno ${Deno.version.deno}`
  : typeof Bun !== 'undefined'
    ? `bun ${Bun.version}`
    : `node ${process.version}`;

console.log(`■ Jamrock v${pkg.version}`, Util.$.gray(`(${runtime}, ${version})`));

const USAGE_INFO = `
Usage: ${!existsSync('package.json') ? 'jamrock' : './bin/{node,deno,bun}'} <COMMAND> [OPTIONS]

  serve  Starts the web-server on the given --port and --host
  build  Compiles *.html sources into page components
  route  Prints the available routes found${!existsSync('package.json') ? '\n  init   Generates a new application' : ''}

Options:

  --src      Directory of *.html files to compile (default is ./src)
  --dest     Destination for compiled files (default is ./dest)
  --watch    Enable file-watching on the web-server

  --port     The port number to bind the web-server
  --host     The host address to bind the web-server

  --uws      Use uWebSockets.js instead of native HTTP (node)
  --redis    Enable redis for sessions and pub/sub events
  --unocss   Enable stylesheet pre-compilation with UnoCSS

  --dts      Produce the .d.ts definitions from web-server routes
  --name     Filter routes by name (contains)
  --path     Filter routes by path (contains)
  --method   Filter routes by method (exact match)
`;

export default async function main(env, argv) {
  if (Util.has('version', argv)) process.exit(1);

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

  let watch = Util.has('watch', argv);

  const uws = Util.flag('uws', argv, false);
  const port = +Util.flag('port', argv, 8080);
  const redis = Util.flag('redis', argv, false);
  const unocss = Util.flag('unocss', argv, false);

  if (Util.has('help', argv) || !argv[0]) {
    console.log(USAGE_INFO
      .replace(/(?<=\s\s)\w+(?=\s\s)|<\w+>/g, $0 => Util.$.bold($0))
      .replace(/^\w+:/mg, $0 => Util.$.yellow($0))
      .replace(/--\w+|\[\w+\]/g, $0 => Util.$.blue($0))
      .replace(/\(.+?\)/g, $0 => Util.$.gray($0)));
    process.exit(1);
  }

  async function routeInfo() {
    const start = Date.now();

    // FIXME: routes should be taken from .html sources on dev,
    // but on prod it should read from the index... this way we can
    // generate the types without having to compile everything as usual!!
    const { createSandbox } = await createLocalEnvironment();
    const _ = await createSandbox({ src, dest });

    const typedefs = [];

    console.log(`Reading routes from ${dest}`);

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
          || route.name.includes(name)
        ))) return;

        found++;

        const key = (route.src || route.middleware).replace('./', '');

        if (current !== key) {
          console.log(`${current ? '\n' : ''}${Util.$.bold(key)}`);
          current = key;
        }

        const path = Util.pad(route.path, paths, -1)
          .replace(/:\w+/g, $0 => Util.$.yellow($0))
          .replace(/(?<=\s)\s+/, $0 => Util.$.gray($0.split(' ').join('.')));

        const named = Util.pad(route.name, names)
          .replace(/\s+(?=\s)/, $0 => $0.split(' ').join('.'));

        // eslint-disable-next-line no-nested-ternary
        const prefix = route.verb === 'DELETE' ? 'red' : route.verb === 'GET' ? 'green' : 'yellow';

        console.log(Util.$[prefix](Util.pad(route.verb, verbs)), path + Util.$.gray(named));
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

      console.log(`  ${Util.$.green('write')} ${Util.$.gray(target)}`);

      writeFileSync(target, script);

      console.log(`${found > 0 ? found : 'No'} route${found === 1 ? '' : 's'} written (${Util.ms(start)})`);
    } else {
      console.log(`${found > 0 ? found : 'No'} route${found === 1 ? '' : 's'} found (${Util.ms(start)})`);
    }

    if (!found) process.exit(1);
  }

  try {
    if (argv[0] === 'dev') {
      argv[0] = 'serve';
      watch = true;
    }

    switch (argv[0]) {
      case 'serve':
        console.log(`Processing ${src} to ${dest}`);
        await env({ src, dest, uws, port, watch, redis }).serve();
        break;

      case 'build':
        console.log(`Building ${src} to ${dest}`);
        await env({ src, dest, unocss }).build();
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
          version: '0.0.0',
        }, null, 2)}\n`);

        // eslint-disable-next-line no-case-declarations
        const sources = readdirSync(`${__dirname}/sample`, { recursive: true })
          .filter(_ => !['bin', 'pages', 'pages/components'].includes(_));

        ['package.json'].concat(sources)
          .forEach(file => console.log(`  ${Util.$.green('write')} ${Util.$.gray(file)}`));
        break;

      default:
        throw new Error(`Unknown '${argv[0]}' action`);
    }
  } catch (e) {
    console.error(`${e.message}, add --help for usage info`);
    process.exit(1);
  }
}
