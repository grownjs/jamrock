import { Template, Util } from '../dist/gtk-main.mjs';
import { PKG_VERSION } from '../dist/version.mjs';

const {
  printLog, printError, fileURLToPath,
  existsSync,
} = process.shared || {};

Util.onTrace((e, kind, label) => {
  printError('__ON__TRACE__');
  printError(label);
  printError(kind);
  printError(e);
  printError('__ON__TRACE__');
});

const __dirname = Template.dirname(fileURLToPath(import.meta.url));

const runtime = `gtk ${process.version}`;

printLog(Util.$.bold(`■ Jamrock v${PKG_VERSION}`), Util.$.gray(`(${runtime}, ${process.env.GIT_REVISION || 'HEAD'})`));

const USAGE_INFO = `
Usage: ./bin/gjs <COMMAND> [OPTIONS]

  init   Generates a new application into the given directory
  serve  Starts the web-server on the given --port and --host
  build  Compiles *.{md,html} sources into server-components
  route  Prints the available routes found
  window Opens page routes as GTK windows (GTK4 only)
  explorer Opens Jamrock Explorer for testing components (GTK4 only)

 Options:

  --src      Directory of *.{md,html} files to compile (default is ./pages)
  --dest     Destination for compiled files (default is ./build)

  --watch    Enable file-watching on the web-server
  --window   Open pages as desktop windows (gjs only)
  --target   Value for <base href="..." /> (default is /)
  --prefix   Prefix for bundled resources (default is @)

  --force    Overwrite existing files during init
  --write    Write generated routes to stdout
  --log      Enable logging during build
  --debug    Enable debug mode

Examples:

  ./bin/gjs init ./pages
  ./bin/gjs build --src ./pages --dest ./build
  ./bin/gjs serve --src ./pages --port 3000
  ./bin/gjs route --src ./pages
`;

function exit(message) {
  printError(message);
  process.exit(1);
}

function getOpts(argv) {
  const opts = { _: [] };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        opts[key] = next;
        i += 2;
      } else {
        opts[key] = true;
        i += 1;
      }
    } else {
      opts._.push(arg);
      i += 1;
    }
  }
  return opts;
}

export default async function cli(createEnv, argv, capabilities) {
  const opts = getOpts(argv);
  const [cmd] = opts._;

  if (!cmd || opts.help) {
    printLog(USAGE_INFO);
    return;
  }

  const src = opts.src || './pages';
  const dest = opts.dest || './generated';

  if (cmd === 'init') {
    if (!capabilities.init) {
      exit('Init is not supported on this runtime');
    }

    const force = opts.force;

    printLog('Initializing...', src);

    if (existsSync(src) && !force) {
      exit(`Directory ${src} already exists, use --force to overwrite`);
    }

    printLog('Writing files...');

    const files = {
      'dev.config.mjs': 'export default { unocss: true, markdown: { emojify: true } };',
      '+layout.html': `<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Untitled</title>
    <link rel="stylesheet" href="/styles/main.css" />
  </head>
  <body>
    <main>
      {@render children?.()}
    </main>
  </body>
</html>`,
      '+page.html': `<h1>Hello World</h1>
<p>This is a new Jamrock application.</p>`,
      'styles/main.css': `body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 2rem;
}`,
    };

    for (const [file, content] of Object.entries(files)) {
      const filepath = Template.join(src, file);
      Template.write(filepath, content);
    }

    printLog('Done!');
    return;
  }

  if (cmd === 'build') {
    printLog('Building...', src, '→', dest);

    const env = await createEnv({ src, dest });
    await env.build();

    if (opts.log) {
      env.routes.forEach(route => {
        printLog('  ', route.name, '→', route.path);
      });
    }

    if (opts.write) {
      env.routes.forEach(route => {
        printLog('  ', route.name, '→', route.path);
      });
    }

    printLog('Done!');
    return;
  }

  if (cmd === 'route') {
    const env = await createEnv({ src, dest });

    env.routes.forEach(route => {
      printLog('  ', route.name, '→', route.path);
    });

    return;
  }

  if (cmd === 'serve') {
    if (!capabilities.serve) {
      exit('Serve is not supported on this runtime');
    }

    const env = await createEnv({ src, dest });

    printLog('Serving...', src);

    env.serve(opts);

    return;
  }

  if (cmd === 'window') {
    if (!capabilities.window) {
      exit('Window is not supported on this runtime');
    }

    const { createWindow } = await import('../lib/gtk4/window.js');
    const env = await createEnv({ src, dest });

    printLog('Opening window...');

    const win = createWindow(env, opts);
    win.present();

    return;
  }

  if (cmd === 'explorer') {
    if (!capabilities.explorer) {
      exit('Explorer is not supported on this runtime');
    }

    const { createExplorer } = await import('../lib/gtk4/explorer.js');
    const env = await createEnv({ src, dest });

    printLog('Opening explorer...');

    await createExplorer({ env, options: { src, dest } });

    return;
  }

  exit(`Unknown command: ${cmd}`);
}
