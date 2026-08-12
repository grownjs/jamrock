// Pure layout engine for the SDL target.
// Consumes the same className vocabulary as src/gtk4/util.ts (DEFAULT_RULES),
// but resolves to layout-neutral values instead of GTK property names.
// No SDL, no DOM, no globals -> runs and tests anywhere.

export const BASE_UNIT = 8;

export type Align = 'fill' | 'start' | 'center' | 'end';
export type Orientation = 'horizontal' | 'vertical';

export type Sizing = {
  marginTop: number; marginBottom: number; marginStart: number; marginEnd: number;
  spacing: number;
  hexpand: boolean; vexpand: boolean;
  widthRequest: number; heightRequest: number;
  halign: Align; valign: Align;
  orientation: Orientation | null;
  opacity: number;
  classes: string[];
};

export type Node = {
  tag: string;
  props?: Record<string, any>;
  children?: Node[];
};

export type Rect = {
  tag: string;
  node: Node;
  x: number; y: number; w: number; h: number;
  text?: string;
  opacity: number;
  classes: string[];
};

export type MeasureText = (text: string, tag: string) => { w: number; h: number };

export type LayoutCtx = {
  measureText: MeasureText;
  baseUnit?: number;
};

// Intrinsic padding per widget kind: [horizontal, vertical]. Themeable.
const PADDING: Record<string, [number, number]> = {
  button: [14, 8],
  entry: [8, 7],
  label: [0, 0],
  frame: [8, 8],
};

const STACKS = new Set(['vstack', 'hstack', 'box', 'scroll', 'frame']);
const ALIGNS = new Set<Align>(['fill', 'start', 'center', 'end']);

export function isStack(tag: string): boolean {
  return STACKS.has(tag);
}

function emptySizing(): Sizing {
  return {
    marginTop: 0, marginBottom: 0, marginStart: 0, marginEnd: 0,
    spacing: 0,
    hexpand: false, vexpand: false,
    widthRequest: 0, heightRequest: 0,
    halign: 'fill', valign: 'fill',
    orientation: null,
    opacity: 1,
    classes: [],
  };
}

function bail(ok: boolean, key: string, val: string): void {
  if (!ok) throw new Error(`Unknown rule ${key}-${val}`);
}

/**
 * Parse the space-separated sizing DSL. Mirrors sizing() in src/gtk4/util.ts:
 * unknown chunks fall through to `classes` rather than throwing, so styling
 * hooks (e.g. unocss-ish names) survive; only malformed *known* rules throw.
 */
export function sizing(value: string | undefined, unit: number = BASE_UNIT): Sizing {
  const out = emptySizing();
  if (!value) return out;

  for (const chunk of value.split(/\s+/)) {
    if (!chunk) continue;
    const idx = chunk.indexOf('-');
    const key = idx === -1 ? chunk : chunk.slice(0, idx);
    const nth = idx === -1 ? '' : chunk.slice(idx + 1);
    const n = +nth;

    switch (key) {
      case 'mt': out.marginTop = n * unit; break;
      case 'mb': out.marginBottom = n * unit; break;
      case 'ms': out.marginStart = n * unit; break;
      case 'me': out.marginEnd = n * unit; break;
      case 'mx': out.marginStart = out.marginEnd = n * unit; break;
      case 'my': out.marginTop = out.marginBottom = n * unit; break;
      case 'm':
        out.marginTop = out.marginBottom = out.marginStart = out.marginEnd = n * unit;
        break;
      case 'sp': out.spacing = n * unit; break;
      case 'hx': out.hexpand = true; break;
      case 'vx': out.vexpand = true; break;
      case 'w': out.widthRequest = n; break;
      case 'h': out.heightRequest = n; break;
      case 'o': out.opacity = n / 10; break;
      case 'ha':
        bail(ALIGNS.has(nth as Align), 'ha', nth);
        out.halign = nth as Align;
        break;
      case 'va':
        bail(ALIGNS.has(nth as Align), 'va', nth);
        out.valign = nth as Align;
        break;
      case 'bo':
        bail(nth === 'horizontal' || nth === 'vertical', 'bo', nth);
        out.orientation = nth as Orientation;
        break;
      default:
        out.classes.push(chunk);
    }
  }
  return out;
}

function orientationOf(node: Node, s: Sizing): Orientation {
  if (s.orientation) return s.orientation;
  if (node.tag === 'hstack') return 'horizontal';
  return 'vertical';
}

function childrenOf(node: Node): Node[] {
  return (node.children || []).filter(Boolean);
}

/** Natural (minimum) size of a node's border box, excluding its own margins. */
export function measure(node: Node, ctx: LayoutCtx): { w: number; h: number } {
  const unit = ctx.baseUnit ?? BASE_UNIT;
  const s = sizing(node.props?.class, unit);
  const [px, py] = PADDING[node.tag] || [0, 0];

  let w = 0;
  let h = 0;

  if (isStack(node.tag)) {
    const kids = childrenOf(node);
    const horizontal = orientationOf(node, s) === 'horizontal';
    const gaps = kids.length > 1 ? s.spacing * (kids.length - 1) : 0;

    for (const kid of kids) {
      const ks = sizing(kid.props?.class, unit);
      const m = measure(kid, ctx);
      const kw = m.w + ks.marginStart + ks.marginEnd;
      const kh = m.h + ks.marginTop + ks.marginBottom;

      if (horizontal) { w += kw; h = Math.max(h, kh); } else { h += kh; w = Math.max(w, kw); }
    }
    if (horizontal) w += gaps; else h += gaps;
    w += px * 2;
    h += py * 2;
  } else {
    const text = node.props?.text ?? '';
    const t = text ? ctx.measureText(String(text), node.tag) : { w: 0, h: ctx.measureText('X', node.tag).h };
    w = t.w + px * 2;
    h = t.h + py * 2;
  }

  return {
    w: Math.max(w, s.widthRequest),
    h: Math.max(h, s.heightRequest),
  };
}

