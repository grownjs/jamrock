import { blocks, vars } from 'eslint-plugin-jamrock/util.js';
import { RE_MATCH_ROUTES } from 'eslint-plugin-jamrock/const.js';

import { Expr } from './expr.mjs';
import { traverse } from './walk.mjs';
import { lexer } from '../templ/utils.mjs';
import { reduce, walk } from './utils.mjs';
import { Template } from '../templ/main.mjs';
import { extract, rebase } from '../handler/utils.mjs';
import { Is, parseMarkup, identifier } from '../utils/server.mjs';

const RE_EXPORT_DEFAULT = /\bexport default\b/;
const RE_RESOLVE_IMPORTS = /\/\*@@\*\/__resolve\('(.+?)'\)/g;

export class Block {
  constructor(tpl, file, options) {
    const opts = { ...options };
    const base = `${opts.cwd || '.'}/`;
    const src = rebase(file.replace(base, ''));
    const dest = rebase(`${base}${src}`);
    const id = opts.scope || identifier('jam', src).join('-');

    Object.defineProperty(this, 'id', { value: id });
    Object.defineProperty(this, 'src', { value: src });
    Object.defineProperty(this, 'dest', { value: dest });
    Object.defineProperty(this, 'code', { value: tpl });
    Object.defineProperty(this, 'opts', { value: opts });
    Object.defineProperty(this, 'doc', { value: {} });
    Object.defineProperty(this, 'meta', { value: [] });
    Object.defineProperty(this, 'attrs', { value: {} });
    Object.defineProperty(this, 'assets', { value: { js: [], css: [] } });

    const { locations } = blocks(this.code, false);

    const locate = (offset, value) => {
      let found;
      for (const chunk of locations) {
        found = chunk;
        if (chunk.block === value && chunk.offset[0] >= offset) break;
      }
      return found;
    };

    const metadata = {
      response: {
        fragments: {},
        snippets: {},
        scripts: [],
        styles: [],
        markup: {},
        rules: [],
      },
      locate,
      lexer,
      file: this.src,
    };

    const tree = parseMarkup(this.code, { includePositions: true });
    const result = traverse(tree, this.code, null, metadata);

    metadata.response.markup.content = result;

    Object.assign(this, metadata.response);

    if (this.markup.attributes) {
      Object.assign(this.attrs, this.markup.attributes);
      delete this.attrs['@location'];
    }

    if (this.markup.metadata) {
      this.meta.push(...this.markup.metadata);
    }

    if (this.markup.document) {
      Object.assign(this.doc, this.markup.document);
    }

    let imports = [];
    let children = [];
    if (!this.code.includes('<script')) {
      this.context = 'static';
    } else {
      const contexts = this.scripts.reduce((memo, cur) => memo.concat(cur.attributes.context || []), []);

      this.context = contexts.some(_ => _ === 'client') ? 'client' : 'module';

      Object.defineProperty(this, 'module', {
        value: vars(this.scripts
          .filter(x => !x.root && !x.attributes.scoped && x.attributes.context === 'module')
          .map(x => x.content).join('\n')),
      });

      Object.defineProperty(this, 'script', {
        value: vars(this.scripts
          .filter(x => !x.root && !x.attributes.scoped && x.attributes.context !== 'module' && x.attributes.type !== 'module')
          .map(x => x.content).join('\n')),
      });

      // FIXME: use jslint here?
      lexer(Block.module(this.module.code), { position: { line: 1, col: this.module.code.indexOf('\n') } });
      lexer(Block.module(this.script.code, true), { position: { line: 1, col: this.script.code.indexOf('\n') } });

      const filepath = `${this.opts.cwd || '.'}/${src}`;

      children = this.module.children.concat(this.script.children)
        .filter(_ => _.includes('.html'))
        .map(_ => ({ ref: _, src: Template.join(filepath, _) }))
        .map(_ => Object.defineProperty(_, 'code', { get: () => Template.read(_.src) }));

      imports = this.module.children.concat(this.script.children)
        .filter(_ => !_.includes('.html') && _.charAt() === '.')
        .map(_ => ({ ref: _, src: Template.join(filepath, _) }));
    }

    Object.defineProperty(this, 'children', { value: children });
    Object.defineProperty(this, 'imports', { value: imports });

    walk(this.markup.content, locations);
  }

