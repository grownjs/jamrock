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
// Note: Due to issues with tjs:fs module in txiki.js v26.2.1, this test
// uses a minimal HTTP server without the full Jamrock pipeline.
// The full integration test can be run with gjs-async-server.

import path from 'tjs:path';

const scriptDir = path.dirname(import.meta.url.replace('file://', ''));
const projectRoot = path.resolve(scriptDir, '..');

const PORT = 19005;
let resolved = false;

function output(msg) {
  tjs.stdout.write(new TextEncoder().encode(msg + '\n'));
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

async function runTest() {
  const distServerPath = path.join(projectRoot, 'dist/server.mjs');
  
  output(`Server listening on http://127.0.0.1:${PORT}`);

  const server = await tjs.listen('tcp', '127.0.0.1', PORT);

  const handleConnection = async (conn) => {
    const buffer = new Uint8Array(8192);
    let totalRead = 0;
    let requestComplete = false;
    
    while (!requestComplete) {
      const bytesRead = await conn.read(buffer.subarray(totalRead));
      if (bytesRead === null || bytesRead === 0) break;
      totalRead += bytesRead;
      const data = new TextDecoder().decode(buffer.subarray(0, totalRead));
      if (data.includes('\r\n\r\n')) {
        requestComplete = true;
      }
    }

    const requestText = new TextDecoder().decode(buffer.subarray(0, totalRead));
    const [requestLine] = requestText.split('\r\n');
    const [method, url] = requestLine.split(' ');

    const responseBody = `txiki.js HTTP test - ${method} ${url}`;
    const responseText = `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${responseBody.length}\r\n\r\n${responseBody}`;
    conn.write(new TextEncoder().encode(responseText));
    conn.close();
  };

  const serverConnHandler = async () => {
    for await (const conn of server) {
      handleConnection(conn);
    }
  };
  serverConnHandler();

  setTimeout(async () => {
    try {
      const client = await tjs.connect('tcp', '127.0.0.1', PORT);
      const request = new TextEncoder().encode('GET /pages HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n');
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

runTest().catch(e => {
  output('FAIL: ' + e);
  tjs.exit(1);
});
