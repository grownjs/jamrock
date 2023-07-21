import { blocks, vars as variables } from 'eslint-plugin-jamrock/util.js';

import { Expr } from './expr.mjs';
import { reduce } from './utils.mjs';
import { traverse } from './walk.mjs';
import { Template } from '../templ/main.mjs';
import { extract } from '../handler/utils.mjs';
import { Is, parseMarkup, identifier } from '../utils/server.mjs';

export function flatten(v) {
  return Array.isArray(v)
    ? v.reduce((memo, x) => memo.concat(flatten(x)), []).filter(x => x && String(x).trim().length > 0)
    : v;
}

export class Block {
  constructor(tpl, file, options) {
    const opts = { ...options };
    const base = `${opts.cwd || '.'}/`;
    const src = file.replace(base, '').replace('./', '');
    const dest = `${base}${src}`.replace('./', '');
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

    const metadata = {
      response: {
        fragments: {},
        snippets: {},
        scripts: [],
        styles: [],
        markup: {},
        rules: [],
      },
      locate: (offset, value) => {
        let found;
        for (const chunk of locations) {
          found = chunk;
          if (chunk.block === value && chunk.offset[0] >= offset) break;
        }
        return found;
      },
      file: this.src,
    };

    try {
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
    } catch (e) {
      throw new Error(`Failed to parse '${file}'\n${e.stack}`);
    }

    let children = [];
    if (!this.code.includes('<script')) {
      this.context = 'static';
    } else {
      const contexts = this.scripts.reduce((memo, cur) => memo.concat(cur.attributes.context || []), []);
      const directory = `${this.opts.cwd || '.'}/${Template.dirname(src)}`;

      if (contexts.length > 1) {
        throw new ReferenceError(`Component '${this.src}' should contain just one script-tag with context`);
      }

      this.context = contexts[0] || 'module';

      Object.defineProperty(this, 'module', {
        value: variables(this.scripts
          .filter(x => !x.root && !x.attributes.scoped && x.attributes.context === 'module')
          .map(x => x.content).join('\n')),
      });

      Object.defineProperty(this, 'script', {
        value: variables(this.scripts
          .filter(x => !x.root && !x.attributes.scoped && x.attributes.context !== 'module' && x.attributes.type !== 'module')
          .map(x => x.content).join('\n')),
      });

      children = this.module.children.concat(this.script.children)
        .filter(_ => _.includes('.html'))
        .map(_ => ({ ref: _, src: Template.join(directory, _) }))
        .map(_ => Object.defineProperty(_, 'code', { get: () => Template.read(_.src) }));
    }

    Object.defineProperty(this, 'children', { value: children });
  }

  get $attributes() {
    return `async ($$) => (unwrap\`{${Expr.props(this.attrs, '\t')}}\`.end)`;
  }

  get $metadata() {
    return `async ($$) => unwrap\`[${reduce(this.meta, this.context, 1)}]\`.end`;
  }

  get $doctype() {
    return `async ($$) => (unwrap\`{${Expr.props(this.doc, '\t')}}\`.end)`;
  }

  get $fragments() {
    return Object.entries(this.fragments)
      .map(([fn, _]) => `\n\t'${fn}': {
    attrs: async ($$) => (unwrap\`{${Expr.props(_.attributes, '\t')}}\`.end),
    render: async ($$) => unwrap\`[${reduce(_.elements, this.context, 1)}]\`.end },`)
      .join('');
  }

  get $snippets() {
    return Object.entries(this.snippets)
      .map(([fn, _]) => `\n\t${fn}: (${_.args.join(', ')}) => async ($$) => unwrap\`[${reduce(_.body, this.context, 1)}]\`.end,`)
      .join('');
  }

