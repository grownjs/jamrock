import { decodeEnts } from 'somedom/ssr';

import { repeat } from '../utils/server.mjs';
import { Expr } from './expr.mjs';

const NOT_ANCHORS = [
  'br', 'hr', 'wbr', 'area', 'html', 'head', 'title', 'base', 'meta', 'link', 'style', 'script', 'track', 'option',
  'embed', 'object', 'param', 'source', 'portal', 'svg', 'math', 'canvas', 'noscript', 'datalist', 'slot', '!DOCTYPE',
];

const NOT_SUPPORTED = [
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'content', 'dir', 'font', 'frame', 'frameset', 'hgroup',
  'image', 'keygen', 'marquee', 'menuitem', 'nobr', 'noembed', 'noframes', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp',
];

const HEAD_ELEMENTS = ['title', 'meta', 'link', 'base'];
const HTML_ELEMENTS = ['body', 'html'];

export function traverse(obj, html, parent, context, counter = 0) {
  const copy = [];

  obj.forEach(node => {
    const tokenStart = { ...node.position.start };

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

      if (!NOT_ANCHORS.includes(node.rawTagName)) {
        if (!(node.rawTagName === 'input' && node.attributes.some(x => x.key === 'hidden' || (x.key === 'type' && x.value === 'hidden')))) {
          node.attributes.push({
            key: '@location',
            value: `${context.file}:${tokenStart.line + 1}:${tokenStart.column + 1}`,
          });
        }
      }

      if ((node.rawTagName === 'script' || node.rawTagName === 'style') && !node.attributes.some(x => x.key === 'src')) {
        if (node.children[0]) {
          const { line, column, index } = node.children[0].position.start;
          const prefix = repeat(' ', index - (line + column) + 3) + repeat('\n', line) + repeat(' ', column);

          const fixedNode = {
            root: parent ? parent.name : null,
            offset: node.children[0].position.start,
            content: prefix + node.children[0].content,
            identifier: `${context.file.replace(/\.\w+$/, '')}(${counter})`,
            attributes: node.attributes
              ? node.attributes.reduce((memo, { key, value }) => {
                memo[key] = value === null ? true : value;
                return memo;
              }, {})
              : {},
          };

          if (node.rawTagName === 'script') context.response.scripts.push(fixedNode);
          if (node.rawTagName === 'style') context.response.styles.push(fixedNode);
          counter += 1;
        }
        return;
      }

      node.attributes.forEach(({ key, value }) => {
        if (key === 'class') context.response.rules.push(value);
        if (key.indexOf('class:') === 0) context.response.rules.push(key.substr(6));
      });

      const newNode = {
        type: 'element',
        name: node.rawTagName,
        offset: {
          start: tokenStart,
          end: node.position.end.index,
          close: html.indexOf('>', tokenStart.index),
        },
        attributes: node.attributes
          ? Expr.params(node.attributes, context.locate, tokenStart)
          : {},
      };

      newNode.elements = node.children
        ? traverse(node.children, html, newNode, context, counter)
        : undefined;

      Object.defineProperty(newNode, 'root', { value: parent || null });

      if (node.rawTagName === 'html') {
        context.response.markup.document = newNode.attributes;
        copy.push(...newNode.elements);
      } else if (node.rawTagName === 'head') {
        context.response.markup.metadata = newNode.elements;
      } else if (node.rawTagName === 'body') {
        context.response.markup.attributes = newNode.attributes;
        copy.push(...newNode.elements);
      } else if (node.rawTagName === '!DOCTYPE') {
        context.response.markup.doctype = newNode.attributes;
      } else if (node.rawTagName === 'fragment') {
        if (!newNode.attributes.name || context.response.fragments[newNode.attributes.name]) {
          throw new Error(`Fragment requires an unique name, given '${JSON.stringify(newNode.attributes)}'`);
        }

        newNode.type = 'fragment';
        newNode.ref = newNode.attributes.name;
        newNode.name = newNode.attributes.tag || 'x-fragment';

        copy.push(context.response.fragments[newNode.attributes.name] = newNode);
      } else {
        copy.push(newNode);
      }
    } else if (node.type === 'text' && node.content.trim().length) {
      copy.push(Expr.unwrap(decodeEnts(node.content), tokenStart, context.locate));
    }
  });

  return copy;
}
