interface LanguageRule {
  begin?: RegExp | string;
  end?: RegExp | string;
  subLanguage?: string;
  className?: string;
  excludeBegin?: boolean;
  excludeEnd?: boolean;
  relevance?: number;
  skip?: boolean;
  contains?: LanguageRule[];
}

interface LanguageDefinition {
  subLanguage: string;
  contains: LanguageRule[];
}

export function jamLang(): LanguageDefinition {
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
          {
            begin: /\b(signal|computed|effect|batch|untracked)\b/,
            className: 'built_in',
            relevance: 5,
          },
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
            begin: /([:#/@])(if|else|each|debug|const|html|snippet|render)/,
            className: 'keyword',
            relevance: 10,
          },
          {
            begin: /\b(signal|computed|effect|batch|untracked)\b/,
            className: 'built_in',
            relevance: 5,
          },
        ],
      },
    ],
  };
}
