import { Template } from '../main.ts';

// Same regex as templ/main.ts — matches all import/export…from forms
const RE_EXTERNALS = /\b(?:import[^;=]*\(?(?:"([^;]+)"|'([^;]+)')|(?:export|import)[^;=]+from\s*(?:"([^;]+)"|'([^;]+)'))/g;
const RE_COMMENTS = /\/\*[\S\s]*?\*\/|\/\/.*/g;

// Matches dynamic import() calls: import('specifier') or import("specifier")
const RE_DYNAMIC = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g;

// Matches CSS @import statements: @import "file" or @import url("file")
// Captures the specifier from both quoted and url() forms.
const RE_CSS_IMPORT = /@import\s+(?:url\s*\(\s*)?(['"]?)([^'"\s)]+)\1\s*\)?/g;

function extractSpecifier($1: string, $2: string, $3: string, $4: string): string {
  return $4 || $3 || $2 || $1;
}

function isRelative(src: string): boolean {
  return src.startsWith('./') || src.startsWith('../');
}

function isBare(src: string): boolean {
  return !isRelative(src) && !src.startsWith('/') && !/^[a-z]+:/.test(src);
}

/**
 * Rewrite relative import specifiers in `content` (a .generated.mjs file) to
 * absolute browser-loadable URLs served under `/<prefix>/`.
 *
 * - Relative specifiers: resolved against dirname(destFile), then made absolute
 *   relative to `dest` root and prefixed with `/<prefix>/`
 * - Cache-busting `?_=<ts>` suffixes are preserved (valid in import() URLs)
 * - HTTP/HTTPS, bare specifiers, jamrock:* dynamic imports → pass through
 */
export function rewriteImports(content: string, destFile: string, dest: string, prefix: string): string {
  const dir = Template.dirname(destFile);
  const slash = prefix.startsWith('/') ? prefix : `/${prefix}`;

  function rewriteSpec(src: string): string {
    if (!isRelative(src)) return src;
    // Split off any query string (cache-busting ?_=<ts>)
    const qIdx = src.indexOf('?');
    const specifier = qIdx >= 0 ? src.slice(0, qIdx) : src;
    const query = qIdx >= 0 ? src.slice(qIdx) : '';
    const abs = Template.join(dir, specifier);
    const rel = Template.relative(dest, abs);
    return `${slash}/${rel}${query}`;
  }

  return content
    .replace(RE_COMMENTS, (c: string) => c) // preserve comments, don't strip
    .replace(RE_EXTERNALS, (match: string, ...$: string[]) => {
      const src = extractSpecifier($[0], $[1], $[2], $[3]);
      if (!src || !isRelative(src)) return match;
      return match.replace(src, rewriteSpec(src));
    })
    .replace(RE_DYNAMIC, (match: string, _quote: string, src: string) => {
      if (!isRelative(src)) return match;
      return match.replace(src, rewriteSpec(src));
    });
}

/**
 * Resolve plain CSS @import statements recursively, inlining all imported
 * files into a single flat CSS string. HTTP/HTTPS and absolute imports are
 * left as-is. Returns the flattened source and the list of imported paths
 * (for dependency tracking / hot-reload).
 */
export function resolveCssImports(
  content: string,
  filepath: string,
  visited: Set<string> = new Set(),
): { source: string; children: string[] } {
  const children: string[] = [];
  const dir = Template.dirname(filepath);

  const source = content.replace(RE_CSS_IMPORT, (match: string, _quote: string, src: string) => {
    // Skip HTTP/HTTPS and absolute paths — leave them for the browser
    if (!isRelative(src)) return match;

    const abs = Template.join(dir, src);
    if (!Template.exists(abs)) return match;
    if (visited.has(abs)) return ''; // cycle guard — drop duplicate import

    visited.add(abs);

    const childContent = Template.read(abs);
    const { source: inlined, children: nested } = resolveCssImports(childContent, abs, visited);

    children.push(abs, ...nested);
    return inlined;
  });

  return { source, children };
}

/**
 * Walk the import graph of `filepath` recursively.
 * Returns a flat map of { [cwd-relative-path]: { children: string[] } }
 * where children are the direct relative imports of that file.
 *
 * Uses the same algorithm as Template.imports but works from an explicit
 * root file rather than a synthetic import string.
 */
export function walkImports(
  filepath: string,
  dest: string,
  visited: Map<string, any> = new Map(),
): Record<string, { children: string[] }> {
  const ret: Record<string, { children: string[] }> = {};
  const key = Template.relative(dest, filepath);

  if (visited.has(key)) return ret;
  visited.set(key, true);

  let content: string;
  try {
    content = Template.read(filepath);
  } catch {
    return ret;
  }

  const children: string[] = [];
  const dir = Template.dirname(filepath);

  content
    .replace(RE_COMMENTS, '')
    .replace(RE_EXTERNALS, (_: string, ...$: string[]) => {
      const src = extractSpecifier($[0], $[1], $[2], $[3]);
      if (!src || !isRelative(src)) return _;
      const abs = Template.join(dir, src.replace(/\?.*$/, ''));
      if (!Template.exists(abs)) return _;
      const childKey = Template.relative(dest, abs);
      if (!children.includes(childKey)) {
        children.push(childKey);
        Object.assign(ret, walkImports(abs, dest, visited));
      }
      return _;
    });

  ret[key] = { children };
  return ret;
}
