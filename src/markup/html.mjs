import { parse, stringify } from 'css';

import { Expr } from './expr.mjs';
import { fixedAdapter } from './adapter.mjs';
import { enhance, extend } from './utils.mjs';
import { str, ents } from '../render/hooks.mjs';
import { Is, stack, findAll } from '../utils/server.mjs';

const RE_QUOTES_REQUIRED = /[\s"'`=</_:>-]/;

const SELF_CLOSE_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
];

const UNSCOPED_ELEMENTS = ['head', 'meta', 'base', 'link', 'title', 'style', 'script'];

export function attrs(data) {
  if (!data) return '';

  const reset = [];
  const props = Object.entries(data).reduce((memo, [key, value]) => {
    if (key === '@html') return memo;

    if (key.charAt() === '@') {
      key = key.replace('@', 'data-');
      value = Is.str(value)
        ? value.replace('@', 'data-')
        : value;
    }

    if (key.charAt() === ':') {
      key = key.substr(1);
      reset.push(key);
      memo.push(` data-is:${key}`);
    }

    if (
      (!Is.not(value) && value !== false)
      && !(Is.func(value) || Is.plain(value))
    ) {
      const truthy = value === true || value === 'true' || value === key;
      const unsafe = value === '' || key.includes(':');
      const quotes = RE_QUOTES_REQUIRED.test(value);

      value = (truthy && (unsafe ? 'true' : key)) || String(value);
      value = quotes || unsafe ? `"${value.replace(/"/g, '&quot;')}"` : value;
      memo.push(` ${key}${!truthy || unsafe ? `=${value}` : ''}`);
    }
    return memo;
  }, []);

  if (reset.length > 0) {
    props.unshift(' data-reset');
  }
  return props.join('');
}

export function style(chunk) {
  const css = stringify({ stylesheet: { rules: [chunk] } }, { compress: true });

  return css;
}

export function rulify(css, filepath) {
  const ast = parse(css, { source: filepath });
  const out = [];

  ast.stylesheet.rules.forEach(chunk => {
    if (chunk.type !== 'rule') {
      if (chunk.rules) {
        const rules = [];

        chunk.rules.forEach(rule => {
          rules.push(style(rule));
        });

        out.push([`@${chunk.type} ${chunk[chunk.type]}`, rules]);
      } else {
        out.push(style(chunk));
      }
      return;
    }

    out.push(style(chunk));
  });
  return out;
}

export function specify(ref, value, _class) {
  if (value.includes(']')) {
    const offset = value.lastIndexOf(']');
    const prefix = value.substr(0, offset + 1);
    const suffix = value.substr(offset + 1);

    return _class ? `${prefix}.${ref}${suffix}` : `${prefix}:where(.${ref})${suffix}`;
  }

  const offset = value.indexOf(':');

  if (offset === -1) {
    return _class ? `${value}.${ref}` : `${value}:where(.${ref})`;
  }

  const prefix = value.substr(0, offset);
  const suffix = value.substr(offset);

  return _class ? `${prefix}.${ref}${suffix}` : `${prefix}:where(.${ref})${suffix}`;
}

export function classify(ref, _class, chunk, children) {
  const rules = chunk.selectors || [];
  const parents = rules.map(x => x.split(/[\s~+>]/)[0].split('::')[0]);
  const subnodes = rules.map(x => x.split(/[\s~+>]/).pop().split('::')[0]);
  const selectors = [...new Set(parents.concat(subnodes))];

  selectors.forEach(rule => {
    const matches = findAll(rule, children, fixedAdapter);

    if (matches) {
      chunk.selectors = chunk.selectors.map(selector => {
        if (!selector.includes(ref) && matches.length > 0) {
          const tokens = selector.split(' ');
          const first = tokens.shift();
          const last = tokens.pop();

          [first, last].forEach((sel, i) => {
            if (!sel) return;
            sel = specify(ref, sel, _class);
            if (i === 0) tokens.unshift(sel);
            else tokens.push(sel);
          });

          if (_class && tokens.length === 1) {
            tokens[0] = specify(ref, tokens[0], _class);
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
}

export function scopify(ref, _class, styles, children, filepath) {
  const css = styles.trim();

  try {
    const ast = parse(css, { source: filepath });
    const out = [];

    ast.stylesheet.rules.forEach(chunk => {
      if (chunk.type !== 'rule') {
        if (chunk.rules) {
          const rules = [];

          chunk.rules.forEach(rule => {
            classify(ref, _class, rule, children);
            rules.push(style(rule, true));
          });

          out.push([`@${chunk.type} ${chunk[chunk.type]}`, rules]);
        } else {
          out.push(style(chunk));
        }
        return;
      }

      classify(ref, _class, chunk, children);
      out.push(style(chunk, true));
    });

    return out;
  } catch (e) {
    if (e.filename) {
      e.message = `${e.reason} at ${e.filename}:${e.line}:${e.column}`;
      e.stack = stack(css, e.line, e.column);
    }
    throw e;
  }
}

export function taggify(vnode, callback) {
  if (Is.not(vnode)) return;
  if (!Is.arr(vnode)) {
    return Is.func(callback) ? callback(str(vnode)) : str(vnode);
  }
  if (Is.vnode(vnode)) {
    const props = { ...vnode[1] };

    let tagName = vnode[0];
    if (vnode[0] === 'fragment') {
      if ('@html' in props) {
        if (!Is.func(callback)) {
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
        if (!Is.func(callback)) {
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

    if (!Is.func(callback)) {
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
  if (!Is.func(callback)) {
    return vnode.map(chunk => (Is.str(chunk)
      ? ents(chunk) : taggify(chunk))).join('');
  }
  vnode.forEach(chunk => {
    if (Is.str(chunk)) callback(ents(chunk));
    else taggify(chunk, callback);
  });
}

export function serialize(vnode, parent, callback, fragments) {
  if (Is.vnode(vnode)) {
    const hooks = [];
    const name = vnode[0];
    const props = vnode[1] = extend(vnode[0], { ...vnode[1] }, hooks);

    if (Is.vnode(vnode[2])) {
      vnode[2] = [vnode[2]];
    }

    const children = name !== 'textarea'
      ? serialize(vnode[2], { name, props }, callback, fragments)
      : vnode[2];

    vnode[2] = children;
    vnode.length = 3;

    enhance(vnode, parent);
    if (Is.func(callback)) {
      callback(vnode, hooks);
    }
    if (fragments && (vnode[0] === 'fragment' || vnode[1]['@fragment'])) {
      // FIXME: capture and update... but how?
      // fragments[vnode[1]['@fragment']] = vnode;
      // return null;
    }
    return vnode;
  }

  if (Is.arr(vnode)) {
    return vnode.reduce((memo, cur) => {
      if (Is.arr(cur) && !cur.length) return memo;
      memo.push(serialize(cur, parent, callback, fragments));
      return memo;
    }, []);
  }

  return vnode;
}
