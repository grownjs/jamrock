// txiki.js file system shims using tjs:fs
import * as tfs from 'tjs:fs';
import * as path from 'tjs:path';

export const fs = {
  existsSync(p) {
    try {
      tfs.statSync(p);
      return true;
    } catch {
      return false;
    }
  },
  readFileSync(p, enc) {
    const b = tfs.readFileSync(p);
    return enc ? new TextDecoder().decode(b) : b;
  },
  writeFileSync(p, d) {
    tfs.writeFileSync(p, typeof d === 'string' ? new TextEncoder().encode(d) : d);
  },
  mkdirSync(p, opts) {
    tfs.mkdirSync(p, opts);
  },
  readdirSync(p) {
    return tfs.readdirSync(p);
  },
  statSync(p) {
    return tfs.statSync(p);
  },
};

export { path };