  get $attributes() {
    return `async ($$) => ({${Block.wrap(Expr.props(this.attrs, '\t'))}})`;
  }

  get $metadata() {
    return `async ($$) => [${Block.wrap(reduce(this.meta, this.context, 1))}]`;
  }

  get $doctype() {
    return `async ($$) => ({${Block.wrap(Expr.props(this.doc, '\t'))}})`;
  }

  get $fragments() {
    return Object.entries(this.fragments)
      .map(([fn, _]) => `\n\t'${fn}': {
    attrs: async ($$) => ({${Block.wrap(Expr.props(_.attributes, '\t'))}}),
    render: async ($$) => [${Block.wrap(reduce(_.elements, this.context, 1))}] },`)
      .join('');
  }

  get $snippets() {
    return Object.entries(this.snippets)
      .map(([fn, _]) => `\n\t${fn}: (${_.args.join(', ')}) => async ($$) => [${Block.wrap(reduce(_.body, this.context, 1))}]`)
      .join('');
  }

  get $styles() {
    return this.assets.css.reduce((memo, styles) => {
      if (Is.arr(styles)) {
        styles.forEach(style => {
          if (Is.arr(style)) {
            if (style[0].charAt() === '@') {
              if (style[1].length > 0) {
                memo.push(`${style[0]}{${style[1].join('\n')}}`);
              }
            } else {
              memo.push(style.join('\n'));
            }
          } else {
            memo.push(style);
          }
        });
        return memo;
      }
      return memo.concat(styles);
    }, []).join('\n');
  }

  get $prefix() {
    const javascript = JSON.stringify(this.assets.js);
    const stylesheets = JSON.stringify(this.$styles);

    return `export const __snippets = {${this.$snippets}};

export const __fragments = {${this.$fragments}};

export const __scripts = ${javascript};
export const __styles = ${stylesheets};

export const __context = ${JSON.stringify(this.context)};
export const __doctype = ${this.$doctype};
export const __metadata = ${this.$metadata};
export const __attributes = ${this.$attributes};
`;
  }

  toString() {
    const defaults = '__src,__dest,__context,__snippets,__fragments,__scripts,__styles,__doctype,__metadata,__attributes,__template';
    const template = reduce(this.markup.content, this.context, 1);

    if (!this.script) {
      const scope = Object.keys(this.snippets)
        .map(_ => `${_}=__snippets.${_}`)
        .concat(this.opts.props || [])
        .concat('...$$props').join(',');

      return `/* eslint-disable */
${this.$prefix}
export const __template = async ($$,{${scope}}) => {
  return [${Block.wrap(template)}];
};
export default {${defaults}};
`.replace(/\(\$\$\)/g, '($$$$,$$$$props)');
    }

    const aliases = this.script.aliases;
    const locals = this.script.locals;
    const keys = this.script.keys;

    const exported = keys.filter(x => ['let', 'const', 'export'].includes(locals[x])).map(x => aliases[x] || x);
    const matched = extract(Block.imports(this.script.code), true);

    matched.code = Block.exports(matched.code);

    const lines = matched.code.split('\n');

    let offset = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim().includes('import(')) offset = i + 1;
      if (lines[i].trim().includes('__loader(')) offset = i + 1;
    }

    const scope = keys.concat(this.script.deps)
      .reduce((memo, key) => {
        if (aliases[key] && locals[key] === 'export') {
          memo.push([aliases[key], key]);
        } else {
          memo.push(key);
        }
        return memo;
      }, []);

    const shared = this.script.imports.jamrock ?? [];
    const lets = scope.map(x => (Is.arr(x) ? x.join(':') : x))
      .filter(local => !shared.includes(local))
      .concat(Object.keys(this.snippets))
      .concat(this.opts.props || []);

    const prelude = lines.slice(0, offset).join('\n');
    const interlude = `\tasync function __context(__actions = {}) {
${Object.keys(this.snippets).map(_ => `const ${_} = $$props.${_} ?? __snippets.${_};`)}
${lines.slice(offset).join('\n')}
${this.context === 'client'
    ? `\t\treturn {__actions,__scope:{${lets.join(',')}}};`
    : `\t\tconst __callback = () => ({${lets.join(',')}});
