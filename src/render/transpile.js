/* eslint-disable no-unused-expressions */

const { vars } = require('eslint-plugin-jamrock/util');

const { parts, taggify, metadata } = require('../markup/html');
const { compile } = require('../markup/block');

const {
  identifier, realpath, nofile, nodir, noext,
} = require('../util');

function rewrite(code) {
  return code.replace(/\breturn (\$\$[\w]+) &&/g, 'with ($1) return');
}

function encode(code) {
  return code
    .replace(/"(on\w+)":\s*"(.+?)"/g, '"$1": $2')
    .replace(/\swith\s\((\$\$\w+)\)\sreturn/g, 'return $1 &&');
}

function render(markup, callback) {
  let prefix = '';
  let script = markup.scripts.filter(x => x.isMain).map(x => x.body).join('');
  const exprs = vars(script);

  if (exprs.children.includes('jamrock')) {
    script = script.replace(/\s*\}\s*from\s*["']jamrock["']/, ', registerComponent$&');
  } else {
    prefix = "import { registerComponent } from 'jamrock';\n";
  }

  const lines = script.split('\n');

  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().indexOf('import') === 0) offset = i + 2;
  }

  const locals = exprs.keys.filter(x => exprs.locals[x] !== 'import').concat(exprs.deps);
  const { Template } = require('../jamrock/template');
  const children = [];

  Object.keys(exprs.imports).forEach(dep => {
    if (dep.charAt() === '.') {
      const partial = Template.locate(nofile(markup.file), dep);

      locals.push(...exprs.imports[dep]);
      children.push(partial);
    }
  });

  let obj;
  let scope;
  if (markup.styles.some(x => x.scoped)) {
    scope = identifier(nodir(markup.file));
  }

  const partial = compile(markup.template, markup.file, tree => {
    obj = metadata(tree, scope);
    return obj.markup.content || [];
  });

  const base = nodir(realpath('.'));
  const name = noext(markup.file).split('/client/')[1] || nodir(noext(markup.file));

  const view = partial.render.toString();
  const content = lines.slice(offset).join('\n')
    .replace(/export\s+((?:async\s+)?function\*?)\s+([*\s]*)(\w+)/g, 'const $3 = $$$$props.$3 || $1 $2$3')
    .replace(/export\s+(let|const)\s+(\w+)\s*;/g, '$1 $2 = $$$$props.$2;')
    .replace(/export\s+(let|const)\s+(\w+)\s*=/g, '$1 $2 = $$$$props.$2 ||');

  Template.render(markup.styles.map(x => ({ ...x, scope })), null, markup.file, 'css')
    .then(results => {
      const source = [
        lines.slice(0, offset).join('\n') + prefix,
        `const stylesheet = \`${results.join('\n')}\`;`,
        `const component = $$props => {\n${content}\nreturn { ${[...new Set(locals)].join(', ')} }};\n`,
        `const template = { render: ${encode(view)} };\n`,
        `export default registerComponent("${base}:${name}", { stylesheet, component, template });\n`,
      ].join('');

      callback({ source, children });
    })
    .catch(console.debug);
}

module.exports.taggify = taggify;
module.exports.rewrite = rewrite;
module.exports.compile = compile;
module.exports.render = render;
module.exports.parts = parts;
module.exports.vars = vars;
