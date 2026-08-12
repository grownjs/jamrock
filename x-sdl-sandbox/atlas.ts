// Glyph atlas: SDL_ttf is called ONLY at startup to bake glyphs into one
// texture. Runtime drawing is pure quad blits + colour mod, so TTF is never in
// the hot path and text metrics become a plain table the layout engine can use
// without SDL present.
import { dlopen, FFIType, ptr, CString, toArrayBuffer } from 'bun:ffi';

const { i32, u32, u16, u8, ptr: p, void: v, cstring } = FFIType;

const isMac = process.platform === 'darwin';
const SDL_LIB = isMac ? '/opt/homebrew/lib/libSDL2.dylib' : 'libSDL2-2.0.so.0';
const TTF_LIB = isMac ? '/opt/homebrew/lib/libSDL2_ttf.dylib' : 'libSDL2_ttf-2.0.so.0';

export const sdl = dlopen(SDL_LIB, {
  SDL_Init:                       { args: [u32], returns: i32 },
  SDL_Quit:                       { args: [], returns: v },
  SDL_GetError:                   { args: [], returns: cstring },
  SDL_CreateWindow:               { args: [cstring, i32, i32, i32, i32, u32], returns: p },
  SDL_DestroyWindow:              { args: [p], returns: v },
  SDL_CreateRenderer:             { args: [p, i32, u32], returns: p },
  SDL_SetRenderDrawColor:         { args: [p, u8, u8, u8, u8], returns: i32 },
  SDL_SetRenderDrawBlendMode:     { args: [p, i32], returns: i32 },
  SDL_RenderClear:                { args: [p], returns: i32 },
  SDL_RenderFillRect:             { args: [p, p], returns: i32 },
  SDL_RenderDrawRect:             { args: [p, p], returns: i32 },
  SDL_RenderSetClipRect:          { args: [p, p], returns: i32 },
  SDL_RenderPresent:              { args: [p], returns: v },
  SDL_RenderCopy:                 { args: [p, p, p, p], returns: i32 },
  SDL_RenderReadPixels:           { args: [p, p, u32, p, i32], returns: i32 },
  SDL_PollEvent:                  { args: [p], returns: i32 },
  SDL_CreateRGBSurfaceWithFormat: { args: [u32, i32, i32, i32, u32], returns: p },
  SDL_UpperBlit:                  { args: [p, p, p, p], returns: i32 },
  SDL_FreeSurface:                { args: [p], returns: v },
  SDL_CreateTextureFromSurface:   { args: [p, p], returns: p },
  SDL_DestroyTexture:             { args: [p], returns: v },
  SDL_SetTextureBlendMode:        { args: [p, i32], returns: i32 },
  SDL_SetTextureColorMod:         { args: [p, u8, u8, u8], returns: i32 },
  SDL_SetTextureAlphaMod:         { args: [p, u8], returns: i32 },
  SDL_SetSurfaceBlendMode:        { args: [p, i32], returns: i32 },
}).symbols;

export const ttf = dlopen(TTF_LIB, {
  TTF_Init:                { args: [], returns: i32 },
  TTF_Quit:                { args: [], returns: v },
  TTF_OpenFont:            { args: [cstring, i32], returns: p },
  TTF_CloseFont:           { args: [p], returns: v },
  // SDL_Color is 4 x Uint8 = a 4-byte POD struct. Both arm64 AAPCS and
  // x86-64 SysV pass that in a single general register -- identical to a u32.
  TTF_RenderUTF8_Blended:  { args: [p, cstring, u32], returns: p },
  TTF_GlyphMetrics:        { args: [p, u16, p, p, p, p, p], returns: i32 },
  TTF_SizeUTF8:            { args: [p, cstring, p, p], returns: i32 },
  TTF_FontHeight:          { args: [p], returns: i32 },
  TTF_FontAscent:          { args: [p], returns: i32 },
  TTF_GetFontKerningSizeGlyphs: { args: [p, u16, u16], returns: i32 },
}).symbols;

export const SDL_INIT_VIDEO = 0x20;
export const SDL_WINDOWPOS_CENTERED = 0x2FFF0000;
export const SDL_WINDOW_SHOWN = 0x4;
export const SDL_QUIT = 0x100;
export const SDL_MOUSEBUTTONDOWN = 0x401;
export const SDL_MOUSEMOTION = 0x400;
export const SDL_BLENDMODE_BLEND = 1;
export const SDL_PIXELFORMAT_ARGB8888 = 0x16362004;

