import { test, expect, describe } from 'bun:test';
import { sizing, measure, layout, hitTest, BASE_UNIT, type Node, type LayoutCtx } from './layout.ts';

// Deterministic fake metrics: every glyph 7x16. Real atlas metrics swap in later.
const ctx: LayoutCtx = {
  measureText: (text: string) => ({ w: text.length * 7, h: 16 }),
};

const rect = (rects: any[], tag: string) => rects.find(r => r.tag === tag)!;
const box = (r: any) => ({ x: r.x, y: r.y, w: r.w, h: r.h });

describe('sizing DSL', () => {
  test('margins scale by BASE_UNIT', () => {
    expect(sizing('m-2')).toMatchObject({
      marginTop: 16, marginBottom: 16, marginStart: 16, marginEnd: 16,
    });
    expect(sizing('mx-1 my-3')).toMatchObject({
      marginStart: 8, marginEnd: 8, marginTop: 24, marginBottom: 24,
    });
  });

  test('later rules override earlier ones', () => {
    expect(sizing('m-2 mt-0').marginTop).toBe(0);
    expect(sizing('m-2 mt-0').marginBottom).toBe(16);
  });

  test('flags, requests and opacity', () => {
    const s = sizing('hx vx w-120 h-40 o-5 sp-2');
    expect(s.hexpand).toBe(true);
    expect(s.vexpand).toBe(true);
    expect(s.widthRequest).toBe(120);
    expect(s.heightRequest).toBe(40);
    expect(s.opacity).toBe(0.5);
    expect(s.spacing).toBe(16);
  });

  test('unknown chunks fall through to classes, known-but-bad rules throw', () => {
    expect(sizing('hx text-red rounded').classes).toEqual(['text-red', 'rounded']);
    expect(() => sizing('ha-sideways')).toThrow('Unknown rule ha-sideways');
    expect(() => sizing('bo-diagonal')).toThrow('Unknown rule bo-diagonal');
  });

  test('BASE_UNIT is 8, matching src/gtk4/elements.ts', () => {
    expect(BASE_UNIT).toBe(8);
  });
});

describe('measure', () => {
  test('label is text metrics', () => {
    expect(measure({ tag: 'label', props: { text: 'hello' } }, ctx)).toEqual({ w: 35, h: 16 });
  });

  test('button adds intrinsic padding', () => {
    // 5 glyphs * 7 + 14*2 padding = 63; 16 + 8*2 = 32
    expect(measure({ tag: 'button', props: { text: 'hello' } }, ctx)).toEqual({ w: 63, h: 32 });
  });

  test('empty label still reserves line height', () => {
    expect(measure({ tag: 'label', props: { text: '' } }, ctx)).toEqual({ w: 0, h: 16 });
  });

  test('w-/h- act as a floor, never a ceiling', () => {
    expect(measure({ tag: 'label', props: { text: 'hi', class: 'w-200' } }, ctx).w).toBe(200);
    // natural 70 > request 20, natural wins
    expect(measure({ tag: 'label', props: { text: 'x'.repeat(10), class: 'w-20' } }, ctx).w).toBe(70);
  });

  test('vstack sums children and gaps, maxes cross axis', () => {
    const n: Node = {
      tag: 'vstack',
      props: { class: 'sp-1' },
      children: [
        { tag: 'label', props: { text: 'ab' } },      // 14x16
        { tag: 'label', props: { text: 'abcdef' } },  // 42x16
      ],
    };
    expect(measure(n, ctx)).toEqual({ w: 42, h: 16 + 16 + 8 });
  });

  test('child margins count toward the parent natural size', () => {
    const n: Node = {
      tag: 'vstack',
      children: [{ tag: 'label', props: { text: 'ab', class: 'm-1' } }],
    };
    expect(measure(n, ctx)).toEqual({ w: 14 + 16, h: 16 + 16 });
  });

  test('hstack sums horizontally', () => {
    const n: Node = {
      tag: 'hstack',
      props: { class: 'sp-2' },
      children: [
        { tag: 'label', props: { text: 'ab' } },
        { tag: 'label', props: { text: 'cd' } },
      ],
    };
    expect(measure(n, ctx)).toEqual({ w: 14 + 14 + 16, h: 16 });
  });
});

