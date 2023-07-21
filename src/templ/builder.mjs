import { imports, rexports } from './shared.mjs';
import { extract } from '../handler/utils.mjs';
import { Is } from '../utils/server.mjs';

const RE_VAR_NAME = /^\w+$/;
const RE_IMPORT_LOCS = /(\/\*!#\d+\*\/)\n/g;
const RE_MATCH_IMPORTS = /(?<=await \$\$import)(.+?)(?=[\n;,])/g;
const RE_ASSIGN_DEFAULT = /\$\$defaults(?==)/g;
const RE_ASSIGN_LOCALS = /(const|let)\s+(\w+)\s*=\$\$defaults\.\2=/g;
const RE_BACKUP_BRANCHES = /}\s*catch\s*(?:\([^()]+\))?\s*{|}\s*finally\s*{|}\s*else(?:\s+if[^{}]+)?\s*{/g;
const RE_UNBACKUP_BRANCHES = /@@else/g;
const RE_LOGICAL_KEYWORDS = / *(?:do|if|for|try|while|await|yield|switch) +/;
const RE_ACCESED_SYMBOLS = /(?<=[?:] *)[_$a-zA-Z]\w*|(?:(?<=[=([] *)[_$a-zA-Z]\w*|(?<![.]\w*)[_$a-zA-Z]\w*)(?= *[-+.,;*/!<>\n[})\]|&?]|==)|(?<![.]\w*)[_$a-zA-Z]\w*(?= *[(!<=>/*+-]{2,3}| *in *)/g; // eslint-disable-line

export function expressions(ctx, code, deps, props, isServer) {
  const backup = [];
  const locals = [];

  code = code.replace(RE_BACKUP_BRANCHES, _ => {
    backup.push(_);
    return '@@else';
  });

  do {
    let offset = code.indexOf('$:');
    if (offset === -1) break;

    const paren = code.indexOf('(', offset + 2);
    const brace = code.indexOf('{', offset + 2);
    const assign = code.indexOf('=', offset + 2);
    const position = Math.min(...[paren, brace, assign].filter(x => x > 0));

    const name = code.substr(offset + 2, position - offset - 2).trim();
    const check = ['if', 'try', 'for', 'while', 'switch'].includes(name);
    const block = brace >= 0 && brace < assign && brace < paren;

    let re = `$$$$fx(async () =>${block ? '' : ' {'}`;
    if (!check && !block && !ctx.includes(name) && RE_VAR_NAME.test(name)) {
      re = `let ${name};${re}`;
      ctx.unshift(name);
    }

    offset += re.length - 1;
    code = code.replace('$:', re);

    let end = ';';
    const map = { A: 0, O: 0, P: 0 };
    const logic = RE_LOGICAL_KEYWORDS.test(code.substr(offset, 8));

    let i = offset;
    for (; i < code.length; i += 1) {
      const char = code.substr(i, 1);
      if (map.O > 0 && logic) end = '}';
      if (char === '[') map.A += 1;
      if (char === '{') map.O += 1;
      if (char === '(') map.P += 1;
      if (char === ']') map.A -= 1;
      if (char === '}') map.O -= 1;
      if (char === ')') map.P -= 1;
      if (!(map.A || map.O || map.P)) {
        if (char === end || code.substr(i, 2) === '}\n') break;
      }
    }

    let close = '';
    let diff = end !== ';' ? 1 : 0;
    if (code.substr(i, 2) === '}\n') {
      close = ';';
      diff = 1;
    }

    const _vars = (code.substr(offset, i - offset).match(RE_ACCESED_SYMBOLS) || [])
      .reduce((memo, x) => memo.concat(!memo.includes(x) ? x : []), [])
      .filter(x => deps.includes(x));

    locals.push(..._vars);

    const suff = `/*!#@@@*/${block ? '' : '}'}, () => [${_vars.join(', ')}])`;

    const pre = code.substr(0, i + diff);
    const post = code.substr(i + diff);
    const clean = pre.substr(offset);

    let fix = '';
    if (pre.substr(-1) === '=') fix = 'null';
    code = pre.substr(0, offset) + clean + fix + suff + close + post;
  } while (true); // eslint-disable-line

  code = code.replace(RE_ASSIGN_LOCALS, '$1/*!@@*/$2=$2$$$$??').replace(RE_ASSIGN_DEFAULT, '$&.default');
  code = code.replace(new RegExp(`\\b(let|const)\\s+(${props.join('|')})\\s*=`, 'g'), '$1/*!@@*/$2=$2$$$$??');
  code = code.replace(/\?\?\s*([\n;])/g, '$1');

  if (isServer && locals.length > 0) {
    const vars = locals.join('|');
    const sync = new RegExp(`(\\{\\s|(?:const|let)\\s+|/\\*!@@\\*/|,\\s?|\\w|\\.)?(${vars})(\\s*=[^;]+)(?=;|\\n)`, 'g');

    code = code.replace(sync, (_, $1, $2, $3) => ($1 ? _ : `$$sync(${$2 + $3})`));
  }

  code = code.replace(RE_UNBACKUP_BRANCHES, () => backup.shift());

  const lines = code.split('\n');

  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().includes('import(')) offset = i + 2;
  }

  const prefix = isServer ? '' : ';var __runtime = await $$import("jamrock"), __state = __runtime.wrapComponent(async () => {\n';
  const suffix = isServer ? '' : `;return { ${ctx.join(', ')} }})();`;

  return `${lines.slice(0, offset).join('\n')}${prefix}unwrap\`${lines.slice(offset).join('\n')}\`.end${suffix}`;
}

export function transform(info, partial, isServer) {
  const props = info.keys.filter(x => info.locals[x] !== 'import');
  const safe = info.deps.concat(props).concat(info.effects);

  Object.keys(info.imports).forEach(dep => {
    if (dep.charAt() === '.') safe.unshift(...info.imports[dep]);
  });

  const defns = safe.filter(x => !x.includes('$'));

  let code = info.code.replace(/(?<=\b)import(?=.*from|\s*["'"])/g, (_, offset) => `/*!#${offset}*/\n${_}`);
  code = rexports(imports(code, 'await $$$$import'), defns, '$$defaults', 'await $$import');
  code = code.replace(/Object\.assign\(\$\$defaults,{\w+:(\w+)}\);/g, '$1=$1$$$$;');

  const aliases = info.aliases;
  const locals = info.locals;
  const keys = info.keys;

  const scope = keys.concat(info.deps)
    .reduce((memo, key) => {
      if (aliases[key] && locals[key] === 'export') {
        memo.push([aliases[key], key]);
      } else {
        memo.push(key);
      }
      return memo;
    }, []);

  const vars = props.map(x => `${aliases[x] && locals[x] === 'export' ? aliases[x] : x}:${x}$$`).concat('$$slots', '$$props').join(', ');
  const lets = scope.map(x => (Is.arr(x) ? x.join(':') : x)).concat('self', '$$slots', '$$props');
  const main = expressions(lets, code, safe, props, isServer).trim();
  const ctx = lets.join(', ');

  const body = partial.toString()
    .replace(/"(on\w+)":\s*"(.+?)"/g, '"$1": $2')
    .replace(/\(_, \$\$\)/, () => `({ ${ctx} }, $$)`);

  code = `var __resolve = async function ({ ${vars} }, $$src, $$dest, $$fx, $$sync, $$import, $$defaults = Object.create(null)) { var self = this;
  ${main};return { ctx: $$defaults, ${isServer ? `data: () => ({ ${ctx} })` : 'state: __state'} };
}, __render = unwrap\`${body}\`.end, __props = ${JSON.stringify(scope)};
`;

  code = code.replace(RE_IMPORT_LOCS, '$1');
  code = code.replace(RE_MATCH_IMPORTS, _ => _.replace(')', ', $$$$src, $$$$dest)'));

  return { code, keys, scope, locals, aliases };
}

export function transpile(block, resources) {
  const suffix = `export default {
  src: '${block.file}',
  props: __props,
  render: __render,
  resolve: __resolve,
  stylesheet: ${JSON.stringify(resources.css)}
};`;
  const content = `${block.module.code}${transform(block.script, block.render).code}${suffix}`;

  return { content };
}

export function build(ctx) {
  const {
    hasVars, locals, scope, keys, code,
  } = transform(ctx.block.script, ctx.block.render, true);

  const [options] = code.match(/(?<=default=\{)[^]*\b(?:as|use|body)\s*:([^\n]+),? *(?=[\n}])/g) || [];
  // const identity = options && options.match(/as\s*:\s*(["'"])(\w+)\1/);
  const isAsync = ctx.block.context === 'module';
  // const name = identity ? identity[2] : ctx.id;

  const vars = scope.map(x => (Is.arr(x) ? x.join(':') : x)).join(', ');

  let script = code.trim();
  script = options ? script.replace(options, '') : script;

  const matched = extract(script, true);
  const exported = keys.filter(x => locals[x] === 'let');
  const functions = keys.filter(x => locals[x] === 'function');

  let mod = rexports(imports(ctx.block.module.code, 'await __loader'), null, '__exported', 'await __loader');
  mod = mod.replace(/__loader\((.*?)\)/g, _ => _.replace(/\)/g, ', __src, __filepath)'));

  const out = `async function ${ctx.id}Component(
  __src,
  __loader,
  __reactor,
  __filepath,
  __exported = Object.create(null)
) {
  ${mod}
  ${matched.code}
  ${hasVars || script ? `async function ${ctx.id}Page(props) {
  return __resolve.call(this, props, __src, __filepath, __reactor.fx, __reactor.sync, __loader);
}` : `var ${ctx.id}Page = Object.create(null);`}
  ${ctx.id}Page.props = __props;
  ${ctx.id}Page.render = __render;
  ${ctx.id}Page.assets = {
    scripts: ${JSON.stringify(ctx.assets.js)},
    styles: ${JSON.stringify(ctx.assets.css)},
  };
  ${ctx.templates.metadata
    ? `${ctx.id}Page.metadata = ${isAsync ? 'async ' : ''}({ ${vars} }, $$) => [${ctx.templates.metadata}];\n`
    : ''}${ctx.templates.document
  ? `${ctx.id}Page.document = ${isAsync ? 'async ' : ''}({ ${vars} }, $$) => ({${ctx.templates.document}\n});\n`
  : ''}${ctx.templates.attributes
  ? `${ctx.id}Page.attributes = ${isAsync ? 'async ' : ''}({ ${vars} }, $$) => ({${ctx.templates.attributes}\n});\n`
  : ''}
  ${ctx.id}Page.component = ${ctx.id}Component;
  ${ctx.id}Page.fragments = Object.create(null);
  ${ctx.fragments.map(frag => `${ctx.id}Page.fragments['${frag.name}'] = {
    attributes: ${isAsync ? 'async ' : ''}({ ${vars} }, $$) => ({${frag.attributes}\n}),
    template: ${isAsync ? 'async ' : ''}({ ${vars} }, $$) => [${frag.template}\n],
    scope: ${JSON.stringify(frag.scope)},
  };`).join('\n')}
  ${ctx.id}Page.definitions = __exported;
  return ${ctx.id}Page;
};
export default Object.assign(${ctx.id}Component, {
  src: '${ctx.block.file}',
  opts: {${options || ''}\n  },
  routes: ${JSON.stringify(matched.routes)},
  context: '${ctx.block.context}',
  exported: ${JSON.stringify(exported)},
  functions: ${JSON.stringify(functions)},
});
`;

  return {
    content: out,
  };
}
