export const fs = {
  writeFileSync: (f, s) => print(JSON.stringify({ writeFileSync: [f, s] })),
  existsSync: s => print(JSON.stringify({ existsSync: s })),
  readdirSync: s => print(JSON.stringify({ readdirSync: s })),
  chmodSync: (s, c) => print(JSON.stringify({ chmodSync: [s, c] })),
  cpSync: (a, b) => print(JSON.stringify({ cpSync: [a, b] })),
};

export const path = {
  resolve: () => print('RESOLVE') || '/tmp/noop',
  dirname: () => print('DIRNAME') || '/tmp/noop',
};

export const url = {
  fileURLToPath: () => '/tmp/noop',
};

export const glob = {};

export function serveStaticBun() { }
export function timingSafeEqual() { }
