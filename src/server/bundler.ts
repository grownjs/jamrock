import { resolveCssImports } from './walker.ts';

export function createBundler({ fs }: any): any {
  async function bundle(tpl: any, ext: string = 'js', ctx: any = {}): Promise<any> {
    if (ext === 'css') {
      if (tpl.attributes?.lang) {
        if (tpl.attributes.lang === 'less' && ctx.use?.less) {
          const filepath = tpl.filepath || `${tpl.identifier}.less`;
          const less = ctx.use.less.default || ctx.use.less;
          const out = await less.render(tpl.content, { filename: filepath });

          return {
            root: tpl.ref,
            source: out.css,
            children: out.imports,
          };
        }

        throw new Error(`Unsupported '${tpl.attributes.lang}' language`);
      }

      // Plain CSS — resolve @import statements inline.
      // HTTP/HTTPS and absolute imports are left as-is for the browser.
      if (tpl.filepath && tpl.content.includes('@import')) {
        const { source, children } = resolveCssImports(tpl.content, tpl.filepath);
        return { root: tpl.ref, source, children };
      }
    }

    // JS and plain CSS without @imports: pass content through as-is.
    // For client scripts, .bundled.mjs is produced separately by rewriteImports()
    // in shared.ts — no bundling step needed here.
    return {
      root: tpl.ref,
      source: tpl.content,
      children: tpl.children || [],
    };
  }

  return { bundle };
}
