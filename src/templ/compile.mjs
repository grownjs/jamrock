import { Template } from './main.mjs';
import { Block } from '../markup/index.mjs';
import { debug } from './utils.mjs';

export function compile(source, options = {}) {
  const block = new Block(source, options.src || 'source.html', !options.sync);

  block.compile = () => {
    try {
      block.render = Template.eval(block.code, options);
    } catch (e) {
      block.failure = debug(block, e);
    }
  };

  return block.sync();
}

export async function get(src, code, plain, imported = []) {
  const cwd = process.cwd();

  Template.cache = Template.cache || new Map();

  return Template.from(compile, code || Template.read(src), { html: !plain, src })
    .transform(Template.transpile, null, null, {
      external: ['jamrock'],
      locate: path => {
        if (Template.cache.has(`${path}.js`)) {
          return `${cwd}/${path}.js`;
        }
      },
      rewrite: chunk => {
        chunk = chunk.replace(/import([^;]*)from\s*(["'])jamrock\2/, (_, $1) => {
          return `const ${$1.split(' as ').join(': ').trim()} = window.Jamrock.Browser._`;
        });
        return chunk;
      },
      resolve: path => {
        if (path.indexOf(cwd) === 0) {
          const file = path.replace(`${cwd}/`, '');

          if (Template.cache.has(file)) {
            const chunk = Template.cache.get(file);

            return {
              loader: 'js',
              contents: chunk.content,
              resolveDir: Template.dirname(path),
            };
          }
        }
      },
    }, imported);
}
