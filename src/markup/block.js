const {
  relative, ucfirst, invoke, trace,
} = require('../util');
const {
  clean, blocks, compact,
} = require('./util');
const {
  parse, explode, decorate, transform, Expression,
} = require('./core');
const {
  renderAsync,
} = require('../render');

class Block {
  constructor(tpl, file, extend, isAsync) {
    Object.defineProperty(this, 'props', { value: { tpl, file } });
    Object.defineProperty(this, 'slots', { value: {} });

    this.props.locations = blocks(tpl);

    Object.defineProperty(this, 'locate', {
      value: (offset, value) => {
        let found;
        for (const chunk of this.props.locations) {
          found = chunk;
          if (chunk.block === value && chunk.offset[0] >= offset) break;
        }
        return found;
      },
    });

    let _render;
    Object.defineProperty(this, 'render', {
      get: () => _render,
      set: fn => { _render = fn; },
    });

    const tree = typeof extend === 'function' ? extend(parse(tpl, relative(file))) : parse(tpl, relative(file));

    Object.assign(this.slots, this.extract(tree, isAsync));

    this.build(file, tree, isAsync);
  }

  enhance(template, isAsync, cleanup = true) {
    let cursor = 0;
    const chunks = transform(explode(template, this.locate, 0), isAsync);
    const body = chunks.reduce((buffer, chunk) => {
      const locate = value => this.locate(cursor, value);

      /* istanbul ignore else */
      if (chunk.offset) {
        buffer.push(`/*!#${chunk.offset[0]}*/`);
        cursor = chunk.offset;
      }

      buffer.push(chunk.kind ? chunk.block : decorate(chunk.block, locate, isAsync));
      return buffer;
    }, []);
    return cleanup !== false ? clean(body.join('')) : body.join('');
  }

  extract(chunk, isAsync) {
    if (!Array.isArray(chunk)) {
      return this.extract(chunk.elements || [], isAsync);
    }

    return chunk.reduce((frags, node) => {
      if (node !== null) {
        if (node.type === 'element' && node.attributes && node.attributes.slot) {
          const name = node.attributes.slot;

          delete node.attributes.slot;
          frags[name] = { children: compact(node), template: this.compact([node], 0, isAsync) };

          delete node.name;
          delete node.elements;
          delete node.attributes;

          node.type = 'text';
          node.text = '';
        }

        if (node.elements) {
          if (ucfirst(node.name) || node.name === 'component') {
            node.components = this.extract(node.elements, isAsync);
          } else {
            Object.assign(frags, this.extract(node.elements, isAsync));
          }
        }
      }
      return frags;
    }, {});
  }

  compact(tree, offset, isAsync, indent = 0) {
    if (Array.isArray(tree)) {
      return this.compact({ elements: tree }, 0, isAsync);
    }

    if (!tree.elements) return '';

    const _tabs = Array.from({ length: indent + 1 }).join('  ');
    const _async = isAsync ? 'async ' : '';

    return tree.elements.map(node => {
      if (!node) return;
      if (node.type === 'element') {
        const props = Expression.props(node.attributes, '', offset, isAsync, this.locate);
        const _sync = isAsync && node.name !== 'component' ? _async : '';

        let body = `[\n${this.compact(node, offset, _sync, indent + 1)}]`;
        let slots = '';
        if (node.components) {
          slots = Object.keys(node.components).map(key => {
            return `\n${_tabs}  '${key}': ${_sync}function ($$ctx, $$) { with ($$ctx) return [\n${node.components[key].template}]; } `;
          }).join(',');
        }

        if (node.name === 'component') {
          return `${_tabs}${isAsync ? 'await ' : ''}$$.c(c$$, {${props}}, {${slots}}, ${body}),`;
        }

        if (node.name === 'self' || ucfirst(node.name)) {
          return `${_tabs}${isAsync ? 'await ' : ''}$$.block('${node.name}', {${props}}, {${slots}}, ${_async}() => ${body}),`;
        }

        if (node.name === 'slot') {
          return `${_tabs}${isAsync ? 'await ' : ''}$$.slot('${(node.attributes && node.attributes.name) || 'default'}', ${body}),`;
        }

        if (node.name === 'fragment') {
          body = `${_tabs}${isAsync ? 'await ' : ''}$$.fn(c$$, '${node.attributes.id}')`;
        }

        return `${_tabs}['${node.name}', {${props}}, ${body}],`;
      }
      return `${_tabs}${JSON.stringify(node.text)},`;
    }).join('\n');
  }

  build(file, node, isAsync) {
    let source = this.compact(node, 0, isAsync);
    source = `with ($$ctx) return [\n${this.enhance(source, isAsync)}];`;
    source = `render = ${isAsync ? 'async ' : ''}function ($$ctx, $$) { ${source} }`;

    try {
      invoke(source, this, file || 'source.html');
    } catch (e) {
      const matches = e.stack.match(/"(.+?)"/);
      const sample = matches ? `, given '${matches[1]}'` : '';

      if (e.message.includes('missing ) after')) e.message = `Unclosed section${sample}`;
      if (e.message.includes('token )')) e.message = `Unclosed expression${sample}`;
      e.sample = trace(e, this.props, source, true);
      throw e;
    }
    return this;
  }
}

function render(chunk, data, cb) {
  return Promise.resolve()
    .then(() => renderAsync(chunk, data, cb))
    .catch(e => {
      e.sample = trace(e, chunk.props, chunk.render.toString(), true);
      throw e;
    });
}

function compile(tpl, file, extend, isAsync) {
  return new Block(tpl, file || 'source.html', extend, isAsync);
}

module.exports = {
  render,
  compile,
};
