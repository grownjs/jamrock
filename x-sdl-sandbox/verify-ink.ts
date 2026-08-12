// The correctness criterion that actually matters: does drawn ink stay inside
// the box measure() reserved? TTF_SizeUTF8 agreement is only a proxy -- the
// renderer never calls it. Under-measuring clips glyphs; over-measuring is
// merely loose. This checks the real thing, against real pixels.
import { ptr } from 'bun:ffi';
import {
  sdl, ttf, buildAtlas, drawText, cstr, err,
  SDL_INIT_VIDEO, SDL_WINDOWPOS_CENTERED, SDL_PIXELFORMAT_ARGB8888, SDL_BLENDMODE_BLEND,
} from './atlas.ts';

import { FONTS as F } from './fonts.ts';

const FONTS = { monospace: F.mono, proportional: F.sans };
const W = 640, H = 120, ORIGIN = 40;

sdl.SDL_Init(SDL_INIT_VIDEO); ttf.TTF_Init();
const win = sdl.SDL_CreateWindow(cstr('ink'), SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, W, H, 0);
const ren = sdl.SDL_CreateRenderer(win, -1, 0);
sdl.SDL_SetRenderDrawBlendMode(ren, SDL_BLENDMODE_BLEND);

const SAMPLES = [
  'AV', 'To', 'AVATAR', 'VA VA VA', 'Toward Water', 'P.', 'y,',
  'Hello, world!', 'jamrock', 'MMMMMMMM', 'iiiiiiii',
  'The quick brown fox', '!@#$%^&*()', 'W', '.',
];

const buf = new Uint8Array(W * H * 4);
const r4 = new Int32Array(4);
let pass = 0, fail = 0, worstSlack = 0, tightest = 99;

for (const [name, path] of Object.entries(FONTS)) {
  console.log(`\n${name}`);
  const atlas = buildAtlas(ren, path, 16);

  for (const s of SAMPLES) {
    sdl.SDL_SetRenderDrawColor(ren, 0, 0, 0, 255);
    sdl.SDL_RenderClear(ren);
    drawText(ren, atlas, s, ORIGIN, 40, [255, 255, 255]);

    r4[0] = 0; r4[1] = 0; r4[2] = W; r4[3] = H;
    sdl.SDL_RenderReadPixels(ren, ptr(r4), SDL_PIXELFORMAT_ARGB8888, ptr(buf), W * 4);

    const view = new DataView(buf.buffer);
    let inkL = Infinity, inkR = -Infinity;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = view.getUint32((y * W + x) * 4, true);
        // any non-black pixel counts as ink (antialiased edges included)
        if ((v & 0x00ffffff) !== 0) { if (x < inkL) inkL = x; if (x > inkR) inkR = x; }
      }
    }

    const measured = atlas.measure(s).w;
    const boxL = ORIGIN, boxR = ORIGIN + measured;

    if (inkR === -Infinity) { console.log(`  skip "${s}" -- no ink`); continue; }

    const leftOk = inkL >= boxL;
    const rightOk = inkR < boxR;
    const slack = boxR - 1 - inkR;

    if (leftOk && rightOk) {
      pass++;
      worstSlack = Math.max(worstSlack, slack);
      tightest = Math.min(tightest, slack);
    } else {
      fail++;
      console.log(`  CLIP "${s}" ink=[${inkL},${inkR}] box=[${boxL},${boxR}) overflow=${inkR - boxR + 1}px`);
    }
  }
  sdl.SDL_DestroyTexture(atlas.texture);
}

console.log(`\n${pass} strings fit their measured box, ${fail} overflowed`);
console.log(`right-edge slack: min ${tightest}px, max ${worstSlack}px (0 = pixel-exact, <0 = clipped)`);
sdl.SDL_DestroyWindow(win); ttf.TTF_Quit(); sdl.SDL_Quit();
process.exit(fail ? 1 : 0);