\t\treturn {__actions,__callback};`}
\t}`;

    let mod = this.module?.code || '';
    this.module?.children.forEach(_ => {
      mod = mod.replace(_, _.replace('.html', '.generated.mjs'));
    });

    const js = `/* eslint-disable */${mod}
export const __handler = async ($$props, __loader) => {
${[prelude, interlude].join('\n')}
${this.context === 'client'
    ? `\tconst __runtime = await __loader('jamrock');
\tconst __self = __runtime.wrapComponent('${this.src}', __context, __template);
\treturn {__self,__context};`
    : '\treturn {__context};'}
};

export const __routes = ${JSON.stringify(matched.routes)};
${this.$prefix}
export const __template = async ($$) => [${Block.wrap(template)}];
export const __exported = ${JSON.stringify(exported)};
export default {${defaults},__exported,__handler,__routes};
`;

    const code = lets.length > 0
      ? js.replace(/\(\$\$\)/g, `($$$$,{${lets.join(',')},...$$$$props})`)
      : js;

    return code;
  }

  static imports(code, callback) {
    return code.replace(/\bimport([^;]+?)from\s*(['""])(.+?)\2(?=[\n;])/g, (_, $1, qt, $3, offset) => {
      if (callback) return callback($1, $3, offset);

      const name = $1.replace(/[*]\s*as/, '').trim().replace(/\sas\s/g, ': ');
      const symbols = `/*!#${offset}*/const ${name}`;

      if ($3 === 'jamrock' || $3.includes('jamrock:')) {
        return `${symbols} = await __loader('${$3}');\n`;
      }

      if ($3.charAt() === '.' && !$3.includes('.html')) {
        return `${symbols} = await /*@@*/__resolve('${$3}')`;
      }

      return `${symbols} = await import('${$3.replace('.html', '.generated.mjs')}')`;
    });
  }

  static exports(code) {
    return code
      .replace(/\bexport\b/g, (_, offset) => `/*!#${offset}*/${_}`)
      .replace(/\bexport\s+(let|const)\s+(\w+)\s*(?=[\n;])/g, '$1 $2 = $$$$props.$2')
      .replace(/\bexport\s+(let|const)\s+(\w+)\s*=/g, '$1 $2 = $$$$props.$2 ??')
      .replace(/\bexport\s+function\s+(\w+)\s*\(/g, 'let $1 = $$$$props.$1 ?? function $1(')
      .replace(/\bexport\s+default\b/, '__actions =')
      .replace(/\bexport\s*\{([^;]+?)\}\s*(?=[\n;])/g, (_, $1) => $1.split(',').map(expr => {
        const [a, b] = expr.trim().split(/\sas\s/);
        return a && b ? `\n${a} = $$props.${b} ?? ${a};` : '';
      }).join(''));
  }

  static module(code, routes) {
    code = Block.imports(code, () => '');

    if (routes) code = code.replace(RE_MATCH_ROUTES, (_, verb, path, alias) => _.replace(alias, x => x.replace(/./g, ' ')));

    return code
      .replace(/\bexport\s*\{\s*([^;]+?)\s*\}/g, (_, $1, offset) => `/*!#${offset}*/({${$1.split(' as ').reverse().join(': ')}})`)
      .replace(/\bexport\s+default\b/g, 'const _default=')
      .replace(/\bexport\b/g, x => x.replace(/./g, ' '));
  }

  static unwrap(code, source, target) {
    const info = `\nexport const __src = '${source}';\nexport const __dest = '${target}';\n`;

    return code
      .replace(RE_EXPORT_DEFAULT, _ => info + _)
      .replace(RE_RESOLVE_IMPORTS, (_, src, v, qt, file) => {
        const a = Template.join(source, src || file);
        const b = Template.join(target, src || file);
        const c = Template.join(b, a, true);

        return `import('${c}')`;
      });
  }

  static wrap(code) {
    return `/*<![CDATA[*/${code}/*]]>*/`;
  }
}
