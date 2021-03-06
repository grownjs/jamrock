const { vars } = require('eslint-plugin-jamrock/util');

const reExport = require('rewrite-exports');

const { load } = require('../util');

const RE_IMPORT_LOCS = /(\/\*!#\d+\*\/)\n/g;
const RE_USED_EXPORTS = /=_[\w$.]+=/g;
const RE_UNSAFE_DOLLAR = /[$]/g;
const RE_UNSAFE_REQUIRE = /__safe_require__/g;
const RE_BACKUP_BRANCHES = /}\s*catch\s*(?:\([^()]+\))?\s*{|}\s*finally\s*{|}\s*else(?:\s+if[^{}]+)?\s*{/g;
const RE_UNBACKUP_BRANCHES = /@@else/g;
const RE_LOGICAL_KEYWORDS = / *(?:do|if|for|try|while|await|yield|switch) +/;
const RE_ACCESED_SYMBOLS = /(?<=[?:] *)[_$a-zA-Z]\w*|(?:(?<=[=([] *)[_$a-zA-Z]\w*|(?<![.]\w*)[_$a-zA-Z]\w*)(?= *[.,;\n[})\]|&?])|(?<![.]\w*)[_$a-zA-Z]\w*(?= *[(!<=>/*+-]{2,3}| *in *)/g; // eslint-disable-line

function expressions(code, deps, locals) {
  const regex = new RegExp(`\\$:|(?<=\\s|^)((?:const|let)(\\s+)(${locals.join('|')}))(\\s*)=_\\$\\.\\3=`);
  const backup = [];

  code = code.replace(RE_BACKUP_BRANCHES, _ => {
    backup.push(_);
    return '@@else';
  });

  let matches;
  do {
    matches = code.match(regex);
    if (!matches) break;

    const isEffect = matches[0] === '$:';
    const isConst = !isEffect && matches[1].includes('const');

    let offset = matches.index;
    let suff = ')';
    let re = '';
    if (isEffect) re = '$get(async () => {';
    else if (!isConst) re = `await $set(async () => {${matches[2]}${matches[3]}${matches[4]}=`;
    else re = `${matches[3]}${matches[4]}=await $set(async () => (`;

    offset += re.length;
    code = code.replace(matches[0], re);

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

    if (isEffect) {
      const _vars = (code.substr(offset, i - offset).match(RE_ACCESED_SYMBOLS) || [])
        .reduce((memo, x) => memo.concat(!memo.includes(x) ? x : []), [])
        .filter(x => deps.includes(x))
        .map(x => `'${x}'`)
        .join(', ');

      suff = matches[0] === '$:' ? `/*!#@@@*/}, [${_vars}])` : suff;
    } else if (!isConst) suff = `/*!#@@@*/}${suff}`;
    else suff = `/*!#@@@*/)${suff}`;

    const pre = code.substr(0, i + diff);
    const post = code.substr(i + diff);
    const clean = pre.substr(offset).replace(RE_USED_EXPORTS, '=');

    let fix = '';
    if (pre.substr(-1) === '=') fix = 'null';
    code = pre.substr(0, offset) + clean + fix + suff + close + post;
  } while (true); // eslint-disable-line

  return code.replace(RE_UNBACKUP_BRANCHES, () => backup.shift());
}

function transform(self, props, loader, prelude, callback) {
  let { hasVars, children, code } = self;

  const {
    variables, locals, keys, deps,
  } = self;

  const original = code;
  const rewrite = [];
  const alias = {};

  loader = loader || '__safe_require__';
  const _loader = loader.replace(RE_UNSAFE_DOLLAR, '\\$');
  const _require = new RegExp(`\\b(?:const|let)\\s+([^]*?)\\s*=\\s*(${_loader}(.*?))(?=[\\n;])`, 'g');

  let offset = 0;
  code = code.replace(/(?<=\b)import\b/g, _ => {
    const pos = original.indexOf(_, offset);
    offset += pos;
    return `/*!#${pos}*/\n${_}`;
  });

  code = load(code, loader.replace(RE_UNSAFE_DOLLAR, '$$$$')).replace(_require, (_, _vars, source) => {
    const fixedVars = _vars.charAt() !== '{' && _vars.includes(',')
      ? `{${_vars}}`
      : _vars;

    return `(${fixedVars}=${source})`;
  });

  code = reExport(code, '_$', loader, '$def', (kind, _vars, mod, ctx, fn, x) => {
    if (kind === 'object') {
      Object.keys(_vars).forEach(key => {
        if (locals[_vars[key]]) {
          delete locals[_vars[key]];
        } else {
          keys.push(_vars[key]);
        }
        alias[_vars[key]] = key;
        locals[key] = 'export';
        hasVars = true;
      });

      return `${x}(${ctx}, { ${
        Object.keys(_vars).reduce((memo, k) => memo.concat(_vars[k] ? `${k}: ${
          props ? `(${_vars[k]} = ${_vars[k]} || ${props}.${k})` : _vars[k]
        }` : k), []).join(', ')
      } })`;
    }

    if (!children.includes(mod)) {
      children.push(mod);
    }

    if (!(kind === '*' || kind === 'default')) {
      _vars.forEach(key => {
        locals[key] = 'export';
        keys.push(key);
      });
      hasVars = true;

      return `${x}(${ctx}, { ${_vars.join(', ')} })`;
    }
    return _vars;
  });

  if (callback) {
    children = callback(children) || [];
  }

  if (hasVars) {
    keys.forEach(k => {
      if (['const', 'let'].includes(locals[k]) || alias[k]) {
        if (!alias[k]) rewrite.push(k);
        if (locals[k] && locals[k] !== 'const') deps.push(k);
      }
    });
  }

  if (prelude !== false) {
    code = `async $$ => {with ($$) {${code}}}`;
  }

  code = expressions(code, deps, rewrite);
  code = code.replace(RE_UNSAFE_REQUIRE, 'require');
  code = code.replace(RE_IMPORT_LOCS, '$1');

  return {
    code, hasVars, variables, children, locals, alias, deps, keys,
  };
}

module.exports = { transform, variables: vars };
