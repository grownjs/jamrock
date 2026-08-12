// Closes the last gap: the demo drove interactions by calling onClick directly,
// so the SDL event -> byte offsets -> hitTest path was never executed.
// SDL_PushEvent puts real events on SDL's own queue, so SDL_PollEvent decodes
// them exactly as it would from the window server.
import { ptr } from 'bun:ffi';
import {
  sdl, ttf, buildAtlas, cstr,
  SDL_INIT_VIDEO, SDL_WINDOWPOS_CENTERED, SDL_MOUSEMOTION, SDL_MOUSEBUTTONDOWN,
} from './atlas.ts';
import { layout, hitTest, type Node, type Rect } from './layout.ts';
import { FONTS } from './fonts.ts';
import { dlopen, FFIType } from 'bun:ffi';

const { i32, ptr: p } = FFIType;
const push = dlopen(
  process.platform === 'darwin' ? '/opt/homebrew/lib/libSDL2.dylib' : 'libSDL2-2.0.so.0',
  { SDL_PushEvent: { args: [p], returns: i32 }, SDL_FlushEvents: { args: [i32, i32], returns: FFIType.void } },
).symbols;

const W = 720, H = 460;
sdl.SDL_Init(SDL_INIT_VIDEO); ttf.TTF_Init();
const win = sdl.SDL_CreateWindow(cstr('events'), SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, W, H, 0);
const ren = sdl.SDL_CreateRenderer(win, -1, 0);
const atlas = buildAtlas(ren, FONTS.mono, 14);
const ctx = { measureText: (t: string) => atlas.measure(t) };

const FILES = ['routes/index.html', 'lib/store.mjs', 'src/server.ts'];
const view: Node = {
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
      ],
    },
    {
      tag: 'frame',
      props: { class: 'vx w-220' },
      children: [{
        tag: 'vstack',
        props: { class: 'vx sp-0' },
        children: FILES.map(f => ({ tag: 'label', props: { text: f, id: `file:${f}`, class: 'ha-start' } })),
      }],
    },
  ],
};

const rects = layout(view, { w: W, h: H }, ctx);

// --- build a real SDL_MouseButtonEvent / SDL_MouseMotionEvent ---------------
// Both layouts agree where it matters: type@0, x@20, y@24 (Sint32).
//
// IMPORTANT: pass the TypedArray itself to the FFI call, never a cached ptr().
// ptr() returns a raw address and JSC may relocate the backing store later, so
// a stored address goes stale: SDL reads/writes the old memory while JS sees
// the moved copy. Silent zeros, no crash. Passing the array lets bun pin it.
const sendBuf = new Uint8Array(56);
const sendView = new DataView(sendBuf.buffer);

function mouseEvent(type: number, x: number, y: number): Uint8Array {
  sendBuf.fill(0);
  sendView.setUint32(0, type, true);
  if (type === SDL_MOUSEBUTTONDOWN) {
    sendBuf[16] = 1;                 // button = SDL_BUTTON_LEFT
    sendBuf[17] = 1;                 // state = pressed
    sendBuf[18] = 1;                 // clicks
  }
  sendView.setInt32(20, x, true);
  sendView.setInt32(24, y, true);
  return sendBuf;
}

// --- the demo's own decode loop, verbatim ----------------------------------
const evt = new Uint8Array(128);
const ev = new DataView(evt.buffer);

let hovered: Rect | null = null;
const clicked: string[] = [];

function pump() {
  while (sdl.SDL_PollEvent(evt)) {
    const type = ev.getUint32(0, true);
    if (type === SDL_MOUSEMOTION) {
      hovered = hitTest(rects, ev.getInt32(20, true), ev.getInt32(24, true));
    } else if (type === SDL_MOUSEBUTTONDOWN) {
      const hit = hitTest(rects, ev.getInt32(20, true), ev.getInt32(24, true));
      const id = hit?.node.props?.id as string | undefined;
      if (id) clicked.push(id);
    }
  }
}

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail && ` -- ${detail}`}`); }
  else { fail++; console.log(`  FAIL ${name}${detail && ` -- ${detail}`}`); }
};

function at(id: string) {
  const r = rects.find(x => x.node.props?.id === id)!;
  return { r, cx: Math.round(r.x + r.w / 2), cy: Math.round(r.y + r.h / 2) };
}

console.log('\nreal SDL events -> hitTest');
push.SDL_FlushEvents(0, 0xFFFF);

for (const id of ['open', 'save', 'build', 'file:lib/store.mjs', 'file:src/server.ts']) {
  const { cx, cy } = at(id);
  hovered = null;
  push.SDL_PushEvent(mouseEvent(SDL_MOUSEMOTION, cx, cy));
  pump();
  ok(`hover lands on ${id}`, hovered?.node.props?.id === id,
     `(${cx},${cy}) -> ${hovered?.node.props?.id ?? hovered?.tag ?? 'nothing'}`);
}

clicked.length = 0;
for (const id of ['build', 'file:src/server.ts', 'open']) {
  const { cx, cy } = at(id);
  push.SDL_PushEvent(mouseEvent(SDL_MOUSEBUTTONDOWN, cx, cy));
}
pump();
ok('clicks decode in order', JSON.stringify(clicked) === JSON.stringify(['build', 'file:src/server.ts', 'open']),
   JSON.stringify(clicked));

// A press in the gutter must not land on a widget.
hovered = null;
push.SDL_PushEvent(mouseEvent(SDL_MOUSEMOTION, W - 4, H - 4));
pump();
ok('empty space hits no widget id', !hovered?.node.props?.id, hovered?.tag ?? 'nothing');

// Corner case the offsets would silently break: coordinates beyond 2^15.
push.SDL_PushEvent(mouseEvent(SDL_MOUSEMOTION, 40000, 40000));
pump();
ok('large coords decode as Sint32, not truncated', hovered === null, String(hovered));

console.log(`\n${pass} passed, ${fail} failed`);
sdl.SDL_DestroyTexture(atlas.texture);
sdl.SDL_DestroyWindow(win); ttf.TTF_Quit(); sdl.SDL_Quit();
process.exit(fail ? 1 : 0);
