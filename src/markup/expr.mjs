import { Is } from '../utils/server.mjs';

const RE_AS_LOCAL = /\s+as\s+(.+?)$/;
const RE_CLEAN_EXPR = /\{([^{}]+?)\}/g;
const RE_CLEAN_BLOCKS = /[#:]((?:else\s+)?if|each)\s*/;
const RE_ALL_EXPRESSIONS = /\{[:/#]?[^{}]+?\}/;
const RE_EXPR_VALUE = /\{[^{}]+\}/;
const RE_EXPR_STRICT = /^\{[^{}]+\}$/;

export class Ref {
  constructor(key) {
    this.$key = key;
  }

  static from(id) {
    return new Ref(id);
  }
}

export class Expr {
  constructor(value, position, callback) {
    this.raw = [];
    this.expr = [].concat(value);

    if (this.expr.length > 0 && ':#/@'.includes(this.expr[0].charAt(1))) {
      this.tag = this.expr[0].substr(2, 2);
      this.open = this.expr[0][1] === '#';
      this.block = true;
    }

    Object.defineProperty(this, 'token', { value: position });
    Object.defineProperty(this, 'locate', { value: callback });
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

  wrap(prefix, isAsync, expression, tokenCallback) {
    const sep = expression || this.chunk ? ' +\n' : ',\n';
    const out = this.expr.map(token => {
      if (!token) return '';

      if (tokenCallback
        && token.type === 'code'
        && token.content.tag !== 'el'
        && token.content.block
      ) tokenCallback(token, this.token);

      if (typeof token === 'object') {
        return `${token.type === 'text'
          ? prefix + JSON.stringify(token.content)
          : token.content.wrap(prefix, isAsync, expression || this.chunk)}`;
      }

      const _async = isAsync ? 'async ' : '';
      const _await = isAsync ? 'await ' : '';

      let _ref = token[1] !== '/' && Is.func(this.locate)
        ? this.locate(this.token.index, token)
        : null;

      let _expr = token.replace(RE_CLEAN_EXPR, '$1').trim();
      if (_expr.indexOf('#each') === 0) {
        const [subj, locals] = _expr.replace(RE_CLEAN_BLOCKS, '').split(RE_AS_LOCAL);

        _expr = `${_await}$$.map(${subj}, ${_async}(${locals}) => { return [`;
      } else if (_expr.indexOf('#if') === 0) {
        _expr = `${_await}$$.if(${_expr.replace(RE_CLEAN_BLOCKS, '')}, ${_async}() => { return [`;
      } else if (_expr.indexOf('/each') === 0) {
        _expr = ']; /*each*/ }),';
        _ref = null;
      } else if (_expr.indexOf('/if') === 0) {
        _expr = ']; /*if*/ }),';
        _ref = null;
      } else if (_expr.replace(/\s+/g, ' ').indexOf(':else if') === 0) {
        _expr = `]; /*elseif*/ }, () => { if (${_expr.replace(RE_CLEAN_BLOCKS, '')}) return ${_async}() => [`;
      } else if (_expr.indexOf(':else') === 0) {
        _expr = `]; /*else*/ }, ${isAsync ? 'async ' : ''}() => { return [`;
      } else if (_expr.indexOf('@debug ') === 0) {
        _expr = `$$.d({ ${_expr.substr(7)} })`;
      } else if (_expr.indexOf('@const ') === 0) {
        _expr = `(${_expr.substr(5)}, void 0)`;
      } else if (_expr.indexOf('@html ') === 0) {
        _expr = `$$.h(${_expr.substr(6)})`;
      }

      if (expression) {
        _expr = `$$.$(${_expr})`;
      }
      if (this.token && _ref) {
        this.token.index = _ref.offset[0];
      }

      return `${prefix || ''}${_ref ? `\n${prefix}/*!#${_ref.position.line}:${_ref.position.col}*/ ` : ''}${_expr}`;
    }).join(sep);

    if (this.raw.length > 0) {
      return out + sep + prefix + JSON.stringify(this.raw.join(''));
    }
    return out;
  }

  static unwrap(tpl, position, callback) {
    const chunks = [];

    do {
      const matches = tpl.match(RE_ALL_EXPRESSIONS);

      if (!matches) break;

      if (matches.index > 0) {
        const chunk = tpl.substr(0, matches.index);

        if (!Is.blank(chunk)) {
          chunks.push({
            type: 'text',
            content: chunk,
          });
        }
      }

      const start = matches.index + matches[0].length;

      tpl = tpl.substr(start);

      chunks.push({
        type: 'code',
        content: Expr.from(matches[0], position, callback),
      });
    } while (true); // eslint-disable-line

    if (!Is.blank(tpl)) {
      chunks.push({
        type: 'text',
        content: tpl,
      });
    }

    const result = new Expr([], position, callback);

    result.expr.push(...chunks);
    result.chunk = !result.expr.some(x => x.type === 'code' && x.content.block);
    return result;
  }

  static params(props, locate, tokenStart) {
    return props.reduce((memo, { key, value }) => {
      if (Expr.has(key, true)) {
        key = key.replace(RE_CLEAN_EXPR, '$1');

        if (key.indexOf('...') === 0 && value === null) {
          if (memo.$ instanceof Expr) {
            memo.$.append(key);
          } else {
            memo.$ = Expr.from(key, tokenStart, locate);
          }
        } else {
          memo[key] = Expr.from(key, tokenStart, locate);
        }
      } else if (key.indexOf(':') > 0) {
        const [prefix, prop] = key.split(':');

        if (prefix === 'on') {
          memo[prefix + prop] = value ? Expr.from(value, tokenStart, locate) : true;
        } else if (prefix === 'bind') {
          memo[key] = (value || prop).replace(RE_CLEAN_EXPR, '$1');
          memo[prop] = Expr.from(memo[key], tokenStart, locate);
        } else {
          const fixed = !(prefix === 'style' || prefix === 'class') ? `@${key}` : key;

          memo[fixed] = Expr.has(value)
            ? Expr.unwrap(value, tokenStart, locate)
            : value || Expr.from(prop, tokenStart, locate);
        }
      } else if (value !== null && Expr.has(value)) {
        memo[key] = Expr.has(value, true)
          ? Expr.from(value, tokenStart, locate)
          : Expr.unwrap(value, tokenStart, locate);
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
        obj += `\n${prefix}${value[key].wrap(prefix)},`;
        return;
      }

      let val;
      if (Is.arr(value[key])) {
        val = value[key].map(x => (
          x.content instanceof Expr
            ? `\n${x.content.wrap(prefix)}`
            : ` ${JSON.stringify(x.content)}`
        )).join(' +');
      } else {
        val = value[key] instanceof Expr
          ? `\n${value[key].wrap(prefix)}`
          : ` ${JSON.stringify(value[key])}`;
      }

      obj += `\n${prefix}'${key}':${val},`;
    });
    return obj;
  }

  static from(value, offset, callback) {
    return new Expr(value, offset, callback);
  }

  static has(value, strict) {
    return (strict ? RE_EXPR_STRICT : RE_EXPR_VALUE).test(value);
  }
}