describe('layout: expansion', () => {
  test('single hx child absorbs all slack', () => {
    const n: Node = {
      tag: 'hstack',
      children: [
        { tag: 'label', props: { text: 'ab' } },              // 14
        { tag: 'label', props: { text: 'cd', class: 'hx' } }, // 14 + slack
      ],
    };
    const rects = layout(n, { w: 200, h: 50 }, ctx);
    const [, a, b] = rects;
    expect(box(a)).toMatchObject({ x: 0, w: 14 });
    expect(box(b)).toMatchObject({ x: 14, w: 186 });
  });

  test('slack splits evenly across expanders', () => {
    const n: Node = {
      tag: 'hstack',
      children: [
        { tag: 'label', props: { text: 'a', class: 'hx' } },
        { tag: 'label', props: { text: 'a', class: 'hx' } },
      ],
    };
    const [, a, b] = layout(n, { w: 100, h: 20 }, ctx);
    expect(a.w).toBe(50);
    expect(b.w).toBe(50);
    expect(a.x + a.w).toBe(b.x);
  });

  test('odd slack gives the remainder to leading expanders, no gap', () => {
    const n: Node = {
      tag: 'hstack',
      children: [
        { tag: 'label', props: { text: 'a', class: 'hx' } },
        { tag: 'label', props: { text: 'a', class: 'hx' } },
        { tag: 'label', props: { text: 'a', class: 'hx' } },
      ],
    };
    const rects = layout(n, { w: 100, h: 20 }, ctx);
    const kids = rects.slice(1);
    expect(kids.reduce((a, r) => a + r.w, 0)).toBe(100);
    // right edge of the last child lands exactly on the viewport edge
    expect(kids[2].x + kids[2].w).toBe(100);
  });

  test('non-expanders keep natural size while an expander eats the rest', () => {
    const n: Node = {
      tag: 'vstack',
      children: [
        { tag: 'button', props: { text: 'top' } },            // h 32
        { tag: 'label', props: { text: 'mid', class: 'vx' } },
        { tag: 'button', props: { text: 'end' } },            // h 32
      ],
    };
    const [, top, mid, end] = layout(n, { w: 100, h: 200 }, ctx);
    expect(top.h).toBe(32);
    expect(end.h).toBe(32);
    expect(mid.h).toBe(200 - 32 - 32);
    expect(end.y + end.h).toBe(200);
  });

  test('overflow is allowed, not clamped -- scroll containers need it', () => {
    const n: Node = {
      tag: 'vstack',
      children: Array.from({ length: 10 }, () => ({ tag: 'button', props: { text: 'x' } })),
    };
    const rects = layout(n, { w: 100, h: 50 }, ctx);
    const last = rects[rects.length - 1];
    expect(last.y + last.h).toBe(320);
  });
});

describe('layout: alignment', () => {
  test('cross-axis align positions without stretching', () => {
    const mk = (cls: string) => {
      const n: Node = { tag: 'vstack', children: [{ tag: 'label', props: { text: 'ab', class: cls } }] };
      return layout(n, { w: 100, h: 40 }, ctx)[1];
    };
    expect(box(mk('ha-start'))).toMatchObject({ x: 0, w: 14 });
    expect(box(mk('ha-center'))).toMatchObject({ x: 43, w: 14 });
    expect(box(mk('ha-end'))).toMatchObject({ x: 86, w: 14 });
    expect(box(mk('ha-fill'))).toMatchObject({ x: 0, w: 100 });
  });

  test('fill is the default', () => {
    const n: Node = { tag: 'vstack', children: [{ tag: 'label', props: { text: 'ab' } }] };
    expect(layout(n, { w: 100, h: 40 }, ctx)[1].w).toBe(100);
  });

  test('main-axis align applies inside an expanded slot', () => {
    const n: Node = {
      tag: 'vstack',
      children: [{ tag: 'label', props: { text: 'ab', class: 'vx va-center' } }],
    };
    const kid = layout(n, { w: 100, h: 100 }, ctx)[1];
    expect(kid.h).toBe(16);
    expect(kid.y).toBe(42);
  });
});

describe('layout: box model', () => {
  test('margins inset the child border box', () => {
    const n: Node = {
      tag: 'vstack',
      children: [{ tag: 'label', props: { text: 'ab', class: 'm-2 hx' } }],
    };
    const kid = layout(n, { w: 100, h: 100 }, ctx)[1];
    expect(box(kid)).toMatchObject({ x: 16, y: 16, w: 68 });
  });

  test('asymmetric margins resolve start/end independently', () => {
    const n: Node = {
      tag: 'vstack',
      children: [{ tag: 'label', props: { text: 'ab', class: 'ms-1 me-3 mt-2 hx' } }],
    };
    const kid = layout(n, { w: 100, h: 100 }, ctx)[1];
    expect(box(kid)).toMatchObject({ x: 8, y: 16, w: 100 - 8 - 24 });
  });

  test('spacing goes between children only, never on the ends', () => {
    const n: Node = {
      tag: 'vstack',
      props: { class: 'sp-1' },
      children: [
        { tag: 'label', props: { text: 'a' } },
        { tag: 'label', props: { text: 'b' } },
        { tag: 'label', props: { text: 'c' } },
      ],
    };
    const [, a, b, c] = layout(n, { w: 100, h: 200 }, ctx);
    expect(a.y).toBe(0);
    expect(b.y).toBe(16 + 8);
    expect(c.y).toBe(16 + 8 + 16 + 8);
  });

  test('frame padding insets its content', () => {
    const n: Node = {
      tag: 'frame',
      children: [{ tag: 'label', props: { text: 'ab', class: 'hx' } }],
    };
    const kid = layout(n, { w: 100, h: 100 }, ctx)[1];
    expect(box(kid)).toMatchObject({ x: 8, y: 8, w: 84 });
  });

  test('bo-horizontal flips a vstack', () => {
    const n: Node = {
      tag: 'vstack',
      props: { class: 'bo-horizontal' },
      children: [
        { tag: 'label', props: { text: 'ab' } },
        { tag: 'label', props: { text: 'cd' } },
      ],
    };
    const [, a, b] = layout(n, { w: 100, h: 40 }, ctx);
    expect(a.y).toBe(b.y);
    expect(b.x).toBe(14);
  });
});

