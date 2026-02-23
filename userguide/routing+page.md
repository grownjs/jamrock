<head>
  <title>Jamrock | Routing</title>
</head>

# Routing

Jamrock uses file-system routing inspired by SvelteKit. Routes are defined by creating files in your pages directory, and the file path determines the URL path.

## File-Based Routes

Files ending with `+page.html` or `+page.md` define routes:

| Filename | Route |
| - | - |
| `index+page.html` | `/` |
| `about+page.html` | `/about` |
| `blog/index+page.html` | `/blog` |
| `blog/[slug]+page.html` | `/blog/:slug` |

## Dynamic Segments

Use brackets for dynamic route parameters:

| Filename | Route | Example Match |
| - | - | - |
| `[id]+page.html` | `/:id` | `/123`, `/abc` |
| `blog/[slug]+page.html` | `/blog/:slug` | `/blog/hello-world` |
| `[...path]+page.html` | `/*path` | `/a/b/c` (catch-all) |

### Optional Parameters

Use parentheses for optional segments:

| Filename | Route | Matches |
| - | - | - |
| `(lang)+page.html` | `/:lang?` | `/`, `/en` |
| `(lang).blog+page.html` | `/:lang?/blog` | `/blog`, `/en/blog` |

### Parameter Syntax

There are two equivalent syntaxes for parameters:

- `$param` — short form: `$id+page.html`
- `[param]` — bracket form: `[id]+page.html`

Both result in the same route. The bracket form is required for catch-all parameters.

## Special Files

Each directory can have special files:

| File | Purpose |
| - | - |
| `+page.html` | Route component |
| `+page.md` | Markdown route (compiled to HTML) |
| `+layout.html` | Layout wrapper (applies to all nested routes) |
| `+error.html` | Error boundary for this subtree |
| `+server.mjs` | Server-side handlers, middleware, data loading |

## Layouts

Layouts wrap all pages in their directory and nested directories:

```
pages/
├── +layout.html          # Root layout (wraps everything)
├── index+page.html       # / — wrapped by root layout
└── admin/
    ├── +layout.html      # Admin layout (wraps /admin/*)
    └── dashboard+page.html  # /admin/dashboard — wrapped by both layouts
```

## Route Groups

Directories wrapped in parentheses don't affect the URL:

```
pages/
├── (marketing)/
│   ├── about+page.html   # /about
│   └── contact+page.html # /contact
└── (app)/
    └── dashboard+page.html # /dashboard
```

This is useful for grouping routes under a shared layout without affecting the URL structure.

## Ignored Segments

Segments starting with `_` are ignored in the URL:

| Filename | Route |
| - | - |
| `_site/sitemap[.xml]+page.html` | `/sitemap.xml` |
| `_static/[...file]+page.html` | `/static/*file` |

## File Extensions

Use `[.ext]` to preserve file extensions in routes:

| Filename | Route |
| - | - |
| `feed[.xml]+page.html` | `/feed.xml` |
| `robots[.txt]+page.html` | `/robots.txt` |

<nav class="flex gap-sm between">
  <span>
    ➯ Next: <a href="/configuration#top">Configuration</a>
  </span>
  <a href="/#top">
    &uarr; Back to the top
  </a>
</nav>
