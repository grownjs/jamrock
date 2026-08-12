import { layout, type Node, type LayoutCtx } from './layout.ts';

const ctx: LayoutCtx = { measureText: (t: string) => ({ w: t.length * 7, h: 16 }) };

/** Wide: one container, N leaves. Depth stays at 2. */
function wide(n: number): Node {
  return {
    tag: 'vstack',
    props: { class: 'sp-1' },
    children: Array.from({ length: n }, (_, i) => ({ tag: 'label', props: { text: `row ${i}` } })),
  };
}

/** Deep: N nested single-child stacks. Width stays at 1. */
function deep(n: number): Node {
  let node: Node = { tag: 'label', props: { text: 'leaf' } };
  for (let i = 0; i < n; i++) {
    node = { tag: i % 2 ? 'hstack' : 'vstack', props: { class: 'sp-1' }, children: [node] };
  }
  return node;
}

/** Realistic: a balanced tree, branching 3, depth d. */
function tree(depth: number): Node {
  if (depth === 0) return { tag: 'label', props: { text: 'leaf' } };
  return {
    tag: depth % 2 ? 'hstack' : 'vstack',
    props: { class: 'sp-1' },
    children: [tree(depth - 1), tree(depth - 1), tree(depth - 1)],
  };
}

function bench(name: string, node: Node) {
  const vp = { w: 1280, h: 800 };
  for (let i = 0; i < 20; i++) layout(node, vp, ctx); // warm the JIT
  const runs = 50;
  const t0 = performance.now();
  let count = 0;
  for (let i = 0; i < runs; i++) count = layout(node, vp, ctx).length;
  const ms = (performance.now() - t0) / runs;
  console.log(`${name.padEnd(22)} ${String(count).padStart(6)} rects   ${ms.toFixed(3)} ms   ${(ms * 1000 / count).toFixed(2)} us/rect`);
}

console.log('\nwide (flat list)');
for (const n of [10, 50, 100, 200, 400]) bench(`  ${n} children`, wide(n));

console.log('\ndeep (nesting depth)');
for (const n of [4, 8, 12, 16, 20]) bench(`  depth ${n}`, deep(n));

console.log('\nbalanced (branch 3)');
for (const d of [2, 3, 4, 5, 6]) bench(`  depth ${d}`, tree(d));