/** Place a natural extent inside an allocated extent according to align. */
function align(pos: number, avail: number, natural: number, mode: Align): [number, number] {
  if (mode === 'fill') return [pos, Math.max(avail, natural)];
  const size = Math.min(natural, avail);
  if (mode === 'start') return [pos, size];
  if (mode === 'end') return [pos + avail - size, size];
  return [pos + Math.round((avail - size) / 2), size];
}

/**
 * Two-pass layout. `measure` runs bottom-up for natural sizes, then this
 * arranges top-down, distributing slack to expanding children.
 * Returns a flat, paint-ordered rect list -- the painter never walks the tree.
 */
export function layout(root: Node, viewport: { w: number; h: number }, ctx: LayoutCtx): Rect[] {
  const unit = ctx.baseUnit ?? BASE_UNIT;
  const out: Rect[] = [];

  function arrange(node: Node, x: number, y: number, w: number, h: number): void {
    const s = sizing(node.props?.class, unit);

    out.push({
      tag: node.tag,
      node,
      x, y, w, h,
      text: node.props?.text != null ? String(node.props.text) : undefined,
      opacity: s.opacity,
      classes: s.classes,
    });

    if (!isStack(node.tag)) return;

    const kids = childrenOf(node);
    if (!kids.length) return;

    const [px, py] = PADDING[node.tag] || [0, 0];
    const horizontal = orientationOf(node, s) === 'horizontal';

    const cx = x + px;
    const cy = y + py;
    const cw = Math.max(0, w - px * 2);
    const ch = Math.max(0, h - py * 2);

    const gaps = kids.length > 1 ? s.spacing * (kids.length - 1) : 0;

    const metrics = kids.map(kid => {
      const ks = sizing(kid.props?.class, unit);
      const m = measure(kid, ctx);
      return {
        kid,
        ks,
        outerW: m.w + ks.marginStart + ks.marginEnd,
        outerH: m.h + ks.marginTop + ks.marginBottom,
      };
    });

    const usedMain = metrics.reduce((a, m) => a + (horizontal ? m.outerW : m.outerH), 0) + gaps;
    const availMain = horizontal ? cw : ch;
    const slack = Math.max(0, availMain - usedMain);

    const expanders = metrics.filter(m => (horizontal ? m.ks.hexpand : m.ks.vexpand));
    // Integer split, remainder to the leading expanders -- keeps edges pixel-exact.
    const share = expanders.length ? Math.floor(slack / expanders.length) : 0;
    let remainder = expanders.length ? slack - share * expanders.length : 0;

    let cursor = horizontal ? cx : cy;

    for (const m of metrics) {
      const { kid, ks } = m;
      const expandsMain = horizontal ? ks.hexpand : ks.vexpand;

      let mainSize = horizontal ? m.outerW : m.outerH;
      if (expandsMain) {
        mainSize += share;
        if (remainder > 0) { mainSize += 1; remainder -= 1; }
      }

      const crossAvail = horizontal ? ch : cw;
      const crossNatural = horizontal ? m.outerH : m.outerW;
      const expandsCross = horizontal ? ks.vexpand : ks.hexpand;
      const crossMode: Align = horizontal ? ks.valign : ks.halign;
      const crossStart = horizontal ? cy : cx;

      let crossPos: number;
      let crossSize: number;
      if (expandsCross) {
        [crossPos, crossSize] = [crossStart, Math.max(crossAvail, crossNatural)];
      } else {
        [crossPos, crossSize] = align(crossStart, crossAvail, crossNatural, crossMode);
      }

      // Main-axis align only bites when the child got more than it needs.
      const mainMode: Align = horizontal ? ks.halign : ks.valign;
      const mainNatural = horizontal ? m.outerW : m.outerH;
      const [mainPos, mainSized] = align(cursor, mainSize, mainNatural, mainMode);

      const ox = horizontal ? mainPos : crossPos;
      const oy = horizontal ? crossPos : mainPos;
      const ow = horizontal ? mainSized : crossSize;
      const oh = horizontal ? crossSize : mainSized;

      // Strip the child's own margins to get its border box.
      arrange(
        kid,
        ox + ks.marginStart,
        oy + ks.marginTop,
        Math.max(0, ow - ks.marginStart - ks.marginEnd),
        Math.max(0, oh - ks.marginTop - ks.marginBottom),
      );

      cursor += mainSize + s.spacing;
    }
  }

  // The viewport acts as the root's parent, so root margins inset it just like
  // any other child -- otherwise `m-1` would silently mean nothing at top level.
  const rs = sizing(root.props?.class, unit);
  arrange(
    root,
    rs.marginStart,
    rs.marginTop,
    Math.max(0, viewport.w - rs.marginStart - rs.marginEnd),
    Math.max(0, viewport.h - rs.marginTop - rs.marginBottom),
  );
  return out;
}

/** Topmost rect containing the point. Rects are paint-ordered, so scan backwards. */
export function hitTest(rects: Rect[], x: number, y: number): Rect | null {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}