export const cstr = (s: string) => new TextEncoder().encode(s + '\0');
export const err = () => sdl.SDL_GetError();

/** Pack SDL_Color{r,g,b,a} for by-value passing. Little-endian field order. */
export const packColor = (r: number, g: number, b: number, a = 255) =>
  ((r | (g << 8) | (b << 16) | (a << 24)) >>> 0);

export type Glyph = {
  x: number; y: number; w: number; h: number;
  advance: number;
  /** Ink extents relative to the pen. Can exceed the advance (overhang). */
  minx: number; maxx: number;
};

export type Atlas = {
  texture: any;
  glyphs: Map<number, Glyph>;
  lineHeight: number;
  ascent: number;
  width: number;
  height: number;
  /** Kerning delta between two char codes, in pixels (usually <= 0). */
  kern: (prev: number, cur: number) => number;
  /** Pure metrics -- no SDL calls, safe to use inside the layout engine. */
  measure: (text: string) => { w: number; h: number };
};

const FIRST = 32;
const LAST = 126;
const PAD = 1;

/**
 * Bake printable ASCII into one texture. Glyphs are rendered WHITE so a single
 * atlas serves every text colour via SDL_SetTextureColorMod at draw time --
 * which also means the only SDL_Color ever passed by value is 0xFFFFFFFF,
 * making the packing byte-order irrelevant in practice.
 */
