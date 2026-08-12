// End-to-end: signals -> tree -> layout -> atlas paint -> hit-test -> events.
// Everything a Jamrock SDL renderer needs, minus the somedom fake-DOM adapter.
import { ptr, toArrayBuffer } from 'bun:ffi';
import {
  sdl, ttf, buildAtlas, drawText, cstr, err,
  SDL_INIT_VIDEO, SDL_WINDOWPOS_CENTERED, SDL_WINDOW_SHOWN, SDL_QUIT,
  SDL_MOUSEBUTTONDOWN, SDL_MOUSEMOTION, SDL_BLENDMODE_BLEND, SDL_PIXELFORMAT_ARGB8888,
} from './atlas.ts';
import { layout, hitTest, type Node, type Rect } from './layout.ts';
import { FONTS } from './fonts.ts';

const FONT = FONTS.mono;
const W = 720;
const H = 460;
const HEADLESS = process.argv.includes('--headless');

// --- minimal signal (somedom's would drop straight in) ----------------------
type Signal<T> = { get value(): T; set value(v: T) };
const listeners = new Set<() => void>();
function signal<T>(initial: T): Signal<T> {
  let v = initial;
  return {
    get value() { return v; },
    set value(next: T) {
      if (Object.is(v, next)) return;
      v = next;
      listeners.forEach(fn => fn());
    },
  };
}

// --- app state --------------------------------------------------------------
const clicks = signal(0);
const selected = signal('routes/index.html');
const status = signal('ready');

const FILES = [
  'routes/index.html', 'routes/about.html', 'routes/posts/[id].html',
  'lib/store.mjs', 'src/main.ts', 'src/server.ts',
];

// --- view: plain data, exactly what the fake-DOM backend would emit ---------
function view(): Node {
  return {
    tag: 'vstack',
    props: { class: 'm-1 sp-1' },
    children: [
      {
        tag: 'hstack',
        props: { class: 'sp-1' },
        children: [
          { tag: 'button', props: { text: 'Open', id: 'open' } },
          { tag: 'button', props: { text: 'Save', id: 'save' } },
          { tag: 'button', props: { text: 'Build', id: 'build' } },
          { tag: 'label', props: { text: `clicks: ${clicks.value}`, class: 'hx ha-end va-center' } },
        ],
      },
      {
        tag: 'hstack',
        props: { class: 'hx vx sp-1' },
        children: [
          {
            tag: 'frame',
            props: { class: 'vx w-220' },
            children: [{
              tag: 'vstack',
              props: { class: 'vx sp-0' },
              children: FILES.map(f => ({
                tag: 'label',
                props: { text: f, id: `file:${f}`, class: 'ha-start' },
              })),
            }],
          },
          {
            tag: 'frame',
            props: { class: 'hx vx' },
            children: [{
              tag: 'vstack',
              props: { class: 'sp-1 hx' },
              children: [
                { tag: 'label', props: { text: selected.value, class: 'ha-start' } },
                { tag: 'label', props: { text: '', class: 'h-1' } },
                { tag: 'entry', props: { text: 'filter...', class: 'hx' } },
                { tag: 'label', props: { text: 'layout is a pure function;', class: 'ha-start' } },
                { tag: 'label', props: { text: 'this frame is just rects + quads.', class: 'ha-start' } },
              ],
            }],
          },
        ],
      },
      { tag: 'label', props: { text: status.value, class: 'ha-start' } },
    ],
  };
}

// --- theme ------------------------------------------------------------------
type RGB = [number, number, number];
const THEME: Record<string, { bg?: RGB; fg: RGB; border?: RGB }> = {
  vstack: { fg: [0, 0, 0] },
  hstack: { fg: [0, 0, 0] },
  frame:  { bg: [38, 40, 49], fg: [200, 205, 215], border: [58, 62, 74] },
  button: { bg: [64, 108, 168], fg: [245, 248, 255], border: [86, 138, 205] },
  entry:  { bg: [24, 25, 31], fg: [170, 176, 190], border: [70, 74, 88] },
  label:  { fg: [186, 192, 205] },
};
const HOVER: RGB = [92, 141, 205];
const SELECT: RGB = [52, 88, 138];
const BG: RGB = [26, 27, 33];

