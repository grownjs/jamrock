# Runtime Adapter Patterns

Learnings from WIP adapter experiments (txiki, llrt, winterjs) — archived for future reference.

## process.shared Pattern

All adapters need to wire `process.shared` for CLI logging and file utilities:

```javascript
process.shared = {
  printLog: (...a) => console.log(...a),
  printError: (...a) => console.error(...a),
  fileURLToPath: url => url.replace(/^file:\/\//, ''),
  writeFileSync: (f, x) => fs.writeFileSync(f, x),
  existsSync: p => fs.existsSync(p),
  readdirSync: (p, opts) => fs.readdirSync(p, opts),
  chmodSync: (p, m) => fs.chmodSync(p, m),
  cpSync: (s, d) => fs.cpSync(s, d),
};
```

## Glob Without fast-glob

For runtimes without fast-glob, use recursive readdirSync:

```javascript
function globSync(pattern) {
  const base = pattern.replace(/\*\*.*/g, '').replace(/\*/g, '').replace(/\/+$/, '') || '.';
  const ext = (pattern.match(/\.\w+$/) || [''])[0];
  const results = [];
  try {
    const all = fs.readdirSync(base, { recursive: true });
    for (const f of all) {
      if (!ext || f.endsWith(ext)) results.push(`${base}/${f}`);
    }
  } catch { /* ignore */ }
  return results;
}
```

## Read-only Filesystem Handling

Some environments (edge, serverless) have read-only filesystems:

```javascript
Template.write = (f, x) => {
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, x);
  } catch { /* ignore on read-only fs */ }
};
```

## WebCrypto Stubbing

For runtimes without WebCrypto:

```javascript
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = { subtle: null };
}
```

## structuredClone Polyfill

```javascript
if (!globalThis.structuredClone) {
  globalThis.structuredClone = v => JSON.parse(JSON.stringify(v));
}
```

## Docker Testing Notes

- WSL2 + corporate proxy requires `curl -k` for SSL bypass
- Alpine has SSL cert issues with corporate proxies — use Debian base
- winterjs WASM JIT requires `--privileged` flag and doesn't work in Docker/WSL2
- LLRT works in Docker but needs `node:fs` for `/tmp` access
