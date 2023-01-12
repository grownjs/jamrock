import { Expr } from './expr.mjs';
import { ents } from '../render/hooks.mjs';
import { Is, repeat, encodeText } from '../utils/server.mjs';

export const RE_JS_EXPR = /[[?:=+*!(/.-]/;
export const RE_SAFE_PROPS = /^[$\w]+$/;

export function encode(value) {
  return encodeText(value, { quotes: false, unsafe: true });
}

export function compact(chunk) {
  if (!chunk || typeof chunk !== 'object') return chunk;
  if (Is.arr(chunk)) return chunk.map(compact);
  if (chunk.type === 'text') return chunk.content;
  return [chunk.name, chunk.attributes, compact(chunk.elements)];
}

export function reduce(tree, context, indent = 0) {
  if (Is.arr(tree)) {
    return reduce({ elements: tree }, context, indent);
  }

  const isAsync = context === 'module';
  const isStatic = context === 'static';

  const _tabs = repeat('\t', indent + 1);
  const _async = isAsync ? 'async ' : '';
  const _opened = [];

  const result = tree.elements.reduce((memo, node) => {
    const _sync = isAsync ? 'async ' : '';

    let scope = '[]';
    let slots = '';
    if (node.slots) {
      scope = JSON.stringify([node.props, node.scope]);
      slots = Object.keys(node.slots).map(key => {
        return `\n${_tabs}  '${key}': ${_sync}() => [${node.slots[key].template}] /*slot*/`;
      }).join(',');
    }

    if (['element', 'fragment'].includes(node.type)) {
      const body = node.elements && node.type !== 'fragment' ? `[${reduce(node, context, indent + 1).trim()}]` : '[]';
      const props = node.attributes ? `${Expr.props(node.attributes, `${_tabs}\t`)}\n${_tabs}` : '';
      const prefix = node.offset ? `\n/*!#${node.offset.start.line + 1}:${node.offset.start.column + 1}*/` : '';
      const _await = isAsync ? 'await ' : '';

      if (node.type === 'fragment') {
        if (node.attributes.frame) {
          memo.push(`${_tabs}${prefix} $$.e('fragment', ${_await}$$.a(this, '${node.ref}'), [])`);
        } else {
          memo.push(`${_tabs}${prefix} $$.e('fragment', ${_await}$$.a(this, '${node.ref}'), ${_await}$$.fn(this, '${node.ref}'))`);
        }
      } else if (Is.upper(node.name)) {
        // eslint-disable-next-line max-len
        memo.push(`${_tabs}${prefix} ${_await}$$.block(${node.name}, '${node.name}', {${props}}, ${scope}, {${slots}}, ${body !== '[]' ? `${_async}() => ${body}` : 'null'} /* ${node.name} */)`);
      } else if (node.name === 'slot') {
        memo.push(isStatic
          ? `${_tabs}${prefix} $$.slot('${node.attributes.name || 'default'}', () => ${body})`
          : `${_tabs}${prefix} ${_await}$$.slot('${node.attributes.name || 'default'}', ${_async}() => ${body})`);
      } else if (node.name === 'self') {
        memo.push(`${_tabs}${prefix} ${_await}$$.self({${props}}, {${slots}}, ${_async}() => ${body})`);
      } else {
        memo.push(`${_tabs}${prefix} $$.e('${node.name}', {${props}}, ${body})`);
      }
    } else if (node.type === 'text') {
      if (node.content.trim().length > 0) memo.push(_tabs + JSON.stringify(node.content));
    } else if (node.type === 'code') {
      memo.push(node.content.wrap(_tabs, isAsync));
    } else if (node instanceof Expr) {
      memo.push(node.wrap(_tabs, isAsync, null, (token, position) => {
        if (token.content.open) {
          _opened.push([token.content.tag, position]);
        } else if (_opened.length > 0) {
          const [last, prev] = _opened.pop();
          const end = (last === 'if' || last === 'el') ? '{/if}' : '{/each}';

          if (token.type !== 'code' && last !== token.content.tag) {
            throw new SyntaxError(`Unpaired ${end} after ${prev.line + 1}:${prev.column + 1} (given ${token.content.expr})`);
          }
        }
      }));
    }
    return memo;
  }, []).join(',');

  if (_opened.length > 0) {
    const [last, token] = _opened[_opened.length - 1];
    const end = (last === 'if' || last === 'el') ? '{/if}' : '{/each}';

    throw new SyntaxError(`Unpaired ${end} after ${token.line + 1}:${token.column + 1}`);
  }
  return result;
}

export function extract(chunk, context, locations) {
  if (!Is.arr(chunk)) {
    return extract(chunk.elements || [], context, locations);
  }

  return chunk.reduce((frags, node) => {
    if (node !== null && !(node instanceof Expr)) {
      if (context === 'static' && (node.name === 'self' || node.name === 'fragment' || Is.upper(node.name))) {
        throw new ReferenceError(`Element '${node.name}' is not allowed on static components`);
      }

      if (node.attributes && node.attributes.slot) {
        const name = node.attributes.slot;

        delete node.attributes.slot;
        frags[name] = { children: compact(node), template: reduce([node], context) };

        delete node.name;
        delete node.elements;
        delete node.attributes;

        node.type = 'text';
        node.content = '';
      }

      if (node.elements) {
        const isComponent = Is.upper(node.name);

        if (isComponent || node.type === 'fragment') {
          node.scope = [...new Set(locations
            .filter(x => x.offset[0] > node.offset.close && x.offset[0] < node.offset.end)
            .reduce((memo, k) => memo.concat(k.locals.map(u => u.name)), []))];
        }

        if (isComponent) {
          node.slots = extract(node.elements, context, locations);
          node.props = Object.keys(node.attributes).filter(k => RE_SAFE_PROPS.test(k));
        } else {
          Object.assign(frags, extract(node.elements, context, locations));
        }
      }
    }
    return frags;
  }, {});
}

export function enhance(vnode, parent) {
  const props = vnode[1] = vnode[1] || {};
  const name = vnode[0];

  if (name === 'textarea' && props.value) {
    props['@html'] = ents(props.value);
    delete props.value;
  }

  if (name === 'option' && parent) {
    parent.props = parent.props || {};

    const txt = [].concat(vnode[2] || []).join('');
    const test = props.value || txt.trim();
    const value = parent._value || parent.props.value;

    parent._value = value;
    delete parent.props.value;

    if (value === test) props.selected = true;
  }

  if (name === 'form') {
    if (props['@multipart']) {
      props.enctype = 'multipart/form-data';
      props.method = props.method || 'POST';

      delete props['@multipart'];
    }

    if (props['@on:submit']) {
      vnode[2].unshift(['input', { type: 'hidden', name: '_action', value: props['@on:submit'] }]);
      props['@patch'] = true;
      delete props['@on:submit'];
    }

    if (props['@put']) props.method = 'PUT';
    if (props['@patch']) props.method = 'PATCH';
    if (props['@delete']) props.method = 'DELETE';

    delete props['@put'];
    delete props['@patch'];
    delete props['@delete'];

    if (['PUT', 'PATCH', 'DELETE'].includes(props.method)) {
      vnode[2].unshift(['input', { type: 'hidden', name: '_method', value: props.method }]);
      props.method = 'POST';
    }
  }

  if (props['@on:click']) {
    props.name = props.name || '_action';
    props.value = props.value || props['@on:click'];
    props['@on:click'] = true;
  }

  if (name === 'input' && props.type === 'file') {
    delete props.value;
  }

  if (name === 'fragment') {
    if (props.tag) {
      vnode[0] = props.tag;
      props['@fragment'] = props.name;
      props['@interval'] = props.interval;
      props['@timeout'] = props.timeout;
      props['@limit'] = props.limit;

      delete props.interval;
      delete props.timeout;
      delete props.limit;
      delete props.name;
      delete props.tag;
    }
    if (props.name) {
      vnode[0] = 'x-fragment';
    }
    if (props.frame) {
      vnode[1]['@frame'] = Is.str(props.frame) ? props.frame : null;
    }
  } else if (props.key && name !== 'form') {
    props['@key'] = props.key;
    delete props.key;
  }

  if (name === 'element') {
    vnode[0] = props.tag;
    delete props.tag;
  }
}

export function extend(tagName, props, fn) {
  const css = [];

  Object.keys(props).forEach(key => {
    if (key.indexOf('bind:') === 0) {
      if (!['form', 'input', 'select', 'textarea'].includes(tagName)) {
        throw new TypeError(`Element ${tagName} does not support bindings`);
      }

      props.name = props.name || props[key];
      props[`@${key}`] = props[key];
      props['@binding'] = true;
      delete props[key];
    }

    if (key.indexOf('@ws:') === 0) {
      props['@trigger'] = true;
    }

    if (key.indexOf('class:') === 0) {
      if (props[key] && props[key] !== '0') {
        props.class = `${props.class || ''} ${key.substr(6)}`.trim();
      }
      delete props[key];
    }

    if (key.indexOf('style:') === 0) {
      css.push(`${key.substr(6).replace(/[A-Z]/g, _ => `-${_.toLowerCase()}`)}: ${props[key]}`);
      delete props[key];
    }

    if (key.indexOf('on') === 0 && (Is.func(props[key]) || !String(props[key]).match(RE_JS_EXPR))) {
      props[`@${key.replace('on', 'on:')}`] = Is.func(props[key]) ? props[key].name : props[key];
      delete props[key];
    }

    if (key.indexOf('@use:') === 0 && Is.func(props[key])) {
      fn.push([props[key], key.substr(5)]);
      delete props[key];
    }
  });

  if (props.style || css.length) {
    props.style = css.concat(props.style || []).filter(Boolean).join('; ');
  }

  if (!props.class) delete props.class;
  return props;
}