// --- SDL boot ---------------------------------------------------------------
if (sdl.SDL_Init(SDL_INIT_VIDEO) !== 0) throw new Error(`SDL_Init: ${err()}`);
if (ttf.TTF_Init() !== 0) throw new Error(`TTF_Init: ${err()}`);

const win = sdl.SDL_CreateWindow(
  cstr('jamrock / sdl'), SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
  W, H, HEADLESS ? 0 : SDL_WINDOW_SHOWN,
);
if (!win) throw new Error(`CreateWindow: ${err()}`);
const ren = sdl.SDL_CreateRenderer(win, -1, 0);
if (!ren) throw new Error(`CreateRenderer: ${err()}`);
sdl.SDL_SetRenderDrawBlendMode(ren, SDL_BLENDMODE_BLEND);

const atlas = buildAtlas(ren, FONT, 14);
console.log(`atlas ${atlas.width}x${atlas.height}, lineHeight ${atlas.lineHeight}, ${atlas.glyphs.size} glyphs`);

const ctx = { measureText: (t: string) => atlas.measure(t) };

// --- paint ------------------------------------------------------------------
const r4 = new Int32Array(4);

function fill(x: number, y: number, w: number, h: number, c: RGB, a = 255) {
  r4[0] = x; r4[1] = y; r4[2] = w; r4[3] = h;
  sdl.SDL_SetRenderDrawColor(ren, c[0], c[1], c[2], a);
  sdl.SDL_RenderFillRect(ren, r4);
}
function stroke(x: number, y: number, w: number, h: number, c: RGB) {
  r4[0] = x; r4[1] = y; r4[2] = w; r4[3] = h;
  sdl.SDL_SetRenderDrawColor(ren, c[0], c[1], c[2], 255);
  sdl.SDL_RenderDrawRect(ren, r4);
}

function paint(rects: Rect[], hovered: Rect | null) {
  fill(0, 0, W, H, BG);

  for (const r of rects) {
    const t = THEME[r.tag];
    if (!t) continue;

    const id = r.node.props?.id as string | undefined;
    const isHover = hovered === r && (r.tag === 'button' || id?.startsWith('file:'));
    const isSelected = id === `file:${selected.value}`;

    let bg = t.bg;
    if (isSelected) bg = SELECT;
    if (isHover) bg = HOVER;

    if (bg) fill(r.x, r.y, r.w, r.h, bg, Math.round(255 * r.opacity));
    if (t.border) stroke(r.x, r.y, r.w, r.h, t.border);

    if (r.text) {
      const m = atlas.measure(r.text);
      // Horizontal placement follows the same align the layout used.
      const cls = r.classes.join(' ');
      let tx = r.x + (r.tag === 'button' ? 14 : r.tag === 'entry' ? 8 : 0);
      if (r.tag === 'button') tx = r.x + Math.round((r.w - m.w) / 2);
      else if (r.node.props?.class?.includes('ha-end')) tx = r.x + r.w - m.w;
      const ty = r.y + Math.round((r.h - atlas.lineHeight) / 2);
      drawText(ren, atlas, r.text, tx, ty, t.fg, Math.round(255 * r.opacity));
    }
  }
}

// --- reactive relayout ------------------------------------------------------
let rects: Rect[] = [];
let dirty = true;
listeners.add(() => { dirty = true; });

function relayout() {
  const t0 = performance.now();
  rects = layout(view(), { w: W, h: H }, ctx);
  return performance.now() - t0;
}

// --- events -----------------------------------------------------------------
const evt = new Uint8Array(128);
const ev = new DataView(evt.buffer);
let hovered: Rect | null = null;

