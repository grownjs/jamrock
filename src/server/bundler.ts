import { Template } from '../main.ts';

const TEMP_DIR = process.env.TMPDIR || '/tmp';

const HTTP_NS = 'http-url';
const RE_MATCH_ALL = /.*/;
const RE_HTTPS_URL = /^https?:\/\//;
const RE_MODULE_NAME = /^@?[\w-]+?$/;
const ALLOWED_EXTENSIONS = ['js', 'mjs', 'css'];
const RESOLVED_CDN_PREFIX_URL = 'https://cdn.skypack.dev/%s';

export const createTransform = ({ fetchSource }: any) => ({
  name: 'jamrock',
  setup(build: any) {
    build.onResolve({ filter: RE_HTTPS_URL }, (args: any) => ({ path: args.path, namespace: HTTP_NS }));

    build.onResolve({ filter: RE_MATCH_ALL }, async (args: any) => {
      if (args.namespace === HTTP_NS || args.path[0] === '/') return;
      if (RE_HTTPS_URL.test(args.path)) return { path: args.path, namespace: HTTP_NS };

      const name = args.path.split('/')[0];
      const ext = args.path.split('.').pop();

      if (ext && name[0] === '.' && !ALLOWED_EXTENSIONS.includes(ext)) {
        const src = Template.join(args.resolveDir.replace(process.cwd(), '.'), args.path);

        return { path: src, external: true };
      }

      if (RE_MODULE_NAME.test(name) && build.initialOptions.platform === 'browser') {
        return { path: RESOLVED_CDN_PREFIX_URL.replace('%s', args.path), external: true };
      }
    });

    build.onResolve({ filter: RE_MATCH_ALL, namespace: HTTP_NS }, (args: any) => ({
      path: new URL(args.path, args.importer).toString(),
      namespace: HTTP_NS,
    }));

    build.onLoad({ filter: RE_MATCH_ALL, namespace: HTTP_NS }, (args: any) => fetchSource(args.path));
  },
});

function createHelpers({ fs, Readable }: any) {
  async function fetchFile(url: string, filepath: string): Promise<void> {
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

  async function fetchSource(url: string): Promise<any> {
    const tmpFile = Template.join(TEMP_DIR, `${url.replace(/[^\w.]/g, '_')}@out`);

    if (!fs.existsSync(tmpFile)) await fetchFile(url, tmpFile);

    return { contents: fs.readFileSync(tmpFile) };
  }

  return { fetchSource };
}

export function createBundler({ esbuild, fs, Readable }: any): any {
  const helpers = createHelpers({ fs, Readable });
  const transform = createTransform(helpers);

  async function bundle(tpl: any, ext: string = 'js', ctx: any = {}): Promise<any> {
    const filepath = tpl.filepath || `${tpl.identifier}.${tpl.attributes?.lang || ext}`;

    if (ext === 'css' && tpl.attributes?.lang) {
      if (tpl.attributes.lang === 'less' && ctx.use?.less) {
        const less = ctx.use.less.default || ctx.use.less;
        const out = await less.render(tpl.content, { filename: filepath });

        tpl.root = tpl.ref;
        tpl.content = out.css;
        tpl.children = out.imports;
      } else {
        throw new Error(`Unsupported '${tpl.attributes.lang}' language`);
      }
    }

    if (ext === 'js' || ext === 'css') {
      const __filename = ctx.params?.cwd
        ? Template.join(ctx.params.cwd, filepath)
        : filepath;

      const __dirname = ctx.params?.cwd
        ? Template.join(ctx.params.cwd, Template.dirname(filepath))
        : Template.dirname(filepath);

      const { outputFiles, metafile } = await esbuild.build({
        platform: tpl.attributes?.type === 'module' ? 'browser' : 'node',
        minify: ctx.params?.env === 'production',
        bundle: ext === 'css' || !tpl.attributes?.global,
        metafile: ext === 'css' || !tpl.attributes?.global,
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
        root: tpl.ref,
        source: outputFiles[0].text,
        children: (metafile?.inputs[__filename]?.imports || [])
          .filter((_: any) => !/^(?:http-url:|https?:\/\/)/.test(_.path))
          .map((_: any) => Template.join(__dirname, _.path)).concat(tpl.children || []),
      };
    }

    return {
      root: tpl.ref,
      source: tpl.content,
      children: tpl.children || [],
    };
  }

  return { bundle };
}
