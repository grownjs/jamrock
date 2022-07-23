import { repeat, isArray, isUpper, isScalar } from '../utils.mjs';
import { Expr } from './expr.mjs';

export function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function encode(value, unsafe) {
  if (!isScalar(value)) return Object.prototype.toString.call(value);
  if (typeof value !== 'string') return value.toString();

  return unsafe
    ? value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function compact(chunk) {
  if (!chunk || typeof chunk !== 'object') return chunk;
  if (isArray(chunk)) return chunk.map(compact);
  if (chunk.type === 'text') return chunk.content;
  return [chunk.name, chunk.attributes, compact(chunk.elements)];
}

export function reduce(tree, isAsync, children, indent = 0) {
  if (isArray(tree)) {
    return reduce({ elements: tree }, isAsync, children, indent);
  }

  const _tabs = repeat('\t', indent + 1);
  const _async = isAsync ? 'async ' : '';
  return tree.elements.reduce((memo, node) => {
    const component = node.name && children.find(x => x.name.includes(node.name));
    const isClient = component && component.client;
    const _sync = isAsync ? 'async ' : '';

    let slots = '';
    if (node.slots) {
      slots = Object.keys(node.slots).map(key => {
        return `\n${_tabs}  '${key}': ${_sync}function ($$ctx, $$) {\nwith ($$ctx) return [${node.slots[key].template}]; } `;
      }).join(',');
    }

    if (['element', 'fragment'].includes(node.type)) {
      const body = node.elements ? `[${reduce(node, isAsync && !isClient, children, indent + 1).trim()}]` : '[]';
      const props = node.attributes ? `${Expr.props(node.attributes, `${_tabs}\t`)}\n${_tabs}` : '';
      const prefix = node.offset ? `/*!#${node.offset.line + 1}:${node.offset.column + 1}*/` : '';
      const found = component ? `'${component.found}'` : 'null';
      const _await = isAsync ? 'await ' : '';

      if (node.type === 'fragment') {
        memo.push(`${_tabs}${prefix} $$.e('fragment', ${_await}$$.a(this, '${node.ref}'), ${_await}$$.fn(this.chunks['${node.ref}']))`);
      } else if (isUpper(node.name)) {
        memo.push(`${_tabs}${prefix} ${_await}$$.block(${node.name}, ${found}, {${props}}, {${slots}}, ${!isClient ? _async : ''}() => ${body})`);
      } else if (node.name === 'slot') {
        memo.push(`${_tabs}${prefix} ${_await}$$.slot('${node.attributes.name || 'default'}', ${_async}() => ${body})`);
      } else if (node.name === 'self') {
        memo.push(`${_tabs}${prefix} ${_await}$$.self({${props}}, {${slots}}, ${_async}() => ${body})`);
      } else {
        memo.push(`${_tabs}${prefix} $$.e('${node.name}', {${props}}, ${body})`);
      }
    } else if (node.type === 'code') {
      memo.push(node.content.wrap(_tabs, isAsync));
    } else if (node.type === 'text') {
      memo.push(_tabs + JSON.stringify(node.content));
    } else if (node instanceof Expr) {
      memo.push(node.wrap(_tabs, isAsync));
    }
    return memo;
  }, []).join(',\n');
}

export function extract(chunk, isAsync, children) {
  if (!isArray(chunk)) {
    return extract(chunk.elements || [], isAsync, children);
  }

  return chunk.reduce((frags, node) => {
    if (node !== null) {
      if (node.attributes && node.attributes.slot) {
        const name = node.attributes.slot;

        delete node.attributes.slot;
        frags[name] = { children: compact(node), template: reduce([node], isAsync, children) };

        delete node.name;
        delete node.elements;
        delete node.attributes;

        node.type = 'text';
        node.content = '';
      }

      if (node.elements) {
        if (isUpper(node.name)) {
          node.slots = extract(node.elements, isAsync, children);
        } else {
          Object.assign(frags, extract(node.elements, isAsync, children));
        }
      }
    }
    return frags;
  }, {});
}

export function enhance(vnode, parent) {
  const props = vnode[1] = vnode[1] || {};
  const tag = vnode[0];

  if (tag === 'textarea' && props.value) {
    props['@html'] = encode(props.value);
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

  if (props['@on:click']) {
    props.name = props.name || '_cta';
    props.value = props.value || props['@on:click'];
    props['@on:click'] = true;
  }

  if (tag === 'input' && props.type === 'file') {
    delete props.value;
  }

  if (tag === 'tag') {
    vnode[0] = props.use;
    delete props.use;
  }
}

export function extend(props, fn) {
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

    if (key.indexOf('on') === 0 && typeof props[key] === 'function') {
      props[`@${key.replace('on', 'on:')}`] = props[key].name;
      delete props[key];
    }

    if (key.indexOf('data-use-') === 0 && typeof props[key] === 'function') {
      fn.push([props[key], key.substr(9)]);
      delete props[key];
    }
  });

  if (props.style || css.length) {
    props.style = css.concat(props.style || []).filter(Boolean).join('; ');
  }

  if (!props.class) delete props.class;
  return props;
}
