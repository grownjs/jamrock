import { taggify } from '../markup/html.ts';
import { pascalCase, snakeCase } from '../utils/server.ts';

import * as Loader from './loader.ts';
import * as Renderer from './renderer.ts';
import * as Compiler from './compiler.ts';
import { join, dirname, relative, filename, url, cwd, plain, response } from '../utils/path.ts';

export { Loader, Renderer, Compiler };
export { join, dirname, relative, filename, url, cwd, plain, response };

const RE_SAFE_NAME = /(?:^|\/)(.+?)(?:\/\+\w+)?\.\w+$/;

// ---------------------------------------------------------------------------
// Template — thin coordinator.
// All logic lives in Compiler (build-time) and Renderer (run-time).
// Static properties are forwarded to Loader so runtime adapters keep working
// with the same `Template.read = ...` assignment pattern.
// ---------------------------------------------------------------------------

export class Template {
  // -------------------------------------------------------------------------
  // IRuntime adapter stubs — set by each runtime adapter before use.
  // Declared as static fields; Template.installAdapter() wires them to Loader
  // so Renderer/Compiler (which import Loader directly) stay in sync.
  // -------------------------------------------------------------------------

  // IRuntime adapter properties — assignments are intercepted and forwarded
  // to Loader.runtime so Renderer/Compiler (which use Loader directly) stay
  // in sync. Defined via Object.defineProperty after the class body.
  declare static cache: any;
  declare static shared: string;
  declare static read: (filepath: string) => string;
  declare static write: (dest: string, code: any) => void;
  declare static exists: (filepath: string) => boolean;
  declare static glob: (pattern: string) => string[];
  declare static transpile: (tpl: any, ext?: string, opts?: any) => Promise<any>;

  // installAdapter() is kept for explicit batch-sync (e.g. after many assignments).
  static installAdapter(): void {
    Loader.runtime.cache = Template.cache;
    Loader.runtime.read = Template.read;
    Loader.runtime.write = Template.write;
    Loader.runtime.exists = Template.exists;
    Loader.runtime.glob = Template.glob;
    Loader.runtime.transpile = Template.transpile;
    Loader.runtime.shared = Template.shared;
  }

  // -------------------------------------------------------------------------
  // Pure path utilities — forwarded from src/utils/path.ts
  // -------------------------------------------------------------------------

  static join = join;
  static dirname = dirname;
  static relative = relative;
  static filename = filename;
  static url = url;
  static cwd = cwd;

  // -------------------------------------------------------------------------
  // Response utilities
  // -------------------------------------------------------------------------

  static plain = plain;
  static response = response;

  // -------------------------------------------------------------------------
  // Compiler pipeline methods
  // -------------------------------------------------------------------------

  static imports = Compiler.imports;
  static refetch = Compiler.refetch;

  static compile(cb: any, mod: any, opts: any, imported?: string[]): Promise<any> {
    mod = Template.from((_: any, file: string, _opts: any) => cb(_, file, { ..._opts, ...opts }), mod, opts);
    return mod.regenerate(imported);
  }

  static from(compile: any, block: any, opts: any = {}): Template {
    if (!block.src) {
      throw new Error(`Failed to parse '${block.filepath}'`, { cause: block.failure });
    }

    const name = block.src.match(RE_SAFE_NAME)![1]
      .replace(/\W+/g, '-')
      .replace(/-$/, '');

    Object.assign(block.opts, opts);

    const id = pascalCase(snakeCase(name));
    const cb = (src: string, code: string, _opts?: any) => {
      return Template.from(compile, compile(code, src), { ...opts, ..._opts });
    };

    return new Template(id, block, opts, cb) as any;
  }

  // -------------------------------------------------------------------------
  // Renderer pipeline methods
  // -------------------------------------------------------------------------

  static prepare = Renderer.prepare;
  static finalize = Renderer.finalize;
  static settle = Renderer.settle;
  static render = Renderer.render;
  static renderSync = Renderer.renderSync;
  static execute = Renderer.execute;
  static executeSync = Renderer.executeSync_;
  static reduce = Renderer.reduce;
  static reduceSync = Renderer.reduceSync;
  static preflight = Renderer.preflight;
  static client = Renderer.client;
  static hooks = Renderer.hooks;
  static media = Renderer.media;
  static tag = Renderer.tag;

  // -------------------------------------------------------------------------
  // Module loader methods
  // -------------------------------------------------------------------------

  static path = Loader.path;
  static load = Loader.load;
  static reload = Loader.reload;

  // -------------------------------------------------------------------------
  // top-level resolve entry points
  // -------------------------------------------------------------------------

  static async resolve(component: any, filepath: string, context: any, props: any, cb: any): Promise<any> {
    return Renderer.resolve(component, filepath, context, props, cb);
  }

  static resolveSync(component: any, filepath: string, context: any, props: any, cb: any): any {
    return Renderer.resolveSync(component, filepath, context, props, cb);
  }

  // -------------------------------------------------------------------------
  // Instance members — Compiler delegates
  // -------------------------------------------------------------------------

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
    // Delegate to Compiler instance — create one on the fly with same state
    const compiler = new Compiler.Compiler(this.component, this.partial, {
      ...this.attributes,
      generators: this.generators,
      elements: this.elements,
    }, this._build);
    return compiler.transform(cb, bundle, options, imported);
  }

  async compile(mod: any, block: any, callback: any): Promise<this> {
    const value = await callback(mod.content, block.src);
    Object.defineProperty(this, 'module', { value });
    return this;
  }

  async render(props: any = {}, ctx: any = {}, cb: any = null): Promise<any> {
    const result = await Renderer.render(this.module, null, props, ctx, cb);
    const output = Renderer.finalize(null, ctx, result, [], this.module.__src);

    const html = taggify(output.body);
    const css = output.styles[this.module.__src];
    const js = output.scripts[this.module.__src];
    const doc = output.doc;
    const meta = output.head;
    const attrs = output.attrs;
    const media = output.media;
    const actions = output.actions;

    return { actions, media, attrs, meta, html, doc, css, js };
  }
}

// ---------------------------------------------------------------------------
// Wire Template adapter properties as live proxies to Loader.runtime.
// Any `Template.read = x` assignment immediately updates Loader.runtime.read
// so Renderer and Compiler (which call Loader.read/exists/etc. directly)
// are always in sync without needing an explicit installAdapter() call.
// ---------------------------------------------------------------------------

function makeAdapterProp<T>(key: keyof typeof Loader.runtime, defaultVal: T) {
  let _val: T = defaultVal;
  Object.defineProperty(Template, key, {
    get: () => _val,
    set: (v: T) => { _val = v; (Loader.runtime as any)[key] = v; },
    enumerable: true,
    configurable: true,
  });
}

makeAdapterProp('cache', null);
makeAdapterProp('shared', 'jamrock');
makeAdapterProp('read', Loader.read);
makeAdapterProp('write', Loader.write);
makeAdapterProp('exists', Loader.exists);
makeAdapterProp('glob', Loader.glob);
makeAdapterProp('transpile', Loader.transpile);
