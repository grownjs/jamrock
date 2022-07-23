/* eslint-disable max-len */

import AnsiUp from 'ansi_up';
import { emphasize } from 'emphasize/lib/core.js';

import lessLang from 'highlight.js/lib/languages/less';
import scssLang from 'highlight.js/lib/languages/scss';
import cssLang from 'highlight.js/lib/languages/css';
import xmlLang from 'highlight.js/lib/languages/xml';
import jsLang from 'highlight.js/lib/languages/javascript';

import { jamLang } from './lang.mjs';
import { routes } from '../handler/utils.mjs';
import { transform } from '../reactor/compile.mjs';
import { attrs, taggify } from '../markup/html.mjs';
import { stack, imports, rexports } from '../utils.mjs';

const RE_MATCH_LINES = /<anonymous>:(\d+)(?::(\d+))?/;
const RE_MATCH_OFFSETS = /\/\*!#(\d+):(\d+)\*\//;

emphasize.registerLanguage('xml', xmlLang);
emphasize.registerLanguage('css', cssLang);
emphasize.registerLanguage('less', lessLang);
emphasize.registerLanguage('sass', scssLang);
emphasize.registerLanguage('jamrock', jamLang);
emphasize.registerLanguage('javascript', jsLang);

// eslint-disable-next-line new-cap
const convert = new AnsiUp.default();

export function stringify(result, callback = null) {
  let content = '';
  callback = callback || (value => {
    content += value;
  });

  callback(`<!DOCTYPE html>\n<html${attrs(result.doc)}><head>\n`);

  if (result.styles.length > 0) {
    callback('<style>\n');
    result.styles.forEach(css => callback(`${css.trim()}\n`));
    callback('</style>');
  }

  taggify(result.meta || [], callback);

  callback(`</head><body${attrs(result.attrs)}>\n`);

  taggify(result.body, callback);

  result.scripts.forEach(([mod, code]) => {
    callback(`\n<script${mod ? ' type=module' : ''}>\n${code.trim()}</script>`);
  });

  callback('</body></html>');

  return content;
}

export function highlight(code, markup) {
  const language = typeof markup === 'string' ? markup : 'jamrock';
  const result = emphasize.highlight(language, code).value;

  return markup === true
    ? convert.ansi_to_html(result)
    : result;
}

export function sample(block, info, tail) {
  let match = info.match(RE_MATCH_LINES);
  if (!match && tail.some(x => x.includes(block.file))) {
    match = tail.find(x => x.includes(block.file)).split(':');
  }

  if (!match && tail.some(x => RE_MATCH_LINES.test(x))) {
    match = tail.find(x => RE_MATCH_LINES.test(x)).match(RE_MATCH_LINES);
  }

  if (match) {
    const lines = block.code.split('\n');

    let code;
    for (let i = 1; i < lines.length; i += 1) {
      code = lines[match[1] - i];

      if (code) {
        const [, line, col] = code.match(RE_MATCH_OFFSETS) || [];

        if (line && col) {
          return `at ${block.file}:${line}:${col}\n${stack(block.html, line, col)}`;
        }
      }
    }
  }
  return `at ${block.file}\n${stack(block.html, 1, 1)}`;
}

export function debug(block, error) {
  const [head, body, ...tail] = error.stack.split('\n');

  if (error.name === 'SyntaxError') {
    error.message = 'invalid syntax';
    error.stack = `${error.message} ${sample(block, head, tail)}`;
  } else {
    error.stack = `${error.message} ${sample(block, body, tail)}`;
  }
  return error;
}

export function build(ctx) {
  const {
    hasVars, variables, locals, alias, deps, keys, code,
  } = transform(ctx.block.script, false);

  const [options] = code.match(/(?<=_\$=\{)[^]*\b(?:as|use)\s*:([^\n]+),? *(?=[\n}])/g) || [];
  const identity = options && options.match(/as\s*:\s*(["'"])(\w+)\1/);
  const shared = [...ctx.block.module.deps].concat(variables);
  const isAsync = ctx.block.context === 'module';
  const used = [...new Set(keys.concat(deps))];

  const tmp = [];
  const vars = [];

  used.forEach(key => {
    if (alias[key] || ['const', 'function'].includes(locals[key])) shared.push(key);
    if (locals[key] !== 'function') tmp.push(key);
    if (locals[key] === 'var') vars.push(key);
  });

  const identifier = (identity && identity[2]) || ctx.id;

  const unsafe = ['self', 'module', 'global', 'process', `${identifier}Page`]
    .map(x => `const ${x} = void 0`).join(';\n      ');

  let script = (variables.length ? `let ${variables.join(', ')};\n${code}` : code).trim();
  script = options ? script.replace(options, '') : script;

  const matched = routes(script, true);

  const out = `async function ${identifier}Component(
  __src,
  __loader,
  __reactor,
  __filename,
  __exported = Object.create(null)
) {
  ${hasVars || script ? `${rexports(imports(ctx.block.module.code, 'await __loader'), null, '__exported', 'await __loader')}
  async function ${identifier}Page(
    $$,
    __props,
    __debugger,
    __callback,
    __definition = Object.create(null)
  ) {
    ${hasVars ? `const __variables = ${JSON.stringify(vars)};
    ${JSON.stringify(tmp)}.forEach(k => {
      __definition[k] = __variables.includes(k) ? undefined : __props[k];
    });` : ''}
    return __reactor($$, __definition, async _$ => {
      const console = __debugger;
      ${unsafe};
      with (_$) {
        ${matched.code}
        ${shared.length ? `return () => {
          $def(_$, { ${shared.join(', ')} });
        };` : ''}
      }
    }, __callback);
  }` : `const ${identifier}Page = Object.create(null);`}
  ${identifier}Page.render = ${ctx.block.render.toString()};
  ${identifier}Page.assets = {
    scripts: ${JSON.stringify(ctx.assets.js)},
    styles: ${JSON.stringify(ctx.assets.css)},
  };
  ${identifier}Page.options = {${options || ''}};
  ${ctx.templates.metadata
    ? `${identifier}Page.metadata = ${isAsync ? 'async ' : ''}function ($$ctx, $$) { with ($$ctx) return [\n${ctx.templates.metadata}]; };\n`
    : ''}${ctx.templates.document
  ? `${identifier}Page.document = ${isAsync ? 'async ' : ''}function ($$ctx, $$) { with ($$ctx) return {${ctx.templates.document}\n}; };\n`
  : ''}${ctx.templates.attributes
  ? `${identifier}Page.attributes = ${isAsync ? 'async ' : ''}function ($$ctx, $$) { with ($$ctx) return {${ctx.templates.attributes}\n}; };\n`
  : ''}
  ${identifier}Page.component = ${identifier}Component;
  ${identifier}Page.fragments = Object.create(null);
  ${ctx.fragments.map(frag => `${identifier}Page.fragments['${frag.name}'] = {
    attributes: ${isAsync ? 'async ' : ''}function ($$ctx, $$) { with ($$ctx) return {${frag.attributes}\n}; },
    template: ${isAsync ? 'async ' : ''}function ($$ctx, $$) { with ($$ctx) return [\n${frag.template}]; },
  };`).join('\n')}
  ${identifier}Page.definitions = __exported;
  return ${identifier}Page;
};
module.exports = Object.assign(${identifier}Component, {
  as: '${identifier}',
  src: '${ctx.block.file}',
  paths: ${JSON.stringify(matched.routes)},
});
`;

  return {
    content: out,
  };
}
