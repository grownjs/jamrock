import * as emoji from 'node-emoji';
import twemoji from 'twemoji';
import hljs from 'highlight.js';
import s from 'tiny-dedent';
import kramed from 'kramed';

import shellLang from 'highlight.js/lib/languages/shell';
import lessLang from 'highlight.js/lib/languages/less';
import cssLang from 'highlight.js/lib/languages/css';
import xmlLang from 'highlight.js/lib/languages/xml';
import jsLang from 'highlight.js/lib/languages/javascript';

import { unsafe } from './utils.ts';
import { traverse } from './walk.ts';
import { jamLang } from '../templ/lang.ts';
import { parseMarkup, decodeEnts } from '../utils/server.ts';

hljs.registerLanguage('xml', xmlLang);
hljs.registerLanguage('css', cssLang);
hljs.registerLanguage('less', lessLang);
hljs.registerLanguage('shell', shellLang);
hljs.registerLanguage('jamrock', jamLang);
hljs.registerLanguage('javascript', jsLang);

import { Expr } from './expr.ts';

export async function render(content: any[], inline: boolean | null, chunks: any[] | null, opts?: any): Promise<any[]> {
  const nodes: any[] = [];
  const buffer = content.reduce((memo: string[], token: any) => {
    if (token instanceof Expr) {
      token.expr.forEach((chunk: any) => {
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

  const renderer = new (kramed as any).Renderer();

  // Fenced code blocks are pre-extracted as code-fence AST nodes by the Block constructor
  // and resolved later by resolveCodeFences.  This renderer.code path handles the rare case
  // of a raw markdown code block that reaches kramed directly (e.g. inside a <mkd> element
  // whose source was not pre-processed, or a code block written directly in raw markdown
  // without going through the Block pipeline).
  renderer.code = (text: string, language: string) => {
    if (!language) {
      const label = text.match(/^\w+\s*\|\s*[^\n]+?\n/);
      if (label) {
        language = label[0].trim();
        text = text.substr(label[0].length);
      }
    }

    const [lang, label] = language ? language.split('|') : [];
    const code = lang ? hljs.highlight(decodeEnts(text), { language: lang.trim() }).value : text;
    const attrs = lang ? ` data-lang="${lang.trim()}"` : '';

    if (label) {
      return `<details><summary>${label}</summary><pre class="hljs"${attrs}><code>${unsafe(code)}</code></pre></details>`;
    }
    return `<pre class="hljs"${attrs}><code>${unsafe(code)}</code></pre>`;
  };

  renderer.table = (headers: string, rows: string) => {
    return [
      '<div class="has-table">',
      '<table>',
      `<thead>${headers}</thead>`,
      `<tbody>${rows}</tbody>`,
      '</table>',
      '</div>',
    ].join('');
  };

  renderer.blockquote = (quote: string) => {
    if (quote.indexOf('<p>[!') === 0) {
      let type: string;
      const clean = quote.replace(/\[!([A-Z]+)\]/, (_: string, kind: string) => {
        type = kind.toLowerCase();
        return '';
      });

      return `<blockquote class="is-${type!}">${clean.trim()}</blockquote>`;
    }
    return `<blockquote>${quote}</blockquote>`;
  };

  renderer.paragraph = (text: string) => {
    return inline || text[0] === '\0' ? text : `<p>${text}</p>`;
  };

  renderer.codespan = (text: string) => {
    return `<code>${unsafe(decodeEnts(text))}</code>`;
  };

  let input = s(buffer.join(''));
  input = opts?.emojify ? emoji.emojify(input) : input;
  input = opts?.twemoji ? twemoji.parse(input, {
    folder: 'svg',
    ext: '.svg',
  }) : input;

  const tree = parseMarkup(await kramed(input, { renderer }));
  const result = traverse(tree as any[], '', null, { stack: nodes, file: '+page.md' });

  // Resolve any code-fence nodes that survived the kramed pass as \0-restored elements.
  resolveCodeFences(result);

  return result;
}

// Minimal traverse context for reconstituting highlighted code HTML into Jamrock AST nodes.
// file must include '+page' so that traverse preserves whitespace-only text nodes (needed
// for correct indentation inside <pre><code>).
const CODE_FENCE_CTX = {
  file: '+page',
  response: { rules: [], scripts: [], styles: [], media: [], markup: {}, fragments: {}, snippets: {} },
};

function renderCodeFenceNode(langSpec: string, rawCode: string): any {
  const text = rawCode.charAt(0) !== ' ' ? rawCode.trim() : s(rawCode);
  const [lang, label] = langSpec ? langSpec.split('|').map((p: string) => p.trim()) : ['', ''];
  const code = lang ? hljs.highlight(decodeEnts(text), { language: lang }).value : text;
  const attrs = lang ? ` data-lang="${lang}"` : '';
  const html = label
    ? `<details><summary>${label}</summary><pre class="hljs"${attrs}><code>${unsafe(code)}</code></pre></details>`
    : `<pre class="hljs"${attrs}><code>${unsafe(code)}</code></pre>`;
  const parsed = traverse(parseMarkup(html) as any[], '', null, CODE_FENCE_CTX);
  return parsed[0];
}

// Walk the AST in-place and replace every { type: 'code-fence' } node produced by
// walk.ts traverse (from <x-fence> placeholders) with a proper highlighted <pre> element.
// Because the nodes are indexed by the Block constructor, ordering is guaranteed regardless
// of nesting depth — nested fenced blocks are found here even inside <section>, <div>, etc.
export function resolveCodeFences(nodes: any[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node || typeof node !== 'object') continue;
    if (node.type === 'code-fence') {
      nodes[i] = renderCodeFenceNode(node.lang, node.code);
    } else if (Array.isArray(node.elements)) {
      resolveCodeFences(node.elements);
    }
  }
}
