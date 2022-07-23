import he from 'he';
import * as h from 'himalaya';

// eslint-disable-next-line no-control-regex
const RE_STRIP_ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

const NOT_ANCHORS = [
  'br', 'hr', 'wbr', 'area', 'html', 'head', 'title', 'base', 'meta', 'link', 'style', 'script', 'track',
  'embed', 'object', 'param', 'source', 'portal', 'svg', 'math', 'canvas', 'noscript', 'datalist', 'slot',
];

const NOT_SUPPORTED = [
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'content', 'dir', 'font', 'frame', 'frameset', 'hgroup',
  'image', 'keygen', 'marquee', 'menuitem', 'nobr', 'noembed', 'noframes', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp',
];

const RE_AS_LOCAL = /\s+as\s+(.+?)$/;
const RE_ALL_MARKS = /\{([#:/](?:if|else|each))(?:\s+([^{;:}]+?))?\}/;
const RE_REMOVE_IFBLOCK = /^if\s*/;
const RE_INLINE_EXPRESSIONS = /\{(?!")([^{}\n]*?)\}/;
const RE_QUOTED_STRINGS = /(["'])(.*?)\1/g;

const RE_DASH_CASE = /-([a-z])/g;
const RE_COLON_FIX = /:/g;
const RE_UPPER_CASE = /[A-Z]/g;
const RE_TAG_NAME = /(?<=<\/?)([A-Z]\w*)/g;
const RE_EXPR_VALUE = /^\{[^{}]+\}$/;
const RE_CLEAN_BLOCK = /^\{|\}$/g;
const RE_ANCHOR_START = /^/;

export class Expression {
  constructor(value) {
    this.expr = [value];
  }

  append(value) {
    this.expr.push(value);
  }

  resolve(offset, isAsync, callback) {
    return this.expr.map(token => {
      if (token.includes('>>')) {
        return `'${token.substr(1, token.length - 2).replace(/\s*>>\s*/, ' ').trim()}'`;
      }

      const chunk = callback(offset, token);
      const _sync = isAsync && !token.includes('...') ? 'await ' : '';

      offset = chunk.offset[0];

      return `/*!#${offset}*/ ${_sync}${token.substr(1, token.length - 2)}`;
    }).join(',\n');
  }

  static props(value, prefix, offset, isAsync, callback) {
    let obj = '';
    Object.keys(value).forEach(key => {
      if (key === '$' && value[key] instanceof Expression) {
        obj += `\n${prefix}${value[key].resolve(offset, isAsync, callback)},`;
        return;
      }

      const val = value[key] instanceof Expression
        ? value[key].resolve(offset, isAsync, callback)
        : JSON.stringify(value[key]);

      obj += `\n${prefix}  '${key}': ${val},`;
    });
    return obj;
  }

  static from(value, offset, callback) {
    return new Expression(value, offset, callback);
  }

  static has(value) {
    return RE_EXPR_VALUE.test(value);
  }
}

export function strip(value) {
  return value.replace(RE_STRIP_ANSI, '');
}

export function parse(html, file) {
  function walk(obj) {
    const copy = [];

    obj.forEach(node => {
      if (node.type === 'element') {
        if (NOT_SUPPORTED.includes(node.tagName)) {
          throw new ReferenceError(`Element '${node.tagName}' should not be used`);
        }

        if (node.position && !NOT_ANCHORS.includes(node.tagName)) {
          const { start } = node.position;

          if (!(node.tagName === 'input' && node.attributes.some(x => x.key === 'type' && x.value === 'hidden'))) {
            node.attributes.push({
              key: 'data-location',
              value: `${file}:${start.line + 1}:${start.column + 1}`,
            });
          }
        }

        copy.push({
          type: node.type,
          name: node.tagName.indexOf('x-') === 0
            ? node.tagName.replace(RE_DASH_CASE, (_, chunk) => chunk.toUpperCase()).substr(1)
            : node.tagName,
          attributes: node.attributes
            ? node.attributes.reduce((memo, { key, value }) => {
              if (Expression.has(key)) {
                if (key.indexOf('...') === 1 && value === null) {
                  if (memo.$ instanceof Expression) {
                    memo.$.append(key);
                  } else {
                    memo.$ = Expression.from(key);
                  }
                } else {
                  memo[key.substr(1, key.length - 2)] = Expression.from(key);
                }
              } else if (key.includes(':') && key.charAt() !== ':') {
                const [prefix, prop] = key.split(':');

                if (prefix === 'on') {
                  memo[prefix + prop] = value ? value.substr(1, value.length - 2) : true;
                } else if (prefix === 'bind') {
                  memo[key] = (value || prop).replace(RE_CLEAN_BLOCK, '');
                  memo[prop] = Expression.from(`{${memo[key]}}`);
                } else {
                  memo[!(prefix === 'style' || prefix === 'class')
                    ? `data-${key.replace(RE_COLON_FIX, '-')}`
                    : key] = value || Expression.from(`{${prop}}`);
                }
              } else if (value !== null && Expression.has(value)) {
                memo[key] = Expression.from(value);
              } else {
                memo[key] = value === null ? true : value;
              }
              return memo;
            }, {})
            : {},
          elements: node.children
            ? walk(node.children)
            : undefined,
        });
      } else {
        copy.push({
          type: node.type,
          text: he.decode(node.content),
        });
      }
    });

    return copy;
  }

  try {
    html = html.replace(RE_TAG_NAME, (_, tag) => {
      return tag.replace(RE_ANCHOR_START, 'x').replace(RE_UPPER_CASE, '-$&');
    });

    const includePositions = process.env.NODE_ENV === 'development';
    const tree = walk(h.parse(html, { ...h.parseDefaults, includePositions }));

    return { type: 'element', name: 'root', elements: tree.filter(x => x.type !== 'text' || x.text.trim().length) };
  } catch (e) {
    throw new Error(`Failed to compile '${file}' (${e.message})`);
  }
}

export function explode(tpl, find, offset) {
  const chunks = [];

  let cursor = 0;
  let diff = 0;
  do {
    const matches = tpl.match(RE_ALL_MARKS) || [];
    const [block, mark, args] = matches;
    const old = tpl.length;

    if (!block) break;

    const fixedBlock = mark.charAt() !== '/' && find(offset + cursor, block);
    const middle = tpl.substr(cursor - diff, matches.index);
    const odd = middle.split('"').length % 2 === 0;
    const prefix = odd ? '' : '"';
    const suffix = odd ? '"' : '"';

    chunks.push({ text: prefix + middle + suffix });
    chunks.push({
      ...fixedBlock, block, mark, args,
    });

    tpl = tpl.substr(matches.index + block.length);
    cursor += matches.index + block.length;
    diff += old - tpl.length;
  } while (true); // eslint-disable-line

  chunks.push({ text: cursor ? `"${tpl}` : tpl });
  return chunks;
}

export function decorate(chunk, locate) {
  return chunk.replace(RE_QUOTED_STRINGS, (_, qt, text) => {
    if (qt === '"') {
      do {
        const matches = text.match(RE_INLINE_EXPRESSIONS);

        if (!matches) break;
        const position = locate(matches[0]) || {};
        const offset = position.offset ? position.offset[0] : -1;

        text = text.replace(matches[0], () => `"\n/*!#${offset}*/ + $$.$(${matches[1]}) + "`);
      } while (true); // eslint-disable-line
      return qt + text + qt;
    }
    return _;
  });
}

export function traverse(chunk, isAsync) {
  if (!chunk || typeof chunk !== 'object') return chunk;
  if (Array.isArray(chunk)) return chunk.map(x => traverse(x, isAsync));
  if (chunk.mark === '#each') {
    return {
      ...chunk,
      block: `, ${isAsync ? 'await ' : ''}$$.map([${isAsync ? 'await ' : ''}${
        chunk.args.replace(RE_AS_LOCAL, ", '$1'")
      }], ${isAsync ? 'async ' : ''}function ($$ctx) { with ($$ctx) return [\n`,
      kind: 'map',
    };
  }
  if (chunk.mark === '#if') {
    return {
      ...chunk,
      block: `, ${isAsync ? 'await ' : ''}$$.if(${chunk.args}, ${isAsync ? 'async ' : ''}() => { return [\n`,
      kind: 'if',
    };
  }
  if (chunk.mark === '/each') return { ...chunk, block: ']; }),', kind: 'end' };
  if (chunk.mark === '/if') return { ...chunk, block: ']; }),', kind: 'end' };
  if (chunk.mark === ':else') {
    if (chunk.args) {
      return {
        ...chunk,
        block: `]; }, () => { if (${chunk.args.replace(RE_REMOVE_IFBLOCK, '')}) return ${isAsync ? 'async ' : ''}() => [\n`,
        kind: 'else',
      };
    }
    return { ...chunk, block: `]; }, ${isAsync ? 'async ' : ''}() => { return [\n`, kind: 'else' };
  }
  return { ...chunk, block: chunk.text };
}