  get $prefix() {
    const stylesheets = flatten(this.assets.css).join('\n');
    const javascript = JSON.stringify(this.assets.js);

    return `export const __snippets = {${this.$snippets}};

export const __fragments = {${this.$fragments}};

export const __scripts = ${javascript};
export const __styles = \`${stylesheets}\`;

export const __doctype = ${this.$doctype};
export const __metadata = ${this.$metadata};
export const __attributes = ${this.$attributes};
`;
  }

  toString() {
    const defaults = '__snippets,__fragments,__scripts,__styles,__metadata,__attributes,__template';
    const template = reduce(this.markup.content, this.context, 1);

    if (!this.script) {
      const vars = Object.keys(this.snippets)
        .map(_ => `${_}=__snippets.${_}`)
        .concat(this.opts.props || [])
        .concat('...$$props').join(',');

      return `/* eslint-disable */
${this.$prefix}
export const __template = async ($$,{${vars}}) => {
  return unwrap\`[${template}]\`.end;
};
export default {${defaults}};
`.replace(/\(\$\$\)/g, '($$$$,$$$$props)');
    }

    let offset = 0;
    const matched = extract(this.script.code
      .replace(/(?<=\b)import(.+?)from\s*(['""])(.+?)\2;?\n/g, (_, $1, qt, $3) => {
        const pos = this.script.code.indexOf(_, offset);
        offset += pos;

        if ($3 === 'jamrock' || $3.includes('jamrock:')) {
          return `/*!#${pos}*/const ${$1.trim()} = await __loader('${$3}');\n`;
        }
        return `/*!#${pos}*/const ${$1.trim()} = await import('${$3.replace('.html', '.generated.mjs')}');\n`;
      }), true);

    matched.code = matched.code
      .replace(/\bexport\s+(let|const)\s+(\w+)\s*[\n;]/g, '$1 $2 = $$$$props.$2;')
      .replace(/\bexport\s+(let|const)\s+(\w+)\s*=/g, '$1 $2 = $$$$props.$2 ??')
      .replace(/\bexport\s+function\s+(\w+)\s*\(/g, 'let $1 = $$$$props.$1 ?? function $1(')
      .replace(/\bexport\s+default\b/, '__actions =');

    const lines = matched.code.split('\n');

    offset = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim().includes('import(')) offset = i + 1;
    }

    const aliases = this.script.aliases;
    const locals = this.script.locals;
    const keys = this.script.keys;

    const scope = keys.concat(this.script.deps)
      .reduce((memo, key) => {
        if (aliases[key] && locals[key] === 'export') {
          memo.push([aliases[key], key]);
        } else {
          memo.push(key);
        }
        return memo;
      }, []);

    const lets = scope.map(x => (Is.arr(x) ? x.join(':') : x))
      .concat(Object.keys(this.snippets))
      .concat(this.opts.props || []);

    const prelude = lines.slice(0, offset).join('\n');
    const interlude = `\tasync function __context() {
${Object.keys(this.snippets).map(_ => `const ${_} = $$props.${_} ?? __snippets.${_};`)}
${lines.slice(offset).join('\n')}
\t\treturn {__actions,${lets.join(',')}};
\t}`;

    let mod = this.module?.code || '';
    this.module?.children.forEach(_ => {
      mod = mod.replace(_, _.replace('.html', '.generated.mjs'));
    });

    const js = `/* eslint-disable */${mod}
export const __routes = ${JSON.stringify(matched.routes)};
${this.$prefix}

export const __handler = async ($$props, __loader, __actions = {}) => {
${[prelude, interlude].join('\n')}
${this.context === 'client'
    ? `const __runtime = await __loader('jamrock');
const __self = __runtime.wrapComponent('${this.src}', __context, __template);
\treturn {__context,__self};`
    : '\treturn {__context};'}
};

export const __template = async ($$) => unwrap\`[${template}]\`.end;
export default {${defaults},__handler,__routes};
`;

    const code = lets.length > 0
      ? js.replace(/\(\$\$\)/g, `($$$$,{${lets.join(',')},...$$$$props})`)
      : js;

    return code;
  }
}
