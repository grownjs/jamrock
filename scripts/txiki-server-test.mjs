#!/usr/bin/env tjs
// Integration test: verifies that HTTP server works in txiki.js runtime.
//
// Usage:
//   make txiki-server-test  (via Makefile)
//
// PASS = request completed and got a response (any HTTP status)
// FAIL = unexpected error setting up the test
// HANG = no response after 8s
//
// This test runs the full Jamrock pipeline:
// 1. createEnvironment with custom createServer
// 2. env.serve() → compiler.reload() (loads routes into memory)
// 3. Real HTTP request through createHandler → createResponse

const PORT = 19005;
let resolved = false;

function output(msg) {
  tjs.stdout.write(new TextEncoder().encode(`${msg}\n`));
}

function done(label, body) {
  if (resolved) return;
  resolved = true;
  output(label + (body ? ` (${body})` : ''));
  tjs.exit(label === 'PASS' ? 0 : 1);
}

setTimeout(() => {
  if (!resolved) done('HANG');
}, 8000);

async function handleConnection(conn, handler) {
  const buffer = [];
  for await (const chunk of conn) {
    buffer.push(chunk);
    if (chunk.includes('\r\n\r\n')) break;
  }

  const requestText = new TextDecoder().decode(buffer.concat());
  const [requestLine, ...headers] = requestText.split('\r\n');
  const [method, url] = requestLine.split(' ');

  if (!method) {
    conn.close();
    return;
  }

  const headerObj = {};
  for (const header of headers) {
    const [key, value] = header.split(': ');
    if (key) headerObj[key.toLowerCase()] = value;
  }

  const req = new Request(`http://${headerObj.host || 'localhost'}${url}`, {
    method,
    headers: headerObj,
  });

  const resp = await handler.call(req);

  const statusText = { 200: 'OK', 404: 'Not Found', 500: 'Internal Server Error' }[resp.status] || '';

  let responseBody = '';
  if (resp.body) {
    if (typeof resp.body === 'string') {
      responseBody = resp.body;
    } else {
      const chunks = [];
      const reader = resp.body.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        chunks.push(value);
      }
      responseBody = new TextDecoder().decode(chunks.concat());
    }
  }

  const responseHeaders = [];
  if (resp.headers) {
    resp.headers.forEach((v, k) => responseHeaders.push(`${k}: ${v}`));
  }
  responseHeaders.push(`Content-Length: ${responseBody.length}`);

  conn.write(`HTTP/1.1 ${resp.status} ${statusText}\r\n${responseHeaders.join('\r\n')}\r\n\r\n${responseBody}`);
  conn.close();
}

async function testCreateServer(env, srvOptions, createHandler) {
  const { handler } = await createHandler(env, srvOptions);

  const server = tjs.listen('tcp', '0.0.0.0', srvOptions.port);
  output(`Server listening on http://127.0.0.1:${srvOptions.port}`);

  // Handle connections in the background
  (async () => {
    for await (const conn of server) {
      handleConnection(conn, handler);
    }
  })();

  // Make a test request after 200ms
  setTimeout(async () => {
    try {
      const client = await tjs.connect('tcp', '127.0.0.1', PORT);
      const request = new TextEncoder().encode('GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
      await client.write(request);

      const buffer = new Uint8Array(8192);
      let totalRead = 0;
      let responseComplete = false;

      while (!responseComplete) {
        const bytesRead = await client.read(buffer.subarray(totalRead));
        if (bytesRead === null || bytesRead === 0) break;
        totalRead += bytesRead;
        const data = new TextDecoder().decode(buffer.subarray(0, totalRead));
        if (data.includes('\r\n\r\n')) {
          responseComplete = true;
        }
      }

      const response = new TextDecoder().decode(buffer.subarray(0, totalRead));
      const [statusLine] = response.split('\r\n');
      const match = statusLine.match(/HTTP\/1\.1 (\d+)/);
      const status = match ? parseInt(match[1], 10) : 0;

      const bodyStart = response.indexOf('\r\n\r\n') + 4;
      const body = response.substring(bodyStart, bodyStart + 120).replace(/\n/g, ' ');

      done(status >= 200 && status < 600 ? 'PASS' : 'FAIL', `status=${status} body="${body}"`);
    } catch (e) {
      done('FAIL', String(e));
    }
  }, 200);
}

async function runTest() {
  try {
    // Import runtime first to set up globals
    await import('../lib/txiki/runtime.js');

    const [{ createHandler }, { createEnvironment }, { fs, path: txikiPath }] = await Promise.all([
      import('../lib/txiki/server.js'),
      import('../dist/server.mjs'),
      import('../lib/txiki/deps.js'),
    ]);

    const options = {
      src: 'x-gtk-sandbox',
      dest: 'dist',
      port: PORT,
      quiet: true,
      prefix: '@',
      public: 'public',
    };

    const env = createEnvironment({ fs, path: txikiPath }, options, {
      createServer: (e, o) => testCreateServer(e, o, createHandler),
    });

    // serve() → compiler.reload() (loads routes) → testCreateServer (our hook)
    await env.serve();
  } catch (e) {
    done('FAIL', String(e));
  }
}

runTest();
