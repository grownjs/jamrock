const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const rimraf = require('rimraf');
const reImport = require('rewrite-imports');
const highlightjs = require('highlight.js');
const Convert = require('ansi_up').default;
const cc = require('cli-colors');
const he = require('he');

const { invoke } = require('@grown/bud/util');

// FIXME: reorganize & clean... do not re-export single methods from built-in modules

const convert = new Convert();

const RE_SPLIT_LINES = /(?<=\n)/;
const RE_FIXED_IMPORTS = /\n\s+import\b/g;
const RE_MATCH_IMPORTS = /import[^]+?from.*?[\n;]/;
const RE_TRACES_CAPTURE = /(?<=\s)at (.+)/gm;
const RE_OFFSET_CAPTURE = /\/\*!#(\d+)\*\/(?: \+ (?:\$\$\.\$)?)?/;

// eslint-disable-next-line no-control-regex
const RE_STRIP_ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

class File {
  constructor(props) {
    Object.assign(this, props);

    if (!this.path || !fs.existsSync(this.path)) {
      throw new ReferenceError(`Missing file, given '${this.path}'`);
    }

    this.lastModified = +fs.statSync(this.path).mtime;
    this.lastModifiedDate = new Date(this.lastModified);
  }

  toDataURI() {
    return `data:${this.type};base64,${Buffer.from(fs.readFileSync(this.path)).toString('base64')}`;
  }

  arrayBuffer() {
    return fs.readFileSync(this.path).buffer;
  }

  stream() {
    return fs.createReadStream(this.path);
  }

  slice(args) {
    return this.arrayBuffer().slice(...args);
  }

  text() {
    return Promise.resolve(fs.readFileSync(this.path).toString());
  }

  save(dest) {
    const orig = path.basename(this.path);
    const name = path.basename(dest);
    const destFile = name.includes('.') ? dest : path.join(dest, orig);

    fs.renameSync(this.path, destFile);
    this.path = path.resolve(destFile);
    return this;
  }
}

function trim(value) {
  return value.replace(RE_STRIP_ANSI, '');
}

function split(value) {
  return String(value).split(RE_SPLIT_LINES);
}

function unlink(filepath) {
  return fs.unlinkSync(filepath);
}
function exists(filepath) {
  return fs.existsSync(filepath);
}

function ucfirst(value) {
  return value.charCodeAt() >= 65 && value.charCodeAt() <= 90;
}

function hilight(code, lang) {
  const scripts = [];

  if (lang === 'html') {
    code = code.replace(/<script([^<>]*?)>([^]*?)<\/script>/g, (_, attrs, content) => {
      scripts.push(hilight(content, 'js'));
      return `<script${attrs}>/*!#@@script*/</script>`;
    });
  }

  let { value } = highlightjs.highlight(code, { language: lang });

  value = value.replace(/<span[^<>]*>\/\*!#@@script\*\/<\/span>/g, () => scripts.shift());

  const plain = x => x;
  const theme = {
    keyword: cc.blue,
    built_in: cc.cyan,
    type: cc.cyan.dim,
    literal: cc.blue,
    number: cc.green,
    regexp: cc.red,
    string: cc.red,
    subst: plain,
    symbol: plain,
    class: cc.blue,
    function: cc.yellow,
    title: plain,
    params: plain,
    comment: cc.green,
    doctag: cc.green,
    meta: cc.grey,
    'meta-keyword': plain,
    'meta-string': plain,
    section: plain,
    tag: cc.grey,
    name: cc.magenta,
    'builtin-name': plain,
    attr: cc.cyan,
    attribute: plain,
    variable: plain,
    bullet: plain,
    code: plain,
    emphasis: cc.italic,
    strong: cc.bold,
    formula: plain,
    link: cc.underline,
    quote: plain,
    'selector-tag': plain,
    'selector-id': plain,
    'selector-class': plain,
    'selector-attr': plain,
    'selector-pseudo': plain,
    'template-tag': plain,
    'template-variable': plain,
    addition: cc.green,
    deletion: cc.red,
    default: plain,
  };

  let last;
  value = value.split('\n').reduce((prev, cur) => {
    const matches = cur.match(/<span([^<>]+)>[^<>]*?$/);

    if (last) cur = cur.replace(/^\s*/, `$&${last}`);

    prev.push(matches ? `${cur}</span>` : cur);

    if (matches) {
      last = `<span${matches[1]}>`;
    } else {
      last = '';
    }
    return prev;
  }, []).join('\n');

  do {
    value = value.replace(/<span class="([\w-]+)">([^]*?)<\/span>/g, (_, kind, content) => {
      return kind.includes('hljs-') ? theme[kind.substr(5)](content) : content;
    });
  } while (value.includes('<span ' + 'class="hljs-')); // eslint-disable-line
  return he.decode(value).replace(/<\/?span[^<>]*>/g, '');
}

function load(code, loader) {
  let temp = code;
  let offset = 0;
  let matches;
  // eslint-disable-next-line no-cond-assign
  while (matches = temp.match(RE_MATCH_IMPORTS)) {
    temp = temp.replace(matches[0], matches[0].replace(/\S/g, ' '));
    offset = matches.index + matches[0].length;
  }

  const prelude = code.substr(0, offset);
  const fixed = prelude.replace(RE_FIXED_IMPORTS, '\nimport ');

  return code.replace(prelude, reImport.rewrite(fixed, loader));
}

function time(value) {
  if (typeof value !== 'number') {
    value = parseFloat(value || '0');
  }
  return value;
}

function stack(tpl, line, column, markup) {
  const lines = hilight(tpl, markup ? 'html' : 'js').split('\n');

  const idx = typeof line === 'undefined' ? lines.length : +line;
  const col = typeof column === 'undefined' ? lines[lines.length - 1].length : +column;

  return lines.concat('')
    .map((x, i) => {
      const num = `   ${i + 1}`.substr(-4);
      const out = [i + 1 === idx ? '⚠' : ' ', num, `| ${x}`].join(' ');
      const length = col + num.toString().length + 5;

      return i === idx ? `${Array.from({ length }).join('~')}^\n${out}` : out;
    })
    .slice(Math.max(0, idx - 3), Math.max(3, Math.min(lines.length, idx + 3)))
    .join('\n');
}

function colors(value) {
  return convert.ansi_to_html(value);
}

function inspect(value) {
  return util.inspect(value, { depth: Infinity, colors: process.env.NODE_ENV !== 'test' });
}

function realpath(file) {
  return path.resolve(file);
}

function relative(file, strip, complete) {
  if (typeof strip === 'string') {
    return complete
      ? path.resolve(file, strip)
      : path.resolve(path.dirname(strip), file);
  }

  file = path.relative('.', file);

  if (strip) {
    file = file.replace(/\.\.?\//g, '');
  }

  return file;
}

function rmdir(dest) {
  rimraf.sync(dest);
}

function join(...args) {
  return path.join(...args);
}

function noext(value) {
  return value.replace(/\.\w+$/, '');
}

function nodir(value) {
  return path.basename(value);
}

function nofile(value) {
  return path.dirname(value);
}

function status(text) {
  process.stdout.write(` \x1b[90m${text}\x1b[0m\x1b[K\n`);
}

function safeJSON(o) {
  return `\`${JSON.stringify(o).replace(/[`$\\]/g, '\\$&')}\``;
}

