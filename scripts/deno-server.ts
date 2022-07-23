import { serve } from 'https://deno.land/std@0.140.0/http/server.ts';

import { createServer } from '../lib/deno/server.js';

async function main() {
  const handler = await createServer({ dest: 'generated/output' });

  serve(handler, { port: 8080 });
}
main();
