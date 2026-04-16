import { AnsiUp } from 'ansi_up';
import { createEmphasize } from 'emphasize';

import lessLang from 'highlight.js/lib/languages/less';
import cssLang from 'highlight.js/lib/languages/css';
import xmlLang from 'highlight.js/lib/languages/xml';
import jsLang from 'highlight.js/lib/languages/javascript';

import { jamLang } from './lang.ts';
import { attrs, taggify } from '../markup/html.ts';
import { dump, stack, ignore } from '../utils/server.ts';

const RE_MATCH_LINES = /(?:<anonymous>|[.+](?:page|error|layout|generated)\.m?[jt]s(?:[^:]+?)):(\d+)(?::(\d+))?/;
const RE_MATCH_OFFSETS = /\/\*!#(\d+):(\d+)\*\//;

const emphasize: any = createEmphasize();

emphasize.register('xml', xmlLang);
emphasize.register('css', cssLang);
emphasize.register('less', lessLang);
emphasize.register('jamrock', jamLang);
emphasize.register('javascript', jsLang);

// eslint-disable-next-line new-cap
const convert = new AnsiUp();

const AsyncFunction = (async () => null).constructor;

export class ParseError extends SyntaxError {
  declare position: any;

  constructor(message: string, info: any, pos: any) {
    super(message);
    this.name = 'ParseError';
    Object.assign(this, info);
    this.position.e = pos;
  }
}

export function stringify(result: any, prefix: string = '', callback: ((value: string) => void) | null = null): string {
  let content = '';
  callback = callback || (value => {
    content += value;
  });

  callback(`<!DOCTYPE html>\n<html${attrs(result.doc)}><head>\n`);

  taggify(result.head || [], callback);

  if (result.styles) {
    Object.keys(result.styles).forEach(key => {
      if (result.styles[key].length > 0) {
        result.styles[key].forEach((_: string) => {
          callback!(`<link rel=stylesheet href="${(prefix ? `${prefix}/` : '') + _}" />`);
        });
      }
    });
  }

  callback(`</head><body${attrs(result.attrs)}>\n`);

  taggify(result.body, callback);

  callback('</body></html>');

  return content;
}

export function highlight(code: string, lang?: string, _convert?: boolean): string {
  const result = emphasize.highlight(lang || 'jamrock', code).value;
  return _convert ? convert.ansi_to_html(result) : result;
}

export function sample(block: any, info: string, tail: string[], err: any, ok?: boolean): string {
  if (!block.html) {
    return err.stack || err.message;
  }

  let match = info.match(RE_MATCH_LINES);
  if (!match && tail.some(x => x.includes(block.file))) {
    match = tail.find(x => x.includes(block.file))!.split(':') as any;
  }

  if (!match && tail.some(x => RE_MATCH_LINES.test(x))) {
    match = tail.find(x => RE_MATCH_LINES.test(x))!.match(RE_MATCH_LINES);
  }

  if (match) {
    const genLine = +(match[1] as any);

    // If a source map is available, use it to resolve generated line → original line/col.
    // This avoids scanning block.code for /*!#line:col*/ markers and works even when
    // the original .html file is not present on disk (production, containers).
    if (block.smap) {
      const pos = block.smap.lookup(genLine);
      if (pos) {
        return `at ${block.file}:${pos.srcLine}:${pos.srcCol}\n${stack(block.html, pos.srcLine, pos.srcCol)}`;
      }
    }

    // Fallback: walk backwards through block.code for nearest /*!#line:col*/ marker
    const lines = block.code.split('\n');
    let code: string;
    for (let i = 1; i < lines.length; i += 1) {
      code = lines[genLine - i];
      if (code) {
        const [, line, col] = code.match(RE_MATCH_OFFSETS) || [];
        if (line && col) {
          return `at ${block.file}:${line}:${col}\n${stack(block.html, line as any, col as any)}`;
        }
      }
    }

    const line = Math.max(1, genLine - 11);
    const col = match[2];
    return `at ${block.file}:${line}\n${stack(block.html, line, col as any)}`;
  }
  return `at ${block.file}\n${stack(block.html, 1, 1, ok)}`;
}

export function debug(block: any, error: any): any {
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
    const causes: string[] = [];

    let current = error.cause;
    while (current) {
      causes.push(current.message);
      current = current.cause;
    }

    error.stack = error.stack.replace('\n', `\n- ${causes.join('\n- ')}\n`);
  }
  return error;
}

export function lexer(code: string, token: any): void {
  if (code.indexOf('#each ') === 0 && code.includes(' as ')) {
    const [a, b] = code.split(' as ');

    lexer(a, token);
    lexer(`${ignore(a)}    ${b}`, token);
    return;
  }

  const offset = '#@'.includes(code[0])
    ? code.indexOf(' ')
    : 0;

  const chunk = offset > 0
    ? `_${code.substr(1, offset - 1)}:${code.substr(offset + 1)}`
    : code;

  try {
    // eslint-disable-next-line no-new-func
    new (AsyncFunction as any)('', chunk);
  } catch (e: any) {
    if ((process as any).debug) {
      dump('---');
      dump(chunk);
      dump(e);
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
