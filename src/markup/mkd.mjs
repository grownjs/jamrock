import hljs from 'highlight.js';
import s from 'tiny-dedent';
import kramed from 'kramed';

import shellLang from 'highlight.js/lib/languages/shell';
import lessLang from 'highlight.js/lib/languages/less';
import cssLang from 'highlight.js/lib/languages/css';
import xmlLang from 'highlight.js/lib/languages/xml';
import jsLang from 'highlight.js/lib/languages/javascript';

import { unsafe } from './utils.mjs';
import { traverse } from './walk.mjs';
import { jamLang } from '../templ/lang.mjs';
import { parseMarkup, decodeEnts } from '../utils/server.mjs';

hljs.registerLanguage('xml', xmlLang);
hljs.registerLanguage('css', cssLang);
hljs.registerLanguage('less', lessLang);
hljs.registerLanguage('shell', shellLang);
hljs.registerLanguage('jamrock', jamLang);
hljs.registerLanguage('javascript', jsLang);

import { Expr } from './expr.mjs';

export async function render(content, inline, chunks) {
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
    if (text === '\n' && chunks.length > 0) {
      text = chunks.shift().code;
      text = text.charAt() !== ' '
        ? text.trim()
        : s(text);
    }

    const code = lang ? hljs.highlight(text, { language: lang }).value : text;
    const attrs = lang ? ` data-lang="${lang}"` : '';

    return `<pre class="hljs"${attrs}><code>${unsafe(code)}</code></pre>`;
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
    return inline || text[0] === '\0' ? text : `<p>${text}</p>`;
  };

  renderer.codespan = text => {
    return `<code>${decodeEnts(text)}</code>`;
  };

  const tree = parseMarkup(await kramed(s(buffer.join('')), { renderer }));
  const result = traverse(tree, '', null, { stack: nodes, file: '+page.md' });

  return result;
}
