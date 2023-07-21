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

// const RE_MATCH_IMPORTS = /import\s*(.+?)\s*from\s*([^\n;]+)/g;
// const RE_MATCH_EXPORTS = /export (\w+)/g;

emphasize.registerLanguage('xml', xmlLang);
emphasize.registerLanguage('css', cssLang);
emphasize.registerLanguage('less', lessLang);
emphasize.registerLanguage('sass', scssLang);
emphasize.registerLanguage('jamrock', jamLang);
emphasize.registerLanguage('javascript', jsLang);

// eslint-disable-next-line new-cap
const convert = new AnsiUp.default();

const AsyncFunction = (async () => null).constructor;

export class ParseError extends SyntaxError {
  constructor(message, info, pos) {
    super(message);
    this.name = 'ParseError';
    Object.assign(this, info);
    this.position.e = pos;
  }
}

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

    const line = Math.max(1, match[1] - 11);
    const col = match[2];

    return `at ${block.file}:${line}\n${stack(block.html, line, col)}`;
  }
  return `at ${block.file}\n${stack(block.html, 1, 1, ok)}`;
}

export function debug(block, error) {
  if (process.debug) console.debug(error, block);

  if (error.name === 'ParseError') {
    const offset = error.position.col + error.position.e;
    const source = `${block.file}:${error.position.line}:${offset}`;

    error.stack = `${error.message} at ${source}\n${stack(block.html, error.position.line, offset)}`;
    return error;
  }

  const [, body, ...tail] = error.stack.split('\n');

  if (error.message.includes('missing ')) {
    error.message = error.message.replace(/missing (.)/, "Missing '$1'");
  }

  error.status = error.status || 500;
  error.stack = `${error.message.replace(/\.$/, ',')} ${sample(block, body, tail, error)}`;

  if (error.cause) {
    const causes = [];

    let current = error.cause;
    while (current) {
      causes.push(current.message);
      current = current.cause;
    }

    error.stack = error.stack.replace('\n', `\n- ${causes.join('\n- ')}\n`);
  }
  return error;
}

export function lexer(code, token) {
  if (code.indexOf('#each ') === 0 && code.includes(' as ')) {
    const [a, b] = code.split(' as ');

    lexer(a, token);
    lexer(`${a.replace(/./g, ' ')}    ${b}`, token);
    return;
  }

  const offset = '#@'.includes(code.charAt())
    ? code.indexOf(' ')
    : 0;

  const chunk = offset > 0
    ? `_${code.substr(1, offset - 1)}:${code.substr(offset + 1)}`
    : code;

  try {
    // eslint-disable-next-line no-new-func
    new AsyncFunction('', chunk);
  } catch (e) {
    if (process.debug) {
      console.log('---');
      console.log(chunk);
      console.log(e);
    }
    if (e.message.includes('Invalid or unexpected token')) {
      throw new ParseError(e.message, token, chunk.trim().length);
    }
    if (e.message.includes('Unexpected token')) {
      const matches = e.message.match(/Unexpected token '(.+?)'/);
      const text = chunk.substr(offset);

      if (matches[1] === '}') {
        const clean = text.trim();
        const char = clean.substr(-1);
        const pos = offset + clean.length;

        throw new ParseError(`Unexpected token '${char}'`, token, pos);
      }
      throw new ParseError(e.message, token, text.indexOf(matches[1]) + offset + 1);
    }
    throw new ParseError(e.message, token, offset);
  }
}
