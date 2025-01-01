import { blocks, vars } from 'eslint-plugin-jamrock/util.js';
import { RE_MATCH_ROUTES } from 'eslint-plugin-jamrock/const.js';

import { Expr } from './expr.mjs';
import { render } from './mkd.mjs';
import { traverse } from './walk.mjs';
import { lexer } from '../templ/utils.mjs';
import { reduce, visit } from './utils.mjs';
import { Template } from '../templ/main.mjs';
import { extract, rebase } from '../handler/utils.mjs';
import { Is, parseMarkup, identifier, ignore } from '../utils/server.mjs';

const RE_EXPORT_DEFAULT = /\bexport default\b/;
const RE_RESOLVE_IMPORTS = /\/\*@@\*\/__resolve\('(.+?)'\)/g;
const RE_MATCH_IMPORTS = /\bimport([^;]+?)from\s*(['""])(.+?)\2(?=[\n;])/g;

export class Block {
  constructor(tpl, file, options) {
    const opts = { ...options };
    const base = `${opts.cwd || '.'}/`;
    const src = rebase(file.replace(base, ''));
    const dest = rebase(`${base}${src}`);
    const id = opts.scope || identifier('jam', src).join('-');

    const __dirname = Template.dirname(`${base}/${src}`);

    Object.defineProperty(this, 'id', { value: id });
    Object.defineProperty(this, 'src', { value: src });
    Object.defineProperty(this, 'dest', { value: dest });
    Object.defineProperty(this, 'base', { value: __dirname });
    Object.defineProperty(this, 'code', { value: tpl });
    Object.defineProperty(this, 'opts', { value: opts });
    Object.defineProperty(this, 'doc', { value: {} });
    Object.defineProperty(this, 'meta', { value: [] });
    Object.defineProperty(this, 'attrs', { value: {} });
    Object.defineProperty(this, 'assets', { value: { js: [], css: [], files: [] } });

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
        files: [],
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

      // FIXME: validate qty of script tags...

      Object.defineProperty(this, 'module', {
        value: vars(this.scripts
          .filter(x => !x.root && !x.attributes.scoped && x.attributes.context === 'module')
          .map(x => x.content).join('\n')),
      });

      Object.defineProperty(this, 'script', {
        value: vars(this.scripts
          .filter(x => !x.root && !x.attributes.scoped && !x.attributes.global && x.attributes.context !== 'module')
          .map(x => x.content).join('\n')),
      });

      this.scripts.forEach(_ => {
        if (_.attributes.scoped) {
          const { prelude, interlude } = Block.script(_.content);

          _.content = `${prelude}\nexport function __execute(self) {${interlude}};\nexport default {__execute};`;
        }
      });

      // FIXME: use jslint here?
      lexer(Block.module(this.module.code), { position: { line: 1, col: this.module.code.indexOf('\n') } });
      lexer(Block.module(this.script.code, true), { position: { line: 1, col: this.script.code.indexOf('\n') } });

      children = this.module.children.concat(this.script.children)
        .filter(_ => _.includes('.html'))
        .map(_ => ({ ref: _, src: Template.join(this.base, _) }))
        .map(_ => Object.defineProperty(_, 'code', { get: () => Template.read(_.src) }));

      imports = this.module.children.concat(this.script.children)
        .filter(_ => !_.includes('.html') && _.charAt() === '.')
        .map(_ => ({ ref: _, src: Template.join(this.base, _) }));
    }

    Object.defineProperty(this, 'locations', { value: locations });
    Object.defineProperty(this, 'children', { value: children });
    Object.defineProperty(this, 'imports', { value: imports });
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
    a: async ($$) => ({${Block.wrap(Expr.props(_.attributes, '\t'))}}),
    r: async ($$) => [${Block.wrap(reduce(_.elements, this.context, 1))}] },`)
      .join('');
  }

  get $snippets() {
    return Object.entries(this.snippets)
      .map(([fn, _]) => `\n\t${fn}: (${_.args.join(', ')}) => async ($$) => [${Block.wrap(reduce(_.body, this.context, 1))}]`)
      .join('');
  }

  get $scripts() {
    return this.assets.js.map(([ref, id]) => [ref, this.opts.cwd ? rebase(id, this.opts.cwd) : id]);
  }

  get $styles() {
    return this.assets.css.map(([id]) => [this.opts.cwd ? rebase(id, this.opts.cwd) : id]);
  }

  get $assets() {
    return this.assets.files.map(([k, v]) => `${k}:${v}`);
  }

  get $prefix() {
    const resources = JSON.stringify(this.$assets);
    const javascript = JSON.stringify(this.$scripts);
    const stylesheets = JSON.stringify(this.$styles);

    return `export const __snippets = {${this.$snippets}};

export const __fragments = {${this.$fragments}};

export const __scripts = ${javascript};
export const __styles = ${stylesheets};
export const __files = ${resources};

export const __context = ${JSON.stringify(this.context)};
export const __doctype = ${this.$doctype};
export const __metadata = ${this.$metadata};
export const __attributes = ${this.$attributes};
`;
  }

  resolve(node, resources) {
    const path = node.attributes.src || node.attributes.href;
    const file = path && Template.join(this.base, path);
    delete node.attributes.size;

    if (file) {
      if (!Template.exists(file)) {
        throw new Error(`File not found '${path}' (${this.src})`);
      }

      this.children.push(file);
      resources.files.push([node.name, file]);
    }

    if (node.name === 'svg') {
      const size = node.attributes.size || 16;

      delete node.attributes.href;
      delete node.attributes.src;

      node.attributes.width = node.attributes.width || size;
      node.attributes.height = node.attributes.height || size;

      if (node.elements.length > 0) {
        node.attributes.xmlns = node.attributes.xmlns || 'http://www.w3.org/2000/svg';
      } else {
        node.elements.push({
          name: 'use',
          type: 'element',
          attributes: { 'xlink:href': `#${Template.filename(path, '.svg')}` },
        });
      }
    } else {
      if (node.attributes.href) node.attributes.href = `@/${file}`;
      if (node.attributes.src) node.attributes.src = `@/${file}`;
    }
  }

  async markdown(node, resources) {
    const inline = node.elements.length === 1
      && node.elements[0].inline;

    node.name = node.attributes.tag || (inline ? 'p' : 'template');
    node.elements = await render(node.elements, inline);
    delete node.attributes.tag;

    await visit(node.elements, async _node => {
      if (_node.name === 'img') {
        this.resolve(_node, resources);
      }
      return node;
    });
  }

  async transform(elements, resources) {
    if (this.src.includes('+page')) {
      this.markup.content = await render(this.markup.content);
    }

    await visit(this.markup.metadata, async node => {
      switch (node.name) {
        case 'link':
          if (node.attributes.rel === 'icon') {
            this.resolve(node, resources);
          }
          break;

        default:
          if (elements?.[node.name]) {
            const newNode = await elements[node.name](node);
            if (newNode) return newNode;
          }
          break;
      }
      return node;
    }, this.locations);

    await visit(this.markup.content, async node => {
      switch (node.name) {
        case 'mkd':
          this.markdown(node, resources);
          break;

        case 'source':
        case 'embed':
        case 'track':
        case 'svg':
        case 'img':
          this.resolve(node, resources);
          break;

        default:
          if (elements?.[node.name]) {
            const newNode = await elements[node.name](node);
            if (newNode) return newNode;
          }
          break;
      }
      return node;
    }, this.locations);

    return this.toString();
  }

  toString() {
    const defaults = '__src,__dest,__files,__context,__snippets,__fragments,__scripts,__styles,__doctype,__metadata,__attributes,__template';
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

    const functions = this.module.deps.filter(_ => this.module.locals[_] === 'function');
    const exported = keys.filter(x => ['let', 'const', 'export'].includes(locals[x])).map(x => aliases[x] || x);
    const { prelude, interlude } = Block.imports(this.script.code);
    const matched = extract(interlude, true);

    matched.code = Block.exports(matched.code);

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

    const main = `\tasync function __context(__actions = {}) {
${Object.keys(this.snippets).map(_ => `const ${_} = $$props.${_} ?? __snippets.${_};`)}
${matched.code}
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
export const __handler = async ($$props, __loader${this.context === 'client' ? ', self' : ''}) => {
${[prelude, main].join('\n')}
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
export const __functions = [${functions.join(',')}];
export default {${defaults},__functions,__exported,__handler,__routes};
`;

    const code = lets.length > 0
      ? js.replace(/\(\$\$\)/g, `($$$$,{${lets.join(',')},...$$$$props})`)
      : js;

    return code;
  }

  static imports(code, clean) {
    return Block.script(code, true, clean);
  }

  static exports(code) {
    return code
      .replace(/\bexport\s+(let|const)\s+(\w+)\s*(?=[\n;])/g, '$1 $2 = $$$$props.$2')
      .replace(/\bexport\s+(let|const)\s+(\w+)\s*=/g, '$1 $2 = $$$$props.$2 ??')
      .replace(/\bexport\s+function\s+(\w+)\s*\(/g, 'let $1 = $$$$props.$1 ?? function $1(')
      .replace(/\bexport\s+default\b/, '__actions =')
      .replace(/\bexport\s*\{([^;]+?)\}/g, (_, $1) => $1.split(',').map(expr => {
        const [a, b] = expr.trim().split(/\sas\s/);
        return a && b ? `${a} = $$props.${b} ?? ${a};\n` : '';
      }).join(''));
  }

  static module(code, routes) {
    const { interlude } = Block.imports(code, true);

    let out = interlude;

    if (routes) {
      out = out.replace(RE_MATCH_ROUTES, (_, _verb, _path, alias) => _.replace(alias, ignore));
    }

    return out
      .replace(/\bexport\s*\{\s*([^;]+?)\s*\}/g, (_, $1) => `({${$1.split(' as ').reverse().join(': ')}})`)
      .replace(/\bexport\s+default\b/g, 'const _default=')
      .replace(/\bexport\b/g, ignore);
  }

  static script(code, modify, cleanup) {
    let offset = 0;
    let fixed = 0;
    code = code.replace(RE_MATCH_IMPORTS, (_, $1, _2, $3, _offset) => {
      offset = _offset + _.length + 1;

      if (cleanup) return ignore(_);
      if (!modify) return _;

      const name = $1.replace(/[*]\s*as/, ignore).replace(/\sas\s/g, '  : ');
      const symbols = `const ${name}`;

      if ($3 === 'jamrock' || $3.includes('jamrock:')) {
        fixed += 14;
        return `${symbols} = await __loader('${$3}')`;
      }

      if ($3.charAt() === '.' && !$3.includes('.html')) {
        fixed += 21;
        return `${symbols} = await /*@@*/__resolve('${$3}')`;
      }

      fixed += $3.includes('.html') ? 21 : 12;
      return `${symbols} = await import('${$3.replace('.html', '.generated.mjs')}')`;
    });

    offset += fixed;

    const prelude = offset > 0 ? code.substr(0, offset) : '';
    const interlude = offset > 0 ? code.substr(offset) : code;

    return { offset, prelude, interlude };
  }

  static unwrap(code, source, target) {
    const info = [
      source ? `\nexport const __src = '${source}';` : '',
      target ? `\nexport const __dest = '${target}';` : '',
    ].join('');

    const base = source ? Template.dirname(source) : null;
    const leaf = target ? Template.dirname(target) : null;

    if (!code.replace) console.log({ code, source });

    return code
      .replace(RE_EXPORT_DEFAULT, _ => [info, _].join('\n'))
      .replace(RE_RESOLVE_IMPORTS, (_, src, v, qt, file) => {
        const a = Template.join(base, src || file);
        const b = Template.join(leaf, src || file);
        const c = Template.relative(b, a);

        return `import('${c}')`;
      });
  }

  static wrap(code) {
    return `/*<![CDATA[*/${code}/*]]>*/`;
  }
}
