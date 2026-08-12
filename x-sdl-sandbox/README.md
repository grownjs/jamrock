# x-sdl-sandbox

Spike: an **SDL2 render target for Jamrock**, driven from Bun via `bun:ffi` —
no GTK, no bindings package, no native addon. Explores whether Jamrock can paint
GUIs onto a low-level surface (the motivating case: SDL2 on the RPi5, where it
can run on KMSDRM with no X11/desktop at all).

Status: **working prototype, not integrated with Jamrock yet.** See
[Where this stands](#where-this-stands).

## Running it

Requires Bun and SDL2 + SDL2_ttf.

```sh
# macOS
brew install sdl2 sdl2_ttf

# Debian / Raspberry Pi OS
sudo apt install libsdl2-2.0-0 libsdl2-ttf-2.0-0 fonts-dejavu-core
```

```sh
cd x-sdl-sandbox

bun run verify          # every suite at once (start here)
bun run demo            # 20s interactive window: hover, click rows and buttons
bun run demo:headless   # renders 4 frames, writes shot.bmp
bun run bench           # layout scaling numbers
bun run spike           # the original 90-line "does FFI even work" probe
```

Font paths resolve per-platform in `fonts.ts`; add candidates there rather than
hardcoding.

## Layout

| file | what it is |
|---|---|
| `layout.ts` | **Pure** layout engine. `sizing()` parses the same className DSL as `src/gtk4/util.ts`; `measure()`/`layout()` are two-pass; `hitTest()` maps a point to a rect. No SDL, no DOM — testable anywhere. |
| `atlas.ts` | `bun:ffi` bindings + glyph atlas. SDL_ttf is called **only at startup** to bake ASCII into one texture; runtime drawing is quad blits. |
| `fonts.ts` | Cross-platform font resolution. |
| `demo.ts` | End-to-end: signal → tree → layout → paint → hit-test → events. |
| `layout.test.ts` | 32 tests, runs headless in ~30ms. |
| `verify-*.ts` | Runtime checks that need a real SDL context (see below). |
| `bench.ts` | Layout scaling. |

The three `verify-*` scripts exist because most of the hard bugs here are
invisible to unit tests — they only show up in actual pixels or the real event
queue:

- **`verify-atlas.ts`** — the `SDL_Color`-by-value ABI, metrics vs `TTF_SizeUTF8`, colour-mod tinting round-trip.
- **`verify-ink.ts`** — renders text, reads back pixels, asserts drawn ink fits the box `measure()` reserved. This is the real text-correctness criterion.
- **`verify-events.ts`** — pushes real events through SDL's queue so the struct-offset decode path actually executes.

## Where this stands

**Works, verified on macOS (87 checks green):**

- `bun:ffi` → SDL2 directly. ~59fps, and **microtasks interleave with the render
  loop** (driven from `setInterval`, not a blocking `while(1)`), so Promises and
  signals behave normally. This is the main advantage over the GJS/GTK4 target,
  where `GLib.MainLoop` owns the loop.
- `SDL_Color` passed **by value** as a packed `u32` — verified at pixel level.
- Glyph atlas with metrics matching SDL's own, including **kerning** and
  trailing-glyph **ink overhang**.
- One white atlas + `SDL_SetTextureColorMod` serves every text colour.
- Layout: margins, spacing, expand/slack distribution, alignment, nesting,
  hit-testing.
- Perf: **1093 rects in 1.32ms** warm; cost/rect flat from 121→1093. Memoizing
  `measure` is an optimization, not a prerequisite.

**Not done, roughly in dependency order:**

1. **The somedom fake-DOM adapter** — the actual Jamrock integration, and the
   only remaining unknown that could still invalidate the approach. Implement
   the node surface somedom touches (`createElement`, `appendChild`,
   `setAttribute`, `replaceChild`, `remove`, `addEventListener`) over plain
   objects, then mirror `createRender()` from `src/client/elements.ts`. somedom
   already proves this seam works — that's what `somedom/ssr` is.
2. **Scrolling + clipping** — `SDL_RenderSetClipRect` is bound but unused; scroll
   offsets aren't in the layout model.
3. **Text input** — caret, selection, `SDL_TEXTINPUT`, clipboard. IME is hard.
4. **Multi-line text** — `measure()` is single-line only; no wrapping.
5. **Focus / keyboard nav** — no tab order, no focus ring.
6. **RPi5** — untested. The SDL2 ABI choice should carry, but that's inference.
7. **Accessibility** — nothing, and no cheap retrofit. GTK gave this for free.

If keeping this small matters, capping scope at read-only dashboards (no text
entry, no IME) avoids items 3 and 4, which are most of the remaining cost.

## Gotchas found the hard way

Each of these cost real debugging time; all are fixed in this tree.

1. **Never cache `ptr(typedArray)`.** JSC can relocate the backing store, leaving
   a stale address — SDL writes to old memory while JS reads the moved copy.
   Silent zeros, no crash. Pass the TypedArray directly so Bun pins it for the
   call. This made every mouse event decode as `type=0x0`.
2. **Read pixels *before* `SDL_RenderPresent`.** After the swap, `RenderReadPixels`
   returns a stale buffer — screenshots silently captured old state.
3. **Bake the atlas with blend mode `NONE`, not `BLEND`.** Otherwise glyph alpha
   composites against transparent black and premultiplies away.
4. **Summing advances is not text measurement.** A trailing glyph whose ink
   overhangs its advance (`k`, `/`) clips by 1px, and skipping kerning
   over-measures capitals by up to 6px. Both proportional-font-only.
5. **`TTF_GetFontKerningSizeGlyphs` grid-fits; the internal size path doesn't.**
   They disagree by ~1px, permanently. Chasing agreement with `TTF_SizeUTF8` is
   the wrong target — what matters is `measure()` and `drawText()` agreeing with
   *each other*, which `verify-ink.ts` checks against real pixels.
6. **Target the SDL2 ABI, not SDL3.** macOS `libSDL2.dylib` here is `sdl2-compat`
   over SDL3; Raspberry Pi OS ships real SDL2. One symbol table covers both.

## Background

Prior art in-repo is the GTK4 target (`src/gtk4/`, `lib/gtk4/`), which took a
different route: `src/markup/gtk-utils.ts` (`reduceGTK`) emits imperative GTK
calls as *source strings* at compile time, with a fixed widget vocabulary. That
can't reuse components, which is why `lib/gtk4/window.js` ends up rendering a
page by dumping HTML into a label.

This spike deliberately goes through the **runtime vdom** seam instead, so the
same components and signals drive it. GTK4 also supplied the entire widget layer
for free; SDL2 supplies nothing above pixels, which is why the layout engine and
glyph atlas exist here at all.
