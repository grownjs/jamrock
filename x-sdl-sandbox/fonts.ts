// Font resolution, so the sandbox runs unchanged on macOS and on the RPi5.
// Add candidates rather than hardcoding -- the demo and every verify script
// go through here.
import { existsSync } from 'node:fs';

const CANDIDATES: Record<'mono' | 'sans', string[]> = {
  mono: [
    // macOS
    '/System/Library/Fonts/Supplemental/Andale Mono.ttf',
    '/System/Library/Fonts/Supplemental/Courier New.ttf',
    // Debian / Raspberry Pi OS
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    '/usr/share/fonts/TTF/DejaVuSansMono.ttf',
  ],
  sans: [
    // macOS
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/System/Library/Fonts/Supplemental/Verdana.ttf',
    // Debian / Raspberry Pi OS
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
  ],
};

export function resolveFont(kind: 'mono' | 'sans'): string {
  const found = CANDIDATES[kind].find(p => existsSync(p));
  if (found) return found;
  throw new Error(
    `No ${kind} font found. Tried:\n  ${CANDIDATES[kind].join('\n  ')}\n`
    + `On Debian/RPi: sudo apt install fonts-dejavu-core`,
  );
}

/** Both faces, for the metrics suites that compare mono vs proportional. */
export const FONTS = {
  get mono() { return resolveFont('mono'); },
  get sans() { return resolveFont('sans'); },
};