describe('layout: nesting', () => {
  test('a realistic toolbar + body + status shell', () => {
    const app: Node = {
      tag: 'vstack',
      props: { class: 'sp-1 m-1' },
      children: [
        {
          tag: 'hstack',
          props: { class: 'sp-1' },
          children: [
            { tag: 'button', props: { text: 'Open' } },
            { tag: 'button', props: { text: 'Save' } },
            { tag: 'label', props: { text: 'ready', class: 'hx ha-end va-center' } },
          ],
        },
        { tag: 'scroll', props: { class: 'vx hx' }, children: [{ tag: 'label', props: { text: 'body', class: 'hx' } }] },
        { tag: 'label', props: { text: 'status' } },
      ],
    };

    const rects = layout(app, { w: 640, h: 480, }, ctx);
    const toolbar = rect(rects, 'hstack');
    const body = rect(rects, 'scroll');
    const status = rects[rects.length - 1];

    // outer m-1 inset on every side
    expect(toolbar.x).toBe(8);
    expect(toolbar.y).toBe(8);
    expect(toolbar.h).toBe(32);

    // body swallows the vertical slack between toolbar and status
    expect(body.y).toBe(8 + 32 + 8);
    expect(body.h).toBe(480 - 8 - 32 - 8 - 16 - 8 - 8);
    expect(status.y + status.h).toBe(480 - 8);

    // right-aligned label inside the toolbar hugs the right edge
    const ready = rects.find(r => r.text === 'ready')!;
    expect(ready.x + ready.w).toBe(640 - 8);
  });

  test('paint order is parents before children', () => {
    const n: Node = {
      tag: 'vstack',
      children: [{ tag: 'frame', children: [{ tag: 'label', props: { text: 'x' } }] }],
    };
    expect(layout(n, { w: 50, h: 50 }, ctx).map(r => r.tag)).toEqual(['vstack', 'frame', 'label']);
  });

  test('layout is pure -- same input, same output', () => {
    const n: Node = {
      tag: 'hstack',
      props: { class: 'sp-1' },
      children: [{ tag: 'button', props: { text: 'a', class: 'hx' } }, { tag: 'label', props: { text: 'b' } }],
    };
    const a = layout(n, { w: 300, h: 100 }, ctx);
    const b = layout(n, { w: 300, h: 100 }, ctx);
    expect(a.map(box)).toEqual(b.map(box));
  });
});

describe('hitTest', () => {
  const app: Node = {
    tag: 'vstack',
    props: { class: 'sp-1' },
    children: [
      { tag: 'button', props: { text: 'one' } },
      { tag: 'button', props: { text: 'two' } },
    ],
  };
  const rects = layout(app, { w: 200, h: 200 }, ctx);

  test('returns the topmost (deepest) node under the point', () => {
    expect(hitTest(rects, 10, 5)?.text).toBe('one');
    expect(hitTest(rects, 10, 45)?.text).toBe('two');
  });

  test('the gap between children falls through to the container', () => {
    expect(hitTest(rects, 10, 34)?.tag).toBe('vstack');
  });

  test('outside the viewport is a miss', () => {
    expect(hitTest(rects, -1, -1)).toBeNull();
    expect(hitTest(rects, 500, 500)).toBeNull();
  });

  test('edges are half-open: left/top inclusive, right/bottom exclusive', () => {
    const one = rects[1];
    expect(hitTest(rects, one.x, one.y)?.text).toBe('one');
    expect(hitTest(rects, one.x + one.w - 1, one.y)?.text).toBe('one');
    expect(hitTest(rects, one.x + one.w, one.y)?.text).toBeUndefined();
  });
});
