import AnsiUp from 'ansi_up';
import { emphasize } from 'emphasize/lib/core.js';

import lessLang from 'highlight.js/lib/languages/less';
import scssLang from 'highlight.js/lib/languages/scss';
import cssLang from 'highlight.js/lib/languages/css';
import xmlLang from 'highlight.js/lib/languages/xml';
import jsLang from 'highlight.js/lib/languages/javascript';

import { jamLang } from './lang.mjs';
import { Is, stack } from '../utils/shared.mjs';
import { attrs, taggify } from '../markup/html.mjs';

const RE_MATCH_LINES = /(?:<anonymous>|[.+](?:page|error|layout|generated)\.mjs(?:[^:]+?)):(\d+)(?::(\d+))?/;
const RE_MATCH_OFFSETS = /\/\*!#(\d+):(\d+)\*\//;

const RE_MATCH_IMPORTS = /import\s*(.+?)\s*from\s*([^\n;]+)/g;
const RE_MATCH_EXPORTS = /export (\w+)/g;

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

  taggify(result.head || [], callback);

  const styles = Object.entries(result.styles);
  const scripts = Object.values(result.scripts);

  let sent;
  styles.forEach(([k, v]) => {
    if (v) {
      if (!sent) {
        callback('<style>\n');
        sent = true;
      }
      callback(`${k !== 'default' ? `/* ${k} */\n` : ''}${v}\n`);
    }
  });

  if (sent) callback('</style>');

  callback(`</head><body${attrs(result.attrs)}>\n`);

  taggify(result.body, callback);

  scripts.forEach(js => {
    js.forEach(([mod, code]) => {
      if (code) callback(`\n<script${mod ? ' type=module' : ''}>\n${code}</script>`);
    });
  });

  callback('</body></html>');

  return content;
}

export function highlight(code, markup) {
  const language = Is.str(markup) ? markup : 'jamrock';
  const result = emphasize.highlight(language, code).value;

  return markup === true
    ? convert.ansi_to_html(result)
    : result;
}

export function sample(block, info, tail, err, ok) {
  if (!block.html) {
    return err.stack || err.message;
  }

  let match = info.match(RE_MATCH_LINES);
  if (!match && tail.some(x => x.includes(block.src))) {
    match = tail.find(x => x.includes(block.src)).split(':');
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
          return `at ${block.src}:${line}:${col}\n${stack(block.html, line, col)}`;
        }
      }
    }

    const line = Math.max(1, match[1] - 11);
    const col = match[2];

    return `at ${block.src}:${line}\n${stack(block.html, line, col)}`;
  }
  return `at ${block.src}\n${stack(block.html, 1, 1, ok)}`;
}

// FIXME: ensure this would catch .html errors if
// we match the component earlier in the stack...
export function debug(block, error, callback) {
  if (process.debug) console.debug(error, block);

  let cause;
  if (callback && error.name === 'SyntaxError') {
    cause = error.message;
    try {
      callback(block.code
        .replace(/unwrap`([^]*?)`\.end/g, '$1')
        .replace(RE_MATCH_IMPORTS, 'const $1 = import($2)')
        .replace(RE_MATCH_EXPORTS, (_, fn) => (fn === 'default' ? '' : fn)));
    } catch (e) {
      error = e;
    }
  }

  const failure = new Error(error.message, { cause: error });
  const [head, body, ...tail] = error.stack.split('\n');

  failure.name = error.name;
  failure.status = error.status || 500;

  if (error.name === 'SyntaxError') {
    failure.message = 'Invalid syntax found';
    failure.stack = `${failure.message} ${sample(block, head, tail, error, true)}`;
  } else {
    failure.stack = `${error.message.replace(/\.$/, ',')} ${sample(block, body, tail, error)}`;
  }
  if (cause) {
    failure.stack = failure.stack.replace('\n', `\n- ${cause}\n`);
  }
  return failure;
}
