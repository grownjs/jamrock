import { Is } from '../utils/server.ts';

const RE_AS_LOCAL = /\s+as\s+(.+?)$/;
const RE_CLEAN_EXPR = /\{([^{}]+?)\}/g;
const RE_CLEAN_BLOCKS = /[#:]((?:else\s+)?if|each)\s*/;
const RE_ALL_EXPRESSIONS = /\{[:/#]?[^{}]+?\}/;
const RE_EXPR_VALUE = /\{[^{}]+\}/;
const RE_EXPR_STRICT = /^\{[^{}]+\}$/;

export class Expr {
  raw: string[];
  expr: any[];
  declare comment: boolean | undefined;
  declare tag: string | undefined;
  declare name: string | undefined;
  declare args: string[] | undefined;
  declare open: boolean | undefined;
  declare block: boolean | undefined;

  declare readonly token: any;
  declare readonly locate: ((offset: number, value: any) => any) | undefined;
  declare readonly context: Record<string, { value: string; position: { line: number; col: number } }>;

  constructor(value: any, position: any, context?: any) {
    this.raw = [];
    this.expr = [].concat(value);

    if (this.expr.length > 0) {
      if (this.head[1] === '%') {
        this.comment = true;
      } else if (':#/@'.includes(this.head[1])) {
        this.tag = this.head.includes(' ')
          ? this.head.substr(1, this.head.indexOf(' ') - 1)
          : this.head.substr(1, this.head.length - 2);

        if (this.tag === '#snippet') {
          const matches = this.head.match(/ (\w+)(?:\((.+?)\))?/);

          this.name = matches[1];
          this.args = matches[2]
            ? matches[2].split(',').map((_: string) => _.trim())
            : [];
        }

        this.open = this.head[1] === '#';
        this.block = true;
      }
    }

    Object.defineProperty(this, 'token', { value: position });
    Object.defineProperty(this, 'locate', { value: context?.locate });
    Object.defineProperty(this, 'context', { value: {} });
  }

  get inline(): boolean {
    return !this.expr.some((_: any) => Is.str(_.content) && _.content?.includes('\n'));
  }

  get offset(): any {
    return this.locate!(this.token.index, this.head);
  }

  get inner(): string {
    if (!Is.str(this.head)) {
      return '';
    }

    return this.expr.map((_: string) => _.replace(/^\{|\}$/g, ''))
      .join('')
      .replace(this.tag!, '')
      .trim();
  }

  get head(): any {
    return this.expr[0];
  }

  toString(): string {
    return this.expr
      .filter((x: any) => x.type === 'text')
      .map((x: any) => x.content)
      .join('');
  }

  append(value: any): this {
    this.expr.push(value);
    return this;
  }

  concat(value: string): this {
    this.raw.push(value);
    return this;
  }

  wrap(prefix?: string, expression?: boolean, isSpreading?: boolean): string {
    const ctx = Object.entries(this.context)
      .map(([k, v]) => `\n/*!#${v.position.line}:${v.position.col}*/const ${k}=${v.value};`).join(prefix || '');

    const sep = isSpreading || expression !== false ? '\n,' : '\n+';
    const out = this.expr.reduce((memo: string[], token: any) => {
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
        ? this.locate!(this.token.index, token)
        : null;

      let _expr = token.replace(RE_CLEAN_EXPR, '$1').trim();

      if (_expr.indexOf('#each') === 0) {
        const [subj, locals] = _expr.replace(RE_CLEAN_BLOCKS, '').split(RE_AS_LOCAL);

        _expr = `$$.map(${subj}, (${locals || ''}) => { ${ctx}return [`;
      } else if (_expr.indexOf('#if') === 0) {
        _expr = `$$.if(${_expr.replace(RE_CLEAN_BLOCKS, '')}, () => { ${ctx}return [`;
      } else if (_expr.indexOf('/each') === 0) {
        _expr = ']; /*each*/ }),';
        _ref = null;
      } else if (_expr.indexOf('/if') === 0) {
        _expr = ']; /*if*/ }),';
        _ref = null;
      } else if (_expr.replace(/\s+/g, ' ').indexOf(':else if') === 0) {
        _expr = `]; /*elseif*/ }, () => { ${ctx}if (${_expr.replace(RE_CLEAN_BLOCKS, '')}) return () => [`;
      } else if (_expr.indexOf(':else') === 0) {
        _expr = `]; /*else*/ }, () => { ${ctx}return [`;
      } else if (_expr.indexOf('@render ') === 0) {
        _expr = `$$.r(${_expr.substr(7)})?.($$)`;
      } else if (_expr.indexOf('@debug ') === 0) {
        _expr = `$$.d({ ${_expr.substr(7)} })`;
      } else if (_expr.indexOf('@html') === 0) {
        let htmlExpr = _expr.substr(5);
        let tag = 'div';
        if (htmlExpr[0] === ':') {
          const colonEnd = htmlExpr.indexOf(' ');
          if (colonEnd > 1) {
            tag = htmlExpr.substring(1, colonEnd);
            htmlExpr = htmlExpr.substr(colonEnd + 1);
          }
        } else {
          htmlExpr = htmlExpr.substr(1);
        }
        if (/^\$\w+$/.test(htmlExpr)) {
          _expr = `$$.s(${htmlExpr.substr(1)}, '${tag}')`;
        } else {
          _expr = `$$.h(${htmlExpr}, '${tag}')`;
        }
      } else if (_expr.indexOf('@raw ') === 0) {
        _expr = _expr.substr(5);
      } else if (expression !== false) {
        if (_expr.includes('$')) {
          _expr = _expr.replace(/\$(\w+)/g, '$1.value');
          _expr = `function $signal() { return ${_expr}; }`;
        } else {
          _expr = `$$.$(${_expr})`;
        }
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

  static unwrap(template: string, position: any, context: any = {}, preserve: boolean = false): Expr {
    const chunks: any[] = [];

    do {
      const matches = template.match(RE_ALL_EXPRESSIONS);

      if (!matches) break;

      if (matches.index! > 0) {
        const chunk = template.substr(0, matches.index);

        if (preserve || !Is.blank(chunk)) {
          chunks.push({
            type: 'text',
            content: chunk,
          });
        }
      }

      const start = matches.index! + matches[0].length;

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

    if (preserve || !Is.blank(template)) {
      chunks.push({
        type: 'text',
        content: template,
      });
    }

    const result = new Expr([], position, context);

    result.expr.push(...chunks);
    return result;
  }

  static params(props: Array<{ key: string; value: any }>, context: any, tokenStart: any): Record<string, any> {
    return props.reduce((memo: Record<string, any>, { key, value }) => {
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

  static props(value: Record<string, any>, prefix: string): string {
    let obj = '';
    Object.keys(value).forEach(key => {
      if (key === '$' && value[key] instanceof Expr) {
        obj += `\n${prefix}${value[key].wrap(prefix, false, true)},`;
        return;
      }

      let val = 'null';
      if (Is.arr(value[key])) {
        val = value[key].map((x: any) => (
          x.content instanceof Expr ? x.content.wrap(prefix) : JSON.stringify(x.content)
        )).join(' +');
      } else {
        val = value[key] instanceof Expr ? value[key].wrap(prefix, false) : JSON.stringify(value[key]);
      }

      obj += `\n${prefix}'${key}':${val},`;
    });
    return obj;
  }

  static from(value: any, offset: any, context?: any): Expr {
    return new Expr(value, offset, context);
  }

  static has(value: any, strict?: boolean): boolean {
    return (strict ? RE_EXPR_STRICT : RE_EXPR_VALUE).test(value);
  }
}
