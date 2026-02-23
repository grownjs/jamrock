// Cloudflare Workers has no native fs — build mode requires wrangler CLI

export const fs = {
  existsSync: () => false,
  readFileSync: () => '',
  writeFileSync: () => {},
  mkdirSync: () => {},
  readdirSync: () => [],
  statSync: () => ({ mtimeMs: 0 }),
};

export const path = {
  join: (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/'),
  dirname: p => p.split('/').slice(0, -1).join('/') || '.',
  basename: p => p.split('/').pop() || '',
  extname: p => { const b = p.split('/').pop() || ''; const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; },
  resolve: (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/'),
};
