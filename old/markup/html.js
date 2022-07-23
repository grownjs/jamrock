import { encode, isVNode } from '../shared/utils.js';
import { enhance, scopes } from './utils.js';

const RE_QUOTES_REQUIRED = /[\t\n\f\r "'`=<>]/;
const RE_COMMENT_BLOCKS = /<!--[^]*?-->/g;
const RE_CODING_BLOCKS = /<(script|style)([^<>]*?)>([^]*?)<\/\1>/g;
const RE_MATCH_TAGS = /<(\w+)[^<>]*?\/?>/g;

const RE_SINGLE_SELECTOR = /(.+?)\s*([+>~]|$)/g;
const RE_EXCLUDED_PATTERNS = /^\s*(?:@media|@keyframes|to|from|@font-face|\d+%|\$@@)/;
const RE_ALL_SELECTORS_PATTERN = /(?:^|\})?\s*([^{}]+)(?=\s*[,{](?![{]))/g;
const RE_BACKUP_EXPRESSIONS = /(?<=:)[^{;}]*?(?=;)|\(.+?\)/g;
const RE_ESCAPE_GLOBALS = /:global\(([^()]+?)\)/g;
const RE_UNESCAPE_GLOBALS = /\$\(([^()]+?)\)/g;
const RE_COMMENTS_PATTERN = /\/\*.*?\*\//g;
const RE_ALL_PLACEHOLDERS = /@@/g;

const NOT_SCOPED_ELEMENTS = ['body', 'head', 'style', 'script'];

const SELF_CLOSE_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
];

export function stylesheet(ref, styles) {
  const backup = [];

  return styles.replace(RE_COMMENTS_PATTERN, '')
    .replace(RE_ESCAPE_GLOBALS, '$$($1)')
    .replace(RE_BACKUP_EXPRESSIONS, _ => {
      backup.push(_);
      return '@@';
    })
    .replace(RE_ALL_SELECTORS_PATTERN, ($0, $1) => {
      if (RE_EXCLUDED_PATTERNS.test($1)) {
        return $0;
      }

      const selectors = $1.split(',');
      const scoped = selectors.map(s => {
        s = s.trim();
        if (s.indexOf(':global ') === 0) return s.substr(8);
        return s.replace(RE_SINGLE_SELECTOR, (_, sel, sub) => {
          if (sel.includes(' $@@')) {
            if (sel.charAt() === ' ') return _;
            return sel.replace(' $@@', `[data-${ref}] $@@`);
          }
          if (sel.includes('[') || sel.includes(':')) {
            return `${sel.replace(/[[:]/, `[data-${ref}]$&`)} ${sub}`;
          }
          return `${sel}[data-${ref}] ${sub}`;
        });
      });

      return $0.replace($1, scoped.join(', ')).replace(/\s,/g, ',');
    })
    .replace(RE_ALL_PLACEHOLDERS, () => backup.shift())
    .replace(RE_UNESCAPE_GLOBALS, '$1');
}

export function metadata(tree, scope) {
  const components = [];
  const fragments = {};
  const scripts = [];
  const styles = [];
  const markup = {
    content: [],
    metadata: [],
  };

  function drop(obj, parent) {
    parent.elements[parent.elements.indexOf(obj)] = null;
  }

  function wrap(ref, parent) {
    if (parent.elements) {
      parent.elements.forEach(x => x && wrap(ref, x));
    }

    if (parent.type === 'element' && !NOT_SCOPED_ELEMENTS.includes(parent.name)) {
      parent.attributes = parent.attributes || {};
      parent.attributes[`data-${scope[0]}`] = scope[1];
    }
  }

  function next(obj, callback) {
    if (obj.elements) {
      obj.elements.forEach(x => callback(x, obj));
    }
  }

  let inBody;
  function walk(obj, parent) {
    if (obj.name === 'html') {
      drop(obj, parent);
      markup.document = obj.attributes;
      if (obj.elements && !obj.elements.some(x => x.name === 'body')) {
        markup.content = obj.elements;
      }
    } else if (obj.name === 'head') {
      drop(obj, parent);
      markup.metadata = obj.elements;
    } else if (obj.name === 'body') {
      drop(obj, parent);
      markup.attributes = obj.attributes;
      markup.content = obj.elements;
      inBody = true;
    } else if (obj.doctype) {
      markup.doctype = obj.doctype;
    } else if (!inBody && obj.name === 'root') {
      markup.content = obj.elements;
      inBody = true;
    } else if (obj.name === 'fragment') {
      if (!obj.attributes || !obj.attributes.id || fragments[obj.attributes.id]) {
        throw new Error(`Fragment requires an unique id, given '${JSON.stringify(obj.attributes)}'`);
      }
      fragments[obj.attributes.id] = obj;
    } else if (obj.name === 'component') {
      if (!(obj.attributes && obj.attributes.src)) {
        throw new Error(`Missing or invalid component 'src', given ${JSON.stringify(obj.attributes)}`);
      }
      if (!components.includes(obj.attributes.src)) {
        components.push(obj.attributes.src);
      }
    }
    next(obj, walk);
  }
  walk(tree);

  if (scope) {
    wrap(scope, { elements: markup.content });
  }

  return {
    components, fragments, scripts, styles, markup, scope,
  };
}

export function attributes(data) {
  if (!data) return '';

  return Object.entries(scopes(data)).reduce((memo, [key, value]) => {
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

export function taggify(vnode, buffer) {
  if (!vnode || typeof vnode !== 'object') return vnode;
  if (typeof vnode[0] === 'string' && vnode[0].match(/^[\w:]+$/) && typeof vnode[1] === 'object') {
    if (Array.isArray(vnode[1])) {
      return vnode.map(x => taggify(x, buffer)).join('');
    }

    // FIXME: some bits cannot be serialized by other approaches,
    // instead, they should be normalized prior any render?
    const props = { ...vnode[1] };

    let tagName = vnode[0];
    if (vnode[0] === 'fragment') {
      if (props.$key) return buffer[props.$key];
      if (props['@html']) return props['@html'];
      tagName = props.tag || 'x-fragment';
      delete props.tag;
    }

    if (vnode[0] === 'template') {
      return vnode.length > 1 ? taggify(vnode.slice(2), buffer) : '';
    }

    if (props['@html']) {
      vnode[2] = [props['@html']];
      vnode.length = 3;
    }

    let tag = `<${tagName}${attributes(props)}`;
    if (SELF_CLOSE_TAGS.includes(tagName)) tag += ' />';
    else tag += `>${vnode.length > 1 ? taggify(vnode.slice(2), buffer) : ''}</${tagName}>`;
    return tag;
  }
  if (Array.isArray(vnode)) {
    return vnode.map(x => (typeof x === 'string' ? encode(x, true) : taggify(x, buffer))).join('');
  }
  return vnode;
}

export function serialize(vnode, parent, callback) {
  if (isVNode(vnode)) {
    const set = [];
    const name = vnode[0];
    const props = vnode[1] = scopes(vnode[1], null, set);

    const children = name !== 'textarea'
      ? serialize(vnode.slice(2), { name, props }, callback)
      : vnode.slice(2);

    vnode.length = 2;
    vnode.push(...children);

    enhance(vnode, parent);
    if (typeof callback === 'function') {
      callback(vnode, set);
    }
    return vnode;
  }

  if (Array.isArray(vnode)) {
    return vnode.reduce((memo, cur) => {
      if (Array.isArray(cur) && !cur.length) return memo;
      if (typeof cur !== 'undefined' && cur !== null && cur !== false) {
        memo.push(serialize(cur, parent, callback));
      }
      return memo;
    }, []);
  }

  return vnode;
}

// TODO: consider using himalaya to extract these?
// I think it woulld work fine... because, after all we're
// mapping the whole AST... so, a single pass would suffice for all!
export function parts(tpl, file) {
  const html = tpl;
  const names = [];
  const styles = [];
  const scripts = [];

  let template = html;
  let offset = 0;
  template = template.replace(RE_COMMENT_BLOCKS, _ => _.replace(/\S/g, ' '));
  template = template.replace(RE_CODING_BLOCKS, (_, tag, attr, body) => {
    const diff = attr.length + tag.length + 2;
    const pos = html.indexOf(_.split('\n')[0], offset) + diff;
    const scoped = attr.includes(' scoped');
    offset += pos;

    if (tag === 'script') {
      if (attr.includes(' src')) {
        return _;
      }

      const shared = /\scontext=(["'])?module\1/.test(attr);
      const isModule = /\stype=(["'])?module\1/.test(attr);
      const isMain = !shared && !isModule && !scoped;

      body = Array(diff + 1).join(' ') + body;

      scripts.push({
        attr, body, offset, shared, scoped, isMain, isModule,
      });
    }

    if (tag === 'style') {
      let type = attr.match(/\stype=(["'])?text\/(\w+)\1/);
      type = type || attr.match(/\slang=(["'])?(\w+)\1/);

      const language = type && type[2];

      styles.push({
        attr, body, offset, scoped, language,
      });
    }

    return _.replace(/\S/g, ' ');
  });

  template.replace(RE_MATCH_TAGS, (_, name) => {
    if (!names.includes(name)) names.push(name);
    return _;
  });

  return {
    file, html, names, styles, scripts, template,
  };
}
