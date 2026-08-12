// Verifies the two things the atlas has to get right:
//  1. SDL_Color passed BY VALUE through bun:ffi as a packed u32 (ABI question)
//  2. atlas-summed advances == SDL's own TTF_SizeUTF8 (layout correctness)
import { ptr, toArrayBuffer } from 'bun:ffi';
import {
  sdl, ttf, buildAtlas, drawText, packColor, cstr, err,
  SDL_INIT_VIDEO, SDL_WINDOWPOS_CENTERED, SDL_PIXELFORMAT_ARGB8888,
} from './atlas.ts';

import { FONTS } from './fonts.ts';

const MONO = FONTS.mono;
const SANS = FONTS.sans;
const PT = 16;

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail && ` -- ${detail}`}`); }
  else { fail++; console.log(`  FAIL ${name}${detail && ` -- ${detail}`}`); }
};

if (sdl.SDL_Init(SDL_INIT_VIDEO) !== 0) throw new Error(`SDL_Init: ${err()}`);
if (ttf.TTF_Init() !== 0) throw new Error(`TTF_Init: ${err()}`);

// Hidden window -- no SDL_WINDOW_SHOWN, so this runs without stealing focus.
const win = sdl.SDL_CreateWindow(cstr('verify'), SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, 320, 200, 0);
if (!win) throw new Error(`CreateWindow: ${err()}`);
const ren = sdl.SDL_CreateRenderer(win, -1, 0);
if (!ren) throw new Error(`CreateRenderer: ${err()}`);

// ---------------------------------------------------------------- ABI check
console.log('\nSDL_Color by-value through bun:ffi');
{
  const font = ttf.TTF_OpenFont(cstr(MONO), PT);
  if (!font) throw new Error(`OpenFont: ${err()}`);

  // Pure red: maximally asymmetric, so a swapped R/B shows up immediately.
  const RED = packColor(255, 0, 0, 255);
  const surf = ttf.TTF_RenderUTF8_Blended(font, cstr('M'), RED);
  ok('TTF_RenderUTF8_Blended returned a surface', !!surf);

  // SDL_Surface on 64-bit: flags@0, format*@8, w@16, h@20, pitch@24, pixels@32
  const head = new DataView(toArrayBuffer(surf, 0, 40));
  const w = head.getInt32(16, true);
  const h = head.getInt32(20, true);
  const pitch = head.getInt32(24, true);
  const pixelsPtr = Number(head.getBigUint64(32, true));
  ok('surface has sane dimensions', w > 0 && h > 0, `${w}x${h} pitch=${pitch}`);

  const px = new DataView(toArrayBuffer(pixelsPtr, 0, pitch * h));
  let best = 0;
  let bestA = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = px.getUint32(y * pitch + x * 4, true);
      const a = (v >>> 24) & 0xff;
      if (a > bestA) { bestA = a; best = v; }
    }
  }
  const r = (best >>> 16) & 0xff;
  const g = (best >>> 8) & 0xff;
  const b = best & 0xff;
  ok('glyph is opaque somewhere', bestA === 255, `alpha=${bestA}`);
  ok('colour survives by-value as (255,0,0)', r === 255 && g === 0 && b === 0, `got rgb(${r},${g},${b})`);

  sdl.SDL_FreeSurface(surf);
  ttf.TTF_CloseFont(font);
}

// --------------------------------------------------------- metrics fidelity
for (const [name, path] of [['monospace', MONO], ['proportional', SANS]] as const) {
  console.log(`\nmetrics: ${name}`);
  const atlas = buildAtlas(ren, path, PT);
  const font = ttf.TTF_OpenFont(cstr(path), PT);
  const wBuf = new Int32Array(1);
  const hBuf = new Int32Array(1);

  ok('atlas covers printable ASCII', atlas.glyphs.size === 95, `${atlas.glyphs.size} glyphs`);
  ok('atlas texture is modest', atlas.width * atlas.height < 512 * 512, `${atlas.width}x${atlas.height}`);
  ok('lineHeight is positive', atlas.lineHeight > 0, `${atlas.lineHeight}px, ascent ${atlas.ascent}`);

  const samples = [
    'Hello, world!',
    'The quick brown fox jumps over the lazy dog',
    'iiiii',
    'MMMMM',
    'jamrock',
    '  spaced  out  ',
    '0123456789',
    '!@#$%^&*()_+-=[]{}|;:,.<>?/',
  ];

  let mismatches = 0;
  for (const s of samples) {
    ttf.TTF_SizeUTF8(font, cstr(s), ptr(wBuf), ptr(hBuf));
    const mine = atlas.measure(s).w;
    if (mine !== wBuf[0]) {
      mismatches++;
      console.log(`       "${s}" -> atlas ${mine} vs TTF ${wBuf[0]} (delta ${mine - wBuf[0]})`);
    }
  }
  ok('advance sums match TTF_SizeUTF8 exactly', mismatches === 0, `${samples.length - mismatches}/${samples.length} strings`);

  // Monospace must have one uniform advance; proportional must not.
  const advances = new Set([...atlas.glyphs.values()].map(g => g.advance));
  if (name === 'monospace') ok('all advances identical', advances.size === 1, `${advances.size} distinct`);
  else ok('advances vary by glyph', advances.size > 5, `${advances.size} distinct`);

  ttf.TTF_CloseFont(font);
  sdl.SDL_DestroyTexture(atlas.texture);
}

// --------------------------------------------------- colour mod round-trip
console.log('\ncolour mod tinting (one white atlas -> any colour)');
{
  const atlas = buildAtlas(ren, MONO, PT);
  const readback = new Uint8Array(320 * 200 * 4);
  const rect = new Int32Array(4);

  for (const [label, rgb] of [
    ['red',   [255, 0, 0]],
    ['green', [0, 255, 0]],
    ['blue',  [0, 0, 255]],
  ] as const) {
    sdl.SDL_SetRenderDrawColor(ren, 0, 0, 0, 255);
    sdl.SDL_RenderClear(ren);
    drawText(ren, atlas, 'MMMM', 10, 10, rgb as any);

    rect[0] = 0; rect[1] = 0; rect[2] = 320; rect[3] = 200;
    sdl.SDL_RenderReadPixels(ren, ptr(rect), SDL_PIXELFORMAT_ARGB8888, ptr(readback), 320 * 4);

    const view = new DataView(readback.buffer);
    let brightest = 0;
    let val = 0;
    for (let i = 0; i < 320 * 200; i++) {
      const v = view.getUint32(i * 4, true);
      const lum = ((v >>> 16) & 0xff) + ((v >>> 8) & 0xff) + (v & 0xff);
      if (lum > brightest) { brightest = lum; val = v; }
    }
    const got: [number, number, number] = [(val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
    const dominant = got.indexOf(Math.max(...got));
    const expected = (rgb as any).indexOf(255);
    ok(`${label} tint lands on the right channel`, dominant === expected && brightest > 100, `rgb(${got})`);
  }
  sdl.SDL_DestroyTexture(atlas.texture);
}

console.log(`\n${pass} passed, ${fail} failed`);
sdl.SDL_DestroyWindow(win);
ttf.TTF_Quit();
sdl.SDL_Quit();
process.exit(fail ? 1 : 0);
