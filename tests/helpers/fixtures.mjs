import s from 'tiny-dedent';
import glob from 'fast-glob';
import * as path from 'path';
import * as fs from 'fs';

import { fixture, build } from './utils.mjs';

const cwd = process.cwd();
const fixturesDir = path.join(cwd, 'tests', 'fixtures');

const registry = new Map();
const categories = [
  'components',
  'templates',
  'styling',
  'routing',
  'interactivity',
  'forms',
  'assets',
  'markdown',
  'modules',
];

export function scan() {
  const files = glob.sync(`${fixturesDir}/**/*.{html,md,mjs,js,ts,svg,otf}`);

  for (const file of files) {
    const rel = path.relative(fixturesDir, file);
    const key = `./${rel}`;

    let source;
    if (file.endsWith('.svg') || file.endsWith('.otf')) {
      source = fs.readFileSync(file);
    } else {
      source = fs.readFileSync(file, 'utf-8');
    }

    registry.set(key, {
      key,
      file,
      rel,
      source,
      category: rel.split(path.sep)[0],
    });
  }

  return registry;
}

export function list(category) {
  if (!registry.size) scan();

  if (category) {
    return Array.from(registry.values()).filter(f => f.category === category);
  }

  return Array.from(registry.values());
}

export function get(key) {
  if (!registry.size) scan();

  const item = registry.get(key);
  if (!item) {
    throw new Error(`Fixture not found: ${key}`);
  }
  return item;
}

export function load(key) {
  const item = get(key);
  const destination = key.replace(/^\./, `${cwd}/generated`);

  fs.mkdirSync(path.dirname(destination), { recursive: true });

  if (Buffer.isBuffer(item.source)) {
    fs.writeFileSync(destination, item.source);
  } else {
    fs.writeFileSync(destination, s(item.source));
  }

  fixture[key] = {
    source: item.source,
    filepath: key,
    destination,
  };

  return key;
}

export function loadAll(category) {
  const items = list(category);
  return items.map(item => load(item.key));
}

export function loadDependencies(key) {
  const item = get(key);
  const deps = [];

  if (Buffer.isBuffer(item.source)) {
    return deps;
  }

  const importRegex = /import\s+[^'"]*['"]([^'"]+)['"]/g;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = importRegex.exec(item.source)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const dir = path.dirname(key);
      const resolved = `./${path.join(dir, importPath).replace(/\\/g, '/')}`;

      if (registry.has(resolved)) {
        deps.push(resolved);
      }
    }
  }

  for (const dep of deps) {
    load(dep);
    loadDependencies(dep);
  }

  return deps;
}

export async function compile(key, opts = {}) {
  load(key);
  loadDependencies(key);

  const options = { ...opts, cwd: 'generated', scope: 'jam-420' };
  return build(key, options);
}

export async function render(key, props = {}, opts = {}) {
  const tpl = await compile(key, opts);
  return tpl.render(props);
}

export function byFeature() {
  if (!registry.size) scan();

  const grouped = {};

  for (const cat of categories) {
    grouped[cat] = list(cat).map(f => ({
      key: f.key,
      rel: f.rel,
    }));
  }

  return grouped;
}

export function catalog() {
  if (!registry.size) scan();

  const result = {};

  for (const [key, item] of registry) {
    const parts = item.rel.split(path.sep);
    const category = parts[0];
    const subcategory = parts.length > 2 ? parts[1] : null;

    if (!result[category]) result[category] = {};
    if (subcategory && !result[category][subcategory]) {
      result[category][subcategory] = [];
    }

    const entry = {
      key,
      file: parts[parts.length - 1],
    };

    if (subcategory) {
      result[category][subcategory].push(entry);
    } else {
      if (!result[category]._files) result[category]._files = [];
      result[category]._files.push(entry);
    }
  }

  return result;
}

export { registry, fixturesDir };
