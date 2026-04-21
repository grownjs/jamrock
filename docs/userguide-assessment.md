# Jamrock Userguide: Assessment & Redesign Proposal

*April 2026 — Written after reviewing AGENTS.md, all 13 existing userguide pages, and the full examples directory.*

---

## The Honest State of the Current Docs

The existing userguide is structurally there but content-incomplete:

- **3 of 13 pages are lorem ipsum** (Events, Actions, Bindings) — the most important ones for interactive apps
- **2 pages duplicate the same topic** (Hooks and Scripting both document the signals API)
- **The index page has almost no content** — a framework pitch and a curl command, no more
- **The novel concepts have no dedicated home**: RPC (`rpc:call`), the SSE fragment protocol, and the SSR-to-client hydration story are each hinted at but never explained end-to-end
- **GTK4 doesn't exist in the docs** at all, even as a mention

The individual pages that *are* written are decent — the Components page is solid, Introduction is clean. But the userguide as a whole doesn't answer the fundamental question a new visitor has: *what is the mental model here?*

---

## The Mental Model Problem

This is the crux of the redesign.

Jamrock does something genuinely different from Next.js, SvelteKit, Remix, Astro, etc. But the docs don't name it. A developer landing on jamrock.site will reflexively try to fit it into one of those boxes and get confused.

Here is what Jamrock actually is, stated plainly:

> **Jamrock renders everything on the server. Interactivity is additive, not foundational. You write HTML components that run as server code first, and opt into client behavior at the smallest unit of granularity possible.**

That's the pitch. Everything in the docs should flow from that sentence. The three layers of Jamrock are:

1. **Server render** — `.html` files, `<script>` (no context), `<script context="module">`. This is the default. Full HTML, no JS shipped.
2. **Fragment updates** — `<fragment name="x">` + server functions (`export async function`). The server re-renders specific DOM regions via SSE and pushes them to the client. No page reload, no SPA router.
3. **Client signals** — `<script context="client">`, `signal()`, `$value` in templates. True client-side reactivity for things that genuinely need it (toggles, live inputs, counters).

**The current docs treat these three as peers, but they're actually a hierarchy.** If you understand the hierarchy — server first, fragments next, client signals last — Jamrock makes immediate sense. If you don't, it seems like a mess of competing systems.

---

## What's Missing (and Why It Hurts)

### 1. The RPC story is buried

`rpc:call={fn}` is the signature feature of Jamrock. It lets you write a server function, attach it to a form or button, and have the framework handle the full cycle: HTTP → state change → dirty-check → re-render affected fragments → SSE push → DOM patch. No Redux. No fetch(). No hydration mismatch. Just a function.

The current docs don't explain this anywhere. The fragments page mentions "updates driven by the framework" without saying how they get triggered. The components page shows `export async function` but never connects it to `rpc:call`. A first-time reader has no idea these are related.

The `todo+page.html` example is perfect for explaining this. It shows:
- Module-level state (`let todos = []`)
- Server functions (`addItem`, `removeItem`, `toggleItem`)
- Fragment that re-renders on change (`<fragment name="todo-list" interval="0">`)
- The `@on:submit={addItem}` form pattern

That single file is worth three documentation pages if walked through properly.

### 2. The `$signal` convention is introduced inconsistently

Hooks page shows `let count = signal(0)` with `{$count}` in templates.  
Scripting page shows `const count = signal(0)` with `count.value` everywhere but never explains the `$` template shorthand.  
Reactive example file uses `{count}` (no `$`) for plain values and `{$open}` for signals, which is correct but unexplained.

There needs to be one definitive explanation:
- In `<script>` or `<script context="client">`: use `count.value` to read/write
- In templates `{...}`: use `{$count}` to auto-unwrap — compiles to `count.value`
- In template block conditions `{#if $count > 2}`: `$` prefix required for the compiler to know it's reactive

This rule is simple when stated once. Right now it's never stated once.

### 3. The two RPC mechanisms are invisible

AGENTS.md explains there are two:
- **SSE-based RPC** (`rpc:call={fn}`) — the primary one, driven by the fragment system
- **REST-style RPC** (`import { rpc } from 'jamrock'` → `POST /_rpc/...`) — newer, for programmatic calls

Neither is documented in the userguide. A user who wants to call a server function from a button click and update part of the page has no documented path. This is the most common interactive pattern.

### 4. The `@` prefix convention isn't explained

`@on:submit`, `@reset`, `@async`, `@confirm`, `@put`, `@post`, `@patch`, `@delete` — these are all documented in separate places but the rule is never stated: **`@` attributes are framework directives that become `data-*` attributes in the rendered HTML, interpreted by the client runtime.**

Once you know the rule, everything is obvious. Without the rule, every `@` attribute looks like a special case.

### 5. GTK4 is a genuinely shocking differentiator

The fact that Jamrock runs as a desktop app framework via GJS/GTK4, with the same `.html` component syntax, 26+ widget types, and all the signal reactivity — and has 20 working demo apps — is something that should be in the docs. Even if it's "advanced" or "experimental." It answers the question *why does this exist?* in a way nothing else does.

---

## Proposed Structure

I'd reorganize around **user intent** (what someone is trying to accomplish) rather than **feature taxonomy** (what the framework provides).

