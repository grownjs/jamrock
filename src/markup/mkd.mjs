import hljs from 'highlight.js';

import bashLang from 'highlight.js/lib/languages/bash';
import lessLang from 'highlight.js/lib/languages/less';
import scssLang from 'highlight.js/lib/languages/scss';
import cssLang from 'highlight.js/lib/languages/css';
import xmlLang from 'highlight.js/lib/languages/xml';
import jsLang from 'highlight.js/lib/languages/javascript';

import { jamLang } from '../templ/lang.mjs';

hljs.registerLanguage('xml', xmlLang);
hljs.registerLanguage('css', cssLang);
hljs.registerLanguage('less', lessLang);
hljs.registerLanguage('sass', scssLang);
hljs.registerLanguage('bash', scssLang);
hljs.registerLanguage('jamrock', jamLang);
hljs.registerLanguage('javascript', jsLang);

import s from 'tiny-dedent';
import kramed from 'kramed';

import { Expr } from './expr.mjs';
import { highlight } from '../templ/utils.mjs';

export async function render(content) {
  const nodes = [];
  const buffer = content.reduce((memo, token) => {
    if (token instanceof Expr) {
      token.expr.forEach(chunk => {
        if (chunk.type === 'text') {
          memo.push(chunk.content);
        } else {
          memo.push('\0');
          nodes.push(chunk);
        }
      });
    } else {
      memo.push('\0');
      nodes.push(token);
    }
    return memo;
  }, []);

  const renderer = new kramed.Renderer();

  renderer.code = (text, lang) => {
    const code = lang
      ? hljs.highlight(lang, text).value
      : hljs.highlightAuto(text).value;

    return `<pre class="hljs" data-lang="${lang}">${code}</pre>`;
  };

  renderer.table = (headers, rows) => {
    return [
      '<div class="has-table">',
      '<table>',
      `<thead>${headers}</thead>`,
      `<tbody>${rows}</tbody>`,
      '</table>',
      '</div>',
    ].join('');
  };

  renderer.blockquote = quote => {
    if (quote.indexOf('<p>[!') === 0) {
      let type;
      const clean = quote.replace(/\[!([A-Z]+)\]/, (_, kind) => {
        type = kind.toLowerCase();
        return '';
      });

      return `<blockquote class="is-${type}">${clean.trim()}</blockquote>`;
    }
    return `<blockquote>${quote}</blockquote>`;
  };

  renderer.paragraph = text => {
    return text.charAt() === '\0' ? text : `<p>${text}</p>`;
  };

  const opts = { renderer };
  const html = await kramed(s(buffer.join('')), opts);

  return html.split('\0')
    .reduce((memo, _) => memo
      .concat(_ ? { type: 'element', name: 'fragment', attributes: { '@html': _ } } : [])
      .concat(nodes.length > 0 ? nodes.shift() : []), []);
}
