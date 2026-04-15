import {
  style as ssrStyle,
  rulify as ssrRulify,
  specify as ssrSpecify,
  classify as ssrClassify,
  scopify as ssrScopify,
  cssify as ssrCssify,
} from 'somedom/ssr';
import { Expr } from './expr.ts';
import { str } from '../render/hooks.ts';
import { fixedAdapter } from './adapter.ts';
import { enhance, extend } from './utils.ts';
import { Is, stack, trace } from '../utils/server.ts';

const RE_QUOTES_REQUIRED = /[\s"'`=</_:>-]/;

const UNSCOPED_ELEMENTS = ['head', 'meta', 'base', 'link', 'title', 'style', 'script'];

const SELF_CLOSE_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
];

const SVG_CLOSE_TAGS = [
  'a', 'use', 'rect', 'path', 'circle',
];

export function attrs(data: Record<string, any>): string {
  if (!data) return '';

  const reset: string[] = [];
  const props = Object.entries(data).reduce((memo: string[], [key, value]) => {
    if (key === '@html') return memo;

    if (key[0] === '@') {
      key = key.replace('@', 'data-');
      value = Is.str(value)
        ? value.replace('@', 'data-')
        : value;
    }

    if (key[0] === ':') {
      key = key.substr(1);
      reset.push(key);
      memo.push(` data-is:${key}`);
    }

    if (
      (!Is.not(value) && value !== false)
      && !(Is.func(value) || Is.plain(value))
    ) {
      const truthy = value === true || value === 'true' || value === key;
      const unsafe = value === '' || key.includes(':') || Is.arr(value);
      const quotes = RE_QUOTES_REQUIRED.test(value) || Is.arr(value);

      value = (truthy && (unsafe ? 'true' : key)) || (Is.arr(value) ? JSON.stringify(value) : String(value));
      value = quotes || unsafe ? `"${(Is.arr(value) ? JSON.stringify(value) : value).replace(/"/g, '&quot;')}"` : value;
      memo.push(` ${key}${!truthy || unsafe ? `=${value}` : ''}`);
    }
    return memo;
  }, []);

  if (reset.length > 0) {
    props.unshift(' data-reset');
  }
  return props.join('');
}

export function style(chunk: any): string {
  return ssrStyle(chunk);
}

export function rulify(css: string, filepath: string): any[] {
  return ssrRulify(css, filepath);
}

export function specify(ref: string, value: string, _class?: boolean): string {
  return ssrSpecify(ref, value, _class);
}

export function classify(ref: string, _class: boolean | undefined, chunk: any, children: any): void {
  const options: any = {
    adapter: fixedAdapter,
    skipNode(node: any): boolean {
      return UNSCOPED_ELEMENTS.includes(node.name);
    },
    appendScopeClass(node: any, value: string): void {
      node.attributes = node.attributes || {};
      const classNames = node.attributes.class || '';

      if (classNames instanceof Expr) {
        classNames.concat(` ${value}`);
      } else {
        node.attributes.class = `${node.attributes.class || ''} ${value}`.trim();
      }
    },
  };

  ssrClassify(ref, _class, chunk, children, options);
}

export function scopify(ref: string, _class: boolean | undefined, styles: string, children: any, filepath: string): any[] {
  const options: any = {
    adapter: fixedAdapter,
    skipNode(node: any): boolean {
      return UNSCOPED_ELEMENTS.includes(node.name);
    },
    appendScopeClass(node: any, value: string): void {
      node.attributes = node.attributes || {};
      const classNames = node.attributes.class || '';

      if (classNames instanceof Expr) {
        classNames.concat(` ${value}`);
      } else {
        node.attributes.class = `${node.attributes.class || ''} ${value}`.trim();
      }
    },
  };

  try {
    return ssrScopify(ref, _class, styles, children, filepath, options);
  } catch (e: any) {
    trace('E_HTML', e);
    if (e.filename) {
      e.message = `${e.reason} at ${e.filename}:${e.line}:${e.column}`;
      e.stack = stack(styles.trim(), e.line, e.column);
    }
    throw e;
  }
}

export function cssify(styles: any[]): string {
  return ssrCssify(styles);
}

export function taggify(vnode: any, callback?: (chunk: any) => void): any {
  if (Is.not(vnode)) return;
  if (!Is.arr(vnode)) {
    return Is.func(callback) ? callback(str(vnode)) : str(vnode);
  }
  if (Is.vnode(vnode)) {
    const props: any = { ...vnode[1] };

    let tagName = vnode[0];
    if (vnode[0] === 'fragment') {
      if ('@html' in props) {
        if (!Is.func(callback)) {
          return props['@html'];
        }
        callback(props['@html']);
        return;
      }

      if ('d:html' in props) {
        const signal = props['d:html'];
        const html = signal && signal.value ? signal.value : '';
        if (!html) return;
        if (!Is.func(callback)) return html;
        callback(html);
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

    let raw;
    if (props['@html']) {
      tagName = props['@tag'] || vnode[0];
      vnode[2] = props['@html'];
      delete props['@html'];
      vnode.length = 3;
      raw = true;
    }

    const children = vnode[2] && vnode[2].length > 0;
    const close = SELF_CLOSE_TAGS.includes(vnode[0])
      || (!children && SVG_CLOSE_TAGS.includes(vnode[0]));

    let tag = `<${tagName}${attrs(props)}`;
    if (close) tag += ' />';
    else tag += '>';

    if (!Is.func(callback)) {
      const suffix = !close ? `</${tagName}>` : '';
      return close
        ? tag + suffix
        : `${tag}${raw ? vnode[2] : taggify(vnode[2])}${suffix}`;
    }
    callback(tag);
    if (!close) {
      if (raw) {
        callback(vnode[2]);
      } else if (vnode.length > 1) {
        taggify(vnode[2], callback);
      }
      callback(`</${tagName}>`);
    }
    return;
  }
  if (!Is.func(callback)) {
    return vnode.map((chunk: any) => (Is.scalar(chunk) ? chunk : taggify(chunk))).join('');
  }
  vnode.forEach((chunk: any) => {
    if (Is.scalar(chunk)) callback(chunk);
    else taggify(chunk, callback);
  });
}

export function serialize(vnode: any, parent?: any, callback?: (vnode: any, hooks: any[]) => void): any {
  if (Is.vnode(vnode)) {
    if (vnode[0] === 'template') {
      return vnode[2];
    }

    const hooks: any[] = [];
    const name = vnode[0];
    const props = vnode[1] = extend(vnode[0], { ...vnode[1] }, hooks);

    const children = !['pre', 'textarea'].includes(name)
      ? serialize(vnode[2], { name, props }, callback)
      : vnode[2];

    vnode[2] = children;
    vnode.length = 3;

    enhance(vnode, parent);
    if (Is.func(callback)) (callback as Function)(vnode, hooks);
    return vnode;
  }

  if (Is.arr(vnode)) {
    return vnode.reduce((memo: any[], cur: any) => {
      memo.push(serialize(cur, parent, callback));
      return memo;
    }, []);
  }

  return vnode;
}
