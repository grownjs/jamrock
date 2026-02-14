import { parse, stringify } from 'css';

import { Expr } from './expr.ts';
import { str } from '../render/hooks.ts';
import { fixedAdapter } from './adapter.ts';
import { enhance, extend } from './utils.ts';
import { Is, stack, trace, findAll } from '../utils/server.ts';

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

export function style(chunk: any): string {
  const css = stringify({ stylesheet: { rules: [chunk] } }, { compress: true });

  return css;
}

export function rulify(css: string, filepath: string): any[] {
  const ast = parse(css, { source: filepath });
  const out: any[] = [];

  ast.stylesheet.rules.forEach((chunk: any) => {
    if (chunk.type !== 'rule') {
      if (chunk.rules) {
        const rules: string[] = [];

        chunk.rules.forEach((rule: any) => {
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

export function specify(ref: string, value: string, _class?: boolean): string {
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

export function classify(ref: string, _class: boolean | undefined, chunk: any, children: any): void {
  const rules = chunk.selectors || [];
  const parents = rules.map((x: string) => x.split(/[\s~+>]/)[0].split('::')[0]);
  const subnodes = rules.map((x: string) => x.split(/[\s~+>]/).pop()!.split('::')[0]);
  const selectors = [...new Set(parents.concat(subnodes))];

  selectors.forEach((rule: string) => {
    const matches = findAll(rule, children, fixedAdapter) as any[];

    if (matches) {
      chunk.selectors = chunk.selectors.map((selector: string) => {
        if (!selector.includes(ref) && matches.length > 0) {
          const tokens = selector.split(' ');
          const first = tokens.shift()!;
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
      matches.forEach((node: any) => {
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

export function scopify(ref: string, _class: boolean | undefined, styles: string, children: any, filepath: string): any[] {
  const css = styles.trim();

  try {
    const ast = parse(css, { source: filepath });
    const out: any[] = [];

    ast.stylesheet.rules.forEach((chunk: any) => {
      if (chunk.type !== 'rule') {
        if (chunk.rules) {
          const rules: string[] = [];

          chunk.rules.forEach((rule: any) => {
            classify(ref, _class, rule, children);
            rules.push(style(rule));
          });

          out.push([`@${chunk.type} ${chunk[chunk.type]}`, rules]);
        } else {
          out.push(style(chunk));
        }
        return;
      }

      classify(ref, _class, chunk, children);
      out.push(style(chunk));
    });

    return out;
  } catch (e: any) {
    trace('E_HTML', e);
    if (e.filename) {
      e.message = `${e.reason} at ${e.filename}:${e.line}:${e.column}`;
      e.stack = stack(css, e.line, e.column);
    }
    throw e;
  }
}

export function cssify(styles: any[]): string {
  const out: string[] = [];

  styles.forEach((css: any) => {
    if (Is.arr(css)) {
      if (css[0][0] === '@') {
        if (css[1].length > 0) {
          out.push(`${css[0]}{${css[1].join('\n')}}`);
        }
      } else {
        out.push(css.join('\n'));
      }
    } else {
      out.push(css);
    }
  });
  return out.join('\n').trim();
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