function onClick(r: Rect | null) {
  if (!r) return;
  const id = r.node.props?.id as string | undefined;
  if (!id) return;
  if (id.startsWith('file:')) {
    selected.value = id.slice(5);
    status.value = `opened ${selected.value}`;
  } else {
    clicks.value = clicks.value + 1;
    status.value = `${id} clicked`;
  }
}

// --- screenshot -------------------------------------------------------------
function screenshot(path: string) {
  const surf = sdl.SDL_CreateRGBSurfaceWithFormat(0, W, H, 32, SDL_PIXELFORMAT_ARGB8888);
  const head = new DataView(toArrayBuffer(surf, 0, 40));
  const pitch = head.getInt32(24, true);
  const pixels = Number(head.getBigUint64(32, true));
  r4[0] = 0; r4[1] = 0; r4[2] = W; r4[3] = H;
  sdl.SDL_RenderReadPixels(ren, r4, SDL_PIXELFORMAT_ARGB8888, pixels as any, pitch);

  const buf = new Uint8Array(toArrayBuffer(pixels, 0, pitch * H));
  // BMP is the least-effort container SDL hands us pixels for; converted after.
  const rowSize = W * 3 + ((4 - (W * 3) % 4) % 4);
  const out = new Uint8Array(54 + rowSize * H);
  const dv = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;
  dv.setUint32(2, out.length, true);
  dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, W, true);
  dv.setInt32(22, -H, true); // negative = top-down
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = y * pitch + x * 4;
      const d = 54 + y * rowSize + x * 3;
      out[d] = buf[s]; out[d + 1] = buf[s + 1]; out[d + 2] = buf[s + 2];
    }
  }
  Bun.write(path, out);
  sdl.SDL_FreeSurface(surf);
}

// --- loop -------------------------------------------------------------------
let frames = 0;
let layoutTotal = 0;
let layoutRuns = 0;
let running = true;
const started = performance.now();

const timer = setInterval(() => {
  while (sdl.SDL_PollEvent(evt)) {
    const type = ev.getUint32(0, true);
    if (type === SDL_QUIT) running = false;
    else if (type === SDL_MOUSEMOTION) {
      const hit = hitTest(rects, ev.getInt32(20, true), ev.getInt32(24, true));
      if (hit !== hovered) { hovered = hit; dirty = true; }
    } else if (type === SDL_MOUSEBUTTONDOWN) {
      onClick(hitTest(rects, ev.getInt32(20, true), ev.getInt32(24, true)));
    }
  }

  if (HEADLESS && frames === 1) {
    // Drive interactions so the capture is not the empty state.
    onClick(rects.find(r => r.node.props?.id === 'file:src/server.ts') || null);
    clicks.value = 3;
  }

  if (dirty) { layoutTotal += relayout(); layoutRuns++; dirty = false; }
  paint(rects, hovered);
  frames++;

  const elapsed = performance.now() - started;
  const done = !running || (HEADLESS ? frames >= 4 : elapsed > 20000);

  // Read back BEFORE presenting -- after the swap this reads a stale buffer.
  if (done && HEADLESS) screenshot('shot.bmp');
  sdl.SDL_RenderPresent(ren);

  if (done) {
    clearInterval(timer);
    if (HEADLESS) console.log(`state at capture: clicks=${clicks.value} selected=${selected.value} status=${status.value}`);
    console.log(`frames=${frames} fps=${(frames / (elapsed / 1000)).toFixed(1)}`);
    console.log(`layout: ${layoutRuns} runs, avg ${(layoutTotal / layoutRuns).toFixed(3)}ms, ${rects.length} rects`);
    sdl.SDL_DestroyTexture(atlas.texture);
    sdl.SDL_DestroyWindow(win);
    ttf.TTF_Quit();
    sdl.SDL_Quit();
  }
}, 1000 / 60);
