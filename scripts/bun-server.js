import { createServer } from '../lib/bun/server.js';

async function main() {
  const handler = await createServer({ dest: 'generated/output' });

  /* global Bun */
  const server = Bun.serve({
    port: 8080,
    fetch: handler,
  });

  console.log(`Listening on ${server.protocol}//${server.hostname}:${server.port}`);
}
main();
