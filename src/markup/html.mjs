import { findAll } from 'somedom/ssr';
import { parse, stringify } from 'css';

import { Expr } from './expr.mjs';
import { fixedAdapter } from './adapter.mjs';
import { encode, enhance, extend } from './utils.mjs';
import { isArray, isVNode, stack } from '../utils.mjs';

const RE_QUOTES_REQUIRED = /[\t\n\f\r "'`=<>]/;

const SELF_CLOSE_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
];

const UNSCOPED_ELEMENTS = ['head', 'meta', 'base', 'link', 'title', 'style', 'script'];

export function attrs(data) {
  if (!data) return '';

  return Object.entries(data).reduce((memo, [key, value]) => {
    if (key === '@html') return memo;

    if (key.charAt() === '@') {
      key = key.replace('@', 'data-');
      value = typeof value === 'string'
        ? value.replace('@', 'data-')
        : value;
    }

    if (key.charAt() === ':') {
      key = key.substr(1);
    }

    if (
      (typeof value !== 'undefined' && value !== null && value !== false)
      && !(typeof value === 'function' || (typeof value === 'object' && value !== null))
    ) {
      const flag = !(value === 'true' || value === true || value === key);
      const quoted = RE_QUOTES_REQUIRED.test(value)
        ? `"${value.replace(/"/g, '&quot;')}"`
        : value;

      memo.push(` ${key}${flag ? `=${quoted === '' ? '""' : quoted}` : ''}`);
    }
    return memo;
  }, []).join('');
}

export function specify(ref, value) {
  if (value.includes(']')) {
    const offset = value.lastIndexOf(']');
    const prefix = value.substr(0, offset + 1);
    const suffix = value.substr(offset + 1);

    return `${prefix}.${ref}${suffix}`;
  }

  const offset = value.indexOf(':');

  if (offset === -1) {
    return `${value}.${ref}`;
  }

  const prefix = value.substr(0, offset);
  const suffix = value.substr(offset);

  return `${prefix}.${ref}${suffix}`;
}

export function scopify(ref, styles, children, filepath) {
  const css = styles.trim();

  try {
    const ast = parse(css, { source: filepath });

    ast.stylesheet.rules.forEach(chunk => {
      const rules = chunk.selectors || [];
      const parents = rules.map(x => x.split(' ')[0].split('::')[0]);
      const subnodes = rules.map(x => x.split(' ').pop().split('::')[0]);
      const selectors = [...new Set(parents.concat(subnodes))];

      selectors.forEach(rule => {
        const matches = findAll(rule, children, fixedAdapter);

        if (matches) {
          chunk.selectors = chunk.selectors.map(selector => {
            if (!selector.includes(ref)) {
              const tokens = selector.split(' ');
              const first = tokens.shift();
              const last = tokens.pop();

              [first, last].forEach((sel, i) => {
                if (!sel) return;
                sel = specify(ref, sel);
                if (i === 0) tokens.unshift(sel);
                else tokens.push(sel);
              });

              if (tokens.length === 1) {
                tokens[0] = specify(ref, tokens[0]);
              }
              return tokens.join(' ');
            }
            return selector;
          });
          matches.forEach(node => {
            if (node.matches) return;
            if (!UNSCOPED_ELEMENTS.includes(node.name)) {
              const classNames = node.attributes.class || '';

              node.matches = true;

              if (classNames instanceof Expr) {
                classNames.concat(` ${ref}`);
              } else {
                node.attributes.class = `${node.attributes.class || ''} ${ref}`.trim();
              }
            }
          });
        }
      });
    });

    return stringify(ast);
  } catch (e) {
    if (e.filename) {
      e.message = `${e.reason} at ${e.filename}:${e.line}:${e.column}`;
      e.stack = stack(css, e.line, e.column);
    }
    throw e;
  }
}

export function taggify(vnode, callback) {
  if (typeof vnode === 'undefined' || vnode === null) return;
  if (!isArray(vnode)) {
    return typeof callback === 'function' ? callback(encode(vnode, true)) : encode(vnode, true);
  }
  if (isVNode(vnode)) {
    const props = { ...vnode[1] };

    let tagName = vnode[0];
    if (vnode[0] === 'fragment') {
      if ('@html' in props) {
        if (typeof callback !== 'function') {
          return props['@html'];
        }
        callback(props['@html']);
        return;
      }

      if (props.tag) {
        tagName = props.tag;
        props['@fragment'] = props.name;
        props['@interval'] = props.interval;
        props['@timeout'] = props.timeout;
        props['@limit'] = props.limit;

        delete props.interval;
        delete props.timeout;
        delete props.limit;
        delete props.name;
        delete props.tag;
      } else {
        tagName = 'x-fragment';
      }
    }

    if (vnode[0] === 'template') {
      if (vnode.length > 1) {
        if (typeof callback !== 'function') {
          return taggify(vnode[2]);
        }
        taggify(vnode[2], callback);
      }
      return '';
    }

    let raw;
    if (props['@html']) {
      tagName = props['@tag'] || vnode[0];
      vnode[2] = props['@html'];
      vnode.length = 3;
      raw = true;
    }

    let tag = `<${tagName}${attrs(props)}`;
    if (SELF_CLOSE_TAGS.includes(tagName)) tag += ' />';
    else tag += '>';

    if (typeof callback !== 'function') {
      return `${tag}${raw ? vnode[2] : taggify(vnode[2])}</${tagName}>`;
    }
    callback(tag);
    if (raw) {
      callback(vnode[2]);
    } else if (vnode.length > 1) {
      taggify(vnode[2], callback);
    }
    if (!SELF_CLOSE_TAGS.includes(tagName)) callback(`</${tagName}>`);
    return;
  }
  if (typeof callback !== 'function') {
    return vnode.map(chunk => (typeof chunk === 'string'
      ? encode(chunk, true) : taggify(chunk))).join('');
  }
  vnode.forEach(chunk => {
    if (typeof chunk === 'string') callback(encode(chunk, true));
    else taggify(chunk, callback);
  });
}

export function serialize(vnode, parent, callback) {
  if (isVNode(vnode)) {
    const set = [];
    const name = vnode[0];
    const props = vnode[1] = extend(vnode[1] || {}, set);

    const children = name !== 'textarea'
      ? serialize(vnode[2], { name, props }, callback)
      : vnode[2];

    vnode[2] = children;
    vnode.length = 3;

    enhance(vnode, parent);
    if (typeof callback === 'function') {
      callback(vnode, set);
    }
    return vnode;
  }

  if (isArray(vnode)) {
    return vnode.reduce((memo, cur) => {
      if (isArray(cur) && !cur.length) return memo;
      if (typeof cur !== 'undefined' && cur !== null && cur !== false) {
        memo.push(serialize(cur, parent, callback));
      }
      return memo;
    }, []);
  }

  return vnode;
}
