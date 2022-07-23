import { parseMarkup } from 'somedom/ssr';

import { traverse } from './walk.mjs';
import { debug } from '../templ/utils.mjs';
import { Template } from '../templ/main.mjs';
import { extract, reduce } from './utils.mjs';
import { blocks, variables } from '../reactor/index.mjs';

export function load(html, file, locate) {
  const context = {
    response: {
      fragments: {},
      scripts: [],
      styles: [],
      markup: {},
    },
    locate,
    file,
  };

  try {
    const tree = parseMarkup(html, { includePositions: true });
    const result = traverse(tree, null, context);

    context.response.markup.content = result;
    return context.response;
  } catch (e) {
    throw new Error(`Failed to parse '${file}'\n${e.stack}`);
  }
}

export class Block {
  constructor(tpl, file, isAsync) {
    this.file = file.replace('./', '');

    const { locations } = blocks(tpl, false);

    Object.defineProperty(this, 'html', { value: tpl });
    Object.defineProperty(this, 'slots', { value: {} });

    let _block;
    Object.defineProperty(this, 'code', {
      get: () => _block,
      set: js => { _block = js; },
    });

    let _render;
    Object.defineProperty(this, 'render', {
      get: () => _render,
      set: fn => { _render = fn; },
    });

    Object.assign(this, load(tpl, this.file, (offset, value) => {
      let found;
      for (const chunk of locations) {
        found = chunk;
        if (chunk.block === value && chunk.offset[0] >= offset) break;
      }
      return found;
    }));

    const contexts = this.scripts.reduce((memo, cur) => memo.concat(cur.attributes.context || []), []);

    if (contexts.length > 1) {
      throw new ReferenceError(`Template '${this.file}' should contain just one script-tag with context`);
    }

    this.context = contexts[0] || (!isAsync ? 'client' : 'module');

    this.module = variables(this.scripts
      .filter(x => !x.root && x.attributes.context === 'module')
      .map(x => x.content).join('\n'));

    this.script = variables(this.scripts
      .filter(x => !x.root && !x.attributes.scoped && x.attributes.context !== 'module' && x.attributes.type !== 'module')
      .map(x => x.content).join('\n'), this.context === 'module');

    this.children = [
      ...this.module.children.map(src => ({ src, name: this.module.imports[src], found: Template.path(src, this.file) })),
      ...this.script.children.map(src => ({ src, name: this.script.imports[src], found: Template.path(src, this.file) })),
    ].filter(x => x.found && !x.found.includes(':'));

    this.children.forEach(mod => {
      mod.code = Template.read(mod.found);
      mod.client = mod.found.includes('.svelte') || this.module === 'client';
    });

    Object.assign(this.slots, extract(this.markup.content, this.context === 'module', this.children));
  }

  compile() {
    try {
      // eslint-disable-next-line no-new-func
      new Function('', `this.render = ${this.code}`).call(this);
    } catch (e) {
      this.failure = debug(this, e);
    }
    return this;
  }

  build() {
    this.code = reduce(this.markup.content, this.context === 'module', this.children, 1);
    this.code = `with ($$ctx) return [\n${this.code.trim()}];`;
    this.code = `${this.context === 'module' ? 'async ' : ''}function ($$ctx, $$) {\n${this.code} }`;
    return this;
  }

  sync() {
    this.build();
    this.compile();
    return this;
  }
}
