import { test } from '@japa/runner';
import { fixture, setup, reset } from './helpers/utils.mjs';
import { executeAsync } from '../src/render/async.ts';
import { Block } from '../src/markup/block.ts';
import * as path from 'path';
import * as fs from 'fs';

const GTK_HOOKS = {
  signal: (value) => ({
    value,
    subscribe: (fn) => () => {},
    peek: () => value,
  }),
  computed: (fn) => ({ value: fn(), subscribe: () => () => {} }),
  effect: (fn) => () => {},
  batch: (fn) => fn(),
  untracked: (fn) => fn(),
  scope: (value) => ({ value }),
  ref: (value) => ({ current: value }),
};

function gtkLoader(name) {
  if (name === 'jamrock') {
    return GTK_HOOKS;
  }
  throw new Error(`Unknown module: ${name}`);
}

async function compileGTK(source, filepath) {
  const cwd = process.cwd();
  const dest = `${cwd}/generated/${filepath}`;
  
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, source);
  
  const block = new Block(source, filepath, { cwd: 'generated' });
  const code = block.toString();
  
  const file = dest.replace('.html', '.mjs');
  
  const fixedCode = `const __src = '${filepath}';
const __dest = '${dest}';
${code}`;
  
  fs.writeFileSync(file, fixedCode);
  
  const mod = await import(`${file}?_=${Date.now()}`);
  return { mod, code, filepath };
}

async function renderGTK(mod, props = {}) {
  const handler = mod.__handler ? mod.__handler(props, gtkLoader) : null;
  const ctx = handler?.__context ? handler.__context() : { __scope: props };
  const data = ctx.__scope ?? ctx.__callback?.();
  
  // Create a mock $$ object
  const mockSelf = {
    e: (tag, props, children) => [tag, props, children],
    $: (value) => {
      if (typeof value === 'function' && value.name === '$signal') {
        return value();
      }
      return String(value);
    },
    map: (subj, body, fallback) => {
      // Handle signals
      if (subj && typeof subj.subscribe === 'function') {
        subj = subj.value;
      }
      if (!Array.isArray(subj)) {
        subj = subj ? [...subj] : [];
      }
      return subj.length ? subj.map((item, i) => body(item, i)) : (fallback ? fallback() : []);
    },
    if: (cond, then, ...branches) => {
      // Handle signals
      if (cond && typeof cond.subscribe === 'function') {
        cond = cond.value;
      }
      if (cond) return then();
      const fallback = branches.pop();
      return fallback ? fallback() : null;
    },
  };
  
  // Call the template directly
  const result = mod.__template(mockSelf, data);
  
  // Process with execAsync to resolve $signal functions
  const { execAsync } = await import('../src/render/async.ts');
  return execAsync(result, []);
}

test.group('GTK4 Apps', () => {
  test('button.html compiles and renders', async ({ expect }) => {
    setup();
    
    const source = `
<script>
  import { signal } from 'jamrock';
  
  let clicks = signal(0);
  
  function onClick() {
    clicks.value += 1;
  }
</script>

<vstack>
  <label>Clicks: {\$clicks}</label>
  <button onclick="{onClick}">Click Me</button>
</vstack>
`;
    
    const { mod, code } = await compileGTK(source, 'gtk-button.html');
    
    expect(code).toContain('function \$signal');
    expect(code).toContain('clicks.value');
    
    const result = await renderGTK(mod);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    reset();
  });
  
  test('gallery.html compiles and renders', async ({ expect }) => {
    setup();
    
    const source = `
<script>
  import { signal } from 'jamrock';
  
  let count = signal(0);
  
  function increment() {
    count.value += 1;
  }
</script>

<vstack>
  <label>Counter: {\$count}</label>
  <button onclick="{increment}">+</button>
</vstack>
`;
    
    const { mod, code } = await compileGTK(source, 'gtk-gallery.html');
    
    expect(code).toContain('function \$signal');
    
    const result = await renderGTK(mod);
    
    expect(result).toBeDefined();
    
    reset();
  });
  
  test('{#each} block compiles and renders', async ({ expect }) => {
    setup();
    
    const source = `
<script>
  import { signal } from 'jamrock';
  
  let items = signal(['a', 'b', 'c']);
</script>

<vstack>
  {#each items as item}
    <label>{item}</label>
  {/each}
</vstack>
`;
    
    const { mod, code } = await compileGTK(source, 'gtk-each.html');
    
    expect(code).toContain('\$$.map');
    
    const result = await renderGTK(mod);
    
    expect(result).toBeDefined();
    
    reset();
  });
  
  test('{#if} block compiles and renders', async ({ expect }) => {
    setup();
    
    const source = `
<script>
  import { signal } from 'jamrock';
  
  let show = signal(true);
</script>

<vstack>
  {#if show}
    <label>Visible</label>
  {/if}
</vstack>
`;
    
    const { mod, code } = await compileGTK(source, 'gtk-if.html');
    
    expect(code).toContain('\$$.if');
    
    const result = await renderGTK(mod);
    
    expect(result).toBeDefined();
    
    reset();
  });
  
  test('generator function works in script', async ({ expect }) => {
    setup();
    
    const source = `
<script>
  import { signal } from 'jamrock';
  
  function* generateNumbers() {
    yield 1;
    yield 2;
    yield 3;
  }
  
  let numbers = signal([...generateNumbers()]);
</script>

<vstack>
  {#each numbers as n}
    <label>{n}</label>
  {/each}
</vstack>
`;
    
    const { mod, code } = await compileGTK(source, 'gtk-generator.html');
    
    expect(code).toContain('function*');
    
    const result = await renderGTK(mod);
    
    expect(result).toBeDefined();
    
    reset();
  });
});
