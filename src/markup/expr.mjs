import { Is } from '../utils/server.mjs';

const RE_AS_LOCAL = /\s+as\s+(.+?)$/;
const RE_CLEAN_EXPR = /\{([^{}]+?)\}/g;
const RE_CLEAN_BLOCKS = /[#:]((?:else\s+)?if|each)\s*/;
const RE_ALL_EXPRESSIONS = /\{[:/#]?[^{}]+?\}/;
const RE_EXPR_VALUE = /\{[^{}]+\}/;
const RE_EXPR_STRICT = /^\{[^{}]+\}$/;

/* export class Ref {
  constructor(key) {
    this.$key = key;
  }

  static from(id) {
    return new Ref(id);
  }
} */

export class Expr {
  constructor(value, position, context) {
    this.raw = [];
    this.expr = [].concat(value);

    if (this.expr.length > 0) {
      if (this.expr[0][1] === '%') {
        this.comment = true;
      } else if (':#/@'.includes(this.expr[0][1])) {
        this.tag = this.expr[0].includes(' ')
          ? this.expr[0].substr(1, this.expr[0].indexOf(' ') - 1)
          : this.expr[0].substr(1, this.expr[0].length - 2);

        if (this.tag === '#snippet') {
          const matches = this.expr[0].match(/ (\w+)(?:\((.+?)\))?/);

          this.name = matches[1];
          this.args = matches[2]
            ? matches[2].split(',').map(_ => _.trim())
            : [];
        }

        this.open = this.expr[0][1] === '#';
        this.block = true;
      }
    }

    Object.defineProperty(this, 'token', { value: position });
    Object.defineProperty(this, 'locate', { value: context?.locate });
  }

  toString() {
    return this.expr
      .filter(x => x.type === 'text')
      .map(x => x.content)
      .join('');
  }

  append(value) {
    this.expr.push(value);
    return this;
  }

  concat(value) {
    this.raw.push(value);
    return this;
  }

  wrap(prefix, expression, isSpreading) {
    const sep = isSpreading || expression !== false ? '\n,' : '\n+';
    const out = this.expr.reduce((memo, token) => {
      if (!token) return memo;

      if (typeof token === 'object') {
        if (token.content.comment) {
          return memo;
        }

        return memo.concat(`${token.type === 'text'
          ? prefix + JSON.stringify(token.content)
          : token.content.wrap(prefix, expression, isSpreading)}`);
      }

      let _ref = token[1] !== '/' && Is.func(this.locate)
        ? this.locate(this.token.index, token)
        : null;

      let _expr = token.replace(RE_CLEAN_EXPR, '$1').trim();

      if (_expr.indexOf('#each') === 0) {
        const [subj, locals] = _expr.replace(RE_CLEAN_BLOCKS, '').split(RE_AS_LOCAL);

        _expr = `await $$.map(${subj}, async (${locals || ''}) => { return [`;
      } else if (_expr.indexOf('#if') === 0) {
        _expr = `await $$.if(${_expr.replace(RE_CLEAN_BLOCKS, '')}, async () => { return [`;
      } else if (_expr.indexOf('/each') === 0) {
        _expr = ']; /*each*/ }),';
        _ref = null;
      } else if (_expr.indexOf('/if') === 0) {
        _expr = ']; /*if*/ }),';
        _ref = null;
      } else if (_expr.replace(/\s+/g, ' ').indexOf(':else if') === 0) {
        _expr = `]; /*elseif*/ }, () => { if (${_expr.replace(RE_CLEAN_BLOCKS, '')}) return async () => [`;
      } else if (_expr.indexOf(':else') === 0) {
        _expr = ']; /*else*/ }, async () => { return [';
      } else if (_expr.indexOf('@render ') === 0) {
        _expr = `await $$.r(${_expr.substr(7)})?.($$)`;
      } else if (_expr.indexOf('@debug ') === 0) {
        _expr = `$$.d({ ${_expr.substr(7)} })`;
      } else if (_expr.indexOf('@const ') === 0) {
        _expr = `(${_expr.substr(6)}, void 0)`;
      } else if (_expr.indexOf('@html ') === 0) {
        _expr = `$$.h(${_expr.substr(6)})`;
      } else if (expression !== false) {
        _expr = `$$.$(${_expr})`;
      }

      if (this.token && _ref) {
        this.token.index = _ref.offset[0];
      }

      return memo.concat(`${prefix || ''}${_ref ? `\n${prefix}/*!#${_ref.position.line}:${_ref.position.col}*/ ` : ''}${_expr}`);
    }, []).join(sep);

    if (this.raw.length > 0) {
      return `${out}${sep}${prefix}${JSON.stringify(this.raw.join(''))}`;
    }
    return out;
  }

  static unwrap(template, position, context = {}) {
    const chunks = [];

    do {
      const matches = template.match(RE_ALL_EXPRESSIONS);

      if (!matches) break;

      if (matches.index > 0) {
        const chunk = template.substr(0, matches.index);

        if (!Is.blank(chunk)) {
          chunks.push({
            type: 'text',
            content: chunk,
          });
        }
      }

      const start = matches.index + matches[0].length;

      template = template.substr(start);

      if (context.lexer && !'%/:'.includes(matches[0][1])) {
        const token = context.locate(position.index, position);
        const subject = matches[0].substr(1, matches[0].length - 2);

        context.lexer(subject, token);
      }

      chunks.push({
        type: 'code',
        content: Expr.from(matches[0], position, context),
      });
    } while (true); // eslint-disable-line

    if (!Is.blank(template)) {
      chunks.push({
        type: 'text',
        content: template,
      });
    }

    const result = new Expr([], position, context);

    result.expr.push(...chunks);
    return result;
  }

  static params(props, context, tokenStart) {
    return props.reduce((memo, { key, value }) => {
      if (Expr.has(key, true)) {
        key = key.replace(RE_CLEAN_EXPR, '$1');

        if (key.indexOf('...') === 0 && value === null) {
          if (memo.$ instanceof Expr) {
            memo.$.append(key);
          } else {
            memo.$ = Expr.from(key, tokenStart, context);
          }
        } else {
          memo[key] = Expr.from(key, tokenStart, context);
        }
      } else if (key.indexOf(':') > 0) {
        const [prefix, prop] = key.split(':');

        if (prefix === 'on') {
          memo[prefix + prop] = value ? Expr.from(value, tokenStart, context) : true;
        } else if (prefix === 'ws' && ['call', 'yield'].includes(prop)) {
          // memo[`${prefix}:${prop}`] = value.substr(1, value.length - 2);
          memo[`${prefix}:${prop}`] = Expr.from(value, tokenStart, context);
        } else if (prefix === 'bind') {
          memo[key] = (value || prop).replace(RE_CLEAN_EXPR, '$1');
          memo[prop] = Expr.from(memo[key], tokenStart, context);
        } else {
          const fixed = !(prefix === 'style' || prefix === 'class') ? `@${key}` : key;

          memo[fixed] = Expr.has(value)
            ? Expr.unwrap(value, tokenStart, context)
            : value || Expr.from(prop, tokenStart, context);
        }
      } else if (value !== null && Expr.has(value)) {
        memo[key] = Expr.has(value, true)
          ? Expr.from(value, tokenStart, context)
          : Expr.unwrap(value, tokenStart, context);
      } else {
        memo[key] = value === null ? true : value;
      }
      return memo;
    }, {});
  }

  static props(value, prefix) {
    let obj = '';
    Object.keys(value).forEach(key => {
      if (key === '$' && value[key] instanceof Expr) {
        obj += `\n${prefix}${value[key].wrap(prefix, false, true)},`;
        return;
      }

      let val = 'null';
      if (Is.arr(value[key])) {
        val = value[key].map(x => (
          x.content instanceof Expr ? x.content.wrap(prefix) : JSON.stringify(x.content)
        )).join(' +');
      } else {
        val = value[key] instanceof Expr ? value[key].wrap(prefix, false) : JSON.stringify(value[key]);
      }

      obj += `\n${prefix}'${key}':${val},`;
    });
    return obj;
  }

  static from(value, offset, context) {
    return new Expr(value, offset, context);
  }

  static has(value, strict) {
    return (strict ? RE_EXPR_STRICT : RE_EXPR_VALUE).test(value);
  }
}