export function buildAtlas(renderer: any, fontPath: string, ptsize: number): Atlas {
  const font = ttf.TTF_OpenFont(cstr(fontPath), ptsize);
  if (!font) throw new Error(`TTF_OpenFont failed: ${err()}`);

  const lineHeight = ttf.TTF_FontHeight(font);
  const ascent = ttf.TTF_FontAscent(font);

  const wBuf = new Int32Array(1);
  const hBuf = new Int32Array(1);
  const adv = new Int32Array(1);
  const minxBuf = new Int32Array(1);
  const maxxBuf = new Int32Array(1);
  const scratch = new Int32Array(1);

  type Baked = { code: number; surf: any; w: number; h: number; advance: number; minx: number; maxx: number };
  const baked: Baked[] = [];

  const WHITE = packColor(255, 255, 255, 255);

  for (let code = FIRST; code <= LAST; code++) {
    const ch = String.fromCharCode(code);

    ttf.TTF_GlyphMetrics(font, code, ptr(minxBuf), ptr(maxxBuf), ptr(scratch), ptr(scratch), ptr(adv));
    const advance = adv[0];
    const minx = minxBuf[0];
    const maxx = maxxBuf[0];

    if (code === 32) {
      baked.push({ code, surf: null, w: 0, h: 0, advance, minx, maxx });
      continue;
    }

    const surf = ttf.TTF_RenderUTF8_Blended(font, cstr(ch), WHITE);
    if (!surf) throw new Error(`render '${ch}' failed: ${err()}`);

    ttf.TTF_SizeUTF8(font, cstr(ch), ptr(wBuf), ptr(hBuf));
    baked.push({ code, surf, w: wBuf[0], h: hBuf[0], advance, minx, maxx });
  }

  // Row-pack into a square-ish atlas.
  const maxW = Math.max(...baked.map(b => b.w));
  const perRow = Math.ceil(Math.sqrt(baked.length));
  const atlasW = (maxW + PAD) * perRow + PAD;
  const atlasH = (lineHeight + PAD) * Math.ceil(baked.length / perRow) + PAD;

  const atlasSurf = sdl.SDL_CreateRGBSurfaceWithFormat(0, atlasW, atlasH, 32, SDL_PIXELFORMAT_ARGB8888);
  if (!atlasSurf) throw new Error(`atlas surface failed: ${err()}`);
  // NONE, not BLEND: we want the glyph's own alpha copied verbatim, not
  // composited against transparent black (which would premultiply it away).
  sdl.SDL_SetSurfaceBlendMode(atlasSurf, 0);

  const glyphs = new Map<number, Glyph>();
  // NOTE: pass TypedArrays straight to FFI calls, never a cached ptr(). JSC can
  // relocate a backing store, leaving a stale address that SDL writes into
  // while JS reads the moved copy -- silent zeros, no crash.
  const dst = new Int32Array(4);

  let cx = PAD;
  let cy = PAD;
  let col = 0;

  for (const b of baked) {
    if (col === perRow) { col = 0; cx = PAD; cy += lineHeight + PAD; }

    if (b.surf) {
      dst[0] = cx; dst[1] = cy; dst[2] = b.w; dst[3] = b.h;
      sdl.SDL_SetSurfaceBlendMode(b.surf, 0);
      if (sdl.SDL_UpperBlit(b.surf, null, atlasSurf, dst) !== 0) {
        throw new Error(`blit '${String.fromCharCode(b.code)}' failed: ${err()}`);
      }
      sdl.SDL_FreeSurface(b.surf);
    }

    glyphs.set(b.code, { x: cx, y: cy, w: b.w, h: b.h, advance: b.advance, minx: b.minx, maxx: b.maxx });
    cx += maxW + PAD;
    col++;
  }

  const texture = sdl.SDL_CreateTextureFromSurface(renderer, atlasSurf);
  sdl.SDL_FreeSurface(atlasSurf);
  if (!texture) throw new Error(`texture failed: ${err()}`);
  sdl.SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_BLEND);

  // Kerning table, baked once -- must happen BEFORE the font is closed.
  // Proportional fonts kern capitals hard (Arial "AV" is 2px tighter than the
  // advance sum), so skipping this makes every measurement too wide --
  // invisibly, until a centred label sits off-centre.
  const N = LAST - FIRST + 1;
  const kernTable = new Int16Array(N * N);
  for (let a = FIRST; a <= LAST; a++) {
    for (let b = FIRST; b <= LAST; b++) {
      kernTable[(a - FIRST) * N + (b - FIRST)] = ttf.TTF_GetFontKerningSizeGlyphs(font, a, b);
    }
  }
  const kern = (prev: number, cur: number) => {
    if (prev < FIRST || prev > LAST || cur < FIRST || cur > LAST) return 0;
    return kernTable[(prev - FIRST) * N + (cur - FIRST)];
  };

  // Mirrors TTF_SizeUTF8: advance the pen by kerning, then track the union of
  // ink extents AND advances. A trailing glyph whose ink overhangs its advance
  // (k, /, italic forms) is wider than the advance sum -- summing clips it.
  const measure = (text: string) => {
    let x = 0;
    let minx = 0;
    let maxx = 0;
    let prev = -1;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const g = glyphs.get(code);
      if (!g) continue;
      if (prev >= 0) x += kern(prev, code);
      minx = Math.min(minx, x + g.minx);
      // g.w is the literal blit width drawText uses, so bounding by it makes
      // "ink always fits the measured box" true by construction. g.maxx alone
      // under-reports when kerning pulls the pen left (e.g. Arial "VA VA VA").
      maxx = Math.max(maxx, x + Math.max(g.w, g.maxx, g.advance));
      x += g.advance;
      prev = code;
    }
    return { w: text.length ? maxx - minx : 0, h: lineHeight };
  };

  ttf.TTF_CloseFont(font);

  return { texture, glyphs, lineHeight, ascent, width: atlasW, height: atlasH, kern, measure };
}

const srcRect = new Int32Array(4);
const dstRect = new Int32Array(4);

/** Blit a string from the atlas. One RenderCopy per glyph, no allocation. */
export function drawText(
  renderer: any,
  atlas: Atlas,
  text: string,
  x: number,
  y: number,
  color: [number, number, number] = [255, 255, 255],
  alpha = 255,
): number {
  sdl.SDL_SetTextureColorMod(atlas.texture, color[0], color[1], color[2]);
  sdl.SDL_SetTextureAlphaMod(atlas.texture, alpha);

  let cx = x;
  let prev = -1;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const g = atlas.glyphs.get(code);
    if (!g) continue;
    // Must mirror measure() exactly, or drawn text drifts from its box.
    if (prev >= 0) cx += atlas.kern(prev, code);
    prev = code;
    if (g.w > 0) {
      srcRect[0] = g.x; srcRect[1] = g.y; srcRect[2] = g.w; srcRect[3] = g.h;
      dstRect[0] = cx;  dstRect[1] = y;   dstRect[2] = g.w; dstRect[3] = g.h;
      sdl.SDL_RenderCopy(renderer, atlas.texture, srcRect, dstRect);
    }
    cx += g.advance;
  }
  return cx - x;
}
