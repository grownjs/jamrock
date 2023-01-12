import * as process from 'node:process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { createLocalEnvironment } from '../lib/main.mjs';
import { colors as $, rtrim, flag, has, pad, ms } from '../dist/server.mjs';

const pkg = createRequire(import.meta.url)('../package.json');

/* global Bun, Deno */

// eslint-disable-next-line no-nested-ternary
const runtime = typeof Deno !== 'undefined'
  ? `deno ${Deno.version.deno}`
  : typeof Bun !== 'undefined'
    ? `bun ${Bun.version}`
    : `node ${process.version}`;

// eslint-disable-next-line no-import-assign
console.log(`🔥 Jamrock v${pkg.version}`, $.gray(`(${runtime}, ${process.env.NODE_ENV || '?'})`));

const USAGE_INFO = `
Usage: bin/{node,deno,bun} <COMMAND> [OPTIONS]

  serve  Starts the web-server on the given --port and --host
  build  Compiles *.html sources into page components
  route  Prints the available routes found

Options:

  --uws      Will use uWebSockets.js instead of native HTTP (nodejs only)
  --port     The port number to bind the web-server
  --host     The host address to bind the web-server
  --redis    Setup redis for sessions and pub/sub events

  --src      Directory of *.html files to compile
  --dest     Destination for compiled files

  --watch    Enable file-watching on the development web-server
  --unocss   Enable stylesheet pre-compilation with UnoCSS
  --fswatch  Use fswatch for file-watching (default: true)

  --dts      Produce the .d.ts definitions from web-server routes
  --name     Filter routes by name (contains)
  --path     Filter routes by path (contains)
  --method   Filter routes by method (exact match)
`;

export default async function main(env, argv) {
  const src = rtrim(flag('src', argv, './pages'));
  const dest = rtrim(flag('dest', argv, './build'));
  const watch = has('watch', argv);

  const uws = flag('uws', argv, false);
  const port = +flag('port', argv, 8080);
  const redis = flag('redis', argv, false);
  const unocss = flag('unocss', argv, false);
  const fswatch = flag('fswatch', argv, true);

  if (has('help', argv) || !argv[0]) {
    console.log(USAGE_INFO
      .replace(/(?<=\s\s)\w+(?=\s\s)|<\w+>/g, $0 => $.bold($0))
      .replace(/^\w+:/mg, $0 => $.yellow($0))
      .replace(/--\w+|\[\w+\]/g, $0 => $.blue($0))
      .replace(/\(.+?\)/g, $0 => $.gray($0)));
    process.exit(1);
  }

  async function routeInfo() {
    const start = Date.now();

    const { createSandbox } = await createLocalEnvironment();
    const _ = await createSandbox({ src, dest });

    const defs = [];
    const typedefs = [];

    console.log(`Reading routes from ${dest}`);

    const types = flag('dts', argv, has('dts', argv));
    const names = _.routes.map(x => x.name.length).sort((a, b) => b - a)[0] + 2;
    const paths = _.routes.map(x => x.path.length).sort((a, b) => b - a)[0] + 2;
    const verbs = _.routes.map(x => x.verb.length).sort((a, b) => b - a)[0] + 2;

    const url = flag('path', argv);
    const name = flag('name', argv);
    const method = flag('method', argv);

    let current;
    let found = 0;
    _.routes.forEach((route, i) => {
      if (!types) {
        if ((url || name || method) && (!(
          route.verb === method
          || route.path.includes(url)
          || route.name.includes(name)
        ))) return;

        found++;

        const key = route.src.replace('./', '');

        if (current !== key) {
          console.log(`${current ? '\n' : ''}${$.bold(key)}`);
          current = key;
        }

        const path = pad(route.path, paths, -1)
          .replace(/:\w+/g, $0 => $.yellow($0))
          .replace(/(?<=\s)\s+/, $0 => $.gray($0.split(' ').join('.')));

        const named = pad(route.name, names)
          .replace(/\s+(?=\s)/, $0 => $0.split(' ').join('.'));

        // eslint-disable-next-line no-nested-ternary
        const prefix = route.verb === 'DELETE' ? 'red' : route.verb === 'GET' ? 'green' : 'yellow';

        console.log($[prefix](pad(route.verb, verbs)), path + $.gray(named));
      } else {
        const suffix = `\n  /**\n  ${route.verb} ${route.path}\n  */`;

        const params = (route.path.includes(':') && `params: RouteParams<'${route.path}'> | PathParam[]`)
          || (route.path.includes('*') && `params?: RouteParams<'${route.path}'> | PathParam[]`)
          || '';

        const typedef = `type R${i} = NestedRoute<'${route.name}', RouteInfo & {${suffix}\n  url: (${params}) => string }>;\n`;

        found++;
        defs.push(`R${i}`);
        typedefs.push(typedef);
      }
    });

    if (types) {
      const target = types === true ? 'routes.d.ts' : types;
      const script = `import type { RouteMap, RouteInfo, RouteParams, NestedRoute, PathParam } from '${flag('from', argv, 'jamrock')}';\n
${typedefs.join('')}\nexport type Routes = ${['RouteMap'].concat(defs).join(' & ')};\n`;

      console.log(`  ${$.green('write')} ${$.gray(target)}`);

      writeFileSync(target, script);

      console.log(`${found > 0 ? found : 'No'} route${found === 1 ? '' : 's'} written (${ms(start)})`);
    } else {
      console.log(`${found > 0 ? found : 'No'} route${found === 1 ? '' : 's'} found (${ms(start)})`);
    }

    if (!found) process.exit(1);
  }

  try {
    switch (argv[0]) {
      case 'serve':
        console.log(`Processing ${src} to ${dest}`);
        await env({ src, dest, uws, port, watch, redis, fswatch }).serve();
        break;

      case 'build':
        console.log(`Building ${src} to ${dest}`);
        await env({ src, dest, unocss }).build();
        break;

      case 'route':
        await routeInfo();
        break;

      default:
        throw new Error(`Unknown '${argv[0]}' action`);
    }
  } catch (e) {
    console.error(`${e.message}, add --help for usage info`);
    process.exit(1);
  }
}
