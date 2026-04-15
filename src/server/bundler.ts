export function createBundler({ fs }: any): any {
  async function bundle(tpl: any, ext: string = 'js', ctx: any = {}): Promise<any> {
    if (ext === 'css' && tpl.attributes?.lang) {
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

    // JS and plain CSS: pass content through as-is.
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
