import { Is } from '../utils/server.mjs';
import { Block } from '../markup/index.mjs';
import { Template } from './main.mjs';
import { debug } from './utils.mjs';

export function compile(source, options = {}) {
  const block = new Block(source, options.src || 'source.html', options);

  block.compile = () => {
    try {
      if (Is.arr(options.props) && options.props.length > 0) {
        block.code = block.code.replace('(_, $$)', `({ ${options.props.join(', ')} }, $$$$)`);
      }

      block.render = Template.eval(block.code, options);
    } catch (e) {
      if (process.debug) console.error(e, block.code);
      block.failure = debug(block, e);
    }
  };

  return block.sync();
}

export async function get(src, code, options, imported = []) {
  const cwd = process.cwd();

  Template.cache = Template.cache || new Map();

  return Template.from(compile, code || Template.read(src), { ...options, src })
    .transform(Template.transpile, null, null, {
      external: ['jamrock'],
      locate: path => {
        if (path.indexOf(cwd) === 0) {
          const file = path.replace(`${cwd}/`, '');

          if (Template.cache.has(`${file}.js`)) {
            return `${cwd}/${file}.js`;
          }
        }
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
    }, options && !options.sync, imported);
}
