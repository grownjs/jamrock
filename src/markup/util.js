const { blocks: expressions } = require('eslint-plugin-jamrock/util');

const {
  isVNode, inspect, identifier,
} = require('../util');

const __ANCHOR__ = Symbol('#anchor');

function compact(chunk) {
  if (!chunk || typeof chunk !== 'object') return chunk;
  if (Array.isArray(chunk)) return chunk.map(compact);
  if (chunk.type !== 'element') return chunk.text;
  return [chunk.name, chunk.attributes, compact(chunk.elements)];
}

function clean(code) {
  code = code.replace(/[\s+]*\$\$\.\$\(@html (.*?)\)[\s+]*/g, ', $$$$.h($1),');
  code = code.replace(/[\s+]*\$\$\.\$\(@raw (.*?)\)[\s+]*/g, ', ($1),');
  code = code.replace(/\$\$\.\$\(@debug (.+?)\)/gm, '$$$$.d({$1})');
  code = code.replace(/"\s*\\n(\s*)(?:\\n|\s)*"/g, '"\\n$1"');
  code = code.replace(/^\s*"\\n\s*",|,\n"\\n",$/g, '');
  return code;
}

function blocks(chunk) {
  const { locations } = expressions(chunk);

  return locations;
}

function scopes(props, raw, fn) {
  if (raw && !props) {
    props = { '@html': raw };
  } else if (props) {
    const css = [];

    Object.keys(props).forEach(key => {
      if (key.indexOf('bind:') === 0) {
        props[`data-${key.replace(':', '-')}`] = props[key];
        props.name = props.name || props[key];
        delete props[key];
      }

      if (key.indexOf('class:') === 0) {
        if (props[key]) {
          props.class = `${props.class || ''} ${key.substr(6)}`.trim();
        }
        delete props[key];
      }

      if (key.indexOf('style:') === 0) {
        css.push(`${key.substr(6).replace(/[A-Z]/g, _ => `-${_.toLowerCase()}`)}: ${props[key]}`);
        delete props[key];
      }

      if (key.indexOf('on') === 0 && typeof props[key] !== 'function') {
        props[`data-${key}`] = props[key];
        delete props[key];
      }

      if (key.indexOf('data-use-') === 0 && typeof props[key] === 'function') {
        fn.push([props[key], key.substr(9)]);
        delete props[key];
      }
    });

    if (props.style || css.length) {
      props.style = css.concat(props.style || null).filter(Boolean).join('; ');
    }

    if (!props.class) delete props.class;
    if (raw) props['@html'] = raw;
  }
  return props;
}

function enhance(vnode, parent) {
  const props = vnode[1] = vnode[1] || {};
  const tag = vnode[0];

  if (tag === 'fragment' && props.$src) {
    const { $blocks } = props;

    props.$children = vnode.slice(2);
    props.$target = $blocks[props.$src];
    props.$key = (props.$props && props.$props.key) || identifier();
  }

  if (tag === 'textarea' && props.value) {
    props['@html'] = props.value;
    delete props.value;
  }

  if (tag === 'option' && parent) {
    parent.props = parent.props || {};

    const txt = [].concat(vnode[2] || []).join('');
    const test = props.value || txt.trim();
    const value = parent._value || parent.props.value;

    parent._value = value;
    delete parent.props.value;

    if (value === test) props.selected = true;
  }

  if (tag === 'form' && (props['@put'] || props['@patch'] || props['@delete'])) {
    let method;
    if (props['@put']) method = 'PUT';
    if (props['@patch']) method = 'PATCH';
    if (props['@delete']) method = 'DELETE';

    delete props['@put'];
    delete props['@patch'];
    delete props['@delete'];

    props.method = 'POST';
    vnode[2].push(['input', { type: 'hidden', name: '_method', value: method }]);
  }

  if (props['data-onclick']) {
    props.name = props.name || '_cta';
    props.value = props.value || props['data-onclick'];
    props['data-onclick'] = '';
  }

  if (tag === 'input' && props.type === 'file') {
    delete props.value;
  }

  if (tag === 'tag') {
    vnode[0] = props.use;
    delete props.use;
  }
}

function serialize(vnode, parent, callback) {
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

module.exports = {
  clean,
  blocks,
  scopes,
  inspect,
  compact,
  serialize,
  __ANCHOR__,
};