function identifier(prefix) {
  const hash = `x${Math.random().toString(36).substr(2, 7)}`;

  return prefix ? [prefix.replace(/[^a-zA-Z\d]/g, '-'), hash] : hash;
}

function hasChanged(source, dest) {
  if (!fs.existsSync(dest)) return true;
  return fs.statSync(source).mtime > fs.statSync(dest).mtime;
}

function writeFile(dest, source) {
  fs.outputFileSync(dest, source);
}

function readFile(source, check) {
  try {
    return fs.readFileSync(source).toString();
  } catch (e) {
    if (check) {
      try {
        return fs.readFileSync(path.resolve(__dirname, '..', source)).toString();
      } catch (_e) {
        // do nothing
      }
    }

    throw new Error(`Source not found: ${source}`);
  }
}

function mtime(source) {
  return fs.existsSync(source) && fs.statSync(source).mtime;
}

function filename(value) {
  return value.replace(/^.*?([^/]+)\.\w+$/, '$1');
}

function isVNode(value) {
  if (!Array.isArray(value)) return false;
  if (typeof value[0] !== 'string') return false;
  if (typeof value[1] !== 'object' || Array.isArray(value[1])) return false;
  return true;
}

function isFile(source) {
  return source && fs.existsSync(source) && fs.statSync(source).isFile();
}

function isSource(file) {
  return /\.(jam|rock|htmlx?)$/.test(file);
}

function isFunction(value) {
  return typeof value === 'function' && value.constructor.name !== 'Function';
}

function isIterable(value) {
  return typeof value === 'object' && (
    typeof value[Symbol.iterator] === 'function'
    || Object.prototype.toString.call(value) === '[object AsyncGenerator]'
  );
}

function isThenable(value) {
  return value instanceof Promise
    || (typeof value === 'object'
      && typeof value.then === 'function'
      && typeof value.catch === 'function');
}

function isGenerator(value) {
  return /\[object Generator|GeneratorFunction\]/.test(Object.prototype.toString.call(value));
}

