import { Expr } from './expr.ts';
import { ents } from '../render/hooks.ts';
import { Is, trace, repeat, encodeText } from '../utils/server.ts';

// encoding is required to keep the resulting text JSON-friendly
// with the transport-layer, for some reason the response is
// broken otherwise...
//

export function unsafe(value: string): string {
  return value
    .replace(/\{/g, '&lbrace;')
    .replace(/\}/g, '&rbrace;');
}

export function encode(value: string): string {
  return encodeText(value, { quotes: false, unsafe: true })
    .replace(/&quot;/g, '\\"')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function compact(chunk: any): any {
  if (!chunk || typeof chunk !== 'object') return chunk;
  if (Is.arr(chunk)) return chunk.map(compact);
  if (chunk.type === 'text') return chunk.content;
  return [chunk.name, chunk.attributes, compact(chunk.elements)];
}

export function reduce(tree: any, context: any, indent: number = 0): string {
  if (Is.arr(tree)) {
    return reduce({ elements: tree }, context, indent);
  }

  const _tabs = repeat('\t', indent + 1);

  const result = tree.elements.reduce((memo: string[], node: any) => {
    if (['element', 'fragment'].includes(node.type)) {
      const body = node.elements && node.type !== 'fragment' ? `[${reduce(node, context, indent + 1)}]` : '[]';
      const props = node.attributes ? `${Expr.props(node.attributes, `${_tabs}\t`)}\n${_tabs}` : '';
      const prefix = node.offset ? `\n/*!#${node.offset.start.line + 1}:${node.offset.start.column + 1}*/` : '';

      if (node.type === 'fragment') {
        if (node.attributes.frame) {
          memo.push(`${_tabs}${prefix} $$.e('fragment', __fragments['${node.ref}'].a($$), [])`);
        } else {
          memo.push(`${_tabs}${prefix} $$.e('fragment', __fragments['${node.ref}'].a($$), __fragments['${node.ref}'].r($$))`);
        }
      } else if (Is.upper(node.name)) {
        // eslint-disable-next-line max-len
        const fns = Object.entries(node.snippets).map(([fn, _]: [string, any]) => `${fn}: (${_.args.join(', ')}) => () => [${reduce(_.body, context, indent + 1)}]`).join('\n,');

        // eslint-disable-next-line max-len
        memo.push(`${_tabs}${prefix} $$.block(${node.name}, '<${node.name}>', {${props + fns}}, ${body === '[]' ? 'null' : `() => ${body}`} /* </${node.name}> */)`);
      } else {
        memo.push(`${_tabs}${prefix} $$.e('${node.name}', {${props}}, ${body})`);
      }
    } else if (node.type === 'text') {
      if (node.content.trim().length > 0) memo.push(_tabs + JSON.stringify(node.content));
    } else if (node.type === 'code') {
      memo.push(node.content.wrap(_tabs));
    } else if (node instanceof Expr) {
      memo.push(node.wrap(_tabs));
    }
    return memo;
  }, []).join(',');

  return result;
}

export function enhance(vnode: any[], parent?: any): void {
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

  if (props['@rpc:call']) {
    props['@trigger'] = true;
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
    if (props['@post']) props.method = 'POST';
    if (props['@patch']) props.method = 'PATCH';
    if (props['@delete']) props.method = 'DELETE';

    delete props['@put'];
    delete props['@post'];
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

  if (name === 'script') {
    delete props.inline;
  }
}

export function extend(tagName: string, props: Record<string, any>, fn: any[]): Record<string, any> {
  const css: string[] = [];

  Object.keys(props).forEach(key => {
    if (key.indexOf('rpc:') === 0) {
      props[`@${key}`] = props[key];
      delete props[key];
    }

    if (key.indexOf('test:') === 0) {
      props[`@${key}`] = props[key];
      delete props[key];
    }

    if (key.indexOf('bind:') === 0) {
      if (!['form', 'input', 'select', 'textarea'].includes(tagName)) {
        throw new TypeError(`Element ${tagName} does not support bindings`);
      }

      props.name = props.name || props[key];
      props[`@${key}`] = props[key];
      props['@binding'] = true;
      delete props[key];
    }

    if (key.indexOf('class:') === 0) {
      if (props[key] && props[key] !== '0') {
        props.class = `${props.class || ''} ${key.substr(6)}`.trim();
      }
      delete props[key];
    }

    if (key.indexOf('style:') === 0) {
      const value = String(props[key] === 0 || props[key] === '0' ? 0 : props[key] || '').trim();
      if (value.length > 0) {
        css.push(`${key.substr(6).replace(/[A-Z]/g, (_: string) => `-${_.toLowerCase()}`)}: ${props[key]}`);
      }
      delete props[key];
    }

    if (key.indexOf('on') === 0) {
      props[`@${key.replace('on', 'on:')}`] = Is.func(props[key]) ? (props[key] as Function).name : props[key];
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

export async function visit(chunk: any, callback?: (node: any, locations?: any) => Promise<any> | void, locations?: any): Promise<void> {
  if (!chunk) return;
  if (!Is.arr(chunk)) {
    await visit(chunk.elements || [], callback, locations);
  } else {
    await Promise.all(chunk.map((node: any) => {
      if (node.elements) {
        return Promise.resolve()
          .then(() => visit(node.elements, callback, locations))
          .then(() => callback && callback(node, locations))
          .catch((e: any) => trace('E_VISIT', e));
      }
      return null;
    }));
  }
}
