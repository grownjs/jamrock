import { rexports } from '../utils.mjs';

export async function transpile(cb, block, assets, options) {
  let prefix = '';
  let script = block.script.code;
  if (block.script.children.includes('jamrock')) {
    script = script.replace(/\s*\}\s*from\s*["']jamrock["']/, ', registerComponent$&');
  } else {
    prefix = "import { registerComponent } from 'jamrock';\n";
  }

  const info = block.script;
  const lines = script.split('\n');

  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().indexOf('import') === 0) offset = i + 2;
  }

  const locals = info.keys.filter(x => info.locals[x] !== 'import').concat(info.deps);

  Object.keys(info.imports).forEach(dep => {
    if (dep.charAt() === '.') locals.push(...info.imports[dep]);
  });

  const vars = [...new Set(locals)];
  const defns = vars.filter(x => !x.includes('$'));
  const content = rexports(lines.slice(offset).join('\n')
    .replace(/export\s+((?:async\s+)?function\*?)\s+([*\s]*)(\w+)/g, 'const $3=$$$$props.$3??$1 $2$3')
    .replace(/export\s+(let|const)\s+(\w+)\s*=(.+);/g, '$1 $2=$$$$props.$2??($3);'), defns);

  const body = block.render.toString()
    .replace(/"(on\w+)":\s*"(.+?)"/g, '"$1": $2')
    .replace(/\bwith\s\((\$\$\w+)\)\s*(?=return)/g, '')
    .replace(/(?<=function\s*\()\$\$ctx,/, `{ ${vars.join(', ')} },`);

  const tail = `const component = $$props => {
  ${content}
  return { ${vars.join(', ')} };
};
const template = {
  render: unwrap\`${body}\`.end,
};
const defaults = [${vars.map(x => `'${x}'`).join(', ')}];
const stylesheet = \`${assets.css}\`;
export default registerComponent('${block.file}', {
  stylesheet, component, template, defaults,
});`;

  return cb({
    filepath: block.file.replace('.html', '.js'),
    content: lines.slice(0, offset).join('\n') + prefix + tail,
  }, 'js', { bundle: true }, options);
}
