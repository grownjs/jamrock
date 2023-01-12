export function jamLang() {
  return {
    subLanguage: 'xml',
    contains: [
      {
        begin: /^\s*<script[^<>]*>/,
        end: /^\s*<\/script>/,
        subLanguage: 'javascript',
        excludeBegin: true,
        excludeEnd: true,
        contains: [
          { begin: /^\s*\$:/, end: /\s*/, className: 'keyword' },
        ],
      },
      {
        begin: /^\s*<style[^<>]*lang=(["']?)sass\1[^<>]*>/,
        end: /^\s*<\/style>/,
        subLanguage: 'sass',
        excludeBegin: true,
        excludeEnd: true,
      },
      {
        begin: /^\s*<style[^<>]*lang=(["']?)less\1[^<>]*>/,
        end: /^\s*<\/style>/,
        subLanguage: 'less',
        excludeBegin: true,
        excludeEnd: true,
      },
      {
        begin: /^\s*<style[^<>]*>/,
        end: /^\s*<\/style>/,
        subLanguage: 'css',
        excludeBegin: true,
        excludeEnd: true,
      },
      {
        begin: /\{/,
        end: /\}/,
        subLanguage: 'javascript',
        contains: [
          { begin: /\{/, end: /\}/, skip: true },
          {
            begin: /([:#/@])(if|else|each|debug|const|html)/,
            className: 'keyword',
            relevance: 10,
          },
        ],
      },
    ],
  };
}
