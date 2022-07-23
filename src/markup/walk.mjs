import { repeat } from '../utils.mjs';
import { Expr } from './expr.mjs';

const NOT_ANCHORS = [
  'br', 'hr', 'wbr', 'area', 'html', 'head', 'title', 'base', 'meta', 'link', 'style', 'script', 'track', 'option',
  'embed', 'object', 'param', 'source', 'portal', 'svg', 'math', 'canvas', 'noscript', 'datalist', 'slot', '!doctype',
];

const NOT_SUPPORTED = [
  'acronym', 'applet', 'basefont', 'bgsound', 'big', 'blink', 'center', 'content', 'dir', 'font', 'frame', 'frameset', 'hgroup',
  'image', 'keygen', 'marquee', 'menuitem', 'nobr', 'noembed', 'noframes', 'plaintext', 'rb', 'rtc', 'shadow', 'spacer', 'strike', 'tt', 'xmp',
];

const HEAD_ELEMENTS = ['title', 'meta', 'link', 'base'];
const HTML_ELEMENTS = ['body', 'html'];

export function traverse(obj, parent, context, counter = 0) {
  const copy = [];

  obj.forEach(node => {
    const tokenStart = { ...node.position.start };

    if (node.type === 'element') {
      if (NOT_SUPPORTED.includes(node.tagName)) {
        throw new ReferenceError(`Element '${node.tagName}' should not be used`);
      }

      if ((!parent || parent.name !== 'head') && HEAD_ELEMENTS.includes(node.tagName)) {
        throw new ReferenceError(`Element '${node.tagName}' should appear within the 'head'`);
      }

      if (parent && parent.name !== 'html' && HTML_ELEMENTS.includes(node.tagName)) {
        throw new ReferenceError(`Element '${node.tagName}' cannot be nested inside '${parent.name}'`);
      }

      if (!NOT_ANCHORS.includes(node.tagName)) {
        if (!(node.tagName === 'input' && node.attributes.some(x => x.key === 'type' && x.value === 'hidden'))) {
          node.attributes.push({
            key: '@location',
            value: `${context.file}:${tokenStart.line + 1}:${tokenStart.column + 1}`,
          });
        }
      }

      if ((node.tagName === 'script' || node.tagName === 'style') && !node.attributes.some(x => x.key === 'src')) {
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

          if (node.tagName === 'script') context.response.scripts.push(fixedNode);
          if (node.tagName === 'style') context.response.styles.push(fixedNode);
          counter += 1;
        }
        return;
      }

      const newNode = {
        type: 'element',
        name: node.rawTagName,
        offset: tokenStart,
        attributes: node.attributes
          ? Expr.params(node.attributes, context.locate, tokenStart)
          : {},
      };

      newNode.elements = node.children
        ? traverse(node.children, newNode, context, counter)
        : undefined;

      Object.defineProperty(newNode, 'root', { value: parent || null });

      if (node.tagName === 'html') {
        context.response.markup.document = newNode.attributes;
        copy.push(...newNode.elements);
      } else if (node.tagName === 'head') {
        context.response.markup.metadata = newNode.elements;
      } else if (node.tagName === 'body') {
        context.response.markup.attributes = newNode.attributes;
        copy.push(...newNode.elements);
      } else if (node.tagName === '!doctype') {
        context.response.markup.doctype = newNode.attributes;
      } else if (node.rawTagName === 'fragment') {
        if (!newNode.attributes.name || context.response.fragments[newNode.attributes.name]) {
          throw new Error(`Fragment requires an unique name, given '${JSON.stringify(newNode.attributes)}'`);
        }
        context.response.fragments[newNode.attributes.name] = newNode;
        copy.push({ type: 'fragment', ref: newNode.attributes.name });
      } else {
        copy.push(newNode);
      }
    } else if (node.type === 'text' && node.content.trim().length) {
      copy.push(Expr.unwrap(node.content, tokenStart, context.locate));
    }
  });

  return copy;
}
