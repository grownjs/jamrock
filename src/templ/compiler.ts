import { pascalCase, snakeCase, trace, dump, Is } from '../utils/server.ts';
import { scopify, rulify, cssify } from '../markup/html.ts';
import { rebase } from '../handler/utils.ts';

import * as Loader from './loader.ts';
import { join, dirname, cwd, relative, filename, url } from '../utils/path.ts';

// ---------------------------------------------------------------------------
// RE patterns
// ---------------------------------------------------------------------------

const RE_SAFE_NAME = /(?:^|\/)(.+?)(?:\/\+\w+)?\.\w+$/;
const RE_EXTERNALS = /\b(?:import[^;=]*\(?(?:"([^;]+)"|'([^;]+)')|(?:export|import)[^;=]+from\s*(?:"([^;]+)"|'([^;]+)'))/g;
const RE_COMMENTS = /\/\*[\S\s]*?\*\/|\/\/.*/g;

// ---------------------------------------------------------------------------
// imports — static import graph walker (was Template.imports)
// ---------------------------------------------------------------------------

export function imports(str: string, base: string, shared: any, filepath: string, imported: Map<string, any> = new Map()): any {
  const ret = shared || {};
  str
    .replace(RE_COMMENTS, '')
    .replace(RE_EXTERNALS, (_: string, $1: string, $2: string, $3: string, $4: string) => {
      const src = $4 || $3 || $2 || $1;
      const source = base ? join(base, src) : src;

      if (src[0] !== '.' || filepath === source) return _;

      const key = rebase(source, cwd())!;

      if (imported.has(key)) {
        const { set, found } = imported.get(key)!;
        ret[key] = { ...ret[key], children: [...new Set(Object.keys(set).concat(ret[key]?.children || []))] };
        Object.assign(ret, found);
        return _;
      }

      const set: any = {};
      const code = Loader.read(source);
      const found = imports(code, dirname(source), set, source, imported);

      ret[key] = { ...ret[key], children: [...new Set(Object.keys(set).concat(ret[key]?.children || []))] };
      imported.set(key, { set, found });
      Object.assign(ret, found);
      return _;
    });
  return ret;
}

// ---------------------------------------------------------------------------
// refetch — remote CSS fetcher + disk cache (was Template.refetch)
// ---------------------------------------------------------------------------

export async function refetch(urlStr: string, base: string, options: any): Promise<string> {
  const source = urlStr.replace(/^\/\//, 'http://');
  const target = join(options.dest || '/build', base);
  const _base = [options.target || '/', options.prefix || '@', base].filter(p => p && p !== '/').join('/');

  if (source[0] === '/') return '/* not found */';

  try {
    const cached = join(target, source.replace(/[^\w.]/g, '_'));

    if (!Loader.exists(cached)) {
      const text = await fetch(source).then(_ => _.text());
      Loader.write(cached, text);
    }

    const urls: any[] = [];
    let html = Loader.read(cached);
    html = html.replace(/url\((['"]?)(.+?)\1\)/g, (_: string, _q: string, v: string) => {
      const found = { url: v, fixed: v.replace(/[^\w.]/g, '_') };
      urls.push(found);
      return `url(${url(_base, found.fixed)})`;
    });

    await Promise.all(urls.map(found => fetch(found.url).then(async (result: globalThis.Response) => {
      const destFile = join(target, found.fixed);
      const blob = await result.blob();
      const buffer = await blob.arrayBuffer();
      Loader.write(destFile, (globalThis as any).Buffer?.from(buffer) ?? new Uint8Array(buffer));
    })));

    return html;
  } catch (e: any) {
    trace(e, 'E_FETCH');
    return `/* ${e.message} (${source}) */`;
  }
}

// ---------------------------------------------------------------------------
// from — Template factory (was Template.from)
// ---------------------------------------------------------------------------

export function from(compile: any, block: any, opts: any = {}): any {
  if (!block.src) {
    throw new Error(`Failed to parse '${block.filepath}'`, { cause: block.failure });
  }

  const name = block.src.match(RE_SAFE_NAME)![1]
    .replace(/\W+/g, '-')
    .replace(/-$/, '');

  Object.assign(block.opts, opts);

  const id = pascalCase(snakeCase(name));
  const cb = (src: string, code: string, _opts?: any) => {
    return from(compile, compile(code, src), { ...opts, ..._opts });
  };

  // Inline Template construction to avoid circular import — the Template class
  // re-exports from here, so we return a plain object with the same shape.
  // The actual Template instance is constructed in Template.from() which calls this.
  return { id, block, opts, cb };
}

// ---------------------------------------------------------------------------
// Compiler class — orchestrates the build-time pipeline for one Block
// ---------------------------------------------------------------------------

export class Compiler {
  generators: any;
  elements: any;
  attributes: any;
  component: string;
  partial: any;
  module: any;

  declare _build: any;
  declare failure: any;

  constructor(name: string, block: any, options: any, callback: any) {
    this.generators = options.generators;
    this.elements = options.elements;
    this.attributes = { ...options };
    delete this.attributes.generators;
    delete this.attributes.elements;

    this.component = name;
    this.partial = block;
    this.module = {};

    Object.defineProperty(this, '_build', { value: callback, enumerable: false });
  }

  build(src: string, code: string): any {
    return this._build(src, code);
  }

  async regenerate(imported: string[] = []): Promise<any> {
    return this.transform(Loader.transpile, null, {
      params: this.attributes,
      use: this.generators,
    }, imported);
  }

  async transform(cb: any, bundle: any, options: any, imported: string[] = []): Promise<any[]> {
    const defaults = this.partial.opts;
    const resources = this.partial.assets;
    const context = this.partial.context;
    const filepath = this.partial.src;
    const target = this.partial.dest;
    const scope = this.partial.id;
    const { markup } = this.partial;

    const set: any[] = [];
    const tasks: Promise<any>[] = [];
    const isStatic = context === 'static';
    const isClient = bundle || context === 'client';
    const children = this.partial.children.map((_: any) => _.src);

    if (!imported.includes(target)) imported.push(target);

    for (const c of this.partial.children) {
      if (Loader.exists(c.src)) {
        if (imported.includes(c.src)) continue;
        imported.push(c.src);
        tasks.push(this.build(c.src, c.code)
          .transform(cb, isClient, options, imported)
          .then((result: any[]) => set.push(...result)));
      } else {
        dump(`=> '${c.src}' not found in`, target);
      }
    }

    set.push(...this.partial.imports);

    if (Is.func(cb)) {
      tasks.push((async () => {
        const js = await cb(this.partial.scripts
          .filter((x: any) => x.root || x.attributes.scoped || x.attributes.global), 'js', options);

        set.unshift(...js.map((x: any, i: number) => {
          const destFile = `${target.replace(/\.(?:md|html)/, '')}(${i}).js`;
          children.push(...x.children);
          resources.js.push([x.parent, destFile, x.children]);
          return { content: x.content, dest: destFile };
        }));

        const css = await cb(this.partial.styles, 'css', options);

        set.unshift(...css.map((x: any, i: number) => {
          const destFile = `${target.replace(/\.(?:md|html)/, '')}(${i}).css`;

          if (defaults.src) {
            x.content = x.content.replace(/url\((.+?)\)/g, (_: string, $1: string) => {
              if ($1.charAt(0) === '/' || $1.indexOf('http') === 0) return _;
              resources.media.push(join(defaults.src, $1));
              return `url(${url(defaults.target || '/', $1, true)})`;
            });
          }

          let styles;
          if (!x.params.global) {
            styles = scopify(scope, x.params.scoped, x.content, markup.content, destFile);
          } else {
            styles = rulify(x.content, target);
          }

          children.push(...x.children);
          resources.css.push([destFile, x.children]);
          return { content: cssify(styles), dest: destFile };
        }));
      })());
    }

    await Promise.all(tasks);

    if (this.generators?.css) {
      const { css } = await this.generators.css.generate(this.partial.rules.join(' '));
      const destFile = target.replace(/\.(?:md|html)/, '.css');
      const styles = cssify(rulify(css, target));
      resources.css.push([destFile]);
      set.unshift({ content: styles, dest: destFile });
    }

    await this.partial.transform(this.elements, resources);

    const _children = [...new Set(children)];
    let result: any = this.partial.toString();

    if (isStatic) {
      set.unshift(result = { content: result, children: _children, src: filepath, dest: target, js: true });
    } else {
      set.unshift(result = { children: _children, content: result, client: isClient, src: filepath, dest: target, js: true });
    }
    return set;
  }

  async compileModule(mod: any, block: any, callback: any): Promise<this> {
    const value = await callback(mod.content, block.src);
    Object.defineProperty(this, 'module', { value });
    return this;
  }
}
