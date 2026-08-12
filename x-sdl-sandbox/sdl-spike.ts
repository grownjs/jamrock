// Spike: can bun:ffi drive SDL2 directly? Window + rects + event poll, no bindings package.
import { dlopen, FFIType, ptr, suffix } from 'bun:ffi';

const { i32, u32, u8, ptr: p, void: v, cstring } = FFIType;

const LIB = process.platform === 'darwin'
  ? '/opt/homebrew/lib/libSDL2.dylib'
  : `libSDL2-2.0.so.0`;

const sdl = dlopen(LIB, {
  SDL_Init:                { args: [u32], returns: i32 },
  SDL_GetError:            { args: [], returns: cstring },
  SDL_CreateWindow:        { args: [cstring, i32, i32, i32, i32, u32], returns: p },
  SDL_CreateRenderer:      { args: [p, i32, u32], returns: p },
  SDL_SetRenderDrawColor:  { args: [p, u8, u8, u8, u8], returns: i32 },
  SDL_RenderClear:         { args: [p], returns: i32 },
  SDL_RenderFillRect:      { args: [p, p], returns: i32 },
  SDL_RenderPresent:       { args: [p], returns: v },
  SDL_PollEvent:           { args: [p], returns: i32 },
  SDL_DestroyWindow:       { args: [p], returns: v },
  SDL_Quit:                { args: [], returns: v },
});
const S = sdl.symbols;

const SDL_INIT_VIDEO = 0x20;
const CENTERED = 0x2FFF0000;
const SDL_WINDOW_SHOWN = 0x4;
const SDL_QUIT = 0x100;

const enc = (s: string) => new TextEncoder().encode(s + '\0');

if (S.SDL_Init(SDL_INIT_VIDEO) !== 0) {
  console.error('SDL_Init failed:', S.SDL_GetError());
  process.exit(1);
}
console.log('SDL_Init OK');

const win = S.SDL_CreateWindow(enc('jamrock-sdl-spike'), CENTERED, CENTERED, 480, 320, SDL_WINDOW_SHOWN);
if (!win) { console.error('CreateWindow failed:', S.SDL_GetError()); process.exit(1); }
console.log('window created');

const ren = S.SDL_CreateRenderer(win, -1, 0);
if (!ren) { console.error('CreateRenderer failed:', S.SDL_GetError()); process.exit(1); }
console.log('renderer created');

// SDL_Rect is 4 x int32 — pass by pointer, which bun:ffi handles natively.
const rect = new Int32Array(4);
const rectPtr = ptr(rect);
// SDL_Event is 56 bytes in SDL2; over-allocate. Event type = first u32.
const evt = new Uint8Array(128);
const evtPtr = ptr(evt);
const evtView = new DataView(evt.buffer);

// A fake "laid out tree": what a layout pass would hand the painter.
const boxes = [
  { x: 16,  y: 16,  w: 448, h: 48,  c: [235, 87,  87,  255] },
  { x: 16,  y: 80,  w: 216, h: 224, c: [86,  156, 214, 255] },
  { x: 248, y: 80,  w: 216, h: 104, c: [106, 176, 76,  255] },
  { x: 248, y: 200, w: 216, h: 104, c: [240, 173, 78,  255] },
];

let frames = 0;
let running = true;
const started = performance.now();

// Drive SDL from a timer so Bun's event loop keeps running (no blocking while(1)).
const timer = setInterval(() => {
  while (S.SDL_PollEvent(evtPtr)) {
    if (evtView.getUint32(0, true) === SDL_QUIT) running = false;
  }

  S.SDL_SetRenderDrawColor(ren, 30, 30, 34, 255);
  S.SDL_RenderClear(ren);
  for (const b of boxes) {
    rect[0] = b.x; rect[1] = b.y; rect[2] = b.w; rect[3] = b.h;
    S.SDL_SetRenderDrawColor(ren, b.c[0], b.c[1], b.c[2], b.c[3]);
    S.SDL_RenderFillRect(ren, rectPtr);
  }
  S.SDL_RenderPresent(ren);
  frames++;

  // Prove async/microtasks still interleave — this is where signals would land.
  if (frames === 30) Promise.resolve().then(() => console.log('microtask ran during render loop OK'));

  if (!running || performance.now() - started > 2000) {
    clearInterval(timer);
    const secs = (performance.now() - started) / 1000;
    console.log(`frames=${frames} in ${secs.toFixed(2)}s -> ${(frames / secs).toFixed(1)} fps`);
    S.SDL_DestroyWindow(win);
    S.SDL_Quit();
    console.log('clean shutdown');
  }
}, 1000 / 60);
