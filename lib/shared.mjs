export async function createEnvironment({ Template, Runtime, Handler, options, path }) {
  const cwd = options.cwd || process.cwd();
  const base = path.join(cwd, options.dest || 'generated');
  const files = JSON.parse(Template.read(path.join(base, 'index.json')));
  const handlers = await Handler.controllers(base, options.glob || '**/*.cjs');

  const self = { Jamrock: { Browser: { _: Runtime } } };

  for (const [k, v] of Object.entries(files)) {
    let code = Template.read(v.filepath);
    try {
      code = code.replace(/\nexport\s*\{\s*([^;]+)\s*\};/, (_, $1) => {
        return `\nreturn { ${$1.split(' as ').reverse().map(x => x.trim()).join(': ')} }`;
      });

      // eslint-disable-next-line no-new-func
      const fn = new Function('module,window', code);
      const mod = {};

      files[v.filepath] = { module: fn(mod, self) || mod.exports, source: Template.read(k) };
      Template.cache.set(k, files[v.filepath]);
    } catch (e) {
      console.log(Template.highlight(code, 'js'));
      throw e;
    }
  }

  return {
    cwd, base, files, handlers,
  };
}

export const createTranspiler = ({ Mortero, path }) => async function transpile(tpl, ext, data, options) {
  if (Array.isArray(tpl)) {
    return Promise.all(tpl.map(x => transpile(x, ext, data, options)));
  }

  const cwd = process.cwd();
  const params = { ...tpl.attributes, ...data };

  if (typeof tpl === 'object') {
    const result = await new Promise((resolve, reject) => {
      const filepath = tpl.filepath || `${tpl.identifier}.${params.lang || ext}`;
      const partial = Mortero.parse(filepath, tpl.content, {
        ...options,

        write: false,
        watch: false,

        format: 'esm',
        bundle: params.bundle || params.scoped,
        online: !(params.bundle || params.scoped) || params.online,
        minify: process.env.NODE_ENV === 'production',
        modules: params.type === 'module',

        svelte: {
          css: 'external',
          generate: params.server ? 'ssr' : 'dom',
          hydratable: !params.server,
        },

        install: process.env.NODE_ENV === 'development',

        progress: false,
        platform: 'browser',
      });

      partial(params, (err, output) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(output);
      });
    });

    tpl = result;
    tpl.children = tpl.children.map(x => {
      return x.indexOf(cwd) === 0 ? path.relative(cwd, x) : x;
    });
  }

  return {
    params,
    content: tpl.source,
    children: tpl.children,
    resources: tpl.resources,
  };
};

export const createCompiler = ({ Template, Compiler, path }) => async options => {
  options.cwd = options.cwd || process.cwd();

  const start = Date.now();
  const filter = options.glob || '**/*.html';
  const sources = Template.glob(`${options.src}/${filter}`);

  try {
    // FIXME: how can we ignore already compiled sources?
    const imported = [];
    const results = [];
    const out = {};

    // we cannot run all-at-once due dependencies... e.g.
    // bundling would need cached sources to be effective...
    // if for some reason we don't have such cache then a string is returned!
    // how can we alleviate that? because, Promise.all() is actually faster than this...
    //
    // a possible solution is to actually plug-in a html-handler for those files... so we can
    // compile the dependencies on demand...
    //
    // well not... is fine then?
    for (const file of sources) {
      const src = file.replace(options.cwd, '.');

      if (!imported.includes(src.replace('./', ''))) {
        const code = Template.read(src);

        // eslint-disable-next-line no-continue
        if (!code.includes('<script')) continue;

        try {
          const result = await Compiler.get(src, code, true, imported);

          results.push(...result);
        } catch (e) {
          e.source = src;
          throw e;
        }
      }
    }

    results.forEach(chunk => {
      const destFile = path.join(options.dest, path.relative(options.src, chunk.src))
        .replace('.svelte', chunk.client ? '.client.mjs' : '.mjs')
        .replace('.html', chunk.bundle ? '.bundle.mjs' : '.cjs');

      // FIXME: for SSR-usage, client-side modules are reliable... so, they must be wrapped?
      // or they should be evaluated instead as we do on tests?

      // when served,they should not have exports... but, when rendered, they should return something?
      if (chunk.bundle) {
        chunk.content = chunk.content.replace(/unwrap`([^]*?)`\.end/g, '$1');
      }

      Template.write(destFile, chunk.content);
      out[chunk.src] = { filepath: destFile, children: chunk.children };
      // console.log('write', path.relative(options.cwd, destFile));
    });

    Template.write(path.join(options.dest, 'index.json'), JSON.stringify(out));

    const diff = (Date.now() - start);
    const prefix = diff < 1000 ? diff : diff / 1000;
    const suffix = diff < 1000 ? 'ms' : 's';

    console.log(results.length, 'files processed in', prefix, suffix);
  } catch (e) {
    console.error(e.source);
    console.error(e);
    process.exit(1);
  }
};
