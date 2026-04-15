// ---------------------------------------------------------------------------
// Runtime adapter config — a single mutable object shared by reference.
// Runtime adapters (nodejs, bun, deno, gtk4, …) write into this object.
// Renderer, Compiler, and walker read from it via the exported accessors.
// ---------------------------------------------------------------------------

export interface IRuntime {
  cache: Map<string, any> | null;
  shared: string;
  read(filepath: string): string;
  write(dest: string, code: any): void;
  exists(filepath: string): boolean;
  glob(pattern: string): string[];
  transpile(tpl: any, ext?: string, opts?: any): Promise<any>;
}

export const runtime: IRuntime = {
  cache: null,
  shared: 'jamrock',
  read: (fp) => fp,
  write: () => { /* no-op */ },
  exists: (fp) => !!fp,
  glob: (fp) => [fp],
  transpile: (tpl: any) => {
    if (Array.isArray(tpl)) return Promise.all(tpl.map((x: any) => runtime.transpile(x)));
    return Promise.resolve({ params: { ...tpl.attributes }, content: tpl.content, children: [] });
  },
};

// Convenience accessors so call sites can write `Loader.read(x)` instead of `Loader.runtime.read(x)`
export const read = (fp: string) => runtime.read(fp);
export const write = (dest: string, code: any) => runtime.write(dest, code);
export const exists = (fp: string) => runtime.exists(fp);
export const glob = (pattern: string) => runtime.glob(pattern);
export const transpile = (tpl: any, ext?: string, opts?: any) => runtime.transpile(tpl, ext, opts);
export const getCache = () => runtime.cache;
export const getShared = () => runtime.shared;

export function cwd(): string {
  return typeof process === 'object' && typeof process.cwd === 'function' ? process.cwd() : '.';
}

// ---------------------------------------------------------------------------

const RE_SAFE_IMPORTS = /^(?:npm|node|file|https?):/;

export function path(mod: string): string | undefined {
  const paths: string[] = [];

  if (mod.indexOf('node:') === 0) return mod;
  if (!mod.includes(':') && mod[0] === '/') paths.push(mod);
  else if (exists(`node_modules/${mod.split(':')[0]}/package.json`)) return mod;

  for (let i = 0; i < paths.length; i += 1) {
    if (exists(paths[i])) return paths[i];
    if (exists(`${paths[i]}.js`)) return `${paths[i]}.js`;
    if (exists(`${paths[i]}.mjs`)) return `${paths[i]}.mjs`;
    if (exists(`${paths[i]}.cjs`)) return `${paths[i]}.cjs`;
    if (exists(`${paths[i]}/index.js`)) return `${paths[i]}/index.js`;
    if (exists(`${paths[i]}/index.mjs`)) return `${paths[i]}/index.mjs`;
    if (exists(`${paths[i]}/index.cjs`)) return `${paths[i]}/index.cjs`;
  }
}

export async function load(id: string): Promise<any> {
  let resolved;
  if (!id.includes(':')) {
    resolved = path(id);
  } else if (!RE_SAFE_IMPORTS.test(id)) {
    const [mod, name] = id.split(':');
    resolved = path(`${cwd()}/node_modules/${mod}/shared/${name}`);
    if (!resolved) return reload(id);
  }

  const _cache = runtime.cache;
  if (_cache && _cache.has(resolved || id)) {
    return _cache.get(resolved || id)?.module;
  }

  if (resolved && (resolved.includes('.md') || resolved.includes('.html'))) {
    throw new Error(`Cannot import '${resolved}' file as module`);
  }

  if (resolved && exists(resolved)) {
    return resolved[0] === '/'
      ? reload(`file://${resolved}`)
      : reload(`file://${cwd()}/${resolved}`);
  }

  return reload(id);
}

export async function reload(id: string, force?: boolean): Promise<any> {
  const _cache = runtime.cache;
  if (!force && _cache?.has(id)) {
    return _cache.get(id)?.module;
  }
  if (force && id[0] === '/') {
    // @ts-expect-error
    if (typeof globalThis.imports !== 'undefined') {
      // eslint-disable-next-line
      (globalThis as any).imports.searchPath = (globalThis as any).imports.searchPath.filter((_: string) => !_.includes(id));
      return import(`file://${id}`);
    }
    return import(`${id}?_=${Math.random()}`);
  }
  return import(id);
}
