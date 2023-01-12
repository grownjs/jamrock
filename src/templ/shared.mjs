import reExport from 'rewrite-exports';
import { rewrite } from 'rewrite-imports';

const RE_FIXED_IMPORTS = /\n\s+import\b/g;
const RE_MATCH_IMPORTS = /import[^]+?from.*?[\n;]/;

export function rexports(code, defns, ...args) {
  if (defns && defns.length > 0) {
    code = code.replace(new RegExp(`(?:^|\\$)(${defns.join('|')})(?:\\b|\\$)`, 'g'), '$1.current');
  }
  return reExport(code, ...args);
}

export function imports(code, loader) {
  let temp = code;
  let offset = 0;
  let matches;
  // eslint-disable-next-line no-cond-assign
  while (matches = temp.match(RE_MATCH_IMPORTS)) {
    temp = temp.replace(matches[0], matches[0].replace(/\S/g, ' '));
    offset = matches.index + matches[0].length;
  }

  const prelude = code.substr(0, offset);
  const fixed = prelude.replace(RE_FIXED_IMPORTS, '\nimport ');

  return code.replace(prelude, rewrite(fixed, loader));
}
