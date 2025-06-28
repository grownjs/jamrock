import { Expr } from './expr.mjs';
import { Is, repeat, identifier } from '../utils/server.mjs';

const NOT_ANCHORS = [
  'br', 'hr', 'wbr', 'area', 'html', 'head', 'title', 'base', 'meta', 'link', 'style', 'script', 'track', 'option',
  'embed', 'object', 'param', 'source', 'portal', 'math', 'canvas', 'noscript', 'datalist', 'slot', '!DOCTYPE',
];

const NOT_SUPPORTED = [
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'content', 'dir', 'font', 'frame', 'frameset', 'hgroup',
  'image', 'keygen', 'marquee', 'menuitem', 'nobr', 'noembed', 'noframes', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp',
];

const HEAD_ELEMENTS = ['title', 'meta', 'link', 'base'];
const HTML_ELEMENTS = ['body', 'html'];

export function traverse(obj, html, parent, context, counter = 0) {
  const preserve = context.file?.includes('+page');
  const stack = [];
  const copy = [];

  let inSnippet;
  let chunk = [];
  obj.forEach(node => {
    const tokenStart = { ...node.position?.start };

    if (node.type === 'element') {
      if (NOT_SUPPORTED.includes(node.rawTagName)) {
        throw new ReferenceError(`Element '${node.rawTagName}' should not be used`);
      }

      if ((!parent || parent.name !== 'head') && HEAD_ELEMENTS.includes(node.rawTagName)) {
        throw new ReferenceError(`Element '${node.rawTagName}' should appear within the 'head'`);
      }

      if (parent && parent.name !== 'html' && HTML_ELEMENTS.includes(node.rawTagName)) {
        throw new ReferenceError(`Element '${node.rawTagName}' cannot be nested inside '${parent.name}'`);
      }

      if (!NOT_ANCHORS.includes(node.rawTagName) && node.position) {
        if (!(node.rawTagName === 'input' && node.attributes.some(x => x.key === 'hidden' || (x.key === 'type' && x.value === 'hidden')))) {
          node.attributes.push({
            key: '@location',
            value: `${context.file}:${tokenStart.line + 1}:${tokenStart.column + 1}`,
          });
        }
      }

      if (node.rawTagName === 'script' || node.rawTagName === 'style') {
        const src = node.attributes.find(x => x.key === 'src');

        if (src && node.rawTagName === 'script') return;

        const baseNode = {
          ref: parent?.__ref || null,
          root: parent?.name || null,
          identifier: `${context.file.replace(/\.\w+$/, '')}(${counter})`,
          attributes: node.attributes
            ? node.attributes.reduce((memo, { key, value }) => {
              memo[key] = value === null ? true : value;
              return memo;
            }, {})
            : {},
        };

        if (node.children[0]) {
          const { line, column, index } = node.children[0].position.start;
          const prefix = repeat(' ', index - (line + column) + 3) + repeat('\n', line) + repeat(' ', column);

          if (parent && node.rawTagName === 'script') {
            parent.__ref = parent.__ref || identifier();
          }

          const fixedNode = {
            ...baseNode,
            offset: node.children[0].position.start,
            content: prefix + node.children[0].content,
          };

          if (node.rawTagName === 'script') context.response.scripts.push(fixedNode);
          if (node.rawTagName === 'style') context.response.styles.push(fixedNode);
          counter += 1;
        } else if (src && node.rawTagName === 'style') {
          context.response.styles.push({
            ...baseNode,
            content: '',
            offset: node.position.start,
          });
          counter += 1;
        }
        return;
      }

      if (context.response?.rules) {
        node.attributes.forEach(({ key, value }) => {
          let newClass;
          if (key.indexOf('class:') === 0) newClass = key.substr(6);
          if (key === 'class') newClass = value.replace(/\{[^{}]+?\}/g, '').trim();
          if (newClass && !context.response.rules.includes(newClass)) context.response.rules.push(newClass);
        });
      }

      const newNode = {
        type: 'element',
        name: node.rawTagName,
        offset: node.position ? {
          start: tokenStart,
          end: node.position.end.index,
          close: html.indexOf('>', tokenStart.index),
        } : null,
        snippets: {},
        attributes: node.attributes
          ? Expr.params(node.attributes, context, tokenStart)
          : {},
      };

      newNode.elements = node.children
        ? traverse(node.children, html, newNode, context, counter)
        : undefined;

      Object.defineProperty(newNode, 'root', { value: parent || null });

      if (Object.keys(newNode.snippets).length > 0 && !(node.rawTagName === 'body' || Is.upper(node.rawTagName))) {
        throw new Error(`Element '${node.rawTagName}' cannot have snippets`);
      }

      if (newNode.__ref) newNode.attributes['@ref'] = newNode.__ref;

      if (node.rawTagName === 'html') {
        context.response.markup.document = newNode.attributes;
        copy.push(...newNode.elements);
      } else if (node.rawTagName === 'head') {
        context.response.markup.metadata = newNode.elements;
      } else if (node.rawTagName === 'body') {
        copy.push(...newNode.elements);
        context.response.markup.attributes = newNode.attributes;
        Object.assign(context.response.snippets, newNode.snippets);
      } else if (node.rawTagName === '!DOCTYPE') {
        context.response.markup.doctype = newNode.attributes;
      } else if (node.rawTagName === 'fragment') {
        if (!newNode.attributes.name || context.response.fragments[newNode.attributes.name]) {
          throw new Error(`Fragment requires a name, given '${JSON.stringify(newNode.attributes)}'`);
        }

        newNode.type = 'fragment';
        newNode.ref = newNode.attributes.name;
        newNode.name = newNode.attributes.tag || 'x-fragment';

        copy.push(context.response.fragments[newNode.attributes.name] = newNode);
      } else if (inSnippet) {
        chunk.push(newNode);
      } else {
        copy.push(newNode);
      }
    } else if (node.type === 'text' && (preserve || node.content.trim().length)) {
      if (context.stack && node.content.includes('\0')) {
        copy.push(...node.content.split('\0')
          .reduce((memo, _, i, c) => memo
            .concat(_ ? { type: 'text', content: _ } : [])
            .concat(i < c.length - 1 ? context.stack.shift() : []), []));
        return;
      }

      const pre = preserve || ['pre', 'textarea'].includes(parent?.name);
      const tokens = Expr.unwrap(node.content, tokenStart, context, pre);
      const newTokens = [];

      tokens.expr.forEach(token => {
        const current = stack.at(-1);

        if (token.content.tag === '@const') {
          if (!current || !current.block) {
            throw new SyntaxError(`Unexpected @const after ${tokenStart.line + 1}:${tokenStart.column + 1}`);
          }

          const [key, value] = token.content.inner.split(/\s*=\s*/);
          const { position } = token.content.offset;
          current.context[key] = { value, position };
          return;
        }

        if (token.content.block && token.content.tag[0] !== '@') {
          if (token.content.open) {
            stack.push(token.content);

            if (inSnippet) {
              if (token.content.name) {
                const fn = `${token.content.name}(${token.content.args.join(', ')})`;

                throw new SyntaxError(`Unexpected snippet '${fn}' after ${tokenStart.line + 1}:${tokenStart.column + 1}`);
              }
              chunk.push(token);
            } else if (!token.content.name) {
              newTokens.push(token);
            } else {
              inSnippet = true;
            }
          } else {
            if (!current || (
              token.content.tag !== ':else'
              && (token.content.tag !== current.tag.replace('#', '/'))
            )) {
              throw new SyntaxError(`Unexpected '${token.content.tag}' after ${tokenStart.line + 1}:${tokenStart.column + 1}`);
            }
            if (current.name) {
              const _node = parent || context.response;

              if (_node.name && !Is.upper(_node.name)) {
                // eslint-disable-next-line max-len
                throw new SyntaxError(`Unexpected '${current.name}' snippet in <${_node.name}> tag after ${tokenStart.line + 1}:${tokenStart.column + 1}`);
              }

              _node.snippets[current.name] = {
                args: current.args,
                body: chunk,
              };
              inSnippet = false;
              chunk = [];
            } else if (inSnippet) {
              chunk.push(token);
            } else {
              newTokens.push(token);
            }
            if (token.content.tag !== ':else') stack.pop();
          }
        } else if (inSnippet) {
          chunk.push(token);
        } else {
          newTokens.push(token);
        }
      });
      tokens.expr = newTokens;
      copy.push(tokens);
    }
  });

  return copy;
}