function refix(text) {
  const result = text
    .replace(RE_OFFSET_CAPTURE, '')
    .replace(/\b_\$=/g, 'export default ')
    .replace(/\/\*!#@@@\*\/[^;]*?;?(?=\n|$)/g, '')
    .replace(/(const|let)([^=]+)=_\$[^;\n]+?=/g, 'export $1$2')
    .replace(/\((.+?)=await \$\$loader\((.+?)\)\);/gm, 'import $1 from $2')
    .replace(/=?await \$set\(async \(\) => [{(]/g, '')
    .replace(/\$get[^{\n}]+?=>\s*[{(]/g, '$:')
    .replace(/\/\*\*\//gm, '');

  return result;
}

function frame(tpl, src, offset) {
  let line = 0;
  let col = 0;
  for (let i = 0; i < tpl.length; i += 1) {
    if (i === offset) break;
    if (tpl[i] === '\n') {
      line += 1;
      col = 0;
    } else {
      col += 1;
    }
  }

  return `☐ ${src}:${line + 1}:${col + 1}\n${stack(tpl, line + 1, col + 1, isSource(src))}`;
}

function trace(e, props, source, include) {
  if (e.sample) return e.sample;

  props = props || {};

  const name = props.file || 'source.html';
  const chunk = e.stack.split('\n\n')[0].split('\n').slice(0, 3);
  const traces = (e.stack.match(RE_TRACES_CAPTURE) || []).reduce((memo, ex) => {
    if (!/node:|node_modules|internal|(?:vm|net|timers|events|_stream_readable|jamrock)\.js/.test(ex) && ex.includes(':')) {
      const parts = ex.replace(/[()]|(?:at|new|async)\s|\[[\s\w]+\]\s/g, '').split(' ');
      const subj = parts.length > 1 ? parts[0] : null;
      const _src = parts.length > 1 ? parts[1] : parts[0];

      let [src, line, column] = _src.split(':');
      if (!subj) {
        if (source.includes(`@@src=${name}`)) {
          const set = source.split('\n');
          const file = set[0].substr(10, set[0].length - 12);
          const matches = set[line - 1].match(RE_OFFSET_CAPTURE);

          if (matches) {
            memo.push(`\n${frame(readFile(file), file, +matches[1])}`);
          } else {
            memo.push(`\n${relative(_src)}\n${stack(source, line, column)}`);
          }
        }
      } else if (subj.includes('$$reactor')) {
        const lines = readFile(src, true).split('\n');
        const _tpl = readFile(name, true);

        memo.push(`\n${frame(_tpl, relative(name), _tpl.indexOf(refix(lines[line - 1]).trim()))}`);
      } else if (name === src) {
        const lines = source.split('\n');
        const matches = lines[line - 1] && lines[line - 1].match(RE_OFFSET_CAPTURE);

        if (matches && props.tpl) {
          memo.push(`\n${frame(props.tpl, relative(src), +matches[1])}`);
        } else {
          memo.push(`\n${stack(source, line, column)}`);
        }
      } else {
        const tpl = readFile(src, true);
        const set = tpl.split('\n');

        if (set[0].indexOf('/*!#@@src=') === 0) {
          const file = set[0].substr(10, set[0].length - 12);
          const matches = set[line - 1].match(RE_OFFSET_CAPTURE);

          if (matches) {
            memo.push(`\n${frame(readFile(file, true), file, +matches[1])}`);
          }
        } else if (include) {
          memo.push(`\n${subj} (${relative(src)})\n${stack(tpl, line, column)}`);
        }
      }
    }
    return memo;
  }, []);

  if (chunk[2] && chunk[2].includes('^')) {
    const [, line] = chunk[0].split(':');
    const lines = source.split('\n');

    if (lines[0].includes('/*!#@@src=')) {
      const _file = lines[0].match(/\/*!#@@src=(.+?)\*\//)[1];
      const _tpl = readFile(_file, true);
      const offset = _tpl.indexOf(refix(lines[line - 1]).trim());

      traces.unshift(`\n${frame(_tpl, _file, offset)}`);
    } else {
      let found;
      let current = +line;
      while (!found && current > 0) {
        found = lines[current - 1].match(RE_OFFSET_CAPTURE);
        current -= 1;
      }

      let diff = 0;
      if (chunk[1].match(RE_OFFSET_CAPTURE)) {
        diff = chunk[2].replace(/\^+$/, '').length - found[0].length;
      }

      if (found && props.tpl) {
        traces.unshift(`\n${frame(props.tpl, relative(name), +found[1] + diff)}`);
      }
    }
  }

  if (e.errors) {
    e.errors.forEach(err => {
      traces.unshift(`\n${err.text}`);
    });
  }

  return `\n${e.message.split('\n')[0]}\n${traces.join('\n')}`;
}

function use(file) {
  try { // eslint-disable-line
    return require(file);
  } catch (e) {
    e.sample = trace(e, { file }, readFile(file), true);
    throw e;
  }
}

module.exports = {
  use,
  trim,
  join,
  File,
  time,
  load,
  rmdir,
  nodir,
  noext,
  mtime,
  split,
  trace,
  stack,
  invoke,
  colors,
  hilight,
  unlink,
  exists,
  status,
  nofile,
  ucfirst,
  inspect,
  filename,
  relative,
  realpath,
  safeJSON,
  identifier,
  hasChanged,
  readFile,
  writeFile,
  isFile,
  isVNode,
  isSource,
  isFunction,
  isIterable,
  isThenable,
  isGenerator,
};