### Getting Started
- **Welcome** — The mental model: server-first, fragments-not-SPA, progressive client. One diagram. No code yet.
- **Installation & First App** — `curl | bash`, `jamrock init`, `npm run dev`. See something work.
- **Your First Route** — A `+page.html` that renders data. Shows the server `<script>`, template syntax, `jamrock:conn` for request data.
- **Your First Form** — Add server state mutation. A simple guestbook. Introduces `export default { POST }`, `csrfProtect`, flash messages.
- **Your First Interactive Piece** — Counter with `signal()` and `<script context="client">`. Shows the client layer without RPC.

### Templates
- **File Naming & Routes** — The routing table from the current Introduction page, expanded with layout resolution and `+error.html`.
- **Components** — The current page, mostly good. Clean up the "three types" intro.
- **Template Syntax** — All `{...}` forms in one place: interpolation, `{#if}`, `{#each}`, `{#snippet}`, `{@render}`, `{@html}`, `{@raw}`, `{@debug}`. With worked examples.
- **Directives** — The current page is decent. Add: the `@` prefix rule, `class:`, `style:`, `bind:`, `on:`. Explain the difference between `on:click` (hydration hint) and `onclick={fn}` (client handler).

### Interactivity
- **Client Signals** — Merge Hooks + Scripting into one page. The canonical rule for `$signal` vs `.value`. `signal`, `computed`, `effect`, `batch`, `untracked`, `trap`. Show the reactive example.
- **Server Functions & RPC** — This page doesn't exist yet. It's the most important page to write. Cover `rpc:call={fn}` end-to-end with the todo example. Mention the REST-style RPC as a secondary option.
- **Fragments** — Rewrite with the RPC connection made explicit. Fragments are the *target* of server function updates. Cover `interval`, `mode`, `limit`, streaming generators, the `key` prop for recursive components (the nested comments pattern).
- **Bindings** — Replace lorem ipsum. `bind:value`, `bind:checked`, `bind:this`. The two contexts: server-side collection (simulated form) vs client-side signal binding.
- **Events** — Replace lorem ipsum. Unify the event story: `onclick={clientFn}` (inline), `on:click={clientFn}` (hydration), `@on:submit={serverFn}` (delegated server), `rpc:call={serverFn}` (RPC trigger). One table comparing all four.

### Server Side
- **The Connection** — The current `conn` page, mostly good. Add a quick-reference table at the top.
- **Middleware** — `+server.mjs` patterns, `http()`, `csrf()`, middleware chains, route declarations, `catch`/`finally`.
- **Session & Auth** — Session store, cookies, CSRF protection, flash messages together.
- **Layouts & Errors** — `+layout.html`, `+error.html`, `{@render children?.()}`, error handling patterns.

### Styling
- **Styling** — Keep the current page, expand with concrete Less variable examples, UnoCSS setup, and the scoping model.

### Going Further
- **Configuration** — `dev.config.mjs`, available options, environment detection.
- **Deployment** — Node.js, Deno, Bun. Production build. Static file serving.
- **GTK4 Desktop** — The GJS runtime, the 26 widgets, a "Hello GTK4" component, link to the playground demos.

---

## High-Value Examples to Feature

These already exist as working code and should be lifted directly into documentation:

| Example file | Documents |
|---|---|
| `examples/todo+page.html` | The canonical RPC + fragment pattern |
| `examples/reactive+page.html` | Client signals with if/each/computed |
| `examples/nested-comments+page.html` + `components/comments.html` | Recursive components, RPC in nested context, `key` prop |
| `examples/rpc+page.html` | Generator streaming via fragments, `rpc:yield` |
| `examples/forms+page.html` | Form actions, validation, flash |
| `playground/*.html` (GTK4) | Desktop widgets reference |

The nested comments example is particularly worth showcasing. A self-referential component with server-side RPC for adding replies and liking — expressed in ~90 lines — is a strong proof-of-concept for what Jamrock uniquely makes possible.

---

## Priority Order

If time is limited, this is the sequence that unblocks the most users:

1. **Write the RPC / Server Functions page** — it's the most-asked question and doesn't exist
2. **Write the Events page** — replace lorem ipsum, unify the four event patterns
3. **Merge Hooks + Scripting** into one signals reference
4. **Rewrite fragments** to make the RPC→fragment→DOM loop explicit
5. **Rewrite the index** — the current pitch is endearing but doesn't convert
6. **Write Getting Started** — a single end-to-end walkthrough that produces a real mini-app

The later pages (GTK4, deployment, advanced routing) can follow once the core interactive story is told.

---

## A Note on Tone

The current docs have a personality — "it ain't much but it's honest work" — that's honest and likable. Keep that. Jamrock isn't trying to be Next.js. It's a coherent opinion about how web apps should be built, written by one person over six years because it was worth understanding.

That's a story worth telling. Not defensively ("we're not competing with React"), but affirmatively: *here is what I think web development should look like, here is what happens when you build it yourself, here is what surprised me.* The GTK4 runtime is evidence of that — nobody builds a GTK4 adapter for a web framework unless they're genuinely curious about what the abstractions can do.

The userguide is the right place to let that through.
