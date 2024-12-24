const HTTP_NS = 'http-url';
const RE_MATCH_ALL = /.*/;
const RE_HTTPS_URL = /^https?:\/\//;
const RE_MODULE_NAME = /^@?[\w-]+?$/;
const ALLOWED_EXTENSIONS = ['js', 'mjs', 'css'];
const RESOLVED_CDN_PREFIX_URL = 'https://cdn.skypack.dev/%s';

export const createTransform = ({ Template, fetchSource }) => ({
  name: 'jamrock',
  setup(build) {
    build.onResolve({ filter: RE_HTTPS_URL }, args => ({ path: args.path, namespace: HTTP_NS }));

    build.onResolve({ filter: RE_MATCH_ALL }, async args => {
      if (args.namespace === HTTP_NS || args.path.charAt() === '/') return;
      if (RE_HTTPS_URL.test(args.path)) return { path: args.path, namespace: HTTP_NS };

      const name = args.path.split('/')[0];
      const ext = args.path.split('.').pop();

      if (name.charAt() === '.' && !ALLOWED_EXTENSIONS.includes(ext)) {
        const src = Template.relative(`${args.resolveDir}/`, args.path);

        return { path: src, external: true };
      }

      if (RE_MODULE_NAME.test(name) && build.initialOptions.platform === 'browser') {
        return { path: RESOLVED_CDN_PREFIX_URL.replace('%s', args.path), external: true };
      }
    });

    build.onResolve({ filter: RE_MATCH_ALL, namespace: HTTP_NS }, args => ({
      path: new URL(args.path, args.importer).toString(),
      namespace: HTTP_NS,
    }));

    build.onLoad({ filter: RE_MATCH_ALL, namespace: HTTP_NS }, args => fetchSource(args.path));
  },
});

function createHelpers({ fs, Readable, Template }) {
  const TEMP_DIR = process.env.TMPDIR || '/tmp';

  async function fetchFile(url, filepath) {
    const resp = await fetch(url);

    return new Promise((resolve, reject) => {
      if (resp.ok && resp.body) {
        const writer = fs.createWriteStream(filepath);
        Readable.fromWeb(resp.body).pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      }
    });
  }

  async function fetchSource(url) {
    const tmpFile = Template.join(`${TEMP_DIR}/`, `${url.replace(/\W/g, '_')}@out`);

    if (!fs.existsSync(tmpFile)) await fetchFile(url, tmpFile);

    return { contents: fs.readFileSync(tmpFile) };
  }

  return { fetchSource, Template };
}

export function createBundler({ Template, esbuild, ...deps }) {
  const helpers = createHelpers({ ...deps, Template });
  const transform = createTransform(helpers);

  async function bundle(tpl, ext = 'js', opts = {}) {
    const filepath = tpl.filepath || `${tpl.identifier}.${tpl.attributes?.lang || ext}`;

    if (ext === 'css' && tpl.attributes?.lang) {
      if (tpl.attributes.lang === 'less' && opts.use?.less) {
        const less = opts.use.less.default || opts.use.less;
        const out = await less.render(tpl.content, { filename: filepath });

        tpl.content = out.css;
        tpl.children = out.imports;
      } else {
        throw new Error(`Unsupported '${tpl.attributes.lang}' language`);
      }
    }

    if (ext === 'js' || ext === 'css') {
      const __filename = opts.params?.cwd
        ? Template.join(opts.params.cwd, filepath)
        : filepath;

      const __dirname = opts.params?.cwd
        ? Template.join(opts.params.cwd, Template.dirname(filepath))
        : Template.dirname(filepath);

      const { outputFiles, metafile } = await esbuild.build({
        platform: tpl.attributes?.type === 'module' ? 'browser' : 'node',
        minify: opts.params?.env === 'production',
        metafile: true,
        bundle: true,
        stdin: {
          resolveDir: __dirname,
          sourcefile: filepath.split('/').pop(),
          contents: tpl.content,
          loader: ext,
        },
        write: false,
        format: 'esm',
        plugins: [transform],
      });

      return {
        source: outputFiles[0].text,
        children: (metafile?.inputs[__filename]?.imports || [])
          .filter(_ => _.path.indexOf('http-url:') === -1)
          .map(_ => _.path).concat(tpl.children || []),
      };
    }

    return {
      source: tpl.content,
      children: tpl.children || [],
    };
  }

  return { bundle };
}
